# Installation Guide — Mobile + Web

How to install / package the customer apps for testing and distribution.

## Quick map

| What you want | How |
|---|---|
| **Test on your phone, no install** | Expo Go app + scan QR (dev) |
| **Install Android APK on your phone** | EAS Build → download `.apk` |
| **Submit to Google Play** | EAS Build (AAB) → Play Console |
| **Install iOS on your iPhone (no Mac)** | EAS Build + TestFlight |
| **Submit to App Store** | EAS Build + Transporter or `eas submit` |
| **Open the web app** | http://localhost:8000/dk (dev) — Vercel/Netlify (prod) |

---

## Option 1 — Quickest: Expo Go on your phone (DEV ONLY)

**This is what you should use today, no build required.**

### Android
1. Open Play Store → install **Expo Go** ([play.google.com/store/apps/details?id=host.exp.exponent](https://play.google.com/store/apps/details?id=host.exp.exponent))
2. Phone and laptop on **same Wi-Fi**.
3. On laptop:
   ```powershell
   cd "D:\Personal\08_Ecommerce app\ecommerce-mvp\mobile"
   npx expo start
   ```
4. Scan the QR code with Expo Go (the home tab has a built-in scanner).
5. The app loads — your code is being hot-reloaded over the network.

### iOS (iPhone / iPad)
1. App Store → install **Expo Go** ([apps.apple.com/app/expo-go/id982107779](https://apps.apple.com/app/expo-go/id982107779)).
2. Same Wi-Fi.
3. Run `npx expo start` on laptop.
4. Open the **Camera app** → point at the QR → tap the banner that pops up to open in Expo Go.

### Troubleshooting Expo Go
- **"Couldn't load"** → your laptop's LAN IP probably changed. Edit `mobile/.env`:
  ```
  EXPO_PUBLIC_MEDUSA_BACKEND_URL=http://<new-LAN-ip>:9000
  ```
  Run `ipconfig` on Windows to find it (currently `192.168.33.6`).
- **"Network response timed out"** → laptop firewall blocking Metro. Allow Node.js through Windows Firewall once.
- **"Could not find a connection"** → start Metro with `npx expo start --tunnel` to route via Expo's relay (slower, but works across networks).

### Where the code runs
- App code lives in `mobile/app/` (file-based routing).
- Backend code is `backend/apps/backend/`.
- Changes to mobile `.tsx` files reload instantly via Fast Refresh.

---

## Option 2 — Build an actual Android APK (preview / sharing)

You need an **Expo account** (free). Sign up at [expo.dev](https://expo.dev/).

### One-time setup
```powershell
cd "D:\Personal\08_Ecommerce app\ecommerce-mvp\mobile"
npm install -g eas-cli
eas login            # uses your expo.dev account
eas init             # creates the EAS project, writes app.json projectId
```

### Configure a preview profile
Create `mobile/eas.json`:
```json
{
  "cli": { "version": ">= 0.60.0" },
  "build": {
    "preview": {
      "android": { "buildType": "apk", "distribution": "internal" },
      "ios": { "simulator": false, "distribution": "internal" }
    },
    "production": {
      "android": { "buildType": "app-bundle" },
      "ios": {}
    }
  }
}
```

### Build the APK
```powershell
eas build --profile preview --platform android
```
- Build runs on EAS cloud (free tier limit: ~30 builds/month).
- Takes ~10-15 min.
- Returns a URL — open in browser → "Download" the `.apk`.

### Install the APK on your phone
1. Download the `.apk` to your phone (email it, AirDrop alternative, USB cable, or scan the QR EAS shows after build).
2. Tap the APK → Android will ask to "Install from unknown source" → accept.
3. App icon appears — open it.

**Where the APK lives:** Expo hosts it on `expo.dev` under your project's "Builds" tab. Each build has a permanent download URL until you delete it.

---

## Option 3 — Build an iOS app for your iPhone (no Mac needed)

You need:
- Expo account (free)
- **Apple Developer Program** account ($99/year) for installing on a real device OR submitting to App Store

### Internal TestFlight build
```powershell
eas build --profile preview --platform ios
```
EAS will prompt to:
- Use your existing Apple Developer credentials, OR
- Let EAS auto-provision a certificate + provisioning profile.

After build (~15-20 min), it gives you a TestFlight install link:
1. Install **TestFlight** on your iPhone from App Store.
2. Open the link → "Accept" the invite → install build.

### Without a paid Apple Dev account (simulator only)
```powershell
eas build --profile preview --platform ios --local
```
This builds an `.app` you can run in an iOS simulator (requires macOS).

---

## Option 4 — Production submission

### Google Play
```powershell
eas build --profile production --platform android   # produces .aab
eas submit --profile production --platform android  # uploads to Play Console
```
You'll need:
- A Google Play Console account ($25 one-time).
- A signed AAB (EAS handles signing).
- App listing assets (icon, screenshots, description) — see `mobile/app.json` for icon paths.

### App Store
```powershell
eas build --profile production --platform ios
eas submit --profile production --platform ios
```
Needs Apple Developer Program ($99/year) + app listing in App Store Connect.

---

## Web storefront (Next.js)

### Development
```powershell
cd "D:\Personal\08_Ecommerce app\ecommerce-mvp\backend\apps\storefront"
npm run dev
# Opens on http://localhost:8000
```

### Production build
```powershell
npm run build
npm run start
```

### Deploy to Vercel (fastest)
1. Push `backend/apps/storefront/` to a GitHub repo.
2. [vercel.com/new](https://vercel.com/new) → import the repo.
3. Set env vars in Vercel dashboard:
   - `MEDUSA_BACKEND_URL=https://<your-vps-domain>`
   - `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=<key>`
   - `NEXT_PUBLIC_BASE_URL=https://<vercel-domain>`
   - `NEXT_PUBLIC_DEFAULT_REGION=dk`
4. Deploy — free tier covers a lot.

### Deploy to your Hostinger VPS (alongside backend)
The Docker Compose stack at `deploy/docker-compose.prod.yml` runs Caddy as reverse proxy. Add the storefront as another service:

```yaml
  storefront:
    image: ghcr.io/<you>/medusa-storefront:latest
    container_name: ecom_storefront
    restart: unless-stopped
    depends_on: [medusa]
    environment:
      MEDUSA_BACKEND_URL: https://srv1162617.hstgr.cloud
      NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY: <key>
      NEXT_PUBLIC_BASE_URL: https://srv1162617.hstgr.cloud
      NEXT_PUBLIC_DEFAULT_REGION: dk
    expose: ["8000"]
```

Update the Caddyfile to route `/` (root) to storefront and `/admin` + `/store/*` to medusa.

---

## Backend deployment

See [`deploy-via-docker-api.md`](./deploy-via-docker-api.md) — deploys to your Hostinger VPS via the Docker API (no SSH needed).

---

## Where to find every package / artifact

| Artifact | Location |
|---|---|
| Mobile source code | `mobile/` |
| Expo dev QR | terminal running `npx expo start` |
| Android APK (preview) | expo.dev → your project → Builds tab |
| iOS TestFlight build | App Store Connect → TestFlight tab |
| Web storefront source | `backend/apps/storefront/` |
| Backend source | `backend/apps/backend/` |
| Production secrets | `docs/credentials.md` (git-ignored) |
| Docker images (when published) | `ghcr.io/<you>/...` or Docker Hub |
| Postgres data (local) | `local-pg-data/` |

---

## First-time setup checklist (for a new device / fresh checkout)

```powershell
# Backend
cd "D:\Personal\08_Ecommerce app\ecommerce-mvp\backend"
npm install                               # installs Medusa, storefront, all deps

# Postgres
& "D:\Programs\PostgreSQL\16\bin\pg_ctl.exe" start `
  -D "D:\Personal\08_Ecommerce app\ecommerce-mvp\local-pg-data" `
  -l "D:\Personal\08_Ecommerce app\ecommerce-mvp\local-pg.log" -w

# Backend migrate + seed (idempotent)
cd apps\backend
npx medusa db:migrate
npx medusa user -e 2ngryprogrammer@gmail.com -p 't5Bz3kJ4TnwhMPYXwaazyr9K'
npx medusa exec ./src/scripts/seed-multi-category.ts

# Run all 3 servers (in 3 terminals)
# T1
cd "D:\Personal\08_Ecommerce app\ecommerce-mvp\backend\apps\backend"; npm run dev
# T2
cd "D:\Personal\08_Ecommerce app\ecommerce-mvp\backend\apps\storefront"; npm run dev
# T3
cd "D:\Personal\08_Ecommerce app\ecommerce-mvp\mobile"; npx expo start
```

Then in Expo Go, scan the QR.
