# FCA Hero Profile Report

Generated: 2026-06-27T20:24:20.117Z
Input: D:\Fries Cup\fries-cup-stats\public\data\friescup_db_review_ready.json
Season: FCA2026

Metric cells show raw P50/P75/P90 and winsorized P50/P75/P90. Winsorized values clamp each group metric above p95 only when that group metric has at least 5 samples.

## Overview

- team_count: 30
- player_count: 191
- match_count: 127
- map_count: 412
- valid logs: 3008
- filtered logs: 512
- dedupe removed: 0
- total valid playtime minutes: 32,990
- recognized heroes: 48
- UNKNOWN heroes: 0

## Data Cleaning Summary

| Rule | Count |
| --- | --- |
| Selected source logs | 3520 |
| Players using match_logs | 188 |
| Players using live_match_logs fallback | 0 |
| Skipped live_match_logs because match_logs existed | 3520 |
| Filtered playtimeMinutes <= 0 | 510 |
| Filtered hero empty | 2 |
| Filtered totals all 0 | 0 |
| Dedupe removed | 0 |
| Valid logs | 3008 |

## Hero Baselines

| Hero | Official Role | Subrole | Scoring Profile | Sample Logs | Total Minutes | Elims P50/P75/P90 | Assists P50/P75/P90 | Deaths P50/P75/P90 | Damage P50/P75/P90 | Healing P50/P75/P90 | Blocked P50/P75/P90 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Kiriko | SUPPORT | FLEX_SUPPORT | utility_flex_support | 501 | 5,500 | raw 8.5 / 11.7 / 15.1; win 8.5 / 11.7 / 15.1 | raw 16.5 / 22.7 / 28.3; win 16.5 / 22.7 / 28.3 | raw 5.8 / 7.4 / 9.0; win 5.8 / 7.4 / 9.0 | raw 3,371 / 4,395 / 5,500; win 3,371 / 4,395 / 5,500 | raw 9,148 / 10,590 / 11,980; win 9,148 / 10,590 / 11,980 | raw 0 / 0 / 0; win 0 / 0 / 0 |
| Lúcio | SUPPORT | MAIN_SUPPORT | tempo_main_support | 294 | 3,113 | raw 11.7 / 16.0 / 20.3; win 11.7 / 16.0 / 20.3 | raw 13.8 / 18.4 / 22.6; win 13.8 / 18.4 / 22.6 | raw 6.0 / 7.8 / 9.4; win 6.0 / 7.8 / 9.4 | raw 3,566 / 4,222 / 4,833; win 3,566 / 4,222 / 4,833 | raw 7,414 / 8,703 / 9,827; win 7,414 / 8,703 / 9,827 | raw 1,359 / 1,915 / 2,367; win 1,359 / 1,915 / 2,367 |
| Tracer | DAMAGE | FLEX_DPS | flanker_flex | 216 | 2,428 | raw 15.6 / 20.5 / 26.0; win 15.6 / 20.5 / 26.0 | raw 0 / 0.7 / 1.7; win 0 / 0.7 / 1.7 | raw 6.7 / 8.4 / 10.0; win 6.7 / 8.4 / 10.0 | raw 6,943 / 8,495 / 9,596; win 6,943 / 8,495 / 9,596 | raw 106.3 / 270.2 / 553.7; win 106.3 / 270.2 / 553.7 | raw 0 / 346.6 / 940.3; win 0 / 346.6 / 940.3 |
| Vendetta | DAMAGE | FLEX_DPS | flanker_flex | 183 | 1,931 | raw 18.2 / 23.3 / 26.9; win 18.2 / 23.3 / 26.9 | raw 2.2 / 3.4 / 4.9; win 2.2 / 3.4 / 4.9 | raw 6.5 / 8.6 / 9.8; win 6.5 / 8.6 / 9.8 | raw 7,806 / 9,392 / 10,255; win 7,806 / 9,392 / 10,255 | raw 244.0 / 420.3 / 578.7; win 244.0 / 420.3 / 578.7 | raw 526.0 / 929.3 / 1,358; win 526.0 / 929.3 / 1,358 |
| Emre | DAMAGE | HITSCAN | midrange_hitscan | 168 | 1,774 | raw 18.3 / 22.8 / 28.8; win 18.3 / 22.8 / 28.8 | raw 0 / 0 / 0.8; win 0 / 0 / 0.8 | raw 5.4 / 7.5 / 8.8; win 5.4 / 7.5 / 8.8 | raw 10,362 / 11,789 / 13,149; win 10,362 / 11,789 / 13,149 | raw 650.2 / 853.7 / 1,168; win 650.2 / 853.7 / 1,168 | raw 0 / 0 / 66.7; win 0 / 0 / 66.7 |
| Sojourn | DAMAGE | HITSCAN | rail_hitscan | 159 | 1,775 | raw 15.8 / 21.6 / 26.0; win 15.8 / 21.6 / 26.0 | raw 0 / 0 / 1.2; win 0 / 0 / 1.2 | raw 6.2 / 7.8 / 10.2; win 6.2 / 7.8 / 10.2 | raw 8,549 / 9,621 / 10,851; win 8,549 / 9,621 / 10,851 | raw 0 / 110.6 / 302.8; win 0 / 110.6 / 302.8 | raw 0 / 0 / 223.1; win 0 / 0 / 223.1 |
| D.Va | TANK | TANK | dive_tank | 145 | 1,573 | raw 18.8 / 25.6 / 31.4; win 18.8 / 25.6 / 31.4 | raw 8.8 / 13.3 / 18.2; win 8.8 / 13.3 / 18.2 | raw 4.3 / 6.1 / 7.7; win 4.3 / 6.1 / 7.7 | raw 8,473 / 9,384 / 10,494; win 8,473 / 9,384 / 10,494 | raw 2,278 / 2,762 / 3,048; win 2,278 / 2,762 / 3,048 | raw 11,269 / 13,680 / 16,068; win 11,269 / 13,680 / 16,068 |
| Zarya | TANK | TANK | brawl_tank | 127 | 1,342 | raw 20.5 / 24.2 / 31.2; win 20.5 / 24.2 / 31.2 | raw 9.4 / 12.9 / 16.1; win 9.4 / 12.9 / 16.1 | raw 4.9 / 6.8 / 8.9; win 4.9 / 6.8 / 8.9 | raw 9,482 / 10,462 / 11,439; win 9,482 / 10,462 / 11,439 | raw 0 / 304.9 / 885.5; win 0 / 304.9 / 885.5 | raw 7,454 / 8,387 / 9,975; win 7,454 / 8,387 / 9,975 |
| Reaper | DAMAGE | FLEX_DPS | brawl_flex | 109 | 1,227 | raw 17.9 / 22.4 / 26.2; win 17.9 / 22.4 / 26.2 | raw 0 / 0 / 1.2; win 0 / 0 / 1.2 | raw 7.1 / 8.4 / 10.8; win 7.1 / 8.4 / 10.8 | raw 8,121 / 9,018 / 10,069; win 8,121 / 9,018 / 10,069 | raw 1,252 / 1,556 / 1,768; win 1,252 / 1,556 / 1,768 | raw 0 / 2.6 / 461.8; win 0 / 2.6 / 461.8 |
| Mauga | TANK | TANK | brawl_tank | 92 | 1,032 | raw 20.0 / 25.6 / 29.7; win 20.0 / 25.6 / 29.7 | raw 10.9 / 13.6 / 17.1; win 10.9 / 13.6 / 17.1 | raw 5.4 / 7.7 / 9.2; win 5.4 / 7.7 / 9.2 | raw 11,144 / 12,539 / 14,654; win 11,144 / 12,539 / 14,654 | raw 1,879 / 2,320 / 2,960; win 1,879 / 2,320 / 2,960 | raw 5,253 / 7,499 / 11,274; win 5,253 / 7,499 / 11,274 |
| Cassidy | DAMAGE | HITSCAN | midrange_hitscan | 86 | 947.5 | raw 16.7 / 20.8 / 25.5; win 16.7 / 20.8 / 25.5 | raw 1.0 / 2.2 / 3.7; win 1.0 / 2.2 / 3.7 | raw 6.9 / 8.1 / 9.9; win 6.9 / 8.1 / 9.9 | raw 9,476 / 10,992 / 12,785; win 9,476 / 10,992 / 12,785 | raw 0 / 327.5 / 601.9; win 0 / 327.5 / 601.9 | raw 153.1 / 235.0 / 356.1; win 153.1 / 235.0 / 356.1 |
| Ana | SUPPORT | FLEX_SUPPORT | utility_flex_support | 84 | 1,036 | raw 8.5 / 12.0 / 15.1; win 8.5 / 12.0 / 15.1 | raw 11.2 / 15.6 / 20.7; win 11.2 / 15.6 / 20.7 | raw 5.4 / 6.8 / 8.3; win 5.4 / 6.8 / 8.3 | raw 3,277 / 4,665 / 5,516; win 3,277 / 4,665 / 5,516 | raw 7,770 / 9,304 / 10,893; win 7,770 / 9,304 / 10,893 | raw 561.0 / 813.6 / 1,141; win 561.0 / 813.6 / 1,141 |
| Jetpack Cat | SUPPORT | MAIN_SUPPORT | tempo_main_support | 73 | 794.8 | raw 11.4 / 15.7 / 18.7; win 11.4 / 15.7 / 18.7 | raw 12.5 / 16.2 / 19.7; win 12.5 / 16.2 / 19.7 | raw 5 / 6.6 / 8.5; win 5 / 6.6 / 8.5 | raw 2,412 / 3,649 / 4,815; win 2,412 / 3,649 / 4,815 | raw 7,078 / 7,880 / 8,923; win 7,078 / 7,880 / 8,923 | raw 0 / 8.1 / 577.3; win 0 / 8.1 / 577.3 |
| Venture | DAMAGE | FLEX_DPS | brawl_flex | 62 | 645.8 | raw 16.0 / 22.5 / 26.4; win 16.0 / 22.5 / 26.4 | raw 1.3 / 2.3 / 3.2; win 1.3 / 2.3 / 3.2 | raw 6.3 / 8.8 / 9.6; win 6.3 / 8.8 / 9.6 | raw 7,188 / 8,230 / 9,582; win 7,188 / 8,230 / 9,582 | raw 96.3 / 188.2 / 388.5; win 96.3 / 188.2 / 388.5 | raw 1,336 / 1,766 / 1,973; win 1,336 / 1,766 / 1,973 |
| Wuyang | SUPPORT | MAIN_SUPPORT | utility_main_support | 58 | 635.5 | raw 13.1 / 17.2 / 22.3; win 13.1 / 17.2 / 22.3 | raw 14.6 / 21.6 / 26.6; win 14.6 / 21.6 / 26.6 | raw 5.3 / 7.3 / 8.6; win 5.3 / 7.3 / 8.6 | raw 5,758 / 7,180 / 7,870; win 5,758 / 7,180 / 7,870 | raw 6,468 / 7,531 / 8,810; win 6,468 / 7,531 / 8,810 | raw 476.2 / 668.0 / 1,026; win 476.2 / 668.0 / 1,026 |
| Bastion | DAMAGE | HITSCAN | turret_damage | 49 | 538 | raw 18.4 / 24.8 / 30.2; win 18.4 / 24.8 / 30.2 | raw 1.3 / 2.7 / 3.9; win 1.3 / 2.7 / 3.9 | raw 7.0 / 8.3 / 9.6; win 7.0 / 8.3 / 9.6 | raw 10,243 / 12,002 / 12,889; win 10,243 / 12,002 / 12,889 | raw 197.5 / 401.6 / 726.9; win 197.5 / 401.6 / 726.9 | raw 1,132 / 1,531 / 1,781; win 1,132 / 1,531 / 1,781 |
| Winston | TANK | TANK | dive_tank | 46 | 552.3 | raw 18.3 / 21.4 / 25.5; win 18.3 / 21.4 / 25.5 | raw 4.9 / 6.1 / 8.2; win 4.9 / 6.1 / 8.2 | raw 5.7 / 7.0 / 8.7; win 5.7 / 7.0 / 8.7 | raw 9,092 / 9,783 / 10,429; win 9,092 / 9,783 / 10,429 | raw 2,141 / 2,627 / 2,961; win 2,141 / 2,627 / 2,961 | raw 12,680 / 14,379 / 15,975; win 12,680 / 14,379 / 15,975 |
| Mizuki | SUPPORT | MAIN_SUPPORT | utility_main_support | 44 | 480.4 | raw 11.2 / 15.1 / 16.9; win 11.2 / 15.1 / 16.9 | raw 14.2 / 20.0 / 24.4; win 14.2 / 20.0 / 24.4 | raw 6.2 / 8.0 / 9.5; win 6.2 / 8.0 / 9.5 | raw 4,738 / 5,408 / 6,355; win 4,738 / 5,408 / 6,355 | raw 8,823 / 10,226 / 11,566; win 8,823 / 10,226 / 11,566 | raw 1,055 / 1,562 / 2,098; win 1,055 / 1,562 / 2,098 |
| Illari | SUPPORT | FLEX_SUPPORT | damage_flex_support | 42 | 493.7 | raw 12.1 / 16.1 / 18.7; win 12.1 / 16.1 / 18.7 | raw 5.5 / 8.4 / 13.4; win 5.5 / 8.4 / 13.4 | raw 4.9 / 6.2 / 7.5; win 4.9 / 6.2 / 7.5 | raw 6,088 / 7,384 / 7,765; win 6,088 / 7,384 / 7,765 | raw 6,795 / 7,660 / 8,646; win 6,795 / 7,660 / 8,646 | raw 0 / 146.3 / 421.2; win 0 / 146.3 / 421.2 |
| Brigitte | SUPPORT | MAIN_SUPPORT | protector_main_support | 40 | 416.9 | raw 7.9 / 10.8 / 12.8; win 7.9 / 10.8 / 12.8 | raw 13.0 / 16.6 / 20.3; win 13.0 / 16.6 / 20.3 | raw 7.8 / 8.7 / 10.2; win 7.8 / 8.7 / 10.2 | raw 3,409 / 4,423 / 5,144; win 3,409 / 4,423 / 5,144 | raw 7,988 / 8,899 / 9,616; win 7,988 / 8,899 / 9,616 | raw 2,064 / 3,181 / 3,897; win 2,064 / 3,181 / 3,897 |
| Hazard | TANK | TANK | brawl_tank | 35 | 351.6 | raw 24.3 / 28.2 / 31.6; win 24.3 / 28.2 / 31.6 | raw 5.1 / 6.4 / 7.1; win 5.1 / 6.4 / 7.1 | raw 4.5 / 6.1 / 8.2; win 4.5 / 6.1 / 8.2 | raw 10,429 / 11,913 / 12,746; win 10,429 / 11,913 / 12,746 | raw 2,179 / 2,405 / 2,570; win 2,179 / 2,405 / 2,570 | raw 8,011 / 9,437 / 10,804; win 8,011 / 9,437 / 10,804 |
| Echo | DAMAGE | FLEX_DPS | projectile_flex | 33 | 412.6 | raw 14.2 / 20.5 / 25.9; win 14.2 / 20.5 / 25.9 | raw 0 / 1.2 / 3.1; win 0 / 1.2 / 3.1 | raw 6.2 / 7.5 / 9.5; win 6.2 / 7.5 / 9.5 | raw 7,702 / 9,420 / 10,736; win 7,702 / 9,420 / 10,736 | raw 182.6 / 346.2 / 599.7; win 182.6 / 346.2 / 599.7 | raw 333.3 / 728.2 / 1,018; win 333.3 / 728.2 / 1,018 |
| Ramattra | TANK | TANK | tempo_tank | 31 | 348.0 | raw 15.9 / 19.0 / 24.0; win 15.9 / 19.0 / 24.0 | raw 3.8 / 5.7 / 6.8; win 3.8 / 5.7 / 6.8 | raw 5.6 / 6.9 / 8.4; win 5.6 / 6.9 / 8.4 | raw 9,604 / 10,795 / 11,147; win 9,604 / 10,795 / 11,147 | raw 492.2 / 736.1 / 1,026; win 492.2 / 736.1 / 1,026 | raw 11,186 / 14,829 / 16,103; win 11,186 / 14,829 / 16,103 |
| Baptiste | SUPPORT | FLEX_SUPPORT | hybrid_flex_support | 30 | 339.6 | raw 8.8 / 11.0 / 16.0; win 8.8 / 11.0 / 16.0 | raw 9.7 / 14.7 / 21.4; win 9.7 / 14.7 / 21.4 | raw 6.1 / 8.0 / 9.2; win 6.1 / 8.0 / 9.2 | raw 3,555 / 4,713 / 6,035; win 3,555 / 4,713 / 6,035 | raw 8,123 / 9,746 / 11,597; win 8,123 / 9,746 / 11,597 | raw 226.7 / 606.6 / 847.8; win 226.7 / 606.6 / 847.8 |
| Wrecking Ball | TANK | TANK | disrupt_tank | 30 | 347.9 | raw 18.5 / 22.0 / 25.2; win 18.5 / 22.0 / 25.2 | raw 4.9 / 6.6 / 8.2; win 4.9 / 6.6 / 8.2 | raw 4.7 / 6.9 / 9.0; win 4.7 / 6.9 / 9.0 | raw 9,543 / 10,561 / 11,392; win 9,543 / 10,561 / 11,392 | raw 1,593 / 1,929 / 2,277; win 1,593 / 1,929 / 2,277 | raw 7,167 / 10,132 / 12,370; win 7,167 / 10,132 / 12,370 |
| Sombra | DAMAGE | FLEX_DPS | flanker_flex | 27 | 296.9 | raw 14.8 / 20.9 / 27.6; win 14.8 / 20.9 / 27.6 | raw 2.1 / 5.1 / 7.2; win 2.1 / 5.1 / 7.2 | raw 6.7 / 8.6 / 10.5; win 6.7 / 8.6 / 10.5 | raw 7,306 / 8,561 / 9,069; win 7,306 / 8,561 / 9,069 | raw 226.2 / 730.8 / 1,260; win 226.2 / 730.8 / 1,260 | raw 0 / 64.0 / 483.5; win 0 / 64.0 / 483.5 |
| Sigma | TANK | TANK | poke_tank | 24 | 285.8 | raw 16.6 / 19.8 / 24.9; win 16.6 / 19.8 / 24.9 | raw 2.9 / 5.0 / 6.9; win 2.9 / 5.0 / 6.9 | raw 3.8 / 5.9 / 7.7; win 3.8 / 5.9 / 7.7 | raw 10,711 / 11,431 / 12,225; win 10,711 / 11,431 / 12,225 | raw 222.2 / 422.1 / 1,037; win 222.2 / 422.1 / 1,037 | raw 14,346 / 16,631 / 18,011; win 14,346 / 16,631 / 18,011 |
| Pharah | DAMAGE | FLEX_DPS | projectile_flex | 23 | 262.4 | raw 17.9 / 20.9 / 25.4; win 17.9 / 20.9 / 25.4 | raw 2.6 / 5.0 / 8.3; win 2.6 / 5.0 / 8.3 | raw 6.2 / 7.8 / 9.0; win 6.2 / 7.8 / 9.0 | raw 8,655 / 10,592 / 11,639; win 8,655 / 10,592 / 11,639 | raw 0 / 36.9 / 122.6; win 0 / 36.9 / 122.6 | raw 0 / 83.7 / 394.3; win 0 / 83.7 / 394.3 |
| Juno | SUPPORT | MAIN_SUPPORT | tempo_main_support | 22 | 231.7 | raw 8.8 / 10.9 / 11.9; win 8.8 / 10.9 / 11.9 | raw 10.7 / 13.9 / 14.9; win 10.7 / 13.9 / 14.9 | raw 7.1 / 7.3 / 8.7; win 7.1 / 7.3 / 8.7 | raw 2,300 / 3,236 / 3,645; win 2,300 / 3,236 / 3,645 | raw 8,553 / 10,562 / 11,305; win 8,553 / 10,562 / 11,305 | raw 0 / 379.7 / 1,051; win 0 / 379.7 / 1,051 |
| Genji | DAMAGE | FLEX_DPS | flanker_flex | 20 | 215.7 | raw 15.9 / 19.6 / 21.1; win 15.9 / 19.6 / 21.1 | raw 0 / 0 / 0.7; win 0 / 0 / 0.7 | raw 6.9 / 8.6 / 9.4; win 6.9 / 8.6 / 9.4 | raw 6,893 / 7,711 / 8,685; win 6,893 / 7,711 / 8,685 | raw 173.1 / 296.2 / 664.3; win 173.1 / 296.2 / 664.3 | raw 689.2 / 952.6 / 1,423; win 689.2 / 952.6 / 1,423 |
| Doomfist | TANK | TANK | disrupt_tank | 19 | 216.9 | raw 17.5 / 22.5 / 29.5; win 17.5 / 22.5 / 29.5 | raw 4.3 / 5.3 / 7.0; win 4.3 / 5.3 / 7.0 | raw 5.7 / 7.2 / 8.0; win 5.7 / 7.2 / 8.0 | raw 9,600 / 10,581 / 11,598; win 9,600 / 10,581 / 11,598 | raw 1,752 / 2,095 / 2,488; win 1,752 / 2,095 / 2,488 | raw 6,148 / 11,575 / 15,652; win 6,148 / 11,575 / 15,652 |
| Domina | TANK | TANK | poke_tank | 18 | 200.7 | raw 20.0 / 29.1 / 33.6; win 20.0 / 29.1 / 33.6 | raw 2.5 / 5.2 / 8.1; win 2.5 / 5.2 / 8.1 | raw 4.5 / 5.6 / 6.9; win 4.5 / 5.6 / 6.9 | raw 10,582 / 10,808 / 11,659; win 10,582 / 10,808 / 11,659 | raw 1,741 / 2,424 / 3,202; win 1,741 / 2,424 / 3,202 | raw 13,858 / 15,913 / 17,842; win 13,858 / 15,913 / 17,842 |
| Orisa | TANK | TANK | anchor_tank | 18 | 172.0 | raw 14.1 / 21.3 / 27.6; win 14.1 / 21.3 / 27.6 | raw 3.8 / 4.8 / 7.1; win 3.8 / 4.8 / 7.1 | raw 7.1 / 7.7 / 9.6; win 7.1 / 7.7 / 9.6 | raw 9,240 / 11,236 / 12,428; win 9,240 / 11,236 / 12,428 | raw 703.0 / 1,130 / 1,471; win 703.0 / 1,130 / 1,471 | raw 8,273 / 9,514 / 13,419; win 8,273 / 9,514 / 13,419 |
| Symmetra | DAMAGE | FLEX_DPS | barrier_utility_flex | 17 | 158.4 | raw 13.4 / 21.1 / 27.5; win 13.4 / 21.1 / 27.5 | raw 2.1 / 5.7 / 11.6; win 2.1 / 5.7 / 11.6 | raw 7.2 / 8.6 / 11.6; win 7.2 / 8.6 / 11.6 | raw 6,692 / 8,582 / 9,430; win 6,692 / 8,582 / 9,430 | raw 346.6 / 472.0 / 605.6; win 346.6 / 472.0 / 605.6 | raw 1,677 / 3,593 / 4,172; win 1,677 / 3,593 / 4,172 |
| Ashe | DAMAGE | HITSCAN | poke_hitscan | 13 | 152.0 | raw 12.5 / 15.9 / 17.1; win 12.5 / 15.9 / 17.1 | raw 0.6 / 3.0 / 4.4; win 0.6 / 3.0 / 4.4 | raw 5.7 / 8.0 / 9.0; win 5.7 / 8.0 / 9.0 | raw 8,262 / 10,055 / 10,496; win 8,262 / 10,055 / 10,496 | raw 56.9 / 103.6 / 197.1; win 56.9 / 103.6 / 197.1 | raw 0 / 18.0 / 138.0; win 0 / 18.0 / 138.0 |
| Junker Queen | TANK | TANK | brawl_tank | 12 | 129.2 | raw 21.0 / 28.8 / 29.0; win 21.0 / 28.8 / 29.0 | raw 6.8 / 9.2 / 10.1; win 6.8 / 9.2 / 10.1 | raw 5.6 / 6.9 / 7.9; win 5.6 / 6.9 / 7.9 | raw 11,389 / 11,890 / 12,343; win 11,389 / 11,890 / 12,343 | raw 2,832 / 3,157 / 3,721; win 2,832 / 3,157 / 3,721 | raw 4,303 / 4,894 / 5,147; win 4,303 / 4,894 / 5,147 |
| Sierra | DAMAGE | HITSCAN | poke_hitscan | 9 | 97.0 | raw 20.7 / 25.7 / 31.6; win 20.7 / 25.7 / 31.4 | raw 0 / 0 / 0; win 0 / 0 / 0 | raw 5.7 / 7.3 / 8.1; win 5.7 / 7.3 / 8.0 | raw 10,457 / 11,635 / 13,643; win 10,457 / 11,635 / 13,435 | raw 141.4 / 271.3 / 497.8; win 141.4 / 271.3 / 470.7 | raw 0 / 0 / 37.3; win 0 / 0 / 22.4 |
| Freja | DAMAGE | HITSCAN | poke_hitscan | 8 | 92.5 | raw 10.5 / 14.6 / 23.1; win 10.5 / 14.6 / 20.4 | raw 0 / 0.7 / 1.5; win 0 / 0.7 / 1.2 | raw 6.6 / 7.6 / 9.1; win 6.6 / 7.6 / 8.6 | raw 9,700 / 10,182 / 11,613; win 9,700 / 10,182 / 11,263 | raw 208.8 / 465.7 / 489.3; win 208.8 / 465.7 / 483.3 | raw 0 / 0 / 60.6; win 0 / 0 / 39.4 |
| Zenyatta | SUPPORT | FLEX_SUPPORT | damage_flex_support | 8 | 77.6 | raw 7.3 / 10.7 / 15.2; win 7.3 / 10.7 / 14.8 | raw 11.2 / 19.6 / 25.3; win 11.2 / 19.6 / 25.1 | raw 7 / 7.7 / 9.0; win 7 / 7.7 / 9.0 | raw 3,012 / 4,679 / 6,917; win 3,012 / 4,679 / 6,748 | raw 8,609 / 8,681 / 10,228; win 8,609 / 8,681 / 9,728 | raw 0 / 262.8 / 467.0; win 0 / 262.8 / 406 |
| Soldier: 76 | DAMAGE | HITSCAN | tracking_hitscan | 7 | 83.8 | raw 12.9 / 16.1 / 20.9; win 12.9 / 16.1 / 20.3 | raw 0 / 1.9 / 2.9; win 0 / 1.9 / 2.8 | raw 7.8 / 9.2 / 10.0; win 7.8 / 9.2 / 9.9 | raw 8,322 / 9,194 / 9,948; win 8,322 / 9,194 / 9,765 | raw 581.4 / 923.0 / 1,310; win 581.4 / 923.0 / 1,262 | raw 0 / 221.5 / 1,035; win 0 / 221.5 / 815.8 |
| Moira | SUPPORT | FLEX_SUPPORT | volume_flex_support | 5 | 51.8 | raw 13.9 / 15.5 / 17.2; win 13.9 / 15.5 / 16.8 | raw 9.3 / 11.1 / 12.8; win 9.3 / 11.1 / 12.4 | raw 8.5 / 10.9 / 11.6; win 8.5 / 10.9 / 11.4 | raw 5,332 / 6,395 / 7,324; win 5,332 / 6,395 / 7,138 | raw 7,968 / 8,318 / 9,798; win 7,968 / 8,318 / 9,502 | raw 0 / 1,444 / 3,441; win 0 / 1,444 / 3,042 |
| Roadhog | TANK | TANK | pick_tank | 5 | 51.9 | raw 13.5 / 17.3 / 19.8; win 13.5 / 17.3 / 19.3 | raw 2.2 / 3.1 / 3.6; win 2.2 / 3.1 / 3.5 | raw 7.6 / 8.0 / 10.7; win 7.6 / 8.0 / 10.2 | raw 8,056 / 9,188 / 10,012; win 8,056 / 9,188 / 9,847 | raw 4,430 / 5,244 / 6,611; win 4,430 / 5,244 / 6,338 | raw 4,198 / 4,403 / 5,648; win 4,198 / 4,403 / 5,399 |
| Anran | DAMAGE | FLEX_DPS | projectile_flex | 4 | 52.7 | raw 18.6 / 20.5 / 22.3; win 18.6 / 20.5 / 22.3 | raw 0 / 0 / 0; win 0 / 0 / 0 | raw 7.9 / 9.3 / 9.7; win 7.9 / 9.3 / 9.7 | raw 7,603 / 9,124 / 10,179; win 7,603 / 9,124 / 10,179 | raw 184.7 / 337.7 / 473.6; win 184.7 / 337.7 / 473.6 | raw 0 / 0 / 0; win 0 / 0 / 0 |
| Hanzo | DAMAGE | HITSCAN | poke_hitscan | 4 | 48.8 | raw 18.3 / 18.7 / 19.0; win 18.3 / 18.7 / 19.0 | raw 3.4 / 4.3 / 5.0; win 3.4 / 4.3 / 5.0 | raw 6.4 / 8.3 / 9.4; win 6.4 / 8.3 / 9.4 | raw 8,246 / 8,387 / 8,398; win 8,246 / 8,387 / 8,398 | raw 80.0 / 135.9 / 206.4; win 80.0 / 135.9 / 206.4 | raw 15.9 / 87.3 / 187.0; win 15.9 / 87.3 / 187.0 |
| Mei | DAMAGE | FLEX_DPS | utility_flex | 4 | 36.5 | raw 14.8 / 19.6 / 24.0; win 14.8 / 19.6 / 24.0 | raw 3.4 / 4.6 / 5.0; win 3.4 / 4.6 / 5.0 | raw 6.1 / 7.6 / 8.0; win 6.1 / 7.6 / 8.0 | raw 8,947 / 9,120 / 9,137; win 8,947 / 9,120 / 9,137 | raw 995.4 / 1,377 / 1,724; win 995.4 / 1,377 / 1,724 | raw 2,932 / 3,468 / 4,200; win 2,932 / 3,468 / 4,200 |
| Lifeweaver | SUPPORT | MAIN_SUPPORT | protector_main_support | 2 | 28.1 | raw 4.1 / 5.2 / 5.9; win 4.1 / 5.2 / 5.9 | raw 13.5 / 15.0 / 16.0; win 13.5 / 15.0 / 16.0 | raw 5.6 / 6.1 / 6.4; win 5.6 / 6.1 / 6.4 | raw 1,105 / 1,206 / 1,267; win 1,105 / 1,206 / 1,267 | raw 8,133 / 9,057 / 9,612; win 8,133 / 9,057 / 9,612 | raw 415.1 / 462.8 / 491.4; win 415.1 / 462.8 / 491.4 |
| Mercy | SUPPORT | MAIN_SUPPORT | pocket_main_support | 1 | 7.7 | raw 2.6 / 2.6 / 2.6; win 2.6 / 2.6 / 2.6 | raw 9.1 / 9.1 / 9.1; win 9.1 / 9.1 / 9.1 | raw 7.8 / 7.8 / 7.8; win 7.8 / 7.8 / 7.8 | raw 2,401 / 2,401 / 2,401; win 2,401 / 2,401 / 2,401 | raw 10,300 / 10,300 / 10,300; win 10,300 / 10,300 / 10,300 | raw 0 / 0 / 0; win 0 / 0 / 0 |
| Widowmaker | DAMAGE | HITSCAN | sniper_hitscan | 1 | 5.5 | raw 9.2 / 9.2 / 9.2; win 9.2 / 9.2 / 9.2 | raw 1.8 / 1.8 / 1.8; win 1.8 / 1.8 / 1.8 | raw 9.2 / 9.2 / 9.2; win 9.2 / 9.2 / 9.2 | raw 5,163 / 5,163 / 5,163; win 5,163 / 5,163 / 5,163 | raw 0 / 0 / 0; win 0 / 0 / 0 | raw 0 / 0 / 0; win 0 / 0 / 0 |

## Scoring Profile Baselines

| Scoring Profile | Official Role | Subrole | Scoring Profile | Sample Logs | Total Minutes | Elims P50/P75/P90 | Assists P50/P75/P90 | Deaths P50/P75/P90 | Damage P50/P75/P90 | Healing P50/P75/P90 | Blocked P50/P75/P90 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| utility_flex_support | SUPPORT | FLEX_SUPPORT | utility_flex_support | 585 | 6,536 | raw 8.5 / 11.8 / 15.1; win 8.5 / 11.8 / 15.1 | raw 15.9 / 21.4 / 27.9; win 15.9 / 21.4 / 27.9 | raw 5.7 / 7.3 / 8.9; win 5.7 / 7.3 / 8.9 | raw 3,367 / 4,439 / 5,504; win 3,367 / 4,439 / 5,504 | raw 8,966 / 10,508 / 11,753; win 8,966 / 10,508 / 11,753 | raw 0 / 0 / 558.2; win 0 / 0 / 558.2 |
| flanker_flex | DAMAGE | FLEX_DPS | flanker_flex | 446 | 4,871 | raw 16.4 / 21.7 / 26.6; win 16.4 / 21.7 / 26.6 | raw 0.9 / 2.4 / 4.0; win 0.9 / 2.4 / 4.0 | raw 6.7 / 8.5 / 10.0; win 6.7 / 8.5 / 10.0 | raw 7,344 / 8,774 / 10,081; win 7,344 / 8,774 / 10,081 | raw 171.6 / 358.4 / 604.7; win 171.6 / 358.4 / 604.7 | raw 299.8 / 702.5 / 1,220; win 299.8 / 702.5 / 1,220 |
| tempo_main_support | SUPPORT | MAIN_SUPPORT | tempo_main_support | 389 | 4,139 | raw 11.4 / 15.9 / 19.8; win 11.4 / 15.9 / 19.8 | raw 13.4 / 17.7 / 21.8; win 13.4 / 17.7 / 21.8 | raw 5.9 / 7.6 / 9.3; win 5.9 / 7.6 / 9.3 | raw 3,338 / 4,120 / 4,816; win 3,338 / 4,120 / 4,816 | raw 7,383 / 8,682 / 9,831; win 7,383 / 8,682 / 9,831 | raw 1,142 / 1,790 / 2,293; win 1,142 / 1,790 / 2,293 |
| brawl_tank | TANK | TANK | brawl_tank | 266 | 2,855 | raw 20.5 / 25.9 / 31.1; win 20.5 / 25.9 / 31.1 | raw 8.9 / 12.7 / 15.7; win 8.9 / 12.7 / 15.7 | raw 5.3 / 7.2 / 9.0; win 5.3 / 7.2 / 9.0 | raw 10,017 / 11,587 / 13,198; win 10,017 / 11,587 / 13,198 | raw 996.6 / 2,142 / 2,656; win 996.6 / 2,142 / 2,656 | raw 7,069 / 8,417 / 11,031; win 7,069 / 8,417 / 11,031 |
| midrange_hitscan | DAMAGE | HITSCAN | midrange_hitscan | 254 | 2,722 | raw 18.1 / 22.3 / 27.7; win 18.1 / 22.3 / 27.7 | raw 0 / 0.8 / 2.2; win 0 / 0.8 / 2.2 | raw 6.0 / 7.8 / 9.3; win 6.0 / 7.8 / 9.3 | raw 10,148 / 11,587 / 13,023; win 10,148 / 11,587 / 13,023 | raw 505.7 / 766.7 / 1,020; win 505.7 / 766.7 / 1,020 | raw 0 / 113.0 / 256.6; win 0 / 113.0 / 256.6 |
| dive_tank | TANK | TANK | dive_tank | 191 | 2,125 | raw 18.5 / 24.9 / 30.6; win 18.5 / 24.9 / 30.6 | raw 7.2 / 12.0 / 16.2; win 7.2 / 12.0 / 16.2 | raw 4.8 / 6.3 / 7.9; win 4.8 / 6.3 / 7.9 | raw 8,594 / 9,681 / 10,523; win 8,594 / 9,681 / 10,523 | raw 2,273 / 2,734 / 3,044; win 2,273 / 2,734 / 3,044 | raw 11,408 / 14,006 / 16,063; win 11,408 / 14,006 / 16,063 |
| brawl_flex | DAMAGE | FLEX_DPS | brawl_flex | 171 | 1,872 | raw 16.9 / 22.5 / 26.5; win 16.9 / 22.5 / 26.5 | raw 0 / 1.2 / 2.6; win 0 / 1.2 / 2.6 | raw 6.6 / 8.5 / 10.6; win 6.6 / 8.5 / 10.6 | raw 7,759 / 8,793 / 9,829; win 7,759 / 8,793 / 9,829 | raw 646.9 / 1,378 / 1,711; win 646.9 / 1,378 / 1,711 | raw 46.3 / 1,139 / 1,735; win 46.3 / 1,139 / 1,735 |
| rail_hitscan | DAMAGE | HITSCAN | rail_hitscan | 159 | 1,775 | raw 15.8 / 21.6 / 26.0; win 15.8 / 21.6 / 26.0 | raw 0 / 0 / 1.2; win 0 / 0 / 1.2 | raw 6.2 / 7.8 / 10.2; win 6.2 / 7.8 / 10.2 | raw 8,549 / 9,621 / 10,851; win 8,549 / 9,621 / 10,851 | raw 0 / 110.6 / 302.8; win 0 / 110.6 / 302.8 | raw 0 / 0 / 223.1; win 0 / 0 / 223.1 |
| utility_main_support | SUPPORT | MAIN_SUPPORT | utility_main_support | 102 | 1,116 | raw 11.8 / 16.4 / 20.7; win 11.8 / 16.4 / 20.7 | raw 14.5 / 20.5 / 25.8; win 14.5 / 20.5 / 25.8 | raw 5.9 / 7.4 / 9.3; win 5.9 / 7.4 / 9.3 | raw 5,197 / 6,329 / 7,565; win 5,197 / 6,329 / 7,565 | raw 7,283 / 8,875 / 10,371; win 7,283 / 8,875 / 10,371 | raw 635.3 / 1,121 / 1,791; win 635.3 / 1,121 / 1,791 |
| projectile_flex | DAMAGE | FLEX_DPS | projectile_flex | 60 | 727.6 | raw 16.9 / 20.8 / 26.0; win 16.9 / 20.8 / 26.0 | raw 0.6 / 2.8 / 5.5; win 0.6 / 2.8 / 5.5 | raw 6.3 / 7.8 / 9.4; win 6.3 / 7.8 / 9.4 | raw 8,332 / 9,785 / 11,576; win 8,332 / 9,785 / 11,576 | raw 75.8 / 258.7 / 494.0; win 75.8 / 258.7 / 494.0 | raw 85.4 / 601.4 / 981.6; win 85.4 / 601.4 / 981.6 |
| damage_flex_support | SUPPORT | FLEX_SUPPORT | damage_flex_support | 50 | 571.3 | raw 11.6 / 15.5 / 18.3; win 11.6 / 15.5 / 18.3 | raw 6.6 / 9.9 / 17.0; win 6.6 / 9.9 / 17.0 | raw 5.3 / 6.9 / 7.6; win 5.3 / 6.9 / 7.6 | raw 5,888 / 7,268 / 7,777; win 5,888 / 7,268 / 7,777 | raw 7,110 / 8,039 / 8,799; win 7,110 / 8,039 / 8,799 | raw 0 / 204.6 / 434.7; win 0 / 204.6 / 434.7 |
| disrupt_tank | TANK | TANK | disrupt_tank | 49 | 564.8 | raw 18.4 / 22.1 / 25.6; win 18.4 / 22.1 / 25.6 | raw 4.6 / 6.1 / 8.1; win 4.6 / 6.1 / 8.1 | raw 5.0 / 7.0 / 8.7; win 5.0 / 7.0 / 8.7 | raw 9,599 / 10,613 / 11,506; win 9,599 / 10,613 / 11,506 | raw 1,661 / 1,956 / 2,299; win 1,661 / 1,956 / 2,299 | raw 7,090 / 10,808 / 14,242; win 7,090 / 10,808 / 14,242 |
| turret_damage | DAMAGE | HITSCAN | turret_damage | 49 | 538 | raw 18.4 / 24.8 / 30.2; win 18.4 / 24.8 / 30.2 | raw 1.3 / 2.7 / 3.9; win 1.3 / 2.7 / 3.9 | raw 7.0 / 8.3 / 9.6; win 7.0 / 8.3 / 9.6 | raw 10,243 / 12,002 / 12,889; win 10,243 / 12,002 / 12,889 | raw 197.5 / 401.6 / 726.9; win 197.5 / 401.6 / 726.9 | raw 1,132 / 1,531 / 1,781; win 1,132 / 1,531 / 1,781 |
| poke_tank | TANK | TANK | poke_tank | 42 | 486.6 | raw 17.4 / 25.0 / 29.8; win 17.4 / 25.0 / 29.8 | raw 2.7 / 5.2 / 7.5; win 2.7 / 5.2 / 7.5 | raw 4.1 / 5.7 / 7.2; win 4.1 / 5.7 / 7.2 | raw 10,632 / 11,290 / 12,263; win 10,632 / 11,290 / 12,263 | raw 932.6 / 1,656 / 2,470; win 932.6 / 1,656 / 2,470 | raw 14,157 / 16,400 / 18,201; win 14,157 / 16,400 / 18,201 |
| protector_main_support | SUPPORT | MAIN_SUPPORT | protector_main_support | 42 | 445.0 | raw 7.5 / 10.6 / 12.7; win 7.5 / 10.6 / 12.7 | raw 13.0 / 16.6 / 20.1; win 13.0 / 16.6 / 20.1 | raw 7.6 / 8.6 / 10.2; win 7.6 / 8.6 / 10.2 | raw 3,366 / 4,353 / 5,113; win 3,366 / 4,353 / 5,113 | raw 7,988 / 8,921 / 9,720; win 7,988 / 8,921 / 9,720 | raw 1,982 / 3,127 / 3,879; win 1,982 / 3,127 / 3,879 |
| poke_hitscan | DAMAGE | HITSCAN | poke_hitscan | 34 | 390.3 | raw 14.5 / 18.5 / 25.4; win 14.5 / 18.5 / 25.4 | raw 0 / 2.3 / 3.8; win 0 / 2.3 / 3.8 | raw 6.0 / 7.7 / 9.3; win 6.0 / 7.7 / 9.3 | raw 8,881 / 10,380 / 11,472; win 8,881 / 10,380 / 11,472 | raw 91.0 / 240.6 / 453.5; win 91.0 / 240.6 / 453.5 | raw 0 / 10.7 / 177.7; win 0 / 10.7 / 177.7 |
| tempo_tank | TANK | TANK | tempo_tank | 31 | 348.0 | raw 15.9 / 19.0 / 24.0; win 15.9 / 19.0 / 24.0 | raw 3.8 / 5.7 / 6.8; win 3.8 / 5.7 / 6.8 | raw 5.6 / 6.9 / 8.4; win 5.6 / 6.9 / 8.4 | raw 9,604 / 10,795 / 11,147; win 9,604 / 10,795 / 11,147 | raw 492.2 / 736.1 / 1,026; win 492.2 / 736.1 / 1,026 | raw 11,186 / 14,829 / 16,103; win 11,186 / 14,829 / 16,103 |
| hybrid_flex_support | SUPPORT | FLEX_SUPPORT | hybrid_flex_support | 30 | 339.6 | raw 8.8 / 11.0 / 16.0; win 8.8 / 11.0 / 16.0 | raw 9.7 / 14.7 / 21.4; win 9.7 / 14.7 / 21.4 | raw 6.1 / 8.0 / 9.2; win 6.1 / 8.0 / 9.2 | raw 3,555 / 4,713 / 6,035; win 3,555 / 4,713 / 6,035 | raw 8,123 / 9,746 / 11,597; win 8,123 / 9,746 / 11,597 | raw 226.7 / 606.6 / 847.8; win 226.7 / 606.6 / 847.8 |
| anchor_tank | TANK | TANK | anchor_tank | 18 | 172.0 | raw 14.1 / 21.3 / 27.6; win 14.1 / 21.3 / 27.6 | raw 3.8 / 4.8 / 7.1; win 3.8 / 4.8 / 7.1 | raw 7.1 / 7.7 / 9.6; win 7.1 / 7.7 / 9.6 | raw 9,240 / 11,236 / 12,428; win 9,240 / 11,236 / 12,428 | raw 703.0 / 1,130 / 1,471; win 703.0 / 1,130 / 1,471 | raw 8,273 / 9,514 / 13,419; win 8,273 / 9,514 / 13,419 |
| barrier_utility_flex | DAMAGE | FLEX_DPS | barrier_utility_flex | 17 | 158.4 | raw 13.4 / 21.1 / 27.5; win 13.4 / 21.1 / 27.5 | raw 2.1 / 5.7 / 11.6; win 2.1 / 5.7 / 11.6 | raw 7.2 / 8.6 / 11.6; win 7.2 / 8.6 / 11.6 | raw 6,692 / 8,582 / 9,430; win 6,692 / 8,582 / 9,430 | raw 346.6 / 472.0 / 605.6; win 346.6 / 472.0 / 605.6 | raw 1,677 / 3,593 / 4,172; win 1,677 / 3,593 / 4,172 |
| tracking_hitscan | DAMAGE | HITSCAN | tracking_hitscan | 7 | 83.8 | raw 12.9 / 16.1 / 20.9; win 12.9 / 16.1 / 20.3 | raw 0 / 1.9 / 2.9; win 0 / 1.9 / 2.8 | raw 7.8 / 9.2 / 10.0; win 7.8 / 9.2 / 9.9 | raw 8,322 / 9,194 / 9,948; win 8,322 / 9,194 / 9,765 | raw 581.4 / 923.0 / 1,310; win 581.4 / 923.0 / 1,262 | raw 0 / 221.5 / 1,035; win 0 / 221.5 / 815.8 |
| pick_tank | TANK | TANK | pick_tank | 5 | 51.9 | raw 13.5 / 17.3 / 19.8; win 13.5 / 17.3 / 19.3 | raw 2.2 / 3.1 / 3.6; win 2.2 / 3.1 / 3.5 | raw 7.6 / 8.0 / 10.7; win 7.6 / 8.0 / 10.2 | raw 8,056 / 9,188 / 10,012; win 8,056 / 9,188 / 9,847 | raw 4,430 / 5,244 / 6,611; win 4,430 / 5,244 / 6,338 | raw 4,198 / 4,403 / 5,648; win 4,198 / 4,403 / 5,399 |
| volume_flex_support | SUPPORT | FLEX_SUPPORT | volume_flex_support | 5 | 51.8 | raw 13.9 / 15.5 / 17.2; win 13.9 / 15.5 / 16.8 | raw 9.3 / 11.1 / 12.8; win 9.3 / 11.1 / 12.4 | raw 8.5 / 10.9 / 11.6; win 8.5 / 10.9 / 11.4 | raw 5,332 / 6,395 / 7,324; win 5,332 / 6,395 / 7,138 | raw 7,968 / 8,318 / 9,798; win 7,968 / 8,318 / 9,502 | raw 0 / 1,444 / 3,441; win 0 / 1,444 / 3,042 |
| utility_flex | DAMAGE | FLEX_DPS | utility_flex | 4 | 36.5 | raw 14.8 / 19.6 / 24.0; win 14.8 / 19.6 / 24.0 | raw 3.4 / 4.6 / 5.0; win 3.4 / 4.6 / 5.0 | raw 6.1 / 7.6 / 8.0; win 6.1 / 7.6 / 8.0 | raw 8,947 / 9,120 / 9,137; win 8,947 / 9,120 / 9,137 | raw 995.4 / 1,377 / 1,724; win 995.4 / 1,377 / 1,724 | raw 2,932 / 3,468 / 4,200; win 2,932 / 3,468 / 4,200 |
| pocket_main_support | SUPPORT | MAIN_SUPPORT | pocket_main_support | 1 | 7.7 | raw 2.6 / 2.6 / 2.6; win 2.6 / 2.6 / 2.6 | raw 9.1 / 9.1 / 9.1; win 9.1 / 9.1 / 9.1 | raw 7.8 / 7.8 / 7.8; win 7.8 / 7.8 / 7.8 | raw 2,401 / 2,401 / 2,401; win 2,401 / 2,401 / 2,401 | raw 10,300 / 10,300 / 10,300; win 10,300 / 10,300 / 10,300 | raw 0 / 0 / 0; win 0 / 0 / 0 |
| sniper_hitscan | DAMAGE | HITSCAN | sniper_hitscan | 1 | 5.5 | raw 9.2 / 9.2 / 9.2; win 9.2 / 9.2 / 9.2 | raw 1.8 / 1.8 / 1.8; win 1.8 / 1.8 / 1.8 | raw 9.2 / 9.2 / 9.2; win 9.2 / 9.2 / 9.2 | raw 5,163 / 5,163 / 5,163; win 5,163 / 5,163 / 5,163 | raw 0 / 0 / 0; win 0 / 0 / 0 | raw 0 / 0 / 0; win 0 / 0 / 0 |

## Subrole Baselines

| Subrole | Official Role | Subrole | Scoring Profile | Sample Logs | Total Minutes | Elims P50/P75/P90 | Assists P50/P75/P90 | Deaths P50/P75/P90 | Damage P50/P75/P90 | Healing P50/P75/P90 | Blocked P50/P75/P90 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FLEX_DPS | DAMAGE | FLEX_DPS | barrier_utility_flex, brawl_flex, flanker_flex, projectile_flex, utility_flex | 698 | 7,666 | raw 16.6 / 21.7 / 26.4; win 16.6 / 21.7 / 26.4 | raw 0.7 / 2.2 / 3.9; win 0.7 / 2.2 / 3.9 | raw 6.6 / 8.5 / 10.2; win 6.6 / 8.5 / 10.2 | raw 7,573 / 8,950 / 10,099; win 7,573 / 8,950 / 10,099 | raw 203.8 / 514.8 / 1,190; win 203.8 / 514.8 / 1,190 | raw 275.3 / 802.2 / 1,498; win 275.3 / 802.2 / 1,498 |
| FLEX_SUPPORT | SUPPORT | FLEX_SUPPORT | damage_flex_support, hybrid_flex_support, utility_flex_support, volume_flex_support | 670 | 7,499 | raw 8.6 / 12.1 / 15.8; win 8.6 / 12.1 / 15.8 | raw 15.1 / 20.7 / 26.9; win 15.1 / 20.7 / 26.9 | raw 5.8 / 7.3 / 8.9; win 5.8 / 7.3 / 8.9 | raw 3,485 / 4,647 / 6,085; win 3,485 / 4,647 / 6,085 | raw 8,717 / 10,320 / 11,644; win 8,717 / 10,320 / 11,644 | raw 0 / 0 / 589.5; win 0 / 0 / 589.5 |
| TANK | TANK | TANK | anchor_tank, brawl_tank, disrupt_tank, dive_tank, pick_tank, poke_tank, tempo_tank | 602 | 6,603 | raw 18.6 / 24.7 / 30.0; win 18.6 / 24.7 / 30.0 | raw 6.6 / 10.9 / 14.8; win 6.6 / 10.9 / 14.8 | raw 5.1 / 6.9 / 8.6; win 5.1 / 6.9 / 8.6 | raw 9,495 / 10,868 / 12,110; win 9,495 / 10,868 / 12,110 | raw 1,571 / 2,309 / 2,868; win 1,571 / 2,309 / 2,868 | raw 8,555 / 12,306 / 14,976; win 8,555 / 12,306 / 14,976 |
| MAIN_SUPPORT | SUPPORT | MAIN_SUPPORT | pocket_main_support, protector_main_support, tempo_main_support, utility_main_support | 534 | 5,708 | raw 11.2 / 15.7 / 19.5; win 11.2 / 15.7 / 19.5 | raw 13.6 / 18.3 / 22.6; win 13.6 / 18.3 / 22.6 | raw 6.1 / 7.8 / 9.3; win 6.1 / 7.8 / 9.3 | raw 3,577 / 4,507 / 5,699; win 3,577 / 4,507 / 5,699 | raw 7,414 / 8,775 / 9,885; win 7,414 / 8,775 / 9,885 | raw 1,068 / 1,786 / 2,367; win 1,068 / 1,786 / 2,367 |
| HITSCAN | DAMAGE | HITSCAN | midrange_hitscan, poke_hitscan, rail_hitscan, sniper_hitscan, tracking_hitscan, turret_damage | 504 | 5,515 | raw 16.8 / 22.2 / 27.4; win 16.8 / 22.2 / 27.4 | raw 0 / 1.0 / 2.4; win 0 / 1.0 / 2.4 | raw 6.1 / 7.9 / 9.7; win 6.1 / 7.9 / 9.7 | raw 9,465 / 11,053 / 12,580; win 9,465 / 11,053 / 12,580 | raw 200.6 / 586.0 / 848.7; win 200.6 / 586.0 / 848.7 | raw 0 / 130.9 / 528.1; win 0 / 130.9 / 528.1 |

## Coverage / Unknowns

### Unrecognized Hero Names

_No data._

### Fallback Hero Names

_No data._

### Alias Hits

_No data._

### Low Sample Heroes

| Hero | Sample Logs | Total Minutes | Sample Status |
| --- | --- | --- | --- |
| Mercy | 1 | 7.7 | VERY_LOW_SAMPLE |
| Widowmaker | 1 | 5.5 | VERY_LOW_SAMPLE |
| Lifeweaver | 2 | 28.1 | VERY_LOW_SAMPLE |
| Anran | 4 | 52.7 | VERY_LOW_SAMPLE |
| Hanzo | 4 | 48.8 | VERY_LOW_SAMPLE |
| Mei | 4 | 36.5 | VERY_LOW_SAMPLE |

## Calibration Checks

### A. Tank Blocked By Profile

| Profile | Sample Logs | Total Minutes | Blocked P50 | Blocked P75 | Blocked P90 |
| --- | --- | --- | --- | --- | --- |
| dive_tank | 191 | 2,125 | 11,408 | 14,006 | 16,063 |
| disrupt_tank | 49 | 564.8 | 7,090 | 10,808 | 14,242 |
| brawl_tank | 266 | 2,855 | 7,069 | 8,417 | 11,031 |
| poke_tank | 42 | 486.6 | 14,157 | 16,400 | 18,201 |
| anchor_tank | 18 | 172.0 | 8,273 | 9,514 | 13,419 |
| tempo_tank | 31 | 348.0 | 11,186 | 14,829 | 16,103 |
| pick_tank | 5 | 51.9 | 4,198 | 4,403 | 5,648 |

### B. Symmetra Blocked Check

| Scope | Sample Logs | Blocked P50 | Blocked P75 | Blocked P90 |
| --- | --- | --- | --- | --- |
| Symmetra | 17 | 1,677 | 3,593 | 4,172 |
| barrier_utility_flex | 17 | 1,677 | 3,593 | 4,172 |
| FLEX_DPS | 698 | 275.3 | 802.2 | 1,498 |

### C. Main Support Check

| Hero | Sample Logs | Healing P50 | Assists P50 | Deaths P50 | Blocked P50 |
| --- | --- | --- | --- | --- | --- |
| Lúcio | 294 | 7,414 | 13.8 | 6.0 | 1,359 |
| Mercy | 1 | 10,300 | 9.1 | 7.8 | 0 |
| Brigitte | 40 | 7,988 | 13.0 | 7.8 | 2,064 |
| Lifeweaver | 2 | 8,133 | 13.5 | 5.6 | 415.1 |
| Juno | 22 | 8,553 | 10.7 | 7.1 | 0 |
| Mizuki | 44 | 8,823 | 14.2 | 6.2 | 1,055 |

### D. Flex Support Check

| Hero | Sample Logs | Healing P50 | Damage P50 | Elims P50 | Assists P50 |
| --- | --- | --- | --- | --- | --- |
| Kiriko | 501 | 9,148 | 3,371 | 8.5 | 16.5 |
| Ana | 84 | 7,770 | 3,277 | 8.5 | 11.2 |
| Baptiste | 30 | 8,123 | 3,555 | 8.8 | 9.7 |
| Illari | 42 | 6,795 | 6,088 | 12.1 | 5.5 |
| Moira | 5 | 7,968 | 5,332 | 13.9 | 9.3 |
| Zenyatta | 8 | 8,609 | 3,012 | 7.3 | 11.2 |

### E. DPS Profile Check

| Scope | Sample Logs | Total Minutes | Damage P50 | Elims P50 | Deaths P50 |
| --- | --- | --- | --- | --- | --- |
| HITSCAN | 504 | 5,515 | 9,465 | 16.8 | 6.1 |
| FLEX_DPS | 698 | 7,666 | 7,573 | 16.6 | 6.6 |
| flanker_flex | 446 | 4,871 | 7,344 | 16.4 | 6.7 |
| projectile_flex | 60 | 727.6 | 8,332 | 16.9 | 6.3 |
| brawl_flex | 171 | 1,872 | 7,759 | 16.9 | 6.6 |
| utility_flex | 4 | 36.5 | 8,947 | 14.8 | 6.1 |

## Candidate Weight Notes

- Symmetra blockedPer10 P50 is 1,677 vs FLEX_DPS 275.3 (6.09x).
- Lúcio healingPer10 P50 is 7,414 vs FLEX_SUPPORT 8,717; assists/block should be checked before rewarding raw healing.
- dive_tank blockedPer10 P50 is 11,408 vs anchor_tank 8,273, so tank blocked should stay profile-sensitive.
- disrupt_tank blockedPer10 P50 is 7,090 vs anchor_tank 8,273, which is a warning against overusing blocked for disrupt tanks.
- damage_flex_support damagePer10 P50 is 5,888 vs FLEX_SUPPORT 3,485.
- volume_flex_support healingPer10 P50 is 7,968 vs FLEX_SUPPORT 8,717.
- These are data observations only. They are not final scoring weights, OVR, map ratings, or player rankings.
