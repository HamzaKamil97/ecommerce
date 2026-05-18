# Building & Installing the Mobile App

Three paths, fastest first:

## A) Expo Go (no build, 1 minute, dev only)

For testing the app on your real phone while you develop:

```powershell
cd "D:\Personal\08_Ecommerce app\ecommerce-mvp\mobile"
npx expo start
```

1. Install **Expo Go** app from App Store / Play Store on your phone
2. Phone + laptop on same Wi-Fi
3. Scan the QR code with Expo Go (Android) or Camera app (iOS)
4. App loads, hot-reloads as you edit code

⚠️ Expo Go can't install plugins that need native code (e.g. push notifications with `expo-notifications` config). For that, use the dev build below.

## B) Dev Build (custom dev client, 15 min first build)

A real APK / IPA that includes the dev tools + your native config. Best for actual development.

```powershell
cd "D:\Personal\08_Ecommerce app\ecommerce-mvp\mobile"
npm install -g eas-cli              # one-time
eas login                            # opens browser, sign up free at expo.dev
eas init                             # creates EAS project; updates app.json with projectId
eas build --profile development --platform android
```

After ~10-15 min, EAS shows a QR / link. Open on your phone → installs.

For iOS dev build: needs an Apple Developer account ($99/year) OR run in iOS simulator only.

## C) Preview Build — share-ready APK (production-like)

For sharing the app with a friend / tester. Builds an `.apk` file you can directly install.

```powershell
eas build --profile preview --platform android
```

After build (~15 min), the EAS dashboard gives you a download URL — open on phone → "Download" → install. Allow "Unknown sources" if prompted.

## D) Production submission

### Android (Google Play)

You need a Google Play Console account ($25 one-time).

```powershell
eas build --profile production --platform android   # produces .aab
eas submit --profile production --platform android
```

### iOS (App Store)

You need:
- Apple Developer Program ($99/year)
- App Store Connect entry created

```powershell
eas build --profile production --platform ios       # produces .ipa
eas submit --profile production --platform ios
```

## Where is the package?

After every build, the artifact is hosted at **expo.dev → your project → Builds**. Each build has:
- A unique download URL (permanent until you delete it)
- A QR code that installs directly on a phone
- Build logs

Locally, you can also run `eas build:list` to see all recent builds.

## What `eas init` does

When you run `eas init` for the first time:
1. Creates a project on expo.dev with your Expo account
2. Writes the **project id** into `app.json` → `extra.eas.projectId`
3. Sets `updates.url` for OTA updates

After that, `eas build` is one command per build.

## Updating the app without rebuilding

After the first build is installed, you can push code changes Over-The-Air with **EAS Update**:

```powershell
eas update --channel preview --message "fix: address book layout"
```

Users get the update next time they open the app — no re-download needed.

## Troubleshooting

| Problem | Fix |
|---|---|
| `bundle identifier` already in use on iOS | Change `ios.bundleIdentifier` in `app.json` to something unique like `com.yourname.bazaari` |
| Android `package` collision | Same — change `android.package` |
| Build fails on Node version | `.npmrc` is auto-handled by EAS; if local issues, use Node 20 LTS |
| Push notifications don't work in Expo Go | Expected — use Dev Build (option B) |
| Build credentials lost | `eas credentials` lets you reset / regenerate |
