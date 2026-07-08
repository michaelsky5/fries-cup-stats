function cleanFilePart(value, fallback) {
  const text = String(value || '').trim()
  if (!text) return fallback
  return text
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '-')
    .slice(0, 60)
}

export function createTeamShareFileName({ seasonCode, teamShortName }) {
  const season = cleanFilePart(seasonCode, 'FRIES-CUP')
  const team = cleanFilePart(teamShortName, 'TEAM')
  return `${season}-${team}-team-card.png`
}
