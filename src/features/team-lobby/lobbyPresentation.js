import { getOwHero } from '../../lib/heroes.js'

export function getLobbyCardHero(card) {
  return card.kind === 'PERSON' ? String(card.heroes || '').split(/[、,，;；/|]+/u).flatMap(part => getOwHero(part.trim()) || part.trim().split(/\s+/u).map(getOwHero)).find(Boolean) || null : null
}

export function getLobbyVacancies(card) {
  return card.needs?.reduce((sum, item) => sum + (Number.isInteger(item.count) && item.count > 0 ? item.count : 0), 0) || 0
}
