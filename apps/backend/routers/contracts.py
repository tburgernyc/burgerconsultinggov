from datetime import date, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from auth import _require_admin, _require_gateway
from db import get_db_connection
from emails import email_payment_confirmed
from obs import audit, fail
from gemini import client, types
from models import (
    AgreementSignRequest,
    ContractAwardRequest,
    InvoiceRequest,
    MilestoneCreateRequest,
    PaymentUpdateRequest,
)

router = APIRouter()


@router.get("/api/contracts/active")
async def get_active_contracts(_: None = Depends(_require_gateway)):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT c.id, c.contract_number, c.agency, c.contract_value,
               c.prime_margin_pct, v.legal_name, c.subcontract_value,
               c.performance_start, c.performance_end, c.next_invoice_date,
               c.total_invoiced, c.total_received, c.contract_status, c.created_at
        FROM active_contracts c
        LEFT JOIN vendor_registry v ON c.vendor_id = v.id
        WHERE c.contract_status = 'ACTIVE'
        ORDER BY c.created_at DESC
    """)
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return [{"id": str(r[0]), "contract_number": r[1], "agency": r[2],
             "contract_value": float(r[3]) if r[3] else None,
             "prime_margin_pct": float(r[4]) if r[4] else None,
             "vendor_name": r[5], "subcontract_value": float(r[6]) if r[6] else None,
             "performance_start": r[7].isoformat() if r[7] else None,
             "performance_end": r[8].isoformat() if r[8] else None,
             "next_invoice_date": r[9].isoformat() if r[9] else None,
             "total_invoiced": float(r[10]) if r[10] else 0,
             "total_received": float(r[11]) if r[11] else 0,
             "contract_status": r[12],
             "created_at": r[13].isoformat() if r[13] else None} for r in rows]


@router.post("/api/contracts/award")
async def award_contract(request: ContractAwardRequest, _: None = Depends(_require_admin)):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        prime_revenue = request.contract_value * (request.prime_margin_pct / 100)
        cur.execute("""
            INSERT INTO active_contracts
                (solicitation_id, contract_number, agency, contract_value,
                 prime_margin_pct, estimated_prime_revenue, vendor_id,
                 subcontract_value, performance_start, performance_end)
            VALUES (%s, %s, %s, %s, %s, %s, %s::uuid, %s, %s, %s)
            RETURNING id
        """, (
            request.solicitation_id, request.contract_number, request.agency,
            request.contract_value, request.prime_margin_pct, prime_revenue,
            request.vendor_id, request.subcontract_value,
            request.performance_start, request.performance_end,
        ))
        contract_id = cur.fetchone()[0]
        cur.execute("""
            UPDATE solicitation_queue SET phase_status='AWARDED', updated_at=NOW()
            WHERE solicitation_id=%s
        """, (request.solicitation_id,))
        conn.commit()
        cur.close()
        conn.close()
        audit("contract.award", actor="admin", target=str(contract_id),
              detail={"solicitation_id": request.solicitation_id})
        return {"status": "awarded", "contract_id": str(contract_id)}
    except Exception as e:
        conn.rollback()
        cur.close()
        conn.close()
        raise fail(400, "Could not award contract", e)


@router.post("/api/contracts/{contract_id}/invoice")
async def submit_invoice(contract_id: str, request: InvoiceRequest,
                          _: None = Depends(_require_admin)):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        UPDATE active_contracts
        SET total_invoiced = COALESCE(total_invoiced, 0) + %s,
            last_invoice_date = NOW()::date,
            last_invoice_amount = %s
        WHERE id=%s::uuid
    """, (request.total_amount, request.total_amount, contract_id))
    conn.commit()
    cur.close()
    conn.close()
    return {"status": "invoice_submitted", "contract_id": contract_id, "amount": request.total_amount}


@router.put("/api/contracts/{contract_id}/payment")
async def record_payment(contract_id: str, request: PaymentUpdateRequest,
                          _: None = Depends(_require_admin)):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        UPDATE active_contracts
        SET total_received = COALESCE(total_received, 0) + %s
        WHERE id=%s::uuid
        RETURNING total_received, contract_number, vendor_id, subcontract_value
    """, (request.payment_amount, contract_id))
    row = cur.fetchone()

    vendor_email = vendor_name = contract_number = None
    if row and row[2]:
        cur.execute("SELECT email, legal_name FROM vendor_registry WHERE id=%s", (row[2],))
        vrow = cur.fetchone()
        if vrow:
            vendor_email, vendor_name = vrow[0], vrow[1]
        contract_number = row[1]

    conn.commit()
    cur.close()
    conn.close()

    if vendor_email and contract_number:
        payment_due = (date.today() + timedelta(days=30)).strftime("%B %d, %Y")
        email_payment_confirmed(vendor_email, vendor_name, contract_number,
                                request.payment_amount, payment_due)

    return {"status": "payment_recorded", "contract_id": contract_id,
            "total_received": float(row[0]) if row else None}


@router.get("/api/contracts/{contract_id}/milestones")
async def get_milestones(contract_id: str, _: None = Depends(_require_gateway)):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT id, milestone_name, description, due_date, completed_at,
               status, deliverable_url, invoice_amount, notes, created_at
        FROM contract_milestones WHERE contract_id=%s::uuid ORDER BY due_date ASC NULLS LAST
    """, (contract_id,))
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return [{"id": str(r[0]), "milestone_name": r[1], "description": r[2],
             "due_date": r[3].isoformat() if r[3] else None,
             "completed_at": r[4].isoformat() if r[4] else None,
             "status": r[5], "deliverable_url": r[6],
             "invoice_amount": float(r[7]) if r[7] else None,
             "notes": r[8], "created_at": r[9].isoformat() if r[9] else None} for r in rows]


@router.post("/api/contracts/{contract_id}/milestones")
async def create_milestone(contract_id: str, request: MilestoneCreateRequest,
                            _: None = Depends(_require_admin)):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO contract_milestones
            (contract_id, milestone_name, description, due_date, invoice_amount, deliverable_url, notes)
        VALUES (%s::uuid, %s, %s, %s, %s, %s, %s) RETURNING id
    """, (contract_id, request.milestone_name, request.description,
          request.due_date, request.invoice_amount, request.deliverable_url, request.notes))
    milestone_id = cur.fetchone()[0]
    conn.commit()
    cur.close()
    conn.close()
    return {"status": "created", "milestone_id": str(milestone_id)}


@router.put("/api/contracts/{contract_id}/milestones/{milestone_id}")
async def update_milestone(contract_id: str, milestone_id: str,
                            status: str = Query(...),
                            deliverable_url: Optional[str] = Query(None),
                            _: None = Depends(_require_admin)):
    conn = get_db_connection()
    cur = conn.cursor()
    completed_at = "NOW()" if status == "COMPLETE" else "NULL"
    cur.execute(f"""
        UPDATE contract_milestones
        SET status=%s, completed_at={completed_at}, deliverable_url=COALESCE(%s, deliverable_url)
        WHERE id=%s::uuid AND contract_id=%s::uuid
    """, (status, deliverable_url, milestone_id, contract_id))
    conn.commit()
    cur.close()
    conn.close()
    return {"status": "updated", "milestone_id": milestone_id, "new_status": status}


@router.get("/api/subcontractor-searches")
async def list_subcontractor_searches(_: None = Depends(_require_admin)):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT id, solicitation_id, search_query, required_skills,
               budget_min, budget_max, candidates_found, status, created_at
        FROM subcontractor_searches ORDER BY created_at DESC LIMIT 50
    """)
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return [{"id": str(r[0]), "solicitation_id": r[1], "search_query": r[2],
             "required_skills": r[3],
             "budget_min": float(r[4]) if r[4] else None,
             "budget_max": float(r[5]) if r[5] else None,
             "candidates_found": r[6], "status": r[7],
             "created_at": r[8].isoformat() if r[8] else None} for r in rows]


@router.post("/api/contracts/{contract_id}/agreement/generate")
async def generate_agreement(contract_id: str, _: None = Depends(_require_admin)):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT c.contract_number, c.agency, c.contract_value, c.prime_margin_pct,
               c.subcontract_value, c.performance_start, c.performance_end,
               c.solicitation_id, v.legal_name, v.email, v.city, v.state
        FROM active_contracts c
        LEFT JOIN vendor_registry v ON c.vendor_id = v.id
        WHERE c.id = %s::uuid
    """, (contract_id,))
    row = cur.fetchone()
    if not row:
        cur.close()
        conn.close()
        raise HTTPException(status_code=404, detail="Contract not found")

    (contract_number, agency, contract_value, prime_margin_pct, subcontract_value,
     perf_start, perf_end, sol_id, vendor_name, vendor_email,
     vendor_city, vendor_state) = row

    perf_start_str = perf_start.strftime("%B %d, %Y") if perf_start else "TBD"
    perf_end_str = perf_end.strftime("%B %d, %Y") if perf_end else "TBD"
    sub_value_str = f"${float(subcontract_value):,.2f}" if subcontract_value else "See Exhibit A"

    prompt = f"""Draft a professional federal subcontract agreement between:

PRIME CONTRACTOR: Burger Consulting LLC, a New York LLC (EIN 84-3113166), 105 E 117th St Apt 5F, New York NY 10035 ("Prime")
SUBCONTRACTOR: {vendor_name or "Subcontractor"}{f", {vendor_city}, {vendor_state}" if vendor_city else ""} ("Subcontractor")

CONTRACT DETAILS:
- Prime Contract Number: {contract_number}
- Federal Agency: {agency or "Federal Agency"}
- Solicitation ID: {sol_id or "N/A"}
- Subcontract Value: {sub_value_str}
- Period of Performance: {perf_start_str} – {perf_end_str}

Include the following sections in order:
1. Parties and Recitals
2. Scope of Work (reference prime contract scope; Subcontractor shall perform IT services as directed)
3. Compensation and Payment (Pay-When-Paid: payment within 30 days of Prime's receipt from agency; Net-30)
4. Period of Performance
5. Deliverables and Acceptance
6. Representations and Warranties (8(a) compliance if applicable, cyber requirements, Section 508)
7. Flow-Down Clauses (FAR 52.222-26 Equal Opportunity, FAR 52.222-35 Veterans, FAR 52.204-21 Basic Safeguarding)
8. Intellectual Property (work-for-hire; all deliverables belong to U.S. Government)
9. Confidentiality
10. Termination (for convenience and for cause)
11. Dispute Resolution (governing law: New York; arbitration)
12. Signatures (Prime signature line for Timothy J. Burger, President; Subcontractor signature line)

Write in formal legal prose. Keep it concise but complete — approximately 800-1000 words.
Do not use placeholders like [INSERT]. Use the actual values provided above.
Return only the agreement text, no commentary."""

    try:
        resp = client.models.generate_content(
            model="gemini-2.5-pro",
            contents=[prompt],
            config=types.GenerateContentConfig(temperature=0.1),
        )
        agreement_text = resp.text.strip()
    except Exception as e:
        cur.close()
        conn.close()
        raise fail(502, "Agreement generation failed", e)

    cur.execute("""
        UPDATE active_contracts
        SET subcontract_agreement = %s, agreement_signed_at = NULL, agreement_signed_by = NULL
        WHERE id = %s::uuid
        RETURNING id
    """, (agreement_text, contract_id))
    conn.commit()
    cur.close()
    conn.close()
    return {"success": True, "agreement": agreement_text}


@router.get("/api/contracts/{contract_id}/agreement")
async def get_agreement(contract_id: str, _: None = Depends(_require_gateway)):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT subcontract_agreement, agreement_signed_at, agreement_signed_by,
               contract_number, vendor_id
        FROM active_contracts WHERE id = %s::uuid
    """, (contract_id,))
    row = cur.fetchone()
    cur.close()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Contract not found")
    agreement, signed_at, signed_by, contract_number, vendor_id = row
    return {
        "contract_id": contract_id,
        "contract_number": contract_number,
        "agreement": agreement,
        "signed": signed_at is not None,
        "signed_at": signed_at.isoformat() if signed_at else None,
        "signed_by": signed_by,
    }


@router.post("/api/contracts/{contract_id}/agreement/sign")
async def sign_agreement(contract_id: str, request: AgreementSignRequest,
                         _: None = Depends(_require_gateway)):
    if not request.signed_by or len(request.signed_by.strip()) < 2:
        raise HTTPException(status_code=400, detail="Full name required to sign")
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        UPDATE active_contracts
        SET agreement_signed_at = NOW(), agreement_signed_by = %s
        WHERE id = %s::uuid
          AND subcontract_agreement IS NOT NULL
          AND agreement_signed_at IS NULL
        RETURNING id, agreement_signed_at
    """, (request.signed_by.strip(), contract_id))
    row = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()
    if not row:
        raise HTTPException(status_code=400,
                            detail="Agreement not found, not yet generated, or already signed")
    return {
        "success": True,
        "signed_at": row[1].isoformat() if row[1] else None,
        "signed_by": request.signed_by.strip(),
    }
