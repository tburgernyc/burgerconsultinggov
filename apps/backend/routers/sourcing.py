from fastapi import APIRouter, Depends

from auth import _require_admin
from db import get_db_connection
from helpers import _dispatch_vendors, _VENDOR_CAPACITY_QUERY

router = APIRouter()


@router.post("/api/sourcing/trigger/{sol_id}")
async def trigger_sourcing(sol_id: str, _: None = Depends(_require_admin)):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        UPDATE solicitation_queue SET phase_status='READY_FOR_SOURCING', updated_at=NOW()
        WHERE solicitation_id=%s
    """, (sol_id,))
    conn.commit()
    cur.close()
    conn.close()
    return {"status": "triggered", "solicitation_id": sol_id}


@router.get("/api/sourcing/rfq-queue")
async def get_rfq_queue():
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT solicitation_id, agency, naics, estimated_value, triage_score,
               phase_status, response_deadline, created_at
        FROM solicitation_queue
        WHERE phase_status = 'READY_FOR_SOURCING'
        ORDER BY response_deadline ASC NULLS LAST
    """)
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return [{"solicitation_id": r[0], "agency": r[1], "naics": r[2],
             "estimated_value": float(r[3]) if r[3] else None,
             "triage_score": r[4], "phase_status": r[5],
             "response_deadline": r[6].isoformat() if r[6] else None,
             "created_at": r[7].isoformat() if r[7] else None} for r in rows]


@router.post("/api/sourcing/approve/{rfq_id}")
async def approve_rfq(rfq_id: str, _: None = Depends(_require_admin)):
    """Manual RFQ dispatch — sends to NAICS-matched vendors with available capacity."""
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        UPDATE solicitation_queue
        SET phase_status='SOURCING_IN_PROGRESS', updated_at=NOW()
        WHERE solicitation_id=%s
    """, (rfq_id,))

    cur.execute("""
        SELECT agency, naics, response_deadline, pdf_url
        FROM solicitation_queue WHERE solicitation_id=%s
    """, (rfq_id,))
    sol = cur.fetchone()

    cur.execute(_VENDOR_CAPACITY_QUERY)
    vendors = cur.fetchall()

    conn.commit()
    cur.close()
    conn.close()

    dispatched = 0
    skipped_capacity = 0
    if sol:
        agency, naics, deadline, pdf_url = sol
        deadline_str = deadline.strftime("%B %d, %Y %I:%M %p ET") if deadline else None
        dispatched, skipped_capacity = _dispatch_vendors(vendors, rfq_id, agency, naics, deadline_str, pdf_url)

    return {
        "status": "approved",
        "solicitation_id": rfq_id,
        "dispatched_to": dispatched,
        "skipped_capacity": skipped_capacity,
        "note": f"RFQ dispatched to {dispatched} matched vendor(s); {skipped_capacity} skipped (over capacity)",
    }
