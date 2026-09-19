import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { formatOwMapName } from '../../lib/heroes.js'
import styles from './WeeklyLiveRoomPage.module.css'
const labels = { Control: '占领要点', Escort: '运载目标', Hybrid: '攻击／护送', Push: '机动推进', Flashpoint: '闪点作战' }
export default function RoomRulesPanel({ data }) {
  const uiLocale = useUiLocale()
  if (!data.opening) return null
  const rules = data.opening.rules
  return <details className={styles.roomRules}><summary>{uiText("本场地图池与规则 · ", uiLocale)}{rules.maps.length}{uiText(" 张 / 5 种类型", uiLocale)}</summary><div className={styles.ruleGrid}>{Object.entries(labels).map(([type, label]) => <div key={type}><strong>{label}</strong><ul>{rules.maps.filter(map => map.type === type).map(map => <li key={map.name}>{formatOwMapName(map.name)}<small>{data.maps.some(played => played.name === map.name) ? uiText("本场已选择", uiLocale) : uiText("地图池", uiLocale)}</small></li>)}</ul></div>)}</div><p>{uiText("图一固定为占领要点；实际游戏 1V1 胜者获得图一选择权，并决定本队先 Ban 或后 Ban。图二及后续由上一图败方选择地图类型、具体地图和 Ban 顺序；平局保留选择方。", uiLocale)}</p><p>{uiText("双方每图各 Ban 1 名英雄", uiLocale)}{rules.differentRolesPerMap ? uiText("，双方禁用职责不同", uiLocale) : ''}{rules.uniqueHeroesPerTeamPerSeries ? uiText("；同队整场不能重复禁用同一英雄", uiLocale) : ''}。</p></details>
}
