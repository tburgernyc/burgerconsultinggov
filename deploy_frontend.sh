#!/bin/bash
# Zero-downtime frontend deploy.
# Builds new image, starts canary alongside old container,
# waits for health, then swaps — nginx never loses a backend.
set -euo pipefail

NET="t_burgernyc_hermes_net"
ENV_FILE="/home/t_burgernyc/.env"
APP_DIR="/home/t_burgernyc/apps/frontend"
IMAGE="burger_frontend:latest"
OLD="burger_frontend"
NEW="burger_frontend_new"

# Clean up any leftover canary from a previous failed deploy
docker rm -f "$NEW" 2>/dev/null || true

echo "[deploy] Building image..."
docker build -t "$IMAGE" "$APP_DIR"

echo "[deploy] Starting canary container..."
docker run -d --name "$NEW" --network "$NET" \
  --env-file "$ENV_FILE" \
  -e DATABASE_URL="postgresql://postgres:burger_secure_2026!@hermes_db:5432/postgres" \
  -e NEXTAUTH_URL=https://www.burgergov.com \
  -e NEXT_PUBLIC_API_URL=https://www.burgergov.com \
  -e INTERNAL_API_URL=http://hermes_backend:8000 \
  "$IMAGE"

echo "[deploy] Waiting for canary to be ready..."
READY=0
for i in $(seq 1 20); do
  if docker exec "$NEW" node -e \
    "require('http').get('http://localhost:3000/',r=>process.exit(r.statusCode<500?0:1)).on('error',()=>process.exit(1))" \
    2>/dev/null; then
    READY=1
    break
  fi
  echo "  ...attempt $i/20"
  sleep 3
done

if [ "$READY" -eq 0 ]; then
  echo "[deploy] FAILED — canary never became healthy. Rolling back."
  docker rm -f "$NEW"
  exit 1
fi

echo "[deploy] Canary healthy. Swapping..."
docker stop "$OLD" 2>/dev/null || true
docker rm "$OLD"
docker rename "$NEW" "$OLD"

# Graceful reload so nginx re-resolves the container hostname
docker exec hermes_nginx nginx -s reload

echo "[deploy] Done. burgergov.com is serving the new build."
