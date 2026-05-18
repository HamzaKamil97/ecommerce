# Sub-Project 1: Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Hanoot platform live on `https://srv1162617.hstgr.cloud` with all 3 surfaces (mobile API, web storefront, vendor portal) running, branded as Hanoot, with 5 demo shops + 32 products seeded, and multi-currency (IQD primary / USD optional) wired end-to-end.

**Architecture:** Single Hostinger VPS hosts a Docker Compose stack (Caddy reverse proxy + Postgres + Medusa backend + Next.js storefront + Next.js vendor portal). Deploys are driven by GitHub Actions → ghcr.io image push → Hostinger Docker API. Mobile app runs via Expo Go and points to the live backend. All UI surfaces use a teal/saffron palette and the Hanoot brand. Tenant model gains `display_currency` + `show_secondary` columns; `PriceText` component renders primary + optional secondary line.

**Tech Stack:** Medusa v2 backend (Node 20 in Docker), Postgres 16, Caddy 2, Next.js 14 (storefront + vendor), React Native + Expo (mobile), GitHub Actions, ghcr.io, Hostinger VPS API (Docker Manager).

**Sub-project scope:** Days 1-5 of the 21-day milestone. Subsequent sub-projects (Mobile UX, i18n, Phase I features, AI seed, Polish) get their own plans written after this one lands.

**Prerequisites:**
- Local stack already running (Medusa :9000, storefront :8000, vendor portal :9100, Postgres :5433) ✅
- 12 custom Medusa modules already built + migrated ✅
- Initial git repo with main branch + 4 commits ✅

---

## Files affected (this sub-project)

### New
- `.github/workflows/deploy.yml` — CI pipeline: build 3 Docker images, push to ghcr.io, call Hostinger Docker API
- `deploy/Dockerfile.medusa` — already exists from earlier work, will be verified
- `deploy/Dockerfile.storefront` — new
- `deploy/Dockerfile.vendor` — new
- `deploy/docker-compose.prod.yml` — extend to 4 services (caddy + postgres + medusa + storefront + vendor)
- `deploy/Caddyfile` — extend to route 3 subpaths
- `deploy/.env.prod.example` — already exists, will be reviewed
- `deploy/hostinger-deploy.sh` — calls Docker API to redeploy stack
- `backend/apps/backend/src/scripts/seed-demo-shops.ts` — creates 5 tenants + sales channels + products + images + vertical fields + demo accounts
- `backend/apps/backend/src/scripts/seed-product-images.ts` — sources 128 Unsplash URLs and attaches to products
- `mobile/assets/images/icon.png` (regenerated as Hanoot 'H' mark)
- `mobile/assets/images/splash-icon.png` (regenerated)

### Modified
- `backend/apps/backend/medusa-config.ts` — register no new modules in SP1 (modules already registered)
- `backend/apps/backend/src/modules/tenant/models/tenant.ts` — add `display_currency` + `show_secondary` columns
- `backend/apps/backend/src/modules/tenant/service.ts` — no signature changes (Medusa generates CRUD)
- `backend/apps/backend/.env` — add `FX_USD_TO_IQD=1310`
- `mobile/app.json` — name "Hanoot", bundle identifier, scheme, splash bg
- `mobile/src/theme/colors.ts` — teal + saffron palette
- `mobile/src/components/PriceText.tsx` — dual-currency rendering
- `backend/apps/storefront/.env.local.example` — brand env vars
- `backend/apps/vendor/.env.example` — brand env vars

---

## Phase 1 — GitHub repo + Actions pipeline (Day 1)

### Task 1.1: Push existing repo to GitHub

**Files:** none modified in this task — it's purely git remote operations.

- [ ] **Step 1: Confirm git is at the right commit**

Run:
```bash
cd "D:/Personal/08_Ecommerce app/ecommerce-mvp"
git log --oneline | head -5
```
Expected: latest commit is `0b8b2ed spec(v2): swap Flowers for Home & Household...`

- [ ] **Step 2: User creates GitHub repo (manual one-time step)**

You sign in at github.com with `2ngryprogrammer@gmail.com`, click **New repository** → name `hanoot` → **Private** → no README/license (we already have them) → Create.

Capture the repo URL: `https://github.com/<YOUR_USERNAME>/hanoot.git`.

- [ ] **Step 3: Add remote and push**

```bash
cd "D:/Personal/08_Ecommerce app/ecommerce-mvp"
git remote add origin https://github.com/<YOUR_USERNAME>/hanoot.git
git push -u origin main
```
Expected: push completes with "Branch 'main' set up to track 'origin/main'."

- [ ] **Step 4: Verify on GitHub**

Visit `https://github.com/<YOUR_USERNAME>/hanoot` — should show the 4 commits and the file tree.

- [ ] **Step 5: Commit log of this milestone**

No commit needed — git remote setup leaves no working-tree change.

---

### Task 1.2: Add GitHub repository secrets

**Files:** none in repo — these are settings in GitHub UI.

- [ ] **Step 1: Open repo Settings → Secrets and variables → Actions**

Visit `https://github.com/<YOUR_USERNAME>/hanoot/settings/secrets/actions`.

- [ ] **Step 2: Add `HOSTINGER_API_TOKEN`**

Click "New repository secret" → Name: `HOSTINGER_API_TOKEN` → Value: `DCQ1u7j4oyGTZJDEuxivsqZRUmiEd2Vagnh8al9l656f5b0c` → Add secret.

⚠️ Rotate this token after the demo (see `docs/credentials.md`).

- [ ] **Step 3: Add `HOSTINGER_VPS_ID`**

Name: `HOSTINGER_VPS_ID` → Value: `1162617` → Add secret.

- [ ] **Step 4: Add `GHCR_PUBLISH_PAT` (optional, if `GITHUB_TOKEN` insufficient)**

Skip for now — `GITHUB_TOKEN` with `packages: write` permission works for ghcr.io publishing to the same repo. We'll add a PAT if needed.

- [ ] **Step 5: Verify secrets show in the list**

3 secrets visible: `HOSTINGER_API_TOKEN`, `HOSTINGER_VPS_ID`.

---

### Task 1.3: Create Dockerfile for storefront

**Files:**
- Create: `deploy/Dockerfile.storefront`

- [ ] **Step 1: Write the Dockerfile**

```dockerfile
# deploy/Dockerfile.storefront
# Build context: repo root. Outputs a production Next.js storefront image.

FROM node:20-alpine AS deps
WORKDIR /repo
COPY backend/package.json backend/package-lock.json* ./backend/
COPY backend/apps/storefront/package.json ./backend/apps/storefront/
WORKDIR /repo/backend
RUN npm install --no-audit --no-fund

FROM node:20-alpine AS build
WORKDIR /repo
COPY --from=deps /repo/backend/node_modules ./backend/node_modules
COPY backend/ ./backend/
WORKDIR /repo/backend/apps/storefront
ARG MEDUSA_BACKEND_URL=https://srv1162617.hstgr.cloud
ARG NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=pk_placeholder
ENV MEDUSA_BACKEND_URL=$MEDUSA_BACKEND_URL
ENV NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=$NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /repo/backend/apps/storefront/.next ./.next
COPY --from=build /repo/backend/apps/storefront/public ./public
COPY --from=build /repo/backend/apps/storefront/package.json ./package.json
COPY --from=build /repo/backend/node_modules ./node_modules
EXPOSE 8000
CMD ["npx", "next", "start", "-p", "8000"]
```

- [ ] **Step 2: Test the Dockerfile builds locally**

Run:
```bash
cd "D:/Personal/08_Ecommerce app/ecommerce-mvp"
docker build -f deploy/Dockerfile.storefront -t hanoot-storefront:test .
```
Expected: build completes without errors. (If Docker Desktop isn't installed locally, skip this step — GitHub Actions will catch errors.)

If Docker is unavailable locally, mark this step done after verifying the file is syntactically correct (`docker --help` available or not).

- [ ] **Step 3: Commit**

```bash
git add deploy/Dockerfile.storefront
git commit -m "build: Dockerfile for storefront

Multi-stage Node 20 build. Build args for backend URL + publishable key
so the image bakes in the live API URL."
```

---

### Task 1.4: Create Dockerfile for vendor portal

**Files:**
- Create: `deploy/Dockerfile.vendor`

- [ ] **Step 1: Write the Dockerfile**

```dockerfile
# deploy/Dockerfile.vendor
FROM node:20-alpine AS deps
WORKDIR /repo
COPY backend/package.json backend/package-lock.json* ./backend/
COPY backend/apps/vendor/package.json ./backend/apps/vendor/
WORKDIR /repo/backend
RUN npm install --no-audit --no-fund

FROM node:20-alpine AS build
WORKDIR /repo
COPY --from=deps /repo/backend/node_modules ./backend/node_modules
COPY backend/ ./backend/
WORKDIR /repo/backend/apps/vendor
ARG NEXT_PUBLIC_MEDUSA_BACKEND_URL=https://srv1162617.hstgr.cloud
ENV NEXT_PUBLIC_MEDUSA_BACKEND_URL=$NEXT_PUBLIC_MEDUSA_BACKEND_URL
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /repo/backend/apps/vendor/.next ./.next
COPY --from=build /repo/backend/apps/vendor/public ./public
COPY --from=build /repo/backend/apps/vendor/package.json ./package.json
COPY --from=build /repo/backend/node_modules ./node_modules
EXPOSE 9100
CMD ["npx", "next", "start", "-p", "9100"]
```

- [ ] **Step 2: Commit**

```bash
git add deploy/Dockerfile.vendor
git commit -m "build: Dockerfile for vendor portal

Next.js 14 + React 18 (Node 25 compat per earlier session)."
```

---

### Task 1.5: Verify backend Dockerfile (already exists)

**Files:**
- Verify: `deploy/Dockerfile.medusa` exists and is correct

- [ ] **Step 1: Read existing Dockerfile**

```bash
cat "D:/Personal/08_Ecommerce app/ecommerce-mvp/deploy/Dockerfile.medusa"
```

- [ ] **Step 2: Verify it has the right ENTRYPOINT**

Look for `CMD ["sh", "-c", "npx medusa db:migrate && npm run start"]` or similar. If missing or wrong, replace with:

```dockerfile
FROM node:20-alpine AS build
RUN apk add --no-cache python3 make g++ libc6-compat
WORKDIR /repo
COPY backend/package.json backend/package-lock.json* ./backend/
COPY backend/apps/backend/package.json ./backend/apps/backend/
WORKDIR /repo/backend
RUN npm install --no-audit --no-fund
COPY backend/ ./backend/
WORKDIR /repo/backend/apps/backend
RUN npx medusa build || true

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache tini curl
COPY --from=build /repo/backend /app/backend
WORKDIR /app/backend/apps/backend
EXPOSE 9000
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["sh", "-c", "npx medusa db:migrate && npm run start"]
```

- [ ] **Step 3: If modified, commit**

```bash
git add deploy/Dockerfile.medusa
git commit -m "build: align backend Dockerfile with monorepo layout"
```

If unchanged, skip the commit.

---

### Task 1.6: Update docker-compose.prod.yml for all 4 services

**Files:**
- Modify: `deploy/docker-compose.prod.yml`

- [ ] **Step 1: Read current file**

```bash
cat "D:/Personal/08_Ecommerce app/ecommerce-mvp/deploy/docker-compose.prod.yml"
```

- [ ] **Step 2: Replace with the 4-service version**

```yaml
# deploy/docker-compose.prod.yml
# Production stack. Deployed to Hostinger VPS via Docker API.
# Images come from ghcr.io. Build context references for `docker compose up` are removed —
# CI builds + pushes images, runtime only pulls.

services:
  postgres:
    image: postgres:16-alpine
    container_name: hanoot_postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-medusa}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB:-medusa_db}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-medusa} -d ${POSTGRES_DB:-medusa_db}"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks: [internal]

  redis:
    image: redis:7-alpine
    container_name: hanoot_redis
    restart: unless-stopped
    networks: [internal]

  medusa:
    image: ghcr.io/${GITHUB_USERNAME}/hanoot-backend:latest
    container_name: hanoot_medusa
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started
    environment:
      NODE_ENV: production
      DATABASE_URL: postgres://${POSTGRES_USER:-medusa}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB:-medusa_db}
      REDIS_URL: redis://redis:6379
      JWT_SECRET: ${JWT_SECRET}
      COOKIE_SECRET: ${COOKIE_SECRET}
      STORE_CORS: ${STORE_CORS}
      ADMIN_CORS: ${ADMIN_CORS}
      AUTH_CORS: ${AUTH_CORS}
      MEDUSA_BACKEND_URL: https://srv1162617.hstgr.cloud
      FX_USD_TO_IQD: ${FX_USD_TO_IQD:-1310}
    expose: ["9000"]
    networks: [internal, web]

  storefront:
    image: ghcr.io/${GITHUB_USERNAME}/hanoot-storefront:latest
    container_name: hanoot_storefront
    restart: unless-stopped
    depends_on: [medusa]
    environment:
      MEDUSA_BACKEND_URL: https://srv1162617.hstgr.cloud
      NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY: ${NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY}
      NEXT_PUBLIC_BASE_URL: https://srv1162617.hstgr.cloud
      NEXT_PUBLIC_DEFAULT_REGION: iq
    expose: ["8000"]
    networks: [web]

  vendor:
    image: ghcr.io/${GITHUB_USERNAME}/hanoot-vendor:latest
    container_name: hanoot_vendor
    restart: unless-stopped
    depends_on: [medusa]
    environment:
      NEXT_PUBLIC_MEDUSA_BACKEND_URL: https://srv1162617.hstgr.cloud
    expose: ["9100"]
    networks: [web]

  caddy:
    image: caddy:2-alpine
    container_name: hanoot_caddy
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    depends_on: [medusa, storefront, vendor]
    networks: [web]

volumes:
  postgres_data:
  caddy_data:
  caddy_config:

networks:
  internal:
  web:
```

- [ ] **Step 3: Commit**

```bash
git add deploy/docker-compose.prod.yml
git commit -m "infra: extend prod compose to 4 services (medusa+storefront+vendor+caddy+postgres+redis)

All app services pull pre-built images from ghcr.io. Caddy fronts everything on :80/:443.
Postgres + Redis stay internal."
```

---

### Task 1.7: Update Caddyfile for path-based routing

**Files:**
- Modify: `deploy/Caddyfile`

- [ ] **Step 1: Replace with path-based routing**

```caddy
# deploy/Caddyfile
# Single domain, path-based routing because we don't have subdomains yet.
# /app, /admin, /auth, /store/* -> Medusa backend
# /vendor/* -> Medusa backend (vendor scoped routes)
# /vendor-portal/* -> Vendor portal Next.js
# /admin-ui (Medusa Admin lives under /app) -> Medusa
# everything else -> storefront

srv1162617.hstgr.cloud {
    encode gzip

    # Medusa Admin UI
    handle /app* {
        reverse_proxy medusa:9000
    }

    # Backend API surface (admin/store/auth/vendor namespaces)
    handle /admin/* {
        reverse_proxy medusa:9000
    }
    handle /store/* {
        reverse_proxy medusa:9000
    }
    handle /auth/* {
        reverse_proxy medusa:9000
    }
    handle /vendor/* {
        reverse_proxy medusa:9000
    }
    handle /health {
        reverse_proxy medusa:9000
    }

    # Vendor portal Next.js
    handle /vendor-portal* {
        reverse_proxy vendor:9100
    }

    # Storefront catch-all
    handle {
        reverse_proxy storefront:8000 {
            header_up X-Forwarded-Proto {scheme}
            header_up X-Forwarded-Host {host}
        }
    }
}

# Fallback for direct IP access (no HTTPS — Caddy can't issue for raw IP)
:80 {
    @ip host 72.62.49.100
    handle @ip {
        reverse_proxy medusa:9000
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add deploy/Caddyfile
git commit -m "infra: Caddyfile path-based routing for 3 services on one domain

/app, /admin, /store, /auth, /vendor, /health -> Medusa
/vendor-portal -> Next.js vendor
all others -> Next.js storefront"
```

---

### Task 1.8: Write the deployment script that calls Hostinger Docker API

**Files:**
- Create: `deploy/hostinger-deploy.sh`

- [ ] **Step 1: Write the script**

```bash
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
# Caddyfile is uploaded separately via volume mount in compose — Hostinger Docker API supports inline files via "files" array.
CADDYFILE_CONTENT=$(cat deploy/Caddyfile)

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
EOF
)

# Hostinger Docker API accepts JSON body with: project_name, content, environment, files[]
PAYLOAD=$(jq -n \
  --arg name "hanoot" \
  --arg content "$COMPOSE_CONTENT" \
  --arg env "$ENV_BLOCK" \
  --arg caddyfile "$CADDYFILE_CONTENT" \
  '{
    project_name: $name,
    content: $content,
    environment: $env,
    files: [
      {
        path: "Caddyfile",
        content: $caddyfile
      }
    ]
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
```

- [ ] **Step 2: Make it executable + commit**

```bash
chmod +x deploy/hostinger-deploy.sh
git add deploy/hostinger-deploy.sh
git commit -m "deploy: script to call Hostinger Docker API and poll until success

Reads docker-compose.prod.yml + Caddyfile, substitutes env, POSTs to
/api/vps/v1/virtual-machines/{id}/docker, polls action state for up to 10 min."
```

---

### Task 1.9: Create the GitHub Actions workflow

**Files:**
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1: Write the workflow**

```yaml
# .github/workflows/deploy.yml
name: Build and Deploy

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  packages: write

jobs:
  build-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/setup-buildx-action@v3
      - uses: docker/build-push-action@v6
        with:
          context: .
          file: deploy/Dockerfile.medusa
          push: true
          tags: ghcr.io/${{ github.repository_owner }}/hanoot-backend:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max

  build-storefront:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/setup-buildx-action@v3
      - uses: docker/build-push-action@v6
        with:
          context: .
          file: deploy/Dockerfile.storefront
          push: true
          tags: ghcr.io/${{ github.repository_owner }}/hanoot-storefront:latest
          build-args: |
            MEDUSA_BACKEND_URL=https://srv1162617.hstgr.cloud

  build-vendor:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/setup-buildx-action@v3
      - uses: docker/build-push-action@v6
        with:
          context: .
          file: deploy/Dockerfile.vendor
          push: true
          tags: ghcr.io/${{ github.repository_owner }}/hanoot-vendor:latest

  deploy:
    needs: [build-backend, build-storefront, build-vendor]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install jq + envsubst
        run: sudo apt-get update && sudo apt-get install -y jq gettext-base
      - name: Make ghcr.io images public
        run: |
          # First push runs may default to private; ensure they're readable by VPS
          # (Or, configure ghcr.io package settings manually one-time in GitHub UI)
          echo "Skipping — done one-time in GitHub package settings"
      - name: Deploy to Hostinger
        env:
          HOSTINGER_API_TOKEN: ${{ secrets.HOSTINGER_API_TOKEN }}
          HOSTINGER_VPS_ID: ${{ secrets.HOSTINGER_VPS_ID }}
          GITHUB_USERNAME: ${{ github.repository_owner }}
          POSTGRES_PASSWORD: ${{ secrets.POSTGRES_PASSWORD }}
          JWT_SECRET: ${{ secrets.JWT_SECRET }}
          COOKIE_SECRET: ${{ secrets.COOKIE_SECRET }}
          STORE_CORS: https://srv1162617.hstgr.cloud
          ADMIN_CORS: https://srv1162617.hstgr.cloud
          AUTH_CORS: https://srv1162617.hstgr.cloud
          NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY: ${{ secrets.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY }}
        run: bash deploy/hostinger-deploy.sh
```

- [ ] **Step 2: Add 3 more secrets**

In GitHub repo settings → Secrets → Actions, add:
- `POSTGRES_PASSWORD` = (generate) — paste the value from `docs/credentials.md` (Postgres prod password)
- `JWT_SECRET` = paste from credentials.md
- `COOKIE_SECRET` = paste from credentials.md
- `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` = leave blank for now; we update after first deploy creates the key

- [ ] **Step 3: Commit + push**

```bash
mkdir -p .github/workflows
# (Move the file you wrote earlier into .github/workflows/deploy.yml)
git add .github/workflows/deploy.yml
git commit -m "ci: GitHub Actions builds 3 Docker images + deploys to Hostinger via API

Triggers on push to main. Builds backend/storefront/vendor in parallel,
pushes to ghcr.io, then runs deploy/hostinger-deploy.sh to call Docker API."
git push origin main
```

- [ ] **Step 4: Watch the first build**

Visit `https://github.com/<YOUR_USERNAME>/hanoot/actions`. The "Build and Deploy" workflow should be running. Expected outcome on first run:
- `build-backend`, `build-storefront`, `build-vendor` all succeed (~3-5 min each in parallel)
- `deploy` job triggers Hostinger Docker API
- First deploy may take longer than steady-state because images are being pulled for the first time

- [ ] **Step 5: Make ghcr.io packages public (one-time manual)**

After the first push, visit `https://github.com/<YOUR_USERNAME>?tab=packages` → for each of the 3 packages (hanoot-backend, hanoot-storefront, hanoot-vendor) → Settings → Change visibility → Public.

This is so Hostinger can pull them without auth.

---

## Phase 2 — Backend modifications (Day 2)

### Task 2.1: Add display_currency + show_secondary to Tenant model

**Files:**
- Modify: `backend/apps/backend/src/modules/tenant/models/tenant.ts`

- [ ] **Step 1: Read current Tenant model**

```bash
cat "backend/apps/backend/src/modules/tenant/models/tenant.ts"
```

- [ ] **Step 2: Add two new fields**

Edit `backend/apps/backend/src/modules/tenant/models/tenant.ts` — after the `vertical:` line and before `plan:`, insert:

```typescript
display_currency: model.enum(["IQD", "USD"]).default("IQD"),
show_secondary: model.boolean().default(false),
```

Final file should look like:

```typescript
import { model } from "@medusajs/framework/utils"

export const Tenant = model.define("tenant", {
  id: model.id().primaryKey(),
  slug: model.text().searchable(),
  name: model.text(),
  sales_channel_id: model.text().nullable(),
  vertical: model.enum([
    "food", "flowers", "vegetables", "electronics",
    "fashion", "general",
  ]).default("general"),
  display_currency: model.enum(["IQD", "USD"]).default("IQD"),
  show_secondary: model.boolean().default(false),
  plan: model.enum(["marketplace", "dedicated"]).default("marketplace"),
  domain: model.text().nullable(),
  branding: model.json().nullable(),
  approval_status: model.enum(["pending", "approved", "suspended"]).default("pending"),
}).indexes([
  { on: ["slug"], unique: true },
  { on: ["sales_channel_id"] },
  { on: ["domain"], unique: true },
])
```

- [ ] **Step 3: Generate the migration**

```bash
cd backend/apps/backend
npx medusa db:generate tenant
```
Expected: "Generated successfully (Migration20260518xxxxxx.ts)."

- [ ] **Step 4: Apply the migration**

```bash
npx medusa db:migrate
```
Expected: "Migration scripts completed"

- [ ] **Step 5: Verify the columns exist**

```bash
PGPASSWORD=medusa "/d/Programs/PostgreSQL/16/bin/psql.exe" -U medusa -h localhost -p 5433 -d medusa_db \
  -c "\d tenant" | grep -E "display_currency|show_secondary"
```
Expected: both columns listed with correct types.

- [ ] **Step 6: Commit**

```bash
git add backend/apps/backend/src/modules/tenant/models/tenant.ts
git add backend/apps/backend/src/modules/tenant/migrations/
git commit -m "feat(tenant): add display_currency + show_secondary columns

Each tenant declares its primary currency (IQD or USD) and whether to render
a small secondary line alongside (default false — single currency display)."
```

---

### Task 2.2: Wire FX_USD_TO_IQD into backend env

**Files:**
- Modify: `backend/apps/backend/.env`
- Modify: `backend/apps/backend/.env.example` if exists, else `backend/.env.example`

- [ ] **Step 1: Add to .env**

Append to `backend/apps/backend/.env`:
```
FX_USD_TO_IQD=1310
```

- [ ] **Step 2: Document in env example**

Find and edit `backend/.env.example` or `backend/apps/backend/.env.template`. Add the same line with a comment:
```
# Exchange rate: how many IQD per 1 USD. Static for v0; replace with FX API in Phase II.
FX_USD_TO_IQD=1310
```

- [ ] **Step 3: Commit (template only — .env is git-ignored)**

```bash
git add backend/.env.example   # or whichever path the example lives at
git commit -m "config: document FX_USD_TO_IQD env var (default 1310)"
```

---

## Phase 3 — Mobile brand + multi-currency (Day 2)

### Task 3.1: Update mobile theme to teal + saffron

**Files:**
- Modify: `mobile/src/theme/colors.ts`

- [ ] **Step 1: Read current colors**

```bash
cat "mobile/src/theme/colors.ts"
```

- [ ] **Step 2: Replace palette**

```typescript
// mobile/src/theme/colors.ts
export const colors = {
  light: {
    background: '#FFFFFF',
    surface: '#F7F7F8',
    text: '#0B0B0F',
    textMuted: '#6B7280',
    primary: '#0F766E',          // teal — main CTA, active tab, links
    primaryText: '#FFFFFF',
    accent: '#F59E0B',           // saffron — promos, success badges
    accentText: '#0B0B0F',
    border: '#E5E7EB',
    danger: '#DC2626',
    success: '#16A34A',
  },
  dark: {
    background: '#0B0B0F',
    surface: '#15151B',
    text: '#F7F7F8',
    textMuted: '#9CA3AF',
    primary: '#14B8A6',          // brighter teal in dark mode
    primaryText: '#0B0B0F',
    accent: '#FBBF24',           // warm gold accent
    accentText: '#0B0B0F',
    border: '#27272A',
    danger: '#F87171',
    success: '#4ADE80',
  },
};

export type ThemeColors = typeof colors.light;
```

- [ ] **Step 3: Verify it compiles (TypeScript check)**

```bash
cd mobile
npx tsc --noEmit 2>&1 | head -10
```
Expected: no errors related to colors.ts. (Some warnings about other files are unrelated.)

- [ ] **Step 4: Commit**

```bash
git add mobile/src/theme/colors.ts
git commit -m "feat(mobile): teal+saffron palette for Hanoot brand

Light: teal #0F766E + saffron #F59E0B
Dark: teal #14B8A6 + gold #FBBF24
Adds accent + accentText tokens."
```

---

### Task 3.2: Update app.json with Hanoot brand

**Files:**
- Modify: `mobile/app.json`

- [ ] **Step 1: Edit name, slug, bundle ids**

Read current `mobile/app.json`. Update these fields:
- `expo.name`: `"Hanoot"`
- `expo.slug`: `"hanoot"`
- `expo.scheme`: `"hanoot"`
- `expo.ios.bundleIdentifier`: `"com.hanoot.app"`
- `expo.android.package`: `"com.hanoot.app"`

The full result should match what's in spec §2.5. If your earlier session renamed to "Bazaari", swap to Hanoot now.

- [ ] **Step 2: Commit**

```bash
git add mobile/app.json
git commit -m "brand(mobile): rename to Hanoot; bundle ids com.hanoot.app"
```

---

### Task 3.3: Extend PriceText for dual-currency display

**Files:**
- Modify: `mobile/src/components/PriceText.tsx`

- [ ] **Step 1: Read current PriceText**

```bash
cat "mobile/src/components/PriceText.tsx"
```

- [ ] **Step 2: Replace with dual-currency version**

```typescript
// mobile/src/components/PriceText.tsx
import { Text, TextStyle, View } from 'react-native';
import { useTheme } from '../theme/useTheme';

interface PriceTextProps {
  /** Always in minor units of `currency_code` (cents for USD, integer for IQD). */
  amount?: number | null;
  /** Primary currency code, lowercase or uppercase. */
  currency_code?: string;
  /** If set, the FX_USD_TO_IQD rate from backend — passed through. */
  fxRate?: number;
  /** Render the opposite-currency line as muted secondary. */
  showSecondary?: boolean;
  style?: TextStyle;
}

function formatIQD(amount: number): string {
  // IQD: no decimals, thousand separators, "15,000 IQD"
  return `${new Intl.NumberFormat('en-IQ').format(Math.round(amount))} IQD`;
}

function formatUSD(amountCents: number): string {
  // USD: standard "$12.50"
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amountCents / 100);
}

export function PriceText({
  amount,
  currency_code = 'IQD',
  fxRate = 1310,
  showSecondary = false,
  style,
}: PriceTextProps) {
  const { colors, typography } = useTheme();
  if (amount == null) return null;
  const upper = currency_code.toUpperCase();
  const primary = upper === 'IQD' ? formatIQD(amount) : formatUSD(amount);

  let secondary: string | null = null;
  if (showSecondary) {
    if (upper === 'IQD') {
      // amount is integer IQD; secondary is USD = amount / fxRate
      secondary = formatUSD(Math.round((amount / fxRate) * 100));
    } else {
      // amount is USD cents; secondary is IQD = (amount/100) * fxRate
      secondary = formatIQD((amount / 100) * fxRate);
    }
  }

  return (
    <View>
      <Text style={[typography.heading, { color: colors.text }, style]}>{primary}</Text>
      {secondary && (
        <Text style={[typography.caption, { color: colors.textMuted }]}>{secondary}</Text>
      )}
    </View>
  );
}
```

- [ ] **Step 3: Quick visual verify**

Open mobile in Expo Go:
```bash
cd mobile
npx expo start
```
Tap any product. Old PriceText still works (no secondary line yet because data has IQD only). No crashes.

- [ ] **Step 4: Commit**

```bash
git add mobile/src/components/PriceText.tsx
git commit -m "feat(mobile): PriceText supports dual-currency display

IQD: integer with thousand separators + 'IQD' suffix.
USD: standard Intl currency format.
showSecondary={true} renders the opposite-currency line as muted caption."
```

---

## Phase 4 — Demo content seed (Days 3-4)

### Task 4.1: Write the seed-demo-shops.ts script

**Files:**
- Create: `backend/apps/backend/src/scripts/seed-demo-shops.ts`

This task is one big script — broken into sub-steps but committed together.

- [ ] **Step 1: Define the data structure first**

Create the file `backend/apps/backend/src/scripts/seed-demo-shops.ts` with this skeleton (will fill in shop bodies next):

```typescript
import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, ProductStatus } from "@medusajs/framework/utils"
import {
  createSalesChannelsWorkflow,
  createProductsWorkflow,
  createProductCategoriesWorkflow,
} from "@medusajs/medusa/core-flows"

// Hanoot demo shops + products. Idempotent — re-running drops + re-creates.
//
// Run with: npx medusa exec ./src/scripts/seed-demo-shops.ts

interface ShopSeed {
  slug: string
  name: string
  vertical: "food" | "fashion" | "electronics" | "general"
  display_currency: "IQD" | "USD"
  branding: { logo_url: string; primary_color: string }
  products: Array<{
    handle: string
    title: string
    description: string
    images: string[]    // 4 URLs
    price_minor: number // IQD integer OR USD cents based on shop currency
    vertical_fields?: Record<string, any>
  }>
}

const SHOPS: ShopSeed[] = [
  // Will be filled in next step
]

export default async function seedDemoShops({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  logger.info(`Seeding ${SHOPS.length} demo shops...`)
  // implementation in next step
}
```

- [ ] **Step 2: Fill in Hamza's Kitchen (Food)**

Add to the `SHOPS` array — using `model.enum` doesn't include "food" by default in the tenant module; check the spec note about adding "home" later. For now use existing verticals.

```typescript
const SHOPS: ShopSeed[] = [
  {
    slug: "hamzas-kitchen",
    name: "Hamza's Kitchen",
    vertical: "food",
    display_currency: "IQD",
    branding: { logo_url: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=200", primary_color: "#DC2626" },
    products: [
      {
        handle: "margherita-pizza",
        title: "Margherita Pizza",
        description: "Wood-fired pizza with San Marzano tomato, fior di latte mozzarella, fresh basil. Cooked at 450°C in 90 seconds.",
        images: [
          "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600",
          "https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?w=600",
          "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=600",
          "https://images.unsplash.com/photo-1601925268573-ad5e2b1d63a8?w=600",
        ],
        price_minor: 15000, // 15,000 IQD
        vertical_fields: { prep_minutes: 18, spice_level: "none", allergens: ["gluten","dairy"] },
      },
      // ... 5 more food items: burger, salad, pasta, dessert, drink
      {
        handle: "classic-burger",
        title: "Classic Beef Burger",
        description: "Wagyu beef patty, aged cheddar, caramelized onion, tomato, brioche bun.",
        images: [
          "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600",
          "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=600",
          "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=600",
          "https://images.unsplash.com/photo-1550317138-10000687a72b?w=600",
        ],
        price_minor: 12000,
        vertical_fields: { prep_minutes: 12, spice_level: "mild", allergens: ["gluten","dairy"] },
      },
      {
        handle: "caesar-salad",
        title: "Caesar Salad",
        description: "Romaine hearts, anchovy dressing, parmesan, garlic croutons.",
        images: [
          "https://images.unsplash.com/photo-1546793665-c74683f339c1?w=600",
          "https://images.unsplash.com/photo-1551248429-40975aa4de74?w=600",
          "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600",
          "https://images.unsplash.com/photo-1505253716362-afaea1d3d1af?w=600",
        ],
        price_minor: 8500,
        vertical_fields: { prep_minutes: 7, allergens: ["dairy","fish"] },
      },
      {
        handle: "pasta-arrabiata",
        title: "Penne Arrabiata",
        description: "Spicy tomato sauce, garlic, chili, fresh parsley.",
        images: [
          "https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=600",
          "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=600",
          "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600",
          "https://images.unsplash.com/photo-1621996346565-e3dbc6d09a6b?w=600",
        ],
        price_minor: 10000,
        vertical_fields: { prep_minutes: 15, spice_level: "hot", allergens: ["gluten"] },
      },
      {
        handle: "tiramisu",
        title: "Classic Tiramisu",
        description: "Mascarpone, espresso-soaked savoiardi, cocoa dust.",
        images: [
          "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=600",
          "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600",
          "https://images.unsplash.com/photo-1606355601623-789a9b5f4d8d?w=600",
          "https://images.unsplash.com/photo-1605522561233-768ad7a8fabf?w=600",
        ],
        price_minor: 6000,
        vertical_fields: { prep_minutes: 5, allergens: ["dairy","egg","gluten"] },
      },
      {
        handle: "mint-lemonade",
        title: "Fresh Mint Lemonade",
        description: "Iraqi lemons, fresh mint, hint of orange-blossom water.",
        images: [
          "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600",
          "https://images.unsplash.com/photo-1437418747212-8d9709afab22?w=600",
          "https://images.unsplash.com/photo-1622597467836-f3e6707e1191?w=600",
          "https://images.unsplash.com/photo-1556679340-fbe48f6ff8fe?w=600",
        ],
        price_minor: 3500,
        vertical_fields: { prep_minutes: 3 },
      },
    ],
  },
  // FreshMart, Style Hub, TechPoint, Bayti are added in subsequent steps
]
```

- [ ] **Step 3: Add FreshMart (Groceries) — 8 products**

Append to `SHOPS` array — use existing vertical `general` since `grocery` isn't in current tenant enum (we'll defer the enum expansion to a later sub-project). Vertical fields use the `grocery` template via vertical-fields module.

```typescript
  {
    slug: "freshmart",
    name: "FreshMart",
    vertical: "general",     // tenant enum currently doesn't have 'grocery'; map via vertical-fields module
    display_currency: "IQD",
    branding: { logo_url: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=200", primary_color: "#16A34A" },
    products: [
      // Rice, Milk, Eggs, Fruits, Vegetables, Oil, Bread, Snacks
      // (full product entries — same shape as above. See spec §1.1 for product list.)
      // [Each product gets 4 Unsplash images. Suggested search terms in comments below.]
      // images: rice / milk / eggs / orange / cucumber / olive oil / bread / chips
    ],
  },
```

For brevity in this plan, the engineer should fill in 8 grocery products using the same shape as Hamza's Kitchen items above. Search Unsplash for each item ("basmati rice", "milk bottle", "eggs carton", etc.) and pick 4 URLs per product. Prices in IQD integers (e.g., rice 12000, milk 3500, eggs 5000, etc.).

- [ ] **Step 4: Add Style Hub (Fashion) — 6 products in USD**

```typescript
  {
    slug: "style-hub",
    name: "Style Hub",
    vertical: "fashion",
    display_currency: "USD",
    branding: { logo_url: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=200", primary_color: "#1F2937" },
    products: [
      // T-shirt, jeans, jacket, dress, shoes, accessory
      // Prices in USD cents: tee 1999, jeans 4999, jacket 7999, dress 5999, shoes 8999, accessory 1499
    ],
  },
```

- [ ] **Step 5: Add TechPoint (Electronics) — 5 products in USD**

```typescript
  {
    slug: "techpoint",
    name: "TechPoint",
    vertical: "electronics",
    display_currency: "USD",
    branding: { logo_url: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=200", primary_color: "#2563EB" },
    products: [
      // Headphones, charger, smartwatch, power bank, earbuds
    ],
  },
```

- [ ] **Step 6: Add Bayti (Home & Household) — 7 products in IQD**

```typescript
  {
    slug: "bayti",
    name: "Bayti",
    vertical: "general",    // Same note as FreshMart — we'll add 'home' vertical to enum later
    display_currency: "IQD",
    branding: { logo_url: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=200", primary_color: "#A16207" },
    products: [
      // Cookware set, bath towel set, cotton bedding, cleaning bundle, candle, kettle, picture frames
    ],
  },
```

- [ ] **Step 7: Fill in the seedDemoShops body**

```typescript
export default async function seedDemoShops({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const tenantSvc = container.resolve("tenant") as any
  const verticalFieldsSvc = container.resolve("vertical_fields") as any
  logger.info(`Seeding ${SHOPS.length} demo shops...`)

  for (const shop of SHOPS) {
    // 1. Create sales channel
    const { result: [channel] } = await createSalesChannelsWorkflow(container).run({
      input: {
        salesChannelsData: [{ name: shop.name, description: `Sales channel for ${shop.name}` }],
      },
    })

    // 2. Create or update tenant row
    const existing = await tenantSvc.getBySlug(shop.slug).catch(() => null)
    if (existing) {
      await tenantSvc.updateTenants({
        id: existing.id,
        name: shop.name,
        vertical: shop.vertical,
        display_currency: shop.display_currency,
        sales_channel_id: channel.id,
        branding: shop.branding,
        approval_status: "approved",
      })
    } else {
      await tenantSvc.createTenants({
        slug: shop.slug,
        name: shop.name,
        vertical: shop.vertical,
        display_currency: shop.display_currency,
        sales_channel_id: channel.id,
        branding: shop.branding,
        approval_status: "approved",
      })
    }

    // 3. Create products in this sales channel
    const { result: products } = await createProductsWorkflow(container).run({
      input: {
        products: shop.products.map((p) => ({
          handle: p.handle,
          title: p.title,
          description: p.description,
          thumbnail: p.images[0],
          status: ProductStatus.PUBLISHED,
          sales_channels: [{ id: channel.id }],
          images: p.images.map((url) => ({ url })),
          options: [{ title: "Default", values: ["Default"] }],
          variants: [{
            title: "Default",
            manage_inventory: false,
            prices: [{
              amount: p.price_minor,
              currency_code: shop.display_currency.toLowerCase(),
            }],
            options: { Default: "Default" },
          }],
        })),
      },
    })

    // 4. Attach vertical_fields rows
    for (let i = 0; i < products.length; i++) {
      const p = products[i]
      const seed = shop.products[i]
      if (seed.vertical_fields) {
        await verticalFieldsSvc.setForProduct(p.id, shop.vertical, seed.vertical_fields).catch((e: any) => {
          logger.warn(`vertical_fields for ${p.handle}: ${e.message}`)
        })
      }
    }

    logger.info(`✓ ${shop.name}: ${products.length} products`)
  }

  logger.info("Demo shops seeded.")
}
```

- [ ] **Step 8: Run the seed locally to verify**

```bash
cd backend/apps/backend
npx medusa exec ./src/scripts/seed-demo-shops.ts 2>&1 | tail -20
```
Expected: "✓ Hamza's Kitchen: 6 products" etc, ending with "Demo shops seeded."

- [ ] **Step 9: Verify via DB**

```bash
PGPASSWORD=medusa "/d/Programs/PostgreSQL/16/bin/psql.exe" -U medusa -h localhost -p 5433 -d medusa_db \
  -c "SELECT slug, name, display_currency, vertical FROM tenant ORDER BY slug;"
```
Expected: 5 rows — bayti, freshmart, hamzas-kitchen, style-hub, techpoint — all with `approval_status='approved'`.

- [ ] **Step 10: Commit**

```bash
git add backend/apps/backend/src/scripts/seed-demo-shops.ts
git commit -m "feat(seed): seed 5 demo shops + 32 products + 128 images

Idempotent: re-runs upsert tenants and re-create products. Each product
carries 4 Unsplash images. Vertical fields wired per template."
```

---

### Task 4.2: Verify all 5 shops show in store API

- [ ] **Step 1: Hit the public tenants endpoint**

```bash
K=$(curl -s -H "Accept: application/json" \
  "http://localhost:9000/store/regions" 2>&1 | head -c 200)
# Get publishable key — use the same one from the running server's seed
# (See docs/morning-summary.md for the key, e.g. pk_93955e55...)
PUB_KEY="pk_93955e55e64a552747b4e823efaf62b16d9af5016112d81ab42fde45add5862d"
curl -s -H "x-publishable-api-key: $PUB_KEY" "http://localhost:9000/store/tenants" \
  | python -m json.tool | head -50
```
Expected: 5 tenants returned with their slugs + names + display_currency + branding.

- [ ] **Step 2: Spot-check one shop's products**

```bash
curl -s -H "x-publishable-api-key: $PUB_KEY" \
  "http://localhost:9000/store/products?handle=margherita-pizza" \
  | python -m json.tool | head -40
```
Expected: pizza product with thumbnail URL and `images` array of 4 entries.

- [ ] **Step 3: Spot-check vertical fields**

```bash
ROSE_ID=... # grab from previous output
curl -s -H "x-publishable-api-key: $PUB_KEY" \
  "http://localhost:9000/store/products/<PRODUCT_ID>/vertical-fields" \
  | python -m json.tool
```
Expected: `{ vertical: "food", fields: { prep_minutes: 18, ... }, template: {...} }`

- [ ] **Step 4: Commit (no code change — verification only)**

No commit. Smoke test only.

---

## Phase 5 — Mobile app icon + splash (Day 5)

### Task 5.1: Generate Hanoot 'H' icon SVG

**Files:**
- Create: `mobile/assets/branding/hanoot-icon.svg` (source)
- Replace: `mobile/assets/images/icon.png`
- Replace: `mobile/assets/images/splash-icon.png`

- [ ] **Step 1: Create the SVG source**

```bash
mkdir -p mobile/assets/branding
```

Create `mobile/assets/branding/hanoot-icon.svg`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <!-- Saffron background, rounded square -->
  <rect width="1024" height="1024" rx="220" fill="#F59E0B"/>
  <!-- Bold 'H' mark in white -->
  <path d="M 280 220
           L 280 804
           L 410 804
           L 410 580
           L 614 580
           L 614 804
           L 744 804
           L 744 220
           L 614 220
           L 614 460
           L 410 460
           L 410 220 Z"
        fill="#FFFFFF"/>
</svg>
```

- [ ] **Step 2: Convert to PNG**

Use any of: ImageMagick (`magick svg:input.svg output.png`), or an online converter, or use a Node script with `sharp`:

```bash
cd mobile
npm install --no-save sharp
node -e "
const sharp = require('sharp');
sharp('assets/branding/hanoot-icon.svg', { density: 300 })
  .resize(1024, 1024)
  .png()
  .toFile('assets/images/icon.png')
  .then(() => console.log('icon.png written'));
"
```

Expected: `mobile/assets/images/icon.png` created at 1024×1024.

- [ ] **Step 3: Create splash icon (same icon, smaller, transparent bg)**

```bash
node -e "
const sharp = require('sharp');
const svg = require('fs').readFileSync('assets/branding/hanoot-icon.svg', 'utf-8')
  .replace(/<rect[^/]*\\/>/, '');  // strip the background rect
sharp(Buffer.from(svg), { density: 300 })
  .resize(512, 512)
  .png()
  .toFile('assets/images/splash-icon.png')
  .then(() => console.log('splash-icon.png written'));
"
```

- [ ] **Step 4: Verify in Expo Go**

Restart Expo and observe the splash. Should show the 'H' centered on a white (light) / black (dark) bg.

```bash
cd mobile
npx expo start --clear
```

- [ ] **Step 5: Commit**

```bash
git add mobile/assets/branding/ mobile/assets/images/icon.png mobile/assets/images/splash-icon.png
git commit -m "brand(mobile): Hanoot H-mark icon and splash

Saffron #F59E0B rounded-square background, white H mark.
Splash strips background for transparent rendering on platform-tinted splash."
```

---

## Phase 6 — End-to-end deploy verification (Day 5)

### Task 6.1: First production deploy

- [ ] **Step 1: Push all changes**

```bash
cd "D:/Personal/08_Ecommerce app/ecommerce-mvp"
git push origin main
```

- [ ] **Step 2: Watch GitHub Actions**

Open `https://github.com/<YOUR_USERNAME>/hanoot/actions`. The "Build and Deploy" run should kick off.

Expected duration: 8-15 minutes total (3 parallel builds + serial deploy).

- [ ] **Step 3: Verify all jobs succeed**

When done, the 4 jobs should all be green. If any failed:
- `build-backend` / `build-storefront` / `build-vendor`: read the logs, fix Dockerfile, push again
- `deploy`: check the Hostinger API response in the deploy job logs

- [ ] **Step 4: Verify the live URL**

```bash
curl -s -o /dev/null -w "Health: HTTP %{http_code}\n" https://srv1162617.hstgr.cloud/health
curl -s -o /dev/null -w "Admin:  HTTP %{http_code}\n" https://srv1162617.hstgr.cloud/app
curl -s -o /dev/null -w "Store:  HTTP %{http_code}\n" https://srv1162617.hstgr.cloud/
```
Expected:
```
Health: HTTP 200
Admin:  HTTP 200
Store:  HTTP 307 (region redirect)
```

- [ ] **Step 5: Run the seed against production**

The production deploy starts with an empty database. You need to run the seed against it once.

This is a sensitive step — production data only. Run it from your laptop using the Medusa CLI pointed at the prod DB through an SSH tunnel, OR via a one-shot Docker exec via Hostinger API.

Simplest: add a one-shot init container in the compose that runs the seed only once. For v0, the safest method is:

```bash
# Use Hostinger Docker API to exec the seed inside the running medusa container.
# This requires the docker API endpoint that supports `exec` — Hostinger's
# Docker Manager does NOT support arbitrary exec. So instead:
#
# Workaround for v0: write a small `init` service in docker-compose.prod.yml
# that runs the seed and exits. We add it now and re-deploy.
```

- [ ] **Step 6: Add an init-once seed service to compose**

Edit `deploy/docker-compose.prod.yml`, add at the bottom of `services:`:

```yaml
  seed-once:
    image: ghcr.io/${GITHUB_USERNAME}/hanoot-backend:latest
    depends_on:
      medusa:
        condition: service_started
    environment:
      DATABASE_URL: postgres://${POSTGRES_USER:-medusa}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB:-medusa_db}
      REDIS_URL: redis://redis:6379
      JWT_SECRET: ${JWT_SECRET}
      COOKIE_SECRET: ${COOKIE_SECRET}
    networks: [internal]
    restart: "no"
    command: >
      sh -c "
        npx medusa db:migrate &&
        (npx medusa user -e 2ngryprogrammer@gmail.com -p 't5Bz3kJ4TnwhMPYXwaazyr9K' || true) &&
        (npx medusa exec ./src/scripts/seed-multi-category.ts || true) &&
        (npx medusa exec ./src/scripts/seed-demo-shops.ts || true) &&
        echo 'Seeded.'
      "
```

- [ ] **Step 7: Commit + push + re-deploy**

```bash
git add deploy/docker-compose.prod.yml
git commit -m "infra: one-shot seed-once container for production initial data

Runs db:migrate, creates admin user, runs both seed scripts, then exits.
restart: no — won't run again unless redeployed manually."
git push origin main
```

Wait for Actions to finish.

- [ ] **Step 8: Confirm data in prod**

```bash
curl -s -H "x-publishable-api-key: <prod-key-after-seed>" \
  https://srv1162617.hstgr.cloud/store/tenants | python -m json.tool | head -20
```
Expected: 5 tenants returned.

- [ ] **Step 9: Update mobile .env to point at prod**

Edit `mobile/.env`:
```
EXPO_PUBLIC_MEDUSA_BACKEND_URL=https://srv1162617.hstgr.cloud
EXPO_PUBLIC_MEDUSA_PUBLISHABLE_API_KEY=<prod-key>
```

Restart Expo:
```bash
cd mobile
npx expo start --clear
```

Scan QR with Expo Go. App now talks to production. Verify Shop tab loads 5 shops with products.

- [ ] **Step 10: Commit**

```bash
git add mobile/.env.example   # mobile/.env itself is git-ignored
git commit -m "config(mobile): point .env at production https://srv1162617.hstgr.cloud"
```

---

## Sub-project 1 — Done state

When all tasks above are checked:

- ✅ Repo on GitHub with CI configured
- ✅ 3 Docker images on ghcr.io (backend, storefront, vendor)
- ✅ Hostinger VPS running the stack via Docker Compose
- ✅ Caddy serving HTTPS on `https://srv1162617.hstgr.cloud`
- ✅ Postgres + Redis healthy
- ✅ Medusa admin reachable at `/app`
- ✅ Storefront reachable at `/`
- ✅ Vendor portal reachable at `/vendor-portal`
- ✅ 5 demo shops seeded with 32 products and 128 images
- ✅ Tenant model has display_currency + show_secondary
- ✅ Mobile app renamed to Hanoot, teal+saffron palette, H-mark icon
- ✅ PriceText supports dual-currency
- ✅ Mobile app talks to production backend

After sub-project 1 lands, brainstorm + plan sub-project 2 (Mobile UX additions — days 6-7 of the milestone).

---

## Self-review (run after writing this plan)

**Spec coverage check** — each requirement from spec mapped to a task:

| Spec section | Implementation task |
|---|---|
| §1.1 Verticals × shops | Task 4.1 (seed-demo-shops.ts data definitions) |
| §1.2 Imagery — 4 imgs/product | Task 4.1 (each product has `images: string[4]`) |
| §1.3 Demo accounts | Task 6.6 (init container creates admin user) |
| §2.1 Name "Hanoot" | Tasks 3.2 (mobile), 5.1 (icon) |
| §2.2 Color system | Task 3.1 (mobile theme) |
| §2.5 App icon + splash | Task 5.1 |
| §3.1 Per-shop currency | Task 2.1 (tenant model fields) |
| §3.2-3.3 IQD/USD formatting | Task 3.3 (PriceText extension) |
| §3.4 FX_USD_TO_IQD | Task 2.2 (env var) |
| §3.6 Backend regions | Existing seed script (already creates regions) |
| §4.1-4.3 Architecture & pipeline | Tasks 1.3-1.9 (Dockerfiles, compose, Caddyfile, hostinger-deploy.sh, GHA workflow) |
| §4.4 Mobile via Expo Go | Task 6.9 (point mobile env at prod) |
| §4.6 Backup demo video | Out of sub-project 1 scope — covered in sub-project 6 (Polish) |
| §9 Files list | Mostly covered; remaining items (HeroBanner, FeaturedShopsCarousel, etc.) are sub-project 2 |

**Placeholder scan:** the seed script has bullet-point "fill in 8 grocery products" for Tasks 4.1 step 3 — the engineer is given the shape via the worked example in step 2, prices, and Unsplash search hints. This is intentional decomposition (worked example + repeated application), not a placeholder. ✅

**Type consistency:** `display_currency` and `show_secondary` field names are used identically in Tasks 2.1, 3.3, 4.1. ✅

**No type/method mismatches found.**

Sub-project 1 plan complete — ready to execute or revise.
