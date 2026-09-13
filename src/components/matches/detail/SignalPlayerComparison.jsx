import { translateUiText as uiText } from '../../../lib/uiText.js'
import { useUiLocale } from '../../../hooks/useUiLocale.js'
import { useMemo, useState } from 'react'
import { getReviewPlayerComparison, REVIEW_METRICS } from '../../../lib/matchReviewSelectors.js'
import { getRoleEnLabel, getRoleLabel } from '../../../lib/leaderboardSelectors.js'
import { SignalBattleTag, SignalHeroList, SignalRating } from './SignalPlayerData.jsx'
import styles from './SignalPlayerComparison.module.css'

function ComparisonIdentity({ sample, team, en }) {
  const uiLocale = useUiLocale()
  return <div className={styles.identity}>
    <div className={styles.player}>
      <span className={styles.team}>{team.short}<span>{sample.maps.length} {en ? 'maps' : uiText("图", uiLocale)}</span></span>
      <strong>{sample.displayName}</strong>
      <small data-battle-tag={sample.battleTag || undefined}><SignalBattleTag value={sample.battleTag} en={en} /></small>
      <SignalHeroList row={sample} en={en} />
    </div>
    <div className={styles.rating} title={en ? 'Full-match rating, unchanged by the comparison sample' : uiText("整场评分，不随对比范围重新计算", uiLocale)}><span>{en ? 'Match rating' : uiText("全场评分", uiLocale)}</span><SignalRating value={sample.rating} /></div>
  </div>
}

export default function SignalPlayerComparison({ a, b, timeline, dossier, en, onClear, onFindOpponent, panelRef, onEditPlayers, editingPlayers }) {
  const uiLocale = useUiLocale()
  const [scope, setScope] = useState('common')
  const [requestedMode, setMode] = useState('total')
  const comparison = useMemo(() => getReviewPlayerComparison(a, b, timeline, scope), [a, b, timeline, scope])
  const first = a || b
  const mode = requestedMode === 'per10' && comparison?.canUsePer10 ? 'per10' : 'total'
  const format = (value, precision = 0) => value == null ? '—' : new Intl.NumberFormat(uiLocale, { maximumFractionDigits: precision, minimumFractionDigits: precision }).format(value)
  const selectScope = value => { setScope(value); setMode('total') }

  return <section ref={panelRef} className={styles.compare} aria-label={en ? 'Player comparison' : uiText("选手对位比较", uiLocale)} data-comparison-scope={scope} data-comparison-mode={mode}>
    <header className={styles.heading}><strong>{en ? 'Same-role comparison' : uiText("同职责对位", uiLocale)}<span>{en ? getRoleEnLabel(first.role) : uiText(getRoleLabel(first.role), uiLocale)}</span></strong><div className={styles.actions}>{onEditPlayers ? <button type="button" onClick={onEditPlayers} aria-expanded={editingPlayers} aria-controls="comparison-player-picker">{editingPlayers ? (en ? 'Done' : uiText("完成选择", uiLocale)) : (en ? 'Change players' : uiText("更换选手", uiLocale))}</button> : null}<button type="button" onClick={onClear}>{en ? 'Clear comparison' : uiText("清除比较", uiLocale)} ×</button></div></header>
    {comparison ? <>
      <div className={styles.controls}>
        <div className={styles.options} role="group" aria-label={en ? 'Comparison sample' : uiText("对比地图范围", uiLocale)}>
          <button type="button" aria-pressed={scope === 'common'} onClick={() => selectScope('common')}>{en ? 'Shared maps' : uiText("共同出场", uiLocale)}<span>{comparison.commonOrders.length}</span></button>
          <button type="button" aria-pressed={scope === 'all'} onClick={() => selectScope('all')}>{en ? 'All appearances' : uiText("各自出场", uiLocale)}</button>
        </div>
        <div className={styles.options} role="group" aria-label={en ? 'Comparison metric mode' : uiText("对比统计方式", uiLocale)}>
          <button type="button" aria-pressed={mode === 'total'} onClick={() => setMode('total')}>{en ? 'Totals' : uiText("总计", uiLocale)}</button>
          <button type="button" aria-pressed={mode === 'per10'} disabled={!comparison.canUsePer10} onClick={() => setMode('per10')} title={!comparison.canUsePer10 ? (en ? 'Complete recorded role time is required for both players' : uiText("双方所选地图需有完整的职责出场时长", uiLocale)) : (en ? 'Normalized by recorded role time' : uiText("按记录的职责出场时长换算", uiLocale))}>{en ? 'Per 10 min' : uiText("每 10 分钟", uiLocale)}</button>
        </div>
      </div>
      {comparison.a.maps.length && comparison.b.maps.length ? <>
        <div className={styles.names}><ComparisonIdentity sample={comparison.a} team={dossier.teamA} en={en} /><ComparisonIdentity sample={comparison.b} team={dossier.teamB} en={en} /></div>
        <div className={styles.legend}><span>{scope === 'common' ? (en ? `Shared maps: ${comparison.commonOrders.join(' / ')}` : uiText("共同地图：{0}", uiLocale, [comparison.commonOrders.map(order => String(order).padStart(2, '0')).join(' / ')])) : (en ? 'All recorded appearances in this role' : uiText("各自在本职责的全部出场地图", uiLocale))}</span><span>{en ? 'Difference' : uiText("差值", uiLocale)} · {dossier.teamA.short} − {dossier.teamB.short}</span></div>
        <dl className={styles.metrics}>
          {REVIEW_METRICS.map(metric => {
            const precision = mode === 'per10' && ['eliminations', 'assists', 'deaths'].includes(metric.key) ? 1 : 0
            const rawA = comparison.a[mode === 'per10' ? 'per10' : 'totals'][metric.key]
            const rawB = comparison.b[mode === 'per10' ? 'per10' : 'totals'][metric.key]
            const valueA = Number(rawA.toFixed(precision))
            const valueB = Number(rawB.toFixed(precision))
            const difference = Number((valueA - valueB).toFixed(precision))
            return <div key={metric.key} data-comparison-metric={metric.key}>
              <dt>{en ? metric.en : uiText(metric.zh, uiLocale)}</dt>
              <dd className={styles.delta} aria-label={`${en ? 'Difference' : uiText("差值", uiLocale)} ${format(difference, precision)}`}>{difference > 0 ? '+' : ''}{format(difference, precision)}</dd>
              <dd className={styles.values}><span aria-label={`${dossier.teamA.short} ${format(valueA, precision)}`}>{format(valueA, precision)}</span><span aria-label={`${dossier.teamB.short} ${format(valueB, precision)}`}>{format(valueB, precision)}</span></dd>
              <dd className={styles.bar} aria-hidden="true"><i style={{ width: `${rawA + rawB > 0 ? rawA / (rawA + rawB) * 100 : 50}%` }} /><i /></dd>
            </div>
          })}
        </dl>
      </> : <div className={styles.empty}><p>{en ? 'These players have no shared map appearances in this role.' : uiText("这两位选手在本职责没有共同出场的地图。", uiLocale)}</p><button type="button" onClick={() => selectScope('all')}>{en ? 'Compare all appearances' : uiText("比较各自出场数据", uiLocale)} →</button></div>}
    </> : <div className={styles.pending}><span><strong>{first.displayName}</strong>{en ? ' selected' : uiText(" 已选", uiLocale)}</span><button type="button" onClick={onFindOpponent}>{en ? `Choose opposing ${getRoleEnLabel(first.role).toLowerCase()}` : uiText("选择对方{0}", uiLocale, [uiText(getRoleLabel(first.role), uiLocale)])} ↓</button></div>}
  </section>
}
