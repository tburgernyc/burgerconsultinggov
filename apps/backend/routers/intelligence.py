from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends

from auth import _require_admin
from db import get_db_connection

router = APIRouter()


@router.get("/api/intelligence/awards")
async def get_award_intelligence(
    naics: Optional[str] = None,
    limit: int = 50,
    _: None = Depends(_require_admin),
):
    conn = get_db_connection()
    cur = conn.cursor()

    if naics:
        cur.execute("""
            SELECT naics, agency, award_amount, awardee_name, award_date, contract_number, description
            FROM award_intelligence
            WHERE naics LIKE %s
            ORDER BY award_amount DESC NULLS LAST LIMIT %s
        """, (f"{naics[:4]}%", limit))
    else:
        cur.execute("""
            SELECT naics, agency, award_amount, awardee_name, award_date, contract_number, description
            FROM award_intelligence
            ORDER BY award_amount DESC NULLS LAST LIMIT %s
        """, (limit,))

    rows = cur.fetchall()

    cur.execute("""
        SELECT
          naics,
          COUNT(*) as award_count,
          AVG(award_amount) as avg_award,
          MIN(award_amount) as min_award,
          MAX(award_amount) as max_award,
          PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY award_amount) as median_award
        FROM award_intelligence
        GROUP BY naics
        ORDER BY award_count DESC
    """)
    stats = cur.fetchall()

    cur.close()
    conn.close()

    return {
        "awards": [{"naics": r[0], "agency": r[1],
                    "award_amount": float(r[2]) if r[2] else None,
                    "awardee_name": r[3],
                    "award_date": r[4].isoformat() if r[4] else None,
                    "contract_number": r[5], "description": r[6]} for r in rows],
        "market_stats": [{"naics": r[0], "award_count": r[1],
                          "avg_award": float(r[2]) if r[2] else None,
                          "min_award": float(r[3]) if r[3] else None,
                          "max_award": float(r[4]) if r[4] else None,
                          "median_award": float(r[5]) if r[5] else None} for r in stats],
        "last_updated": date.today().isoformat(),
    }
