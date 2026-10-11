import { platformRequest } from '../auth/platformApi.js'

export function newspaperScopePath({ seasonId, cycleId, weekId }) {
  return '/seasons/' + encodeURIComponent(seasonId) + '/cycles/' + encodeURIComponent(cycleId) +
    (weekId ? '/weeks/' + encodeURIComponent(weekId) + '/newspaper' : '/newspapers')
}

export const readPublishedNewspaper = (scope, options) => platformRequest(
  '/public' + newspaperScopePath(scope) + '?locale=' + encodeURIComponent(scope.locale),
  { credentials: 'omit', ...options })
export const readNewspaperArchive = (scope, options) => platformRequest(
  '/public' + newspaperScopePath({ ...scope, weekId: null }) + '?locale=' + encodeURIComponent(scope.locale),
  { credentials: 'omit', ...options })
export const readNewspaperWorkbench = (scope, options) => platformRequest(
  newspaperScopePath(scope) + '?locale=' + encodeURIComponent(scope.locale), options)
export const changeNewspaper = (scope, action, body) => platformRequest(
  newspaperScopePath(scope) + '/' + action + '?locale=' + encodeURIComponent(scope.locale),
  { method: 'POST', body })
