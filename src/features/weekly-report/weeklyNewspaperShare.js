import QRCode from 'qrcode'
import { getSeasonById, resolveSeasonFromUrl } from '../../config/seasons.js'
import { getLocaleParam } from '../../lib/locales.js'
import { weeklyPeriodPath } from '../weekly-overview/weeklyPresentation.js'

const PUBLIC_RESULTS_ORIGIN = 'https://stats.fries-cup.com'

// Keep the printed edition tied to its own week, including in local previews.
export function buildWeeklyNewspaperResultsUrl(report, seasonId, locale) {
  if (!report?.cycle?.id || !report?.week?.id || !seasonId) return ''
  const canonicalSeason = resolveSeasonFromUrl(seasonId)
  if (!canonicalSeason) return ''
  const url = new URL(weeklyPeriodPath('/matches', report.cycle, report.week), PUBLIC_RESULTS_ORIGIN)
  url.searchParams.set('season', getSeasonById(canonicalSeason).publicCode)
  url.searchParams.set('lang', getLocaleParam(locale))
  return url.href
}

export function buildWeeklyNewspaperQr(url) {
  if (!url) return null
  const modules = QRCode.create(url, { errorCorrectionLevel: 'M' }).modules
  const quietZone = 4
  const paths = []
  for (let row = 0; row < modules.size; row += 1) {
    for (let column = 0; column < modules.size; column += 1) {
      if (modules.get(row, column)) paths.push(`M${column + quietZone} ${row + quietZone}h1v1h-1z`)
    }
  }
  return { size: modules.size + quietZone * 2, path: paths.join('') }
}
