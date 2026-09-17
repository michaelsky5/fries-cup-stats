import { listGeneratedSeasonReports } from '../../../features/scouting/seasonReports/seasonReportAdapters.js'
import { createSeasonReportPage } from './SeasonReportPage.jsx'

const generatedPages = new Map(listGeneratedSeasonReports().map(adapter => [adapter.seasonId, createSeasonReportPage(adapter)]))

export function getGeneratedSeasonReportPage(seasonId) {
  return generatedPages.get(String(seasonId || '').toUpperCase()) || null
}
