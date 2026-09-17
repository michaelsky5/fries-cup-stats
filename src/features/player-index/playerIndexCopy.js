import { translateUiText as formatUiText } from '../../lib/uiText.js'
import { rosterText } from '../roster-index/rosterCopy.js'

const labels = {
  '重装': 'Tank',
  '输出': 'Damage',
  '支援': 'Support',
  '灵活': 'Flex',
  '全部职责': 'All roles',
  '全部队伍': 'All teams',
  '全部英雄': 'All heroes',
  '全部选手': 'All players',
  '关注优先': 'Following first',
  '昵称': 'Name',
  '队伍': 'Team',
  '职责': 'Role'
}

export function playerIndexText(value, locale) {
  return formatUiText(locale === 'en-US' && labels[value] ? labels[value] : rosterText(value, locale), locale)
}
