const readable = value => {
  const name = String(value ?? '').trim()
  return name && !/^[—–-]+$/.test(name) ? name : ''
}

// Public naming choice for the registered ? / Ateam team, not its lookup key.
export function getPreferredTeamShortName(shortName, fullName) {
  const short = String(shortName ?? '').trim().toLowerCase()
  const full = String(fullName ?? '').trim().toLowerCase()
  return full === 'ateam' && ['', '?', '？', 'ateam'].includes(short) ? 'ATEAM' : shortName
}

export function getTeamDisplayIdentity(shortName, fullName) {
  const short = readable(shortName)
  const full = readable(fullName)
  const primary = getPreferredTeamShortName(short, full) || full || '—'
  return { primary, secondary: full && full.toLowerCase() !== primary.toLowerCase() ? full : '' }
}

export function getTeamDisplayName(team) {
  return getTeamDisplayIdentity(
    team?.shortName || team?.short || team?.team_short_name,
    team?.fullName || team?.full || team?.name || team?.team_name
  ).primary
}
