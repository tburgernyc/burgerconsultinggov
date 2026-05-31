import asyncio
import os
import json
import re
import tempfile
import requests
import psycopg2
from psycopg2 import pool as pg_pool
import resend
from contextlib import asynccontextmanager
from datetime import datetime, date, timedelta
from fastapi import FastAPI, HTTPException, Query, Depends, Header
from passlib.context import CryptContext
import secrets as _secrets
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List
from google import genai
from google.genai import types
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

resend.api_key = os.getenv("RESEND_API_KEY", "")
_FROM = "Burger Consulting LLC <procurement@burgergov.com>"
_PORTAL_URL = os.getenv("NEXTAUTH_URL", "https://www.burgergov.com")

_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
_ADMIN_TOKEN = os.getenv("BACKEND_ADMIN_TOKEN", "")


def _require_admin(x_admin_token: str = Header(default="", alias="X-Admin-Token")) -> None:
    if not _ADMIN_TOKEN or x_admin_token != _ADMIN_TOKEN:
        raise HTTPException(status_code=401, detail="Unauthorized")


# ──────────────── Email Templates ────────────────

def _send_email(to: str, subject: str, html: str) -> None:
    """Fire-and-forget. Logs failures without raising."""
    if not resend.api_key or resend.api_key.startswith("placeholder"):
        print(f"[EMAIL SKIP] No live key — would send '{subject}' to {to}")
        return
    try:
        resend.Emails.send({"from": _FROM, "to": [to], "subject": subject, "html": html})
    except Exception as exc:
        print(f"[EMAIL ERROR] {exc}")


def _wrap(body: str) -> str:
    return (
        '<div style="font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',sans-serif;'
        'max-width:600px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">'
        '<div style="background:#0a1628;padding:24px 32px">'
        '<div style="color:#c9a84c;font-size:18px;font-weight:700;letter-spacing:.05em">BURGER CONSULTING LLC</div>'
        '<div style="color:rgba(255,255,255,.6);font-size:12px;margin-top:4px">Federal Procurement Project Management Office</div>'
        '</div>'
        f'<div style="padding:32px;color:#1a2340;line-height:1.6">{body}</div>'
        '<div style="background:#f4f6fa;padding:16px 32px;font-size:12px;color:#6b7a99;border-top:1px solid #e5e7eb">'
        'Burger Consulting LLC &middot; 105 E 117th St Apt 5F, New York, NY 10035 &middot; EIN 84-3113166<br>'
        'Questions: <a href="mailto:procurement@burgergov.com" style="color:#0a1628">procurement@burgergov.com</a>'
        '</div></div>'
    )


def email_vendor_onboarding_received(to: str, legal_name: str, contact_name: str) -> None:
    body = (
        '<h2 style="color:#0a1628;margin:0 0 16px;font-size:20px">Application Received</h2>'
        f'<p>Hello {contact_name},</p>'
        f'<p>Thank you — your vendor partnership application for <strong>{legal_name}</strong> has been received.</p>'
        '<table style="background:#f4f6fa;border-radius:6px;padding:16px;width:100%;border-collapse:collapse;margin:16px 0">'
        f'<tr><td style="padding:6px 0;color:#6b7a99;font-size:13px">Business Name</td><td style="padding:6px 0;font-weight:600">{legal_name}</td></tr>'
        '<tr><td style="padding:6px 0;color:#6b7a99;font-size:13px">Status</td><td style="padding:6px 0">'
        '<span style="background:#fef9c3;color:#854d0e;padding:2px 8px;border-radius:4px;font-size:12px;font-weight:600">PENDING REVIEW</span>'
        '</td></tr></table>'
        '<p>Timothy will review your submission within <strong>24 hours</strong>. You will receive portal login credentials once approved.</p>'
        '<p style="color:#6b7a99;font-size:13px;margin-top:24px">Contact us at <a href="mailto:procurement@burgergov.com" style="color:#0a1628">procurement@burgergov.com</a> with questions.</p>'
    )
    _send_email(to, "Application Received — Burger Consulting LLC Vendor Partnership", _wrap(body))


def email_vendor_portal_access_granted(to: str, legal_name: str, temp_password: str) -> None:
    login_url = f"{_PORTAL_URL}/portal"
    body = (
        '<h2 style="color:#0a1628;margin:0 0 16px;font-size:20px">Portal Access Approved</h2>'
        f'<p>Your vendor partnership application for <strong>{legal_name}</strong> has been approved.</p>'
        '<div style="background:#f0fdf4;border:1px solid #86efac;border-radius:6px;padding:16px;margin:16px 0">'
        '<div style="font-weight:700;color:#166534;margin-bottom:8px">&#10003; Access Granted</div>'
        '<p style="margin:0;font-size:14px">You can now log in to view open RFQs, submit quotes, manage documents, and track payments.</p>'
        '</div>'
        '<table style="width:100%;border-collapse:collapse;margin:16px 0">'
        f'<tr style="background:#f4f6fa"><td style="padding:10px 12px;color:#6b7a99;font-size:13px;width:40%">Email (Username)</td><td style="padding:10px 12px;font-weight:700">{to}</td></tr>'
        f'<tr><td style="padding:10px 12px;color:#6b7a99;font-size:13px">Temporary Password</td><td style="padding:10px 12px;font-weight:700;font-family:monospace;letter-spacing:.05em">{temp_password}</td></tr>'
        '</table>'
        '<p style="font-size:13px;color:#dc2626;font-weight:600">Change your password after first login.</p>'
        f'<div style="text-align:center;margin:24px 0"><a href="{login_url}" style="background:#0a1628;color:#c9a84c;padding:12px 32px;border-radius:6px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block">Log In to Vendor Portal</a></div>'
    )
    _send_email(to, "Portal Access Granted — Burger Consulting LLC", _wrap(body))


def email_rfq_dispatch(to: str, vendor_name: str, sol_id: str, agency: str,
                       naics: str, deadline: str, sol_url: str) -> None:
    portal_link = f"{_PORTAL_URL}/portal/rfq/{sol_id}"
    deadline_display = deadline or "See portal"
    body = (
        '<h2 style="color:#0a1628;margin:0 0 16px;font-size:20px">Quote Requested</h2>'
        f'<p>Hello {vendor_name},</p>'
        '<p>Burger Consulting LLC is requesting a quote for the following federal solicitation. Submit before the deadline to be considered.</p>'
        '<table style="width:100%;border-collapse:collapse;margin:16px 0">'
        f'<tr style="background:#f4f6fa"><td style="padding:10px 12px;color:#6b7a99;font-size:13px;width:40%">Solicitation #</td><td style="padding:10px 12px;font-weight:700">{sol_id}</td></tr>'
        f'<tr><td style="padding:10px 12px;color:#6b7a99;font-size:13px">Agency</td><td style="padding:10px 12px">{agency or "See portal"}</td></tr>'
        f'<tr style="background:#f4f6fa"><td style="padding:10px 12px;color:#6b7a99;font-size:13px">NAICS Code</td><td style="padding:10px 12px">{naics or "See portal"}</td></tr>'
        f'<tr><td style="padding:10px 12px;color:#6b7a99;font-size:13px">Response Deadline</td><td style="padding:10px 12px;font-weight:700;color:#dc2626">{deadline_display}</td></tr>'
        '</table>'
        '<p style="font-size:13px;color:#6b7a99">This RFQ is subject to Pay-When-Paid terms. Payment issued within 30 days of agency receipt.</p>'
        f'<div style="text-align:center;margin:24px 0"><a href="{portal_link}" style="background:#c9a84c;color:#0a1628;padding:12px 32px;border-radius:6px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block">Submit Quote in Portal</a></div>'
    )
    _send_email(to, f"RFQ: {sol_id} — Quote Requested by Burger Consulting LLC", _wrap(body))


def email_insurance_expiry_warning(to: str, legal_name: str, days_left: int, expiry_date: str) -> None:
    urgent = days_left <= 7
    color = "#dc2626" if urgent else "#d97706"
    bg = "#fef2f2" if urgent else "#fffbeb"
    border = "#fca5a5" if urgent else "#fcd34d"
    prefix = "URGENT — " if urgent else ""
    portal_link = f"{_PORTAL_URL}/portal/documents"
    suspension_note = (
        f'<p style="margin:8px 0 0;font-size:13px;color:{color}">Portal access will be suspended on the expiry date until a renewed certificate is uploaded.</p>'
        if urgent else ""
    )
    body = (
        f'<h2 style="color:{color};margin:0 0 16px;font-size:20px">{prefix}Insurance Certificate Expiring in {days_left} Day{"s" if days_left != 1 else ""}</h2>'
        f'<p>Hello {legal_name},</p>'
        f'<div style="background:{bg};border:1px solid {border};border-radius:6px;padding:16px;margin:16px 0">'
        f'<p style="margin:0;color:{color};font-weight:600">Your General Liability Insurance Certificate expires on <strong>{expiry_date}</strong>.</p>'
        f'{suspension_note}</div>'
        '<p>To avoid disruption, upload your renewed certificate through the Vendor Portal:</p>'
        f'<div style="text-align:center;margin:24px 0"><a href="{portal_link}" style="background:#0a1628;color:#c9a84c;padding:12px 32px;border-radius:6px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block">Upload Renewed Certificate</a></div>'
        '<p style="font-size:13px;color:#6b7a99">File must be a PDF or image showing the policy period and coverage amounts.</p>'
    )
    subject = f"{'URGENT: ' if urgent else ''}Insurance Certificate Expiring {expiry_date} — Action Required"
    _send_email(to, subject, _wrap(body))


def email_payment_confirmed(to: str, vendor_name: str, contract_number: str,
                             amount: float, payment_due_date: str) -> None:
    portal_link = f"{_PORTAL_URL}/portal/invoices"
    body = (
        '<h2 style="color:#0a1628;margin:0 0 16px;font-size:20px">Payment Confirmed</h2>'
        f'<p>Hello {vendor_name},</p>'
        '<p>Agency payment has been received. Your subcontractor payment will be issued on or before the date below.</p>'
        '<table style="width:100%;border-collapse:collapse;margin:16px 0">'
        f'<tr style="background:#f4f6fa"><td style="padding:10px 12px;color:#6b7a99;font-size:13px;width:40%">Contract Number</td><td style="padding:10px 12px;font-weight:700">{contract_number}</td></tr>'
        f'<tr><td style="padding:10px 12px;color:#6b7a99;font-size:13px">Payment Amount</td><td style="padding:10px 12px;font-weight:700;color:#166534">${amount:,.2f}</td></tr>'
        f'<tr style="background:#f4f6fa"><td style="padding:10px 12px;color:#6b7a99;font-size:13px">Payment Due Date</td><td style="padding:10px 12px;font-weight:700">{payment_due_date} (Net-30)</td></tr>'
        '</table>'
        '<div style="background:#f0fdf4;border:1px solid #86efac;border-radius:6px;padding:16px;margin:16px 0">'
        '<p style="margin:0;font-size:14px;color:#166534">Payment will be issued to the bank account or mailing address on file. Contact us immediately if your payment details have changed.</p>'
        '</div>'
        f'<a href="{portal_link}" style="color:#0a1628;font-size:13px">View invoice history in the Vendor Portal &#8594;</a>'
    )
    _send_email(to, f"Payment Confirmed — Contract {contract_number} — Due {payment_due_date}", _wrap(body))


def email_deadline_alert(to: str, sol_id: str, agency: str, deadline_str: str, hours_left: int) -> None:
    urgency = "URGENT: " if hours_left <= 24 else ""
    color = "#dc2626" if hours_left <= 24 else "#d97706"
    admin_link = f"{_PORTAL_URL}/admin/solicitations/{sol_id}"
    body = (
        f'<h2 style="color:{color};margin:0 0 16px;font-size:20px">{urgency}Bid Deadline in {hours_left} Hours</h2>'
        '<p>A solicitation in your pipeline is approaching its response deadline.</p>'
        '<table style="width:100%;border-collapse:collapse;margin:16px 0">'
        f'<tr style="background:#f4f6fa"><td style="padding:10px 12px;color:#6b7a99;font-size:13px;width:40%">Solicitation #</td><td style="padding:10px 12px;font-weight:700">{sol_id}</td></tr>'
        f'<tr><td style="padding:10px 12px;color:#6b7a99;font-size:13px">Agency</td><td style="padding:10px 12px">{agency or "—"}</td></tr>'
        f'<tr style="background:#f4f6fa"><td style="padding:10px 12px;color:#6b7a99;font-size:13px">Response Deadline</td><td style="padding:10px 12px;font-weight:700;color:{color}">{deadline_str}</td></tr>'
        '</table>'
        f'<div style="text-align:center;margin:24px 0"><a href="{admin_link}" style="background:#0a1628;color:#c9a84c;padding:12px 32px;border-radius:6px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block">Review Solicitation</a></div>'
    )
    subject = f"{urgency}Bid Deadline Alert — {sol_id} — {hours_left}h Remaining"
    _send_email(to, subject, _wrap(body))


def email_ar_followup_sent(to: str, contract_number: str, agency: str,
                            invoice_amount: float, days_outstanding: int) -> None:
    body = (
        '<h2 style="color:#d97706;margin:0 0 16px;font-size:20px">A/R Follow-Up Dispatched</h2>'
        f'<p>An automated payment follow-up has been sent to the contracting officer for the invoice below.</p>'
        '<table style="width:100%;border-collapse:collapse;margin:16px 0">'
        f'<tr style="background:#f4f6fa"><td style="padding:10px 12px;color:#6b7a99;font-size:13px;width:40%">Contract #</td><td style="padding:10px 12px;font-weight:700">{contract_number}</td></tr>'
        f'<tr><td style="padding:10px 12px;color:#6b7a99;font-size:13px">Agency</td><td style="padding:10px 12px">{agency or "—"}</td></tr>'
        f'<tr style="background:#f4f6fa"><td style="padding:10px 12px;color:#6b7a99;font-size:13px">Amount Outstanding</td><td style="padding:10px 12px;font-weight:700;color:#d97706">${invoice_amount:,.2f}</td></tr>'
        f'<tr><td style="padding:10px 12px;color:#6b7a99;font-size:13px">Days Outstanding</td><td style="padding:10px 12px;font-weight:700;color:#{"dc2626" if days_outstanding > 45 else "d97706"}">{days_outstanding} days</td></tr>'
        '</table>'
        f'<p style="font-size:13px;color:#6b7a99">Follow-up #{1 if days_outstanding < 45 else 2} dispatched automatically by Hermes.</p>'
    )
    subject = f"A/R Follow-Up Sent — Contract {contract_number} — {days_outstanding} Days Outstanding"
    _send_email(to, subject, _wrap(body))


# ──────────────── Internal Triage Helper ────────────────

async def _run_auto_triage(sol_id: str, pdf_url: str) -> Optional[int]:
    """
    Download PDF, run Gemini triage, persist result. Returns triage score or None on failure.
    Auto-dispatches RFQ to NAICS-matched vendors if score >= 9.
    """
    if not pdf_url:
        print(f"[AUTO-TRIAGE] No PDF URL for {sol_id} — skipping.")
        return None

    temp_pdf_path = None
    gemini_file = None
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
        gemini_file = client.files.upload(file=temp_pdf_path)
        system_instruction = """
        You are the Lead Procurement Compliance Director for Burger Consulting LLC,
        a federal facilities services prime contractor specializing in:
        - NAICS 561210: Facilities Support Services (building operations, maintenance management, base support)
        - NAICS 561720: Janitorial Services (commercial cleaning, custodial, sanitization)
        - NAICS 561730: Landscaping Services (grounds maintenance, lawn care, snow removal)

        Evaluate this solicitation under the Zero-Float Feasibility Framework:

        ACCEPT (score 7-10) if:
        - Scope is janitorial, custodial, facilities management, landscaping, grounds maintenance, or base support
        - Firm-Fixed-Price (FFP) or performance-based service contract
        - Small business or 8(a) set-aside eligible
        - Recurring/evergreen contract (monthly or annual performance period)
        - No upfront capital expenditures required (equipment, materials purchased by agency)
        - Subcontracting permitted — work can be delegated to approved vendors

        REJECT (score 1-4) if:
        - Construction, renovation, or major repair (requires bonding, surety, upfront materials)
        - Davis-Bacon Act certified payroll required (incompatible with Zero-Float model)
        - Security clearances required for all field staff
        - Non-FFP billing structure (T&M, cost-plus, CPFF)
        - Equipment procurement is primary deliverable (not service)
        - Scope is entirely outside facilities, janitorial, or landscaping services

        SCORE 9-10: SB/8(a) set-aside + FFP + recurring service + no clearance + under $250K
        SCORE 7-8: Competitive but manageable scope + clear service deliverables
        SCORE 5-6: On-site specific requirements or moderate compliance burden but FFP-compatible
        SCORE 1-4: Davis-Bacon, construction bonding, clearance, or non-service primary scope

        Return strict JSON matching the provided schema.
        """
        response = client.models.generate_content(
            model="gemini-2.5-pro",
            contents=[gemini_file, system_instruction],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=TriageReport,
                temperature=0.1
            )
        )
        data = json.loads(response.text)
        data["solicitation_id"] = sol_id
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

        # Auto-dispatch to NAICS-matched vendors for top-tier opportunities
        if score >= 9:
            await _auto_dispatch_rfq(sol_id)

        return score
    except Exception as e:
        print(f"[AUTO-TRIAGE] Gemini error for {sol_id}: {e}")
        return None
    finally:
        if gemini_file:
            try:
                client.files.delete(name=gemini_file.name)
            except Exception:
                pass
        if temp_pdf_path and os.path.exists(temp_pdf_path):
            os.remove(temp_pdf_path)


async def _auto_dispatch_rfq(sol_id: str) -> None:
    """Dispatch RFQ emails to vendors matched by NAICS code and available capacity."""
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

        # Match vendors by NAICS code overlap; fall back to all active vendors
        cur.execute("""
            SELECT v.email, v.legal_name, v.naics_codes,
                   COALESCE(SUM(c.subcontract_value), 0) as committed,
                   COALESCE(SUM(c.total_invoiced), 0) as invoiced
            FROM vendor_registry v
            LEFT JOIN active_contracts c ON c.vendor_id = v.id AND c.contract_status = 'ACTIVE'
            WHERE v.portal_access = true AND v.email IS NOT NULL
            GROUP BY v.id, v.email, v.legal_name, v.naics_codes
        """)
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
    dispatched = 0
    for email_addr, vendor_name, vendor_naics_codes, committed, invoiced in vendors:
        # Skip vendors with >80% capacity utilization
        if committed > 0 and invoiced / committed > 0.80:
            print(f"[AUTO-DISPATCH] Skipping {vendor_name} — over 80% capacity")
            continue
        # Prefer NAICS-matched vendors; still dispatch to all if naics is set
        naics_match = (
            not naics or
            not vendor_naics_codes or
            any(naics.startswith(n[:4]) for n in (vendor_naics_codes or []))
        )
        if naics_match:
            email_rfq_dispatch(email_addr, vendor_name, sol_id, agency, naics, deadline_str, pdf_url or "")
            dispatched += 1

    print(f"[AUTO-DISPATCH] {sol_id} → {dispatched} vendor(s) notified (score ≥ 9, auto)")


# ──────────────── Cron Jobs ────────────────

async def cron_document_expiry_monitor() -> None:
    """Daily 8:00 AM ET — alert vendors with insurance expiring within 30 days; suspend on expiry."""
    print("[CRON] Running document expiry monitor...")
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        today = date.today()

        cur.execute("""
            SELECT legal_name, email, insurance_expiry
            FROM vendor_registry
            WHERE portal_access = true
              AND insurance_expiry IS NOT NULL
              AND insurance_expiry >= %s
              AND insurance_expiry <= %s
        """, (today, today + timedelta(days=30)))
        expiring = cur.fetchall()

        cur.execute("""
            UPDATE vendor_registry SET portal_access = false
            WHERE portal_access = true
              AND insurance_expiry IS NOT NULL
              AND insurance_expiry < %s
        """, (today,))

        conn.commit()
        cur.close()

        for legal_name, email, expiry in expiring:
            if not email:
                continue
            days_left = (expiry - today).days
            email_insurance_expiry_warning(email, legal_name, days_left, expiry.strftime("%B %d, %Y"))

        print(f"[CRON] Expiry monitor: {len(expiring)} alert(s) dispatched.")
    except Exception as exc:
        print(f"[CRON ERROR] Document expiry monitor: {exc}")
        if conn:
            try:
                conn.rollback()
            except Exception:
                pass
    finally:
        if conn:
            conn.close()


async def cron_sam_scan() -> None:
    """Runs every 4 hours — query SAM.gov for new NAICS 561210/561720/561730 facilities opportunities, then auto-triage."""
    sam_key = os.getenv("SAM_API_KEY", "")
    if not sam_key or sam_key.startswith("placeholder"):
        print("[CRON] SAM_API_KEY not set — SAM.gov scan skipped.")
        return
    print("[CRON] Running SAM.gov facilities services scan...")
    newly_inserted = []
    try:
        params = {
            "api_key": sam_key,
            "naicsCode": "561210,561720,561730",
            "active": "true",
            "limit": 100,
            "postedFrom": (date.today() - timedelta(days=1)).strftime("%m/%d/%Y"),
        }
        resp = requests.get(
            "https://api.sam.gov/opportunities/v2/search",
            params=params,
            timeout=30
        )
        resp.raise_for_status()
        data = resp.json()
        opps = data.get("opportunitiesData", [])

        conn = get_db_connection()
        cur = conn.cursor()
        for opp in opps:
            sol_id = opp.get("solicitationNumber") or opp.get("noticeId")
            if not sol_id:
                continue

            # Extract the best available PDF / document URL from SAM.gov response
            pdf_url = None
            resource_links = opp.get("resourceLinks") or []
            for link in resource_links:
                if isinstance(link, str) and link.lower().endswith(".pdf"):
                    pdf_url = link
                    break
            if not pdf_url:
                pdf_url = opp.get("uiLink")

            # Parse response deadline
            deadline = None
            raw_deadline = opp.get("responseDeadLine") or opp.get("archiveDate")
            if raw_deadline:
                for fmt in ("%Y-%m-%dT%H:%M:%S%z", "%Y-%m-%d", "%m/%d/%Y"):
                    try:
                        deadline = datetime.strptime(raw_deadline[:19], fmt[:len(raw_deadline[:19])])
                        break
                    except ValueError:
                        continue

            try:
                cur.execute("""
                    INSERT INTO solicitation_queue
                        (solicitation_id, agency, naics, estimated_value, phase_status,
                         pdf_url, raw_json, response_deadline)
                    VALUES (%s, %s, %s, %s, 'PENDING_TRIAGE', %s, %s, %s)
                    ON CONFLICT (solicitation_id) DO NOTHING
                """, (
                    sol_id,
                    opp.get("fullParentPathName") or opp.get("departmentName"),
                    opp.get("naicsCode"),
                    None,
                    pdf_url,
                    json.dumps(opp),
                    deadline,
                ))
                if cur.rowcount:
                    newly_inserted.append((sol_id, pdf_url))
            except Exception:
                conn.rollback()
        conn.commit()
        cur.close()
        conn.close()
        print(f"[CRON] SAM scan: {len(newly_inserted)} new solicitation(s) inserted.")
    except Exception as exc:
        print(f"[CRON ERROR] SAM scan: {exc}")
        return

    # Auto-triage every newly inserted solicitation that has a PDF URL
    for sol_id, pdf_url in newly_inserted:
        if pdf_url:
            print(f"[AUTO-TRIAGE] Queuing triage for {sol_id}")
            await asyncio.sleep(2)  # Respect Gemini rate limits
            await _run_auto_triage(sol_id, pdf_url)


async def cron_deadline_monitor() -> None:
    """Daily 7:30 AM ET — alert admin when solicitation deadlines are within 72h or 24h."""
    admin_email = os.getenv("ADMIN_EMAIL", "procurement@burgergov.com")
    print("[CRON] Running deadline monitor...")
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        now = datetime.utcnow()

        cur.execute("""
            SELECT solicitation_id, agency, response_deadline
            FROM solicitation_queue
            WHERE response_deadline IS NOT NULL
              AND phase_status NOT IN ('AWARDED', 'REJECTED')
              AND deadline_alert_sent = false
              AND response_deadline > NOW()
              AND response_deadline <= NOW() + INTERVAL '73 hours'
        """)
        approaching = cur.fetchall()

        for sol_id, agency, deadline in approaching:
            hours_left = max(1, int((deadline.replace(tzinfo=None) - now).total_seconds() / 3600))
            deadline_str = deadline.strftime("%B %d, %Y %I:%M %p ET")
            email_deadline_alert(admin_email, sol_id, agency, deadline_str, hours_left)
            cur.execute("""
                UPDATE solicitation_queue SET deadline_alert_sent=true WHERE solicitation_id=%s
            """, (sol_id,))

        conn.commit()
        cur.close()
        print(f"[CRON] Deadline monitor: {len(approaching)} alert(s) sent.")
    except Exception as exc:
        print(f"[CRON ERROR] Deadline monitor: {exc}")
        if conn:
            try:
                conn.rollback()
            except Exception:
                pass
    finally:
        if conn:
            conn.close()


async def cron_ar_aging() -> None:
    """Daily 5:00 PM ET — flag overdue invoices and notify admin; log follow-up record."""
    admin_email = os.getenv("ADMIN_EMAIL", "procurement@burgergov.com")
    print("[CRON] Running A/R aging check...")
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        today = date.today()

        cur.execute("""
            SELECT c.id, c.contract_number, c.agency,
                   c.total_invoiced - c.total_received AS outstanding,
                   c.last_invoice_date,
                   COALESCE(
                     (SELECT COUNT(*) FROM ar_followups f WHERE f.contract_id = c.id), 0
                   ) AS followup_count
            FROM active_contracts c
            WHERE c.contract_status = 'ACTIVE'
              AND c.total_invoiced > c.total_received
              AND c.last_invoice_date IS NOT NULL
              AND c.last_invoice_date <= %s - INTERVAL '30 days'
              AND (
                c.last_ar_followup_at IS NULL
                OR c.last_ar_followup_at < %s - INTERVAL '14 days'
              )
        """, (today, today))
        overdue = cur.fetchall()

        for contract_id, contract_number, agency, outstanding, last_invoice, followup_count in overdue:
            days_out = (today - last_invoice).days if last_invoice else 30
            followup_type = "SECOND_NOTICE" if followup_count >= 1 else "FIRST_NOTICE"

            email_ar_followup_sent(admin_email, contract_number, agency,
                                   float(outstanding), days_out)

            cur.execute("""
                INSERT INTO ar_followups (contract_id, invoice_age_days, followup_type)
                VALUES (%s::uuid, %s, %s)
            """, (str(contract_id), days_out, followup_type))

            cur.execute("""
                UPDATE active_contracts SET last_ar_followup_at = NOW()
                WHERE id = %s::uuid
            """, (str(contract_id),))

        conn.commit()
        cur.close()
        print(f"[CRON] A/R aging: {len(overdue)} overdue invoice(s) flagged.")
    except Exception as exc:
        print(f"[CRON ERROR] A/R aging: {exc}")
        if conn:
            try:
                conn.rollback()
            except Exception:
                pass
    finally:
        if conn:
            conn.close()


async def cron_usaspending_intelligence() -> None:
    """Daily 6:00 AM ET — pull recent federal facilities award data from USASpending.gov for competitive pricing intelligence."""
    print("[CRON] Running USASpending.gov facilities intelligence pull...")
    try:
        payload = {
            "filters": {
                "award_type_codes": ["A", "B", "C", "D"],
                "naics_codes": ["561210", "561720", "561730"],
                "time_period": [
                    {
                        "start_date": (date.today() - timedelta(days=365)).strftime("%Y-%m-%d"),
                        "end_date": date.today().strftime("%Y-%m-%d"),
                    }
                ],
            },
            "fields": [
                "Award ID", "Recipient Name", "Award Amount",
                "Start Date", "Description", "Awarding Agency",
                "awarding_agency_name", "NAICS Code"
            ],
            "sort": "Award Amount",
            "order": "desc",
            "limit": 100,
            "page": 1,
        }
        resp = requests.post(
            "https://api.usaspending.gov/api/v2/search/spending_by_award/",
            json=payload,
            timeout=30,
        )
        resp.raise_for_status()
        results = resp.json().get("results", [])

        conn = get_db_connection()
        cur = conn.cursor()
        inserted = 0
        for award in results:
            contract_num = award.get("Award ID")
            if not contract_num:
                continue
            award_amount = award.get("Award Amount")
            try:
                award_amount = float(str(award_amount).replace(",", "")) if award_amount else None
            except (ValueError, TypeError):
                award_amount = None

            award_date_str = award.get("Start Date")
            award_date = None
            if award_date_str:
                try:
                    award_date = datetime.strptime(award_date_str[:10], "%Y-%m-%d").date()
                except ValueError:
                    pass

            try:
                cur.execute("""
                    INSERT INTO award_intelligence
                        (naics, agency, award_amount, awardee_name, award_date,
                         contract_number, description, raw_json)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (contract_number) DO NOTHING
                """, (
                    award.get("NAICS Code"),
                    award.get("Awarding Agency") or award.get("awarding_agency_name"),
                    award_amount,
                    award.get("Recipient Name"),
                    award_date,
                    contract_num,
                    award.get("Description"),
                    json.dumps(award),
                ))
                if cur.rowcount:
                    inserted += 1
            except Exception:
                conn.rollback()

        conn.commit()
        cur.close()
        conn.close()
        print(f"[CRON] USASpending: {inserted} new award record(s) inserted.")
    except Exception as exc:
        print(f"[CRON ERROR] USASpending intelligence: {exc}")


# ──────────────── Database ────────────────

_pool: "pg_pool.ThreadedConnectionPool | None" = None


def _init_pool() -> None:
    global _pool
    _pool = pg_pool.ThreadedConnectionPool(
        minconn=2,
        maxconn=20,
        host=os.getenv("DB_HOST", "db"),
        database="postgres",
        user=os.getenv("DB_USER", "postgres"),
        password=os.getenv("DB_PASSWORD") or os.getenv("POSTGRES_PASSWORD"),
        port=5432,
    )


class _PooledConn:
    """Wraps a psycopg2 connection and returns it to the pool on close()."""
    def __init__(self, conn):
        self._conn = conn

    def cursor(self):
        return self._conn.cursor()

    def commit(self):
        return self._conn.commit()

    def rollback(self):
        return self._conn.rollback()

    def close(self):
        try:
            if not self._conn.closed:
                self._conn.rollback()
        except Exception:
            pass
        _pool.putconn(self._conn)

    @property
    def closed(self):
        return self._conn.closed


def get_db_connection() -> "_PooledConn":
    return _PooledConn(_pool.getconn())


SCHEMA_SQL = """
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

CREATE TABLE IF NOT EXISTS global_directives (
  id SERIAL PRIMARY KEY,
  entity_name TEXT NOT NULL DEFAULT 'BURGER CONSULTING LLC',
  ein TEXT NOT NULL DEFAULT '84-3113166',
  dos_id TEXT NOT NULL DEFAULT '5624755',
  physical_address TEXT NOT NULL DEFAULT '105 E 117th St Apt 5F, New York, NY 10035',
  mailing_address TEXT NOT NULL DEFAULT 'PO Box 997, New York, NY 10018',
  naics_codes TEXT[] NOT NULL DEFAULT '{561210,561720,561730}',
  it_framework JSONB NOT NULL DEFAULT '{"zero_float": true, "davis_bacon_excluded": true, "clearance_required": false, "contract_types": ["FFP","IDIQ"]}',
  cage_code TEXT DEFAULT 'PENDING',
  sam_status TEXT DEFAULT 'PENDING',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO global_directives (entity_name, ein, dos_id, physical_address, mailing_address)
  SELECT 'BURGER CONSULTING LLC','84-3113166','5624755',
    '105 E 117th St Apt 5F, New York, NY 10035',
    'PO Box 997, New York, NY 10018'
  WHERE NOT EXISTS (SELECT 1 FROM global_directives);

CREATE TABLE IF NOT EXISTS solicitation_queue (
  id SERIAL PRIMARY KEY,
  solicitation_id TEXT UNIQUE NOT NULL,
  agency TEXT,
  naics TEXT,
  performance_zip TEXT,
  estimated_value NUMERIC,
  triage_score INTEGER,
  triage_report JSONB,
  phase_status TEXT DEFAULT 'PENDING_TRIAGE',
  reason_code TEXT,
  pdf_url TEXT,
  raw_json JSONB,
  status TEXT,
  response_deadline TIMESTAMPTZ,
  auto_dispatched BOOLEAN DEFAULT false,
  deadline_alert_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vendor_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_name TEXT NOT NULL,
  cage_code TEXT,
  naics_codes TEXT[],
  zip_code TEXT,
  city TEXT,
  state TEXT,
  contact_name TEXT,
  email TEXT UNIQUE,
  phone TEXT,
  -- IT-specific fields
  tech_stack TEXT[],
  primary_skill TEXT,
  github_url TEXT,
  portfolio_url TEXT,
  clearance_level TEXT DEFAULT 'NONE',
  remote_ok BOOLEAN DEFAULT true,
  hourly_rate_min NUMERIC,
  hourly_rate_max NUMERIC,
  section_508_certified BOOLEAN DEFAULT false,
  -- Compliance fields
  insurance_verified BOOLEAN DEFAULT false,
  insurance_expiry DATE,
  sam_verified BOOLEAN DEFAULT false,
  sam_verified_at TIMESTAMPTZ,
  pay_when_paid_accepted BOOLEAN DEFAULT false,
  response_status TEXT DEFAULT 'NOT_CONTACTED',
  last_contacted_at TIMESTAMPTZ,
  performance_rating NUMERIC(3,2),
  contracts_completed INTEGER DEFAULT 0,
  onboarding_status TEXT DEFAULT 'PENDING',
  portal_access BOOLEAN DEFAULT false,
  portal_password_hash TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contract_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES active_contracts(id) ON DELETE CASCADE,
  milestone_name TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  completed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'PENDING',
  deliverable_url TEXT,
  invoice_amount NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subcontractor_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitation_id TEXT REFERENCES solicitation_queue(solicitation_id),
  search_query TEXT,
  required_skills TEXT[],
  clearance_required TEXT DEFAULT 'NONE',
  remote_required BOOLEAN DEFAULT true,
  budget_min NUMERIC,
  budget_max NUMERIC,
  candidates_found INTEGER DEFAULT 0,
  status TEXT DEFAULT 'OPEN',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS active_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitation_id TEXT REFERENCES solicitation_queue(solicitation_id),
  contract_number TEXT UNIQUE,
  agency TEXT,
  agency_cor_name TEXT,
  agency_cor_email TEXT,
  contract_value NUMERIC,
  prime_margin_pct NUMERIC,
  estimated_prime_revenue NUMERIC,
  vendor_id UUID REFERENCES vendor_registry(id),
  subcontract_value NUMERIC,
  performance_start DATE,
  performance_end DATE,
  billing_cycle TEXT DEFAULT 'MONTHLY',
  next_invoice_date DATE,
  last_invoice_date DATE,
  last_invoice_amount NUMERIC,
  total_invoiced NUMERIC DEFAULT 0,
  total_received NUMERIC DEFAULT 0,
  last_ar_followup_at TIMESTAMPTZ,
  wawf_registered BOOLEAN DEFAULT false,
  sca_applies BOOLEAN DEFAULT false,
  certified_payroll_current BOOLEAN DEFAULT true,
  contract_status TEXT DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vendor_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitation_id TEXT REFERENCES solicitation_queue(solicitation_id),
  vendor_id UUID REFERENCES vendor_registry(id),
  quote_pdf_path TEXT,
  line_items JSONB,
  total_amount NUMERIC,
  labor_rate_hourly NUMERIC,
  materials_cost NUMERIC,
  period_of_performance TEXT,
  pay_when_paid_confirmed BOOLEAN DEFAULT false,
  sca_compliant BOOLEAN,
  sca_analysis JSONB,
  pricing_analysis JSONB,
  ai_evaluation JSONB,
  recommendation TEXT,
  notes TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'PENDING_REVIEW'
);

CREATE TABLE IF NOT EXISTS approved_language (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_type TEXT,
  naics TEXT,
  section TEXT,
  content TEXT NOT NULL,
  times_used INTEGER DEFAULT 0,
  win_rate NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  related_type TEXT,
  related_id TEXT,
  doc_type TEXT,
  filename TEXT,
  storage_path TEXT,
  uploaded_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitation_id TEXT REFERENCES solicitation_queue(solicitation_id),
  gemini_draft TEXT,
  technical_approach TEXT,
  management_plan TEXT,
  pricing_narrative TEXT,
  past_performance TEXT,
  status TEXT DEFAULT 'DRAFT',
  win_probability INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS award_intelligence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  naics TEXT,
  agency TEXT,
  award_amount NUMERIC,
  awardee_name TEXT,
  award_date DATE,
  contract_number TEXT UNIQUE,
  description TEXT,
  raw_json JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ar_followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES active_contracts(id),
  invoice_age_days INTEGER,
  followup_type TEXT,
  followup_sent_at TIMESTAMPTZ DEFAULT NOW()
);
"""

MIGRATIONS_SQL = """
ALTER TABLE solicitation_queue ADD COLUMN IF NOT EXISTS agency TEXT;
ALTER TABLE solicitation_queue ADD COLUMN IF NOT EXISTS naics TEXT;
ALTER TABLE solicitation_queue ADD COLUMN IF NOT EXISTS performance_zip TEXT;
ALTER TABLE solicitation_queue ADD COLUMN IF NOT EXISTS estimated_value NUMERIC;
ALTER TABLE solicitation_queue ADD COLUMN IF NOT EXISTS triage_report JSONB;
ALTER TABLE solicitation_queue ADD COLUMN IF NOT EXISTS phase_status TEXT DEFAULT 'PENDING_TRIAGE';
ALTER TABLE solicitation_queue ADD COLUMN IF NOT EXISTS reason_code TEXT;
ALTER TABLE solicitation_queue ADD COLUMN IF NOT EXISTS response_deadline TIMESTAMPTZ;
ALTER TABLE solicitation_queue ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE solicitation_queue ADD COLUMN IF NOT EXISTS auto_dispatched BOOLEAN DEFAULT false;
ALTER TABLE solicitation_queue ADD COLUMN IF NOT EXISTS deadline_alert_sent BOOLEAN DEFAULT false;
ALTER TABLE active_contracts ADD COLUMN IF NOT EXISTS last_ar_followup_at TIMESTAMPTZ;
ALTER TABLE active_contracts ADD COLUMN IF NOT EXISTS agency_cor_name TEXT;
ALTER TABLE active_contracts ADD COLUMN IF NOT EXISTS agency_cor_email TEXT;
ALTER TABLE active_contracts ADD COLUMN IF NOT EXISTS billing_type TEXT DEFAULT 'MONTHLY';
ALTER TABLE vendor_quotes ADD COLUMN IF NOT EXISTS ai_evaluation JSONB;
ALTER TABLE vendor_quotes ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE vendor_quotes ADD COLUMN IF NOT EXISTS tech_stack TEXT[];
ALTER TABLE vendor_quotes ADD COLUMN IF NOT EXISTS deliverables TEXT;
ALTER TABLE vendor_registry ADD COLUMN IF NOT EXISTS tech_stack TEXT[];
ALTER TABLE vendor_registry ADD COLUMN IF NOT EXISTS primary_skill TEXT;
ALTER TABLE vendor_registry ADD COLUMN IF NOT EXISTS github_url TEXT;
ALTER TABLE vendor_registry ADD COLUMN IF NOT EXISTS portfolio_url TEXT;
ALTER TABLE vendor_registry ADD COLUMN IF NOT EXISTS clearance_level TEXT DEFAULT 'NONE';
ALTER TABLE vendor_registry ADD COLUMN IF NOT EXISTS remote_ok BOOLEAN DEFAULT true;
ALTER TABLE vendor_registry ADD COLUMN IF NOT EXISTS hourly_rate_min NUMERIC;
ALTER TABLE vendor_registry ADD COLUMN IF NOT EXISTS hourly_rate_max NUMERIC;
ALTER TABLE vendor_registry ADD COLUMN IF NOT EXISTS section_508_certified BOOLEAN DEFAULT false;
ALTER TABLE global_directives ADD COLUMN IF NOT EXISTS it_framework JSONB;
"""


@asynccontextmanager
async def lifespan(app: FastAPI):
    _init_pool()
    try:
        conn = psycopg2.connect(
            host=os.getenv("DB_HOST", "db"),
            database="postgres",
            user="postgres",
            password=os.getenv("POSTGRES_PASSWORD"),
            port=5432,
        )
        cur = conn.cursor()
        for statement in SCHEMA_SQL.strip().split(';'):
            stmt = statement.strip()
            if stmt:
                try:
                    cur.execute(stmt)
                except Exception:
                    conn.rollback()
        for statement in MIGRATIONS_SQL.strip().split(';'):
            stmt = statement.strip()
            if stmt:
                try:
                    cur.execute(stmt)
                except Exception:
                    conn.rollback()
        conn.commit()
        cur.close()
        conn.close()
    except Exception as e:
        print(f"DB init error: {e}")

    scheduler = AsyncIOScheduler(timezone="America/New_York")
    # SAM.gov scan every 4 hours (7 AM, 11 AM, 3 PM, 7 PM ET)
    scheduler.add_job(cron_sam_scan, CronTrigger(hour="7,11,15,19", minute=0))
    # Document expiry monitor — 8:00 AM ET
    scheduler.add_job(cron_document_expiry_monitor, CronTrigger(hour=8, minute=0))
    # Deadline alert monitor — 7:30 AM ET
    scheduler.add_job(cron_deadline_monitor, CronTrigger(hour=7, minute=30))
    # USASpending.gov competitive intelligence — 6:00 AM ET
    scheduler.add_job(cron_usaspending_intelligence, CronTrigger(hour=6, minute=0))
    # A/R aging check — 5:00 PM ET
    scheduler.add_job(cron_ar_aging, CronTrigger(hour=17, minute=0))
    scheduler.start()
    print("[CRON] Scheduler started — SAM scan 7/11/15/19h, expiry 8h, deadline 7:30h, intelligence 6h, AR 17h ET")

    yield

    scheduler.shutdown()
    _pool.closeall()


# ──────────────── Pydantic Models ────────────────

class Section1(BaseModel):
    upfront_capital_required: bool = Field(description="Does this require purchasing hardware or software licenses upfront before billing?")
    clearance_required: bool = Field(description="Is an active security clearance (SECRET, TS, TS/SCI) required for personnel?")
    firm_fixed_price: bool = Field(description="Is this FFP, T&M, or IDIQ — any of which support remote IT delivery?")

class Section2(BaseModel):
    remote_delivery_allowed: bool = Field(description="Can work be performed fully or primarily remotely without mandatory on-site presence?")
    subcontracting_barred: bool = Field(description="Is subcontracting explicitly prohibited in the solicitation?")
    section_508_required: bool = Field(description="Does the solicitation require Section 508 / WCAG accessibility compliance? (positive signal)")

class Section3(BaseModel):
    primary_naics: str = Field(description="The 6-digit NAICS code (561210, 561720, 561730, or closest match).")
    primary_deliverable_type: str = Field(description="Primary deliverable: JANITORIAL, LANDSCAPING, FACILITIES_MGMT, GROUNDS_MAINTENANCE, BASE_SUPPORT, CUSTODIAL, or OTHER.")
    estimated_labor_hours: int = Field(description="Estimated total labor hours if discernible from the SOW, else 0.")

class TriageAdjudication(BaseModel):
    feasibility_score: int = Field(description="Score 1-10. 9-10: SB/8(a) set-aside + FFP + recurring service + no clearance. 7-8: competitive but manageable scope. 5-6: on-site specific requirements or moderate compliance burden. 1-4: Davis-Bacon, bonding, clearance, or non-service scope.")
    decision: str = Field(description="PROCEED, REVIEW, or REJECT.")
    reasoning: str = Field(description="Two-sentence justification referencing BCG's Zero-Float facilities management model.")

class TriageReport(BaseModel):
    solicitation_id: str
    section1_financial: Section1
    section2_compliance: Section2
    section3_scope: Section3
    section4_adjudication: TriageAdjudication

class TriageRequest(BaseModel):
    solicitation_id: str
    pdf_url: str

class VendorRegisterRequest(BaseModel):
    legal_name: str
    cage_code: Optional[str] = None
    naics_codes: Optional[List[str]] = None
    zip_code: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    contact_name: str
    email: str
    phone: Optional[str] = None
    # IT-specific fields
    tech_stack: Optional[List[str]] = None
    primary_skill: Optional[str] = None
    github_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    clearance_level: Optional[str] = 'NONE'
    remote_ok: Optional[bool] = True
    hourly_rate_min: Optional[float] = None
    hourly_rate_max: Optional[float] = None
    section_508_certified: Optional[bool] = False
    sam_status: Optional[str] = None
    years_in_operation: Optional[int] = None
    team_size: Optional[str] = None
    max_concurrent_contracts: Optional[int] = None
    pay_when_paid_accepted: Optional[bool] = False
    notes: Optional[str] = None

class VendorUpdateRequest(BaseModel):
    legal_name: Optional[str] = None
    contact_name: Optional[str] = None
    phone: Optional[str] = None
    onboarding_status: Optional[str] = None
    portal_access: Optional[bool] = None
    response_status: Optional[str] = None
    notes: Optional[str] = None

class QuoteSubmitRequest(BaseModel):
    solicitation_id: str
    vendor_id: str
    line_items: Optional[List[dict]] = None
    total_amount: float
    labor_rate_hourly: Optional[float] = None
    estimated_hours: Optional[int] = None
    materials_cost: Optional[float] = None
    period_of_performance: Optional[str] = None
    tech_stack: Optional[List[str]] = None
    deliverables: Optional[str] = None
    section_508_compliant: Optional[bool] = False
    remote_delivery: Optional[bool] = True
    pay_when_paid_confirmed: bool = False
    notes: Optional[str] = None

class ContractAwardRequest(BaseModel):
    solicitation_id: str
    contract_number: str
    agency: str
    contract_value: float
    prime_margin_pct: float
    vendor_id: str
    subcontract_value: float
    performance_start: str
    performance_end: str

class InvoiceRequest(BaseModel):
    vendor_id: str
    period_start: str
    period_end: str
    line_items: Optional[List[dict]] = None
    total_amount: float

class PaymentUpdateRequest(BaseModel):
    payment_amount: float

class ProposalGenerateRequest(BaseModel):
    solicitation_id: str
    selected_vendor_id: Optional[str] = None
    target_price: Optional[float] = None
    additional_notes: Optional[str] = None


# ──────────────── App ────────────────

app = FastAPI(title="Hermes IT Procurement Engine — Burger Consulting LLC", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://www.burgergov.com", "https://burgergov.com"],
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


# ──────────────── Health ────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "entity": "BURGER CONSULTING LLC", "ein": "84-3113166"}


# ──────────────── Triage ────────────────

@app.get("/api/triage/queue")
async def get_triage_queue(_: None = Depends(_require_admin)):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT solicitation_id, agency, naics, estimated_value, triage_score,
               phase_status, response_deadline, created_at
        FROM solicitation_queue
        WHERE phase_status = 'PENDING_TRIAGE'
        ORDER BY created_at DESC
    """)
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return [{"solicitation_id": r[0], "agency": r[1], "naics": r[2],
             "estimated_value": float(r[3]) if r[3] else None,
             "triage_score": r[4], "phase_status": r[5],
             "response_deadline": r[6].isoformat() if r[6] else None,
             "created_at": r[7].isoformat() if r[7] else None} for r in rows]


@app.post("/api/triage/analyze", response_model=TriageReport)
async def analyze_solicitation(request: TriageRequest, _: None = Depends(_require_admin)):
    """Manual triage trigger — wraps the shared auto-triage helper."""
    temp_pdf_path = None
    gemini_file = None
    try:
        pdf_response = requests.get(request.pdf_url, stream=True, timeout=30)
        pdf_response.raise_for_status()
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_pdf:
            for chunk in pdf_response.iter_content(chunk_size=8192):
                temp_pdf.write(chunk)
            temp_pdf_path = temp_pdf.name
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"PDF download failed: {str(e)}")

    try:
        gemini_file = client.files.upload(file=temp_pdf_path)
        system_instruction = """
        You are the Lead Procurement Compliance Director for Burger Consulting LLC,
        a federal facilities services prime contractor specializing in:
        - NAICS 561210: Facilities Support Services (building operations, maintenance management, base support)
        - NAICS 561720: Janitorial Services (commercial cleaning, custodial, sanitization)
        - NAICS 561730: Landscaping Services (grounds maintenance, lawn care, snow removal)

        Evaluate this solicitation under the Zero-Float Feasibility Framework:

        ACCEPT (score 7-10) if:
        - Scope is janitorial, custodial, facilities management, landscaping, grounds maintenance, or base support
        - Firm-Fixed-Price (FFP) or performance-based service contract
        - Small business or 8(a) set-aside eligible
        - Recurring/evergreen contract (monthly or annual performance period)
        - No upfront capital expenditures required (equipment, materials purchased by agency)
        - Subcontracting permitted — work can be delegated to approved vendors

        REJECT (score 1-4) if:
        - Construction, renovation, or major repair (requires bonding, surety, upfront materials)
        - Davis-Bacon Act certified payroll required (incompatible with Zero-Float model)
        - Security clearances required for all field staff
        - Non-FFP billing structure (T&M, cost-plus, CPFF)
        - Equipment procurement is primary deliverable (not service)
        - Scope is entirely outside facilities, janitorial, or landscaping services

        SCORE 9-10: SB/8(a) set-aside + FFP + recurring service + no clearance + under $250K
        SCORE 7-8: Competitive but manageable scope + clear service deliverables
        SCORE 5-6: On-site specific requirements or moderate compliance burden but FFP-compatible
        SCORE 1-4: Davis-Bacon, construction bonding, clearance, or non-service primary scope

        Return strict JSON matching the provided schema.
        """
        response = client.models.generate_content(
            model="gemini-2.5-pro",
            contents=[gemini_file, system_instruction],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=TriageReport,
                temperature=0.1
            )
        )
        data = json.loads(response.text)
        data["solicitation_id"] = request.solicitation_id
        score = data.get("section4_adjudication", {}).get("feasibility_score", 1)
        status = "READY_FOR_SOURCING" if score >= 8 else "REJECTED"

        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO solicitation_queue
                (solicitation_id, triage_score, phase_status, status, pdf_url, triage_report, raw_json)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (solicitation_id) DO UPDATE SET
                triage_score = EXCLUDED.triage_score,
                phase_status = EXCLUDED.phase_status,
                status = EXCLUDED.status,
                triage_report = EXCLUDED.triage_report,
                raw_json = EXCLUDED.raw_json,
                updated_at = NOW()
        """, (
            request.solicitation_id, score, "TRIAGE_COMPLETE", status,
            request.pdf_url, json.dumps(data), json.dumps(data)
        ))
        conn.commit()
        cur.close()
        conn.close()

        if score >= 9:
            asyncio.create_task(_auto_dispatch_rfq(request.solicitation_id))

        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gemini processing error: {str(e)}")
    finally:
        if gemini_file:
            try:
                client.files.delete(name=gemini_file.name)
            except Exception:
                pass
        if temp_pdf_path and os.path.exists(temp_pdf_path):
            os.remove(temp_pdf_path)


# ──────────────── Solicitations ────────────────

@app.get("/api/solicitations/list")
async def list_solicitations():
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


# ──────────────── Sourcing ────────────────

@app.post("/api/sourcing/trigger/{sol_id}")
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


@app.get("/api/sourcing/rfq-queue")
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


@app.post("/api/sourcing/approve/{rfq_id}")
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

    cur.execute("""
        SELECT v.email, v.legal_name, v.naics_codes,
               COALESCE(SUM(c.subcontract_value), 0) AS committed,
               COALESCE(SUM(c.total_invoiced), 0) AS invoiced
        FROM vendor_registry v
        LEFT JOIN active_contracts c ON c.vendor_id = v.id AND c.contract_status = 'ACTIVE'
        WHERE v.portal_access = true AND v.email IS NOT NULL
        GROUP BY v.id, v.email, v.legal_name, v.naics_codes
    """)
    vendors = cur.fetchall()

    conn.commit()
    cur.close()
    conn.close()

    dispatched = 0
    skipped_capacity = 0
    if sol:
        agency, naics, deadline, pdf_url = sol
        deadline_str = deadline.strftime("%B %d, %Y %I:%M %p ET") if deadline else None
        for email_addr, vendor_name, vendor_naics, committed, invoiced in vendors:
            if committed > 0 and invoiced / committed > 0.80:
                skipped_capacity += 1
                continue
            naics_match = (
                not naics or
                not vendor_naics or
                any(naics.startswith(n[:4]) for n in (vendor_naics or []))
            )
            if naics_match:
                email_rfq_dispatch(email_addr, vendor_name, rfq_id, agency, naics, deadline_str, pdf_url or "")
                dispatched += 1

    return {
        "status": "approved",
        "solicitation_id": rfq_id,
        "dispatched_to": dispatched,
        "skipped_capacity": skipped_capacity,
        "note": f"RFQ dispatched to {dispatched} matched vendor(s); {skipped_capacity} skipped (over capacity)",
    }


# ──────────────── Pricing ────────────────

@app.post("/api/pricing/analyze")
async def analyze_pricing(request: QuoteSubmitRequest, _: None = Depends(_require_admin)):
    labor = request.labor_rate_hourly or 0
    total = request.total_amount

    analysis = {
        "conservative_margin": total * 1.10,
        "optimized_margin": total * 1.15,
        "aggressive_anchor": total * 1.20,
        "sca_wage_floor_check": labor >= 15.0,
        "recommendation": "PROCEED" if total > 0 else "CLARIFY"
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


@app.get("/api/pricing/{sol_id}")
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
    return [{"id": str(r[0]), "vendor_id": str(r[1]), "total_amount": float(r[2]) if r[2] else None,
             "pricing_analysis": r[3], "recommendation": r[4], "status": r[5]} for r in rows]


# ──────────────── Vendors ────────────────

@app.post("/api/vendors/register")
async def register_vendor(request: VendorRegisterRequest):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            INSERT INTO vendor_registry
                (legal_name, cage_code, naics_codes, zip_code, city, state,
                 contact_name, email, phone, pay_when_paid_accepted,
                 tech_stack, primary_skill, github_url, portfolio_url,
                 clearance_level, remote_ok, hourly_rate_min, hourly_rate_max,
                 section_508_certified, onboarding_status, notes)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,'DOCS_SUBMITTED',%s)
            RETURNING id
        """, (
            request.legal_name, request.cage_code,
            request.naics_codes, request.zip_code, request.city, request.state,
            request.contact_name, request.email, request.phone,
            request.pay_when_paid_accepted,
            request.tech_stack, request.primary_skill, request.github_url, request.portfolio_url,
            request.clearance_level or 'NONE', request.remote_ok if request.remote_ok is not None else True,
            request.hourly_rate_min, request.hourly_rate_max,
            request.section_508_certified or False, request.notes
        ))
        vendor_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        conn.close()
        email_vendor_onboarding_received(request.email, request.legal_name, request.contact_name)
        return {"status": "registered", "vendor_id": str(vendor_id),
                "message": "Application received. Timothy will review within 24 hours."}
    except Exception as e:
        conn.rollback()
        cur.close()
        conn.close()
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/vendors")
async def list_vendors(_: None = Depends(_require_admin)):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT id, legal_name, cage_code, email, phone, onboarding_status,
               portal_access, response_status, contracts_completed, created_at
        FROM vendor_registry ORDER BY created_at DESC
    """)
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return [{"id": str(r[0]), "legal_name": r[1], "cage_code": r[2], "email": r[3],
             "phone": r[4], "onboarding_status": r[5], "portal_access": r[6],
             "response_status": r[7], "contracts_completed": r[8],
             "created_at": r[9].isoformat() if r[9] else None} for r in rows]


@app.get("/api/vendors/{vendor_id}")
async def get_vendor(vendor_id: str, _: None = Depends(_require_admin)):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT id, legal_name, cage_code, naics_codes, zip_code, city, state,
               contact_name, email, phone, insurance_verified, insurance_expiry,
               sam_verified, pay_when_paid_accepted, response_status,
               performance_rating, contracts_completed, onboarding_status,
               portal_access, notes, created_at
        FROM vendor_registry WHERE id=%s::uuid
    """, (vendor_id,))
    row = cur.fetchone()
    cur.close()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Vendor not found")
    return {"id": str(row[0]), "legal_name": row[1], "cage_code": row[2],
            "naics_codes": row[3], "zip_code": row[4], "city": row[5], "state": row[6],
            "contact_name": row[7], "email": row[8], "phone": row[9],
            "insurance_verified": row[10],
            "insurance_expiry": row[11].isoformat() if row[11] else None,
            "sam_verified": row[12], "pay_when_paid_accepted": row[13],
            "response_status": row[14], "performance_rating": float(row[15]) if row[15] else None,
            "contracts_completed": row[16], "onboarding_status": row[17],
            "portal_access": row[18], "notes": row[19],
            "created_at": row[20].isoformat() if row[20] else None}


@app.put("/api/vendors/{vendor_id}")
async def update_vendor(vendor_id: str, request: VendorUpdateRequest, _: None = Depends(_require_admin)):
    conn = get_db_connection()
    cur = conn.cursor()
    updates = []
    values = []
    if request.legal_name is not None:
        updates.append("legal_name=%s"); values.append(request.legal_name)
    if request.contact_name is not None:
        updates.append("contact_name=%s"); values.append(request.contact_name)
    if request.phone is not None:
        updates.append("phone=%s"); values.append(request.phone)
    if request.onboarding_status is not None:
        updates.append("onboarding_status=%s"); values.append(request.onboarding_status)
    if request.portal_access is not None:
        updates.append("portal_access=%s"); values.append(request.portal_access)
    if request.response_status is not None:
        updates.append("response_status=%s"); values.append(request.response_status)
    if request.notes is not None:
        updates.append("notes=%s"); values.append(request.notes)
    if not updates:
        return {"status": "no changes"}
    values.append(vendor_id)
    cur.execute(f"UPDATE vendor_registry SET {', '.join(updates)} WHERE id=%s::uuid", values)
    conn.commit()
    cur.close()
    conn.close()
    return {"status": "updated", "vendor_id": vendor_id}


@app.post("/api/vendors/{vendor_id}/docs")
async def upload_vendor_doc(vendor_id: str, doc_type: str = Query(...),
                             filename: str = Query(...), _: None = Depends(_require_admin)):
    storage_path = f"/tmp/vendor_docs/{vendor_id}/{doc_type}_{filename}"
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO documents (related_type, related_id, doc_type, filename, storage_path, uploaded_by)
        VALUES ('VENDOR', %s, %s, %s, %s, %s)
        RETURNING id
    """, (vendor_id, doc_type, filename, storage_path, vendor_id))
    doc_id = cur.fetchone()[0]
    conn.commit()
    cur.close()
    conn.close()
    return {"status": "registered", "doc_id": str(doc_id), "note": "Upload file via portal UI"}


# ──────────────── Quotes ────────────────

@app.post("/api/quotes/submit")
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


@app.get("/api/quotes/{solicitation_id}")
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


@app.post("/api/quotes/evaluate/{solicitation_id}")
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

    prompt = f"""You are the Chief Procurement Officer for Burger Consulting LLC, a federal facilities prime contractor
operating under the Zero-Float doctrine. NAICS: 561210 (Facilities Support), 561720 (Janitorial), 561730 (Landscaping).

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
- "key_risks": array of top risks (insurance gaps, mobilization timeline, Davis-Bacon exposure, pay-when-paid refusal)

Be objective. Prioritize: Pay-When-Paid acceptance > insurance compliance > mobilization speed > price > past performance.
A vendor accepting Pay-When-Paid at a slightly higher rate is preferable to a cheaper vendor requiring net-30 upfront."""

    try:
        response = client.models.generate_content(
            model="gemini-2.5-pro",
            contents=[prompt],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.1,
            )
        )
        evaluation = json.loads(response.text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gemini evaluation error: {str(e)}")

    # Persist AI evaluation back to each quote record
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


# ──────────────── Proposals ────────────────

@app.post("/api/proposals/generate")
async def generate_proposal(request: ProposalGenerateRequest, _: None = Depends(_require_admin)):
    """Use Gemini to generate a complete federal proposal draft from triage data."""
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT triage_report, agency, naics, estimated_value, response_deadline, pdf_url
        FROM solicitation_queue WHERE solicitation_id=%s
    """, (request.solicitation_id,))
    sol = cur.fetchone()
    if not sol:
        cur.close()
        conn.close()
        raise HTTPException(status_code=404, detail="Solicitation not found")

    triage_report, agency, naics, est_value, deadline, pdf_url = sol

    # Pull approved boilerplate language for this NAICS
    cur.execute("""
        SELECT section, content FROM approved_language
        WHERE naics=%s OR naics IS NULL
        ORDER BY win_rate DESC NULLS LAST LIMIT 10
    """, (naics,))
    boilerplate = {r[0]: r[1] for r in cur.fetchall()}

    # Pull selected vendor quote if provided
    vendor_info = None
    if request.selected_vendor_id:
        cur.execute("""
            SELECT v.legal_name, v.cage_code, v.naics_codes, v.city, v.state,
                   v.performance_rating, v.contracts_completed, q.total_amount,
                   q.labor_rate_hourly, q.period_of_performance
            FROM vendor_registry v
            LEFT JOIN vendor_quotes q ON q.vendor_id = v.id AND q.solicitation_id=%s
            WHERE v.id=%s::uuid
        """, (request.solicitation_id, request.selected_vendor_id))
        vrow = cur.fetchone()
        if vrow:
            vendor_info = {
                "name": vrow[0], "cage": vrow[1], "naics": vrow[2],
                "location": f"{vrow[3]}, {vrow[4]}", "rating": vrow[5],
                "contracts": vrow[6], "quote_total": vrow[7],
                "labor_rate": vrow[8], "pop": vrow[9],
            }

    cur.close()
    conn.close()

    target_price = request.target_price or (float(est_value) * 1.15 if est_value else None)
    triage_summary = json.dumps(triage_report or {}, indent=2)[:2000]

    deliverable_type = "Facilities Services"
    section_508 = False
    if triage_report:
        scope = triage_report.get("section3_scope") or {}
        deliverable_type = scope.get("primary_deliverable_type", "Facilities Services")
        section_508 = (triage_report.get("section2_compliance") or {}).get("section_508_required", False)

    prompt = f"""You are the Chief Proposal Writer for Burger Consulting LLC (EIN: 84-3113166),
a federal facilities management prime contractor in New York City operating under the Zero-Float doctrine.
NAICS codes: 561210 (Facilities Support Services), 561720 (Janitorial Services), 561730 (Landscaping Services).
Principal: Timothy J. Burger — facilities management professional and federal subcontracting specialist with expertise in SCA compliance, pay-when-paid subcontract structures, and FFP performance-based service contracts.

Write a complete, compelling federal proposal for the following facilities services solicitation:

SOLICITATION: {request.solicitation_id}
AGENCY: {agency or 'Federal Agency'}
NAICS: {naics or 'See SOW'}
DELIVERABLE TYPE: {deliverable_type}
SECTION 508 REQUIRED: {section_508}
ESTIMATED VALUE: ${float(est_value or 0):,.0f}
RESPONSE DEADLINE: {deadline.strftime('%B %d, %Y') if deadline else 'TBD'}
TARGET PRICE: ${target_price:,.2f if target_price else 'TBD'}

TRIAGE ANALYSIS SUMMARY:
{triage_summary}

SELECTED SUBCONTRACTOR / KEY PERSONNEL: {json.dumps(vendor_info, indent=2) if vendor_info else 'TBD — to be inserted after award'}

APPROVED BOILERPLATE AVAILABLE:
{json.dumps(boilerplate, indent=2)[:1000] if boilerplate else 'None on file'}

ADDITIONAL NOTES: {request.additional_notes or 'None'}

Generate a complete proposal with these exact sections. Write 2-4 paragraphs per section using
professional federal IT proposal language (clear, direct, compliance-focused):

1. TECHNICAL_APPROACH: Describe BCG's IT delivery methodology. Include: Agile/iterative development
   approach (2-week sprints with agency checkpoints), technology stack selection rationale,
   Section 508 / WCAG 2.2 AA compliance plan (if required), security controls (NIST SP 800-53),
   remote delivery model, testing and QA protocol, and deliverable acceptance criteria.

2. MANAGEMENT_PLAN: Timothy J. Burger as Principal/PM. Communication plan (weekly status reports,
   GitHub/Jira project tracking, monthly demos to agency stakeholders). Subcontractor oversight via
   code review and deliverable QA. Risk mitigation: backup developer roster, version control,
   documentation standards. Escalation path for scope changes. Reporting cadence and tools.

3. PRICING_NARRATIVE: Labor category breakdown (Senior Developer, UI/UX Designer, PM, QA Engineer)
   at GSA IT Schedule labor rates. Hours estimate per deliverable. BCG prime management fee of
   15-20% for oversight, compliance assurance, PM, and billing administration. No upfront capital
   required — all work billed monthly or milestone-based. Competitive with market comparables
   from USASpending.gov award data for this NAICS.

4. PAST_PERFORMANCE: BCG's IT capability narrative. Note: Company in first year of federal contracting.
   Emphasize: Timothy Burger's direct software engineering expertise (UI/UX, web development, system design),
   Section 508 compliance knowledge, and the strength of the vetted subcontractor network.
   Reference relevant private-sector or academic experience. Commitment to building a strong federal track record.

5. WIN_PROBABILITY: Integer 1-100. Consider: set-aside status, competition level for this NAICS,
   BCG's technical fit for the deliverable type, Section 508 advantage (if applicable), and price competitiveness.

Return as JSON with keys: technical_approach, management_plan, pricing_narrative,
past_performance, win_probability (integer), executive_summary (2 sentences max)."""

    try:
        response = client.models.generate_content(
            model="gemini-2.5-pro",
            contents=[prompt],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.3,
            )
        )
        proposal_data = json.loads(response.text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gemini proposal generation error: {str(e)}")

    # Persist proposal to DB
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO proposals
            (solicitation_id, gemini_draft, technical_approach, management_plan,
             pricing_narrative, past_performance, win_probability, status)
        VALUES (%s, %s, %s, %s, %s, %s, %s, 'DRAFT')
        ON CONFLICT (solicitation_id) DO UPDATE SET
            gemini_draft = EXCLUDED.gemini_draft,
            technical_approach = EXCLUDED.technical_approach,
            management_plan = EXCLUDED.management_plan,
            pricing_narrative = EXCLUDED.pricing_narrative,
            past_performance = EXCLUDED.past_performance,
            win_probability = EXCLUDED.win_probability,
            updated_at = NOW()
        RETURNING id
    """, (
        request.solicitation_id,
        response.text,
        proposal_data.get("technical_approach"),
        proposal_data.get("management_plan"),
        proposal_data.get("pricing_narrative"),
        proposal_data.get("past_performance"),
        proposal_data.get("win_probability"),
    ))
    proposal_id = cur.fetchone()[0]

    # Increment boilerplate usage counters
    for section in boilerplate:
        cur.execute("""
            UPDATE approved_language SET times_used = times_used + 1
            WHERE naics=%s AND section=%s
        """, (naics, section))

    conn.commit()
    cur.close()
    conn.close()

    return {
        "proposal_id": str(proposal_id),
        "solicitation_id": request.solicitation_id,
        "proposal": proposal_data,
        "status": "DRAFT",
    }


@app.get("/api/proposals")
async def list_proposals(_: None = Depends(_require_admin)):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT p.id, p.solicitation_id, s.agency, s.naics, s.estimated_value,
               p.win_probability, p.status, p.created_at, p.updated_at
        FROM proposals p
        LEFT JOIN solicitation_queue s ON p.solicitation_id = s.solicitation_id
        ORDER BY p.created_at DESC
    """)
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return [{"id": str(r[0]), "solicitation_id": r[1], "agency": r[2], "naics": r[3],
             "estimated_value": float(r[4]) if r[4] else None,
             "win_probability": r[5], "status": r[6],
             "created_at": r[7].isoformat() if r[7] else None,
             "updated_at": r[8].isoformat() if r[8] else None} for r in rows]


@app.get("/api/proposals/{solicitation_id}")
async def get_proposal(solicitation_id: str, _: None = Depends(_require_admin)):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT id, solicitation_id, technical_approach, management_plan,
               pricing_narrative, past_performance, win_probability,
               status, created_at, updated_at
        FROM proposals WHERE solicitation_id=%s
        ORDER BY created_at DESC LIMIT 1
    """, (solicitation_id,))
    row = cur.fetchone()
    cur.close()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="No proposal found for this solicitation")
    return {"id": str(row[0]), "solicitation_id": row[1],
            "technical_approach": row[2], "management_plan": row[3],
            "pricing_narrative": row[4], "past_performance": row[5],
            "win_probability": row[6], "status": row[7],
            "created_at": row[8].isoformat() if row[8] else None,
            "updated_at": row[9].isoformat() if row[9] else None}


# ──────────────── Milestones ────────────────

class MilestoneCreateRequest(BaseModel):
    milestone_name: str
    description: Optional[str] = None
    due_date: Optional[str] = None
    invoice_amount: Optional[float] = None
    deliverable_url: Optional[str] = None
    notes: Optional[str] = None

@app.get("/api/contracts/{contract_id}/milestones")
async def get_milestones(contract_id: str):
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


@app.post("/api/contracts/{contract_id}/milestones")
async def create_milestone(contract_id: str, request: MilestoneCreateRequest, _: None = Depends(_require_admin)):
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


@app.put("/api/contracts/{contract_id}/milestones/{milestone_id}")
async def update_milestone(contract_id: str, milestone_id: str,
                            status: str = Query(...), deliverable_url: Optional[str] = Query(None),
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


@app.get("/api/subcontractor-searches")
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
             "required_skills": r[3], "budget_min": float(r[4]) if r[4] else None,
             "budget_max": float(r[5]) if r[5] else None, "candidates_found": r[6],
             "status": r[7], "created_at": r[8].isoformat() if r[8] else None} for r in rows]


# ──────────────── Contracts ────────────────

@app.get("/api/contracts/active")
async def get_active_contracts():
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


@app.post("/api/contracts/award")
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
            request.performance_start, request.performance_end
        ))
        contract_id = cur.fetchone()[0]
        cur.execute("""
            UPDATE solicitation_queue SET phase_status='AWARDED', updated_at=NOW()
            WHERE solicitation_id=%s
        """, (request.solicitation_id,))
        conn.commit()
        cur.close()
        conn.close()
        return {"status": "awarded", "contract_id": str(contract_id)}
    except Exception as e:
        conn.rollback()
        cur.close()
        conn.close()
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/contracts/{contract_id}/invoice")
async def submit_invoice(contract_id: str, request: InvoiceRequest, _: None = Depends(_require_admin)):
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
    return {"status": "invoice_submitted", "contract_id": contract_id,
            "amount": request.total_amount}


@app.put("/api/contracts/{contract_id}/payment")
async def record_payment(contract_id: str, request: PaymentUpdateRequest, _: None = Depends(_require_admin)):
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


# ──────────────── Admin ────────────────

@app.get("/api/admin/morning-brief")
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

    cur.execute("SELECT COALESCE(SUM(total_invoiced - total_received), 0) FROM active_contracts WHERE total_invoiced > total_received")
    ar = cur.fetchone()[0]

    # Solicitations with deadlines in next 72 hours
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
                        "hours_left": max(0, int((r[2].replace(tzinfo=None) - datetime.utcnow()).total_seconds() / 3600)) if r[2] else None}
                       for r in cur.fetchall()]

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
    }


@app.get("/api/admin/approval-queue")
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


@app.post("/api/admin/vendor/approve/{vendor_id}")
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


# ──────────────── Intelligence ────────────────

@app.get("/api/intelligence/awards")
async def get_award_intelligence(
    naics: Optional[str] = None,
    limit: int = 50,
    _: None = Depends(_require_admin)
):
    """Return competitive award data from USASpending.gov for pricing intelligence."""
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

    # Compute pricing stats
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


# ──────────────── Financials ────────────────

@app.get("/api/admin/financials")
async def get_financials(_: None = Depends(_require_admin)):
    """Full P&L snapshot, pipeline forecast, AR aging, and margin analysis."""
    conn = get_db_connection()
    cur = conn.cursor()

    # Total revenue and cost from closed/active contracts
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

    # AR aging buckets
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

    # Pipeline weighted forecast
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

    # Margin by NAICS
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

    # Win rate (awarded / (awarded + rejected))
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
