from pydantic import BaseModel, Field
from typing import Optional, List


class Section1(BaseModel):
    upfront_capital_required: bool = Field(description="Does this require purchasing hardware or software licenses upfront before billing?")
    clearance_required: bool = Field(description="Is an active security clearance (SECRET, TS, TS/SCI) required for personnel?")
    firm_fixed_price: bool = Field(description="Is this FFP, T&M, or IDIQ — any of which support remote IT delivery?")


class Section2(BaseModel):
    remote_delivery_allowed: bool = Field(description="Can work be performed fully or primarily remotely without mandatory on-site presence?")
    subcontracting_barred: bool = Field(description="Is subcontracting explicitly prohibited in the solicitation?")
    section_508_required: bool = Field(description="Does the solicitation require Section 508 / WCAG accessibility compliance? (positive signal)")


class Section3(BaseModel):
    primary_naics: str = Field(description="The 6-digit NAICS code (541511, 541519, 541512, or closest match).")
    primary_deliverable_type: str = Field(description="Primary deliverable: SOFTWARE_DEVELOPMENT, IT_PROJECT_MANAGEMENT, SYSTEMS_DESIGN, IT_CONSULTING, SECTION_508_REMEDIATION, DATA_ANALYSIS, or OTHER.")
    estimated_labor_hours: int = Field(description="Estimated total labor hours if discernible from the SOW, else 0.")


class TriageAdjudication(BaseModel):
    feasibility_score: int = Field(description="Score 1-10. 9-10: SB/8(a) set-aside + FFP/IDIQ + IT services scope + no clearance + remote OK. 7-8: competitive IT scope + clear deliverables. 5-6: partial on-site or moderate compliance burden. 1-4: mandatory clearance, hardware procurement primary, non-IT scope.")
    decision: str = Field(description="PROCEED, REVIEW, or REJECT.")
    reasoning: str = Field(description="Two-sentence justification referencing BCG's Zero-Float IT services model.")


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


class MilestoneCreateRequest(BaseModel):
    milestone_name: str
    description: Optional[str] = None
    due_date: Optional[str] = None
    invoice_amount: Optional[float] = None
    deliverable_url: Optional[str] = None
    notes: Optional[str] = None


class ManualProspectRequest(BaseModel):
    entity_name: str
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    naics_codes: Optional[List[str]] = None
    qualification_score: Optional[int] = 5
    notes: Optional[str] = None


class ProspectQuoteRequest(BaseModel):
    vendor_name: str
    contact_name: str
    contact_email: str
    labor_categories: list[dict]
    total_amount: float
    period_of_performance: str
    tech_stack: Optional[list[str]] = None
    deliverables: Optional[str] = None
    pay_when_paid_accepted: bool = False
    notes: Optional[str] = None


class AgreementSignRequest(BaseModel):
    signed_by: str
