import { translateUiText as uiText } from '../../lib/uiText.js'
import { getMySpaceReturnLabel } from '../../lib/mySpaceNavigation.js'

// 票 2.72: the team page's way back names where it goes (「← 返回参赛队伍」), like the player
// page; it used to be a bare ← whose name was only 「返回上一页」. Without a source page the
// button opens the team index, so that is the default.
const RETURN_LABELS = [
  [/^\/matches\//, '返回比赛战报'],
  [/^\/matches(?:[?#]|$)/, '返回赛程赛果'],
  [/^\/players\//, '返回选手档案'],
  [/^\/players(?:[?#]|$)/, '返回选手列表'],
  [/^\/staff\//, '返回职员档案'],
  [/^\/roster/, '返回阵容总览'],
  [/^\/teams\//, '返回队伍档案'],
  [/^\/teams(?:[?#]|$)/, '返回参赛队伍'],
  [/^\/leaderboard/, '返回选手排行'],
  [/^\/maps/, '返回地图档案'],
  [/^\/heroes/, '返回英雄档案'],
  [/^\/(?:[?#]|$)/, '返回赛事总览']
]

export function getTeamBackLabel(returnTo, locale) {
  if (!returnTo) return uiText('返回参赛队伍', locale)
  const mySpace = getMySpaceReturnLabel(returnTo, locale)
  if (mySpace) return mySpace
  const match = RETURN_LABELS.find(([pattern]) => pattern.test(returnTo))
  return uiText(match ? match[1] : '返回上一页', locale)
}
