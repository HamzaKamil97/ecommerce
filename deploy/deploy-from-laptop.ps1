# Run from the laptop once SSH to the VPS works.
# Pushes code, writes env file, builds + starts the stack, creates admin user, runs seed,
# extracts the publishable API key, and writes it back to mobile/.env.

$ErrorActionPreference = "Stop"

$key  = "$env:USERPROFILE\.ssh\hostinger_ed25519"
$host_ip = "72.62.49.100"
$root = "D:\Personal\08_Ecommerce app\ecommerce-mvp"

function Remote([string]$cmd) {
    Write-Host ">>> $cmd" -ForegroundColor Cyan
    ssh -i $key -o StrictHostKeyChecking=accept-new "root@${host_ip}" $cmd
    if ($LASTEXITCODE -ne 0) { throw "Remote command failed: $cmd" }
}

Write-Host "=== 1. Sanity check SSH ===" -ForegroundColor Yellow
Remote "hostname; uname -a"

Write-Host "`n=== 2. Sync project tree (excluding node_modules/.git/.env) ===" -ForegroundColor Yellow
$staging = "$env:TEMP\ecommerce-mvp-deploy"
if (Test-Path $staging) { Remove-Item $staging -Recurse -Force }
robocopy $root $staging /E /XD node_modules .git .expo .vscode .claude /XF .env *.log /NFL /NDL /NJH /NJS /NC /NS | Out-Null
Write-Host "Staging copy ready at $staging"

# Push via scp -r (slow but always available); for repeat deploys switch to rsync via WSL
scp -i $key -o StrictHostKeyChecking=accept-new -r $staging "root@${host_ip}:/root/ecommerce-mvp"

Write-Host "`n=== 3. Install Docker + Node if missing ===" -ForegroundColor Yellow
Remote @"
if ! command -v docker >/dev/null; then
  curl -fsSL https://get.docker.com | sh
  systemctl enable --now docker
fi
if ! command -v node >/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
docker --version
node --version
"@

Write-Host "`n=== 4. Write production env file on VPS ===" -ForegroundColor Yellow
Remote @"
cat > /root/ecommerce-mvp/deploy/.env.prod <<'ENVEOF'
POSTGRES_USER=medusa
POSTGRES_DB=medusa_db
POSTGRES_PASSWORD=mEjqhqVfdUdrnOEfkpuI1TxXDULNh4BC
JWT_SECRET=mzDzR9CkNtcvfScUriBnBJVLLxt2BQ1eb0GDkHSh36Ig5cVA
COOKIE_SECRET=7eHgFP9gSucrm80oieh1WSnAa0x1oqWUomvYDxNBNWusAoCq
MEDUSA_BACKEND_URL=https://srv1162617.hstgr.cloud
STORE_CORS=https://srv1162617.hstgr.cloud,http://192.168.33.6:8081,http://192.168.33.6:19006,exp://192.168.33.6:8081
ADMIN_CORS=https://srv1162617.hstgr.cloud
AUTH_CORS=https://srv1162617.hstgr.cloud,http://192.168.33.6:8081,http://192.168.33.6:19006,exp://192.168.33.6:8081
ENVEOF
chmod 600 /root/ecommerce-mvp/deploy/.env.prod
"@

Write-Host "`n=== 5. Build + start the stack ===" -ForegroundColor Yellow
Remote "bash /root/ecommerce-mvp/deploy/deploy.sh"

Write-Host "`n=== 6. Wait for Medusa /health (up to 3 min) ===" -ForegroundColor Yellow
Remote @"
for i in `$(seq 1 36); do
  if curl -sf http://localhost:9000/health >/dev/null 2>&1; then
    echo 'Medusa is up.'
    break
  fi
  echo \"  [`$i] waiting...\"
  sleep 5
done
"@

Write-Host "`n=== 7. Create admin user ===" -ForegroundColor Yellow
Remote "cd /root/ecommerce-mvp/deploy && docker compose -f docker-compose.prod.yml exec -T medusa npx medusa user -e 2ngryprogrammer@gmail.com -p 't5Bz3kJ4TnwhMPYXwaazyr9K' || echo 'Admin may already exist'"

Write-Host "`n=== 8. Run multi-category seed ===" -ForegroundColor Yellow
Remote "cd /root/ecommerce-mvp/deploy && docker compose -f docker-compose.prod.yml exec -T medusa npx medusa exec ./src/scripts/seed-multi-category.ts || echo 'Seed may have run already'"

Write-Host "`n=== 9. Extract publishable API key ===" -ForegroundColor Yellow
$apiKey = ssh -i $key "root@${host_ip}" "cd /root/ecommerce-mvp/deploy && docker compose -f docker-compose.prod.yml exec -T postgres psql -U medusa -d medusa_db -tA -c `"SELECT token FROM api_key WHERE type = 'publishable' LIMIT 1;`" 2>/dev/null | tr -d '[:space:]'"
Write-Host "Publishable key: $apiKey"

Write-Host "`n=== 10. Write mobile/.env on laptop ===" -ForegroundColor Yellow
$mobileEnv = @"
EXPO_PUBLIC_MEDUSA_BACKEND_URL=https://srv1162617.hstgr.cloud
EXPO_PUBLIC_MEDUSA_PUBLISHABLE_API_KEY=$apiKey
"@
$mobileEnv | Set-Content "$root\mobile\.env" -Encoding ASCII
Write-Host "mobile/.env updated."

Write-Host "`n=== 11. Write storefront/.env.local on laptop ===" -ForegroundColor Yellow
$storefrontEnv = @"
MEDUSA_BACKEND_URL=https://srv1162617.hstgr.cloud
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=$apiKey
NEXT_PUBLIC_BASE_URL=http://localhost:8000
NEXT_PUBLIC_DEFAULT_REGION=us
REVALIDATE_SECRET=$([Guid]::NewGuid().ToString())
"@
$storefrontEnv | Set-Content "$root\backend\apps\storefront\.env.local" -Encoding ASCII
Write-Host "storefront/.env.local updated."

Write-Host "`n=== Done! ===" -ForegroundColor Green
Write-Host "Backend:    https://srv1162617.hstgr.cloud"
Write-Host "Admin UI:   https://srv1162617.hstgr.cloud/app"
Write-Host "  user:     2ngryprogrammer@gmail.com"
Write-Host "  pass:     t5Bz3kJ4TnwhMPYXwaazyr9K (change after first login)"
Write-Host "Mobile:     cd mobile && npx expo start"
Write-Host "Storefront: cd backend/apps/storefront && npm run dev"
