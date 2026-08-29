# Team logo assets

Team logos are resolved through a build-generated catalog instead of season-specific JavaScript maps.

## Add a season

1. Create `public/logos/<season-or-family>/`.
2. Name each logo after the team's short name, for example `SK.png` or `SPS.V.webp`.
3. Optionally add `OW.png` as that directory's default logo.
4. Run `npm run build:team-logo-catalog` (also runs automatically before development and production builds).

Supported formats are PNG, WebP, JPG, JPEG, and SVG. Matching ignores case, spaces, dots, hyphens, and other punctuation. The resolver checks an explicit `team_logo` URL first, then the generated season catalog, then the season's `OW.png`, and finally `/logos/fc_logo.png`.

For a legacy team whose data name cannot match its filename, add a `team-logo-aliases.json` object beside the images:

```json
{
  "Team Name Or ID": "actual-file.jpg"
}
```

Aliases are data, not application code. Adding a normal new season or a normally named logo requires no resolver change.
