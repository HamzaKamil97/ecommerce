# Deploy steps for the Hostinger VPS

Run these once SSH to `root@72.62.49.100` is working.

## 0. Pre-flight (from your laptop)

```powershell
$key = "$env:USERPROFILE\.ssh\hostinger_ed25519"

# Sanity check SSH
ssh -i $key root@72.62.49.100 "hostname; uname -a; docker --version 2>&1; node --version 2>&1"
```

If `docker` is missing the post-install script didn't run — install manually:
```bash
ssh -i $key root@72.62.49.100 'curl -fsSL https://get.docker.com | sh && systemctl enable --now docker'
ssh -i $key root@72.62.49.100 'curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt-get install -y nodejs git'
```

## 1. Sync the project to the VPS

PowerShell SCP works on Windows 11. Skip `node_modules/` and `.git/`:

```powershell
$src  = "D:\Personal\08_Ecommerce app\ecommerce-mvp"
$key  = "$env:USERPROFILE\.ssh\hostinger_ed25519"

# Use scp to push everything except heavy / local-only dirs.
# (For a recurring deploy switch to rsync via WSL.)
$tmp = "$env:TEMP\ecommerce-mvp-deploy"
if (Test-Path $tmp) { Remove-Item $tmp -Recurse -Force }
Copy-Item $src $tmp -Recurse -Exclude "node_modules",".git",".expo",".env","*.log"

scp -i $key -r $tmp root@72.62.49.100:/root/ecommerce-mvp
```

Or with rsync (WSL/Git Bash):
```bash
rsync -avz --exclude node_modules --exclude .git --exclude .expo --exclude '*.log' \
  -e "ssh -i ~/.ssh/hostinger_ed25519" \
  "/d/Personal/08_Ecommerce app/ecommerce-mvp/" \
  root@72.62.49.100:/root/ecommerce-mvp/
```

## 2. Write the production env file on the VPS

```bash
ssh -i $key root@72.62.49.100
# Now on VPS:
cat > /root/ecommerce-mvp/deploy/.env.prod <<'EOF'
POSTGRES_USER=medusa
POSTGRES_DB=medusa_db
POSTGRES_PASSWORD=mEjqhqVfdUdrnOEfkpuI1TxXDULNh4BC
JWT_SECRET=mzDzR9CkNtcvfScUriBnBJVLLxt2BQ1eb0GDkHSh36Ig5cVA
COOKIE_SECRET=7eHgFP9gSucrm80oieh1WSnAa0x1oqWUomvYDxNBNWusAoCq
MEDUSA_BACKEND_URL=https://srv1162617.hstgr.cloud
STORE_CORS=https://srv1162617.hstgr.cloud,http://192.168.33.6:8081,http://192.168.33.6:19006,exp://192.168.33.6:8081
ADMIN_CORS=https://srv1162617.hstgr.cloud
AUTH_CORS=https://srv1162617.hstgr.cloud,http://192.168.33.6:8081,http://192.168.33.6:19006,exp://192.168.33.6:8081
EOF
chmod 600 /root/ecommerce-mvp/deploy/.env.prod
```

## 3. Register the POS module in medusa-config.ts

On the VPS:
```bash
cd /root/ecommerce-mvp/backend/apps/backend
# Add a module entry to medusa-config.ts under the modules array:
#   { resolve: "./src/modules/pos" }
# Edit with: nano medusa-config.ts
```

## 4. Build & run

```bash
cd /root/ecommerce-mvp/deploy
bash deploy.sh
```

The script builds images, starts containers, and waits for Medusa's `/health` endpoint.

## 5. Create admin user

```bash
docker compose -f docker-compose.prod.yml exec medusa \
  npx medusa user -e 2ngryprogrammer@gmail.com -p 't5Bz3kJ4TnwhMPYXwaazyr9K'
```

## 6. Run multi-category seed

```bash
docker compose -f docker-compose.prod.yml exec medusa \
  npx medusa exec ./src/scripts/seed-multi-category.ts
```

## 7. Get the publishable API key

```bash
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U medusa -d medusa_db -tA -c \
  "SELECT token FROM api_key WHERE type = 'publishable' LIMIT 1;"
```

Copy that token.

## 8. Update mobile env on your laptop

Edit `D:\Personal\08_Ecommerce app\ecommerce-mvp\mobile\.env`:

```
EXPO_PUBLIC_MEDUSA_BACKEND_URL=https://srv1162617.hstgr.cloud
EXPO_PUBLIC_MEDUSA_PUBLISHABLE_API_KEY=<paste token here>
```

(If HTTPS isn't yet issued because Caddy is still negotiating, use `http://72.62.49.100:9000` temporarily.)

## 9. Run the mobile app

```powershell
cd "D:\Personal\08_Ecommerce app\ecommerce-mvp\mobile"
npx expo start
```

Scan QR with Expo Go on your phone (same Wi-Fi as laptop, OR over the internet if you tunnel via Expo).

## Health checks

- Backend health: `curl https://srv1162617.hstgr.cloud/health`
- Admin UI: `https://srv1162617.hstgr.cloud/app`
- Store API products: `curl https://srv1162617.hstgr.cloud/store/products -H "x-publishable-api-key: <key>"`
- POS module: `curl https://srv1162617.hstgr.cloud/admin/pos` (after admin login → grab cookie)

## Logs / troubleshooting

```bash
docker compose -f /root/ecommerce-mvp/deploy/docker-compose.prod.yml logs -f medusa
docker compose -f /root/ecommerce-mvp/deploy/docker-compose.prod.yml logs -f caddy
docker compose -f /root/ecommerce-mvp/deploy/docker-compose.prod.yml logs -f postgres
```

If Caddy can't get a Let's Encrypt cert:
- Ensure port 80 is reachable from the public internet (Let's Encrypt validates over HTTP)
- DNS for `srv1162617.hstgr.cloud` must resolve to 72.62.49.100 (it should — Hostinger's reverse DNS)
- Fallback: edit `Caddyfile` to use `:80` only (no auto HTTPS) and run mobile on HTTP for now
