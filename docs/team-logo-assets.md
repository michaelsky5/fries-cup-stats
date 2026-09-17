# Team logo asset contract

Team logos are resolved by `src/lib/teamLogoResolver.js`. Adding a season or team must not require a JavaScript mapping.

1. Put assets in `public/logos/<SEASON_CODE>/`, using the configured season ID or public code as the directory name.
2. Prefer a filename matching the stable `team_id`, `team_short_name`, or `team_name`. Matching ignores case, spaces, dots, and hyphens. PNG, WebP, JPG, JPEG, and SVG are supported.
3. A published `team_logo`, `logo_url`, or `logo` value always has first priority.
4. If a legacy filename cannot match any team identity, add `team-logo-aliases.json` beside the images. Map a stable team ID or name to the exact filename; do not add a JavaScript special case.
5. Add `OW.png` to the season directory when the season needs its own default mark. The global Fries Cup mark remains the last fallback.

The catalog is regenerated automatically before development and production builds. Run `npm run test:team-logos` to validate catalog aliases and cross-season resolution.
