# Season rating v1.4 release baseline

Season OVR uses at least 6 maps, 60 minutes and 3 identified matches in the same role for official ranks. A provisional estimate needs 2 maps and 30 minutes, remains outside official rankings, and is capped at 89. Missing scores stay unavailable. Rating details show samples, metric contributions, sample weighting and the opponent adjustment.

Opponent strength uses normal series results before the competition day, neutral treatment for unknown history, and a maximum adjustment of ±3 OVR. Hero calibration stays v1.2, including the frozen FCR26 Swiss baseline. These are season performance ratings, not validated absolute skill estimates across events.

The fixed reference inputs and rating output hashes are recorded in `rating-v1.4-baseline-20260907.json`:

| Input | Player-role entries | Formal | Provisional | Unrated |
| --- | ---: | ---: | ---: | ---: |
| FCA26 published V5, cleaned by the reader | 194 | 161 | 19 | 14 |
| QGCS4 published V30 | 128 | 73 | 27 | 28 |
| FCR26 fixed historical local fixture | 286 | 155 | 54 | 77 |

The FCA26 repair also reconciles every one of the 194 role totals against 3,010 actual published map rows. Removing 2,470 duplicated logs and rebuilding the archive totals produces the same ratings as the cleaned V5 reader. Example: FCA26-P0014:DPS is OVR 80, with 18 maps and 220.533333 minutes. FCA26-P0089:TANK is provisional 61, with 6 maps and 47.383333 minutes.

Run the fixed-data check with copies whose byte hashes match the manifest:

```sh
node scripts/assertRatingReleaseBaseline.mjs --fca /snapshots/fca26-v5.json --qgcs4 /snapshots/qgcs4-v30.json --fcr /snapshots/fcr26-local.json --repaired-fca /snapshots/fca26-v6.json
```

The repaired archive argument is optional. It verifies all map-derived role totals and the fixed rating output. Future model experiments should use these same inputs and report changes before any baseline is deliberately replaced. FCR26's historical fixture is not asserted to equal the latest production snapshot.

The standard build runs 37 scoring checks before generating the existing team-logo/scouting assets and building the production UI. The release was prepared from current production main in an isolated worktree; unrelated FC Signal and account work stays in the existing development checkout.

Publication scope: the corresponding System change prevents new duplicate imports and offers a guarded repair of FCA26 published V5. The live FCA workbench still has nine old result-validation issues; that workbench is not republished by the archive repair. Existing production hosting and DNS remain in place.
