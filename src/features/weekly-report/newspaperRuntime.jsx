import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom'
import WeeklyNewspaper from './WeeklyNewspaper.jsx'
import '../../styles/tokens.css'
import { ensureUiLocale } from '../../lib/localeCatalog.js'

// Unlike browser navigation, the worker has no route loader to prepare copy.
await Promise.all(['zh-TW', 'en-US', 'ko-KR'].map(ensureUiLocale))
export { buildWeeklyReportPreview } from './weeklyReportPreview.js'
export { createIssueDraft, validateIssueDraft, applyIssueEdits } from './weeklyIssueVersions.js'

export const NEWSPAPER_RUNTIME_VERSION = 'frypress-release-12'
export function renderNewspaper(draft) {
  const { report, paper, scope } = draft
  const withSeason = path => path + (path.includes('?') ? '&' : '?') + 'season=' + encodeURIComponent(scope.seasonId)
  const newspaper = React.createElement(WeeklyNewspaper, { report: { ...report, publication: { published: true } },
    newspaperOverride: paper, locale: scope.locale, seasonId: scope.seasonId, withSeason, embedded: true })
  return renderToStaticMarkup(React.createElement(StaticRouter, { location: '/' }, newspaper))
}
