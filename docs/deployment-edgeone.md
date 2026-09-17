# Stats EdgeOne Deployment

This runbook moves only `fries-cup-stats` from Vercel to Tencent Cloud EdgeOne. The System admin site, API, PostgreSQL, and persistent uploads remain on the existing Tencent server.

## Target routing

Use a dedicated Stats hostname such as `stats.example.com`.

| Request path | EdgeOne origin | Cache |
| --- | --- | --- |
| `/api/platform/*` | `https://admin.example.com/api/*` | No cache |
| `/api/admin-public/*` | `https://admin.example.com/api/public/*` | No cache |
| `/assets/*` | EdgeOne static origin | Long cache |
| `/index.html` | EdgeOne static origin | No cache or very short cache |
| all other paths | EdgeOne static origin, SPA fallback to `/index.html` | Follow static asset policy |

Keep the API paths on the Stats hostname. The browser then sends the Stats-host session cookie to same-origin `/api/platform` requests, while EdgeOne forwards the request to the existing System API. Do not point browser code directly at the Admin API hostname.

## Build

Build the existing Vite application without changing the production API path:

```powershell
Push-Location Z:\FriesCup\fries-cup-stats
npm ci
npm run build
Pop-Location
```

Publish the contents of `dist/` to a versioned EdgeOne static origin. Do not publish `.env*`, source maps containing private material, `.codex-tmp`, `artifacts`, or local preview files.

## EdgeOne setup

1. Create or select the EdgeOne site and bind the production Stats hostname.
2. Configure HTTPS and DNS/CNAME in Tencent Cloud.
3. Set the static origin to the published `dist/` content, preferably through COS or the EdgeOne Pages static origin.
4. Add the two API path rules above before the SPA fallback rule.
5. Configure SPA fallback for unknown frontend paths to `/index.html`.
6. Disable caching for `/api/*` and preserve request cookies, `Origin`, and `Set-Cookie` headers.
7. Enable immutable caching for hashed files under `/assets/`.

The existing `vercel.json` remains for rollback and does not control EdgeOne.

## System changes required before production switch

On the System deployment, add the final Stats origin to `API_CORS_ORIGIN`, for example:

```env
API_CORS_ORIGIN=https://admin.example.com,https://stats.example.com
```

Keep `ACCOUNT_PUBLIC_BASE_URL` pointed at the approved Stats hostname so invitation, verification, and password-reset links use the production Stats entry.

Do not change `VITE_API_BASE_URL` in Stats from its default `/api/platform` unless the routing design is intentionally changed. Do not expose PostgreSQL or the Fastify API directly to the public internet for this migration.

## Acceptance checks

Run the following after the EdgeOne hostname is available:

```powershell
curl.exe -I https://stats.example.com/
curl.exe -I https://stats.example.com/assets/<known-hashed-file>
curl.exe -i https://stats.example.com/api/admin-public/health
```

Then verify in a clean browser session:

- Stats home, deep links, refresh, and SPA fallback;
- public season data and its source/error state;
- login, logout, invitation activation, and account refresh;
- weekly room route and same-origin `/api/platform` calls;
- no API response is cached;
- hashed assets return long-lived cache headers;
- a second deploy invalidates `index.html` without requiring users to clear cache.

Keep Vercel serving the old hostname until these checks pass. Rollback is a DNS/EdgeOne origin switch, not a database change.