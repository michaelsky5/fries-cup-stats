import { translateUiText as uiText } from '../../../lib/uiText.js'
import { useUiLocale } from '../../../hooks/useUiLocale.js'
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import TeamLogo from '../TeamLogo.jsx'
import { formatInt } from '../../../lib/format.js'
import { getReviewBanOrder, getReviewMapRating, getReviewTeamMvpKeys } from '../../../lib/matchReviewSelectors.js'
import { getHeroAvatarSrc, getRoleEnLabel, getRoleLabel } from '../../../lib/leaderboardSelectors.js'
import { SignalBattleTag, SignalRating } from './SignalPlayerData.jsx'
import useCompactMatchLayout from './useCompactMatchLayout.js'
import { getMatchStatsViewSearch } from './matchReadingState.js'
import dataStyles from './SignalPlayerData.module.css'
import styles from './SignalMapStats.module.css'

const ACTIVITY_KEYS = ['eliminations', 'assists', 'deaths']

function Avatar({ row }) {
  const [failedSrc, setFailedSrc] = useState('')
  const src = getHeroAvatarSrc(row.hero, row.role)
  return <span className={styles.avatar} title={row.hero || undefined}>{src && failedSrc !== src ? <img src={src} alt="" loading="lazy" onError={() => setFailedSrc(src)} /> : row.displayName?.slice(0, 1)}</span>
}

function StatCell({ row, column, maxima, t, focusedMetric, groupStart, total = false }) {
  const value = row[column.key]
  const display = value == null || value === '' ? '—' : formatInt(value, '—')
  const focused = focusedMetric === column.key
  const hasValue = value != null && value !== '' && Number.isFinite(Number(value))
  const fraction = hasValue && maxima[column.key] > 0 ? Math.min(1, Math.max(0, Number(value) / maxima[column.key])) : 0
  return <td className={ACTIVITY_KEYS.includes(column.key) ? styles.activity : undefined} data-metric={column.key} data-focused={focused} data-group-start={groupStart}>
    <span className={styles.value} title={`${t(column.labelKey, column.fallback)}: ${display}`}>
      <span data-stat={column.key}>{display}</span>
      {focused && hasValue && !total ? <i className={styles.measure} aria-hidden="true" style={{ width: `${fraction * 100}%` }} /> : null}
    </span>
  </td>
}

function MetricHeading({ column, en, t, focusedMetric, onFocusMetric, groupStart }) {
  const uiLocale = useUiLocale()
  const label = t(column.labelKey, column.fallback)
  const focused = focusedMetric === column.key
  return <th scope="col" className={ACTIVITY_KEYS.includes(column.key) ? styles.activity : undefined} data-group-start={groupStart}>
    <button type="button" className={styles.metricButton} data-focus-metric={column.key} aria-pressed={focused} aria-label={`${en ? 'Compare both teams: ' : uiText("对照双方", uiLocale)}${label}`} title={en ? `Compare ${label}; click again to clear` : uiText("对照双方{0}，再次点击取消", uiLocale, [label])} onClick={() => onFocusMetric(focused ? '' : column.key)}>
      {en ? column.short : label}
    </button>
  </th>
}

function TeamHeading({ side, map, dossier, seasonId, en, bestPlayers }) {
  const uiLocale = useUiLocale()
  const team = dossier[`team${side}`]
  const ban = map[`team${side}Ban`]
  const hasBan = ban && !['—', '-'].includes(ban)
  const banOrder = getReviewBanOrder(map, side)
  return <header className={styles.teamHeading} data-winner={map.winnerSide === side}>
    <TeamLogo team={dossier.match[`team_${side.toLowerCase()}`]} seasonId={seasonId} teamShortName={team.short} teamName={team.full} className={styles.teamLogo} />
    <div className={styles.teamName}><strong title={team.full}>{team.short}</strong>
      {bestPlayers.length ? <div className={styles.teamBest} data-map-team-best={side} aria-label={`${team.short} · ${en ? 'Team best on this map' : uiText("本队本图最佳", uiLocale)}`}><span>{en ? 'Team best' : uiText("本队最佳", uiLocale)}</span><div>{bestPlayers.map(({ row }) => <strong key={row.key}>{row.displayName}</strong>)}</div></div> : null}
    </div>
    <div className={styles.ban} data-ban-order={banOrder || undefined}><span>{banOrder ? (en ? `${banOrder === 1 ? '1st' : '2nd'} BAN` : `${banOrder === 1 ? uiText('先', uiLocale) : uiText('后', uiLocale)} BAN`) : (en ? 'BAN' : uiText("禁用", uiLocale))}</span>{hasBan ? <><i><Avatar row={{ hero: ban, role: map[`team${side}BanRole`], displayName: ban }} /></i><b title={ban}>{ban}</b></> : <b>—</b>}</div>
  </header>
}

function PlayerRow({ entry, slot, height, mvp, awardIndex, columns, metricStart, focusedMetric, maxima, participantScores, en, t, withSeason, returnState, onPlayerNavigate }) {
  const uiLocale = useUiLocale()
  const { row, impact } = entry
  const award = awardIndex.get(row.key)
  const playerPath = row.playerId ? withSeason(`/players/${encodeURIComponent(row.playerId)}?role=${encodeURIComponent(row.role)}`) : ''
  const role = en ? getRoleEnLabel(row.role) : uiText(getRoleLabel(row.role), uiLocale)
  const rating = getReviewMapRating(impact?.entry, participantScores)
  const description = [row.displayName, row.battleTag, role, row.hero].filter(Boolean).join(' · ')
  const identity = <><Avatar row={row} /><span><strong title={row.displayName}>{row.displayName}</strong><small className={styles.battleTag} data-battle-tag={row.battleTag || undefined}><SignalBattleTag value={row.battleTag} en={en} /></small></span></>
  return <tr className={`${styles.playerRow} ${dataStyles.roleRow}`} data-player-row data-role={row.role} data-row-slot={slot} style={height ? { height } : undefined} data-team-best={mvp || undefined}>
    <th scope="row" className={styles.identityCell}>{playerPath ? <Link className={styles.identity} to={playerPath} state={returnState} onClick={onPlayerNavigate} title={[row.battleTag || description, role, award ? t(award.labelKey, award.fallback) : ''].filter(Boolean).join(' · ')} aria-label={description}>{identity}</Link> : <span className={styles.identity} title={description}>{identity}</span>}</th>
    {columns.map(column => <StatCell key={column.key} row={row} column={column} maxima={maxima} t={t} focusedMetric={focusedMetric} groupStart={column.key === metricStart} />)}
    <td className={styles.rating} title={en ? 'Map rating' : uiText("本图评分", uiLocale)}><SignalRating value={rating} /></td>
  </tr>
}

function CompactPlayers({ rows, participantScores, mvpKeys, columns, locale, t, withSeason, returnState, onPlayerNavigate }) {
  const en = locale === 'en-US'
  const valueLabel = value => value == null || value === '' ? '—' : formatInt(value, '—')
  if (!rows.length) return <p className={styles.compactEmpty}>{en ? 'This team’s player statistics have not been published.' : uiText('本队选手统计尚未发布。', locale)}</p>
  return <ul className={styles.compactPlayers}>
    {rows.map(({ row, impact }) => {
      const role = en ? getRoleEnLabel(row.role) : uiText(getRoleLabel(row.role), locale)
      const metricKey = row.role === 'SUPPORT' ? 'healing' : row.role === 'TANK' ? 'mitigation' : 'damage'
      const metric = columns.find(column => column.key === metricKey)
      const description = [row.displayName, row.battleTag, role, row.hero].filter(Boolean).join(' · ')
      const identity = <><Avatar row={row} /><span><strong>{row.displayName}</strong><small>{[role, row.hero].filter(Boolean).join(' · ')}</small></span></>
      return <li key={row.key} className={`${styles.compactPlayer} ${dataStyles.roleRow}`} data-role={row.role} data-team-best={mvpKeys.has(row.key) || undefined}>
        {row.playerId ? <Link className={styles.compactIdentity} to={withSeason(`/players/${encodeURIComponent(row.playerId)}?role=${encodeURIComponent(row.role)}`)} state={returnState} onClick={onPlayerNavigate} aria-label={description}>{identity}</Link> : <span className={styles.compactIdentity}>{identity}</span>}
        <div className={styles.compactRating}><span>{en ? 'Rating' : uiText('本图评分', locale)}</span><SignalRating value={getReviewMapRating(impact?.entry, participantScores)} /></div>
        <dl className={styles.compactMetrics}>
          <div><dt>{en ? 'E / A / D' : uiText('消灭 / 助攻 / 阵亡', locale)}</dt><dd>{ACTIVITY_KEYS.map(key => valueLabel(row[key])).join(' / ')}</dd></div>
          {metric ? <div><dt>{t(metric.labelKey, metric.fallback)}</dt><dd>{valueLabel(row[metric.key])}</dd></div> : null}
        </dl>
      </li>
    })}
  </ul>
}

export default function SignalMapStats({ map, dossier, teamADisplayRows, teamBDisplayRows, awardIndex, columns, seasonId, locale, t, withSeason, returnState, onPlayerNavigate }) {
  const compact = useCompactMatchLayout()
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const showFullStats = !compact || searchParams.get('mapStats') === 'full'
  const setStatsView = full => setSearchParams(getMatchStatsViewSearch(searchParams, full), { replace: true, state: { ...location.state, restoreScrollY: undefined } })
  const [focusedMetric, setFocusedMetric] = useState('')
  const duelRef = useRef(null)
  const [rowHeights, setRowHeights] = useState({})
  const syncTableScroll = event => {
    const source = event.currentTarget
    duelRef.current?.querySelectorAll('[data-map-table-scroll]').forEach(target => {
      if (target !== source && Math.abs(target.scrollLeft - source.scrollLeft) > 1) target.scrollLeft = source.scrollLeft
    })
  }
  useEffect(() => {
    const duel = duelRef.current
    if (!duel) return undefined
    let frame = 0
    const measure = () => {
      frame = 0
      const heights = {}
      const paired = window.getComputedStyle(duel).gridTemplateColumns.split(' ').length === 2
      if (paired) duel.querySelectorAll('[data-row-slot]').forEach(row => {
        const content = row.querySelector(`.${styles.identity}`)
        const cell = content?.closest('th')
        const cellStyle = cell && window.getComputedStyle(cell)
        const height = content ? Math.ceil(content.getBoundingClientRect().height + parseFloat(cellStyle.paddingTop) + parseFloat(cellStyle.paddingBottom) + parseFloat(cellStyle.borderBottomWidth)) : 72
        heights[row.dataset.rowSlot] = Math.max(72, heights[row.dataset.rowSlot] || 0, height)
      })
      setRowHeights(previous => JSON.stringify(previous) === JSON.stringify(heights) ? previous : heights)
    }
    const schedule = () => { if (!frame) frame = window.requestAnimationFrame(measure) }
    const observer = new ResizeObserver(schedule)
    observer.observe(duel)
    duel.querySelectorAll(`.${styles.identity}`).forEach(node => observer.observe(node))
    schedule()
    return () => { observer.disconnect(); window.cancelAnimationFrame(frame) }
  }, [map.key, teamADisplayRows, teamBDisplayRows, showFullStats])
  const en = locale === 'en-US'
  const allRows = [...teamADisplayRows, ...teamBDisplayRows]
  const maxima = Object.fromEntries(columns.map(column => [column.key, Math.max(0, ...allRows.map(({ row }) => Number(row[column.key]) || 0))]))
  const participantScores = allRows.map(({ impact }) => impact?.rawPts).filter(value => value != null && Number.isFinite(value))
  const activityColumns = columns.filter(column => ACTIVITY_KEYS.includes(column.key))
  const metricColumns = columns.filter(column => !ACTIVITY_KEYS.includes(column.key))
  const orderedColumns = [...activityColumns, ...metricColumns]
  const metricStart = metricColumns[0]?.key
  const focusedColumn = columns.find(column => column.key === focusedMetric)
  const focusedTotals = focusedColumn ? [teamADisplayRows, teamBDisplayRows].map(rows => rows.reduce((sum, { row }) => sum + (Number(row[focusedColumn.key]) || 0), 0)) : null
  const roleOf = entry => entry.row.role || 'UNKNOWN'
  const roles = [...new Set(['TANK', 'DPS', 'SUPPORT', ...allRows.map(roleOf)])].filter(role => allRows.some(entry => roleOf(entry) === role))
  const teamRows = { A: teamADisplayRows, B: teamBDisplayRows }
  const teamMvpKeys = Object.fromEntries(['A', 'B'].map(side => [side, map.hasResult ? getReviewTeamMvpKeys(teamRows[side].map(({ row, impact }) => ({ key: row.key, rating: getReviewMapRating(impact?.entry, participantScores) }))) : new Set()]))
  const roleSlots = Object.fromEntries(roles.map(role => [role, Math.max(...Object.values(teamRows).map(rows => rows.filter(entry => roleOf(entry) === role).length))]))
  const columnCount = orderedColumns.length + 2

  return <div className={styles.shell} data-map-stats="duel" data-focused-metric={focusedMetric}>
    {compact ? <div className={styles.statsView} role="group" aria-label={en ? 'Map statistics view' : uiText('本图数据视图', locale)}><button type="button" aria-pressed={!showFullStats} onClick={() => setStatsView(false)}>{en ? 'Players' : uiText('选手表现', locale)}</button><button type="button" aria-pressed={showFullStats} onClick={() => setStatsView(true)}>{en ? 'Full statistics' : uiText('完整数据', locale)}</button></div> : null}
    <div className={styles.duel} ref={duelRef}>
      {['A', 'B'].map(side => {
        const team = dossier[`team${side}`]
        const displayRows = teamRows[side]
        const totals = Object.fromEntries(columns.map(column => [column.key, displayRows.length ? displayRows.reduce((total, { row }) => total + (Number(row[column.key]) || 0), 0) : null]))
        return <section key={side} className={styles.team} data-stats-side={side} aria-label={`${team.short} ${en ? 'map statistics' : uiText("本图数据", locale)}`}>
          <TeamHeading side={side} map={map} dossier={dossier} seasonId={seasonId} en={en} bestPlayers={displayRows.filter(({ row }) => teamMvpKeys[side].has(row.key))} />
          {!showFullStats ? <CompactPlayers rows={roles.flatMap(role => displayRows.filter(entry => roleOf(entry) === role))} participantScores={participantScores} mvpKeys={teamMvpKeys[side]} columns={columns} locale={locale} t={t} withSeason={withSeason} returnState={returnState} onPlayerNavigate={onPlayerNavigate} /> : <div className={styles.scroller} data-map-table-scroll onScroll={syncTableScroll} tabIndex={0} role="region" aria-label={`${team.short} · ${map.name} ${en ? 'player statistics' : uiText("选手统计", locale)}`}>
            <table className={styles.table}>
              <caption>{team.short} · {map.name} · {en ? 'Complete per-map player statistics' : uiText("完整单图选手统计", locale)}</caption>
              <colgroup><col className={styles.playerColumn} />{activityColumns.map(column => <col key={column.key} className={styles.activityColumn} />)}{metricColumns.map(column => <col key={column.key} className={styles.metricColumn} />)}<col className={styles.ratingColumn} /></colgroup>
              <thead>
                <tr><th scope="col" className={styles.identityCell}>{en ? 'Player / BattleTag' : uiText("选手 / 战网 ID", locale)}</th>{orderedColumns.map(column => <MetricHeading key={column.key} column={column} en={en} t={t} focusedMetric={focusedMetric} onFocusMetric={setFocusedMetric} groupStart={column.key === metricStart} />)}<th scope="col" className={styles.ratingHeading}>{en ? 'Rating' : uiText("评分", locale)}</th></tr>
              </thead>
              <tbody>{roles.flatMap(role => {
                const rows = displayRows.filter(entry => roleOf(entry) === role)
                return Array.from({ length: roleSlots[role] }, (_, index) => rows[index]
                  ? <PlayerRow key={rows[index].row.key} entry={rows[index]} slot={`${role}-${index}`} height={rowHeights[`${role}-${index}`]} mvp={teamMvpKeys[side].has(rows[index].row.key)} awardIndex={awardIndex} columns={orderedColumns} metricStart={metricStart} focusedMetric={focusedMetric} maxima={maxima} participantScores={participantScores} en={en} t={t} withSeason={withSeason} returnState={returnState} onPlayerNavigate={onPlayerNavigate} />
                  : <tr key={`empty-${role}-${index}`} data-row-slot={`${role}-${index}`} style={rowHeights[`${role}-${index}`] ? { height: rowHeights[`${role}-${index}`] } : undefined} className={styles.placeholder} aria-hidden="true"><td colSpan={columnCount}>—</td></tr>
                )
              })}</tbody>
              {!displayRows.length ? <tbody><tr><td className={styles.empty} colSpan={columnCount}>{en ? 'This team’s player statistics have not been published.' : uiText("本队选手统计尚未发布。", locale)}</td></tr></tbody> : null}
              <tfoot><tr className={styles.totals}><th scope="row" className={styles.identityCell}>{en ? 'Team total' : uiText("队伍合计", locale)}</th>{orderedColumns.map(column => <StatCell key={column.key} row={totals} column={column} maxima={maxima} t={t} focusedMetric={focusedMetric} groupStart={column.key === metricStart} total />)}<td className={styles.rating}>—</td></tr></tfoot>
            </table>
          </div>}
        </section>
      })}
    </div>
    {showFullStats && focusedTotals && teamADisplayRows.length > 0 && teamBDisplayRows.length > 0 ? <div className={styles.metricComparison} data-map-metric-comparison role="status"><strong>{t(focusedColumn.labelKey, focusedColumn.fallback)}</strong><span>{dossier.teamA.short}<b>{formatInt(focusedTotals[0])}</b></span><span>{dossier.teamB.short}<b>{formatInt(focusedTotals[1])}</b></span><span className={styles.difference}>{dossier.teamA.short} − {dossier.teamB.short}<b>{focusedTotals[0] > focusedTotals[1] ? '+' : ''}{formatInt(focusedTotals[0] - focusedTotals[1])}</b></span></div> : null}
    <span className={styles.announcement} role="status">{showFullStats && focusedColumn ? `${en ? 'Comparing: ' : uiText("对照：", locale)}${t(focusedColumn.labelKey, focusedColumn.fallback)}` : ''}</span>
  </div>
}
