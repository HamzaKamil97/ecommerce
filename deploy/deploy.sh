#!/bin/bash
# Run on the VPS to (re)deploy the Medusa stack.
# Assumes: code synced to /root/ecommerce-mvp, .env.prod exists in /root/ecommerce-mvp/deploy/

set -euo pipefail
cd /root/ecommerce-mvp/deploy

echo "==> Building images..."
docker compose -f docker-compose.prod.yml --env-file .env.prod build

echo "==> Starting stack..."
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d

echo "==> Waiting for Medusa to be healthy..."
for i in $(seq 1 30); do
  if curl -sf http://localhost:9000/health >/dev/null 2>&1; then
    echo "Medusa is up."
    break
  fi
  echo "  [$i] not ready yet, sleeping 5s..."
  sleep 5
done

echo "==> Container status:"
docker compose -f docker-compose.prod.yml ps

echo "==> Done. Public URL: https://srv1162617.hstgr.cloud (Caddy will issue cert on first hit)"
echo "==> Admin: https://srv1162617.hstgr.cloud/app"
