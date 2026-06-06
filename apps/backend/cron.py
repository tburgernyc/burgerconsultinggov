import asyncio
import json
import os
import requests
from datetime import date, datetime, timedelta

from db import get_db_connection
from emails import (
    email_insurance_expiry_warning,
    email_deadline_alert,
    email_ar_followup_sent,
    email_outreach_followup1,
    email_outreach_followup2,
    email_morning_brief,
)
from helpers import _run_auto_triage


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
    """Runs every 4 hours — query SAM.gov for new NAICS 541511/541519/541512 opportunities, then auto-triage."""
    sam_key = os.getenv("SAM_API_KEY", "")
    if not sam_key or sam_key.startswith("placeholder"):
        print("[CRON] SAM_API_KEY not set — SAM.gov scan skipped.")
        return
    print("[CRON] Running SAM.gov IT services scan...")
    newly_inserted = []
    try:
        params = {
            "api_key": sam_key,
            "naicsCode": "541511,541519,541512",
            "active": "true",
            "limit": 100,
            "postedFrom": (date.today() - timedelta(days=1)).strftime("%m/%d/%Y"),
            "postedTo": date.today().strftime("%m/%d/%Y"),
        }
        resp = requests.get(
            "https://api.sam.gov/opportunities/v2/search",
            params=params,
            timeout=30,
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

            pdf_url = None
            resource_links = opp.get("resourceLinks") or []
            for link in resource_links:
                if isinstance(link, str) and link.lower().endswith(".pdf"):
                    pdf_url = link
                    break
            if not pdf_url:
                pdf_url = opp.get("uiLink")

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

    for sol_id, pdf_url in newly_inserted:
        if pdf_url:
            print(f"[AUTO-TRIAGE] Queuing triage for {sol_id}")
            await asyncio.sleep(2)
            await _run_auto_triage(sol_id, pdf_url)


async def cron_deadline_monitor() -> None:
    """Daily 7:30 AM ET — alert admin when solicitation deadlines are within 72h."""
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
              AND phase_status NOT IN ('AWARDED', 'REJECTED', 'SUBMITTED')
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

            email_ar_followup_sent(admin_email, contract_number, agency, float(outstanding), days_out)

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
    """Daily 6:00 AM ET — pull recent federal IT award data from USASpending.gov."""
    print("[CRON] Running USASpending.gov IT services intelligence pull...")
    try:
        payload = {
            "filters": {
                "award_type_codes": ["A", "B", "C", "D"],
                "naics_codes": ["541511", "541519", "541512"],
                "time_period": [{
                    "start_date": (date.today() - timedelta(days=365)).strftime("%Y-%m-%d"),
                    "end_date": date.today().strftime("%Y-%m-%d"),
                }],
            },
            "fields": [
                "Award ID", "Recipient Name", "Award Amount",
                "Start Date", "Description", "Awarding Agency",
                "awarding_agency_name", "NAICS Code",
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


async def cron_outreach_followup() -> None:
    """Daily 9:00 AM ET — send Day 3 and Day 7 follow-ups for active outreach campaigns."""
    print("[CRON] Running outreach follow-up sequence...")
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        admin_domain = os.getenv("NEXTAUTH_URL", "https://www.burgergov.com")

        cur.execute("""
            SELECT oc.id, oc.quote_token, oc.opt_out_token, oc.solicitation_id, vp.contact_email,
                   vp.entity_name, sq.agency, oc.day0_sent_at, sq.response_deadline
            FROM outreach_campaigns oc
            JOIN vendor_prospects vp ON oc.prospect_id = vp.id
            JOIN solicitation_queue sq ON oc.solicitation_id = sq.solicitation_id
            WHERE oc.status = 'SENT'
              AND oc.day0_sent_at IS NOT NULL
              AND oc.day3_sent_at IS NULL
              AND oc.day0_sent_at <= NOW() - INTERVAL '3 days'
              AND sq.response_deadline > NOW()
        """)
        day3_rows = cur.fetchall()
        for row in day3_rows:
            campaign_id, token, opt_token, sol_id, email, name, agency, _, deadline = row
            if not email:
                continue
            deadline_str = deadline.strftime("%B %d, %Y") if deadline else "TBD"
            quote_url = f"{admin_domain}/quote/{token}"
            opt_out_url = f"{admin_domain}/optout/{opt_token}"
            try:
                email_outreach_followup1(email, name, sol_id, agency, quote_url, deadline_str, opt_out_url)
                cur.execute(
                    "UPDATE outreach_campaigns SET day3_sent_at=NOW(), status='SENT' WHERE id=%s::uuid",
                    (str(campaign_id),),
                )
                conn.commit()
            except Exception as e:
                print(f"[CRON] Follow-up D3 failed for campaign {campaign_id}: {e}")

        cur.execute("""
            SELECT oc.id, oc.quote_token, oc.opt_out_token, oc.solicitation_id, vp.contact_email,
                   vp.entity_name, sq.agency, sq.response_deadline
            FROM outreach_campaigns oc
            JOIN vendor_prospects vp ON oc.prospect_id = vp.id
            JOIN solicitation_queue sq ON oc.solicitation_id = sq.solicitation_id
            WHERE oc.status = 'SENT'
              AND oc.day3_sent_at IS NOT NULL
              AND oc.day7_sent_at IS NULL
              AND oc.day3_sent_at <= NOW() - INTERVAL '4 days'
              AND sq.response_deadline > NOW()
        """)
        day7_rows = cur.fetchall()
        for row in day7_rows:
            campaign_id, token, opt_token, sol_id, email, name, agency, deadline = row
            if not email:
                continue
            deadline_str = deadline.strftime("%B %d, %Y") if deadline else "TBD"
            quote_url = f"{admin_domain}/quote/{token}"
            opt_out_url = f"{admin_domain}/optout/{opt_token}"
            try:
                email_outreach_followup2(email, name, sol_id, agency, quote_url, deadline_str, opt_out_url)
                cur.execute(
                    "UPDATE outreach_campaigns SET day7_sent_at=NOW() WHERE id=%s::uuid",
                    (str(campaign_id),),
                )
                conn.commit()
            except Exception as e:
                print(f"[CRON] Follow-up D7 failed for campaign {campaign_id}: {e}")

        print(f"[CRON] Outreach follow-ups: {len(day3_rows)} Day-3, {len(day7_rows)} Day-7 sent.")
    except Exception as exc:
        print(f"[CRON ERROR] Outreach follow-up: {exc}")
    finally:
        if conn:
            conn.close()


async def cron_morning_brief_email() -> None:
    """Daily 8:30 AM ET — email the morning brief digest to the admin."""
    admin_email = os.getenv("ADMIN_EMAIL", "procurement@burgergov.com")
    print("[CRON] Sending morning brief email...")
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("""
            SELECT
              COALESCE(SUM(estimated_value), 0),
              COALESCE(SUM(estimated_value) * 0.15, 0)
            FROM solicitation_queue
            WHERE phase_status IN ('READY_FOR_SOURCING','SOURCING_IN_PROGRESS',
                                   'PRICING_PENDING','PROPOSAL_DRAFT','SUBMITTED')
        """)
        fin = cur.fetchone()
        pipeline_value = float(fin[0])
        projected_revenue = float(fin[1])

        cur.execute("""
            SELECT COALESCE(SUM(total_invoiced - total_received), 0)
            FROM active_contracts WHERE total_invoiced > total_received
        """)
        accounts_receivable = float(cur.fetchone()[0])

        cur.execute("""
            SELECT solicitation_id, agency, naics, estimated_value, triage_score, status
            FROM solicitation_queue
            WHERE created_at >= NOW() - INTERVAL '24 hours'
            ORDER BY triage_score DESC NULLS LAST
        """)
        new_opps = [{"solicitation_id": r[0], "agency": r[1], "naics": r[2],
                     "estimated_value": float(r[3]) if r[3] else None,
                     "triage_score": r[4], "status": r[5]} for r in cur.fetchall()]

        cur.execute("""
            SELECT COUNT(*) FROM vendor_registry
            WHERE onboarding_status IN ('DOCS_SUBMITTED','PENDING')
        """)
        pending_vendor_count = cur.fetchone()[0]

        cur.execute("""
            SELECT COUNT(*) FROM solicitation_queue WHERE phase_status = 'READY_FOR_SOURCING'
        """)
        pending_rfq_count = cur.fetchone()[0]
        pending_approvals = int(pending_vendor_count) + int(pending_rfq_count)

        cur.execute("""
            SELECT solicitation_id, agency, response_deadline
            FROM solicitation_queue
            WHERE response_deadline IS NOT NULL
              AND response_deadline > NOW()
              AND response_deadline <= NOW() + INTERVAL '73 hours'
              AND phase_status NOT IN ('AWARDED','REJECTED','SUBMITTED')
            ORDER BY response_deadline ASC
        """)
        now = datetime.utcnow()
        deadline_alerts = [{"solicitation_id": r[0], "agency": r[1],
                             "hours_left": max(0, int((r[2].replace(tzinfo=None) - now).total_seconds() / 3600))}
                            for r in cur.fetchall()]

        cur.execute("""
            SELECT
              COUNT(*) FILTER (WHERE status = 'SENT') as active_campaigns,
              COUNT(*) FILTER (WHERE status = 'SUBMITTED') as quotes_received
            FROM outreach_campaigns
            WHERE day0_sent_at >= NOW() - INTERVAL '30 days'
        """)
        outreach_row = cur.fetchone()
        outreach_summary = {
            "active_campaigns": int(outreach_row[0] or 0),
            "quotes_received": int(outreach_row[1] or 0),
        }

        cur.close()

        email_morning_brief(
            admin_email,
            new_opps=len(new_opps),
            pipeline_value=pipeline_value,
            projected_revenue=projected_revenue,
            accounts_receivable=accounts_receivable,
            pending_approvals=pending_approvals,
            deadline_alerts=deadline_alerts,
            outreach_summary=outreach_summary,
            top_opps=new_opps,
        )
        print("[CRON] Morning brief email sent.")
    except Exception as exc:
        print(f"[CRON ERROR] Morning brief email: {exc}")
    finally:
        if conn:
            conn.close()
