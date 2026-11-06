import { getOwHero, OW_HEROES } from '../../lib/heroes.js'

// Artwork is a hint, never a rewrite of the author's hero description.
const commonNames = { 闪光: 'tracer', 麦克雷: 'cassidy', 小美: 'mei', 小锤: 'brigitte', 大锤: 'reinhardt', 毛妹: 'zarya', 和尚: 'zenyatta', DJ: 'lucio', 阿三: 'symmetra', 百合: 'widowmaker', 无恙: 'wuyang', 瑞希: 'mizuki', 依拉瑞: 'illari', 伊拉瑞: 'illari', 依拉锐: 'illari' }
const aliases = Object.entries(commonNames).map(([name, id]) => ({ name: name.toLocaleLowerCase(), id }))
const mentions = [...OW_HEROES.flatMap(hero => [hero.zh, hero.en, hero.id, ...(hero.aliases || [])].map(name => ({ name: name.normalize('NFKC').toLocaleLowerCase(), id: hero.id }))), ...aliases]
  .filter(({ name }) => Array.from(name).length > 1)

function mentionedHero(value) {
  const exact = getOwHero(value) || getOwHero(aliases.find(item => item.name === value)?.id)
  if (exact) return exact
  const matches = mentions.flatMap(item => {
    const index = value.indexOf(item.name)
    if (index < 0) return []
    // English abbreviations must not match inside unrelated words (e.g. Canada).
    if (/^[a-z\d .-]+$/i.test(item.name) && (/[a-z\d]/i.test(value[index - 1] || '') || /[a-z\d]/i.test(value[index + item.name.length] || ''))) return []
    return [{ ...item, index }]
  }).sort((a, b) => a.index - b.index || b.name.length - a.name.length)
  return getOwHero(matches[0]?.id) || null
}

export function getLobbyCardHero(card) {
  if (card.kind !== 'PERSON') return null
  const text = String(card.heroes || '').normalize('NFKC').trim().toLocaleLowerCase()
  // Do not infer a favourite from negative or exclusion prose, even if other
  // heroes are mentioned positively. Keep the author's text and use role art.
  if (!text || /[不没沒除]|\b(?:except|excluding|not|no|never|without|unable|cannot|(?:don|doesn|can|couldn|won|wouldn)[’']t)\b/u.test(text)) return null
  return mentionedHero(text)
}

export function getLobbyVacancies(card) {
  return card.needs?.reduce((sum, item) => sum + (Number.isInteger(item.count) && item.count > 0 ? item.count : 0), 0) || 0
}
