export function showPersonalLobbyEntry({ user, competitions, loading, error } = {}) {
  // Unknown account relationships must not be presented as an unteamed player.
  if (!user || loading || error || !Array.isArray(competitions)) return false
  if (user.role === 'ADMIN' && user.accountMode !== 'PLAYER') return false
  return competitions.every(competition => Array.isArray(competition.teams) && competition.teams.length === 0)
}
