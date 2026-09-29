import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { formatOwMapName } from '../../lib/heroes.js'
import styles from './WeeklyLiveRoomPage.module.css'
const labels = { Control: '占领要点', Escort: '运载目标', Hybrid: '攻击／护送', Push: '机动推进', Flashpoint: '闪点作战' }
export default function RoomRulesPanel({ data }) {
  const uiLocale = useUiLocale()
  const rules = data.opening?.rules
  const reference = data.rulebook
  const rulesUrl = reference?.slug && reference?.version
    ? `https://fries-cup.com/rules/?book=${encodeURIComponent(reference.slug)}&version=${encodeURIComponent(reference.version)}`
    : 'https://fries-cup.com/rules/'
  return <details className={styles.roomRules}><summary>{uiText("本场地图池与规则", uiLocale)}{rules ? ` · ${rules.maps.length}` : ''}</summary>
    <p><a href={rulesUrl} target="_blank" rel="noreferrer">{reference ? `${uiText('本场适用规则', uiLocale)} · V${reference.version}` : uiText('打开规则中心', uiLocale)} ↗</a></p>
    {!reference && <p>{uiText('本场尚未关联线上规则版本，请以本周期已公布的规则及赛事组公告为准。', uiLocale)}</p>}
    {rules && <><div className={styles.ruleGrid}>{Object.entries(labels).map(([type, label]) => <div key={type}><strong>{uiText(label, uiLocale)}</strong><ul>{rules.maps.filter(map => map.type === type).map(map => <li key={map.name}>{formatOwMapName(map.name, uiLocale)}<small>{data.maps.some(played => played.name === map.name) ? uiText("本场已选择", uiLocale) : uiText("地图池", uiLocale)}</small></li>)}</ul></div>)}</div><p>{uiText('以下为比赛房当前配置，具体选禁步骤请按操作区完成。', uiLocale)}</p><p>{uiText("双方每图各 Ban 1 名英雄", uiLocale)}{rules.differentRolesPerMap ? uiText("，双方禁用职责不同", uiLocale) : ''}{rules.uniqueHeroesPerTeamPerSeries ? uiText("；同队整场不能重复禁用同一英雄", uiLocale) : ''}。</p></>}
  </details>
}
