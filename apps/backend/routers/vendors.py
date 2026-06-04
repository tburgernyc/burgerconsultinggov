import os
from typing import Optional

import pathlib
import time

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel

from auth import _require_admin, _require_vendor, _pwd_context
from db import get_db_connection
from emails import (
    email_vendor_onboarding_received,
    email_admin_new_vendor_application,
    email_admin_document_uploaded,
)
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
        admin_email = os.getenv("ADMIN_EMAIL", "procurement@burgergov.com")
        email_admin_new_vendor_application(admin_email, request.legal_name,
                                            request.contact_name, request.email)
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


class _ComplianceUpdateRequest(BaseModel):
    insurance_verified: Optional[bool] = None
    sam_verified: Optional[bool] = None
    pay_when_paid_accepted: Optional[bool] = None


@router.put("/api/vendors/{vendor_id}/compliance")
async def update_vendor_compliance(vendor_id: str, request: _ComplianceUpdateRequest,
                                    _: None = Depends(_require_admin)):
    updates, values = [], []
    if request.insurance_verified is not None:
        updates.append("insurance_verified=%s"); values.append(request.insurance_verified)
    if request.sam_verified is not None:
        updates.append("sam_verified=%s"); values.append(request.sam_verified)
    if request.pay_when_paid_accepted is not None:
        updates.append("pay_when_paid_accepted=%s"); values.append(request.pay_when_paid_accepted)
    if not updates:
        return {"status": "no changes"}
    values.append(vendor_id)
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(f"UPDATE vendor_registry SET {', '.join(updates)} WHERE id=%s::uuid RETURNING id",
                values)
    if not cur.fetchone():
        conn.rollback(); cur.close(); conn.close()
        raise HTTPException(status_code=404, detail="Vendor not found")
    conn.commit(); cur.close(); conn.close()
    return {"status": "updated"}


@router.get("/api/vendors/{vendor_id}/docs/list")
async def list_vendor_docs_admin(vendor_id: str, _: None = Depends(_require_admin)):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT id, doc_type, filename, created_at
        FROM documents
        WHERE related_type = 'VENDOR' AND related_id = %s
        ORDER BY doc_type, created_at DESC
    """, (vendor_id,))
    rows = cur.fetchall()
    cur.close(); conn.close()
    return [{"id": str(r[0]), "doc_type": r[1], "filename": r[2],
             "created_at": r[3].isoformat() if r[3] else None} for r in rows]


@router.get("/api/vendors/{vendor_id}/docs/{doc_id}/file")
async def serve_vendor_doc_admin(vendor_id: str, doc_id: str,
                                  _: None = Depends(_require_admin)):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT storage_path, filename FROM documents
        WHERE id = %s::uuid AND related_type = 'VENDOR' AND related_id = %s
    """, (doc_id, vendor_id))
    row = cur.fetchone()
    cur.close(); conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Document not found")
    path = pathlib.Path(row[0])
    if not path.exists():
        raise HTTPException(status_code=404, detail="File not found on disk")
    media_type = "application/pdf" if str(path).endswith(".pdf") else "image/jpeg"
    return FileResponse(path, media_type=media_type,
                        headers={"Content-Disposition": f'inline; filename="{row[1]}"'})


_UPLOAD_ROOT = pathlib.Path("/app/uploads/vendor_docs")
_ALLOWED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png"}
_ALLOWED_DOC_TYPES = {"INSURANCE", "W9", "LICENSE", "SAM"}


@router.get("/api/vendor-docs")
async def list_vendor_docs(vendor_id: str = Depends(_require_vendor)):
    """Return the most recent uploaded document for each doc type."""
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT DISTINCT ON (doc_type)
               id, doc_type, filename, storage_path, created_at
        FROM documents
        WHERE related_type = 'VENDOR' AND related_id = %s
        ORDER BY doc_type, created_at DESC
    """, (vendor_id,))
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return [{"id": str(r[0]), "doc_type": r[1], "filename": r[2],
             "created_at": r[4].isoformat() if r[4] else None} for r in rows]


@router.post("/api/vendor-docs")
async def upload_vendor_doc_self(
    file: UploadFile = File(...),
    doc_type: str = Form(...),
    expiry_date: Optional[str] = Form(None),
    vendor_id: str = Depends(_require_vendor),
):
    if doc_type not in _ALLOWED_DOC_TYPES:
        raise HTTPException(status_code=400, detail=f"doc_type must be one of {_ALLOWED_DOC_TYPES}")

    suffix = pathlib.Path(file.filename or "upload").suffix.lower()
    if suffix not in _ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Only PDF, JPG, and PNG files are accepted")

    dest_dir = _UPLOAD_ROOT / vendor_id
    dest_dir.mkdir(parents=True, exist_ok=True)
    safe_name = f"{doc_type}_{int(time.time())}{suffix}"
    dest_path = dest_dir / safe_name

    contents = await file.read()
    dest_path.write_bytes(contents)

    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO documents (related_type, related_id, doc_type, filename, storage_path, uploaded_by)
        VALUES ('VENDOR', %s, %s, %s, %s, %s)
        RETURNING id
    """, (vendor_id, doc_type, file.filename, str(dest_path), vendor_id))
    doc_id = cur.fetchone()[0]

    if doc_type == "INSURANCE" and expiry_date:
        cur.execute("""
            UPDATE vendor_registry SET insurance_expiry = %s WHERE id = %s::uuid
        """, (expiry_date, vendor_id))

    conn.commit()
    cur.close()

    cur2 = conn.cursor()
    cur2.execute("SELECT legal_name FROM vendor_registry WHERE id = %s::uuid", (vendor_id,))
    name_row = cur2.fetchone()
    cur2.close()
    conn.close()

    admin_email = os.getenv("ADMIN_EMAIL", "procurement@burgergov.com")
    email_admin_document_uploaded(
        admin_email,
        legal_name=name_row[0] if name_row else vendor_id,
        doc_type=doc_type,
        filename=file.filename or safe_name,
        expiry_date=expiry_date,
    )

    return {"status": "uploaded", "doc_id": str(doc_id), "filename": file.filename}


@router.get("/api/vendor-docs/{doc_id}/file")
async def serve_vendor_doc(doc_id: str, vendor_id: str = Depends(_require_vendor)):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT storage_path, filename, doc_type
        FROM documents
        WHERE id = %s::uuid AND related_type = 'VENDOR' AND related_id = %s
    """, (doc_id, vendor_id))
    row = cur.fetchone()
    cur.close()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Document not found")
    storage_path, filename, doc_type = row
    path = pathlib.Path(storage_path)
    if not path.exists():
        raise HTTPException(status_code=404, detail="File not found on disk")
    media_type = "application/pdf" if str(path).endswith(".pdf") else "image/jpeg"
    return FileResponse(path, media_type=media_type,
                        headers={"Content-Disposition": f'inline; filename="{filename}"'})


class _PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str


@router.put("/api/vendor-password")
async def change_vendor_password(request: _PasswordChangeRequest,
                                  vendor_id: str = Depends(_require_vendor)):
    if len(request.new_password) < 8:
        raise HTTPException(status_code=400, detail="New password must be at least 8 characters")

    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT portal_password_hash FROM vendor_registry WHERE id=%s::uuid", (vendor_id,))
    row = cur.fetchone()
    if not row or not row[0]:
        cur.close()
        conn.close()
        raise HTTPException(status_code=404, detail="Vendor not found")

    if not _pwd_context.verify(request.current_password, row[0]):
        cur.close()
        conn.close()
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    new_hash = _pwd_context.hash(request.new_password)
    cur.execute(
        "UPDATE vendor_registry SET portal_password_hash=%s WHERE id=%s::uuid",
        (new_hash, vendor_id),
    )
    conn.commit()
    cur.close()
    conn.close()
    return {"status": "password_updated"}
