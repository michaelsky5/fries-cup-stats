# FCW26 v1.5 rating display scale

The user selected the gentle upper-half display curve after reviewing the same
700 player-map records with the previous model and v1.5. This selection supersedes
the October 12 decision to keep the display candidates offline. The raw v1.5.0
statistical formula, weights, references and season policy remain unchanged.

## Display boundary

`STATISTICAL_RATING_DISPLAY_CONFIG` is a separate presentation configuration,
version `v1.5-display-2026.10.14`. It applies only to entries explicitly marked
`v1.5.0`, currently activated only for FCW26. `getMatchPlayerRating` and
`getReviewMapRating` convert their original raw score for all map, full-match and
MVP displays. Missing raw scores remain missing rather than using old numbers.

The model's internal `mapRating`, `roleScore`, reference calculations and award
ranking remain on their original scale. In particular, one-map awards retain
their existing ranking and tie rules. Season OVR, sample eligibility, opponent
adjustment and rankings remain untouched. Archived competitions use the existing
display curve and map-result rules.

| Raw score | Previous display | Selected display |
| ---: | ---: | ---: |
| 0 | 5.5 | 5.5 |
| 5 | 5.5 | 5.5 |
| 25 | 6.4 | 6.4 |
| 50 | 7.0 | 7.0 |
| 70 | 7.6 | 7.9 |
| 85 | 8.3 | 8.6 |
| 95 | 9.0 | 9.2 |
| 99 | 9.5 | 9.6 |
| 100 | 9.8 | 9.8 |

All roles, heroes and map results share this one fixed curve. It is monotone and
retains the entire lower half. It is a product display choice, not a claim of
improved performance accuracy or measured player satisfaction.

## Replay baseline and acceptance

Public FCW26 snapshot SHA-256:
`a194c277b78a4d53abdb190ed8502afd2f3d1bada417edd916c5094ecd9ef1ab`.
Pre-change baseline: main commit
`91b61c163635459875fbf9927d7449d26cdad4b8`.

The verified 700-row replay changes the unweighted player-map display mean from
7.111 to 7.221, ratings of 8 or more from 82 to 148, and ratings of 9 or more from
3 to 17. The rounded team-best tie sets remain unchanged in all 140 team-map
groups. Every raw score, all 14 match MVP identities and all 98 season leaderboard
records remain identical to the pre-change baseline. There are 332 changed display
values; raw scores of 50 or less retain their exact previous display values.

Validate with `npm run test:rating-release`, `npm run test:statistical-rating`,
the match-review and MVP suites, locale checks, lint and the production build.
Also verify map and full-match numbers on the real match-detail view, the
collapsed rating explanation, archived scoring, and the phone layout. Local
checks, CI and production acceptance are separate receipts. Replay artifacts
remain local and are not bundled into the application.

Local acceptance: 39 archived rating/display checks and 46 statistical, review,
feedback and MVP checks passed; locale verification covered 33,230 translations.
Lint has no errors and eight existing Shop warnings. The production build passed.
Browser checks showed the selected map and match numbers for SPS–FF and MH–TS,
keyboard expansion of the common explanation, no console errors and no document
overflow at normal desktop size or the 390-pixel phone override.

Rolling back this display change requires only reverting the display helper and
configuration changes; no published statistics or season ratings need repair.
