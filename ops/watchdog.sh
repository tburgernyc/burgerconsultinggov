#!/bin/bash
LOG_DIR="/backups"
ENV_FILE="/host-env/.env"
NET="t_burgernyc_hermes_net"
# Source the live DB password from .env — never hardcode it (rotated 2026-06-07).
POSTGRES_PASSWORD="$(grep -E '^POSTGRES_PASSWORD=' "$ENV_FILE" | cut -d= -f2-)"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

# Trim log if over 1MB
LOG="$LOG_DIR/watchdog.log"
if [ -f "$LOG" ] && [ "$(stat -c%s "$LOG" 2>/dev/null || echo 0)" -gt 1048576 ]; then
  tail -n 500 "$LOG" > "${LOG}.tmp" && mv "${LOG}.tmp" "$LOG"
fi

# Check backend
HEALTH=$(docker exec hermes_backend python3 -c \
  "import urllib.request; urllib.request.urlopen('http://localhost:8000/health',timeout=5); print('ok')" \
  2>/dev/null || echo "fail")
if [ "$HEALTH" != "ok" ]; then
  log "WARN: hermes_backend unhealthy — restarting"
  docker restart hermes_backend
fi

# Check frontend
STATUS=$(docker inspect --format '{{.State.Status}}' burger_frontend 2>/dev/null || echo "missing")
if [ "$STATUS" != "running" ]; then
  log "WARN: burger_frontend is $STATUS — restarting"
  docker start burger_frontend 2>/dev/null || \
  docker run -d --name burger_frontend --network "$NET" \
    --restart unless-stopped \
    --env-file "$ENV_FILE" \
    -e DATABASE_URL="postgresql://postgres:${POSTGRES_PASSWORD}@hermes_db:5432/postgres" \
    -e NEXTAUTH_URL=https://www.burgergov.com \
    -e NEXT_PUBLIC_API_URL=https://www.burgergov.com \
    -e INTERNAL_API_URL=http://hermes_backend:8000 \
    burger_frontend:latest
fi

# Check nginx
NGINX=$(docker inspect --format '{{.State.Status}}' hermes_nginx 2>/dev/null || echo "missing")
if [ "$NGINX" != "running" ]; then
  log "WARN: hermes_nginx is $NGINX — restarting"
  docker restart hermes_nginx
fi
