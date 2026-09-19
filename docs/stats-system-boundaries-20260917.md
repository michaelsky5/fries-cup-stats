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
- `weeklyRoomFlow.js` is the shared authority for the progress rail and actionable panel. The API's `BANNING` phase first requires both five-player lineups, then permits bans; completed bans lead to readiness.
- Operator mode controls final start/resume authority. It does not remove a representative's own-team readiness/recovery controls.

### Season registration

- `/participate/:seasonId` owns registration forms and invitation acceptance.
- `SeasonRegistrationEntry` is shared by My Space and its design preview. My Space does not mount another registration editor.
- An accepted invitation refreshes `AuthProvider` before navigation. A failed session refresh is retried without accepting the invitation again.

### Legacy match-room data helpers

- The old `/matches/:matchId/room` visual page has been retired. Existing bookmarks have a redirect-only compatibility route to public match details, retaining the query string.
- Public weekly match details use the raw System match ID for the canonical room URL. Non-weekly details no longer offer the retired room.
- Weekly matches use `/me/matches/:matchId/room` and the `weekly-live-rooms` API only.
- `src/features/match-room/matchRoomModel.js` and `matchRoomLifecycle.js` remain only for match-list lifecycle summaries and must not own live-room UI.
- Development previews must render the shared `WeeklyRoomView` surface, not a parallel match-room implementation.
- `/dev/weekly-room-preview` uses synthetic read-only fixtures and a local message loader. It must not use `useWeeklyLiveRoom`, real match IDs, or execute mutation callbacks.

## Non-production boundaries

- `src/pages/dev/**` and `scripts/preview*.mjs` are local review tools only.
- `FCR26-TEST-ROOM*` handling in `matchRoomApi.js` is a local fixture path and must never be used as a production fallback.
- `src/features/kpr-design` and `src/features/fd-design` provide presentation and preview layers; they must not own data loading or API calls.
- `src/EsportsManagerClassic` remains a legacy product surface. `EsportsManagerNext` is not a production route.
- `src/EsportsManager` is also not a production route. The router imports only `EsportsManagerClassic`; keeping dormant source files does not authorize mounting another implementation.
- `VITE_WEEKLY_PREVIEW` replaces the existing `FCW26` configuration with its local source; it must not append a duplicate season ID.

## Design policy

- The public default is `kpr5` in `src/features/fd-design/designPreview.js`.
- `original`, `kpr`, `kpr3`, and `kpr4` are compatibility/preview identifiers, not new production systems.
- New public pages should use the current shared tokens and layout helpers. A new design identifier requires an explicit migration decision.

## Cleanup backlog

1. Keep the legacy room compatibility route redirect-only; never restore its removed component or API flow.
2. Add a single public-data status component/contract so published, local preview, and local fallback states cannot be confused.
3. Move legacy translation compatibility behind an explicit migration boundary before removing `legacyI18n.js` and `useLocaleDomTranslation.js`.
4. Remove `EsportsManagerNext` only after its uncommitted work is archived or explicitly discarded.
5. Keep `artifacts/` outside production, lint, deployment, and source review; retain only inputs required by analysis scripts.
