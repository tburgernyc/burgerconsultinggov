import os
import psycopg2
from contextlib import asynccontextmanager

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from cron import (
    cron_ar_aging,
    cron_deadline_monitor,
    cron_document_expiry_monitor,
    cron_morning_brief_email,
    cron_outreach_followup,
    cron_sam_scan,
    cron_usaspending_intelligence,
)
from auth import _pwd_context
from db import MIGRATIONS_SQL, SCHEMA_SQL, SCHEMA_VERSION, _init_pool, _pool
from routers import (
    admin,
    contracts,
    financials,
    intelligence,
    pricing,
    proposals,
    prospects,
    quotes,
    solicitations,
    sourcing,
    triage,
    vendors,
)


def _bootstrap_admin(cur, conn) -> None:
    """Seed the admin credential into admin_users as a bcrypt hash if absent (P1-3).

    ADMIN_PASSWORD is a one-time bootstrap secret: it is hashed into the DB on first
    boot and should then be removed from the environment. We never store it plaintext
    and the login path compares against the hash, not the env var."""
    admin_email = os.getenv("ADMIN_EMAIL", "procurement@burgergov.com")
    bootstrap_pw = os.getenv("ADMIN_PASSWORD", "")
    cur.execute("SELECT 1 FROM admin_users WHERE email=%s", (admin_email,))
    if cur.fetchone():
        return
    if not bootstrap_pw:
        print(f"[ADMIN] No admin row for {admin_email} and ADMIN_PASSWORD unset — "
              f"set ADMIN_PASSWORD once to seed the hashed credential.")
        return
    cur.execute(
        "INSERT INTO admin_users (email, name, password_hash) VALUES (%s, %s, %s) "
        "ON CONFLICT (email) DO NOTHING",
        (admin_email, "Timothy J. Burger", _pwd_context.hash(bootstrap_pw)),
    )
    conn.commit()
    print(f"[ADMIN] Seeded hashed admin credential for {admin_email}. "
          f"You may now remove ADMIN_PASSWORD from the environment.")


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
        # Fail-loud, idempotent bootstrap (P2-7). Every statement is IF NOT EXISTS /
        # ADD COLUMN IF NOT EXISTS, so a real error means a genuine schema problem and
        # must abort startup rather than be silently swallowed.
        for label, block in (("SCHEMA", SCHEMA_SQL), ("MIGRATIONS", MIGRATIONS_SQL)):
            for statement in block.strip().split(';'):
                stmt = statement.strip()
                if not stmt:
                    continue
                try:
                    cur.execute(stmt)
                    conn.commit()
                except Exception as exc:
                    conn.rollback()
                    raise RuntimeError(f"{label} migration failed: {exc}\nStatement: {stmt[:200]}") from exc
        cur.execute(
            "INSERT INTO schema_version (version) VALUES (%s) ON CONFLICT (version) DO NOTHING",
            (SCHEMA_VERSION,),
        )
        conn.commit()
        _bootstrap_admin(cur, conn)
        cur.close()
        conn.close()
    except Exception as e:
        # Abort startup: a half-migrated DB is more dangerous than a down service.
        raise RuntimeError(f"DB init failed: {e}") from e

    scheduler = AsyncIOScheduler(timezone="America/New_York")
    scheduler.add_job(cron_sam_scan, CronTrigger(hour="7,11,15,19", minute=0))
    scheduler.add_job(cron_document_expiry_monitor, CronTrigger(hour=8, minute=0))
    scheduler.add_job(cron_deadline_monitor, CronTrigger(hour=7, minute=30))
    scheduler.add_job(cron_usaspending_intelligence, CronTrigger(hour=6, minute=0))
    scheduler.add_job(cron_ar_aging, CronTrigger(hour=17, minute=0))
    scheduler.add_job(cron_outreach_followup, CronTrigger(hour=9, minute=0))
    scheduler.add_job(cron_morning_brief_email, CronTrigger(hour=8, minute=30))
    scheduler.start()
    print("[CRON] Scheduler started — SAM scan 7/11/15/19h, expiry 8h, deadline 7:30h, intelligence 6h, AR 17h, outreach followup 9h, brief 8:30h ET")

    yield

    scheduler.shutdown()
    _pool.closeall()


app = FastAPI(title="Hermes IT Procurement Engine — Burger Consulting LLC", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://www.burgergov.com", "https://burgergov.com"],
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    # Narrowed from "*" to the headers the proxies actually send (P4-2).
    allow_headers=["Content-Type", "X-Admin-Token", "X-Gateway-Token", "X-Vendor-Token"],
)

for _router in [
    triage.router,
    solicitations.router,
    sourcing.router,
    pricing.router,
    vendors.router,
    quotes.router,
    proposals.router,
    contracts.router,
    admin.router,
    intelligence.router,
    financials.router,
    prospects.router,
]:
    app.include_router(_router)


@app.get("/health")
async def health():
    return {"status": "ok", "entity": "BURGER CONSULTING LLC", "ein": "84-3113166"}
