import { translateUiText as formatUiText } from '../../lib/uiText.js'
import { translateLegacyText } from '../../lib/legacyI18n.js'

const labels = {
  '全部职员': 'All staff',
  '赛管': 'Officials',
  '解说': 'Casters',
  '职务顺序': 'Role order',
  '队伍 / 赛事': 'Team / event',
  '经理 / 教练': 'Manager / coach',
  '清除全部筛选': 'Clear all filters',
  '我的关注': 'Following',
  '只看关注': 'Following only',
  '简称 A-Z': 'Name A–Z',
  '出场时间': 'Time played'
}

export function rosterText(value, locale) {
  if (locale !== 'en-US') return formatUiText(translateLegacyText(value, locale), locale)
  if (labels[value]) return formatUiText(labels[value], locale)
  if (String(value).startsWith('搜索：')) return formatUiText(`Search: ${String(value).slice(3)}`, locale)
  return formatUiText(translateLegacyText(value, locale), locale)
}
