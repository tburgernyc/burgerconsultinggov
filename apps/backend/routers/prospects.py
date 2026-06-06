import json
import os
import requests
from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request

from auth import _require_admin
from db import get_db_connection
from emails import email_outreach_initial
from gemini import client, types
from models import ManualProspectRequest, ProspectQuoteRequest

router = APIRouter()


@router.get("/api/prospects/discover/{sol_id}")
async def discover_prospects(sol_id: str, _: None = Depends(_require_admin)):
    """Query SAM.gov Entity API + USASpending for NAICS-matched vendors; AI-score prospects."""
    sam_key = os.getenv("SAM_API_KEY", "")

    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT naics, agency, estimated_value FROM solicitation_queue WHERE solicitation_id=%s", (sol_id,))
    sol = cur.fetchone()
    cur.close()
    conn.close()

    if not sol:
        raise HTTPException(status_code=404, detail="Solicitation not found")

    naics_code = sol[0] or "541511"
    agency = sol[1] or ""
    est_value = float(sol[2] or 0)

    prospects: list[dict] = []

    if sam_key and not sam_key.startswith("placeholder"):
        try:
            params = {
                "api_key": sam_key,
                "naicsCode": naics_code,
                "registrationStatus": "A",
                "countryCode": "USA",
                "includeSections": "entityRegistration,coreData,assertions,pointsOfContact",
            }
            resp = requests.get(
                "https://api.sam.gov/entity-information/v3/entities",
                params=params, timeout=20,
            )
            if resp.status_code == 200:
                entities = resp.json().get("entityData", [])
                for e in entities:
                    reg = e.get("entityRegistration", {})
                    core = e.get("coreData", {})
                    assertions = e.get("assertions", {})
                    pocs = e.get("pointsOfContact", {})
                    addr = core.get("physicalAddress", {})
                    entity_info = core.get("entityInformation", {})
                    biz_types = core.get("businessTypes", {})

                    poc = pocs.get("electronicBusinessPOC") or pocs.get("governmentBusinessPOC") or {}
                    contact_name = f"{poc.get('firstName','') or ''} {poc.get('lastName','') or ''}".strip()

                    naics_list = [
                        n["naicsCode"] for n in
                        assertions.get("goodsAndServices", {}).get("naicsList", [])
                        if n.get("naicsCode")
                    ] or [naics_code]

                    bt_list = [
                        bt.get("businessTypeDesc", "")
                        for bt in biz_types.get("businessTypeList", [])
                        if bt.get("businessTypeDesc")
                    ]

                    prospects.append({
                        "source": "SAM_GOV",
                        "entity_name": reg.get("legalBusinessName", ""),
                        "uei": reg.get("ueiSAM", ""),
                        "cage_code": reg.get("cageCode", ""),
                        "contact_name": contact_name,
                        "contact_email": "",
                        "contact_phone": "",
                        "entity_url": entity_info.get("entityURL", ""),
                        "naics_codes": naics_list,
                        "city": addr.get("city", ""),
                        "state": addr.get("stateOrProvinceCode", ""),
                        "business_types": bt_list,
                        "past_performance": [],
                    })
        except Exception as e:
            print(f"[DISCOVERY] SAM.gov fetch error: {e}")

    try:
        payload = {
            "filters": {
                "award_type_codes": ["A", "B", "C", "D"],
                "naics_codes": [naics_code, "541511", "541519", "541512"],
                "time_period": [{
                    "start_date": (date.today() - timedelta(days=365 * 3)).strftime("%Y-%m-%d"),
                    "end_date": date.today().strftime("%Y-%m-%d"),
                }],
            },
            "fields": ["Recipient Name", "Award Amount", "Recipient UEI", "NAICS Code",
                       "Start Date", "Awarding Agency", "recipient_location_state_code",
                       "recipient_location_city_name"],
            "sort": "Award Amount",
            "order": "desc",
            "limit": 100,
            "page": 1,
        }
        resp = requests.post(
            "https://api.usaspending.gov/api/v2/search/spending_by_award/",
            json=payload, timeout=20,
        )
        if resp.status_code == 200:
            seen_ueis: set[str] = {p.get("uei", "") for p in prospects}
            for award in resp.json().get("results", []):
                uei = award.get("Recipient UEI", "")
                if uei in seen_ueis:
                    for p in prospects:
                        if p.get("uei") == uei:
                            p["past_performance"].append({
                                "agency": award.get("Awarding Agency", ""),
                                "naics": award.get("NAICS Code", ""),
                                "award_amount": award.get("Award Amount", 0),
                                "year": (award.get("Start Date") or "")[:4],
                            })
                    continue
                seen_ueis.add(uei)
                prospects.append({
                    "source": "USASPENDING",
                    "entity_name": award.get("Recipient Name", ""),
                    "uei": uei,
                    "cage_code": "",
                    "contact_name": "",
                    "contact_email": "",
                    "contact_phone": "",
                    "naics_codes": [award.get("NAICS Code", naics_code)],
                    "city": award.get("recipient_location_city_name", ""),
                    "state": award.get("recipient_location_state_code", ""),
                    "business_types": [],
                    "past_performance": [{
                        "agency": award.get("Awarding Agency", ""),
                        "naics": award.get("NAICS Code", ""),
                        "award_amount": award.get("Award Amount", 0),
                        "year": (award.get("Start Date") or "")[:4],
                    }],
                })
    except Exception as e:
        print(f"[DISCOVERY] USASpending fetch error: {e}")

    if not prospects:
        return {"solicitation_id": sol_id, "prospects": [], "total": 0}

    prospects_summary = "\n".join([
        f"{i+1}. {p['entity_name']} | Source: {p['source']} | "
        f"NAICS: {','.join(p['naics_codes'])} | State: {p['state']} | "
        f"Past perf: {len(p['past_performance'])} federal award(s) | "
        f"Business types: {','.join(p['business_types']) or 'unknown'}"
        for i, p in enumerate(prospects[:50])
    ])

    scoring_prompt = f"""You are evaluating subcontractor prospects for Burger Consulting LLC (BCG),
a federal IT services prime contractor (NAICS 541511/541519/541512).

Solicitation: {sol_id} | Agency: {agency} | NAICS: {naics_code} | Est. Value: ${est_value:,.0f}

Score each prospect 1-10 for fit as a BCG subcontractor:
- 9-10: Proven federal IT past performance, NAICS match, small business, remote-capable
- 7-8: Some federal experience or strong NAICS match
- 5-6: NAICS adjacent or limited federal history
- 1-4: No evident federal IT capability or NAICS mismatch

PROSPECTS:
{prospects_summary}

Return JSON: {{"scores": [{{"index": 1, "score": 8, "reason": "one sentence"}}]}}
Only include index and score and reason. Return exactly {min(len(prospects), 50)} entries."""

    try:
        score_resp = client.models.generate_content(
            model="gemini-2.5-pro",
            contents=[scoring_prompt],
            config=types.GenerateContentConfig(response_mime_type="application/json", temperature=0.1),
        )
        score_data = json.loads(score_resp.text)
        scores = {s["index"]: (s["score"], s.get("reason", "")) for s in score_data.get("scores", [])}
    except Exception as e:
        print(f"[DISCOVERY] Gemini scoring error: {e}")
        scores = {}

    for i, p in enumerate(prospects[:50]):
        score, reason = scores.get(i + 1, (5, ""))
        p["qualification_score"] = score
        p["score_reason"] = reason

    prospects.sort(key=lambda p: p.get("qualification_score", 0), reverse=True)
    return {"solicitation_id": sol_id, "prospects": prospects[:50], "total": len(prospects)}


@router.post("/api/outreach/launch/{sol_id}")
async def launch_outreach(sol_id: str, request: Request, _: None = Depends(_require_admin)):
    """Persist selected prospects and send Day 0 outreach emails with tokenized quote links."""
    body = await request.json()
    selected_indices: list[int] = body.get("prospect_indices", [])
    all_prospects: list[dict] = body.get("prospects", [])
    selected = [all_prospects[i] for i in selected_indices if i < len(all_prospects)]

    if not selected:
        raise HTTPException(status_code=400, detail="No prospects selected")

    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT agency, naics, estimated_value, response_deadline, pdf_url
        FROM solicitation_queue WHERE solicitation_id=%s
    """, (sol_id,))
    sol = cur.fetchone()
    if not sol:
        cur.close()
        conn.close()
        raise HTTPException(status_code=404, detail="Solicitation not found")
    agency, naics, est_value, deadline, pdf_url = sol
    deadline_str = deadline.strftime("%B %d, %Y") if deadline else "TBD"

    brief_prompt = f"""Write a concise, professional subcontract scope brief for this federal IT solicitation.
Solicitation: {sol_id} | Agency: {agency} | NAICS: {naics} | Value: ${float(est_value or 0):,.0f} | Deadline: {deadline_str}

The brief is sent to prospective subcontractors to explain the scope and get a quote.
Write 4-6 bullet points describing: deliverable type, key technical requirements, period of performance,
any special requirements (Section 508, security, remote OK, etc.), and contract type.
Keep it plain-text, factual, under 150 words. Start each bullet with a dash."""

    sow_brief = ""
    try:
        brief_resp = client.models.generate_content(
            model="gemini-2.5-pro", contents=[brief_prompt],
            config=types.GenerateContentConfig(temperature=0.2),
        )
        sow_brief = brief_resp.text.strip()
    except Exception as e:
        print(f"[OUTREACH] SOW brief generation error: {e}")
        sow_brief = (f"Federal IT services solicitation {sol_id} — {agency or 'Federal Agency'}. "
                     f"NAICS {naics}. Estimated value ${float(est_value or 0):,.0f}. Deadline {deadline_str}.")

    admin_domain = os.getenv("NEXTAUTH_URL", "https://www.burgergov.com")
    launched, failed = 0, 0

    for p in selected:
        cur.execute("""
            INSERT INTO vendor_prospects
                (source, entity_name, uei, cage_code, contact_name, contact_email,
                 contact_phone, naics_codes, city, state, business_types,
                 past_performance, qualification_score, status)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,'OUTREACH_SENT')
            ON CONFLICT (uei) WHERE uei IS NOT NULL DO UPDATE SET
                contact_email = EXCLUDED.contact_email,
                qualification_score = EXCLUDED.qualification_score,
                status = 'OUTREACH_SENT', updated_at = NOW()
            RETURNING id
        """, (
            p.get("source", "MANUAL"), p["entity_name"],
            p.get("uei") or None, p.get("cage_code") or None,
            p.get("contact_name") or None, p.get("contact_email") or None,
            p.get("contact_phone") or None,
            p.get("naics_codes", [naics]),
            p.get("city") or None, p.get("state") or None,
            p.get("business_types", []),
            json.dumps(p.get("past_performance", [])),
            p.get("qualification_score", 5),
        ))
        row = cur.fetchone()
        if not row:
            continue
        prospect_id = row[0]

        cur.execute("""
            INSERT INTO outreach_campaigns
                (solicitation_id, prospect_id, sow_brief, status, day0_sent_at)
            VALUES (%s, %s::uuid, %s, 'SENT', NOW())
            RETURNING id, quote_token
        """, (sol_id, str(prospect_id), sow_brief))
        camp = cur.fetchone()
        if not camp:
            continue
        campaign_id, quote_token = camp

        email_addr = p.get("contact_email", "")
        if email_addr and "@" in email_addr:
            quote_url = f"{admin_domain}/quote/{quote_token}"
            opt_out_url = f"{admin_domain}/optout/{quote_token}"
            try:
                email_outreach_initial(
                    email_addr, p["entity_name"], sol_id, agency or "",
                    naics or "", sow_brief, quote_url, deadline_str,
                    float(est_value or 0), opt_out_url,
                )
                launched += 1
            except Exception as e:
                print(f"[OUTREACH] Email send failed for {email_addr}: {e}")
                failed += 1
        else:
            launched += 1

        conn.commit()

    cur.close()
    conn.close()
    return {"solicitation_id": sol_id, "launched": launched, "failed": failed, "sow_brief": sow_brief}


@router.get("/api/outreach/campaigns/{sol_id}")
async def get_outreach_campaigns(sol_id: str, _: None = Depends(_require_admin)):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT oc.id, oc.quote_token, vp.entity_name, vp.contact_email, vp.contact_name,
               vp.qualification_score, vp.city, vp.state, vp.source,
               oc.status, oc.day0_sent_at, oc.day3_sent_at, oc.day7_sent_at, oc.submitted_at
        FROM outreach_campaigns oc
        JOIN vendor_prospects vp ON oc.prospect_id = vp.id
        WHERE oc.solicitation_id = %s
        ORDER BY vp.qualification_score DESC, oc.day0_sent_at DESC
    """, (sol_id,))
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return {"solicitation_id": sol_id, "campaigns": [{
        "campaign_id": str(r[0]),
        "quote_token": str(r[1]),
        "entity_name": r[2],
        "contact_email": r[3],
        "contact_name": r[4],
        "qualification_score": r[5],
        "city": r[6],
        "state": r[7],
        "source": r[8],
        "status": r[9],
        "day0_sent_at": r[10].isoformat() if r[10] else None,
        "day3_sent_at": r[11].isoformat() if r[11] else None,
        "day7_sent_at": r[12].isoformat() if r[12] else None,
        "submitted_at": r[13].isoformat() if r[13] else None,
    } for r in rows]}


@router.get("/api/quote/{token}")
async def get_quote_brief(token: str):
    """Public — returns solicitation brief for tokenized quote form."""
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT oc.sow_brief, oc.solicitation_id, sq.agency, sq.naics,
               sq.estimated_value, sq.response_deadline, vp.entity_name, vp.contact_name
        FROM outreach_campaigns oc
        JOIN solicitation_queue sq ON oc.solicitation_id = sq.solicitation_id
        JOIN vendor_prospects vp ON oc.prospect_id = vp.id
        WHERE oc.quote_token = %s::uuid
          AND oc.status NOT IN ('SUBMITTED', 'OPT_OUT', 'BOUNCED')
    """, (token,))
    row = cur.fetchone()
    cur.close()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Quote link not found or already submitted")
    return {
        "sow_brief": row[0],
        "solicitation_id": row[1],
        "agency": row[2],
        "naics": row[3],
        "estimated_value": float(row[4]) if row[4] else None,
        "response_deadline": row[5].isoformat() if row[5] else None,
        "entity_name": row[6],
        "contact_name": row[7],
    }


@router.post("/api/quote/{token}")
async def submit_prospect_quote(token: str, request: ProspectQuoteRequest):
    """Public — prospect submits quote via tokenized link. No auth required."""
    conn = get_db_connection()
    cur = conn.cursor()

    # Identity is resolved from the campaign-bound prospect record, NEVER from the
    # request body. A public quote submission must not be able to claim, or overwrite,
    # an arbitrary vendor identity by supplying someone else's email.
    cur.execute("""
        SELECT oc.id, oc.prospect_id, oc.solicitation_id,
               vp.entity_name, vp.contact_email, vp.contact_name
        FROM outreach_campaigns oc
        JOIN vendor_prospects vp ON oc.prospect_id = vp.id
        WHERE oc.quote_token = %s::uuid
          AND oc.status NOT IN ('SUBMITTED', 'OPT_OUT', 'BOUNCED')
    """, (token,))
    row = cur.fetchone()
    if not row:
        cur.close()
        conn.close()
        raise HTTPException(status_code=404, detail="Quote link not found or already used")

    campaign_id, prospect_id, sol_id, prospect_name, prospect_email, prospect_contact = row
    legal_name = prospect_name or request.vendor_name

    # Find any existing registry row for the prospect's (campaign-bound) email.
    existing = None
    if prospect_email:
        cur.execute(
            "SELECT id, portal_access, onboarding_status FROM vendor_registry WHERE email=%s",
            (prospect_email,),
        )
        existing = cur.fetchone()

    if existing:
        vendor_id, portal_access, onboarding_status = existing
        prospect_scoped = (not portal_access) and (onboarding_status in ("PROSPECT_QUOTE", "DISCOVERED"))
        if prospect_scoped:
            # Safe to refresh a row that is itself just a prospect placeholder. The
            # guarded WHERE clause makes this a no-op against any vetted row, even if
            # the status changed between the SELECT and here (TOCTOU-safe).
            cur.execute("""
                UPDATE vendor_registry
                SET legal_name=%s, tech_stack=%s, pay_when_paid_accepted=%s
                WHERE id=%s::uuid AND portal_access=false
                  AND onboarding_status IN ('PROSPECT_QUOTE','DISCOVERED')
            """, (legal_name, request.tech_stack or [], request.pay_when_paid_accepted, str(vendor_id)))
        # else: a vetted / portal-enabled vendor responded — link the quote to them but
        # never mutate their identity record from this unauthenticated path.
    else:
        # No registry row yet — create a prospect-scoped one bound to the prospect email.
        cur.execute("""
            INSERT INTO vendor_registry
                (legal_name, contact_name, email, pay_when_paid_accepted,
                 tech_stack, onboarding_status, portal_access)
            VALUES (%s, %s, %s, %s, %s, 'PROSPECT_QUOTE', false)
            RETURNING id
        """, (
            legal_name, prospect_contact or request.contact_name, prospect_email,
            request.pay_when_paid_accepted, request.tech_stack or [],
        ))
        vendor_row = cur.fetchone()
        vendor_id = vendor_row[0] if vendor_row else None

    if vendor_id:
        cur.execute("""
            INSERT INTO vendor_quotes
                (solicitation_id, vendor_id, total_amount, period_of_performance,
                 pay_when_paid_confirmed, tech_stack, deliverables, notes)
            VALUES (%s, %s::uuid, %s, %s, %s, %s, %s, %s)
        """, (
            sol_id, str(vendor_id), request.total_amount,
            request.period_of_performance, request.pay_when_paid_accepted,
            request.tech_stack or [], request.deliverables or "",
            json.dumps({"labor_categories": request.labor_categories, "notes": request.notes or ""}),
        ))

    cur.execute("""
        UPDATE outreach_campaigns SET status='SUBMITTED', submitted_at=NOW()
        WHERE id=%s::uuid
    """, (str(campaign_id),))
    cur.execute("""
        UPDATE vendor_prospects SET status='RESPONDED', updated_at=NOW()
        WHERE id=%s::uuid
    """, (str(prospect_id),))

    conn.commit()
    cur.close()
    conn.close()
    return {"success": True, "message": "Quote received. Burger Consulting LLC will be in touch within 48 hours."}


@router.post("/api/prospects/manual")
async def add_manual_prospect(request: ManualProspectRequest, _: None = Depends(_require_admin)):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO vendor_prospects
            (source, entity_name, contact_name, contact_email, city, state,
             naics_codes, qualification_score, notes, status)
        VALUES ('MANUAL', %s, %s, %s, %s, %s, %s, %s, %s, 'DISCOVERED')
        RETURNING id, created_at
    """, (
        request.entity_name, request.contact_name, request.contact_email,
        request.city, request.state,
        request.naics_codes or [],
        max(1, min(10, request.qualification_score or 5)),
        request.notes,
    ))
    row = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()
    return {
        "id": str(row[0]),
        "entity_name": request.entity_name,
        "contact_name": request.contact_name,
        "contact_email": request.contact_email,
        "city": request.city,
        "state": request.state,
        "naics_codes": request.naics_codes or [],
        "qualification_score": request.qualification_score,
        "notes": request.notes,
        "source": "MANUAL",
        "created_at": row[1].isoformat() if row[1] else None,
    }


@router.get("/api/outreach/optout/{token}")
async def opt_out(token: str):
    """Public — recipient clicks unsubscribe link. Sets campaign to OPT_OUT."""
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        UPDATE outreach_campaigns
        SET status = 'OPT_OUT'
        WHERE quote_token = %s::uuid
          AND status NOT IN ('SUBMITTED', 'OPT_OUT')
        RETURNING id
    """, (token,))
    updated = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()
    if not updated:
        return {"success": False, "message": "Link not found or already processed."}
    return {"success": True, "message": "You have been unsubscribed from this solicitation's outreach."}
