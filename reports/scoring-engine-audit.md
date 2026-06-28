# Scoring Engine Audit

This audit freezes Rating Model v1.0 as the default scoring engine and keeps legacy scoring as debug/fallback only. No React page structure, table columns, layout, styles, or display modules were changed for this audit.

| File | Legacy function / field | Current use | Replace this round | Legacy fallback |
| --- | --- | --- | --- | --- |
| `src/lib/leaderboardScoring.js` | `scoreLeaderboardEntries`, `roleScore`, `rawRoleScore`, `scoreProfile`, role-only `ROLE_SCORE_CONFIG` and `HERO_SCORE_PROFILES` | Default leaderboard score calculation and sorting; also reused by match rating adapter | Yes. `scoreLeaderboardEntries` now wraps Rating Model v1. `scoreLeaderboardEntriesLegacy` preserves old behavior. | Yes, via `legacyScore` / `legacyImpactScore` and adapter fallback. |
| `src/lib/leaderboardSelectors.js` | `getLeaderboardEntries`, `getLeaderboardRows`, `sortLeaderboardEntries`, score column sort by `roleScore` | Leaderboard rows, ranking order, player detail source rows, share-card source rows | Yes. Existing selectors still expose `roleScore`; value is now provided by Rating Model v1. | Yes. Rows carry `legacyScore` / `legacyImpactScore`. |
| `src/lib/playerDetailSelectors.js` | Reads `getLeaderboardRows`, `entry.roleScore`, `summary.score`, `scorePercentile` | Player detail data score, role summary, achievements | Indirectly yes through `getLeaderboardRows`. No page/UI changes. | Yes. The row model carries legacy debug fields. |
| `src/lib/matchRatingAdapter.js` | `scoreLeaderboardEntries(rawEntries, 0)`, `roleScore`, `formulaSource` | Match detail performance panel, role leaders, map player rating source entries | Yes. Adapter now calls Rating Model v1 through the default scoring entry. | Yes. Entries carry legacy debug fields. |
| `src/lib/matchDetailSelectors.js` | `getMatchRatingSummary`, `rating`, `topRatedPlayer`, `roleLeaders`, `formulaSource` | Match detail dossier consumed by existing components | Yes through `matchRatingAdapter`. No page/UI changes. | Yes. Unsupported/failed states remain non-crashing. |
| `src/components/matches/detail/DualTeamStatsTable.jsx` | Reads `rating.entries[].roleScore`; derives a display match rating through `matchRatingDisplay` | Expanded map player stats rating display | Data source replaced upstream. Component structure unchanged. | Yes, upstream entries retain legacy values. |
| `src/components/matches/detail/MatchPerformancePanel.jsx` | Reads `top.roleScore` and divides by 10 for display | Match detail top rated player and role leaders | Data source replaced upstream. Component structure unchanged. | Yes, upstream entries retain legacy values. |
| `src/components/leaderboard/*` | Reads `entry.roleScore` for score cells, MVP cards, compare panel | Existing leaderboard display | Data source replaced upstream. Components unchanged. | Yes, upstream entries retain legacy values. |
| `src/features/player-share/playerShareSelectors.js` | Reads player detail / leaderboard-derived score fields | Existing share card data source | Indirectly yes through leaderboard/player selectors. No OVR UI change. | Yes. Legacy debug fields stay on source rows. |
| `src/features/player-share/playerShareOvr.js` | `mapPercentileToOvr` | Share-card OVR utility | Not replaced in UI this round. Rating Model v1 OVR utility remains available in `ratingModel.js`. | Not applicable. |
| `src/lib/matchRatingDisplay.js` | `getMapPlayerMatchRating` maps raw participant score to 0-10 | Existing map table display helper | Not structurally replaced this round; upstream score now comes from Rating Model v1. | Not applicable. |

## Notes

- Rating Model v1 runtime baselines are generated from the currently loaded season DB only.
- Frontend runtime does not import or read `reports/fca-*.json`.
- FCA reports remain debug/replay/comparison artifacts only.
- Legacy scoring is retained for comparison scripts and fallback, but it is no longer the default engine.
