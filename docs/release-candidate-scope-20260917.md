# Stats Release Candidate Scope

## Include

- `src/**` production routes, pages, features, selectors, API clients, and runtime libraries
- `public/**` runtime data, images, fonts, and review assets required by the built application
- `package.json`, `package-lock.json`, `vite.config.js`, `index.html`, `eslint.config.js`, and `vercel.json`
- `scripts/build*.mjs` and generated source catalogs required by the build scripts

## Keep In Repository, Do Not Deploy As Runtime

- `docs/**`
- `.github/**`
- `scripts/assert*.mjs`, `scripts/test*.mjs`, and other verification tools
- `.env*.example` templates

## Exclude From Release

- `.env` files containing local or production values
- `.codex-tmp/**`, `artifacts/**`, `dist/**`, `build/**`, `tmp/**`, and local logs
- local preview-only fixtures and development review servers
- editor, assistant, and machine-local metadata

## Verification

- `npm run lint` passed
- `npm run build` passed
- `npm run test:account-ui` passed
- weekly live-room and opening PostgreSQL regressions passed in the companion System repository

This scope describes the current complete workspace baseline. It is not a Git commit or deployment approval by itself.