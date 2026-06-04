import os
import resend

resend.api_key = os.getenv("RESEND_API_KEY", "")
_FROM = "Burger Consulting LLC <procurement@burgergov.com>"
_PORTAL_URL = os.getenv("NEXTAUTH_URL", "https://www.burgergov.com")


def _send_email(to: str, subject: str, html: str) -> None:
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


def email_outreach_initial(to: str, entity_name: str, sol_id: str, agency: str,
                            naics: str, sow_brief: str, quote_url: str,
                            deadline_str: str, est_value: float,
                            opt_out_url: str = "") -> None:
    value_line = f'${est_value:,.0f}' if est_value else 'See brief'
    unsubscribe_footer = (
        f'<p style="font-size:11px;color:#9ca3af;margin-top:24px;border-top:1px solid #e5e7eb;padding-top:12px">'
        f'You received this because your firm is listed in the SAM.gov federal vendor registry or USASpending.gov award history. '
        f'This is a one-time solicitation outreach — you will receive at most two follow-ups. '
        f'<a href="{opt_out_url}" style="color:#9ca3af;text-decoration:underline">Unsubscribe from this solicitation</a>.</p>'
    ) if opt_out_url else ''
    body = (
        f'<h2 style="color:#1a2e4a;margin:0 0 8px;font-size:20px">Subcontract Quote Request</h2>'
        f'<p style="margin:0 0 16px;color:#4b5563;font-size:14px">You are receiving this because your firm appears in the SAM.gov registry or USASpending.gov award history as a qualified provider for federal IT services work under <strong>NAICS {naics}</strong>.</p>'
        '<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:16px 0">'
        '<div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.07em;color:#6b7a99;margin-bottom:10px">Solicitation Details</div>'
        '<table style="width:100%;border-collapse:collapse">'
        f'<tr><td style="padding:6px 0;color:#6b7a99;font-size:13px;width:40%">Solicitation ID</td><td style="padding:6px 0;font-weight:700;font-size:13px">{sol_id}</td></tr>'
        f'<tr><td style="padding:6px 0;color:#6b7a99;font-size:13px">Issuing Agency</td><td style="padding:6px 0;font-size:13px">{agency or "Federal Agency"}</td></tr>'
        f'<tr><td style="padding:6px 0;color:#6b7a99;font-size:13px">NAICS</td><td style="padding:6px 0;font-size:13px">{naics}</td></tr>'
        f'<tr><td style="padding:6px 0;color:#6b7a99;font-size:13px">Estimated Value</td><td style="padding:6px 0;font-weight:700;font-size:13px">{value_line}</td></tr>'
        f'<tr><td style="padding:6px 0;color:#6b7a99;font-size:13px">Quote Deadline</td><td style="padding:6px 0;font-weight:700;color:#d97706;font-size:13px">{deadline_str}</td></tr>'
        '</table></div>'
        '<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:14px;margin:16px 0">'
        '<div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.07em;color:#92400e;margin-bottom:8px">Scope of Work Summary</div>'
        f'<div style="font-size:13px;color:#1a2e4a;line-height:1.7;white-space:pre-line">{sow_brief}</div>'
        '</div>'
        '<p style="font-size:14px;margin:20px 0 8px;color:#1a2e4a"><strong>What we need from you:</strong></p>'
        '<ul style="margin:0 0 20px;padding-left:20px;font-size:13px;color:#4b5563;line-height:1.8">'
        '<li>Labor categories and hourly rates</li>'
        '<li>Period of performance you can commit to</li>'
        '<li>Relevant tech stack / certifications</li>'
        '<li>Acceptance of Pay-When-Paid terms (payment within 30 days of agency receipt)</li>'
        '</ul>'
        f'<a href="{quote_url}" style="display:inline-block;background:#1a2e4a;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:700;font-size:14px;margin-bottom:20px">Submit Your Quote →</a>'
        '<p style="font-size:12px;color:#9ca3af;margin-top:20px">No account required — the link above takes you directly to the quote form. Burger Consulting LLC (EIN 84-3113166) is a SAM-registered small business prime contractor based in New York, NY.</p>'
        f'{unsubscribe_footer}'
    )
    subject = f"QUOTE REQUEST: {agency or 'Federal Agency'} | {sol_id} | NAICS {naics} | Due {deadline_str}"
    _send_email(to, subject, _wrap(body))


def email_outreach_followup1(to: str, entity_name: str, sol_id: str,
                              agency: str, quote_url: str, deadline_str: str,
                              opt_out_url: str = "") -> None:
    unsubscribe_footer = (
        f'<p style="font-size:11px;color:#9ca3af;margin-top:24px;border-top:1px solid #e5e7eb;padding-top:12px">'
        f'<a href="{opt_out_url}" style="color:#9ca3af;text-decoration:underline">Unsubscribe from this solicitation</a> — '
        f'you will receive one more reminder if you do not opt out or submit a quote.</p>'
    ) if opt_out_url else ''
    body = (
        f'<h2 style="color:#1a2e4a;margin:0 0 8px;font-size:20px">Following Up — Quote Request for {sol_id}</h2>'
        f'<p style="color:#4b5563;font-size:14px">We sent a subcontract quote request a few days ago for a federal IT services opportunity with <strong>{agency or "a federal agency"}</strong> (Solicitation <strong>{sol_id}</strong>) and wanted to follow up.</p>'
        f'<p style="color:#4b5563;font-size:14px">The quote deadline is <strong style="color:#d97706">{deadline_str}</strong>. If your firm has capacity and the scope is a fit, we would welcome your submission.</p>'
        f'<a href="{quote_url}" style="display:inline-block;background:#1a2e4a;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:700;font-size:14px;margin:20px 0">Submit Your Quote →</a>'
        '<p style="font-size:12px;color:#9ca3af">If you are not interested or this is not a fit, no action needed — you will receive one final reminder before the deadline.</p>'
        f'{unsubscribe_footer}'
    )
    subject = f"Follow-Up: Quote Request — {sol_id} — {agency or 'Federal Agency'}"
    _send_email(to, subject, _wrap(body))


def email_outreach_followup2(to: str, entity_name: str, sol_id: str,
                              agency: str, quote_url: str, deadline_str: str,
                              opt_out_url: str = "") -> None:
    unsubscribe_footer = (
        f'<p style="font-size:11px;color:#9ca3af;margin-top:24px;border-top:1px solid #e5e7eb;padding-top:12px">'
        f'This is the last email on this solicitation. '
        f'<a href="{opt_out_url}" style="color:#9ca3af;text-decoration:underline">Unsubscribe from all future BCG outreach</a>.</p>'
    ) if opt_out_url else ''
    body = (
        f'<h2 style="color:#d97706;margin:0 0 8px;font-size:20px">Final Notice — Quote Deadline Approaching</h2>'
        f'<p style="color:#4b5563;font-size:14px">This is the final outreach for the subcontract quote request on <strong>{sol_id}</strong> with <strong>{agency or "a federal agency"}</strong>.</p>'
        f'<p style="color:#4b5563;font-size:14px">Quote deadline: <strong style="color:#dc2626">{deadline_str}</strong>. After this date we will finalize our team and this opportunity will close.</p>'
        f'<a href="{quote_url}" style="display:inline-block;background:#d97706;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:700;font-size:14px;margin:20px 0">Submit Quote Now →</a>'
        '<p style="font-size:12px;color:#9ca3af">After this email you will not receive further outreach on this solicitation. To be added to our standing vendor registry for future opportunities, visit burgergov.com/portal/register.</p>'
        f'{unsubscribe_footer}'
    )
    subject = f"FINAL NOTICE: Quote Deadline {deadline_str} — {sol_id}"
    _send_email(to, subject, _wrap(body))


def email_admin_document_uploaded(to: str, legal_name: str, doc_type: str,
                                   filename: str, expiry_date: str | None) -> None:
    doc_labels = {
        'INSURANCE': 'General Liability Insurance Certificate',
        'W9': 'W-9 Tax Form',
        'LICENSE': 'State Business License',
        'SAM': 'SAM.gov / CAGE Verification',
    }
    vendor_url = f"{_PORTAL_URL}/admin/vendors"
    expiry_row = (
        f'<tr style="background:#f4f6fa"><td style="padding:10px 12px;color:#6b7a99;font-size:13px;width:40%">Expiry Date</td><td style="padding:10px 12px;font-weight:700;color:#d97706">{expiry_date}</td></tr>'
        if expiry_date else ''
    )
    body = (
        '<h2 style="color:#0a1628;margin:0 0 16px;font-size:20px">Document Uploaded</h2>'
        f'<p>A vendor has uploaded a compliance document that may require review.</p>'
        '<table style="width:100%;border-collapse:collapse;margin:16px 0">'
        f'<tr style="background:#f4f6fa"><td style="padding:10px 12px;color:#6b7a99;font-size:13px;width:40%">Vendor</td><td style="padding:10px 12px;font-weight:700">{legal_name}</td></tr>'
        f'<tr><td style="padding:10px 12px;color:#6b7a99;font-size:13px">Document Type</td><td style="padding:10px 12px">{doc_labels.get(doc_type, doc_type)}</td></tr>'
        f'<tr style="background:#f4f6fa"><td style="padding:10px 12px;color:#6b7a99;font-size:13px">Filename</td><td style="padding:10px 12px;font-family:monospace;font-size:13px">{filename}</td></tr>'
        f'{expiry_row}'
        '</table>'
        f'<div style="text-align:center;margin:24px 0"><a href="{vendor_url}" style="background:#0a1628;color:#c9a84c;padding:12px 32px;border-radius:6px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block">View Vendor Registry →</a></div>'
    )
    _send_email(to, f"Document Uploaded — {legal_name} — {doc_labels.get(doc_type, doc_type)}", _wrap(body))


def email_admin_new_vendor_application(to: str, legal_name: str,
                                        contact_name: str, vendor_email: str) -> None:
    approve_url = f"{_PORTAL_URL}/admin/approvals"
    body = (
        '<h2 style="color:#0a1628;margin:0 0 16px;font-size:20px">New Vendor Application</h2>'
        '<p>A new subcontractor has submitted a vendor partnership application and is awaiting your review.</p>'
        '<table style="width:100%;border-collapse:collapse;margin:16px 0">'
        f'<tr style="background:#f4f6fa"><td style="padding:10px 12px;color:#6b7a99;font-size:13px;width:40%">Business Name</td><td style="padding:10px 12px;font-weight:700">{legal_name}</td></tr>'
        f'<tr><td style="padding:10px 12px;color:#6b7a99;font-size:13px">Contact</td><td style="padding:10px 12px">{contact_name}</td></tr>'
        f'<tr style="background:#f4f6fa"><td style="padding:10px 12px;color:#6b7a99;font-size:13px">Email</td><td style="padding:10px 12px">{vendor_email}</td></tr>'
        '</table>'
        f'<div style="text-align:center;margin:24px 0"><a href="{approve_url}" style="background:#0a1628;color:#c9a84c;padding:12px 32px;border-radius:6px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block">Review in Approval Queue →</a></div>'
    )
    _send_email(to, f"New Vendor Application — {legal_name}", _wrap(body))


def email_morning_brief(to: str, new_opps: int, pipeline_value: float,
                         projected_revenue: float, accounts_receivable: float,
                         pending_approvals: int, deadline_alerts: list[dict],
                         outreach_summary: dict, top_opps: list[dict]) -> None:
    from datetime import date
    date_str = date.today().strftime("%A, %B %d, %Y")

    def _fmt(n: float) -> str:
        return '$' + f'{n:,.0f}'

    alerts_html = ""
    if deadline_alerts:
        rows = "".join(
            f'<tr><td style="padding:6px 8px;font-size:13px;font-weight:700">{a["solicitation_id"]}</td>'
            f'<td style="padding:6px 8px;font-size:13px;color:#6b7a99">{a.get("agency","—")}</td>'
            f'<td style="padding:6px 8px;font-size:13px;color:{"#dc2626" if (a.get("hours_left") or 99) <= 24 else "#d97706"};font-weight:700">{a.get("hours_left","?")}h left</td></tr>'
            for a in deadline_alerts[:5]
        )
        alerts_html = (
            '<div style="margin:16px 0">'
            '<div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.07em;color:#dc2626;margin-bottom:8px">⚡ Deadline Alerts</div>'
            f'<table style="width:100%;border-collapse:collapse">{rows}</table>'
            '</div>'
        )

    opps_html = ""
    if top_opps:
        rows = "".join(
            f'<tr style="{"background:#f4f6fa" if i % 2 == 0 else ""}">'
            f'<td style="padding:6px 8px;font-size:13px;font-weight:700">{o["solicitation_id"]}</td>'
            f'<td style="padding:6px 8px;font-size:12px;color:#6b7a99;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{o.get("agency","—")}</td>'
            f'<td style="padding:6px 8px;font-size:13px;font-weight:600">{_fmt(o["estimated_value"]) if o.get("estimated_value") else "—"}</td>'
            f'<td style="padding:6px 8px"><span style="background:{"#dcfce7" if (o.get("triage_score") or 0) >= 8 else "#fef9c3" if (o.get("triage_score") or 0) >= 6 else "#f4f6fa"};color:{"#166534" if (o.get("triage_score") or 0) >= 8 else "#854d0e" if (o.get("triage_score") or 0) >= 6 else "#6b7a99"};padding:2px 7px;border-radius:4px;font-size:12px;font-weight:700">{o.get("triage_score","—")}/10</span></td>'
            f'</tr>'
            for i, o in enumerate(top_opps[:5])
        )
        opps_html = (
            '<div style="margin:16px 0">'
            '<div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.07em;color:#0a1628;margin-bottom:8px">New Opportunities (Last 24h)</div>'
            f'<table style="width:100%;border-collapse:collapse">{rows}</table>'
            '</div>'
        )

    action_badge = (
        f'<span style="background:#dc2626;color:#fff;padding:2px 8px;border-radius:4px;font-size:12px;font-weight:700">{pending_approvals} pending</span>'
        if pending_approvals > 0 else
        '<span style="background:#dcfce7;color:#166534;padding:2px 8px;border-radius:4px;font-size:12px;font-weight:700">Clear</span>'
    )

    admin_url = f"{_PORTAL_URL}/admin"
    body = (
        f'<h2 style="color:#0a1628;margin:0 0 4px;font-size:20px">Morning Brief</h2>'
        f'<p style="color:#6b7a99;font-size:13px;margin:0 0 20px">{date_str} · Hermes PMO Engine</p>'

        '<table style="width:100%;border-collapse:collapse;margin:0 0 16px">'
        f'<tr>'
        f'<td style="padding:12px;background:#f0f6ff;border-radius:6px;text-align:center;width:33%"><div style="font-size:11px;color:#6b7a99;font-weight:700;text-transform:uppercase;letter-spacing:.05em">Pipeline</div><div style="font-size:1.3rem;font-weight:800;color:#1E40AF">{_fmt(pipeline_value)}</div></td>'
        f'<td style="width:8px"></td>'
        f'<td style="padding:12px;background:#f0fdf4;border-radius:6px;text-align:center;width:33%"><div style="font-size:11px;color:#6b7a99;font-weight:700;text-transform:uppercase;letter-spacing:.05em">Proj. Revenue</div><div style="font-size:1.3rem;font-weight:800;color:#166534">{_fmt(projected_revenue)}</div></td>'
        f'<td style="width:8px"></td>'
        f'<td style="padding:12px;background:#{"fef2f2" if accounts_receivable > 0 else "f4f6fa"};border-radius:6px;text-align:center;width:33%"><div style="font-size:11px;color:#6b7a99;font-weight:700;text-transform:uppercase;letter-spacing:.05em">A/R Outstanding</div><div style="font-size:1.3rem;font-weight:800;color:{"#dc2626" if accounts_receivable > 0 else "#6b7a99"}">{_fmt(accounts_receivable)}</div></td>'
        f'</tr></table>'

        '<table style="width:100%;border-collapse:collapse;margin:0 0 16px">'
        f'<tr>'
        f'<td style="padding:10px 12px;background:#f4f6fa;border-radius:6px;width:48%"><span style="font-size:12px;color:#6b7a99">New Opps (24h)</span><br><span style="font-size:1.1rem;font-weight:800;color:#0a1628">{new_opps}</span></td>'
        f'<td style="width:8px"></td>'
        f'<td style="padding:10px 12px;background:#f4f6fa;border-radius:6px;width:48%"><span style="font-size:12px;color:#6b7a99">Approval Queue</span><br>{action_badge}</td>'
        f'</tr>'
        f'<tr style="height:8px"></tr>'
        f'<tr>'
        f'<td style="padding:10px 12px;background:#f4f6fa;border-radius:6px;width:48%"><span style="font-size:12px;color:#6b7a99">Active Campaigns</span><br><span style="font-size:1.1rem;font-weight:800;color:#7C3AED">{outreach_summary.get("active_campaigns",0)}</span></td>'
        f'<td style="width:8px"></td>'
        f'<td style="padding:10px 12px;background:#f4f6fa;border-radius:6px;width:48%"><span style="font-size:12px;color:#6b7a99">Quotes Received</span><br><span style="font-size:1.1rem;font-weight:800;color:#0a1628">{outreach_summary.get("quotes_received",0)}</span></td>'
        f'</tr></table>'

        f'{alerts_html}'
        f'{opps_html}'

        f'<div style="text-align:center;margin:24px 0"><a href="{admin_url}" style="background:#0a1628;color:#c9a84c;padding:12px 32px;border-radius:6px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block">Open Command Center →</a></div>'
    )
    subject = f"Hermes Brief — {date_str} | {new_opps} new opp{'s' if new_opps != 1 else ''}, {_fmt(pipeline_value)} pipeline"
    if pending_approvals > 0:
        subject = f"⚡ {subject} | {pending_approvals} action{'s' if pending_approvals != 1 else ''} needed"
    _send_email(to, subject, _wrap(body))
