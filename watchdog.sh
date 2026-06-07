#!/bin/bash
# Health watchdog — runs every 5 minutes via cron.
# Checks the /health endpoint and restarts containers that are down.
# Logs to /home/t_burgernyc/watchdog.log

LOG="/home/t_burgernyc/watchdog.log"
NET="t_burgernyc_hermes_net"
ENV_FILE="/home/t_burgernyc/.env"
# Source the live DB password from .env — never hardcode it (rotated 2026-06-07).
POSTGRES_PASSWORD="$(grep -E '^POSTGRES_PASSWORD=' "$ENV_FILE" | cut -d= -f2-)"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG"; }

# Keep log under 1MB
if [ -f "$LOG" ] && [ "$(stat -c%s "$LOG" 2>/dev/null || echo 0)" -gt 1048576 ]; then
  tail -n 500 "$LOG" > "${LOG}.tmp" && mv "${LOG}.tmp" "$LOG"
fi

# Check backend health via internal network
HEALTH=$(docker exec hermes_backend python3 -c \
  "import urllib.request; r=urllib.request.urlopen('http://localhost:8000/health',timeout=5); print('ok')" \
  2>/dev/null || echo "fail")

if [ "$HEALTH" != "ok" ]; then
  log "WARN: hermes_backend unhealthy — restarting"
  docker restart hermes_backend >> "$LOG" 2>&1
fi

# Check frontend is up
FRONTEND=$(docker inspect --format '{{.State.Status}}' burger_frontend 2>/dev/null || echo "missing")
if [ "$FRONTEND" != "running" ]; then
  log "WARN: burger_frontend is $FRONTEND — restarting"
  docker start burger_frontend >> "$LOG" 2>&1 || \
  docker run -d --name burger_frontend --network "$NET" \
    --restart unless-stopped \
    --env-file "$ENV_FILE" \
    -e DATABASE_URL="postgresql://postgres:${POSTGRES_PASSWORD}@hermes_db:5432/postgres" \
    -e NEXTAUTH_URL=https://www.burgergov.com \
    -e NEXT_PUBLIC_API_URL=https://www.burgergov.com \
    -e INTERNAL_API_URL=http://hermes_backend:8000 \
    burger_frontend:latest >> "$LOG" 2>&1
fi

# Check nginx
NGINX=$(docker inspect --format '{{.State.Status}}' hermes_nginx 2>/dev/null || echo "missing")
if [ "$NGINX" != "running" ]; then
  log "WARN: hermes_nginx is $NGINX — restarting"
  docker restart hermes_nginx >> "$LOG" 2>&1
fi

# Check DB
DB=$(docker inspect --format '{{.State.Health.Status}}' hermes_db 2>/dev/null || echo "missing")
if [ "$DB" != "healthy" ]; then
  log "WARN: hermes_db is $DB"
fi
