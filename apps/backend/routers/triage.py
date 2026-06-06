import json
import os

from fastapi import APIRouter, Depends, HTTPException

from auth import _require_admin
from db import get_db_connection
from helpers import _call_gemini_triage, _validate_triage_shape, fetch_pdf_to_temp
from models import TriageReport, TriageRequest
from obs import audit, fail

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
    """Manual triage trigger — downloads PDF (SSRF-guarded), runs Gemini, upserts result.

    The LLM score is advisory only. There is no automated outbound dispatch here;
    RFQ emails are sent exclusively via the admin-gated /api/sourcing/approve path
    (ENTERPRISE_AUDIT P0-1)."""
    temp_pdf_path = None
    try:
        try:
            temp_pdf_path = fetch_pdf_to_temp(request.pdf_url)
        except ValueError as e:
            # Policy violation (SSRF/size/type) — safe to surface the reason.
            raise HTTPException(status_code=400, detail=f"PDF rejected: {e}")
        except Exception as e:
            raise fail(400, "PDF download failed", e)

        try:
            data = await _call_gemini_triage(temp_pdf_path, request.solicitation_id)
        except Exception as e:
            raise fail(502, "Triage model call failed", e)

        score = _validate_triage_shape(data)
        if score is None:
            # Fail closed: malformed/anomalous output never advances the pipeline.
            conn = get_db_connection()
            cur = conn.cursor()
            cur.execute("""
                INSERT INTO solicitation_queue
                    (solicitation_id, phase_status, status, reason_code, pdf_url, raw_json)
                VALUES (%s, 'PENDING_TRIAGE', NULL, 'TRIAGE_SHAPE_ANOMALY', %s, %s)
                ON CONFLICT (solicitation_id) DO UPDATE SET
                    phase_status='PENDING_TRIAGE', status=NULL,
                    reason_code='TRIAGE_SHAPE_ANOMALY',
                    raw_json=EXCLUDED.raw_json, updated_at=NOW()
            """, (request.solicitation_id, request.pdf_url,
                  json.dumps(data) if isinstance(data, dict) else None))
            conn.commit()
            cur.close()
            conn.close()
            audit("triage.shape_anomaly", actor="admin", target=request.solicitation_id)
            raise HTTPException(status_code=422,
                                detail="Triage output failed validation; parked for human review.")

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

        audit("triage.complete", actor="admin", target=request.solicitation_id,
              detail={"score": score, "status": status})
        return data
    except HTTPException:
        raise
    except Exception as e:
        raise fail(500, "Triage processing error", e)
    finally:
        if temp_pdf_path and os.path.exists(temp_pdf_path):
            os.remove(temp_pdf_path)
