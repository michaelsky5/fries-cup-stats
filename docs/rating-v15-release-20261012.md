# FCW26 statistical performance rating v1.5.0

The first production scope is FCW26. Archived competitions retain the existing
v1.2 hero calibration, v1.4 season policy and frozen FCR26 Swiss baseline. The
release changes the browser's calculation; it does not write scores back into
published match statistics or require staff accounts.

## Calculation and interpretation

- The selected formula is the locked `rating-v1.5-shadow.5/continuous-midrank`
  candidate. Existing profile weights, the map display curve and season OVR
  policy remain in use. Experimental Sombra-specific weights, separate Cat/Juno
  profiles and sparse-reference shrinkage are not selected.
- Each observation uses earlier competition days in the same season and version
  group. The entire target match is excluded. Same-day additions and future
  results cannot enter its reference. Sombra's damage and support versions are
  separate. Patch groups remain date-inferred without confirmed patch evidence.
- Each reference match contributes one unit of mass per metric; observations
  inside it use duration weights. At five distinct player-map observations,
  P95 clipping applies. Equal values use their weighted midpoint, with continuous
  interpolation between all observed anchors. An all-zero reference stays neutral.
- Missing positively weighted metrics or references produce a missing score.
  They are not zero-filled and do not fall back to another model. Only explicit
  inapplicability permits redistribution of metric weights.
- Low support-duty metrics preserve the score and add a review flag. Segments
  below 60 seconds preserve performance and add a review flag; they do not enter
  subsequent reference calibration.
- Every positively weighted metric source exposes its own prior-match count.
  Fewer than five matches in any active source makes interpretation provisional.
  The existing maturity gates (20 player-maps / 120 minutes / 5 matches /
  5 players / 2 days) are engineering rules, not accuracy probabilities.
- Maps have no extra result bonus under v1.5. Match and season aggregates use
  time-weighted available raw scores. Coverage of recorded playtime is disclosed,
  including excluded missing scores. Season OVR retains the separate role sample
  requirements and limited opponent adjustment.

The available public records are map totals carrying hero labels. They have not
been verified as per-hero statistics. The release labels them as recorded
statistical performance, with provisional, attribution and review notes. It does
not claim to fully measure tactical contribution or validate player-skill accuracy.

## Validation

The browser-port calculation was independently compared with the frozen local
candidate using four public snapshots captured on October 11, including the three
newly completed FCW26 matches. All **7,800** normalized observations matched on
raw score, map rating, weights, missingness, review flags, maturity and active-source
support. This establishes implementation parity, not human performance accuracy.

| Season | Observations | Available candidate scores |
| --- | ---: | ---: |
| FCA26 | 3,010 | 2,960 |
| FCR26 | 2,850 | 2,780 |
| QGCS4 | 1,240 | 950 |
| FCW26 | 700 | 550 |

Parity outside FCW26 tests the portable formula; production activation remains
limited to FCW26. The three October 11 matches have 150 new scored observations,
all with an active reference source supported by only one prior match. They
remain provisional. Removing that prior match removes all 150 scores; that is
missing comparison evidence, not evidence of rank stability.

Source binding: forward lock
`c63510cefc873b7ab23b7a66832e967f385f88084ebeb1dfd176fe0b870f2510`;
FCW26 public snapshot SHA256
`c9d98a6ad09f71d6cc742ae24a5c5fba6883c0a3aea376303e59480209583355`.
The original frozen candidate files and previous locks remain intact locally.

Run `npm run test:statistical-rating` for distribution, temporal isolation,
missingness, review-only rules, duration boundaries, source-specific gates,
runtime normalization, scope and integration checks. Run
`npm run test:rating-release` for archived scoring and display regressions.
Both checks are included in CI. The normal build, lint and existing public/account
contracts also apply. Local build, CI, formal-host and browser validation are
distinct acceptance layers.

Local acceptance passed: 10 statistical-model tests, 37 archived-model/display
regression tests, the existing account and weekly public UI contracts, the
Season 5 role checks, lint and the production build. Lint reports eight existing
warnings and no errors. Browser checks loaded the real October 11 match and the
FCW26 leaderboard, including the provisional badge and Mono's review-only
support explanation. The leaderboard badge also fits a 390-pixel viewport.
Production deployment and custom-domain acceptance must be recorded separately
after the exact release commit is deployed.

## Rollback and continued evaluation

The release uses the existing Vercel Git project `fries-cup-stats` and custom
domain `stats.fries-cup.com`. The pre-release production commit is
`bab8245f16a8f9402c91eb1fae1f851e06b420fd`, deployment
`dpl_A2JxCdRdAP9t6oF9m6ySbnVz1RNJ`. Reverting this release or disabling the
FCW26 entry in `STATISTICAL_RATING_SEASONS` restores the previous scorer. No
published statistics or frozen historical baseline need restoration.

Continue diagnostics against fixed parameters and strictly later match dates.
Treat whole-match reference-removal sensitivity, availability, attribution
coverage and hero-specific support separately. Human blind review remains
deferred by the user; no automatic release result substitutes for it. Change
weights only after evidence supports the adjustment, with a new version and
an explicit regression comparison.
