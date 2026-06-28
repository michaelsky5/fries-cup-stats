# FCA Rating Model Replay Report

DEBUG ONLY - NOT OFFICIAL RANKING

Generated: 2026-06-27T20:24:29.933Z
Input: D:\Fries Cup\fries-cup-stats\public\data\friescup_db_review_ready.json
Rating model: v1.0

## Overview

- effective logs: 3008
- total minutes: 32,990
- unknown heroes: None
- fallback count: 0
- profile fallback count: 0

## Rating Distribution

| Metric | P10 | P25 | P50 | P75 | P90 | P95 | Mean | Max |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| rawScore | 24.6 | 35.4 | 49.5 | 63.7 | 74.8 | 80.7 | 49.6 | 96.2 |
| mapRating | 6.4 | 6.6 | 7 | 7.4 | 7.8 | 8.1 | 7.0 | 9.1 |

### By Subrole

| Subrole | Logs | Minutes | Raw P50 | Raw P75 | Raw P90 | Map P50 | Map P75 | Map P90 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FLEX_DPS | 698 | 7,666 | 48.6 | 65.1 | 76.1 | 7 | 7.5 | 7.9 |
| FLEX_SUPPORT | 670 | 7,499 | 49.7 | 62.8 | 74.4 | 7 | 7.4 | 7.8 |
| TANK | 602 | 6,603 | 51.1 | 62.6 | 72.9 | 7 | 7.4 | 7.7 |
| MAIN_SUPPORT | 534 | 5,708 | 49.0 | 62.3 | 73.3 | 7 | 7.4 | 7.8 |
| HITSCAN | 504 | 5,515 | 48.7 | 65.5 | 76.6 | 7 | 7.5 | 7.9 |

### By Scoring Profile

| Profile | Logs | Minutes | Raw P50 | Raw P75 | Raw P90 | Map P50 | Map P75 | Map P90 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| utility_flex_support | 585 | 6,536 | 49.7 | 62.8 | 74.6 | 7 | 7.4 | 7.8 |
| flanker_flex | 446 | 4,871 | 48.2 | 65.1 | 76.4 | 7 | 7.5 | 7.9 |
| tempo_main_support | 389 | 4,139 | 49.4 | 62.3 | 72.7 | 7 | 7.4 | 7.7 |
| brawl_tank | 266 | 2,855 | 52.0 | 61.5 | 70.9 | 7.1 | 7.3 | 7.7 |
| midrange_hitscan | 254 | 2,722 | 48.9 | 66.7 | 76.8 | 7 | 7.5 | 7.9 |
| dive_tank | 191 | 2,125 | 50.4 | 66.0 | 75.1 | 7 | 7.5 | 7.8 |
| brawl_flex | 171 | 1,872 | 48.5 | 65.3 | 72.9 | 7 | 7.5 | 7.7 |
| rail_hitscan | 159 | 1,775 | 48.1 | 64.8 | 76.9 | 7 | 7.4 | 7.9 |
| utility_main_support | 102 | 1,116 | 48.7 | 60.9 | 74.3 | 7 | 7.3 | 7.8 |
| projectile_flex | 60 | 727.6 | 50.2 | 61.3 | 77.9 | 7 | 7.3 | 8 |
| damage_flex_support | 50 | 571.3 | 50.5 | 61.0 | 70.1 | 7 | 7.3 | 7.6 |
| disrupt_tank | 49 | 564.8 | 49.8 | 61.3 | 71.5 | 7 | 7.3 | 7.6 |
| turret_damage | 49 | 538 | 57.6 | 68.1 | 74.5 | 7.2 | 7.5 | 7.8 |
| poke_tank | 42 | 486.6 | 54.1 | 61.2 | 74.0 | 7.1 | 7.3 | 7.8 |
| protector_main_support | 42 | 445.0 | 49.1 | 62.0 | 72.2 | 7 | 7.4 | 7.7 |
| poke_hitscan | 34 | 390.3 | 42.2 | 64.0 | 77.0 | 6.8 | 7.4 | 8.0 |
| tempo_tank | 31 | 348.0 | 54.3 | 64.8 | 71.6 | 7.1 | 7.5 | 7.7 |
| hybrid_flex_support | 30 | 339.6 | 47.9 | 64.2 | 70.1 | 7.0 | 7.4 | 7.6 |
| anchor_tank | 18 | 172.0 | 34.2 | 50.2 | 69.1 | 6.6 | 7.0 | 7.6 |
| barrier_utility_flex | 17 | 158.4 | 53.7 | 69.1 | 74.1 | 7.1 | 7.6 | 7.8 |
| tracking_hitscan | 7 | 83.8 | 35.1 | 44.3 | 58.8 | 6.6 | 6.9 | 7.3 |
| pick_tank | 5 | 51.9 | 35.6 | 42.7 | 46.5 | 6.7 | 6.8 | 6.9 |
| volume_flex_support | 5 | 51.8 | 44.3 | 51.1 | 54.5 | 6.9 | 7 | 7.1 |
| utility_flex | 4 | 36.5 | 60.6 | 63.9 | 69.5 | 7.3 | 7.4 | 7.6 |
| pocket_main_support | 1 | 7.7 | 43.5 | 43.5 | 43.5 | 6.8 | 6.8 | 6.8 |
| sniper_hitscan | 1 | 5.5 | 14.1 | 14.1 | 14.1 | 5.9 | 5.9 | 5.9 |

## Sanity Checks

### A. Symmetra / barrier_utility_flex

- Symmetra blocked is represented through barrier_utility_flex, while mapRating remains bounded by the 9.8 cap.
- blocked percentile P50/P75/P90: 92.2 / 95 / 95
- mapRating P50/P75/P90/max: 7.1 / 7.6 / 7.8 / 8.6

### B. Lúcio / tempo_main_support

- Lúcio is evaluated through tempo_main_support, so assists/survival/blocked keep low healing from burying the rating.
- healing/assists/survival P50: 50.2 / 50.8 / 50.2
- mapRating P50/P75/P90: 7 / 7.4 / 7.9

### C. dive_tank / disrupt_tank / poke_tank

- disrupt_tank lowers blocked weight, while poke_tank can still recognize blocked/damage without using one shared tank pool only.
- Doomfist/Ball blocked P50 46.1, mapRating P50 7
- Sigma/Domina blocked P50 59.7, damage P50 56.6, mapRating P50 7.1

### D. damage_flex_support

- Illari/Zenyatta damage and elims are represented, and damage_flex_support is exempt from the support healing soft cap.
- elims/damage/healing P50: 52.4 / 55.9 / 48.8
- mapRating P50/P75/P90: 7 / 7.3 / 7.6

### E. High Damage High Deaths DPS

- High damage rows with low survival are surfaced for review so damage alone does not imply top-end rating.
| Player | Hero | Profile | Match | Map | RawScore | MapRating | Damage% | Survival% | Deaths/10 | Sample |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FCA26-P0009 | Tracer | flanker_flex | FCA26-LCQ-M10 | 1 Oasis | 53.9 | 7.1 | 100 | 32.9 | 7.9 | OK |
| FCA26-P0106 | Tracer | flanker_flex | FCA26-SWISS-R5-M05 | 1 Lijiang Tower | 46.5 | 6.9 | 100 | 12.9 | 9.7 | OK |
| FCA26-P0106 | Emre | midrange_hitscan | FCA26-LCQ-M8 | 1 Lijiang Tower | 55.2 | 7.2 | 100 | 18.3 | 8.3 | OK |
| FCA26-P0186 | Echo | projectile_flex | FCA26-LCQ-M13 | 1 Lijiang Tower | 53.8 | 7.1 | 100 | 25.9 | 7.8 | OK |
| FCA26-P0077 | Tracer | flanker_flex | FCA26-SWISS-R6-M02 | 3 Havana | 55.4 | 7.2 | 100 | 31.8 | 8.0 | OK |
| FCA26-P0167 | Tracer | flanker_flex | FCA26-PLAYOFFS-R1-M14 | 2 Suravasa | 59.9 | 7.3 | 100 | 33.6 | 7.9 | OK |
| FCA26-P0026 | Tracer | flanker_flex | FCA26-LCQ-M19 | 2 Havana | 42.9 | 6.8 | 98.9 | 16.1 | 9.4 | OK |
| FCA26-P0142 | Sojourn | rail_hitscan | FCA26-LCQ-M9 | 1 Lijiang Tower | 51.4 | 7 | 98.7 | 4.6 | 11.1 | OK |
| FCA26-P0085 | Reaper | brawl_flex | FCA26-PLAYOFFS-R1-M12 | 3 Aatlis | 71.0 | 7.6 | 97.1 | 34.8 | 7.8 | OK |
| FCA26-P0009 | Sojourn | rail_hitscan | FCA26-SWISS-R2-M03 | 2 Suravasa | 68.9 | 7.6 | 96.0 | 32.4 | 7.3 | OK |
| FCA26-P0025 | Venture | brawl_flex | FCA26-SWISS-R4-M10 | 2 Aatlis | 42.0 | 6.8 | 95.9 | 2.8 | 11.1 | OK |
| FCA26-P0084 | Vendetta | flanker_flex | FCA26-SWISS-R3-M08 | 2 Suravasa | 70.3 | 7.6 | 95.7 | 25.5 | 8.5 | OK |

## Top Debug Rows

DEBUG ONLY - NOT OFFICIAL RANKING

### TANK RawScore Top 10

| Player | Hero | Profile | Match | Map | RawScore | MapRating | Damage% | Survival% | Deaths/10 | Sample |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FCA26-P0171 | Domina | poke_tank | FCA26-SWISS-R3-M02 | 3 Havana | 96.2 | 9.1 | 100 | 100 | 0 | LOW_SAMPLE |
| FCA26-P0165 | Sigma | poke_tank | FCA26-SWISS-R4-M13 | 2 Havana | 92.0 | 8.8 | 100 | 100 | 0 | OK |
| FCA26-P0145 | D.Va | dive_tank | FCA26-SWISS-R4-M14 | 1 Busan | 89.5 | 8.6 | 70.3 | 100 | 0 | OK |
| FCA26-P0008 | Hazard | brawl_tank | FCA26-SWISS-R2-M03 | 1 Lijiang Tower | 87.6 | 8.5 | 100 | 67.3 | 3.6 | OK |
| FCA26-P0076 | Zarya | brawl_tank | FCA26-SWISS-R1-M10 | 3 Esperança | 87.0 | 8.4 | 85.8 | 100 | 0 | OK |
| FCA26-P0184 | Winston | dive_tank | FCA26-SWISS-R2-M05 | 3 Esperança | 86.7 | 8.4 | 60.9 | 100 | 0 | OK |
| FCA26-P0145 | D.Va | dive_tank | FCA26-SWISS-R3-M15 | 1 Oasis | 85.8 | 8.4 | 91.1 | 91.4 | 1.5 | OK |
| FCA26-P0083 | D.Va | dive_tank | FCA26-SWISS-R4-M05 | 1 Busan | 85.7 | 8.3 | 66.7 | 85.6 | 2.0 | OK |
| FCA26-P0119 | D.Va | dive_tank | FCA26-SWISS-R6-M11 | 2 Aatlis | 85.5 | 8.3 | 36.2 | 91.5 | 1.4 | OK |
| FCA26-P0171 | Orisa | anchor_tank | FCA26-LCQ-M18 | 3 Havana | 84.6 | 8.3 | 90.4 | 92.0 | 1.6 | LOW_SAMPLE |

### FLEX_DPS RawScore Top 10

| Player | Hero | Profile | Match | Map | RawScore | MapRating | Damage% | Survival% | Deaths/10 | Sample |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FCA26-P0031 | Vendetta | flanker_flex | FCA26-SWISS-R3-M06 | 1 Oasis | 95.2 | 9 | 100 | 91.3 | 3.4 | OK |
| FCA26-P0010 | Venture | brawl_flex | FCA26-SWISS-R1-M12 | 1 Busan | 93.3 | 8.9 | 96.8 | 91.2 | 2.8 | OK |
| FCA26-P0077 | Tracer | flanker_flex | FCA26-SWISS-R1-M10 | 3 Esperança | 92.5 | 8.8 | 100 | 92.9 | 2.6 | OK |
| FCA26-P0015 | Vendetta | flanker_flex | FCA26-SWISS-R1-M09 | 2 Suravasa | 91.5 | 8.8 | 100 | 93.2 | 2.6 | OK |
| FCA26-P0166 | Reaper | brawl_flex | FCA26-PLAYOFFS-R1-M07 | 1 Lijiang Tower | 91.4 | 8.7 | 100 | 88.6 | 3.5 | OK |
| FCA26-P0098 | Vendetta | flanker_flex | FCA26-SWISS-R5-M02 | 1 Lijiang Tower | 90.7 | 8.7 | 91.4 | 91.7 | 3.2 | OK |
| FCA26-P0084 | Vendetta | flanker_flex | FCA26-SWISS-R5-M09 | 1 Lijiang Tower | 90.6 | 8.7 | 100 | 89.9 | 3.8 | OK |
| FCA26-P0122 | Reaper | brawl_flex | FCA26-PLAYOFFS-R1-M03 | 1 Lijiang Tower | 90.3 | 8.7 | 100 | 100 | 0 | OK |
| FCA26-P0166 | Echo | projectile_flex | FCA26-PLAYOFFS-R1-M02 | 2 Esperança | 90.2 | 8.7 | 100 | 92.3 | 2.7 | OK |
| FCA26-P0120 | Vendetta | flanker_flex | FCA26-SWISS-R6-M11 | 2 Aatlis | 89.5 | 8.6 | 88.3 | 84.5 | 4.3 | OK |

### HITSCAN RawScore Top 10

| Player | Hero | Profile | Match | Map | RawScore | MapRating | Damage% | Survival% | Deaths/10 | Sample |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FCA26-P0147 | Freja | poke_hitscan | FCA26-SWISS-R4-M14 | 1 Busan | 95.2 | 9 | 100 | 94.3 | 1.6 | LOW_SAMPLE |
| FCA26-P0173 | Sojourn | rail_hitscan | FCA26-PLAYOFFS-R1-M01 | 1 Lijiang Tower | 93.2 | 8.9 | 98.9 | 84.8 | 4.1 | OK |
| FCA26-P0173 | Sojourn | rail_hitscan | FCA26-SWISS-R5-M03 | 2 Rialto | 91.5 | 8.8 | 97.2 | 95.1 | 1.8 | OK |
| FCA26-P0166 | Sojourn | rail_hitscan | FCA26-SWISS-R2-M15 | 2 Midtown | 91.4 | 8.7 | 89.4 | 96.3 | 1.3 | OK |
| FCA26-P0186 | Cassidy | midrange_hitscan | FCA26-SWISS-R5-M06 | 3 Aatlis | 90.5 | 8.7 | 90.1 | 86.9 | 3.9 | OK |
| FCA26-P0147 | Emre | midrange_hitscan | FCA26-SWISS-R3-M15 | 1 Oasis | 89.8 | 8.6 | 100 | 94.8 | 1.5 | OK |
| FCA26-P0009 | Bastion | turret_damage | FCA26-LCQ-M19 | 2 Havana | 89.5 | 8.6 | 100 | 81.4 | 4.7 | OK |
| FCA26-P0009 | Emre | midrange_hitscan | FCA26-SWISS-R2-M03 | 1 Lijiang Tower | 88.8 | 8.6 | 95.9 | 95.7 | 1.2 | OK |
| FCA26-P0167 | Cassidy | midrange_hitscan | FCA26-PLAYOFFS-R1-M02 | 1 Oasis | 88.4 | 8.5 | 100 | 96.3 | 1.4 | OK |
| FCA26-P0100 | Emre | midrange_hitscan | FCA26-SWISS-R4-M03 | 2 Suravasa | 86.9 | 8.4 | 91.7 | 94.4 | 1.6 | OK |

### MAIN_SUPPORT RawScore Top 10

| Player | Hero | Profile | Match | Map | RawScore | MapRating | Damage% | Survival% | Deaths/10 | Sample |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FCA26-P0101 | Lúcio | tempo_main_support | FCA26-SWISS-R5-M02 | 1 Lijiang Tower | 93.5 | 8.9 | 79.2 | 100 | 0 | OK |
| FCA26-P0141 | Mizuki | utility_main_support | FCA26-SWISS-R1-M04 | 3 Havana | 90.3 | 8.7 | 67.3 | 92.6 | 2.0 | OK |
| FCA26-P0143 | Brigitte | protector_main_support | FCA26-LCQ-M20 | 1 Lijiang Tower | 88.8 | 8.6 | 39.7 | 88.6 | 3.7 | OK |
| FCA26-P0190 | Lúcio | tempo_main_support | FCA26-LCQ-M12 | 2 Aatlis | 88.7 | 8.6 | 42.3 | 100 | 0 | OK |
| FCA26-P0175 | Brigitte | protector_main_support | FCA26-SWISS-R1-M06 | 2 Esperança | 88.6 | 8.6 | 88.4 | 91.5 | 3.0 | OK |
| FCA26-P0190 | Lúcio | tempo_main_support | FCA26-SWISS-R6-M07 | 1 Oasis | 88.0 | 8.5 | 43.1 | 90.4 | 2.4 | OK |
| FCA26-P0060 | Mizuki | utility_main_support | FCA26-SWISS-R2-M06 | 1 Lijiang Tower | 88.0 | 8.5 | 74.1 | 81.6 | 3.6 | OK |
| FCA26-P0079 | Lúcio | tempo_main_support | FCA26-SWISS-R2-M07 | 1 Lijiang Tower | 87.8 | 8.5 | 47.9 | 86.5 | 2.9 | OK |
| FCA26-P0138 | Lúcio | tempo_main_support | FCA26-LCQ-M10 | 2 Suravasa | 87.7 | 8.5 | 56.6 | 96.8 | 0.8 | OK |
| FCA26-P0187 | Mizuki | utility_main_support | FCA26-SWISS-R2-M05 | 1 Lijiang Tower | 87.6 | 8.5 | 97.0 | 80.5 | 3.7 | OK |

### FLEX_SUPPORT RawScore Top 10

| Player | Hero | Profile | Match | Map | RawScore | MapRating | Damage% | Survival% | Deaths/10 | Sample |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FCA26-P0169 | Kiriko | utility_flex_support | FCA26-SWISS-R2-M15 | 1 Lijiang Tower | 92.5 | 8.8 | 91.5 | 95.1 | 1.3 | OK |
| FCA26-P0187 | Kiriko | utility_flex_support | FCA26-SWISS-R2-M05 | 3 Esperança | 92.3 | 8.8 | 97.4 | 100 | 0 | OK |
| FCA26-P0170 | Kiriko | utility_flex_support | FCA26-PLAYOFFS-R1-M07 | 1 Lijiang Tower | 89.4 | 8.6 | 71.7 | 80.6 | 3.5 | OK |
| FCA26-P0035 | Kiriko | utility_flex_support | FCA26-SWISS-R1-M04 | 1 Busan | 89.3 | 8.6 | 78.5 | 96.0 | 1.1 | OK |
| FCA26-P0088 | Kiriko | utility_flex_support | FCA26-LCQ-M12 | 2 Aatlis | 89.2 | 8.6 | 27.0 | 100 | 0 | OK |
| FCA26-P0088 | Kiriko | utility_flex_support | FCA26-SWISS-R6-M07 | 1 Oasis | 88.9 | 8.6 | 51.2 | 90.7 | 2.4 | OK |
| FCA26-P0088 | Kiriko | utility_flex_support | FCA26-SWISS-R3-M08 | 1 Oasis | 88.4 | 8.5 | 34.6 | 96.1 | 1.0 | OK |
| FCA26-P0023 | Kiriko | utility_flex_support | FCA26-SWISS-R4-M10 | 2 Aatlis | 87.4 | 8.5 | 78.0 | 82.7 | 3.3 | OK |
| FCA26-P0059 | Kiriko | utility_flex_support | FCA26-SWISS-R2-M06 | 1 Lijiang Tower | 87.2 | 8.5 | 35.8 | 93.3 | 1.8 | OK |
| FCA26-P0088 | Kiriko | utility_flex_support | FCA26-SWISS-R5-M09 | 1 Lijiang Tower | 86.2 | 8.4 | 76.8 | 90.4 | 2.5 | OK |

### TANK MapRating Top 10

| Player | Hero | Profile | Match | Map | RawScore | MapRating | Damage% | Survival% | Deaths/10 | Sample |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FCA26-P0171 | Domina | poke_tank | FCA26-SWISS-R3-M02 | 3 Havana | 96.2 | 9.1 | 100 | 100 | 0 | LOW_SAMPLE |
| FCA26-P0165 | Sigma | poke_tank | FCA26-SWISS-R4-M13 | 2 Havana | 92.0 | 8.8 | 100 | 100 | 0 | OK |
| FCA26-P0145 | D.Va | dive_tank | FCA26-SWISS-R4-M14 | 1 Busan | 89.5 | 8.6 | 70.3 | 100 | 0 | OK |
| FCA26-P0008 | Hazard | brawl_tank | FCA26-SWISS-R2-M03 | 1 Lijiang Tower | 87.6 | 8.5 | 100 | 67.3 | 3.6 | OK |
| FCA26-P0145 | D.Va | dive_tank | FCA26-SWISS-R3-M15 | 1 Oasis | 85.8 | 8.4 | 91.1 | 91.4 | 1.5 | OK |
| FCA26-P0184 | Winston | dive_tank | FCA26-SWISS-R2-M05 | 3 Esperança | 86.7 | 8.4 | 60.9 | 100 | 0 | OK |
| FCA26-P0076 | Zarya | brawl_tank | FCA26-SWISS-R1-M10 | 3 Esperança | 87.0 | 8.4 | 85.8 | 100 | 0 | OK |
| FCA26-P0083 | D.Va | dive_tank | FCA26-SWISS-R4-M05 | 1 Busan | 85.7 | 8.3 | 66.7 | 85.6 | 2.0 | OK |
| FCA26-P0103 | Zarya | brawl_tank | FCA26-SWISS-R4-M07 | 1 Busan | 84.5 | 8.3 | 94.2 | 100 | 0 | OK |
| FCA26-P0119 | D.Va | dive_tank | FCA26-SWISS-R6-M11 | 2 Aatlis | 85.5 | 8.3 | 36.2 | 91.5 | 1.4 | OK |

### FLEX_DPS MapRating Top 10

| Player | Hero | Profile | Match | Map | RawScore | MapRating | Damage% | Survival% | Deaths/10 | Sample |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FCA26-P0031 | Vendetta | flanker_flex | FCA26-SWISS-R3-M06 | 1 Oasis | 95.2 | 9 | 100 | 91.3 | 3.4 | OK |
| FCA26-P0010 | Venture | brawl_flex | FCA26-SWISS-R1-M12 | 1 Busan | 93.3 | 8.9 | 96.8 | 91.2 | 2.8 | OK |
| FCA26-P0015 | Vendetta | flanker_flex | FCA26-SWISS-R1-M09 | 2 Suravasa | 91.5 | 8.8 | 100 | 93.2 | 2.6 | OK |
| FCA26-P0077 | Tracer | flanker_flex | FCA26-SWISS-R1-M10 | 3 Esperança | 92.5 | 8.8 | 100 | 92.9 | 2.6 | OK |
| FCA26-P0166 | Reaper | brawl_flex | FCA26-PLAYOFFS-R1-M07 | 1 Lijiang Tower | 91.4 | 8.7 | 100 | 88.6 | 3.5 | OK |
| FCA26-P0084 | Vendetta | flanker_flex | FCA26-SWISS-R5-M09 | 1 Lijiang Tower | 90.6 | 8.7 | 100 | 89.9 | 3.8 | OK |
| FCA26-P0166 | Echo | projectile_flex | FCA26-PLAYOFFS-R1-M02 | 2 Esperança | 90.2 | 8.7 | 100 | 92.3 | 2.7 | OK |
| FCA26-P0098 | Vendetta | flanker_flex | FCA26-SWISS-R5-M02 | 1 Lijiang Tower | 90.7 | 8.7 | 91.4 | 91.7 | 3.2 | OK |
| FCA26-P0122 | Reaper | brawl_flex | FCA26-PLAYOFFS-R1-M03 | 1 Lijiang Tower | 90.3 | 8.7 | 100 | 100 | 0 | OK |
| FCA26-P0179 | Sombra | flanker_flex | FCA26-SWISS-R4-M06 | 3 Esperança | 88.6 | 8.6 | 72.5 | 92.2 | 2.9 | OK |

### HITSCAN MapRating Top 10

| Player | Hero | Profile | Match | Map | RawScore | MapRating | Damage% | Survival% | Deaths/10 | Sample |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FCA26-P0147 | Freja | poke_hitscan | FCA26-SWISS-R4-M14 | 1 Busan | 95.2 | 9 | 100 | 94.3 | 1.6 | LOW_SAMPLE |
| FCA26-P0173 | Sojourn | rail_hitscan | FCA26-PLAYOFFS-R1-M01 | 1 Lijiang Tower | 93.2 | 8.9 | 98.9 | 84.8 | 4.1 | OK |
| FCA26-P0173 | Sojourn | rail_hitscan | FCA26-SWISS-R5-M03 | 2 Rialto | 91.5 | 8.8 | 97.2 | 95.1 | 1.8 | OK |
| FCA26-P0166 | Sojourn | rail_hitscan | FCA26-SWISS-R2-M15 | 2 Midtown | 91.4 | 8.7 | 89.4 | 96.3 | 1.3 | OK |
| FCA26-P0186 | Cassidy | midrange_hitscan | FCA26-SWISS-R5-M06 | 3 Aatlis | 90.5 | 8.7 | 90.1 | 86.9 | 3.9 | OK |
| FCA26-P0009 | Emre | midrange_hitscan | FCA26-SWISS-R2-M03 | 1 Lijiang Tower | 88.8 | 8.6 | 95.9 | 95.7 | 1.2 | OK |
| FCA26-P0147 | Emre | midrange_hitscan | FCA26-SWISS-R3-M15 | 1 Oasis | 89.8 | 8.6 | 100 | 94.8 | 1.5 | OK |
| FCA26-P0009 | Bastion | turret_damage | FCA26-LCQ-M19 | 2 Havana | 89.5 | 8.6 | 100 | 81.4 | 4.7 | OK |
| FCA26-P0167 | Cassidy | midrange_hitscan | FCA26-PLAYOFFS-R1-M02 | 1 Oasis | 88.4 | 8.5 | 100 | 96.3 | 1.4 | OK |
| FCA26-P0142 | Sierra | poke_hitscan | FCA26-LCQ-M20 | 1 Lijiang Tower | 86.3 | 8.4 | 94.1 | 95.5 | 1.2 | LOW_SAMPLE |

### MAIN_SUPPORT MapRating Top 10

| Player | Hero | Profile | Match | Map | RawScore | MapRating | Damage% | Survival% | Deaths/10 | Sample |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FCA26-P0101 | Lúcio | tempo_main_support | FCA26-SWISS-R5-M02 | 1 Lijiang Tower | 93.5 | 8.9 | 79.2 | 100 | 0 | OK |
| FCA26-P0141 | Mizuki | utility_main_support | FCA26-SWISS-R1-M04 | 3 Havana | 90.3 | 8.7 | 67.3 | 92.6 | 2.0 | OK |
| FCA26-P0143 | Brigitte | protector_main_support | FCA26-LCQ-M20 | 1 Lijiang Tower | 88.8 | 8.6 | 39.7 | 88.6 | 3.7 | OK |
| FCA26-P0190 | Lúcio | tempo_main_support | FCA26-LCQ-M12 | 2 Aatlis | 88.7 | 8.6 | 42.3 | 100 | 0 | OK |
| FCA26-P0175 | Brigitte | protector_main_support | FCA26-SWISS-R1-M06 | 2 Esperança | 88.6 | 8.6 | 88.4 | 91.5 | 3.0 | OK |
| FCA26-P0138 | Lúcio | tempo_main_support | FCA26-LCQ-M10 | 2 Suravasa | 87.7 | 8.5 | 56.6 | 96.8 | 0.8 | OK |
| FCA26-P0060 | Mizuki | utility_main_support | FCA26-SWISS-R2-M06 | 1 Lijiang Tower | 88.0 | 8.5 | 74.1 | 81.6 | 3.6 | OK |
| FCA26-P0190 | Lúcio | tempo_main_support | FCA26-SWISS-R6-M07 | 1 Oasis | 88.0 | 8.5 | 43.1 | 90.4 | 2.4 | OK |
| FCA26-P0187 | Mizuki | utility_main_support | FCA26-SWISS-R2-M05 | 1 Lijiang Tower | 87.6 | 8.5 | 97.0 | 80.5 | 3.7 | OK |
| FCA26-P0079 | Lúcio | tempo_main_support | FCA26-SWISS-R2-M07 | 1 Lijiang Tower | 87.8 | 8.5 | 47.9 | 86.5 | 2.9 | OK |

### FLEX_SUPPORT MapRating Top 10

| Player | Hero | Profile | Match | Map | RawScore | MapRating | Damage% | Survival% | Deaths/10 | Sample |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FCA26-P0169 | Kiriko | utility_flex_support | FCA26-SWISS-R2-M15 | 1 Lijiang Tower | 92.5 | 8.8 | 91.5 | 95.1 | 1.3 | OK |
| FCA26-P0187 | Kiriko | utility_flex_support | FCA26-SWISS-R2-M05 | 3 Esperança | 92.3 | 8.8 | 97.4 | 100 | 0 | OK |
| FCA26-P0035 | Kiriko | utility_flex_support | FCA26-SWISS-R1-M04 | 1 Busan | 89.3 | 8.6 | 78.5 | 96.0 | 1.1 | OK |
| FCA26-P0170 | Kiriko | utility_flex_support | FCA26-PLAYOFFS-R1-M07 | 1 Lijiang Tower | 89.4 | 8.6 | 71.7 | 80.6 | 3.5 | OK |
| FCA26-P0088 | Kiriko | utility_flex_support | FCA26-SWISS-R6-M07 | 1 Oasis | 88.9 | 8.6 | 51.2 | 90.7 | 2.4 | OK |
| FCA26-P0088 | Kiriko | utility_flex_support | FCA26-LCQ-M12 | 2 Aatlis | 89.2 | 8.6 | 27.0 | 100 | 0 | OK |
| FCA26-P0059 | Kiriko | utility_flex_support | FCA26-SWISS-R2-M06 | 1 Lijiang Tower | 87.2 | 8.5 | 35.8 | 93.3 | 1.8 | OK |
| FCA26-P0088 | Kiriko | utility_flex_support | FCA26-SWISS-R3-M08 | 1 Oasis | 88.4 | 8.5 | 34.6 | 96.1 | 1.0 | OK |
| FCA26-P0023 | Kiriko | utility_flex_support | FCA26-SWISS-R4-M10 | 2 Aatlis | 87.4 | 8.5 | 78.0 | 82.7 | 3.3 | OK |
| FCA26-P0088 | Kiriko | utility_flex_support | FCA26-SWISS-R5-M09 | 1 Lijiang Tower | 86.2 | 8.4 | 76.8 | 90.4 | 2.5 | OK |

## Low Sample / Unknowns

- VERY_LOW_SAMPLE heroes: Anran (4), Hanzo (4), Mei (4), Lifeweaver (2), Mercy (1), Widowmaker (1)
- LOW_SAMPLE heroes: Doomfist (19), Domina (18), Orisa (18), Symmetra (17), Ashe (13), Junker Queen (12), Sierra (9), Freja (8), Zenyatta (8), Soldier: 76 (7), Moira (5), Roadhog (5)
- UNKNOWN heroes: None
- fallback profiles: None
