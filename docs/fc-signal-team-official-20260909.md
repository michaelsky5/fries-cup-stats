# Team exhibition: official-site design translation

Local design iteration, 2026-09-09. Preview: `/teams/FCR26-T026?design=kpr5&lang=zh&season=FCR2026`.

The user asked to try the official site's design language while keeping information presentation central. The scope is the exhibition's cover and roster reading flow; journey and analysis retain their content and receive the shared palette/navigation changes.

## Design and behavior

- Use the existing FC ink, warm paper and yellow tokens. Remove the manually assigned AIP/ECNU/NF page palettes. Original team emblems retain their colours and proportions.
- Combine team identity, published standing, series record, valid-map count and registered/appeared member counts in the cover. The cut corner identifies the season-standing panel; normal document scrolling and direct navigation remain.
- Keep roster selection next to the selected member's art, statistics and first/latest match links on desktop. Use a native grouped selector on phones. Member selection stays in the URL and does not scroll the desktop page away from the list.
- Retain the FD silhouette for missing hero records. Representative hero artwork remains labelled. Registered members without an identifiable appearance do not receive invented hero artwork or a first/latest match.
- Keep identified shared appearances and exact match evidence below the member section. Shared records do not establish official starters.
- Use compact update notices on these three routes, retaining the explanation and retry control. Keep the archive navigation sticky and include its height in chapter scroll offsets.

## Local verification

- The five existing team assertion scripts passed 44 tests: presentation, scenes, archive content, analysis, editorial content. No scoring or public snapshot edits.
- Focused ESLint passed for the changed JSX/JS and `DataLayout.jsx`.
- Final isolated Vite build passed in 12.64 seconds. Output and log: `tmp/team-official-20260909/build` and `build.log`. Package prebuild hooks were not run.
- Scoped whitespace checks passed against per-file backups in `tmp/team-official-20260909/before`; `changes.diff` contains this iteration's changes.
- Browser checks: AIP at 1440, 1280 and 390 px; native phone selector; dontsmile missing-data silhouette; English ECNU with nine members and its full Chinese team name; 3DKHZ without a team emblem; QGCS4 NF; original-mode isolation.
- The three page tabs have matching positions at 390 px. ECNU's latest member appearance opened `FCR26-PLAYOFFS-R1-M10` with the player and season preserved. The chapter heading remained below the sticky page tabs. No outer-document horizontal overflow was observed in those checks.
- After final navigation, the displayed AIP emblem and member image loaded. The browser retained one intermediate HMR error at 01:59:40 UTC, before successful builds and final page reload; it did not recur during final verification.

## Preview boundaries

The preview continues to use the last available public records. Existing upstream update requests fail with an expired-certificate error, and the configured local auth service on port 4500 is not running. This iteration does not claim fresh-data synchronization or authentication verification. No deployment, commit or push was performed.
