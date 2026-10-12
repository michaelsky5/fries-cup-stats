# Match rating presentation and candidate display review

FCW26 match tables repeated a provisional label below every rating and displayed
a long model notice below every map. Ratings now occupy one line. Each map has a
collapsed, keyboard-accessible rating explanation; the existing series and MVP
explanations retain the model notes. Shared notes appear once and record-specific
notes identify the affected player and role. Hover and accessible rating labels
retain reference and review context. The season leaderboard is unchanged.

The user selected UI publication first and offline candidate-curve replay.
The deployed v1.5.0 formula, displayed numbers, thresholds, source rules, MVP
selection and season OVR remain unchanged. Archived scoring stays unchanged.

## Candidate replay

`scripts/analyzeRatingDisplayCandidates.mjs` evaluates two fixed global display
curves using the locked candidate's raw scores. It has no production importer or
configuration toggle. Both retain the complete curve up to raw score 50, with
50 displaying as 7.0 and bounds of 5.5–9.8. The existing raw-score anchors above
50 remain 70, 85, 95, 99 and 100. Their proposed display values are:

| Curve | 70 | 85 | 95 | 99 | 100 |
| --- | ---: | ---: | ---: | ---: | ---: |
| Current | 7.6 | 8.3 | 9.0 | 9.5 | 9.8 |
| Gentle candidate | 7.9 | 8.6 | 9.2 | 9.6 | 9.8 |
| Highlight candidate | 8.0 | 8.8 | 9.4 | 9.7 | 9.8 |

These are product-design candidates, not fitted accuracy or enjoyment estimates.
The replay checks 100,001 raw-score points for each curve: monotonicity, unchanged
lower-half mapping, range and missing-value preservation. Four locked snapshots
provide 7,800 normalized observations: 7,240 available scores and 560 missing
scores under every curve. Archived data is diagnostic replay only.

For the three October 11 FCW26 matches (150 player-map observations):

| Curve | Mean | At least 8 | At least 8.5 | Maximum | Changed team-best tie groups |
| --- | ---: | ---: | ---: | ---: | ---: |
| Current | 7.16 | 10 | 1 | 8.5 | 0 / 30 |
| Gentle candidate | 7.28 | 32 | 5 | 8.7 | 0 / 30 |
| Highlight candidate | 7.33 | 39 | 10 | 8.9 | 3 / 30 |

There are no ratings of 9 or more in these three matches under either candidate.
Rounding a monotone curve can change displayed ties; it does not establish that
all display awards will stay identical. The gentle candidate is the first option
to discuss later, but neither candidate is selected or published.

Run the replay with the original frozen input directory:

```powershell
node scripts/analyzeRatingDisplayCandidates.mjs --inputs artifacts/rating-v15-working-forward-lock-20261011-postmatch --output artifacts/rating-v15-display-review-20261012
```

The input manifest must match forward lock
`c63510cefc873b7ab23b7a66832e967f385f88084ebeb1dfd176fe0b870f2510`.
The output records snapshot hashes, per-season summaries and interpretation
boundaries. Input artifacts are local evidence and are not bundled in Git.

## Validation

Local checks passed: 10 statistical-model checks, 37 historical rating checks,
17 match-review checks, focused ESLint and the production build. Browser QA
verified the 1600-pixel desktop table, keyboard disclosure, 390-pixel phone-width
layout without document overflow, map switching and Mono's support-review notes.
Scores remain visible without repeated provisional labels. New disclosure text
stays collapsed until opened. CI includes the existing match-review suite.

Production acceptance is verified separately against the exact merged commit,
custom-domain assets and actual match-detail page.
