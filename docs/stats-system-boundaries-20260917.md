# Stats System Boundaries

## Purpose

This document separates production routes, public data loading, account APIs, local fixtures, and legacy surfaces. New work should land in the matching boundary instead of adding another parallel implementation.

## Production boundaries

### Public event data

- Owner: `src/lib/db.js`, `src/lib/publicJsonRequest.js`, `src/config/seasons.js`
- Sources, in order: configured public URL, `/api/admin-public/...` proxy, direct public URL, then the season local snapshot.
- Local snapshots are review/fallback data, not an account or write API.
- Any UI showing a snapshot source must use `getDbSource()` and preserve the source status.

### Account and competition APIs

- Owner: `src/features/auth/platformApi.js` and feature-specific `*Api.js` modules.
- Browser base: `/api/platform`.
- Vite rewrites `/api/platform/*` to the System `/api/*` routes.
- All account, registration, weekly competition, coordination, and live-room writes go through `platformRequest()`.
- Do not add direct `fetch()` calls for account or competition writes.

### Weekly live room

- Route: `/me/matches/:matchId/room`
- Owner: `src/features/weekly-competition/WeeklyLiveRoomPage.jsx`
- API: `liveRoomApi.js`, `useWeeklyLiveRoom.js`, and the System `weeklyLiveRoom` routes.
- Includes opening selection, map bans, live phases, communication, caster access, and result handoff.

### Legacy/general match room

- Route: `/matches/:matchId/room`
- Owner: `src/pages/matches/MatchRoomPage.jsx`
- API: `src/features/match-room/matchRoomApi.js` and the `match-rooms` endpoints.
- It is a separate state model, not an alternate client for the weekly live-room API.
- The old `/matches/:matchId/room` route is retired from the production router.
- Weekly matches use `/me/matches/:matchId/room` and the `weekly-live-rooms` API only.

## Non-production boundaries

- `src/pages/dev/**` and `scripts/preview*.mjs` are local review tools only.
- `FCR26-TEST-ROOM*` handling in `matchRoomApi.js` is a local fixture path and must never be used as a production fallback.
- `src/features/kpr-design` and `src/features/fd-design` provide presentation and preview layers; they must not own data loading or API calls.
- `src/EsportsManagerClassic` remains a legacy product surface. `EsportsManagerNext` is not a production route.

## Design policy

- The public default is `kpr5` in `src/features/fd-design/designPreview.js`.
- `original`, `kpr`, `kpr3`, and `kpr4` are compatibility/preview identifiers, not new production systems.
- New public pages should use the current shared tokens and layout helpers. A new design identifier requires an explicit migration decision.

## Cleanup backlog

1. Legacy match-room retirement is complete; keep the old route out of the production router.
2. Add a single public-data status component/contract so published, local preview, and local fallback states cannot be confused.
3. Move legacy translation compatibility behind an explicit migration boundary before removing `legacyI18n.js` and `useLocaleDomTranslation.js`.
4. Remove `EsportsManagerNext` only after its uncommitted work is archived or explicitly discarded.
5. Keep `artifacts/` outside production, lint, deployment, and source review; retain only inputs required by analysis scripts.