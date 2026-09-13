import { convertTraditionalCopy } from './localeCatalog.js'
import { translateUiText } from './uiText.js'
import { formatOwHeroName, formatOwMapName } from './heroes.js'

const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const identityField = /^(?:name|playerName|player_name|teamName|team_name|teamShortName|team_short_name|shortName|short_name|battleTag|battletag|battle_tag|nickname|staffName|staff_name|casterName|coach|manager|callsign|callSign|issuedTo|issued_to|author|signature|subject|subjectName|identityName|coverName|displayName|display_name|watermark)$/
const technicalField = /(?:^id$|Id$|_id$|^key$|^type$|^kind$|^code$|^eyebrow$|^locale$|^source|^raw|^href$|^url$|Url$|^src$|^path$|Path$|^asset|^image|^portrait|^logo|^color|^font)/

// Used only for authored review copy. The identity values are shielded before
// converting sentences, including names embedded inside the narrative.
export function createTraditionalReviewTranslator(value, extraNames = []) {
  const names = new Set(extraNames.filter(name => typeof name === 'string' && name))
  const collect = (item, context = '') => {
    if (!item || typeof item !== 'object') return
    if (Array.isArray(item)) { item.forEach(child => collect(child, context)); return }
    for (const [key, child] of Object.entries(item)) {
      const namedCard = /^(?:teamCards|playerCards|rosterCards|partnerCards|crossPartnerCards)$/.test(context) && key === 'title'
      if ((identityField.test(key) || namedCard) && typeof child === 'string' && child) names.add(child)
      else if (typeof child === 'object') collect(child, key)
    }
  }
  collect(value)
  const pattern = names.size ? new RegExp([...names].sort((a, b) => b.length - a.length).map(escape).join('|'), 'g') : null
  return text => {
    if (!/[\u4e00-\u9fff]/.test(text) || names.has(text)) return text
    const values = []
    const shielded = pattern ? text.replace(pattern, name => `\uE000${values.push(name) - 1}\uE001`) : text
    const localized = translateUiText(shielded, 'zh-TW')
    const result = localized === shielded ? convertTraditionalCopy(shielded) : localized
    return result.replace(/\uE000(\d+)\uE001/g, (_, index) => values[index])
  }
}

export function localizeTraditionalReview(value, extraNames = []) {
  const translate = createTraditionalReviewTranslator(value, extraNames)
  const walk = (item, key = '') => {
    if (typeof item === 'string') {
      if (identityField.test(key) || technicalField.test(key)) return item
      if (/hero.*name|heroName|coverHeroName/i.test(key)) return formatOwHeroName(item, 'zh-TW')
      if (/map.*name|mapName/i.test(key)) return formatOwMapName(item, 'zh-TW')
      return translate(item)
    }
    if (Array.isArray(item)) return item.map(child => walk(child))
    if (item && typeof item === 'object') return Object.fromEntries(Object.entries(item).map(([name, child]) => [name, walk(child, name)]))
    return item
  }
  return walk(value)
}
