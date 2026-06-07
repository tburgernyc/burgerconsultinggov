# Burger Consulting LLC — Project Handoff
**Last updated: 2026-06-04 | Git: `ddac047`**

This file is the single source of truth for resuming work on this project.
Read it top to bottom before touching any code.

---

## What This Project Is

An AI-powered federal IT contracting PMO for **Burger Consulting LLC** (EIN: 84-3113166).

BCG is a SAM-registered small business prime contractor. The business model:
1. Find federal IT contracts on SAM.gov automatically
2. AI-triage them against the **Zero-Float doctrine** (only FFP IT service contracts, no upfront capital, no mandatory clearances)
3. Discover and cold-outreach qualified IT subcontractors
4. Collect their quotes, AI-evaluate them, generate a BCG proposal
5. Submit the bid, win the contract, manage it through to payment

The software — called **Hermes** — automates the entire pipeline.

---

## Live System

| Item | Value |
|---|---|
| **Production URL** | https://www.burgergov.com |
| **Server IP** | `35.253.69.41` (GCP, `us-central1-b`) — reserved static as `hermes-static-ip` on 2026-06-04 |
| **Admin login** | `procurement@burgergov.com` |
| **Git repo** | `github.com/tburgernyc/burgerconsultinggov` |
| **Branch** | `main` |

> **GCP IP is now static.** Reserved as `hermes-static-ip` on 2026-06-04.
> IP `35.253.69.41` will not change on instance stop/restart. DNS is correct.

---

## Business Context

**NAICS codes:**
- `541511` — Custom Software & Web Development (Primary)
- `541519` — IT Services & Project Management
- `541512` — Systems Design & IT Infrastructure

**Zero-Float Doctrine:** Only pursue contracts that require zero upfront capital.
Accept: FFP/IDIQ IT service contracts, remote delivery OK, no mandatory SECRET+ clearance.
Reject: Hardware procurement primary, mandatory clearances for all staff, non-IT scope.

**Principal:** Timothy J. Burger — software engineer and federal contracting specialist, New York, NY.

---

## Running Containers (all `--restart unless-stopped`)

```bash
docker ps
```

| Container | Purpose | Port |
|---|---|---|
| `hermes_backend` | FastAPI + Gemini AI + APScheduler | 8000 (internal) |
| `hermes_db` | PostgreSQL 16 + pgvector | 5432 (localhost only) |
| `burger_frontend` | Next.js 16 production build | 3000 (internal) |
| `hermes_nginx` | Reverse proxy + SSL termination | 80, 443 (public) |
| `certbot_cron` | Let's Encrypt auto-renewal | — |
| `hermes_ops` | Ops watchdog | — |

All on Docker network: `t_burgernyc_hermes_net`

**Quick health check:**
```bash
docker exec hermes_nginx wget -qO- http://hermes_backend:8000/health
docker exec hermes_nginx wget -qO- http://burger_frontend:3000/ | grep -o '<title>[^<]*</title>'
```

---

## Stack

| Layer | Technology |
|---|---|
| Backend API | Python 3, FastAPI, Uvicorn |
| AI Engine | Google Gemini 2.5 Pro (via `google-genai`) |
| Email | Resend (domain `burgergov.com` — **verified**) |
| Database | PostgreSQL 16 + pgvector |
| Frontend | Next.js 16.2.6 (Turbopack), TypeScript |
| Auth | NextAuth.js v5 — two roles: `admin`, `vendor` |
| Proxy | Nginx 1.27 + Let's Encrypt SSL |
| Infra | Docker Compose on GCP `e2-medium` |
| Opportunity data | SAM.gov API (key active) + USASpending.gov |

---

## Project Structure

```
/home/t_burgernyc/
├── apps/
│   ├── backend/
│   │   ├── main.py          ← ENTIRE backend: DB schema, all 38 endpoints,
│   │   │                       5 cron jobs, 8 email templates, Gemini prompts
│   │   └── requirements.txt
│   └── frontend/
│       └── src/app/         ← 25 Next.js routes (see full list below)
├── nginx/
│   └── nginx.conf           ← Routing rules + SSL config
├── docker-compose.yml       ← Reference config (containers run manually now)
├── .env                     ← ALL secrets — never commit
└── CLAUDE.md                ← This file
```

---

## All Frontend Routes

**Public marketing:**
- `/` — Homepage
- `/about` — About BCG
- `/services` — Service lines (541511/541519/541512)
- `/capabilities` — Capabilities statement
- `/contact` — Contact + quick-ref credentials

**Admin portal** (login: `procurement@burgergov.com`):
- `/admin` — Morning brief dashboard
- `/admin/solicitations` — Full pipeline kanban
- `/admin/solicitations/[id]` — Solicitation detail
- `/admin/prospects` — **Prospect discovery & outreach pipeline** ← new
- `/admin/proposals` — AI-generated proposal drafts
- `/admin/vendors` — Vendor registry
- `/admin/vendors/[id]` — Vendor detail
- `/admin/contracts` — Active contract management
- `/admin/approvals` — Vendor approval queue
- `/admin/financials` — P&L, AR aging, pipeline forecast
- `/admin/intelligence` — USASpending competitive data

**Vendor portal** (subcontractor login):
- `/portal` — Login page
- `/portal/register` — Self-registration form
- `/portal/dashboard` — Vendor dashboard
- `/portal/rfq/[id]` — RFQ detail + quote submission
- `/portal/contracts/[id]` — Contract detail
- `/portal/invoices` — Invoice history
- `/portal/documents` — Document uploads
- `/portal/profile` — Profile management

**Public (no auth):**
- `/quote/[token]` — **Tokenized quote form for outreach prospects** ← new

---

## All Backend Endpoints (38 total)

**Pipeline:** `/api/triage/queue`, `/api/triage/analyze`, `/api/solicitations/list`,
`/api/sourcing/trigger/{id}`, `/api/sourcing/rfq-queue`, `/api/sourcing/approve/{id}`

**Prospect Outreach:** `/api/prospects/discover/{sol_id}`, `/api/outreach/launch/{sol_id}`,
`/api/outreach/campaigns/{sol_id}`, `/api/quote/{token}` (GET + POST)

**Quotes & Proposals:** `/api/pricing/analyze`, `/api/pricing/{sol_id}`,
`/api/quotes/submit`, `/api/quotes/{sol_id}`, `/api/quotes/evaluate/{sol_id}`,
`/api/proposals/generate`, `/api/proposals`, `/api/proposals/{sol_id}`

**Vendors:** `/api/vendors/register`, `/api/vendors`, `/api/vendors/{id}` (GET/PUT),
`/api/vendors/{id}/docs`

**Contracts:** `/api/contracts/active`, `/api/contracts/award`,
`/api/contracts/{id}/milestones` (GET/POST/PUT), `/api/contracts/{id}/invoice`,
`/api/contracts/{id}/payment`, `/api/subcontractor-searches`

**Admin:** `/api/admin/morning-brief`, `/api/admin/approval-queue`,
`/api/admin/vendor/approve/{id}`, `/api/admin/financials`, `/api/intelligence/awards`

**Misc:** `/health`

---

## Cron Jobs (all inside `hermes_backend` via APScheduler)

| Time (ET) | Job | What it does |
|---|---|---|
| 7, 11, 15, 19h | SAM.gov scan | Queries SAM.gov for new 541511/541519/541512 solicitations, auto-triages each PDF with Gemini |
| 6:00 AM | USASpending intelligence | Pulls recent IT award data for competitive pricing benchmarks |
| 7:30 AM | Deadline monitor | Emails alerts for solicitations with <48h remaining |
| 8:00 AM | Document expiry | Warns vendors with expiring insurance/certs, suspends lapsed vendors |
| 9:00 AM | Outreach follow-ups | Fires Day 3 and Day 7 follow-up emails to non-responding prospects |
| 5:00 PM | AR aging | Flags overdue agency invoices, emails follow-ups |

---

## Database Tables (13 total, all in `hermes_backend` schema)

`global_directives`, `solicitation_queue`, `vendor_registry`, `contract_milestones`,
`subcontractor_searches`, `active_contracts`, `vendor_quotes`, `approved_language`,
`documents`, `proposals`, `award_intelligence`, `ar_followups`,
`vendor_prospects` ← new, `outreach_campaigns` ← new

---

## Solicitation Pipeline Statuses

```
PENDING_TRIAGE → TRIAGE_COMPLETE → READY_FOR_SOURCING → SOURCING_IN_PROGRESS
→ PRICING_PENDING → PROPOSAL_DRAFT → SUBMITTED → AWARDED / REJECTED
```

---

## Subcontractor Outreach Workflow (new as of 2026-06-03)

1. Admin opens `/admin/prospects` → selects a `READY_FOR_SOURCING` solicitation
   (or clicks **Outreach →** directly from `/admin/solicitations`)
2. Clicks **Run Discovery** → Hermes queries:
   - SAM.gov Entity API (registered US IT vendors, NAICS-matched)
   - USASpending (past IT award winners = proven past performance)
3. Gemini scores each prospect 1–10 for fit vs. this specific solicitation
4. Admin selects prospects (pre-selected at ≥7) → clicks **Launch Outreach**
5. Hermes generates a plain-language SOW brief via Gemini
6. Day 0 email sent to each prospect with unique tokenized link (`/quote/{token}`)
7. Day 3 + Day 7 follow-ups fire automatically (9 AM cron)
8. Prospects submit quotes via `/quote/{token}` — no account required
9. Quotes feed into `/api/quotes/evaluate/{sol_id}` (AI ranking)
10. Winning quote → `/api/proposals/generate` → BCG bid submitted to agency

> **SAM.gov API limitation:** The public tier returns vendor names, NAICS,
> UEI, city/state — but NOT contact email. To get emails automatically,
> request elevated API access at sam.gov/content/entity-api.
> Until then, emails on SAM-sourced prospects must be added manually.

---

## Environment Variables (in `/home/t_burgernyc/.env`)

| Variable | Status | Notes |
|---|---|---|
| `GEMINI_API_KEY` | ✅ Active | Gemini 2.5 Pro |
| `RESEND_API_KEY` | ✅ Active | Domain `burgergov.com` **verified** |
| `SAM_API_KEY` | ✅ Active | `SAM-80f23dff-...` — live as of June 3 |
| `DATABASE_URL` | ✅ Active | Points to `hermes_db` container |
| `NEXTAUTH_SECRET` | ✅ Active | |
| `BACKEND_ADMIN_TOKEN` | ✅ Active | Used by Next.js proxy to authenticate admin API calls |
| `CAGE_CODE` | ⏳ `PENDING` | Update once assigned via SAM.gov |
| `SAM_STATUS` | ⏳ `REGISTRATION_IN_PROGRESS` | Update once SAM.gov registration completes |

---

## How to Rebuild Containers After Code Changes

**Backend** (after editing `apps/backend/main.py`):
```bash
docker stop hermes_backend && docker rm hermes_backend
docker build -t t_burgernyc-backend:latest ./apps/backend
docker compose up -d backend
```

**Frontend** (after editing any frontend file):
```bash
# Always run lint first
cd apps/frontend && npm run lint

docker rm -f burger_frontend
docker build -t burger_frontend:latest ./apps/frontend
docker run -d \
  --name burger_frontend \
  --network t_burgernyc_hermes_net \
  --restart unless-stopped \
  --env-file /home/t_burgernyc/.env \
  -e DATABASE_URL="postgresql://postgres:${POSTGRES_PASSWORD}@hermes_db:5432/postgres" \
  -e NEXTAUTH_URL=https://www.burgergov.com \
  -e NEXT_PUBLIC_API_URL=https://www.burgergov.com \
  -e INTERNAL_API_URL=http://hermes_backend:8000 \
  burger_frontend:latest
```

---

## Git Workflow

```bash
# Always lint before committing frontend changes
cd apps/frontend && npm run lint

# Commit
git add <files>
git commit -m "description"
git push

# Then rebuild whichever container changed
```

> **Note:** `docker compose up -d backend` works for the backend because it's
> tracked by compose. The frontend container was started manually (`docker run`)
> so it must be rebuilt manually — `docker compose up frontend` won't work.

---

## Known Gotchas

1. **GCP hairpinning** — You cannot `curl https://www.burgergov.com` from within
   the GCP VM itself. It will always time out. Test via internal Docker network:
   `docker exec hermes_nginx wget -qO- http://burger_frontend:3000/`

2. **DNS was wrong** (fixed June 3) — DNS was pointing to `35.225.102.228` (old IP).
   Corrected to `34.41.27.10`. Reserve the IP as static in GCP to prevent recurrence.

3. **Frontend must be rebuilt manually** — See rebuild command above. `docker compose`
   does not manage the frontend container in the current setup.

4. **TypeScript errors fail the Docker build** — `npm run build` runs inside the
   Dockerfile. Always run `npm run lint` locally first. TypeScript errors will
   cause `docker build` to fail.

5. **SAM.gov `postedTo` is required** — The opportunities search API requires both
   `postedFrom` AND `postedTo`. Missing `postedTo` returns a 400 error silently.

6. **Two proxy routes in Next.js:**
   - `/api/proxy/[...path]` — admin-only, injects `X-Admin-Token`
   - `/api/vendor/[...path]` — vendor + admin, injects `X-Vendor-Id`
   Use `/api/proxy` for all admin dashboard API calls.

---

## Remaining Work (prioritized)

### Must Do (external — you have to do these)
- [x] **Reserve GCP IP as static** — Done 2026-06-04, reserved as `hermes-static-ip` (`35.253.69.41`)
- [ ] **Request SAM.gov elevated API access** — sam.gov/content/entity-api — unlocks contact email/phone on discovered prospects
- [ ] **Update `CAGE_CODE` in `.env`** once assigned, then rebuild frontend

### Should Build Next
- [ ] **Manual prospect entry UI** — form to add a prospect by hand (LinkedIn find, referral)
- [ ] **Proposal PDF/Word export** — proposals are JSON in DB, no formatted document export yet
- [ ] **Opt-out / unsubscribe link** in outreach emails (CAN-SPAM compliance)
- [ ] **Bid deadline reminder** — alert when a solicitation deadline is <48h and status isn't `SUBMITTED`
- [ ] **Subcontract agreement generation** — Gemini-drafted subcontract + e-signature flow for winning vendor

### Nice to Have
- [ ] Proposal PDF export to formatted Word/PDF for agency submission
- [ ] SAM.gov submission integration (no public API exists — would be a browser automation)
- [ ] LinkedIn prospect sourcing (requires Sales Navigator API, ~$800/mo)
