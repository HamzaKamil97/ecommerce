# Deploy via Hostinger Docker API (NO SSH needed)

When SSH is blocked by your ISP (or for any reason port 22 isn't reachable), Hostinger's API lets us deploy and manage Docker Compose stacks directly. This is the **primary deploy path** for this project.

## Prerequisites

- VPS uses an OS template with "Docker Manager" — we already recreated to template id **1121** ("Ubuntu 24.04 with Docker"). ✅
- Hostinger API token (env: `API_TOKEN`).
- Public Docker images for every service in the compose. (Hostinger pulls them — the VPS doesn't build.)

## Endpoints

| Action | Method | Path |
|---|---|---|
| Deploy / replace project | POST | `/api/vps/v1/virtual-machines/{vpsId}/docker` |
| List projects | GET | `/api/vps/v1/virtual-machines/{vpsId}/docker` |
| Get project | GET | `/api/vps/v1/virtual-machines/{vpsId}/docker/{projectName}` |
| Logs | GET | `/api/vps/v1/virtual-machines/{vpsId}/docker/{projectName}/logs` |
| Down | POST | `/api/vps/v1/virtual-machines/{vpsId}/docker/{projectName}/down` |
| Start | POST | `/api/vps/v1/virtual-machines/{vpsId}/docker/{projectName}/start` |
| Stop | POST | `/api/vps/v1/virtual-machines/{vpsId}/docker/{projectName}/stop` |
| Restart | POST | `/api/vps/v1/virtual-machines/{vpsId}/docker/{projectName}/restart` |
| Update | POST | `/api/vps/v1/virtual-machines/{vpsId}/docker/{projectName}/update` |
| List containers | GET | `/api/vps/v1/virtual-machines/{vpsId}/docker/{projectName}/containers` |

Body for **POST deploy** is one of:
- `{ "project_name": "X", "content": "<docker-compose.yml as string>" }`
- `{ "project_name": "X", "url": "https://github.com/user/repo" }` (resolves to docker-compose.yaml at master branch)

## Catch — no build context

The Hostinger Docker API only **pulls images**. It does not build from a Dockerfile. So our Medusa image must exist publicly:

- Docker Hub (free for public repos)
- GitHub Container Registry (`ghcr.io`)
- Hostinger's own registry if they offer one

## Recommended one-time setup for the Medusa image

Option 1 — **GitHub + Container Registry** (recommended; free):
1. Create a GitHub repo for `backend/` (private is fine).
2. Add a workflow `.github/workflows/publish.yml` that builds + pushes the Docker image to `ghcr.io/<you>/medusa-backend:latest` on every push to `main`.
3. The Hostinger compose references `image: ghcr.io/<you>/medusa-backend:latest`.

Sample GitHub Actions workflow:

```yaml
name: Publish Medusa image
on:
  push:
    branches: [main]
    paths: ['apps/backend/**']
jobs:
  publish:
    runs-on: ubuntu-latest
    permissions: { contents: read, packages: write }
    steps:
      - uses: actions/checkout@v4
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v6
        with:
          context: ./apps/backend
          file: ../../deploy/Dockerfile.medusa
          push: true
          tags: ghcr.io/${{ github.repository_owner }}/medusa-backend:latest
```

Option 2 — **Docker Hub** (also free for public):
- Create Docker Hub account, push manually from a machine that has Docker.

Option 3 — **Skip Medusa for now**, deploy only Postgres + Redis (public images), use as a remote DB while local Medusa keeps running on the laptop.

## Compose for production (once Medusa image is published)

`deploy/docker-compose.api.yml`:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: ecom_postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: medusa
      POSTGRES_PASSWORD: REPLACE_ME
      POSTGRES_DB: medusa_db
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    container_name: ecom_redis
    restart: unless-stopped

  medusa:
    image: ghcr.io/2ngryprogrammer/medusa-backend:latest   # <-- your published image
    container_name: ecom_medusa
    restart: unless-stopped
    depends_on: [postgres, redis]
    environment:
      NODE_ENV: production
      DATABASE_URL: postgres://medusa:REPLACE_ME@postgres:5432/medusa_db
      REDIS_URL: redis://redis:6379
      JWT_SECRET: REPLACE_ME
      COOKIE_SECRET: REPLACE_ME
      STORE_CORS: https://srv1162617.hstgr.cloud
      ADMIN_CORS: https://srv1162617.hstgr.cloud
      AUTH_CORS: https://srv1162617.hstgr.cloud
      MEDUSA_BACKEND_URL: https://srv1162617.hstgr.cloud
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

⚠️ Caddyfile cannot be uploaded via the Docker API directly. Either:
- Use Traefik with labels (no file needed)
- Bake the Caddyfile into a custom caddy image (also requires public image)
- Skip the reverse proxy, expose Medusa on 80 directly via port mapping

## Deploy one-liner (PowerShell)

```powershell
$token = "<your-token>"
$compose = Get-Content "deploy\docker-compose.api.yml" -Raw
$body = @{ project_name = "ecommerce-mvp"; content = $compose } | ConvertTo-Json
$h = @{ Authorization = "Bearer $token"; "Content-Type" = "application/json"; Accept = "application/json" }
Invoke-RestMethod -Uri "https://developers.hostinger.com/api/vps/v1/virtual-machines/1162617/docker" -Method POST -Headers $h -Body $body
```

## Bootstrap data (no SSH needed)

Medusa needs migrations + admin user + seed on first boot. Use the Dockerfile entrypoint to run them automatically:

```dockerfile
CMD ["sh", "-c", "npx medusa db:migrate && (npx medusa user -e $ADMIN_EMAIL -p $ADMIN_PASSWORD || true) && npm run start"]
```

Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` env vars in the compose. The migration + user creation are idempotent (`|| true` covers re-runs).

For multi-category seed, add a one-shot service that runs on first deploy:

```yaml
  seed:
    image: ghcr.io/2ngryprogrammer/medusa-backend:latest
    depends_on: [medusa]
    command: sh -c "sleep 30 && npx medusa exec ./src/scripts/seed-multi-category.ts && touch /tmp/.seeded || true"
    environment:
      DATABASE_URL: postgres://medusa:REPLACE_ME@postgres:5432/medusa_db
```

## Get the publishable API key without SSH

Once Medusa is running, hit its Admin API:

```bash
# Auth
curl -X POST https://srv1162617.hstgr.cloud/auth/user/emailpass \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"REPLACE_ME"}'
# returns { "token": "..." }

# List publishable API keys
curl https://srv1162617.hstgr.cloud/admin/api-keys?types[]=publishable \
  -H "Authorization: Bearer <token>"
```

## Monitoring without SSH

```powershell
# Logs (tail last 200 lines of all services)
$h = @{ Authorization = "Bearer $token"; Accept = "application/json" }
Invoke-RestMethod -Uri "https://developers.hostinger.com/api/vps/v1/virtual-machines/1162617/docker/ecommerce-mvp/logs?lines=200" -Headers $h

# Container list
Invoke-RestMethod -Uri "https://developers.hostinger.com/api/vps/v1/virtual-machines/1162617/docker/ecommerce-mvp/containers" -Headers $h

# Restart
Invoke-RestMethod -Method POST -Uri "https://developers.hostinger.com/api/vps/v1/virtual-machines/1162617/docker/ecommerce-mvp/restart" -Headers $h
```

## Summary

✅ **Path is viable** — confirmed via successful nginx test deploy.
⚠️ **Requires one-time setup**: publish our Medusa Docker image to a registry (Docker Hub or ghcr.io). Once that's done, all subsequent deploys are pure API.
🟢 **SSH becomes optional** — useful only for debugging, no longer a blocker for deploys.
