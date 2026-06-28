# Scoring Engine Comparison Report

DEBUG ONLY - NOT OFFICIAL RANKING

## Overview

- input path: D:\Fries Cup\fries-cup-stats\public\data\friescup_db_review_ready.json
- valid logs: 3008
- active rating model version: v1.0
- legacy scoring entrypoint: leaderboardScoring.scoreLeaderboardEntriesLegacy
- unknown count: 0
- fallback count: 0

## Overall Distribution

| Metric | P10 | P25 | P50 | P75 | P90 | P95 |
| --- | --- | --- | --- | --- | --- | --- |
| legacyScore | 31.4 | 38.1 | 46.3 | 54.6 | 62.2 | 66.5 |
| ratingV1RawScore | 24.6 | 35.4 | 49.5 | 63.7 | 74.8 | 80.7 |
| mapRating | 6.4 | 6.6 | 7 | 7.4 | 7.8 | 8.1 |
| delta | -8.2 | -3.3 | 3.2 | 9.7 | 14.4 | 16.6 |

## By Subrole

| Scope | Logs | Legacy P50 | V1 Raw P50 | Map P50 | Delta P50 | Delta P90 |
| --- | --- | --- | --- | --- | --- | --- |
| FLEX_DPS | 698 | 42.7 | 48.6 | 7 | 6.1 | 16.3 |
| FLEX_SUPPORT | 670 | 46.9 | 49.7 | 7 | 2.4 | 13.2 |
| TANK | 602 | 47.5 | 51.1 | 7 | 2.4 | 12.7 |
| MAIN_SUPPORT | 534 | 46.1 | 49.0 | 7 | 3.4 | 13.3 |
| HITSCAN | 504 | 47.2 | 48.7 | 7 | 1.2 | 15.0 |

## By Scoring Profile

| Scope | Logs | Legacy P50 | V1 Raw P50 | Map P50 | Delta P50 | Delta P90 |
| --- | --- | --- | --- | --- | --- | --- |
| utility_flex_support | 585 | 47.8 | 49.7 | 7 | 2.1 | 12.2 |
| flanker_flex | 446 | 42.1 | 48.2 | 7 | 6.2 | 16.7 |
| tempo_main_support | 389 | 47.2 | 49.4 | 7 | 2.2 | 12.8 |
| brawl_tank | 266 | 47.0 | 52.0 | 7.1 | 4.1 | 13.3 |
| midrange_hitscan | 254 | 50.0 | 48.9 | 7 | 0.3 | 12.2 |
| dive_tank | 191 | 50.1 | 50.4 | 7 | -0.3 | 10.2 |
| brawl_flex | 171 | 43.4 | 48.5 | 7 | 5.4 | 15.6 |
| rail_hitscan | 159 | 43.6 | 48.1 | 7 | 5.4 | 18.3 |
| utility_main_support | 102 | 43.9 | 48.7 | 7 | 4.8 | 12.7 |
| projectile_flex | 60 | 44.7 | 50.2 | 7 | 5.5 | 14.5 |
| damage_flex_support | 50 | 41.6 | 50.5 | 7 | 7.1 | 19.4 |
| disrupt_tank | 49 | 45.5 | 49.8 | 7 | 3.3 | 15.9 |
| turret_damage | 49 | 57.3 | 57.6 | 7.2 | -0.7 | 9.8 |
| poke_tank | 42 | 54.4 | 54.1 | 7.1 | -1.1 | 12.4 |
| protector_main_support | 42 | 39.5 | 49.1 | 7 | 8.3 | 20.4 |
| poke_hitscan | 34 | 40.9 | 42.2 | 6.8 | 1.3 | 15.2 |
| tempo_tank | 31 | 47 | 54.3 | 7.1 | 6.6 | 14.5 |
| hybrid_flex_support | 30 | 42.1 | 47.9 | 7.0 | 6.4 | 16.1 |
| anchor_tank | 18 | 37.3 | 34.2 | 6.6 | -3.5 | 12.4 |
| barrier_utility_flex | 17 | 42.9 | 53.7 | 7.1 | 11.1 | 17.3 |
| tracking_hitscan | 7 | 37.6 | 35.1 | 6.6 | -4.3 | 3.4 |
| pick_tank | 5 | 36.1 | 35.6 | 6.7 | -0.0 | 4.8 |
| volume_flex_support | 5 | 42.9 | 44.3 | 6.9 | 1.4 | 6.1 |
| utility_flex | 4 | 49.2 | 60.6 | 7.3 | 12.4 | 14.8 |
| pocket_main_support | 1 | 41.6 | 43.5 | 6.8 | 1.9 | 1.9 |
| sniper_hitscan | 1 | 24.8 | 14.1 | 5.9 | -10.7 | -10.7 |

## Top Delta Samples

DEBUG ONLY - NOT OFFICIAL RANKING

### Legacy High / V1 Low
| Player | Team | Hero | Subrole | Profile | Map | Legacy | V1 Raw | V1 Map | Delta | Sample |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FCA26-P0094 | TCK | Lúcio | MAIN_SUPPORT | tempo_main_support | FCA26-SWISS-R2-M11 / 2 Suravasa | 33.0 | 14.2 | 5.9 | -18.8 | OK |
| FCA26-P0008 | ASP | Sigma | TANK | poke_tank | FCA26-SWISS-R5-M03 / 2 Rialto | 30.3 | 11.6 | 5.8 | -18.7 | OK |
| FCA26-P0126 | YM | Sigma | TANK | poke_tank | FCA26-SWISS-R2-M15 / 2 Midtown | 33.7 | 16.0 | 6 | -17.7 | OK |
| FCA26-P0136 | ZS | Bastion | HITSCAN | turret_damage | FCA26-PLAYOFFS-R1-M05 / 1 Oasis | 34.0 | 16.7 | 6 | -17.4 | OK |
| FCA26-P0038 | JDG | Emre | HITSCAN | midrange_hitscan | FCA26-SWISS-R6-M09 / 1 Oasis | 33.9 | 16.9 | 6 | -17.0 | OK |
| FCA26-P0101 | TNS | Lúcio | MAIN_SUPPORT | tempo_main_support | FCA26-SWISS-R3-M03 / 3 Esperança | 41.2 | 24.5 | 6.4 | -16.7 | OK |
| FCA26-P0014 | CR | Emre | HITSCAN | midrange_hitscan | FCA26-SWISS-R5-M02 / 1 Lijiang Tower | 26.6 | 10.0 | 5.7 | -16.6 | OK |
| FCA26-P0020 | 5GGS | Emre | HITSCAN | midrange_hitscan | FCA26-SWISS-R2-M03 / 1 Lijiang Tower | 30.2 | 13.8 | 5.9 | -16.4 | OK |
| FCA26-P0099 | TNS | Ramattra | TANK | tempo_tank | FCA26-PLAYOFFS-R1-M11 / 3 Havana | 30.6 | 14.3 | 5.9 | -16.3 | OK |
| FCA26-P0173 | FG | Bastion | HITSCAN | turret_damage | FCA26-PLAYOFFS-R1-M12 / 1 Lijiang Tower | 37.5 | 21.2 | 6.2 | -16.3 | OK |
| FCA26-P0003 | AST | Emre | HITSCAN | midrange_hitscan | FCA26-SWISS-R4-M13 / 3 Suravasa | 32.6 | 16.4 | 6 | -16.2 | OK |
| FCA26-P0038 | JDG | Emre | HITSCAN | midrange_hitscan | FCA26-SWISS-R2-M13 / 3 Esperança | 29.5 | 13.4 | 5.9 | -16.1 | OK |
| FCA26-P0096 | TNS | Ramattra | TANK | tempo_tank | FCA26-PLAYOFFS-R1-M03 / 1 Lijiang Tower | 28.4 | 12.3 | 5.8 | -16.1 | OK |
| FCA26-P0126 | YM | Domina | TANK | poke_tank | FCA26-SWISS-R2-M15 / 1 Lijiang Tower | 41.4 | 25.3 | 6.4 | -16.1 | LOW_SAMPLE |
| FCA26-P0143 | SK | Lúcio | MAIN_SUPPORT | tempo_main_support | FCA26-LCQ-M23 / 3 Suravasa | 37.4 | 21.3 | 6.2 | -16.1 | OK |
| FCA26-P0161 | CUIT | Emre | HITSCAN | midrange_hitscan | FCA26-SWISS-R6-M11 / 2 Aatlis | 29.8 | 13.8 | 5.9 | -16.0 | OK |
| FCA26-P0009 | ASP | Emre | HITSCAN | midrange_hitscan | FCA26-SWISS-R4-M02 / 1 Busan | 35.3 | 19.5 | 6.2 | -15.9 | OK |
| FCA26-P0001 | AST | Ramattra | TANK | tempo_tank | FCA26-SWISS-R4-M13 / 2 Havana | 33.7 | 18.1 | 6.1 | -15.7 | OK |
| FCA26-P0173 | FG | Bastion | HITSCAN | turret_damage | FCA26-PLAYOFFS-R1-M12 / 2 Havana | 35.8 | 20.2 | 6.2 | -15.6 | OK |
| FCA26-P0100 | TNS | Bastion | HITSCAN | turret_damage | FCA26-PLAYOFFS-R1-M14 / 1 Lijiang Tower | 32.5 | 17.0 | 6 | -15.5 | OK |

### Legacy Low / V1 High
| Player | Team | Hero | Subrole | Profile | Map | Legacy | V1 Raw | V1 Map | Delta | Sample |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FCA26-P0051 | OL | Illari | FLEX_SUPPORT | damage_flex_support | FCA26-LCQ-M8 / 1 Lijiang Tower | 51.0 | 77.9 | 8 | 26.8 | OK |
| FCA26-P0169 | HYW | Illari | FLEX_SUPPORT | damage_flex_support | FCA26-PLAYOFFS-R1-M02 / 1 Oasis | 51.4 | 76.8 | 7.9 | 25.3 | OK |
| FCA26-P0166 | HYW | Sojourn | HITSCAN | rail_hitscan | FCA26-SWISS-R2-M15 / 2 Midtown | 66.5 | 91.4 | 8.7 | 24.9 | OK |
| FCA26-P0076 | SPS | Zarya | TANK | brawl_tank | FCA26-SWISS-R1-M10 / 3 Esperança | 63.0 | 87.0 | 8.4 | 24.0 | OK |
| FCA26-P0173 | FG | Sojourn | HITSCAN | rail_hitscan | FCA26-PLAYOFFS-R1-M01 / 1 Lijiang Tower | 69.2 | 93.2 | 8.9 | 24.0 | OK |
| FCA26-P0167 | HYW | Tracer | FLEX_DPS | flanker_flex | FCA26-SWISS-R6-M08 / 2 Blizzard World | 63.7 | 87.7 | 8.5 | 24.0 | OK |
| FCA26-P0071 | SD | Sojourn | HITSCAN | rail_hitscan | FCA26-SWISS-R1-M11 / 3 Runasapi | 61.5 | 84.4 | 8.3 | 22.8 | OK |
| FCA26-P0103 | TF | Zarya | TANK | brawl_tank | FCA26-SWISS-R4-M07 / 1 Busan | 61.8 | 84.5 | 8.3 | 22.7 | OK |
| FCA26-P0179 | YOU | Tracer | FLEX_DPS | flanker_flex | FCA26-SWISS-R5-M04 / 1 Lijiang Tower | 62.1 | 84.8 | 8.3 | 22.7 | OK |
| FCA26-P0102 | TNS | Illari | FLEX_SUPPORT | damage_flex_support | FCA26-SWISS-R3-M03 / 2 Blizzard World | 46.8 | 69.4 | 7.6 | 22.6 | OK |
| FCA26-P0165 | HYW | Sigma | TANK | poke_tank | FCA26-SWISS-R4-M13 / 2 Havana | 69.6 | 92.0 | 8.8 | 22.4 | OK |
| FCA26-P0177 | YOU | Doomfist | TANK | disrupt_tank | FCA26-SWISS-R6-M02 / 2 Esperança | 60.5 | 82.9 | 8.2 | 22.4 | LOW_SAMPLE |
| FCA26-P0067 | NBA | Brigitte | MAIN_SUPPORT | protector_main_support | FCA26-SWISS-R5-M07 / 1 Lijiang Tower | 50.7 | 72.7 | 7.7 | 22.0 | OK |
| FCA26-P0166 | HYW | Tracer | FLEX_DPS | flanker_flex | FCA26-PLAYOFFS-R1-M02 / 1 Oasis | 61.2 | 83.3 | 8.2 | 22.0 | OK |
| FCA26-P0161 | CUIT | Sojourn | HITSCAN | rail_hitscan | FCA26-SWISS-R2-M14 / 2 Aatlis | 60.2 | 82.2 | 8.2 | 21.9 | OK |
| FCA26-P0031 | FFA | Vendetta | FLEX_DPS | flanker_flex | FCA26-SWISS-R3-M06 / 1 Oasis | 73.5 | 95.2 | 9 | 21.8 | OK |
| FCA26-P0111 | V50 | Illari | FLEX_SUPPORT | damage_flex_support | FCA26-SWISS-R1-M14 / 1 Busan | 47.2 | 68.9 | 7.6 | 21.7 | OK |
| FCA26-P0178 | YOU | Ramattra | TANK | tempo_tank | FCA26-SWISS-R6-M02 / 3 Havana | 57.9 | 79.6 | 8 | 21.7 | OK |
| FCA26-P0036 | JDG | Brigitte | MAIN_SUPPORT | protector_main_support | FCA26-SWISS-R4-M11 / 1 Busan | 55.9 | 77.6 | 8 | 21.7 | OK |
| FCA26-P0175 | FG | Brigitte | MAIN_SUPPORT | protector_main_support | FCA26-SWISS-R1-M06 / 2 Esperança | 67.0 | 88.6 | 8.6 | 21.6 | OK |

### V1 MapRating Highest
| Player | Team | Hero | Subrole | Profile | Map | Legacy | V1 Raw | V1 Map | Delta | Sample |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FCA26-P0171 | FG | Domina | TANK | poke_tank | FCA26-SWISS-R3-M02 / 3 Havana | 79.3 | 96.2 | 9.1 | 16.9 | LOW_SAMPLE |
| FCA26-P0031 | FFA | Vendetta | FLEX_DPS | flanker_flex | FCA26-SWISS-R3-M06 / 1 Oasis | 73.5 | 95.2 | 9 | 21.8 | OK |
| FCA26-P0147 | TS | Freja | HITSCAN | poke_hitscan | FCA26-SWISS-R4-M14 / 1 Busan | 74.7 | 95.2 | 9 | 20.5 | LOW_SAMPLE |
| FCA26-P0101 | TNS | Lúcio | MAIN_SUPPORT | tempo_main_support | FCA26-SWISS-R5-M02 / 1 Lijiang Tower | 76.9 | 93.5 | 8.9 | 16.6 | OK |
| FCA26-P0010 | ASP | Venture | FLEX_DPS | brawl_flex | FCA26-SWISS-R1-M12 / 1 Busan | 74.4 | 93.3 | 8.9 | 18.9 | OK |
| FCA26-P0173 | FG | Sojourn | HITSCAN | rail_hitscan | FCA26-PLAYOFFS-R1-M01 / 1 Lijiang Tower | 69.2 | 93.2 | 8.9 | 24.0 | OK |
| FCA26-P0015 | CR | Vendetta | FLEX_DPS | flanker_flex | FCA26-SWISS-R1-M09 / 2 Suravasa | 74.2 | 91.5 | 8.8 | 17.3 | OK |
| FCA26-P0173 | FG | Sojourn | HITSCAN | rail_hitscan | FCA26-SWISS-R5-M03 / 2 Rialto | 70.6 | 91.5 | 8.8 | 20.9 | OK |
| FCA26-P0187 | CUG | Kiriko | FLEX_SUPPORT | utility_flex_support | FCA26-SWISS-R2-M05 / 3 Esperança | 74.6 | 92.3 | 8.8 | 17.7 | OK |
| FCA26-P0077 | SPS | Tracer | FLEX_DPS | flanker_flex | FCA26-SWISS-R1-M10 / 3 Esperança | 75.9 | 92.5 | 8.8 | 16.7 | OK |
| FCA26-P0165 | HYW | Sigma | TANK | poke_tank | FCA26-SWISS-R4-M13 / 2 Havana | 69.6 | 92.0 | 8.8 | 22.4 | OK |
| FCA26-P0169 | HYW | Kiriko | FLEX_SUPPORT | utility_flex_support | FCA26-SWISS-R2-M15 / 1 Lijiang Tower | 76.6 | 92.5 | 8.8 | 15.8 | OK |
| FCA26-P0098 | TNS | Vendetta | FLEX_DPS | flanker_flex | FCA26-SWISS-R5-M02 / 1 Lijiang Tower | 70.3 | 90.7 | 8.7 | 20.4 | OK |
| FCA26-P0084 | SPC | Vendetta | FLEX_DPS | flanker_flex | FCA26-SWISS-R5-M09 / 1 Lijiang Tower | 73.7 | 90.6 | 8.7 | 16.8 | OK |
| FCA26-P0141 | SK | Mizuki | MAIN_SUPPORT | utility_main_support | FCA26-SWISS-R1-M04 / 3 Havana | 76.9 | 90.3 | 8.7 | 13.4 | OK |
| FCA26-P0122 | XCFN.G | Reaper | FLEX_DPS | brawl_flex | FCA26-PLAYOFFS-R1-M03 / 1 Lijiang Tower | 74.0 | 90.3 | 8.7 | 16.4 | OK |
| FCA26-P0186 | CUG | Cassidy | HITSCAN | midrange_hitscan | FCA26-SWISS-R5-M06 / 3 Aatlis | 74.3 | 90.5 | 8.7 | 16.2 | OK |
| FCA26-P0166 | HYW | Sojourn | HITSCAN | rail_hitscan | FCA26-SWISS-R2-M15 / 2 Midtown | 66.5 | 91.4 | 8.7 | 24.9 | OK |
| FCA26-P0166 | HYW | Echo | FLEX_DPS | projectile_flex | FCA26-PLAYOFFS-R1-M02 / 2 Esperança | 71.2 | 90.2 | 8.7 | 19.0 | OK |
| FCA26-P0166 | HYW | Reaper | FLEX_DPS | brawl_flex | FCA26-PLAYOFFS-R1-M07 / 1 Lijiang Tower | 73.9 | 91.4 | 8.7 | 17.5 | OK |

### V1 MapRating Lowest
| Player | Team | Hero | Subrole | Profile | Map | Legacy | V1 Raw | V1 Map | Delta | Sample |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FCA26-P0015 | CR | Vendetta | FLEX_DPS | flanker_flex | FCA26-SWISS-R5-M02 / 1 Lijiang Tower | 19.5 | 6.4 | 5.6 | -13.1 | OK |
| FCA26-P0070 | SD | Vendetta | FLEX_DPS | flanker_flex | FCA26-SWISS-R4-M08 / 1 Busan | 20.4 | 7.4 | 5.6 | -12.9 | OK |
| FCA26-P0009 | ASP | Sojourn | HITSCAN | rail_hitscan | FCA26-SWISS-R5-M03 / 2 Rialto | 20.2 | 6.5 | 5.6 | -13.7 | OK |
| FCA26-P0090 | TCK | Sojourn | HITSCAN | rail_hitscan | FCA26-SWISS-R4-M14 / 1 Busan | 17.6 | 7.1 | 5.6 | -10.4 | OK |
| FCA26-P0090 | TCK | Sojourn | HITSCAN | rail_hitscan | FCA26-SWISS-R4-M14 / 2 Suravasa | 18.7 | 7.2 | 5.6 | -11.5 | OK |
| FCA26-P0122 | XCFN.G | Cassidy | HITSCAN | midrange_hitscan | FCA26-SWISS-R1-M10 / 3 Esperança | 18.5 | 6.2 | 5.6 | -12.2 | OK |
| FCA26-P0186 | CUG | Sojourn | HITSCAN | rail_hitscan | FCA26-SWISS-R3-M02 / 3 Havana | 19.8 | 7.7 | 5.6 | -12.1 | OK |
| FCA26-P0109 | V50 | Tracer | FLEX_DPS | flanker_flex | FCA26-SWISS-R1-M14 / 2 Midtown | 17.7 | 8.2 | 5.6 | -9.5 | OK |
| FCA26-P0014 | CR | Emre | HITSCAN | midrange_hitscan | FCA26-SWISS-R5-M02 / 1 Lijiang Tower | 26.6 | 10.0 | 5.7 | -16.6 | OK |
| FCA26-P0049 | OL | Cassidy | HITSCAN | midrange_hitscan | FCA26-SWISS-R3-M04 / 1 Oasis | 20.7 | 8.7 | 5.7 | -12.0 | OK |
| FCA26-P0007 | ASP | D.Va | TANK | dive_tank | FCA26-LCQ-M22 / 2 Esperança | 23.3 | 9.7 | 5.7 | -13.6 | OK |
| FCA26-P0084 | SPC | Tracer | FLEX_DPS | flanker_flex | FCA26-SWISS-R6-M07 / 3 Aatlis | 19.8 | 9.6 | 5.7 | -10.2 | OK |
| FCA26-P0106 | TF | Vendetta | FLEX_DPS | flanker_flex | FCA26-LCQ-M20 / 1 Lijiang Tower | 20.1 | 8.5 | 5.7 | -11.5 | OK |
| FCA26-P0089 | TCK | D.Va | TANK | dive_tank | FCA26-SWISS-R1-M02 / 1 Busan | 23.7 | 8.9 | 5.7 | -14.7 | OK |
| FCA26-P0089 | TCK | Orisa | TANK | anchor_tank | FCA26-SWISS-R2-M11 / 1 Lijiang Tower | 22.3 | 10.1 | 5.7 | -12.2 | LOW_SAMPLE |
| FCA26-P0089 | TCK | Orisa | TANK | anchor_tank | FCA26-SWISS-R2-M11 / 2 Suravasa | 20.3 | 8.9 | 5.7 | -11.4 | LOW_SAMPLE |
| FCA26-P0120 | XCFN.G | Vendetta | FLEX_DPS | flanker_flex | FCA26-SWISS-R1-M10 / 3 Esperança | 21.4 | 9.2 | 5.7 | -12.1 | OK |
| FCA26-P0124 | XCFN.G | Kiriko | FLEX_SUPPORT | utility_flex_support | FCA26-SWISS-R1-M10 / 3 Esperança | 23.3 | 9.1 | 5.7 | -14.3 | OK |
| FCA26-P0024 | FZ | D.Va | TANK | dive_tank | FCA26-SWISS-R2-M05 / 3 Esperança | 23.2 | 8.8 | 5.7 | -14.4 | OK |
| FCA26-P0041 | JDG | Wrecking Ball | TANK | disrupt_tank | FCA26-SWISS-R6-M09 / 1 Oasis | 22.2 | 9.6 | 5.7 | -12.6 | OK |

## Sanity Checks

- Symmetra blocked: Symmetra uses barrier_utility_flex; blocked is recognized but capped by Rating Model v1. map P50 7.1.
- Lúcio tempo: Lúcio uses tempo_main_support, so low relative healing is balanced by assists/survival/blocked. map P50 7.
- Doomfist / Wrecking Ball: Doomfist and Wrecking Ball use disrupt_tank, lowering dependence on blocked. map P50 7.
- damage_flex_support: damage_flex_support recognizes Illari/Zenyatta damage and elims. damage P50 55.9.
- High damage low survival DPS: High damage with weak survival is not automatically top rated.
- Sierra / 西拉: Sierra / 西拉 resolves to HITSCAN / poke_hitscan. profiles poke_hitscan.
