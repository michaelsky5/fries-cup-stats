import { searchRosterOverview } from '../roster-overview/rosterOverviewModel.js'

// Players first: most visitors arrive from a group chat looking for themselves.
export const SITE_SEARCH_GROUPS = ['players', 'teams', 'teamStaff', 'eventStaff']
const normal = value => String(value ?? '').normalize('NFKC').trim().toLowerCase()

// 票 2.21: the roster directory's own search, reordered for a site-wide box.
// A group holding an exact name match leads, so 「404」 + Enter opens the team.
export function searchSite(model, query) {
  if (!model || !normal(query)) return []
  const found = searchRosterOverview(model, query)
  const ordered = SITE_SEARCH_GROUPS.map(id => found.find(group => group.id === id)).filter(Boolean)
  const exact = group => group.items.some(item => normal(item.name) === normal(query))
  return [...ordered.filter(exact), ...ordered.filter(group => !exact(group))]
}
