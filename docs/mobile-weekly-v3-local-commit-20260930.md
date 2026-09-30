# Mobile navigation and weekly V3 local verification

Date: 2026-09-30. This is local verification; no remote push, merge, deployment, or production database change is covered.

## Scope

- Combine the mobile navigation, My Space, and account attention work with weekly V3 registration and public qualification UI.
- Forward the season's published rulebook into both the first shared-link application and the pending-application editor.
- Complete English, Korean, and Traditional Chinese interface copy, including validation issues and composed notification titles. Keep names, BattleTags, and user-entered values unchanged.
- Translate multiline registration errors by interface field and issue, including the new country/region field.
- Label V3 roster continuity as membership of an approved roster, including substitutes and official byes. Older week bindings retain the actual-appearance reference and matching labels; incomplete historical rosters still block submission.

Based on Stats main `09e6f16a289bada5fc9b6f18e84cd2155737e77b`. The companion System branch is `codex/weekly-v3-ready-20260930`; its APIs and additive registration join migration are required for the shared-link workflow.

## Local checks

- Account UI suite passed, including registration input and locale regressions.
- Weekly public pages: 68 tests passed. Mobile navigation: 12 tests passed.
- Four-locale catalog validation passed, including placeholder and generated-dictionary checks.
- Weekly community and partner-trial boundary checks passed.
- Lint passed with the 8 existing ShopPage warnings. Production and isolated partner-trial frontend builds passed.

## Browser and persistence

Used an isolated loopback PostgreSQL cluster and synthetic accounts with a local email sink. The season explicitly published `WEEKLY_V2_0` and the linked V2.0 rulebook:

1. Submitted a first application through the actual English shared-link form. PostgreSQL stored `WEEKLY_V2_0`, status `PENDING`, revision 0.
2. Updated the pending application through the actual editor. PostgreSQL retained `WEEKLY_V2_0`, incremented revision to 1, and stored the changed rank.
3. Checked Korean and Traditional Chinese at a 390px viewport. The form showed the published V2.0 rulebook, localized eligibility labels/options, and retained names and values. The page fit the viewport.

The companion API regression also changes the published rulebook to V3.0, verifies that stale V2.0 consent fails without changing the application, and accepts a refreshed V3.0 confirmation.

Original dirty checkouts and source worktrees are preserved. This commit excludes mini-program experiments, other drafts, and build-only scouting/logo newline changes.
