import os
import json
import tempfile
import requests
import psycopg2
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
    """Daily 7:00 AM ET — query SAM.gov for new NAICS 561210/561720/561730 opportunities."""
    sam_key = os.getenv("SAM_API_KEY", "")
    if not sam_key or sam_key.startswith("placeholder"):
        print("[CRON] SAM_API_KEY not set — SAM.gov scan skipped.")
        return
    print("[CRON] Running SAM.gov scan...")
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
        inserted = 0
        for opp in opps:
            sol_id = opp.get("solicitationNumber") or opp.get("noticeId")
            if not sol_id:
                continue
            try:
                cur.execute("""
                    INSERT INTO solicitation_queue
                        (solicitation_id, agency, naics, estimated_value, phase_status, pdf_url, raw_json)
                    VALUES (%s, %s, %s, %s, 'PENDING_TRIAGE', %s, %s)
                    ON CONFLICT (solicitation_id) DO NOTHING
                """, (
                    sol_id,
                    opp.get("fullParentPathName") or opp.get("departmentName"),
                    opp.get("naicsCode"),
                    None,
                    opp.get("uiLink"),
                    json.dumps(opp),
                ))
                if cur.rowcount:
                    inserted += 1
            except Exception:
                conn.rollback()
        conn.commit()
        cur.close()
        conn.close()
        print(f"[CRON] SAM scan: {inserted} new solicitation(s) inserted.")
    except Exception as exc:
        print(f"[CRON ERROR] SAM scan: {exc}")


def get_db_connection():
    return psycopg2.connect(
        host=os.getenv("DB_HOST", "db"),
        database="postgres",
        user="postgres",
        password=os.getenv("POSTGRES_PASSWORD"),
        port=5432
    )


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
  zero_float_doctrine JSONB NOT NULL DEFAULT '{"upfront_capital": false, "davis_bacon": false, "clearances": false}',
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
  recommendation TEXT,
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
"""


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        conn = get_db_connection()
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
    scheduler.add_job(cron_sam_scan, CronTrigger(hour=7, minute=0))
    scheduler.add_job(cron_document_expiry_monitor, CronTrigger(hour=8, minute=0))
    scheduler.start()
    print("[CRON] Scheduler started — SAM scan 7:00 AM ET, expiry monitor 8:00 AM ET")

    yield

    scheduler.shutdown()


# ──────────────── Pydantic Models ────────────────

class Section1(BaseModel):
    upfront_capital_required: bool = Field(description="Does the SOW require heavy equipment purchases or material mobilization?")
    davis_bacon_applies: bool = Field(description="Does the contract require Davis-Bacon weekly certified payroll?")
    firm_fixed_price: bool = Field(description="Is this a Firm-Fixed-Price contract with milestone or monthly billing?")

class Section2(BaseModel):
    clearance_required: bool = Field(description="Are personnel or facility clearances required?")
    subcontracting_barred: bool = Field(description="Is subcontracting explicitly barred?")

class Section3(BaseModel):
    primary_naics: str = Field(description="The 6-digit NAICS code.")
    performance_zip: str = Field(description="The primary performance ZIP or UNKNOWN.")
    sca_wage_floor: float = Field(description="Minimum SCA wage floor for primary labor category.")

class TriageAdjudication(BaseModel):
    feasibility_score: int = Field(description="Score from 1 to 10.")
    decision: str = Field(description="PROCEED, REVIEW, or REJECT.")
    reasoning: str = Field(description="Two-sentence justification.")

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
    sam_status: Optional[str] = None
    years_in_operation: Optional[int] = None
    team_size: Optional[str] = None
    max_concurrent_contracts: Optional[int] = None
    mobilization_time: Optional[str] = None
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
    materials_cost: Optional[float] = None
    period_of_performance: Optional[str] = None
    pay_when_paid_confirmed: bool = False
    mobilization_timeline: Optional[str] = None
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


# ──────────────── App ────────────────

app = FastAPI(title="Hermes Cognitive Engine — Burger Consulting LLC", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
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
        You are the Lead Procurement Compliance Director for Burger Consulting LLC.
        Evaluate the solicitation under the Zero-Float doctrine.
        Zero-Float means: reject anything requiring upfront capital, Davis-Bacon payroll,
        security clearances, or structures incompatible with FFP/SCA execution.
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
        phase_status = "TRIAGE_COMPLETE"
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
            request.solicitation_id, score, phase_status, status,
            request.pdf_url, json.dumps(data), json.dumps(data)
        ))
        conn.commit()
        cur.close()
        conn.close()
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


# ──────────────── Solicitations (legacy list) ────────────────

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

    cur.execute("SELECT email, legal_name FROM vendor_registry WHERE portal_access=true AND email IS NOT NULL")
    vendors = cur.fetchall()

    conn.commit()
    cur.close()
    conn.close()

    dispatched = 0
    if sol:
        agency, naics, deadline, pdf_url = sol
        deadline_str = deadline.strftime("%B %d, %Y %I:%M %p ET") if deadline else None
        try:
            for email_addr, vendor_name in vendors:
                email_rfq_dispatch(email_addr, vendor_name, rfq_id, agency, naics, deadline_str, pdf_url or "")
                dispatched += 1
        except Exception as exc:
            print(f"[RFQ DISPATCH ERROR] {exc}")

    return {"status": "approved", "solicitation_id": rfq_id,
            "dispatched_to": dispatched,
            "note": f"RFQ dispatch sent to {len(vendors)} vendor(s)"}


# ──────────────── Pricing ────────────────

@app.post("/api/pricing/analyze")
async def analyze_pricing(request: QuoteSubmitRequest, _: None = Depends(_require_admin)):
    line_items = request.line_items or []
    labor = request.labor_rate_hourly or 0
    materials = request.materials_cost or 0
    total = request.total_amount

    conservative_margin = total * 1.10
    optimized_margin = total * 1.15
    aggressive_anchor = total * 1.20

    analysis = {
        "conservative_margin": conservative_margin,
        "optimized_margin": optimized_margin,
        "aggressive_anchor": aggressive_anchor,
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
                 onboarding_status, notes)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,'DOCS_SUBMITTED',%s)
            RETURNING id
        """, (
            request.legal_name, request.cage_code,
            request.naics_codes, request.zip_code, request.city, request.state,
            request.contact_name, request.email, request.phone,
            request.pay_when_paid_accepted, request.notes
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
async def upload_vendor_doc(vendor_id: str, doc_type: str = Query(...), filename: str = Query(...), _: None = Depends(_require_admin)):
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
                 pay_when_paid_confirmed, status)
            VALUES (%s, %s::uuid, %s, %s, %s, %s, %s, %s, 'PENDING_REVIEW')
            RETURNING id
        """, (
            request.solicitation_id, request.vendor_id,
            json.dumps(request.line_items), request.total_amount,
            request.labor_rate_hourly, request.materials_cost,
            request.period_of_performance, request.pay_when_paid_confirmed
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
               q.recommendation, q.status, q.submitted_at
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
             "submitted_at": r[10].isoformat() if r[10] else None} for r in rows]


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
async def submit_invoice(contract_id: str, request: InvoiceRequest):
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

    cur.close()
    conn.close()

    return {
        "new_opportunities": new_opps,
        "approval_queue": {
            "vendor_applications": pending_vendors,
            "rfq_ready_for_dispatch": rfq_ready
        },
        "active_contract_health": active_contracts,
        "financial_snapshot": {
            "pipeline_value": float(fin[0]),
            "projected_revenue_15pct": float(fin[1]),
            "accounts_receivable": float(ar)
        }
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
