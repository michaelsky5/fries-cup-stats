# MVP for completed matches without prior rating references

FCW26's first competition day in each version group has complete player records
but no earlier same-version reference. The v1.5 rating is intentionally missing;
binding the MVP directly to it also removed the award from those matches.

Completed normal matches with no usable v1.5 scores now receive an independent
MVP when their published records support it. It reuses the existing per-10-minute,
same-role comparison (`scoreLeaderboardEntriesLegacy`), hero-profile weights,
sample adjustment, deterministic ordering and appearance requirement. Only this
series enters that comparison. Later results, other seasons and previous patches
cannot enter it. All candidates use the same award method. Existing rating-based
MVPs keep their selected player and score, including archived seasons.

The fallback requires valid totals, positive recorded role time, both teams'
five-player role coverage and non-administrative, rating-eligible maps. Unknown
statistics stay missing. The normal completed-match and forfeit guards apply.
For a five-map series, the existing award minimum is three role-map appearances.

The spotlight shows the winner, heroes, core totals and appearance count, with
“本场数据” as its award basis and a folded explanation. The internal comparison
score is not a v1.5 score: it never fills missing table ratings, enters the season
ranking, changes season OVR, or appears as a fabricated /10 rating. This remains a
statistical award, not a complete measurement of tactical contribution.

Run `node --test scripts/historicalMatchMvp.test.mjs scripts/assertMatchReview.mjs`
for cold-start awards, temporal isolation, eligibility, invalid records, losing
teams, row ordering and preservation of existing MVPs. Also run the statistical
and archived rating suites. The public FCW26 snapshot is replayed separately to
verify restored awards and compare every existing match/map score and MVP.
