import { createQgcs4SeasonReport } from './qgcs4SeasonReport.js'
import { getSeasonReportDefinition } from './seasonReportCatalog.js'

const qgcs4Definition = getSeasonReportDefinition('QGCS4')
const adapters = Object.freeze({ QGCS4: createQgcs4SeasonReport(qgcs4Definition.genericPreviewPath) })

const requiredFunctions = [
  'formatNumber', 'getBoundaryPlayers', 'getComparisonFocus', 'getComparisonPlayers',
  'getEvidenceMatches', 'getHeroMapRecords', 'getLanguage', 'getMetricReference',
  'getOverviewFocusValue', 'getPositionPlayers', 'localize', 'previewLink', 'textFor'
]

export function validateSeasonReportAdapter(adapter) {
  if (!adapter?.seasonId) throw new Error('Season report adapter requires seasonId.')
  if (!adapter.data?.players?.length) throw new Error(`${adapter.seasonId}: report data has no players.`)
  if (!adapter.POSITIONS?.length || !adapter.POSITION_CONFIG) throw new Error(`${adapter.seasonId}: position configuration is missing.`)
  if (!adapter.PLAYER_COPY || !adapter.POSITION_COPY) throw new Error(`${adapter.seasonId}: localized analysis copy is missing.`)
  for (const key of requiredFunctions) if (typeof adapter[key] !== 'function') throw new Error(`${adapter.seasonId}: adapter function ${key} is missing.`)
  for (const position of adapter.POSITIONS) {
    const config = adapter.POSITION_CONFIG[position]
    if (!config?.slug || !config?.color || !config.metrics?.length) throw new Error(`${adapter.seasonId}: invalid position ${position}.`)
    if (!adapter.POSITION_COPY[position]) throw new Error(`${adapter.seasonId}: position copy ${position} is missing.`)
  }
  const selected = adapter.data.players.filter(player => player.selected)
  if (!selected.length) throw new Error(`${adapter.seasonId}: report has no selected dossiers.`)
  for (const player of selected) {
    if (!adapter.PLAYER_COPY[player.id]) throw new Error(`${adapter.seasonId}: dossier copy ${player.id} is missing.`)
    if (!adapter.POSITION_CONFIG[player.position]) throw new Error(`${adapter.seasonId}: unknown player position ${player.position}.`)
  }
  return adapter
}

for (const adapter of Object.values(adapters)) validateSeasonReportAdapter(adapter)

export function getSeasonReportAdapter(seasonId) {
  return adapters[String(seasonId || '').toUpperCase()] || null
}

export function listGeneratedSeasonReports() {
  return Object.values(adapters)
}
