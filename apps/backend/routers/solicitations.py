from fastapi import APIRouter, Depends

from auth import _require_gateway
from db import get_db_connection

router = APIRouter()


@router.get("/api/solicitations/list")
async def list_solicitations(_: None = Depends(_require_gateway)):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT solicitation_id, triage_score, COALESCE(status, phase_status), pdf_url,
               agency, naics, estimated_value, response_deadline, created_at
        FROM solicitation_queue
        ORDER BY created_at DESC
    """)
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return [{"solicitation_id": r[0], "triage_score": r[1], "status": r[2],
             "pdf_url": r[3], "agency": r[4], "naics": r[5],
             "estimated_value": float(r[6]) if r[6] else None,
             "response_deadline": r[7].isoformat() if r[7] else None,
             "created_at": r[8].isoformat() if r[8] else None} for r in rows]
