import json

from fastapi import APIRouter, Depends

from auth import _require_admin
from db import get_db_connection
from models import QuoteSubmitRequest

router = APIRouter()


@router.post("/api/pricing/analyze")
async def analyze_pricing(request: QuoteSubmitRequest, _: None = Depends(_require_admin)):
    labor = request.labor_rate_hourly or 0
    total = request.total_amount

    analysis = {
        "conservative_margin": total * 1.10,
        "optimized_margin": total * 1.15,
        "aggressive_anchor": total * 1.20,
        "sca_wage_floor_check": labor >= 15.0,
        "recommendation": "PROCEED" if total > 0 else "CLARIFY",
    }

    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        UPDATE vendor_quotes SET pricing_analysis=%s, reviewed_at=NOW()
        WHERE solicitation_id=%s AND vendor_id=%s::uuid
    """, (json.dumps(analysis), request.solicitation_id, request.vendor_id))
    conn.commit()
    cur.close()
    conn.close()
    return {"pricing_analysis": analysis}


@router.get("/api/pricing/{sol_id}")
async def get_pricing(sol_id: str, _: None = Depends(_require_admin)):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT id, vendor_id, total_amount, pricing_analysis, recommendation, status
        FROM vendor_quotes WHERE solicitation_id=%s
    """, (sol_id,))
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return [{"id": str(r[0]), "vendor_id": str(r[1]),
             "total_amount": float(r[2]) if r[2] else None,
             "pricing_analysis": r[3], "recommendation": r[4], "status": r[5]} for r in rows]
