import secrets as _secrets
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException

from auth import _require_admin, _pwd_context
from db import get_db_connection
from emails import email_vendor_portal_access_granted

router = APIRouter()


@router.get("/api/admin/morning-brief")
async def morning_brief(_: None = Depends(_require_admin)):
    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT solicitation_id, agency, naics, estimated_value, triage_score,
               COALESCE(status, phase_status), response_deadline, created_at
        FROM solicitation_queue
        WHERE created_at >= NOW() - INTERVAL '24 hours'
        ORDER BY triage_score DESC NULLS LAST
    """)
    new_opps = [{"solicitation_id": r[0], "agency": r[1], "naics": r[2],
                 "estimated_value": float(r[3]) if r[3] else None,
                 "triage_score": r[4], "status": r[5],
                 "response_deadline": r[6].isoformat() if r[6] else None,
                 "created_at": r[7].isoformat() if r[7] else None} for r in cur.fetchall()]

    cur.execute("""
        SELECT id, legal_name, email, onboarding_status, created_at
        FROM vendor_registry
        WHERE onboarding_status IN ('DOCS_SUBMITTED', 'PENDING')
        ORDER BY created_at ASC
    """)
    pending_vendors = [{"id": str(r[0]), "legal_name": r[1], "email": r[2],
                        "onboarding_status": r[3],
                        "hours_in_queue": (datetime.utcnow() - r[4].replace(tzinfo=None)).total_seconds() / 3600
                        if r[4] else 0} for r in cur.fetchall()]

    cur.execute("""
        SELECT solicitation_id, agency, naics, estimated_value, triage_score, phase_status
        FROM solicitation_queue
        WHERE phase_status = 'READY_FOR_SOURCING'
        ORDER BY triage_score DESC NULLS LAST
    """)
    rfq_ready = [{"solicitation_id": r[0], "agency": r[1], "naics": r[2],
                  "estimated_value": float(r[3]) if r[3] else None,
                  "triage_score": r[4], "phase_status": r[5]} for r in cur.fetchall()]

    cur.execute("""
        SELECT c.contract_number, v.legal_name, c.contract_value,
               c.total_invoiced, c.total_received, c.next_invoice_date, c.contract_status
        FROM active_contracts c
        LEFT JOIN vendor_registry v ON c.vendor_id = v.id
        WHERE c.contract_status = 'ACTIVE'
    """)
    active_contracts = [{"contract_number": r[0], "vendor_name": r[1],
                         "contract_value": float(r[2]) if r[2] else None,
                         "total_invoiced": float(r[3]) if r[3] else 0,
                         "total_received": float(r[4]) if r[4] else 0,
                         "next_invoice_date": r[5].isoformat() if r[5] else None,
                         "contract_status": r[6]} for r in cur.fetchall()]

    cur.execute("""
        SELECT
          COALESCE(SUM(estimated_value), 0) as pipeline_value,
          COALESCE(SUM(estimated_value) * 0.15, 0) as projected_revenue_15pct
        FROM solicitation_queue
        WHERE phase_status IN ('READY_FOR_SOURCING', 'SOURCING_IN_PROGRESS',
                               'PRICING_PENDING', 'PROPOSAL_DRAFT', 'SUBMITTED')
    """)
    fin = cur.fetchone()

    cur.execute("""
        SELECT COALESCE(SUM(total_invoiced - total_received), 0)
        FROM active_contracts WHERE total_invoiced > total_received
    """)
    ar = cur.fetchone()[0]

    cur.execute("""
        SELECT solicitation_id, agency, response_deadline
        FROM solicitation_queue
        WHERE response_deadline IS NOT NULL
          AND response_deadline > NOW()
          AND response_deadline <= NOW() + INTERVAL '73 hours'
          AND phase_status NOT IN ('AWARDED', 'REJECTED')
        ORDER BY response_deadline ASC
    """)
    deadline_alerts = [{"solicitation_id": r[0], "agency": r[1],
                        "response_deadline": r[2].isoformat() if r[2] else None,
                        "hours_left": max(0, int((r[2].replace(tzinfo=None) - datetime.utcnow()).total_seconds() / 3600))
                        if r[2] else None} for r in cur.fetchall()]

    cur.execute("""
        SELECT
          COUNT(*) FILTER (WHERE oc.status = 'SENT') as active_campaigns,
          COUNT(*) FILTER (WHERE oc.status = 'SUBMITTED') as quotes_received,
          COUNT(DISTINCT oc.solicitation_id) FILTER (WHERE oc.status NOT IN ('OPT_OUT','BOUNCED')) as solicitations_in_outreach
        FROM outreach_campaigns oc
        WHERE oc.day0_sent_at >= NOW() - INTERVAL '30 days'
    """)
    outreach_row = cur.fetchone()

    cur.close()
    conn.close()

    return {
        "new_opportunities": new_opps,
        "approval_queue": {
            "vendor_applications": pending_vendors,
            "rfq_ready_for_dispatch": rfq_ready,
        },
        "active_contract_health": active_contracts,
        "financial_snapshot": {
            "pipeline_value": float(fin[0]),
            "projected_revenue_15pct": float(fin[1]),
            "accounts_receivable": float(ar),
        },
        "deadline_alerts": deadline_alerts,
        "outreach_summary": {
            "active_campaigns": int(outreach_row[0] or 0),
            "quotes_received": int(outreach_row[1] or 0),
            "solicitations_in_outreach": int(outreach_row[2] or 0),
        },
    }


@router.get("/api/admin/approval-queue")
async def get_approval_queue(_: None = Depends(_require_admin)):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT id, legal_name, email, onboarding_status, created_at
        FROM vendor_registry
        WHERE onboarding_status IN ('DOCS_SUBMITTED', 'PENDING')
        ORDER BY created_at ASC
    """)
    vendors = [{"id": str(r[0]), "legal_name": r[1], "email": r[2],
                "onboarding_status": r[3],
                "created_at": r[4].isoformat() if r[4] else None} for r in cur.fetchall()]

    cur.execute("""
        SELECT solicitation_id, agency, triage_score, phase_status
        FROM solicitation_queue WHERE phase_status='READY_FOR_SOURCING'
        ORDER BY triage_score DESC NULLS LAST
    """)
    rfqs = [{"solicitation_id": r[0], "agency": r[1], "triage_score": r[2],
             "phase_status": r[3]} for r in cur.fetchall()]

    cur.close()
    conn.close()
    return {"vendor_applications": vendors, "rfq_dispatch_queue": rfqs}


@router.post("/api/admin/vendor/approve/{vendor_id}")
async def approve_vendor(vendor_id: str, _: None = Depends(_require_admin)):
    temp_password = _secrets.token_urlsafe(10)
    pwd_hash = _pwd_context.hash(temp_password)
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        UPDATE vendor_registry
        SET onboarding_status='VERIFIED', portal_access=true, portal_password_hash=%s
        WHERE id=%s::uuid
        RETURNING email, legal_name
    """, (pwd_hash, vendor_id))
    row = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Vendor not found")
    email_vendor_portal_access_granted(row[0], row[1], temp_password)
    return {"status": "approved", "vendor_id": vendor_id,
            "email": row[0], "legal_name": row[1],
            "note": "Portal access granted. Credentials email dispatched."}
