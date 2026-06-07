# Burger Consulting LLC — Build Continuation Guide
**Last updated: 2026-05-31**
**Status: ALL 17 PHASES COMPLETE + NAICS/PROXY FIXES — 5 containers running**

---

## Running Containers (All Persistent — Survive Reboots)

| Container | Service | Port | Status |
|---|---|---|---|
| `hermes_db` | PostgreSQL 16 + pgvector | 5432 | RUNNING |
| `hermes_backend` | FastAPI + Gemini AI + Resend + APScheduler | 8000 | RUNNING |
| `burger_frontend` | Next.js 16 (production build) | 3000 | RUNNING |
| `hermes_nginx` | Nginx reverse proxy + SSL termination | 80/443 | RUNNING |
| `certbot_cron` | Let's Encrypt auto-renewal | — | RUNNING |

All containers on network: `t_burgernyc_hermes_net`

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

### Phase 18 — NAICS Correction + Vendor Portal Proxy ✅ (2026-05-31)
Fixed systemic NAICS mismatch: all 541xxx IT codes replaced with 561210/561720/561730
facilities codes across backend (SAM.gov scan, USASpending intelligence, DB schema,
Gemini triage/quote/proposal prompts). Added `/api/vendor/[...path]` authenticated
proxy route so portal pages call the backend through session-validated Next.js middleware
instead of directly via `NEXT_PUBLIC_API_URL`.

---

## REMAINING ACTIONS

### Action 1 — Resend Domain Verification (external — you must do this)
The Resend API key is live but emails are blocked until the domain is verified.

**Error seen in logs:** `[EMAIL ERROR] The burgergov.com domain is not verified`

1. Log into https://resend.com/domains
2. Add domain: `burgergov.com`
3. Add the DNS records Resend provides to your domain registrar
4. Once verified, all 5 email templates will fire automatically

### Action 2 — SAM.gov API Key (external — you must do this)
Add real `SAM_API_KEY` to `.env` to activate the 7AM SAM.gov cron scan for NAICS 561210/561720/561730 opportunities.
Without this, the morning brief won't populate with new solicitations from SAM.

### Action 3 — CAGE Code (external — pending SAM.gov activation)
Update `CAGE_CODE` in `.env` once assigned via SAM.gov registration.

Until the domain is verified, email errors are logged but do NOT break any API responses.

---

## Environment Variables Status

| Variable | Status | Notes |
|---|---|---|
| `POSTGRES_PASSWORD` | ✅ Set | Stored in `.env` only — never in docs (rotated 2026-06-07) |
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
  -e POSTGRES_PASSWORD=${POSTGRES_PASSWORD} -e DB_HOST=hermes_db \
  -p 8000:8000 t_burgernyc-backend:latest

# Frontend (after editing frontend code)
docker stop burger_frontend && docker rm burger_frontend
docker build -t burger_frontend:latest /home/t_burgernyc/apps/frontend
docker run -d --name burger_frontend --network burger_consulting_hermes_net \
  --restart unless-stopped --env-file /home/t_burgernyc/.env \
  -e DATABASE_URL="postgresql://postgres:${POSTGRES_PASSWORD}@hermes_db:5432/postgres" \
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
