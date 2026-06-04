from fastapi import APIRouter, Depends

from auth import _require_admin
from db import get_db_connection

router = APIRouter()


@router.get("/api/admin/financials")
async def get_financials(_: None = Depends(_require_admin)):
    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT
          COALESCE(SUM(total_received), 0) AS gross_revenue,
          COALESCE(SUM(subcontract_value * (total_received / NULLIF(contract_value, 0))), 0) AS est_cogs,
          COALESCE(SUM(estimated_prime_revenue), 0) AS estimated_gross_profit,
          COUNT(*) AS total_contracts
        FROM active_contracts
        WHERE contract_status IN ('ACTIVE', 'CLOSED')
    """)
    pl = cur.fetchone()
    gross_revenue = float(pl[0])
    est_cogs = float(pl[1])
    est_gross_profit = float(pl[2])

    cur.execute("""
        SELECT
          SUM(CASE WHEN last_invoice_date >= CURRENT_DATE - 30 THEN total_invoiced - total_received ELSE 0 END) AS current_ar,
          SUM(CASE WHEN last_invoice_date < CURRENT_DATE - 30 AND last_invoice_date >= CURRENT_DATE - 60 THEN total_invoiced - total_received ELSE 0 END) AS ar_30_60,
          SUM(CASE WHEN last_invoice_date < CURRENT_DATE - 60 AND last_invoice_date >= CURRENT_DATE - 90 THEN total_invoiced - total_received ELSE 0 END) AS ar_60_90,
          SUM(CASE WHEN last_invoice_date < CURRENT_DATE - 90 THEN total_invoiced - total_received ELSE 0 END) AS ar_90_plus
        FROM active_contracts
        WHERE total_invoiced > total_received
    """)
    ar = cur.fetchone()

    cur.execute("""
        SELECT
          COALESCE(SUM(estimated_value * 0.15), 0) AS pipeline_revenue_15pct,
          COALESCE(SUM(estimated_value), 0) AS total_pipeline_value,
          COUNT(*) AS active_bids
        FROM solicitation_queue
        WHERE phase_status IN ('READY_FOR_SOURCING', 'SOURCING_IN_PROGRESS',
                               'PRICING_PENDING', 'PROPOSAL_DRAFT', 'SUBMITTED')
    """)
    pipeline = cur.fetchone()

    cur.execute("""
        SELECT s.naics,
               AVG(c.prime_margin_pct) AS avg_margin,
               SUM(c.total_received) AS revenue,
               COUNT(*) AS contracts
        FROM active_contracts c
        JOIN solicitation_queue s ON c.solicitation_id = s.solicitation_id
        GROUP BY s.naics
    """)
    margin_by_naics = [{"naics": r[0], "avg_margin": float(r[1]) if r[1] else None,
                         "revenue": float(r[2]) if r[2] else 0,
                         "contracts": r[3]} for r in cur.fetchall()]

    cur.execute("""
        SELECT
          SUM(CASE WHEN phase_status = 'AWARDED' THEN 1 ELSE 0 END) AS won,
          SUM(CASE WHEN phase_status = 'REJECTED' THEN 1 ELSE 0 END) AS rejected,
          COUNT(*) AS total_triaged
        FROM solicitation_queue
        WHERE triage_score IS NOT NULL
    """)
    wr = cur.fetchone()
    won = wr[0] or 0
    total = max(1, (wr[0] or 0) + (wr[1] or 0))
    win_rate = round(won / total * 100, 1)

    cur.close()
    conn.close()

    return {
        "pl_snapshot": {
            "gross_revenue": gross_revenue,
            "estimated_cogs": est_cogs,
            "estimated_gross_profit": est_gross_profit,
            "gross_margin_pct": round((est_gross_profit / max(1, gross_revenue)) * 100, 1),
            "total_contracts": int(pl[3]),
        },
        "ar_aging": {
            "current_0_30": float(ar[0] or 0),
            "days_30_60": float(ar[1] or 0),
            "days_60_90": float(ar[2] or 0),
            "days_90_plus": float(ar[3] or 0),
            "total_ar": float((ar[0] or 0) + (ar[1] or 0) + (ar[2] or 0) + (ar[3] or 0)),
        },
        "pipeline_forecast": {
            "total_pipeline_value": float(pipeline[0]),
            "revenue_at_15pct": float(pipeline[0]),
            "actual_pipeline_value": float(pipeline[1]),
            "active_bids": int(pipeline[2]),
        },
        "margin_by_naics": margin_by_naics,
        "win_rate_pct": win_rate,
        "bids_won": int(won),
        "bids_total": int(wr[2] or 0),
    }
