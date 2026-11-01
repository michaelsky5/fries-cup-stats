export const LOBBY_BROWSE_PAGE_SIZE = 6

export function lobbyBrowseQuery(input = {}, { explore = false } = {}) {
  const query = new URLSearchParams({ kind: input.type === 'people' ? 'PERSON' : 'TEAM' })
  for (const key of ['q', 'level', 'time', 'qq', 'recent', 'teamState']) {
    if (input[key] && input[key] !== 'all' && !(key === 'teamState' && input.type === 'people')) query.set(key, input[key])
  }
  if (['TANK', 'DPS', 'SUP'].includes(input.role)) query.set('role', input.role)
  if (explore) {
    for (const key of ['keep', 'exclude']) {
      const ids = [...new Set(input[key] || [])].slice(0, 3)
      if (ids.length) query.set(key, ids.join(','))
    }
  } else {
    query.set('page', String(Math.max(1, Math.min(10000, Math.floor(Number(input.page) || 1)))))
    query.set('pageSize', String(Math.max(1, Math.min(50, Math.floor(Number(input.pageSize) || 20)))))
    query.set('sort', input.sort === 'expiring' ? 'expiring' : 'recent')
  }
  return query
}

export function updateLobbyBrowseQuery(previous, key, value) {
  const next = new URLSearchParams(previous)
  if (value && value !== 'all') next.set(key, value); else next.delete(key)
  if (key !== 'page') next.set('page', '1')
  if (key === 'type') next.delete('teamState')
  return next
}

const text = value => String(value || '').normalize('NFKC').toLocaleLowerCase().trim()
const stamp = value => new Date(value).getTime() || 0

export function filterLobbyCards(cards, filters = {}, now = Date.now()) {
  const words = text(filters.query).split(/\s+/u).filter(Boolean)
  const level = text(filters.level), availability = text(filters.availability)
  const recentHours = { day: 24, three: 72, week: 168 }[filters.recent]
  const result = cards.filter(card => {
    if (stamp(card.expiresAt) <= now || (card.state && card.state !== 'ACTIVE')) return false
    if (filters.role && filters.role !== 'all' && !card.roles.includes(filters.role)) return false
    if (level && !text(card.level).includes(level)) return false
    if (availability && !text(card.availability).includes(availability)) return false
    if (filters.qqMode && filters.qqMode !== 'all' && card.qqMode !== filters.qqMode) return false
    if (recentHours && now - stamp(card.confirmedAt) > recentHours * 3600000) return false
    if (card.kind === 'TEAM' && filters.teamState === 'forming' && !card.forming) return false
    if (card.kind === 'TEAM' && filters.teamState === 'established' && card.forming) return false
    const haystack = text([card.title, card.heroes, card.bio, card.goal].join(' '))
    return words.every(word => haystack.includes(word))
  })
  return result.sort(filters.sort === 'expiring'
    ? (left, right) => stamp(left.expiresAt) - stamp(right.expiresAt) || left.publicId.localeCompare(right.publicId)
    : (left, right) => stamp(right.confirmedAt) - stamp(left.confirmedAt) || left.publicId.localeCompare(right.publicId))
}

export function drawLobbyCards(cards, previous = [], random = Math.random) {
  const unique = [...new Map(cards.map(card => [card.publicId, card])).values()]
  const oldIds = new Set(previous.map(card => card.publicId))
  function shuffled(items) {
    const result = [...items]
    for (let index = result.length - 1; index > 0; index--) {
      const other = Math.floor(random() * (index + 1))
      ;[result[index], result[other]] = [result[other], result[index]]
    }
    return result
  }
  const fresh = shuffled(unique.filter(card => !oldIds.has(card.publicId)))
  const seen = shuffled(unique.filter(card => oldIds.has(card.publicId)))
  return [...fresh, ...seen].slice(0, 3)
}

// Keep valid cards in their slots so an expiry cannot change the card being read.
export function reconcileLobbyDraw(cards, previous = [], random = Math.random) {
  const matches = new Map(cards.map(card => [card.publicId, card]))
  const retainedIds = new Set()
  const slots = previous.slice(0, 3).map(card => {
    const current = matches.get(card.publicId)
    if (!current || retainedIds.has(card.publicId)) return null
    retainedIds.add(card.publicId)
    return current
  })
  const remaining = [...matches.values()].filter(card => !retainedIds.has(card.publicId))
  const replacements = drawLobbyCards(remaining, [], random)
  const next = slots.map(card => card || replacements.shift()).filter(Boolean)
  while (next.length < Math.min(3, matches.size)) next.push(replacements.shift())
  return next
}
