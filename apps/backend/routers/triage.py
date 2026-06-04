import asyncio
import json
import os
import requests
import tempfile

from fastapi import APIRouter, Depends, HTTPException

from auth import _require_admin
from db import get_db_connection
from gemini import client, types
from helpers import TRIAGE_SYSTEM_INSTRUCTION, _call_gemini_triage, _auto_dispatch_rfq
from models import TriageReport, TriageRequest

router = APIRouter()


@router.get("/api/triage/queue")
async def get_triage_queue(_: None = Depends(_require_admin)):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT solicitation_id, agency, naics, estimated_value, triage_score,
               phase_status, response_deadline, created_at
        FROM solicitation_queue
        WHERE phase_status = 'PENDING_TRIAGE'
        ORDER BY created_at DESC
    """)
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return [{"solicitation_id": r[0], "agency": r[1], "naics": r[2],
             "estimated_value": float(r[3]) if r[3] else None,
             "triage_score": r[4], "phase_status": r[5],
             "response_deadline": r[6].isoformat() if r[6] else None,
             "created_at": r[7].isoformat() if r[7] else None} for r in rows]


@router.post("/api/triage/analyze", response_model=TriageReport)
async def analyze_solicitation(request: TriageRequest, _: None = Depends(_require_admin)):
    """Manual triage trigger — downloads PDF, runs Gemini, upserts result."""
    temp_pdf_path = None
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
        data = await _call_gemini_triage(temp_pdf_path, request.solicitation_id)
        score = data.get("section4_adjudication", {}).get("feasibility_score", 1)
        status = "READY_FOR_SOURCING" if score >= 8 else "REJECTED"

        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO solicitation_queue
                (solicitation_id, triage_score, phase_status, status, pdf_url, triage_report, raw_json)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (solicitation_id) DO UPDATE SET
                triage_score = EXCLUDED.triage_score,
                phase_status = EXCLUDED.phase_status,
                status = EXCLUDED.status,
                triage_report = EXCLUDED.triage_report,
                raw_json = EXCLUDED.raw_json,
                updated_at = NOW()
        """, (
            request.solicitation_id, score, "TRIAGE_COMPLETE", status,
            request.pdf_url, json.dumps(data), json.dumps(data),
        ))
        conn.commit()
        cur.close()
        conn.close()

        if score >= 9:
            asyncio.create_task(_auto_dispatch_rfq(request.solicitation_id))

        return data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gemini processing error: {str(e)}")
    finally:
        if temp_pdf_path and os.path.exists(temp_pdf_path):
            os.remove(temp_pdf_path)
