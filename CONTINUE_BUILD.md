# Burger Consulting LLC — Build Continuation Guide
**Last updated: 2026-05-29**
**Status: ALL 17 PHASES COMPLETE — 3 containers running**

---

## Running Containers (All Persistent — Survive Reboots)

| Container | Service | Port | Status |
|---|---|---|---|
| `hermes_db` | PostgreSQL 16 + pgvector | 5432 | RUNNING |
| `hermes_backend` | FastAPI + Gemini AI + Resend + APScheduler | 8000 | RUNNING |
| `burger_frontend` | Next.js 16 (production build) | 3000 | RUNNING |

All three are on network: `burger_consulting_hermes_net`

Check status:
```bash
docker ps
curl http://localhost:8000/health
curl http://localhost:3000
```

---

## What Was Completed This Session (Phases 15–17)

### Phase 15 — Resend Email Templates ✅
All 5 email templates wired into `apps/backend/main.py`:

| Template | Trigger |
|---|---|
| `vendor_onboarding_received` | `POST /api/vendors/register` |
| `vendor_portal_access_granted` | `POST /api/admin/vendor/approve/{id}` |
| `rfq_dispatch` | `POST /api/sourcing/approve/{rfq_id}` — sends to all portal-active vendors |
| `insurance_expiry_warning` | Daily 8AM cron (30-day and 7-day alerts) |
| `payment_confirmed` | `PUT /api/contracts/{id}/payment` |

### Phase 16 — Cron Jobs ✅
APScheduler running inside the FastAPI process (no separate container needed):
- **7:00 AM ET** — `cron_sam_scan()`: Queries SAM.gov API for new NAICS 561210/561720/561730 opportunities. Activates automatically when `SAM_API_KEY` is set in `.env`.
- **8:00 AM ET** — `cron_document_expiry_monitor()`: Sends expiry warning emails, suspends portal access for lapsed vendors.

### Phase 17 — Frontend Docker Container ✅
`burger_frontend` container running on port 3000. Production Next.js build.

---

## ONE REMAINING ACTION — Resend Domain Verification

The Resend API key is live and making calls, but emails are blocked until the domain is verified.

**Error seen in logs:** `[EMAIL ERROR] The burgergov.com domain is not verified`

**How to fix:**
1. Log into https://resend.com/domains
2. Add domain: `burgergov.com`
3. Add the DNS records Resend provides to your domain registrar
4. Once verified, all 5 email templates will fire automatically

Until the domain is verified, email errors are logged but do NOT break any API responses.

---

## Environment Variables Status

| Variable | Status | Notes |
|---|---|---|
| `POSTGRES_PASSWORD` | ✅ Set | `burger_secure_2026!` |
| `GEMINI_API_KEY` | ✅ Set | Active |
| `NEXTAUTH_SECRET` | ✅ Set | Active |
| `RESEND_API_KEY` | ✅ Set | Active — domain verification needed |
| `SAM_API_KEY` | ⏳ Placeholder | Add real key to activate 7AM cron scan |
| `CAGE_CODE` | ⏳ Pending | Update after SAM.gov activation |

---

## How to Restart All Containers After Reboot

All containers have `--restart unless-stopped`. They will restart automatically after reboots.

If you ever need to restart manually:
```bash
docker start hermes_db hermes_backend burger_frontend
```

If you need to rebuild after code changes:
```bash
# Backend (after editing main.py or requirements.txt)
docker stop hermes_backend && docker rm hermes_backend
docker build -t t_burgernyc-backend:latest /home/t_burgernyc/apps/backend
docker run -d --name hermes_backend --network burger_consulting_hermes_net \
  --restart unless-stopped --env-file /home/t_burgernyc/.env \
  -e POSTGRES_PASSWORD=burger_secure_2026! -e DB_HOST=hermes_db \
  -p 8000:8000 t_burgernyc-backend:latest

# Frontend (after editing frontend code)
docker stop burger_frontend && docker rm burger_frontend
docker build -t burger_frontend:latest /home/t_burgernyc/apps/frontend
docker run -d --name burger_frontend --network burger_consulting_hermes_net \
  --restart unless-stopped --env-file /home/t_burgernyc/.env \
  -e DATABASE_URL="postgresql://postgres:burger_secure_2026!@hermes_db:5432/postgres" \
  -e NEXTAUTH_URL=http://localhost:3000 \
  -e NEXT_PUBLIC_API_URL=http://localhost:8000 \
  -p 3000:3000 burger_frontend:latest
```

---

## Critical Files

| File | Purpose |
|---|---|
| `apps/backend/main.py` | Full FastAPI backend — all 7 tables, all endpoints, 5 email templates, 2 cron jobs |
| `apps/frontend/src/app/` | All 22 Next.js routes |
| `apps/frontend/src/lib/auth.ts` | NextAuth.js v5 config (admin + vendor roles) |
| `docker-compose.yml` | Reference config (not currently used — containers run manually) |
| `.env` | All environment variables |

---

## System Is Live When All These Pass

```bash
# All 3 containers up
docker ps | grep -E "hermes_db|hermes_backend|burger_frontend"

# Backend healthy + DB connected
curl http://localhost:8000/api/admin/morning-brief

# Frontend serving
curl -o /dev/null -w "%{http_code}" http://localhost:3000

# Cron scheduler running
docker logs hermes_backend | grep "CRON.*Scheduler started"
```
