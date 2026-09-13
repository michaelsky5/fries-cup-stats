import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { SignalDataNav } from '../../components/database/SignalDataHeader.jsx'
import { getRestoreScrollState, readReturnState } from '../../lib/navigationState.js'
import styles from './HeroData.module.css'

export const roleLabel = (role, isEn) => isEn ? role.toUpperCase() : ({ tank: '重装', damage: '输出', support: '支援' }[role] || role)
export const percentage = value => `${(value * 100).toFixed(1)}%`

export function HeroDataNav({ withSeason, isEn, backTo }) {
  const uiLocale = useUiLocale()
  const location = useLocation()
  const incoming = backTo ? readReturnState(location.state, { allowedPrefixes: ['/maps'] }) : {}
  const candidate = { ...incoming, parentReturnTo: location.state?.parentReturnTo, parentReturnScrollY: location.state?.parentReturnScrollY }
  const [retained, setRetained] = useState(candidate)
  if (incoming.returnTo && ['returnTo', 'returnScrollY', 'parentReturnTo', 'parentReturnScrollY'].some(key => candidate[key] !== retained[key])) setRetained(candidate)
  const source = backTo ? (incoming.returnTo ? candidate : retained) : {}
  const parent = readReturnState({ returnTo: source.parentReturnTo, returnScrollY: source.parentReturnScrollY }, { allowedPrefixes: ['/maps', '/heroes'] })
  return <SignalDataNav active="heroes" withSeason={withSeason} isEn={isEn} activeHref={backTo} backTo={source.returnTo || backTo} backState={source.returnTo ? { ...getRestoreScrollState(source.returnScrollY), ...(parent.returnTo ? parent : {}) } : undefined} backLabel={source.returnTo ? (isEn ? 'Back to map' : uiText('返回地图档案', uiLocale)) : (isEn ? 'Back to all heroes' : uiText('返回英雄索引', uiLocale))} />
}

export function GuideMethod({ isEn, guide }) {
  const uiLocale = useUiLocale()
  const { hash } = useLocation()
  return <details className={styles.method} id="hero-method" open={hash === '#hero-method' || undefined}><summary>{isEn ? 'How to read these records' : uiText("如何理解这些记录", uiLocale)}</summary>
    <p>{isEn
      ? `The guide covers ${guide.mapRecords} of ${guide.totalMapRecords} published map records, with ${guide.samples} team-sides containing recognized heroes. A hero counts once per team-side. Appearance rate divides this count by all covered sides; a mirror match contributes two appearances and one map record.`
      : uiText("本页覆盖 {0} 条已发布地图记录中的 {1} 条，包含 {2} 份有英雄信息的队伍单图记录。同一英雄在一支队伍的一张图中只计一次；记录出场率以全部有英雄信息的队伍单图记录为分母。双方都记录同一英雄时，计 2 次出场、1 条地图记录。", uiLocale, [guide.totalMapRecords, guide.mapRecords, guide.samples])}</p>
    <p>{isEn ? 'These are heroes attached to published post-map statistics. They do not establish full-match compositions, exact hero play time, proficiency, or the current game meta. Administrative results and unrecognized hero labels are excluded. Player and partner counts use the same recorded evidence.' : uiText("这些英雄来自赛后发布的单图统计，不代表全程阵容、实际使用时长、熟练度或当前版本强度。单图裁决和无法识别的英雄标签不计入样本；选手和同队英雄也使用同一套记录口径。", uiLocale)}</p>
  </details>
}

export function GuideEmpty({ title, children, action }) {
  return <div className={styles.empty}><span aria-hidden="true">∅</span><h2>{title}</h2><p>{children}</p>{action}</div>
}

export function GuideSectionTitle({ number, english, title, titleId, children }) {
  return <header className={styles.sectionTitle}><span>{number}</span><div><small className={styles.eyebrow}>{english}</small><h2 id={titleId}>{title}</h2></div>{children}</header>
}
