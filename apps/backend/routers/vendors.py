from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from auth import _require_admin, _require_vendor
from db import get_db_connection
from emails import email_vendor_onboarding_received
from models import VendorRegisterRequest, VendorUpdateRequest

router = APIRouter()


class VendorProfileUpdateRequest(BaseModel):
    contact_name: Optional[str] = None
    phone: Optional[str] = None
    tech_stack: Optional[list[str]] = None
    primary_skill: Optional[str] = None
    github_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    hourly_rate_min: Optional[float] = None
    hourly_rate_max: Optional[float] = None
    remote_ok: Optional[bool] = None
    clearance_level: Optional[str] = None


@router.get("/api/vendor-profile")
async def get_vendor_profile(vendor_id: str = Depends(_require_vendor)):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT id, legal_name, cage_code, naics_codes, zip_code, city, state,
               contact_name, email, phone,
               tech_stack, primary_skill, github_url, portfolio_url,
               clearance_level, remote_ok, hourly_rate_min, hourly_rate_max,
               section_508_certified, insurance_verified, insurance_expiry,
               sam_verified, pay_when_paid_accepted,
               performance_rating, contracts_completed, onboarding_status,
               portal_access, created_at
        FROM vendor_registry WHERE id=%s::uuid
    """, (vendor_id,))
    row = cur.fetchone()
    cur.close()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Vendor not found")
    return {
        "id": str(row[0]), "legal_name": row[1], "cage_code": row[2],
        "naics_codes": row[3], "zip_code": row[4], "city": row[5], "state": row[6],
        "contact_name": row[7], "email": row[8], "phone": row[9],
        "tech_stack": row[10], "primary_skill": row[11],
        "github_url": row[12], "portfolio_url": row[13],
        "clearance_level": row[14], "remote_ok": row[15],
        "hourly_rate_min": float(row[16]) if row[16] else None,
        "hourly_rate_max": float(row[17]) if row[17] else None,
        "section_508_certified": row[18], "insurance_verified": row[19],
        "insurance_expiry": row[20].isoformat() if row[20] else None,
        "sam_verified": row[21], "pay_when_paid_accepted": row[22],
        "performance_rating": float(row[23]) if row[23] else None,
        "contracts_completed": row[24], "onboarding_status": row[25],
        "portal_access": row[26],
        "created_at": row[27].isoformat() if row[27] else None,
    }


@router.put("/api/vendor-profile")
async def update_vendor_profile(request: VendorProfileUpdateRequest,
                                 vendor_id: str = Depends(_require_vendor)):
    updates = []
    values = []
    if request.contact_name is not None:
        updates.append("contact_name=%s"); values.append(request.contact_name)
    if request.phone is not None:
        updates.append("phone=%s"); values.append(request.phone)
    if request.tech_stack is not None:
        updates.append("tech_stack=%s"); values.append(request.tech_stack)
    if request.primary_skill is not None:
        updates.append("primary_skill=%s"); values.append(request.primary_skill)
    if request.github_url is not None:
        updates.append("github_url=%s"); values.append(request.github_url)
    if request.portfolio_url is not None:
        updates.append("portfolio_url=%s"); values.append(request.portfolio_url)
    if request.hourly_rate_min is not None:
        updates.append("hourly_rate_min=%s"); values.append(request.hourly_rate_min)
    if request.hourly_rate_max is not None:
        updates.append("hourly_rate_max=%s"); values.append(request.hourly_rate_max)
    if request.remote_ok is not None:
        updates.append("remote_ok=%s"); values.append(request.remote_ok)
    if request.clearance_level is not None:
        updates.append("clearance_level=%s"); values.append(request.clearance_level)
    if not updates:
        return {"status": "no changes"}
    values.append(vendor_id)
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        f"UPDATE vendor_registry SET {', '.join(updates)} WHERE id=%s::uuid RETURNING id",
        values,
    )
    if not cur.fetchone():
        conn.rollback()
        cur.close()
        conn.close()
        raise HTTPException(status_code=404, detail="Vendor not found")
    conn.commit()
    cur.close()
    conn.close()
    return {"status": "updated"}


@router.post("/api/vendors/register")
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
            request.clearance_level or 'NONE',
            request.remote_ok if request.remote_ok is not None else True,
            request.hourly_rate_min, request.hourly_rate_max,
            request.section_508_certified or False, request.notes,
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


@router.get("/api/vendors")
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


@router.get("/api/vendors/{vendor_id}")
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
            "response_status": row[14],
            "performance_rating": float(row[15]) if row[15] else None,
            "contracts_completed": row[16], "onboarding_status": row[17],
            "portal_access": row[18], "notes": row[19],
            "created_at": row[20].isoformat() if row[20] else None}


@router.put("/api/vendors/{vendor_id}")
async def update_vendor(vendor_id: str, request: VendorUpdateRequest,
                         _: None = Depends(_require_admin)):
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


@router.post("/api/vendors/{vendor_id}/docs")
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
