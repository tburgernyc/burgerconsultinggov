# Burger Consulting Gov — Hermes Cognitive Engine

An AI-powered government contract solicitation triage system for Burger Consulting LLC. Hermes automatically screens SAM.gov solicitations against the **Zero-Float doctrine** — rejecting contracts that require upfront capital, Davis-Bacon payroll, security clearances, or billing structures incompatible with Firm-Fixed-Price execution.

## What it does

1. Submit a government solicitation PDF URL via the API
2. Hermes downloads the PDF and runs it through **Google Gemini 2.5 Pro**
3. Gemini scores the solicitation across three dimensions: financial risk, compliance requirements, and scope fit
4. Solicitations scoring 8 or higher are marked **Ready for Sourcing**; the rest are **Rejected**
5. A Next.js Kanban dashboard displays all results in real time

## Stack

| Layer | Tech |
|---|---|
| Backend API | Python, FastAPI |
| AI Engine | Google Gemini 2.5 Pro |
| Database | PostgreSQL 16 + pgvector |
| Frontend | Next.js 14, TypeScript |
| Infrastructure | Docker Compose |

## Project structure

```
├── apps/
│   ├── backend/          # FastAPI triage engine (Gemini AI + PostgreSQL)
│   └── frontend/         # Next.js Kanban dashboard
├── docker-compose.yml    # Orchestrates DB and backend containers
└── .env.example          # Required environment variables
```

## Getting started

**1. Clone and configure**
```bash
git clone https://github.com/tburgernyc/burgerconsultinggov.git
cd burgerconsultinggov
cp .env.example .env
# Fill in POSTGRES_PASSWORD and GOOGLE_API_KEY in .env
```

**2. Start the backend and database**
```bash
docker compose up -d --build
```

**3. Start the frontend**
```bash
cd apps/frontend
npm install
npm run dev
```

**4. Submit a solicitation for triage**
```bash
curl -X POST "http://localhost:8000/api/triage/analyze" \
  -H "Content-Type: application/json" \
  -d '{"solicitation_id": "SAM-2026-001", "pdf_url": "https://your-sam-gov-pdf-url.pdf"}'
```

**5. View the dashboard**

Open [http://localhost:3000](http://localhost:3000) to see the Kanban board.

## API endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Health check |
| GET | `/api/solicitations/list` | List all triaged solicitations |
| POST | `/api/triage/analyze` | Submit a solicitation PDF for AI triage |

## Zero-Float doctrine

Hermes rejects any solicitation that requires:
- Upfront capital (heavy equipment purchases, material mobilization)
- Davis-Bacon weekly certified payroll
- Personnel or facility security clearances
- Subcontracting restrictions that limit execution flexibility
- Non-FFP billing structures incompatible with SCA execution
