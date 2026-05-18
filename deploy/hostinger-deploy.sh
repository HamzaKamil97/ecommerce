#!/usr/bin/env bash
# deploy/hostinger-deploy.sh
#
# Deploys the production stack to Hostinger VPS via the Docker Manager API.
# Reads docker-compose.prod.yml content and POSTs it.
#
# Required env:
#   HOSTINGER_API_TOKEN
#   HOSTINGER_VPS_ID    (1162617 for our VPS)
#   GITHUB_USERNAME     (substituted into compose ghcr.io image refs)
#   POSTGRES_PASSWORD, JWT_SECRET, COOKIE_SECRET, NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY,
#   STORE_CORS, ADMIN_CORS, AUTH_CORS

set -euo pipefail

: "${HOSTINGER_API_TOKEN:?required}"
: "${HOSTINGER_VPS_ID:?required}"
: "${GITHUB_USERNAME:?required}"
: "${POSTGRES_PASSWORD:?required}"
: "${JWT_SECRET:?required}"
: "${COOKIE_SECRET:?required}"
: "${NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY:=pk_placeholder}"

API="https://developers.hostinger.com/api/vps/v1/virtual-machines/${HOSTINGER_VPS_ID}/docker"

# Substitute env into compose content
COMPOSE_CONTENT=$(envsubst < deploy/docker-compose.prod.yml)
# Caddyfile is base64-encoded and passed as CADDYFILE_B64 env var. Caddy container
# decodes it on start (see compose). Avoids host file-mount race issues on Hostinger.
CADDYFILE_B64=$(base64 -w0 deploy/Caddyfile)

# Build env block — these become the `environment` section runtime values
ENV_BLOCK=$(cat <<EOF
POSTGRES_USER=medusa
POSTGRES_DB=medusa_db
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
JWT_SECRET=${JWT_SECRET}
COOKIE_SECRET=${COOKIE_SECRET}
STORE_CORS=${STORE_CORS:-https://srv1162617.hstgr.cloud}
ADMIN_CORS=${ADMIN_CORS:-https://srv1162617.hstgr.cloud}
AUTH_CORS=${AUTH_CORS:-https://srv1162617.hstgr.cloud}
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=${NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY}
FX_USD_TO_IQD=1310
CADDYFILE_B64=${CADDYFILE_B64}
EOF
)

# Hostinger Docker API accepts JSON body with: project_name, content, environment
PAYLOAD=$(jq -n \
  --arg name "hanoot" \
  --arg content "$COMPOSE_CONTENT" \
  --arg env "$ENV_BLOCK" \
  '{
    project_name: $name,
    content: $content,
    environment: $env
  }')

echo "==> Deploying to VPS $HOSTINGER_VPS_ID..."
RESPONSE=$(curl -sS -X POST "$API" \
  -H "Authorization: Bearer $HOSTINGER_API_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d "$PAYLOAD")

echo "$RESPONSE" | jq .

# Extract action id and poll for success
ACTION_ID=$(echo "$RESPONSE" | jq -r '.id // empty')
if [ -z "$ACTION_ID" ]; then
  echo "No action id in response — assuming sync deploy"
  exit 0
fi

echo "==> Polling action $ACTION_ID..."
for i in $(seq 1 60); do
  STATE=$(curl -sS -H "Authorization: Bearer $HOSTINGER_API_TOKEN" \
    "https://developers.hostinger.com/api/vps/v1/virtual-machines/${HOSTINGER_VPS_ID}/actions/${ACTION_ID}" \
    | jq -r '.state')
  echo "  [$i] state=$STATE"
  case "$STATE" in
    success) echo "Deploy succeeded."; exit 0 ;;
    failed|error) echo "Deploy failed."; exit 1 ;;
  esac
  sleep 10
done

echo "Timed out waiting for deploy."
exit 1
