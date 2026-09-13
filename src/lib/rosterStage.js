import { translateUiText as formatUiText } from './uiText.js'
const key = value => String(value ?? '').normalize('NFKC').trim().toLowerCase()

export function getPlayerRosterChange(player) {
  if (key(player?.exit_stage) === 'playoffs' || key(player?.roster_status) === 'playoff_withdrawal') return 'playoff_exit'
  if (key(player?.join_stage) === 'playoffs' || key(player?.roster_status) === 'playoff_introduction') return 'playoff_join'
  return ''
}

export function getRosterChangeLabel(change, locale = 'zh-CN') {
  const en = locale === 'en-US'
  if (change === 'playoff_join') return formatUiText(en ? 'Joined for playoffs' : '季后赛加入', locale)
  if (change === 'playoff_exit') return formatUiText(en ? 'Left before playoffs' : '季后赛退出', locale)
  return formatUiText('', locale)
}
