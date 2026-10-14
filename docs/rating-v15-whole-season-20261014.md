# FCW26 whole-season OVR reference policy

The user selected whole-season recalculation for Season OVR and player dossiers,
while preserving historical map/match ratings and MVP selections. This fixes the
previous season coverage gap: cold-start map scores had been restored for match
presentation but their observations were still absent from Season OVR.

The statistical formula and profile weights stay at v1.5.0. The separate season
reference policy is `v1.5-season-2026.10.14`. Each observation is compared with all
eligible currently published matches in the same season and version group, with
the entire target match held out. Each reference match keeps equal mass; time
weights apply within a match. Same-day and later published references are allowed
for this retrospective season estimate. It is not a forward validation result.

The original `scores` and fixed `backfillScores` retain map/match policies. Only
`seasonScores` supplies the season aggregate. New published matches can update
Season OVR and season ranks. Missing metrics, unconfirmed transition versions,
short reference segments, administrative maps and forfeits keep their original
exclusions; no missing values are filled. Archived competitions are not activated.

Sombra's recorded DPS version retains its flanker profile and damage-era data.
The support version retains generic support weights and its separate support-era
references. No new Sombra-specific weights are inferred from map hero labels.
Other heroes retain existing weights; version groups remain date-inferred.

The formal Season OVR qualification gates (maps, minutes and distinct scored
matches), OVR formula, sample adjustment and opponent adjustment stay in use.
Formal eligibility and reference maturity are separate. Formal FCW table cells
show the OVR number as an accessible explanation button; repeated provisional
statistical labels move to the explanation. Provisional season entries retain
their eligibility status label.

Public snapshot SHA-256:
`a194c277b78a4d53abdb190ed8502afd2f3d1bada417edd916c5094ecd9ef1ab`.
Baseline production commit: `44e4141d4b537a237faf92ba3d7fa6864656fd29`.
The selected replay covers 700 observations, previously 550 for Season OVR.
Formal role entries increase 6 → 26, provisional entries 67 → 56, unrated entries
25 → 16. There are 53 changed existing displayed OVRs and 9 newly rated entries.
The implementation replay preserved all 700 current map scores and 14 match MVP
identities. Browser checks confirmed the 26 / 56 / 16 status counts, the new
provisional Msky5 OVR of 78, the preserved M12 MVP and 50 map scores, keyboard
explanation access, and no overflow at a 390-pixel mobile viewport.

These coverage and regression checks do not establish player-skill accuracy.
Human blind review remains deferred; follow-up diagnoses should separate source
corrections, reference changes, eligibility changes and role-percentile changes.
