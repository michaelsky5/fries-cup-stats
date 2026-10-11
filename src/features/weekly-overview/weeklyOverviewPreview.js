export const FOLLOWING_PREVIEW_LIMIT = 8
export const STANDINGS_PREVIEW_LIMIT = 12

const list = value => Array.isArray(value) ? value : []
const teamId = team => String(team?.id || team?.team_id || '')

export function selectWeeklyFollowingPreview(teams, { matches = [], followedTeamIds = [] } = {}) {
  const followed = new Set(list(followedTeamIds).map(String))
  const playing = new Set(list(matches).flatMap(match => [teamId(match.team_a), teamId(match.team_b)]))
  const seen = new Set()
  return list(teams).flatMap((team, index) => {
    const id = teamId(team)
    if (!id || seen.has(id)) return []
    seen.add(id)
    return [{ team, index, priority: followed.has(id) ? 0 : playing.has(id) ? 1 : 2 }]
  }).sort((a, b) => a.priority - b.priority || a.index - b.index)
    .slice(0, FOLLOWING_PREVIEW_LIMIT).map(item => item.team)
}

export function weeklyStandingsPreviewLimit({ matchCount = 0 } = {}) {
  const count = Number.isFinite(Number(matchCount)) ? Math.max(0, Math.floor(Number(matchCount))) : 0
  return Math.min(STANDINGS_PREVIEW_LIMIT, Math.max(6, count + 5))
}

export function selectWeeklyStandingsPreview(standings, focusedTeamIds = [], { limit = STANDINGS_PREVIEW_LIMIT } = {}) {
  const rows = list(standings)
  const size = Number.isInteger(limit) && limit > 0 ? Math.min(limit, STANDINGS_PREVIEW_LIMIT) : STANDINGS_PREVIEW_LIMIT
  const leading = rows.slice(0, size)
  const shown = new Set(leading.map(row => String(row.team_id)))
  const focused = new Set(list(focusedTeamIds).map(String))
  const related = []
  for (const row of rows.slice(size)) {
    const id = String(row.team_id)
    if (!focused.has(id) || shown.has(id)) continue
    related.push(row)
    shown.add(id)
    if (related.length === 2) break
  }
  return { leading, related }
}
