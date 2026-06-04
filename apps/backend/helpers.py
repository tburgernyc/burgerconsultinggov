import asyncio
import json
import os
import requests
import tempfile
from typing import Optional

from db import get_db_connection
from emails import email_rfq_dispatch
from gemini import client, types
from models import TriageReport

# Shared across auto-triage (cron) and manual triage (endpoint)
TRIAGE_SYSTEM_INSTRUCTION = """
You are the Lead Procurement Compliance Director for Burger Consulting LLC,
a federal IT services prime contractor specializing in:
- NAICS 541511: Custom Software & Web Development (web applications, APIs, UI/UX, Section 508 accessibility)
- NAICS 541519: IT Services & Project Management (Agile PM, IT consulting, helpdesk, data analysis)
- NAICS 541512: Systems Design & IT Infrastructure (enterprise architecture, cloud migration, network design)

Evaluate this solicitation under the Zero-Float Feasibility Framework:

ACCEPT (score 7-10) if:
- Scope is software development, web application development, IT project management, systems design,
  IT consulting, data analysis, Section 508 remediation, or federal IT modernization
- FFP, T&M, or IDIQ contract type (all standard for IT services)
- Small business or 8(a) set-aside eligible
- Remote or hybrid delivery permitted — work can be done off-site
- No SECRET or higher clearance required for all personnel
- Subcontracting/teaming permitted

REJECT (score 1-4) if:
- Mandatory SECRET+ clearance required for all staff
- Hardware or equipment procurement is the primary deliverable (not services)
- Scope is entirely outside IT services (facilities, construction, maintenance, custodial)
- On-site-only presence required at a classified facility
- No subcontracting permitted and scope requires on-site cleared staff only

SCORE 9-10: SB/8(a) set-aside + FFP/IDIQ + software/web dev or IT PM + no clearance + remote OK
SCORE 7-8: Competitive IT scope + clear deliverables + manageable compliance burden
SCORE 5-6: Partial on-site requirement or moderate compliance burden but IT-compatible
SCORE 1-4: Mandatory clearance, hardware-primary scope, non-IT deliverable, or classified site only

Return strict JSON matching the provided schema.
"""


async def _call_gemini_triage(pdf_path: str, sol_id: str) -> dict:
    """Upload PDF to Gemini, run triage, return parsed response dict. Deletes Gemini file on exit."""
    gemini_file = client.files.upload(file=pdf_path)
    try:
        response = client.models.generate_content(
            model="gemini-2.5-pro",
            contents=[gemini_file, TRIAGE_SYSTEM_INSTRUCTION],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=TriageReport,
                temperature=0.1,
            ),
        )
        data = json.loads(response.text)
        data["solicitation_id"] = sol_id
        return data
    finally:
        try:
            client.files.delete(name=gemini_file.name)
        except Exception:
            pass


async def _run_auto_triage(sol_id: str, pdf_url: str) -> Optional[int]:
    """Download PDF, run Gemini triage, UPDATE existing solicitation record. Returns score or None."""
    if not pdf_url:
        print(f"[AUTO-TRIAGE] No PDF URL for {sol_id} — skipping.")
        return None

    temp_pdf_path = None
    try:
        pdf_response = requests.get(pdf_url, stream=True, timeout=30)
        pdf_response.raise_for_status()
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            for chunk in pdf_response.iter_content(chunk_size=8192):
                tmp.write(chunk)
            temp_pdf_path = tmp.name
    except Exception as e:
        print(f"[AUTO-TRIAGE] PDF download failed for {sol_id}: {e}")
        return None

    try:
        data = await _call_gemini_triage(temp_pdf_path, sol_id)
        score = data.get("section4_adjudication", {}).get("feasibility_score", 1)
        status = "READY_FOR_SOURCING" if score >= 8 else "REJECTED"

        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            UPDATE solicitation_queue
            SET triage_score=%s, phase_status='TRIAGE_COMPLETE', status=%s,
                triage_report=%s, updated_at=NOW()
            WHERE solicitation_id=%s
        """, (score, status, json.dumps(data), sol_id))
        conn.commit()
        cur.close()
        conn.close()

        print(f"[AUTO-TRIAGE] {sol_id} scored {score}/10 → {status}")

        if score >= 9:
            await _auto_dispatch_rfq(sol_id)

        return score
    except Exception as e:
        print(f"[AUTO-TRIAGE] Gemini error for {sol_id}: {e}")
        return None
    finally:
        if temp_pdf_path and os.path.exists(temp_pdf_path):
            os.remove(temp_pdf_path)


def _dispatch_vendors(vendors: list, sol_id: str, agency: str, naics: str,
                       deadline_str: str, pdf_url: str) -> tuple[int, int]:
    """Filter vendors by NAICS match and capacity, send RFQ emails. Returns (dispatched, skipped)."""
    dispatched = 0
    skipped = 0
    for email_addr, vendor_name, vendor_naics_codes, committed, invoiced in vendors:
        if committed > 0 and invoiced / committed > 0.80:
            skipped += 1
            continue
        naics_match = (
            not naics
            or not vendor_naics_codes
            or any(naics.startswith(n[:4]) for n in (vendor_naics_codes or []))
        )
        if naics_match:
            email_rfq_dispatch(email_addr, vendor_name, sol_id, agency, naics, deadline_str, pdf_url or "")
            dispatched += 1
    return dispatched, skipped


_VENDOR_CAPACITY_QUERY = """
    SELECT v.email, v.legal_name, v.naics_codes,
           COALESCE(SUM(c.subcontract_value), 0) as committed,
           COALESCE(SUM(c.total_invoiced), 0) as invoiced
    FROM vendor_registry v
    LEFT JOIN active_contracts c ON c.vendor_id = v.id AND c.contract_status = 'ACTIVE'
    WHERE v.portal_access = true AND v.email IS NOT NULL
    GROUP BY v.id, v.email, v.legal_name, v.naics_codes
"""


async def _auto_dispatch_rfq(sol_id: str) -> None:
    """Dispatch RFQ emails to NAICS-matched vendors with available capacity."""
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT agency, naics, response_deadline, pdf_url
            FROM solicitation_queue WHERE solicitation_id=%s
        """, (sol_id,))
        sol = cur.fetchone()
        if not sol:
            return
        agency, naics, deadline, pdf_url = sol

        cur.execute(_VENDOR_CAPACITY_QUERY)
        vendors = cur.fetchall()

        cur.execute("""
            UPDATE solicitation_queue
            SET phase_status='SOURCING_IN_PROGRESS', auto_dispatched=true, updated_at=NOW()
            WHERE solicitation_id=%s
        """, (sol_id,))
        conn.commit()
    finally:
        cur.close()
        conn.close()

    deadline_str = deadline.strftime("%B %d, %Y %I:%M %p ET") if deadline else None
    dispatched, _ = _dispatch_vendors(vendors, sol_id, agency, naics, deadline_str, pdf_url)
    print(f"[AUTO-DISPATCH] {sol_id} → {dispatched} vendor(s) notified (score ≥ 9, auto)")
