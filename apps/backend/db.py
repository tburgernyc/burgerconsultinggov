import os
import psycopg2
from psycopg2 import pool as pg_pool

_pool: "pg_pool.ThreadedConnectionPool | None" = None

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
  naics_codes TEXT[] NOT NULL DEFAULT '{541511,541519,541512}',
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
  tech_stack TEXT[],
  primary_skill TEXT,
  github_url TEXT,
  portfolio_url TEXT,
  clearance_level TEXT DEFAULT 'NONE',
  remote_ok BOOLEAN DEFAULT true,
  hourly_rate_min NUMERIC,
  hourly_rate_max NUMERIC,
  section_508_certified BOOLEAN DEFAULT false,
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
  last_ar_followup_at TIMESTAMPTZ,
  wawf_registered BOOLEAN DEFAULT false,
  sca_applies BOOLEAN DEFAULT false,
  certified_payroll_current BOOLEAN DEFAULT true,
  contract_status TEXT DEFAULT 'ACTIVE',
  subcontract_agreement TEXT,
  agreement_signed_at TIMESTAMPTZ,
  agreement_signed_by TEXT,
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

CREATE TABLE IF NOT EXISTS vendor_prospects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  entity_name TEXT NOT NULL,
  uei TEXT,
  cage_code TEXT,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  naics_codes TEXT[],
  city TEXT,
  state TEXT,
  business_types TEXT[],
  past_performance JSONB,
  qualification_score INTEGER,
  status TEXT DEFAULT 'DISCOVERED',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS outreach_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitation_id TEXT REFERENCES solicitation_queue(solicitation_id) ON DELETE CASCADE,
  prospect_id UUID REFERENCES vendor_prospects(id) ON DELETE CASCADE,
  quote_token UUID DEFAULT gen_random_uuid() UNIQUE,
  sow_brief TEXT,
  status TEXT DEFAULT 'PENDING',
  day0_sent_at TIMESTAMPTZ,
  day3_sent_at TIMESTAMPTZ,
  day7_sent_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
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
ALTER TABLE solicitation_queue ADD COLUMN IF NOT EXISTS auto_dispatched BOOLEAN DEFAULT false;
ALTER TABLE solicitation_queue ADD COLUMN IF NOT EXISTS deadline_alert_sent BOOLEAN DEFAULT false;
ALTER TABLE active_contracts ADD COLUMN IF NOT EXISTS last_ar_followup_at TIMESTAMPTZ;
ALTER TABLE active_contracts ADD COLUMN IF NOT EXISTS agency_cor_name TEXT;
ALTER TABLE active_contracts ADD COLUMN IF NOT EXISTS agency_cor_email TEXT;
ALTER TABLE active_contracts ADD COLUMN IF NOT EXISTS billing_type TEXT DEFAULT 'MONTHLY';
ALTER TABLE active_contracts ADD COLUMN IF NOT EXISTS subcontract_agreement TEXT;
ALTER TABLE active_contracts ADD COLUMN IF NOT EXISTS agreement_signed_at TIMESTAMPTZ;
ALTER TABLE active_contracts ADD COLUMN IF NOT EXISTS agreement_signed_by TEXT;
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
ALTER TABLE vendor_prospects ADD COLUMN IF NOT EXISTS uei TEXT;
ALTER TABLE vendor_prospects ADD COLUMN IF NOT EXISTS entity_url TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS vendor_prospects_uei_idx ON vendor_prospects(uei) WHERE uei IS NOT NULL;
ALTER TABLE vendor_registry ADD COLUMN IF NOT EXISTS onboarding_status TEXT DEFAULT 'PENDING';
CREATE UNIQUE INDEX IF NOT EXISTS vendor_registry_email_idx ON vendor_registry(email) WHERE email IS NOT NULL;
"""


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

    def __enter__(self):
        return self

    def __exit__(self, exc_type, *_):
        if exc_type:
            try:
                self._conn.rollback()
            except Exception:
                pass
        self.close()

    @property
    def closed(self):
        return self._conn.closed


def get_db_connection() -> "_PooledConn":
    return _PooledConn(_pool.getconn())
