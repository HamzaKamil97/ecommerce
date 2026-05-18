# Deploy Automation: GitHub → Container Registry → Hostinger Docker API

End-to-end CI/CD setup. Push a commit → image builds → deploys to your VPS automatically. No SSH ever needed.

## The full pipeline

```
You push code to GitHub  ─┐
                          ├─→ GitHub Actions builds Docker image
                          ├─→ Pushes image to ghcr.io/<you>/medusa-backend:latest
                          └─→ Calls Hostinger API → docker_compose_up with new image
                          
Result: deploy live in ~5 minutes
```

## Step 1 — Push to GitHub (10 min)

Create a private repo, then:

```powershell
cd "D:\Personal\08_Ecommerce app\ecommerce-mvp"

# Authenticate (one-time)
gh auth login          # or use git credential manager

# Create + push
gh repo create bazaari-platform --private --source=. --remote=origin --push

# Or if you prefer manually:
git remote add origin https://github.com/2ngryprogrammer/bazaari-platform.git
git push -u origin main
```

## Step 2 — Add the build Dockerfile (already in this repo)

`deploy/Dockerfile.medusa` is the multi-stage Node 20 build, ready to go.

## Step 3 — GitHub Actions workflow

Save as `.github/workflows/deploy.yml`:

```yaml
name: Build & Deploy to Hostinger

on:
  push:
    branches: [main]
    paths:
      - 'backend/apps/backend/**'
      - 'deploy/**'
      - '.github/workflows/deploy.yml'

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}-medusa
  VPS_ID: 1162617

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    permissions: { contents: read, packages: write }
    outputs:
      image: ${{ steps.meta.outputs.tags }}
    steps:
      - uses: actions/checkout@v4

      - uses: docker/setup-buildx-action@v3

      - uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=raw,value=latest
            type=sha,prefix=

      - uses: docker/build-push-action@v6
        with:
          context: ./backend/apps/backend
          file: ./deploy/Dockerfile.medusa
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy:
    needs: build-and-push
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Render docker-compose with new image
        run: |
          IMAGE="${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:latest"
          envsubst < deploy/docker-compose.api.template.yml > /tmp/compose.yml
          echo "Resolved compose:"
          head -30 /tmp/compose.yml
        env:
          MEDUSA_IMAGE: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:latest

      - name: Deploy via Hostinger Docker API
        run: |
          curl -fSs -X POST \
            -H "Authorization: Bearer ${{ secrets.HOSTINGER_API_TOKEN }}" \
            -H "Content-Type: application/json" \
            -H "Accept: application/json" \
            -d "$(jq -Rs --slurpfile compose <(cat /tmp/compose.yml) \
                 '{project_name: "bazaari-stack", content: $compose[0]}')" \
            "https://developers.hostinger.com/api/vps/v1/virtual-machines/${{ env.VPS_ID }}/docker"

      - name: Wait for /health
        run: |
          for i in {1..30}; do
            if curl -sf https://srv1162617.hstgr.cloud/health > /dev/null; then
              echo "✅ Deployed at iteration $i"
              exit 0
            fi
            echo "[$i] waiting…"
            sleep 10
          done
          echo "❌ Deploy timed out"
          exit 1
```

## Step 4 — Add secrets to GitHub

Repo Settings → Secrets and variables → Actions → New secret:

| Secret | Value |
|---|---|
| `HOSTINGER_API_TOKEN` | Your Hostinger API token (rotate the one in chat first) |
| `POSTGRES_PASSWORD` | `mEjqhqVfdUdrnOEfkpuI1TxXDULNh4BC` (or rotate first) |
| `JWT_SECRET` | `mzDzR9CkNtcvfScUriBnBJVLLxt2BQ1eb0GDkHSh36Ig5cVA` |
| `COOKIE_SECRET` | `7eHgFP9gSucrm80oieh1WSnAa0x1oqWUomvYDxNBNWusAoCq` |
| `MEDUSA_BACKEND_URL` | `https://srv1162617.hstgr.cloud` |
| `ZAINCASH_CLIENT_ID` | (when you register at zaincash.iq) |
| `ZAINCASH_CLIENT_SECRET` | (same) |
| `QICARD_MERCHANT_ID` | (when you register at qi.iq) |
| `QICARD_API_KEY` | (same) |
| `STRIPE_SECRET_KEY` | (when you create Stripe account) |
| `ANTHROPIC_API_KEY` | (optional — activates real AI) |

## Step 5 — docker-compose template

Save as `deploy/docker-compose.api.template.yml`:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: ecom_postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: medusa
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: medusa_db
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    container_name: ecom_redis
    restart: unless-stopped

  medusa:
    image: ${MEDUSA_IMAGE}
    container_name: ecom_medusa
    restart: unless-stopped
    depends_on: [postgres, redis]
    environment:
      NODE_ENV: production
      DATABASE_URL: postgres://medusa:${POSTGRES_PASSWORD}@postgres:5432/medusa_db
      REDIS_URL: redis://redis:6379
      JWT_SECRET: ${JWT_SECRET}
      COOKIE_SECRET: ${COOKIE_SECRET}
      STORE_CORS: https://srv1162617.hstgr.cloud
      ADMIN_CORS: https://srv1162617.hstgr.cloud
      AUTH_CORS: https://srv1162617.hstgr.cloud
      MEDUSA_BACKEND_URL: ${MEDUSA_BACKEND_URL}
      ZAINCASH_CLIENT_ID: ${ZAINCASH_CLIENT_ID}
      ZAINCASH_CLIENT_SECRET: ${ZAINCASH_CLIENT_SECRET}
      QICARD_MERCHANT_ID: ${QICARD_MERCHANT_ID}
      QICARD_API_KEY: ${QICARD_API_KEY}
      STRIPE_SECRET_KEY: ${STRIPE_SECRET_KEY}
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}
    ports:
      - "9000:9000"

  caddy:
    image: caddy:2-alpine
    container_name: ecom_caddy
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    depends_on: [medusa]

volumes:
  postgres_data:
  caddy_data:
  caddy_config:
```

## Step 6 — Make the Hostinger image registry-aware

The Hostinger Docker API runs `docker compose up -d` with whatever `content` you POST. Public images from `ghcr.io` work out of the box if the image is **public**. For private images:

```yaml
# Add to docker-compose:
  registry-auth:
    image: alpine:latest
    command: echo "${GHCR_TOKEN}" | docker login ghcr.io -u USER --password-stdin
    # Note: this won't work — docker login inside a container doesn't persist.
```

Two cleaner options:
- **Make the image public** on ghcr.io (free, fine for non-secret code)
- **Use Docker Hub** with a personal access token, and pre-authenticate the VPS once via Browser Terminal: `docker login`

For now, go public. Make the ghcr.io package public:
1. https://github.com/2ngryprogrammer?tab=packages
2. Click your image → Package settings → Change visibility → Public

## Step 7 — First deploy (manual trigger)

Push your code:

```powershell
git add .
git commit -m "ci: add GitHub Actions deploy workflow"
git push
```

In GitHub → Actions tab → watch the workflow run. After ~5 minutes:
- Image is at `ghcr.io/2ngryprogrammer/bazaari-platform-medusa:latest`
- VPS has the stack running
- `https://srv1162617.hstgr.cloud/health` returns OK

## Step 8 — Add a custom domain (optional)

When you buy a domain (e.g., `bazaari.iq`):
1. Add an A record pointing to `72.62.49.100`
2. Update `deploy/Caddyfile`:
   ```
   bazaari.iq, www.bazaari.iq {
     reverse_proxy medusa:9000
   }
   ```
3. Commit + push → Caddy auto-fetches Let's Encrypt cert on first request

## Step 9 — Deploy the mobile app to stores

Wire your Expo project to push EAS updates on every commit too:

`.github/workflows/eas-update.yml`:
```yaml
name: Mobile OTA update
on:
  push:
    branches: [main]
    paths: ['mobile/**']
jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      - run: cd mobile && npm install
      - run: cd mobile && eas update --auto
```

`EXPO_TOKEN` from https://expo.dev → Profile → Access tokens.

## Manual deploy fallback (no GitHub)

If you don't want to set up GitHub yet, the deploy-from-laptop.ps1 script still works once you can ssh OR you can manually POST to the Hostinger API:

```powershell
$token = $env:HOSTINGER_API_TOKEN
$compose = Get-Content deploy/docker-compose.api.yml -Raw  # with values filled in
Invoke-RestMethod `
  -Method POST `
  -Uri "https://developers.hostinger.com/api/vps/v1/virtual-machines/1162617/docker" `
  -Headers @{ Authorization = "Bearer $token"; "Content-Type" = "application/json" } `
  -Body (@{ project_name = "bazaari-stack"; content = $compose } | ConvertTo-Json)
```

## Verifying deploys

After every deploy:
```bash
# Health
curl https://srv1162617.hstgr.cloud/health

# Container status
curl -H "Authorization: Bearer $TOKEN" \
  https://developers.hostinger.com/api/vps/v1/virtual-machines/1162617/docker/bazaari-stack/containers

# Recent logs (last 200 lines)
curl -H "Authorization: Bearer $TOKEN" \
  "https://developers.hostinger.com/api/vps/v1/virtual-machines/1162617/docker/bazaari-stack/logs?lines=200"
```

## Rollback

To roll back to a previous image tag:
```powershell
# Re-POST docker-compose with the previous SHA tag instead of :latest
$compose = (Get-Content deploy/docker-compose.api.yml -Raw) -replace ":latest", ":abc1234"
Invoke-RestMethod -Method POST -Uri "..." -Body (...)
```

Or via GitHub Actions: re-run the workflow at a previous commit.
