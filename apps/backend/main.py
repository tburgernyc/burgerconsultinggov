import os
import json
import tempfile
import requests
import psycopg2
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from google import genai
from google.genai import types

client = genai.Client()

def get_db_connection():
    return psycopg2.connect(
        host="db",
        database="postgres",
        user="postgres",
        password=os.getenv("POSTGRES_PASSWORD"),
        port=5432
    )

@asynccontextmanager
async def lifespan(app: FastAPI):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS solicitation_queue (
            id SERIAL PRIMARY KEY,
            solicitation_id TEXT UNIQUE NOT NULL,
            triage_score INTEGER,
            status TEXT,
            pdf_url TEXT,
            raw_json JSONB,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
    """)
    conn.commit()
    cur.close()
    conn.close()
    yield

class Section1(BaseModel):
    upfront_capital_required: bool = Field(description="Does the SOW require heavy equipment purchases or material mobilization?")
    davis_bacon_applies: bool = Field(description="Does the contract require Davis-Bacon weekly certified payroll?")
    firm_fixed_price: bool = Field(description="Is this a Firm-Fixed-Price contract with milestone or monthly billing?")

class Section2(BaseModel):
    clearance_required: bool = Field(description="Are personnel or facility clearances required?")
    subcontracting_barred: bool = Field(description="Is subcontracting explicitly barred?")

class Section3(BaseModel):
    primary_naics: str = Field(description="The 6-digit NAICS code.")
    performance_zip: str = Field(description="The primary performance ZIP or UNKNOWN.")
    sca_wage_floor: float = Field(description="Minimum SCA wage floor for primary labor category.")

class TriageAdjudication(BaseModel):
    feasibility_score: int = Field(description="Score from 1 to 10.")
    decision: str = Field(description="PROCEED, REVIEW, or REJECT.")
    reasoning: str = Field(description="Two-sentence justification.")

class TriageReport(BaseModel):
    solicitation_id: str
    section1_financial: Section1
    section2_compliance: Section2
    section3_scope: Section3
    section4_adjudication: TriageAdjudication

class TriageRequest(BaseModel):
    solicitation_id: str
    pdf_url: str

app = FastAPI(title="Hermes Cognitive Engine", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.get("/api/solicitations/list")
async def list_solicitations():
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT solicitation_id, triage_score, status, pdf_url, created_at
        FROM solicitation_queue
        ORDER BY created_at DESC
    """)
    rows = cur.fetchall()
    cur.close()
    conn.close()

    return [
        {
            "solicitation_id": r[0],
            "triage_score": r[1],
            "status": r[2],
            "pdf_url": r[3],
            "created_at": r[4].isoformat() if r[4] else None
        }
        for r in rows
    ]

@app.post("/api/triage/analyze", response_model=TriageReport)
async def analyze_solicitation(request: TriageRequest):
    temp_pdf_path = None
    gemini_file = None

    try:
        pdf_response = requests.get(request.pdf_url, stream=True, timeout=30)
        pdf_response.raise_for_status()

        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_pdf:
            for chunk in pdf_response.iter_content(chunk_size=8192):
                temp_pdf.write(chunk)
            temp_pdf_path = temp_pdf.name
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"PDF download failed: {str(e)}")

    try:
        gemini_file = client.files.upload(file=temp_pdf_path)

        system_instruction = """
        You are the Lead Procurement Compliance Director for Burger Consulting LLC.
        Evaluate the solicitation under the Zero-Float doctrine.
        Zero-Float means: reject anything requiring upfront capital, Davis-Bacon payroll,
        security clearances, or structures incompatible with FFP/SCA execution.
        Return strict JSON matching the provided schema.
        """

        response = client.models.generate_content(
            model="gemini-2.5-pro",
            contents=[gemini_file, system_instruction],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=TriageReport,
                temperature=0.1
            )
        )

        data = json.loads(response.text)
        data["solicitation_id"] = request.solicitation_id

        score = data.get("section4_adjudication", {}).get("feasibility_score", 1)
        status = "READY_FOR_SOURCING" if score >= 8 else "REJECTED"

        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO solicitation_queue
                (solicitation_id, triage_score, status, pdf_url, raw_json)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (solicitation_id) DO UPDATE SET
                triage_score = EXCLUDED.triage_score,
                status = EXCLUDED.status,
                pdf_url = EXCLUDED.pdf_url,
                raw_json = EXCLUDED.raw_json
        """, (
            request.solicitation_id,
            score,
            status,
            request.pdf_url,
            json.dumps(data)
        ))
        conn.commit()
        cur.close()
        conn.close()

        return data

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gemini processing error: {str(e)}")

    finally:
        if gemini_file:
            try:
                client.files.delete(name=gemini_file.name)
            except Exception:
                pass
        if temp_pdf_path and os.path.exists(temp_pdf_path):
            os.remove(temp_pdf_path)
