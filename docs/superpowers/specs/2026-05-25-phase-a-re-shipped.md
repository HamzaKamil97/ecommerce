# Phase A-Re shipped — Hanoot UI reskin + breadth complete

**Status:** 10 commits on main (A-Re1..A-Re9 + this handoff). `npx tsc --noEmit` clean. Ready for phone walkthrough.

## What's in the box

### Foundation (visual repositioning)
| Commit | What |
|---|---|
| `b2bcfd9` A-Re1 | Tokens: ivory bg + gold accent + ink text + Manrope/JetBrainsMono/NotoSansArabic |
| `b78442c` A-Re2 | Butler → Najma (نجمة) — file renames, star icon, first-person voice on 5 home strings |
| `2a39601` A-Re3 | Hanoot Pass tier card on Profile — Fidda active, Dhahab + Khass "Coming soon" |
| `7771f45` A-Re4 | 9 categories (was 5) + HANOOT SELECT gold badge on 3 verified shops |

### Breadth (new screens / capabilities)
| Commit | What |
|---|---|
| `2500290` A-Re5 | Najma chat — real OpenAI `gpt-4o-mini` client, key-optional fallback to "launching soon ✨" |
| `a649117` A-Re6 | Najma vision — Fridge / Receipt / Photo Search via `gpt-4o-mini` vision, key-optional |
| `9d55dbc` A-Re7 | Shared cart UI — participants + invite link via Share sheet (real-time sync gated) |
| `9e5947e` A-Re8 | Wait-games hub — Souk Wheel + Recipe of the Day working; 7 locked tiles |
| `8783cc9` A-Re9 | 8 Coming-soon locks: Group Gift, Wedding Registry, Refer, Gift Occasions, Family Shopping, Seasonal, Curated Boxes, Hanoot Concierge |

### Total
- **10 commits** on main this session.
- **~30 new files** (components, screens, lib, data).
- **~200 new i18n keys** in EN + AR.
- **Zero TS errors.**

## How to test on phone

Native (Expo Go):
```
cd mobile && set REACT_NATIVE_PACKAGER_HOSTNAME=<your-lan-ip> && npx expo start --lan --port 8081
```
Then scan the QR or paste `exp://<your-lan-ip>:8081` in Expo Go.

Web preview (when phone is offline / network flaky):
```
cd mobile && npx expo export --platform web --output-dir web-build
cd mobile && node _serve-web.cjs    # serves at http://localhost:19009
```

## To unlock AI features (optional)

Create `mobile/.env` with:
```
EXPO_PUBLIC_OPENAI_API_KEY=sk-...your-key...
```

After restart, Najma chat (A-Re5) + vision (A-Re6) start hitting OpenAI. Without the key both surfaces show "I'm launching soon ✨".

Estimated cost: ~$0.001 per chat message, ~$0.003 per vision call (`gpt-4o-mini`).

## What's gated to Phase D

- Real-time multi-device shared cart sync (Phase D5)
- Backend AI proxy + caching + rate limits (Phase D3)
- Real recommender for For-you (Phase D7)
- Real ratings / order tracking from `/store/orders` (Phase D4)
- HomeLayout served from `/store/home-layout` (Phase D1)
- Real cart → checkout → place-order against Medusa (Phase D2)

## Notes for the next session

- Souk Wheel visual is a bit cluttered (8 text labels around a small wheel). User may want a larger wheel or fewer segments.
- Khass "Layan" concierge UI is locked. When unlocking, decide: who actually staffs Layan day 1?
- "Game-controller" Ionicons name verified — was used on profile menu row.
- The static-export web server moved from `web-build/_serve.cjs` (gitignored) to `mobile/_serve-web.cjs` (tracked) so it survives re-exports.
