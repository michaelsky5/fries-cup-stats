import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { HeroAvatar } from '../../components/leaderboard/LeaderboardRow.jsx'
import { formatLeaderboardStat } from '../../components/leaderboard/leaderboardFormat.js'
import { METRIC_MODES, getRoleLabel } from '../../lib/leaderboardSelectors.js'
import { getRoleCoreMetricIds, PUBLIC_METRICS } from '../../lib/leaderboardScoring.js'
import { formatOwHeroName } from '../../lib/heroes.js'
import { getSeasonRatingStatusLabel } from '../../lib/seasonRatingPolicy.js'
import { playerLabel } from './kprSelectors.js'
import { getComparisonCells } from './rankingPresentation.js'
import KprDialog from './KprDialog.jsx'
import styles from './KprLeaderboard.module.css'

function formatValue(value, id, mode) {
  if (value === null) return '—'
  return id === 'score' ? String(Math.round(value)) : formatLeaderboardStat(value, mode, id)
}

function Delta({ cell, id, mode, isEn }) {
  const uiLocale = useUiLocale()
  if (cell.isBaseline) return <small className={styles.compareDelta}>{isEn ? 'Baseline' : uiText("对照基准", uiLocale)}</small>
  if (cell.delta === null) return <small className={styles.compareDelta}>{isEn ? 'No comparable data' : uiText("暂无可比数据", uiLocale)}</small>
  return <small className={styles.compareDelta}>{cell.delta === 0 ? (isEn ? 'Equal' : uiText("持平", uiLocale)) : `${cell.delta > 0 ? '+' : '−'}${formatValue(Math.abs(cell.delta), id, mode)}`}</small>
}

export default function KprComparePanel({ open, onClose, entries, mode, onModeChange, locale, withSeason, returnState, onProfileNavigate }) {
  const isEn = locale === 'en-US'
  const [baselineKey, setBaselineKey] = useState('')
  const [showDelta, setShowDelta] = useState(true)
  const [allMetrics, setAllMetrics] = useState(false)
  const baseline = entries.find(entry => entry.entryKey === baselineKey) || entries[0]
  const coreIds = getRoleCoreMetricIds(entries[0]?.role)
  const metricIds = allMetrics ? [...new Set([...coreIds, ...PUBLIC_METRICS.map(metric => metric.id)])] : coreIds
  const rows = [{ id: 'score', label: uiText("赛季总评", locale), short: 'Season OVR' }, ...metricIds.map(id => PUBLIC_METRICS.find(metric => metric.id === id)).filter(Boolean)]
  const modeLabel = uiText(METRIC_MODES.find(item => item.id === mode)?.[isEn ? 'en' : 'label'], locale)

  return <KprDialog open={open && entries.length >= 2} onClose={onClose} locale={locale} className={styles.compareDialog} title={isEn ? 'Same role. Different performances.' : uiText("同一职责，看见表现差异。", locale)}>
    <div className={styles.compareIntro}><span>{isEn ? entries[0]?.role : uiText(getRoleLabel(entries[0]?.role), locale)} <b>/</b> {entries.length} {isEn ? 'players' : uiText("位选手", locale)}</span><p>{isEn ? 'Read the sample first, then the numbers.' : uiText("先看出场样本，再看数据差异。", locale)}</p></div>
    <div className={styles.compareControls}>
      <div className={styles.modeTabs} aria-label={isEn ? 'Comparison metric mode' : uiText("比较统计口径", locale)}>{METRIC_MODES.map(item => <button key={item.id} type="button" aria-pressed={mode === item.id} onClick={() => onModeChange(item.id)}>{isEn ? item.en : uiText(item.label, locale)}</button>)}</div>
      <label className={styles.baselineControl}><span>{isEn ? 'Baseline' : uiText("对照基准", locale)}</span><select aria-label={isEn ? 'Comparison baseline' : uiText("比较基准选手", locale)} value={baseline?.entryKey || ''} onChange={event => setBaselineKey(event.target.value)}>{entries.map(entry => <option key={entry.entryKey} value={entry.entryKey}>{playerLabel(entry)}</option>)}</select></label>
      <button type="button" role="switch" className={`${styles.rankedOnly} ${styles.deltaControl}`} aria-checked={showDelta} onClick={() => setShowDelta(value => !value)}><span>{isEn ? 'Show differences' : uiText("显示差值", locale)}</span><span className={styles.rankedSwitch} aria-hidden="true" /></button>
    </div>
    <div className={styles.compareContext}><p>{showDelta ? (isEn ? `Differences from ${playerLabel(baseline)} · ${modeLabel}` : uiText("相对 {0} 的数值差 · {1}", locale, [playerLabel(baseline), modeLabel])) : modeLabel}<span>{isEn ? 'Season OVR stays fixed.' : uiText("赛季总评保持不变。", locale)}</span></p><button type="button" aria-pressed={allMetrics} onClick={() => setAllMetrics(!allMetrics)}>{allMetrics ? (isEn ? 'Core metrics' : uiText("只看核心指标", locale)) : (isEn ? 'All six metrics' : uiText("展开全部 6 项", locale))} {allMetrics ? '−' : '+'}</button></div>
    <div className={styles.compareScroll} tabIndex={0} role="region" aria-label={isEn ? 'Player comparison, scroll horizontally for more players' : uiText("选手数据对照，可横向查看其他选手", locale)}>
      <table className={styles.compareTable} style={{ '--compare-count': entries.length }}>
        <caption className={styles.srOnly}>{isEn ? 'Same-role player statistics' : uiText("同职责选手数据对照", locale)} / {modeLabel}</caption>
        <thead><tr><th scope="col"><b className={styles.compareVs}>VS.</b><small>{isEn ? 'Role sample' : uiText("职责样本", locale)}</small></th>{entries.map(entry => <th scope="col" key={entry.entryKey} data-baseline={entry.entryKey === baseline?.entryKey || undefined}>
          <span className={styles.comparePlayerStatus}>{entry.entryKey === baseline?.entryKey ? (isEn ? 'BASELINE' : uiText("对照基准", locale)) : (isEn ? 'PLAYER' : uiText("比较选手", locale))}</span>
          <div className={styles.comparePlayer}><HeroAvatar entry={entry} className={styles.compareAvatar} /><Link className={styles.compareProfile} to={withSeason(`/players/${encodeURIComponent(entry.player_id)}?role=${entry.role}`)} state={returnState} onClick={onProfileNavigate} aria-label={`${isEn ? 'Full player profile' : uiText("查看完整选手档案", locale)}：${playerLabel(entry)}`}>{playerLabel(entry)}<span aria-hidden="true">↗</span></Link></div><small>{entry.team_short_name || entry.team_name || '—'} / {formatOwHeroName(entry.most_played_hero, locale)}</small>
          <div className={styles.compareSample}><span><b>{entry.roleMapsPlayed || 0}</b> {isEn ? 'maps' : uiText("图", locale)}</span><span><b>{Math.round(entry.roleTimeMins || 0)}</b> {isEn ? 'min' : uiText("分钟", locale)}</span><span><b>{entry.roleMatchesPlayed ?? '—'}</b> {isEn ? 'matches' : uiText("场比赛", locale)}</span></div>
          {!entry.eligible ? <small className={styles.lowSample}>{getSeasonRatingStatusLabel(entry, locale)} · {isEn ? 'unranked' : uiText("未入榜", locale)}</small> : null}
        </th>)}</tr></thead>
        <tbody>{rows.map(metric => {
          const cells = getComparisonCells(entries, metric.id, mode, baseline?.entryKey)
          return <tr key={metric.id} data-metric={metric.id}><th scope="row">{isEn ? metric.short : uiText(metric.label, locale)}<small>{metric.id === 'score' ? 'OVR' : metric.id === 'dth' ? (isEn ? 'Lower value ↓' : uiText("较低值 ↓", locale)) : (isEn ? metric.short : '')}</small></th>{entries.map((entry, index) => <td key={entry.entryKey} data-extreme={cells[index].isExtreme || undefined}>
            <span className={styles.compareValue}>{formatValue(cells[index].value, metric.id, mode)}</span>
            {showDelta ? <Delta cell={cells[index]} id={metric.id} mode={mode} isEn={isEn} /> : null}
            <span className={styles.compareMetricTrack} aria-hidden="true"><i style={{ width: `${cells[index].fraction * 100}%` }} /></span>
          </td>)}</tr>
        })}</tbody>
      </table>
      <div className={styles.compareFootnote}><p><i aria-hidden="true" />{isEn ? 'Accent marks the selected group’s highest value (lowest for deaths), only when values differ. It does not establish overall superiority.' : uiText("标记选中范围内的较高值（阵亡取较低值），数值相同时不标记；不代表整体实力高低。", locale)}</p><p>{mode === 'total' ? (isEn ? 'Total-statistic rows are not highlighted: totals depend on time played.' : uiText("总计受出场时间影响，因此总计数据行不作极值标记。", locale)) : (isEn ? 'Hero choices, sample size and match context affect these statistics. Missing data is shown as —.' : uiText("英雄选择、样本量和比赛环境都会影响数据；缺失记录显示为 —。", locale))}</p></div>
    </div>
  </KprDialog>
}
