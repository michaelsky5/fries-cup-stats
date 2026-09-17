# Team archive: identity, review and season journal

2026-09-07. Local preview iteration, following the approved coach/player reading direction.

## What changed

- Exhibition: a team-name and crest poster replaces the five-hero cover. Registered members form a visible name strip and role-based roster. The selected member retains their representative hero artwork or the FD-style missing-data silhouette.
- Shared appearances: the roster now identifies the most frequently recorded group of five registered player IDs on the same map. This is descriptive appearance evidence, not a claim about official starters. Member links cover their first and latest recorded matches.
- Analysis: start with the most recorded map, another map worth reviewing, and a same-map/same-opponent rematch with a changed outcome when available. Each finding links directly to its map evidence. Complete scatter plots, team distributions and final-hero records are available in expandable sections.
- Analysis handles ties, sparse map records, missing outcomes and absent same-opponent comparisons. No tactical cause is inferred from a changed score.
- Journey: chronological chapters show the opening stage, transitions and setbacks, repeat opponents, and a verified final result. Chapter text explains the lower-bracket and grand-final consequences only when the published route supports them. The existing interactive match scene and full ledger remain available.
- A first-stage loss stays inside the opening-stage chapter; it cannot be sorted ahead of the opening. ECNU provides the real multi-stage acceptance case.

## Data boundaries

- Map evidence continues to use canonical named/scored records, excluding administrative and forfeited maps.
- Five-member shared appearances use exact player IDs, deduplicate within one map, and do not borrow opposing-side records.
- The published series W/L record includes administrative results; byes remain separate.
- A championship chapter requires an archived first place and a won grand final. Active, empty, administrative-only and non-champion seasons retain their actual state.
- Team accents are editorial colours. The implementation does not claim they are official team brand palettes.
- Chronicle images are labelled as maps from the match. They are existing map artwork, not photographs or recordings of the match.

## Verification

- Targeted team suites: 53 tests (existing 46 plus 7 editorial-content cases).
- ESLint: team-dossier components and the new test file.
- Production build: isolated under `tmp/team-editorial-20260907/build`; no npm generation hooks used.
- Whitespace: compared the edited feature with its pre-edit backup using `git diff --no-index --check`.
- Browser: AIP exhibition, journey and analysis at 1440, 1280 and 390 widths. The 1280 shared navigation has identical bounds across all three views; no outer horizontal overflow was observed.
- Interactions: seven map records expand; the earlier MASK rematch opens M07/map 2; the chapter for the later MASK match selects M13 and exposes all five map links; selecting dontsmile retains the missing-data silhouette and zero recorded appearances.
- Other cases: ECNU's long full name, nine-member roster and chronological Swiss/LCQ/playoff journal; 3DKHZ's wordmark fallback on mobile; QGCS4 NF's English analysis and journey on mobile; original-mode AIP has no Signal dossier.
- Empty/admin-only and active-season editorial boundaries are unit-tested, not claimed as a full browser fixture suite.

## Scope

Only the team-dossier feature, its new focused test and this note were changed in this iteration. Existing match-detail work and published datasets were not edited. Pre-edit feature backup: `tmp/team-editorial-20260907/before/team-dossier`. No commit, push or deployment.
