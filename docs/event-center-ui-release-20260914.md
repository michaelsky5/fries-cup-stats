# Event center UI release — 2026-09-14

The public UI refinements from this review are integrated on production commit 5c9ec8f95e60067eb6540130789892aabc6bfce3. The existing account proxy, account flows, package versions and Vercel configuration are retained.

## Result

- Shared responsive navigation, roster and staff profiles, player archive/analysis, match-reading return links, and leaderboard refinements from the accepted local UI.
- Expanded leaderboard omits standalone team/role columns; identity context remains under the player name.
- Archive footer keeps the art notice and HarmonyOS Sans attribution, with other credits grouped in an accessible Materials & licenses dialog.
- Event staff consumes modern crew records and legacy role lists, deduplicates each person within a match, and includes referee, voice referee, director and observer duties. FCR adds three voice-referee credit archives that were previously omitted.
- QGCS4 review uses the regular-season cinema/search/keepsake template, with group-stage and single-elimination copy. It uses the published final snapshot (19 teams, 116 players, 44 matches), without FCR roster overrides or another event's signed organizer letter.
- Advancement desktop hero height is bounded to 620–720 px so tall windows do not create a large empty band. Mobile keeps its compact heading.

## Verification

- 33 public UI/data check groups passed; three obsolete fixture expectations were updated for the newly enabled QGCS4 review and voice-referee inclusion.
- 157 QGCS4 player/team/staff/tournament stories checked across four locales (628 flows), with template chapters, format accuracy and source immutability checks.
- 37 rating release tests and 11 account proxy/legacy translation tests passed; complete account UI script passed.
- Source lint: zero errors, 14 pre-existing hook warnings. Production build passed using the existing release builder and locked production dependencies.
- Browser: expanded ranking headers, footer dialog opening/Escape/focus restoration, partner review entry/story/locale switch, staff duty labels, and desktop/mobile layouts. Final production verification is recorded separately after deployment.

## Release and rollback

Publish through the existing Git-connected Vercel project fries-cup-stats to stats.fries-cup.com. No DNS, database migration, backend deployment or real email action is part of this change.

Previous production: dpl_BgtyfWPC94UCKewxj9FEhWiKfkKt, fries-cup-stats-ezehov3jt-shenkeyu5-2087s-projects.vercel.app. Rollback can restore that deployment or revert this UI commit while retaining the account proxy.
