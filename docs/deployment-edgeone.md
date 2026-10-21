# Stats EdgeOne Deployment

## Registration maintenance release candidate (2026-10-21)

Production is `https://stats.fries-cup.com`, with the account/public API on
`https://admin.fries-cup.com`. Read-only console verification on 2026-10-21
confirmed project `makers-qbtsugmahw7a`, production deployment `dp9z9pmjlri0`,
source `63eae80cacf442e57774c1ccfed758967166a636`, and one Edge Functions route
`/api/*`. That associates the function route with the deployment; the old
function has no embedded digest to prove its bytes independently.

Production automatically deploys `main`; preview branch deployment is disabled.
The current Git build uses `npm ci`, `npm run build`, output `dist`, and Node
22.11.0. These console settings have not been changed. A read-only check of the
version selector also confirmed that 24.18.0 is available. **Do not merge this
candidate before coordinated acceptance**: `main` currently deploys automatically.

The [CLI documentation](https://pages.edgeone.ai/document/edgeone-cli) explicitly
limits local artifact deployment into an existing project to direct-upload
projects. The existing Git project cannot be assumed to accept the retained CI
package. Keep the current project/domain and use its Git build for this candidate:
`edgeone.json` selects Node 24.18.0 and `npm run build:edgeone`. This builds a clean
release and then copies its stamped catch-all function to the repository-root
function path used by EdgeOne. The command deliberately modifies that generated
function in the disposable build checkout; do not run it in a normal development
checkout. Ordinary `build:release` leaves source files unchanged.

At the approved cutover, suspend automatic production deployment before merging,
validate the Git build/function discovery in a provider preview, and then deploy
the approved commit with the coordinated System release. Re-enable automatic
deployment only after that release path has been accepted. Provider preview and
production have not yet been exercised for this candidate. Local staging alone
does not prove the provider's function discovery/build order.

Refresh the domain and deployment record again immediately before publishing.
A matching homepage does not establish the function version.

The provider generates an untracked `.edgeone/` work directory before invoking
the build. Ignore only that generated directory; retain the release builder's
clean tracked/untracked source check. A real preview caught this difference from
the local Git build on 2026-10-21 (`dpirztx6qrm3`); no production deployment ran.

For isolated account acceptance, set `FRIES_PLATFORM_ORIGIN` in the **preview
environment only** after reviewing the staging backend and allowed Origin.
The entry reads EdgeOne's documented `context.env`; Node's `process.env` is only
a local fallback. The reviewed account origins are `https://admin.fries-cup.com`
and `https://test-admin.fries-cup.com`; an unknown value fails closed without
forwarding credentials or falling back to production. Published snapshots still
use production anonymously. See the [Edge Functions context contract](https://pages.edgeone.ai/document/edge-functions).

Build the complete production package from a clean, committed isolated checkout:

```powershell
npm ci
npm run test:release-package
npm run build:release -- .codex-tmp/production-release
node scripts/assertPublicBundle.mjs .codex-tmp/production-release
```

Use a fresh output path. This command removes inherited `VITE_*` preview flags,
ignores local env files, uses the same-origin `/api/platform` path, and packages
the static frontend, `edgeone.json` and the existing catch-all edge function
together. It does not upload or deploy. The final combined CI builds the same
package at `dist/`; it must run after this maintenance candidate is complete.

`release-version.json` records the actual Git commit, build time, static file
count/content digest, original proxy source digest and EdgeOne configuration
digest. The packaged `/api/release` function returns that same identity with
no-store headers, without touching the account API or exposing environment
variables. An unstamped source build reports 503 instead of claiming an identity.
The packaging verifier rejects an altered static file, proxy or configuration.

After the approved deployment, compare **JSON bodies** from both
`/release-version.json` and `/api/release`; they must match each other. A 200
SPA HTML fallback is a failure. Their commit must match the approved CI commit,
and proxy/config digests must match its source. The provider performs a separate
build, so its `builtAt` is expected to differ from CI; do not claim that it is a
promotion of the exact CI artifact. Compare static-tree/index/asset digests to
the CI package where deterministic, retain the provider deployment/build identity,
and investigate discrepancies before acceptance. If exact CI-artifact promotion
becomes mandatory, use a separately approved direct-upload project and domain
cutover; do not silently create one or change the current domain.
Exercise public conditional reads, login/cookies, write Origin checks and the
room UI against the deployed hostname. These checks establish different parts
of the release; a local package is not production acceptance.

For an approved direct-upload project, publish the package root, with `index.html`, `edge-functions/` and `edgeone.json`
at the top level. EdgeOne's [direct upload documentation](https://pages.edgeone.ai/document/direct-upload)
supports this layout; its [configuration guide](https://pages.edgeone.ai/document/edgeone-json)
describes static/function matching before the SPA fallback. Keep the prior
deployment available and roll static assets and functions back together.

The older migration notes below are background instructions. Replace their
example domains with the verified current domains above.

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
