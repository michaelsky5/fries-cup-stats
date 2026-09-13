// Only enter an award after the organizer has confirmed it. Statistics leaders
// are not an official FMVP source.
// Use season.id from config/seasons.js: FCR26 (its publicCode is FCR2026).
export const ARCHIVE_OFFICIAL_HONORS = Object.freeze({
  FCR26: Object.freeze({
    fmvpPlayerId: 'FCR26-P0005',
    source: 'Fries Cup organizer confirmation, 2026-09-01'
  })
})
