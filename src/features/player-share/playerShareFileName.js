const ILLEGAL_FILE_CHARS = /[\\/:*?"<>|]+/g

export function sanitizeShareFilePart(value, fallback = 'Player') {
  const text = String(value || fallback)
    .replace(ILLEGAL_FILE_CHARS, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80)

  return text || fallback
}

export function createPlayerShareFileName({ seasonCode, nickname, role }) {
  const safeSeason = sanitizeShareFilePart(seasonCode, 'FriesCup')
  const safeName = sanitizeShareFilePart(nickname, 'Player')
  const safeRole = sanitizeShareFilePart(role, 'ROLE')
  return `${safeSeason}_${safeName}_${safeRole}_PlayerCard.png`
}
