export const SEASON_REPORT_SCHEMA_VERSION = 'season-scouting-report-v1'

export const SEASON_REPORT_CATALOG = Object.freeze({
  FCR26: Object.freeze({
    seasonId: 'FCR26',
    eventLabel: '薯条杯 2026',
    renderer: 'legacy-fcr26',
    modelVersion: 'scouting-selection-v2.7',
    publicDataPath: '/data/scouting/fcr26/index.json',
    publicRoutePattern: '/scouting/:shareKey',
    buildCommand: 'node scripts/buildScoutingArtifacts.mjs',
    verifyCommand: 'node scripts/assertScoutingReport.mjs'
  }),
  QGCS4: Object.freeze({
    seasonId: 'QGCS4',
    eventLabel: '全高杯 S4',
    renderer: 'role-relative-v1',
    modelVersion: 'qgcs4-selection-v0.1',
    previewPath: '/scouting/qgcs4-preview',
    genericPreviewPath: '/scouting/season-preview/qgcs4',
    sourceArtifactPath: 'artifacts/qgcs4-scouting-review-v30/selection-v0.1-r3.json',
    presentationDataPath: 'src/features/scouting/qgcs4/qgcs4PreviewData.json',
    buildCommand: 'node scripts/buildQgcs4Preview.mjs',
    verifyCommand: 'node scripts/buildQgcs4Preview.mjs --check'
  })
})

export const SEASON_REPORT_IDS = Object.freeze(Object.keys(SEASON_REPORT_CATALOG))

export function getSeasonReportDefinition(seasonId) {
  return SEASON_REPORT_CATALOG[String(seasonId || '').toUpperCase()] || null
}
