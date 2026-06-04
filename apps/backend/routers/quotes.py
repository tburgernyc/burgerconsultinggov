import json

from fastapi import APIRouter, Depends, HTTPException

from auth import _require_admin
from db import get_db_connection
from gemini import client, types
from models import QuoteSubmitRequest

router = APIRouter()


@router.post("/api/quotes/submit")
async def submit_quote(request: QuoteSubmitRequest):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            INSERT INTO vendor_quotes
                (solicitation_id, vendor_id, line_items, total_amount,
                 labor_rate_hourly, materials_cost, period_of_performance,
                 pay_when_paid_confirmed, notes, status)
            VALUES (%s, %s::uuid, %s, %s, %s, %s, %s, %s, %s, 'PENDING_REVIEW')
            RETURNING id
        """, (
            request.solicitation_id, request.vendor_id,
            json.dumps(request.line_items), request.total_amount,
            request.labor_rate_hourly, request.materials_cost,
            request.period_of_performance, request.pay_when_paid_confirmed,
            request.notes,
        ))
        quote_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        conn.close()
        return {"status": "submitted", "quote_id": str(quote_id)}
    except Exception as e:
        conn.rollback()
        cur.close()
        conn.close()
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/api/quotes/{solicitation_id}")
async def get_quotes(solicitation_id: str, _: None = Depends(_require_admin)):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT q.id, q.vendor_id, v.legal_name, q.total_amount, q.labor_rate_hourly,
               q.materials_cost, q.period_of_performance, q.pay_when_paid_confirmed,
               q.recommendation, q.status, q.submitted_at, q.ai_evaluation, q.notes
        FROM vendor_quotes q
        LEFT JOIN vendor_registry v ON q.vendor_id = v.id
        WHERE q.solicitation_id=%s
        ORDER BY q.submitted_at DESC
    """, (solicitation_id,))
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return [{"id": str(r[0]), "vendor_id": str(r[1]), "vendor_name": r[2],
             "total_amount": float(r[3]) if r[3] else None,
             "labor_rate_hourly": float(r[4]) if r[4] else None,
             "materials_cost": float(r[5]) if r[5] else None,
             "period_of_performance": r[6], "pay_when_paid_confirmed": r[7],
             "recommendation": r[8], "status": r[9],
             "submitted_at": r[10].isoformat() if r[10] else None,
             "ai_evaluation": r[11], "notes": r[12]} for r in rows]


@router.post("/api/quotes/evaluate/{solicitation_id}")
async def evaluate_quotes_ai(solicitation_id: str, _: None = Depends(_require_admin)):
    """Use Gemini to rank all submitted quotes and recommend the optimal vendor."""
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT q.id, v.legal_name, q.total_amount, q.labor_rate_hourly,
               q.materials_cost, q.period_of_performance, q.pay_when_paid_confirmed,
               q.notes, v.performance_rating, v.contracts_completed
        FROM vendor_quotes q
        LEFT JOIN vendor_registry v ON q.vendor_id = v.id
        WHERE q.solicitation_id=%s AND q.status='PENDING_REVIEW'
    """, (solicitation_id,))
    quotes = cur.fetchall()

    cur.execute("""
        SELECT triage_report, agency, naics, estimated_value
        FROM solicitation_queue WHERE solicitation_id=%s
    """, (solicitation_id,))
    sol = cur.fetchone()
    cur.close()
    conn.close()

    if not quotes:
        raise HTTPException(status_code=404, detail="No pending quotes found for this solicitation.")

    triage_report = sol[0] if sol else {}
    deliverable_type = "IT Services"
    if triage_report:
        deliverable_type = (triage_report.get("section3_scope") or {}).get("primary_deliverable_type", "IT Services")

    quotes_text = "\n".join([
        f"Quote {i+1}: Vendor={r[1]}, Total=${r[2]:,.2f}, Labor Rate=${r[3] or 0}/hr, "
        f"Period={r[5]}, PWP_Confirmed={r[6]}, "
        f"Rating={r[8] or 'N/A'}, Contracts Completed={r[9] or 0}, Notes={r[7] or 'None'}"
        for i, r in enumerate(quotes)
    ])

    prompt = f"""You are the Chief Procurement Officer for Burger Consulting LLC, a federal IT services prime contractor
operating under the Zero-Float doctrine. NAICS: 541511 (Custom Software & Web Development), 541519 (IT Services & PM), 541512 (Systems Design).

Evaluate subcontractor quotes for solicitation {solicitation_id}
(Agency: {sol[1] if sol else 'TBD'}, NAICS: {sol[2] if sol else 'TBD'},
Est. Value: ${sol[3] or 0:,.0f}, Deliverable Type: {deliverable_type}).

SUBCONTRACTOR QUOTES:
{quotes_text}

Evaluate and return a JSON object with:
- "ranked_quotes": array of objects with vendor_name, rank (1=best), recommendation (AWARD/PROCEED/CLARIFY/REJECT),
  rationale (one sentence), risk_flags (array of strings), pay_when_paid_accepted (bool),
  insurance_compliant (bool), mobilization_readiness_score (1-10)
- "recommended_vendor": name of top choice
- "recommended_award_price": suggested prime contract price (vendor total + 15-20% margin, Zero-Float compliant)
- "evaluation_summary": 2-3 sentence overall assessment of compliance readiness and pricing
- "key_risks": array of top risks (clearance gaps, Section 508 capability, technical fit, pay-when-paid refusal)

Be objective. Prioritize: Pay-When-Paid acceptance > insurance compliance > mobilization speed > price > past performance.
A vendor accepting Pay-When-Paid at a slightly higher rate is preferable to a cheaper vendor requiring net-30 upfront."""

    try:
        response = client.models.generate_content(
            model="gemini-2.5-pro",
            contents=[prompt],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.1,
            ),
        )
        evaluation = json.loads(response.text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gemini evaluation error: {str(e)}")

    conn = get_db_connection()
    cur = conn.cursor()
    for q_row in quotes:
        q_id = q_row[0]
        vendor_name = q_row[1]
        ranked = evaluation.get("ranked_quotes", [])
        vendor_eval = next((r for r in ranked if r.get("vendor_name") == vendor_name), None)
        if vendor_eval:
            rec = vendor_eval.get("recommendation", "PENDING")
            cur.execute("""
                UPDATE vendor_quotes SET ai_evaluation=%s, recommendation=%s, reviewed_at=NOW()
                WHERE id=%s::uuid
            """, (json.dumps(vendor_eval), rec, str(q_id)))
    conn.commit()
    cur.close()
    conn.close()

    return {"solicitation_id": solicitation_id, "evaluation": evaluation}
