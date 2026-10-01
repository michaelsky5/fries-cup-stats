import { REGION_GROUPS, getRegionGroup, getRegionOption } from './regionOptions.js'

const countries = REGION_GROUPS.flatMap(group => group.options.map(option => ({ ...option, groupValue: group.value }))).filter(option => option.value !== 'OTHER')
const aliases = new Map([['china', 'CN'], ['中国', 'CN'], ['中國', 'CN'], ['usa', 'US'], ['uk', 'GB'], ['overseas', 'OTHER']])
const normalize = value => String(value || '').normalize('NFKD').replace(/\p{M}/gu, '').trim().toLocaleLowerCase()

export function resolveRegionCode(value) {
  const saved = normalize(value)
  if (!saved) return ''
  if (saved === 'other') return 'OTHER'
  if (aliases.has(saved)) return aliases.get(saved)
  return countries.find(option => [option.value, option.zh, option.tw, option.en, option.ko].some(label => normalize(label) === saved))?.value || 'OTHER'
}

export function findRegionOptions({ query = '', groupValue } = {}) {
  const search = normalize(query)
  if (!search) return countries.filter(option => !groupValue || option.groupValue === groupValue)
  const exactCode = countries.find(option => normalize(option.value) === search || (['uk', 'usa'].includes(search) && aliases.get(search) === option.value))
  if (exactCode) return [exactCode]
  const terms = search.split(/\s+/)
  return countries.filter(option => {
    const group = getRegionGroup(option.groupValue)
    const text = normalize([option.value, option.zh, option.tw, option.en, option.ko, group.zh, group.tw, group.en, group.ko].join(' '))
    return terms.every(term => text.includes(term))
  })
}

// Registration stores the actual country name; account profiles store the stable region code.
export function registrationCountryValue(value, other = '') {
  const country = String(value || '').trim()
  if (country === 'OTHER') return String(other || '').trim()
  return /^[A-Z]{2}$/.test(country) ? getRegionOption(country)?.zh || country : country
}
