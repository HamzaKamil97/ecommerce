# Next session — what's left

This file is the running TODO across sessions. Update or delete items as they land.

## 1. Set the Postgres password (REQUIRED before backend can boot)

PostgreSQL 16 is installed and running at `D:\Programs\PostgreSQL\16\`.
The silent winget install generated a random superuser password — we don't know it.
The fix: temporarily switch to `trust` auth, reset the password, restart the service.

**Open PowerShell as Administrator** (Start menu → right-click PowerShell → "Run as administrator"), then paste this block:

```powershell
$hba = "D:\Programs\PostgreSQL\16\data\pg_hba.conf"
Copy-Item $hba "$hba.bak" -Force
(Get-Content $hba -Raw) `
  -replace 'host\s+all\s+all\s+127\.0\.0\.1/32\s+scram-sha-256', 'host    all             all             127.0.0.1/32            trust' `
  -replace 'host\s+all\s+all\s+::1/128\s+scram-sha-256',        'host    all             all             ::1/128                 trust' `
  | Set-Content -Path $hba -Encoding ASCII

Restart-Service postgresql-x64-16 -Force
Start-Sleep -Seconds 3

# Reset postgres user password, create medusa user + db
& "D:\Programs\PostgreSQL\16\bin\psql.exe" -U postgres -h localhost -c "ALTER USER postgres PASSWORD 'postgres';"
& "D:\Programs\PostgreSQL\16\bin\psql.exe" -U postgres -h localhost -c "CREATE USER medusa WITH PASSWORD 'medusa';"
& "D:\Programs\PostgreSQL\16\bin\psql.exe" -U postgres -h localhost -c "CREATE DATABASE medusa_db OWNER medusa;"

# Restore scram-sha-256 auth
Copy-Item "$hba.bak" $hba -Force
Remove-Item "$hba.bak" -Force
Restart-Service postgresql-x64-16 -Force
```

After this:
- `postgres` superuser password is `postgres` (change before prod)
- `medusa` user password is `medusa`
- `medusa_db` database exists, owned by `medusa`

Verify:
```powershell
$env:PGPASSWORD = "medusa"
& "D:\Programs\PostgreSQL\16\bin\psql.exe" -U medusa -h localhost -d medusa_db -c "SELECT 'ok';"
```

## 2. Run Medusa migrations + create admin user

Once Postgres is reachable:

```powershell
cd "D:\Personal\08_Ecommerce app\ecommerce-mvp\backend"
# .env file should already exist from create-medusa-app, with DATABASE_URL pointing to medusa_db
# If not, copy .env.example to .env
npx medusa db:migrate
npx medusa user -e admin@example.com -p supersecret
```

## 3. Start the backend

```powershell
cd "D:\Personal\08_Ecommerce app\ecommerce-mvp\backend"
npm run dev
```

Admin dashboard: http://localhost:9000/app
First login: `admin@example.com` / `supersecret`

In admin → **Settings → Publishable API Keys** → create one → copy the value.

## 4. Configure mobile + run

```powershell
cd "D:\Personal\08_Ecommerce app\ecommerce-mvp\mobile"
copy .env.example .env
# Edit .env:
#   EXPO_PUBLIC_MEDUSA_BACKEND_URL=http://192.168.33.6:9000  (verify with `ipconfig`)
#   EXPO_PUBLIC_MEDUSA_PUBLISHABLE_API_KEY=<paste from step 3>
npx expo start
```

Scan the QR with **Expo Go** on your phone (same Wi-Fi as laptop).

## 5. Add sample products

Either in Medusa Admin UI manually, or run the included seed (if present):

```powershell
cd backend
npx medusa exec ./src/scripts/seed.ts
```

## Known gaps (still TODO)

- **Web storefront** (Next.js): not scaffolded yet. Plan: `npx create-next-app web --typescript`, then port the Medusa nextjs-starter, or clone `medusajs/nextjs-starter-medusa` directly. Same backend, SEO/SSR friendly for non-app users.
- **Multi-tenant architecture**: see `docs/multi-tenant-architecture.md` for the hybrid (marketplace + per-tenant white-label) plan.
- **AI features**: see `docs/ai-features.md` for prioritized roadmap. Phase A is semantic search + AI descriptions + auto-categorization + vision moderation.
- **Checkout flow**: shipping address form + payment selection. Currently `checkout.tsx` calls `completeCart` and expects a manual payment provider configured.
- **OAuth (Google/Facebook)**: placeholder buttons in `app/auth/login.tsx` — Phase 3. Wire into Next.js storefront too.
- **Image upload** for vendor products: Phase 4.
- **Approval workflow**: see `approval-design.md` — Phase 3.
- **POS / ERP sync**: see `pos-integration.md` — Phase 6.

## Node version note

You're on Node v25. Medusa v2 officially targets Node 20 LTS. If `npm run dev` in `backend/` throws cryptic errors:

```powershell
# Install nvm-windows from https://github.com/coreybutler/nvm-windows
nvm install 20
nvm use 20
```

Then re-run the backend setup.

## Hostinger deployment (when ready)

1. Provision Postgres on Hostinger → get `DATABASE_URL`.
2. Push backend repo, set env vars (rotate secrets).
3. Run `npx medusa db:migrate` on first deploy.
4. Update `STORE_CORS` / `ADMIN_CORS` / `AUTH_CORS` to include production origins.
5. Build: `npm run build && npm run start`.
6. For mobile: rebuild via EAS with the production `EXPO_PUBLIC_MEDUSA_BACKEND_URL`.
