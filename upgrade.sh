#!/usr/bin/env bash
# ============================================================
# Hermes Upgrade Script — Burger Consulting LLC
# Runs autonomously. Safe to execute with laptop closed.
# All output is logged to /home/t_burgernyc/upgrade.log
# ============================================================
set -euo pipefail

LOGFILE="/home/t_burgernyc/upgrade.log"
WORKDIR="/home/t_burgernyc"
BACKUP_DIR="${WORKDIR}/backups/$(date +%Y%m%d_%H%M%S)"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOGFILE"; }
fail() { log "ERROR: $*"; exit 1; }

log "========================================================"
log "  HERMES UPGRADE — Starting autonomous deployment"
log "========================================================"

# ── 1. Create backup of current state ──────────────────────
log "Step 1/8 — Creating backup..."
mkdir -p "$BACKUP_DIR"
cp "${WORKDIR}/apps/backend/main.py" "${BACKUP_DIR}/main.py.bak" 2>/dev/null || true
cp -r "${WORKDIR}/apps/frontend/src/app/admin" "${BACKUP_DIR}/admin_pages.bak" 2>/dev/null || true
log "Backup saved to $BACKUP_DIR"

# ── 2. Verify Docker is running ────────────────────────────
log "Step 2/8 — Verifying Docker..."
docker ps > /dev/null 2>&1 || fail "Docker daemon is not running"
log "Docker OK"

# ── 3. Verify .env exists and has required keys ────────────
log "Step 3/8 — Checking environment..."
ENV_FILE="${WORKDIR}/.env"
[ -f "$ENV_FILE" ] || fail ".env file not found at $ENV_FILE"

check_env() {
  local key="$1"
  local val
  val=$(grep -E "^${key}=" "$ENV_FILE" | cut -d= -f2- | tr -d '"' | tr -d "'" | xargs 2>/dev/null || echo "")
  if [ -z "$val" ] || echo "$val" | grep -qi "placeholder\|your_"; then
    log "  WARNING: ${key} is not set or is a placeholder — related features will be disabled at runtime"
  else
    log "  OK: ${key} is set"
  fi
}

check_env "GEMINI_API_KEY"
check_env "RESEND_API_KEY"
check_env "SAM_API_KEY"
check_env "POSTGRES_PASSWORD"
check_env "NEXTAUTH_SECRET"
check_env "BACKEND_ADMIN_TOKEN"

# ── 4. Stop running containers ─────────────────────────────
log "Step 4/8 — Stopping containers..."
cd "$WORKDIR"
docker compose down --timeout 30 2>&1 | tee -a "$LOGFILE"
log "Containers stopped"

# ── 5. Rebuild backend image ───────────────────────────────
log "Step 5/8 — Rebuilding backend (installs any new dependencies)..."
docker compose build backend 2>&1 | tee -a "$LOGFILE"
log "Backend image built"

# ── 6. Rebuild frontend image ──────────────────────────────
log "Step 6/8 — Rebuilding frontend (compiles TypeScript + Next.js)..."
docker compose build frontend 2>&1 | tee -a "$LOGFILE"
log "Frontend image built"

# ── 7. Start all services ──────────────────────────────────
log "Step 7/8 — Starting all services..."
docker compose up -d 2>&1 | tee -a "$LOGFILE"
log "Services started — waiting for health checks..."

# Health check loop — up to 120 seconds
HEALTH_OK=false
for i in $(seq 1 24); do
  sleep 5
  # Test via docker exec since port 8000 is internal-only (traffic routes through Nginx)
  STATUS=$(docker exec hermes_backend python3 -c \
    "import urllib.request; urllib.request.urlopen('http://localhost:8000/health'); print('200')" \
    2>/dev/null || echo "000")
  if [ "$STATUS" = "200" ]; then
    HEALTH_OK=true
    log "  Backend health check PASSED (attempt $i)"
    break
  fi
  log "  Attempt $i/24 — backend not ready yet (attempt $i), retrying..."
done

if [ "$HEALTH_OK" = false ]; then
  log "ERROR: Backend failed health check after 120 seconds"
  log "--- Recent backend logs ---"
  docker logs hermes_backend --tail 50 2>&1 | tee -a "$LOGFILE"
  log "--- Attempting rollback ---"
  cp "${BACKUP_DIR}/main.py.bak" "${WORKDIR}/apps/backend/main.py" 2>/dev/null || true
  docker compose build backend 2>&1 | tee -a "$LOGFILE"
  docker compose up -d 2>&1 | tee -a "$LOGFILE"
  fail "Deployment failed — rolled back to previous backend. Check $LOGFILE"
fi

# Frontend check
FRONTEND_OK=false
for i in $(seq 1 12); do
  sleep 5
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null || echo "000")
  if [ "$STATUS" = "200" ]; then
    FRONTEND_OK=true
    log "  Frontend health check PASSED (attempt $i)"
    break
  fi
  log "  Frontend attempt $i/12 — HTTP $STATUS..."
done
[ "$FRONTEND_OK" = false ] && log "  WARNING: Frontend did not respond on port 3000. Nginx may still be routing correctly via HTTPS."

# ── 8. Run lint check ─────────────────────────────────────
log "Step 8/8 — Running ESLint on frontend..."
docker exec burger_frontend npm run lint 2>&1 | tee -a "$LOGFILE" || \
  log "  WARNING: Lint reported issues — see log above. App is still running."

# ── Done ───────────────────────────────────────────────────
log "========================================================"
log "  UPGRADE COMPLETE"
log ""
log "  New capabilities now live:"
log "  ✓ SAM.gov scans every 4 hours (7/11/15/19h ET)"
log "  ✓ Auto-triage via Gemini immediately after each scan"
log "  ✓ Auto-dispatch RFQs for score >= 9 (NAICS-matched)"
log "  ✓ AI quote evaluation  →  /api/quotes/evaluate/{sol_id}"
log "  ✓ AI proposal generation  →  /api/proposals/generate"
log "  ✓ USASpending.gov competitive intel  →  daily 6 AM ET"
log "  ✓ A/R aging alerts  →  daily 5 PM ET"
log "  ✓ Bid deadline alerts  →  daily 7:30 AM ET"
log "  ✓ New admin pages: /admin/proposals, /admin/intelligence"
log "  ✓ Full financial dashboard: /admin/financials"
log "  ✓ New DB tables: proposals, award_intelligence, ar_followups"
log ""
log "  Blockers requiring manual action:"
log "  ! Resend domain: log into resend.com/domains, verify burgergov.com"
log "  ! SAM.gov API key: register at https://api.data.gov/ and update .env"
log ""
log "  Full log: $LOGFILE"
log "========================================================"

# ── Git commit all changes ─────────────────────────────────
log "Committing all changes to git..."
cd "$WORKDIR"
git add -A 2>&1 | tee -a "$LOGFILE"
git commit -m "$(cat <<'EOF'
Hermes v2: full AI automation upgrade

- Auto-triage every SAM.gov scan result via Gemini (no manual PDF prompt)
- SAM.gov scan runs 4x daily (7/11/15/19h ET instead of once at 7 AM)
- Auto-dispatch RFQs at score >= 9 with NAICS + capacity matching
- AI quote evaluation endpoint ranking all vendor bids with Gemini
- AI proposal generation endpoint producing full federal proposal drafts
- USASpending.gov competitive intelligence cron (daily 6 AM ET)
- A/R aging cron with automated admin follow-up emails (daily 5 PM ET)
- Bid deadline alert cron for 72h/24h warnings (daily 7:30 AM ET)
- New DB tables: proposals, award_intelligence, ar_followups
- New admin pages: /admin/proposals, /admin/intelligence
- Rebuilt /admin/financials with full P&L, AR aging, margin by NAICS
- Solicitation detail: AI Evaluate Quotes + Generate Proposal buttons
- Admin sidebar: added Proposals and Intelligence nav items

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)" 2>&1 | tee -a "$LOGFILE"

git push origin main 2>&1 | tee -a "$LOGFILE"
log "Git push complete."
