const idOf = team => String(team?.team_id || team?.teamId || team?.id || '')
const logoKeys = ['team_logo', 'teamLogo', 'logo_url', 'logoUrl', 'logo', 'crest_url', 'crestUrl', 'crest']

// Keep score/publication facts intact: the live projection changes logos only.
export function applyCurrentTeamLogos(data, manifest) {
  const publishedIds = new Set((data?.teams || []).map(idOf))
  const logos = new Map((manifest?.logos || []).filter(row => publishedIds.has(String(row.teamId)) && typeof row.logoUrl === 'string'
    && (!row.logoUrl || /^https?:\/\//.test(row.logoUrl) || /^\/(?!\/)/.test(row.logoUrl))).map(row => [String(row.teamId), row.logoUrl]))
  if (!logos.size) return data
  const update = team => {
    if (!team || !logos.has(idOf(team))) return team
    const logo = logos.get(idOf(team))
    return { ...team, ...Object.fromEntries(logoKeys.filter(key => key in team || key === 'team_logo').map(key => [key, logo])) }
  }
  return { ...data, teams: data.teams.map(update), ...(Array.isArray(data.matches) ? {
    matches: data.matches.map(match => ({ ...match, team_a: update(match.team_a), team_b: update(match.team_b) }))
  } : {}) }
}

export async function hydrateCurrentTeamLogos(data, season, sourceUrl, fetchImpl = fetch) {
  if (season.competitionFormat !== 'WEEKLY' || season.lifecycle !== 'ACTIVE' || season.preferLocalData || sourceUrl === season.localDataUrl) return data
  try {
    const response = await fetchImpl(`/api/admin-public/seasons/${encodeURIComponent(season.id)}/team-logos`, {
      credentials: 'omit', signal: AbortSignal.timeout(4000)
    })
    if (!response.ok) return data
    const manifest = await response.json()
    return manifest.seasonId === season.id ? applyCurrentTeamLogos(data, manifest) : data
  } catch { return data }
}
