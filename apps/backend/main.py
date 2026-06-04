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
from db import MIGRATIONS_SQL, SCHEMA_SQL, _init_pool, _pool
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
    allow_headers=["*"],
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
