import { getRecordedPlayerHeroes } from './playerDossierPresentation.js'

const completed = match => ['win', 'loss', 'draw'].includes(match.result)
const dated = match => Number.isFinite(Date.parse(match.date))
const chronological = (a, b) => (dated(a) ? Date.parse(a.date) : Infinity) - (dated(b) ? Date.parse(b.date) : Infinity) || a.key.localeCompare(b.key)
const publishedRating = match => Number.isFinite(match.rating) ? Number(match.rating.toFixed(1)) : null

export function getPersonalRoleMatches(appearances, role) {
  return [...new Map(appearances.filter(match => match.role === role && match.maps.length).map(match => [match.key, match])).values()]
}

// Compare only completed, published full-match ratings in one role. The public
// one-decimal score defines ties; a role switch never creates a combined rating.
export function getPlayerSignatureMatch(appearances, role) {
  const matches = getPersonalRoleMatches(appearances, role)
  const rated = matches.filter(match => completed(match) && publishedRating(match) !== null)
    .sort((a, b) => publishedRating(b) - publishedRating(a) || chronological(a, b))
  if (rated.length) {
    const match = rated[0]
    return { match, reason: rated.length === 1 ? 'onlyRated' : 'best', ratedCount: rated.length, tiedCount: rated.filter(item => publishedRating(item) === publishedRating(match)).length }
  }
  const wins = matches.filter(match => match.result === 'win').sort(chronological)
  if (wins.length) return { match: wins[0], reason: wins.every(dated) ? 'firstWin' : 'win', ratedCount: 0, tiedCount: 0 }
  const match = [...matches].sort(chronological)[0]
  return match ? { match, reason: 'record', ratedCount: 0, tiedCount: 0 } : null
}

// These are literal per-10 comparisons, not a new score or a judgment of impact.
// Small samples retain hero/appearance facts without receiving a strength label.
export function getPlayerPersonalReadout(roleData, appearances) {
  const matches = getPersonalRoleMatches(appearances, roleData.role)
  const heroes = getRecordedPlayerHeroes(matches)
  const validMetrics = { TANK: ['elim', 'dmg', 'block', 'dth'], DPS: ['elim', 'dmg', 'ast', 'dth'], SUPPORT: ['heal', 'ast', 'elim', 'dth'] }
  const metric = matches.length > 0 && roleData.summary.eligible && roleData.summary.sampleSize > 1
    ? roleData.coreStats.filter(item => validMetrics[roleData.role]?.includes(item.id) && Number.isFinite(item.value) && Number.isFinite(item.average) && item.average > 0 && Number.isFinite(item.percentile) && item.percentile >= 60 && (item.direction === 'negative' ? item.value < item.average : item.value > item.average))
      .sort((a, b) => b.percentile - a.percentile || a.id.localeCompare(b.id))[0] || null
    : null
  return { matches, maps: matches.reduce((sum, match) => sum + match.maps.length, 0), hero: heroes[0] || null, heroTies: heroes.filter(hero => hero.maps === heroes[0]?.maps).length, metric }
}

export function resolvePlayerStorySelection(appearances, role, selection = {}) {
  const matches = getPersonalRoleMatches(appearances, role)
  const heroes = getRecordedPlayerHeroes(matches)
  const signature = getPlayerSignatureMatch(matches, role)
  const kind = selection.kind === 'match' && matches.length ? 'match' : selection.kind === 'hero' && heroes.length ? 'hero' : 'season'
  return {
    kind, matches, heroes, signature,
    match: matches.find(match => match.key === selection.matchKey) || signature?.match || matches[0] || null,
    hero: heroes.find(hero => hero.key === selection.heroKey) || heroes[0] || null
  }
}
