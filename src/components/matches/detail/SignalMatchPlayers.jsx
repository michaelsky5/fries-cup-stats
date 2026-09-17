import { translateUiText as uiText } from '../../../lib/uiText.js'
import { useUiLocale } from '../../../hooks/useUiLocale.js'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import ImeSafeInput from '../../common/ImeSafeInput.jsx'
import TeamLogo from '../TeamLogo.jsx'
import SignalPlayerComparison from './SignalPlayerComparison.jsx'
import useCompactMatchLayout from './useCompactMatchLayout.js'
import { getRoleEnLabel, getRoleLabel } from '../../../lib/leaderboardSelectors.js'
import { canCompareReviewPlayers, getMatchReviewMvp, getMatchReviewPlayers, getMatchReviewTimeline, getReviewComparisonSelection, REVIEW_METRICS } from '../../../lib/matchReviewSelectors.js'
import { formatInt } from '../../../lib/format.js'
import { SignalBattleTag, SignalHeroList, SignalRating } from './SignalPlayerData.jsx'
import dataStyles from './SignalPlayerData.module.css'
import styles from './SignalMatchPlayers.module.css'

const ROLES = ['TANK', 'DPS', 'SUPPORT']
const ACTIVITY = ['eliminations', 'assists', 'deaths']

function PlayerIdentity({ row, withSeason, returnState, onNavigate, en, showHeroes = true }) {
  const uiLocale = useUiLocale()
  const role = en ? getRoleEnLabel(row.role) : uiText(getRoleLabel(row.role), uiLocale)
  const content = <>
    <strong>{row.displayName}</strong>
    <small className={styles.battleTag} data-battle-tag={row.battleTag || undefined}><SignalBattleTag value={row.battleTag} en={en} /></small>
  </>
  return <div className={styles.identity}>
    <div className={styles.identityHeading}>
      {row.playerId ? <Link className={styles.identityName} to={withSeason(`/players/${encodeURIComponent(row.playerId)}?role=${encodeURIComponent(row.role)}`)} state={returnState} onClick={onNavigate} aria-label={[row.displayName, row.battleTag, role].filter(Boolean).join(' · ')}>{content}</Link> : <span className={styles.identityName} title={role}>{content}</span>}
      <span className={styles.mapCount}>{row.maps.length}<small>{en ? 'maps' : uiText("图", uiLocale)}</small></span>
    </div>
    {showHeroes ? <SignalHeroList row={row} en={en} /> : null}
    {row.lowSample ? <small className={styles.sample}>{en ? 'Low sample' : uiText("低样本", uiLocale)}</small> : null}
  </div>
}

function TimelineCell({ row, map, onSelectMap, en }) {
  const uiLocale = useUiLocale()
  const entry = map.playersByKey.get(row.key)
  const mvp = map.teamMvpKeys[row.side].has(row.key)
  const missing = map.hasStats ? (en ? 'No appearance in this role' : uiText('该职责未出场', uiLocale)) : map.raw?.is_administrative === true ? (en ? 'Map ruling; no player statistics' : uiText('裁决图无选手统计', uiLocale)) : (en ? 'Statistics not published' : uiText('统计未发布', uiLocale))
  return <td className={styles.mapCell} data-map-column={map.order}>
    {entry ? <button type="button" className={styles.mapAppearance} onClick={() => onSelectMap(map.order)} aria-label={`${row.displayName} · ${map.name} · ${entry.heroes.join(' / ')} · ${en ? 'Map rating ' : uiText('本图评分 ', uiLocale)}${entry.rating == null ? '—' : entry.rating.toFixed(1)}${mvp ? (en ? ' · Team MVP' : uiText(' · 队内 MVP', uiLocale)) : ''}`}>
      <SignalHeroList row={entry} en={en} showMaps={false} />
      <SignalRating value={entry.rating} mvp={mvp} en={en} />
    </button> : <span className={styles.noAppearance} title={missing} aria-label={missing}>—</span>}
  </td>
}

export default function SignalMatchPlayers({ dossier, seasonId, locale, withSeason, returnState, onNavigate, onSelectMap, searchInputRef }) {
  const en = locale === 'en-US'
  const compact = useCompactMatchLayout()
  const [params, setParams] = useSearchParams()
  const latestParams = useRef(params)
  useEffect(() => { latestParams.current = params }, [params])
  const location = useLocation()
  const comparisonRef = useRef(null)
  const playerViewRef = useRef(null)
  const [editingPair, setEditingPair] = useState(false)
  const query = params.get('pquery') || ''
  const role = ROLES.includes(params.get('prole')) ? params.get('prole') : ''
  const side = ['A', 'B'].includes(params.get('pside')) ? params.get('pside') : ''
  const view = ['maps', 'summary', 'compare'].includes(params.get('pview')) ? params.get('pview') : (params.get('compareA') || params.get('compareB') ? 'compare' : compact ? 'summary' : 'maps')
  const rows = useMemo(() => getMatchReviewPlayers(dossier), [dossier])
  const matchMvp = useMemo(() => getMatchReviewMvp(dossier, rows), [dossier, rows])
  const timeline = useMemo(() => getMatchReviewTimeline(dossier), [dossier])
  const a = rows.find(row => row.side === 'A' && row.key === params.get('compareA'))
  const candidateB = rows.find(row => row.side === 'B' && row.key === params.get('compareB'))
  const b = a && candidateB && !canCompareReviewPlayers(a, candidateB) ? undefined : candidateB
  const first = a || b
  const opponents = first && !(a && b) ? rows.filter(row => canCompareReviewPlayers(first, row)) : []
  const normalizedQuery = query.trim().toLowerCase()
  const visible = rows.filter(row => (!role || row.role === role) && (!side || row.side === side) && (!normalizedQuery || [row.displayName, row.rawName, row.battleTag].some(value => String(value || '').toLowerCase().includes(normalizedQuery))))
  const roles = [...new Set([...ROLES, ...visible.map(row => row.role)])]
  const slots = roles.flatMap(item => Array.from({ length: Math.max(...['A', 'B'].map(teamSide => visible.filter(row => row.side === teamSide && row.role === item).length)) }, (_, index) => ({ role: item, index })))
  const update = values => {
    const next = new URLSearchParams(latestParams.current)
    Object.entries(values).forEach(([key, value]) => value ? next.set(key, value) : next.delete(key))
    next.set('analysis', '1')
    latestParams.current = next
    setParams(next, { replace: true, state: { ...location.state, restoreScrollY: undefined } })
  }
  const clearComparison = () => { update({ compareA: '', compareB: '' }); setEditingPair(false) }
  const toggleComparison = (row, selected) => {
    const otherSide = row.side === 'A' ? 'B' : 'A'
    update(selected ? { [`compare${row.side}`]: '' } : { ...getReviewComparisonSelection(rows, row, latestParams.current.get(`compare${otherSide}`)), pview: 'compare' })
    setEditingPair(false)
    if (!selected) {
      window.requestAnimationFrame(() => playerViewRef.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }))
    }
  }
  const choosePlayer = (teamSide, key) => {
    const next = rows.find(row => row.key === key)
    const otherSide = teamSide === 'A' ? 'B' : 'A'
    update({ ...(next ? getReviewComparisonSelection(rows, next, latestParams.current.get(`compare${otherSide}`)) : { [`compare${teamSide}`]: '' }), pview: 'compare' })
  }
  const compareControl = row => {
    const selected = row.key === a?.key || row.key === b?.key
    const disabled = !ROLES.includes(row.role)
    return <button className={styles.compareButton} type="button" aria-pressed={selected} disabled={disabled} title={disabled ? (en ? 'Choose the same role on the opposing team' : uiText("请选择对方队伍的同职责选手", locale)) : undefined} aria-label={`${en ? 'Compare' : uiText("比较", locale)} ${row.displayName} · ${en ? getRoleEnLabel(row.role) : uiText(getRoleLabel(row.role), locale)}`} onClick={() => toggleComparison(row, selected)}><span className={styles.compareGlyph} aria-hidden="true">{selected ? '✓' : '↔'}</span><span className={styles.compareLabel} aria-hidden="true">{selected ? (en ? 'Set' : uiText("已选", locale)) : (en ? 'VS' : uiText("对比", locale))}</span></button>
  }
  const identityProps = { withSeason, returnState, onNavigate, en }
  const identities = new Set(visible.map(row => row.identityKey)).size
  const filtered = Boolean(query || role || side)
  if (!rows.length) return <p className={styles.empty}>{en ? 'Player statistics have not been published.' : uiText("选手统计尚未发布。", locale)}</p>

  return <div ref={playerViewRef} className={styles.shell} data-match-players data-player-view={view}>
    <div className={styles.viewBar}>
      <div className={styles.viewSwitch} role="group" aria-label={en ? 'Player statistics view' : uiText("选手数据视图", locale)}>{[['maps', en ? 'Map performance' : uiText("逐图表现", locale)], ['summary', en ? 'Match totals' : uiText("全场汇总", locale)], ['compare', en ? 'Head to head' : uiText("对位比较", locale)]].map(([key, label]) => <button key={key} type="button" aria-pressed={view === key} onClick={() => update({ pview: key })}>{label}</button>)}</div>
      <span className={styles.resultMeta}>{view === 'compare' ? `${en ? 'Same role' : uiText("同职责对位", locale)}` : `${identities} ${en ? 'players' : uiText("位出场选手", locale)}`}</span>
    </div>
    {view === 'compare' ? <div className={styles.compareView}>
      <div className={styles.pairPicker} id="comparison-player-picker" hidden={Boolean(a && b && !editingPair)}>{['A', 'B'].map(teamSide => <label key={teamSide} className={styles.pairSide}>
        <span><TeamLogo team={dossier.match[`team_${teamSide.toLowerCase()}`]} seasonId={seasonId} teamShortName={dossier[`team${teamSide}`].short} className={styles.pickerLogo} /><strong>{dossier[`team${teamSide}`].short}</strong></span>
        <select aria-label={`${dossier[`team${teamSide}`].short} ${en ? 'comparison player' : uiText("对位选手", locale)}`} value={(teamSide === 'A' ? a : b)?.key || ''} onChange={event => choosePlayer(teamSide, event.target.value)}>
          <option value="">{en ? 'Select player' : uiText("选择选手", locale)}</option>{ROLES.map(item => <optgroup key={item} label={en ? getRoleEnLabel(item) : uiText(getRoleLabel(item), locale)}>{rows.filter(row => row.side === teamSide && row.role === item).map(row => <option key={row.key} value={row.key}>{row.displayName} · {row.battleTag || (en ? getRoleEnLabel(row.role) : uiText(getRoleLabel(row.role), locale))}</option>)}</optgroup>)}
        </select>
      </label>)}</div>
      {a && b ? <SignalPlayerComparison key={`${a.key}:${b.key}`} a={a} b={b} timeline={timeline} dossier={dossier} en={en} onClear={clearComparison} onFindOpponent={clearComparison} panelRef={comparisonRef} editingPlayers={editingPair} onEditPlayers={() => setEditingPair(value => !value)} /> : <div className={styles.compareEmpty}><strong>{first ? `${first.displayName} · ${en ? 'Choose opponent' : uiText("选择对位选手", locale)}` : (en ? 'Choose a player from each team' : uiText("选择双方选手", locale))}</strong><span>{first ? (en ? `${dossier[`team${first.side === 'A' ? 'B' : 'A'}`].short} · ${getRoleEnLabel(first.role)}` : `${dossier[`team${first.side === 'A' ? 'B' : 'A'}`].short} · ${uiText(getRoleLabel(first.role), locale)}`) : (en ? 'Compare the same role across shared maps' : uiText("按同职责、共同出场地图对比", locale))}</span>
        {opponents.length ? <div className={styles.opponentChoices}>{opponents.map(player => <button key={player.key} type="button" onClick={() => choosePlayer(player.side, player.key)} aria-label={`${en ? 'Compare with' : uiText("对比", locale)} ${player.displayName}`}><SignalHeroList row={player} en={en} /><span><strong>{player.displayName}</strong><small><SignalBattleTag value={player.battleTag} en={en} /></small></span><span aria-hidden="true">↔</span></button>)}</div> : first ? <span>{en ? 'No opposing player is recorded in this role.' : uiText("对方没有该职责的出场记录。", locale)}</span> : null}
        {first ? <button type="button" onClick={clearComparison}>{en ? 'Clear selection' : uiText("清除选择", locale)}</button> : null}</div>}
    </div> : <>
    <div className={styles.filters}>
      <ImeSafeInput ref={searchInputRef} type="search" value={query} onValueChange={value => update({ pquery: value })} placeholder={en ? 'Player / BattleTag' : uiText("选手 / 战网 ID", locale)} aria-label={en ? 'Find player' : uiText("查找选手", locale)} />
      <div className={styles.roleFilters} role="group" aria-label={en ? 'Player role' : uiText("选手职责", locale)}>{['', ...ROLES].map(item => <button key={item} type="button" aria-pressed={role === item} onClick={() => update({ prole: item, compareA: '', compareB: '' })}>{item ? (en ? getRoleEnLabel(item) : uiText(getRoleLabel(item), locale)) : (en ? 'All roles' : uiText("全部职责", locale))}</button>)}</div>
      <select aria-label={en ? 'Player team' : uiText("选手队伍", locale)} value={side} onChange={event => update({ pside: event.target.value })}><option value="">{en ? 'Both teams' : uiText("双方队伍", locale)}</option><option value="A">{dossier.teamA.short}</option><option value="B">{dossier.teamB.short}</option></select>
      {filtered ? <button className={styles.resetFilters} type="button" onClick={() => update({ pquery: '', prole: '', pside: '' })}>{en ? 'Reset' : uiText("重置", locale)}</button> : null}
    </div>
    {!visible.length ? <div className={styles.empty}><p>{en ? 'No players match these filters.' : uiText("没有符合当前筛选的选手。", locale)}</p><button type="button" onClick={() => update({ pquery: '', prole: '', pside: '' })}>{en ? 'Clear filters' : uiText("清除筛选", locale)}</button></div> : <div className={styles.duel} data-single-team={Boolean(side)}>{['A', 'B'].map(teamSide => {
      const team = dossier[`team${teamSide}`]
      const teamRows = visible.filter(row => row.side === teamSide)
      if (!teamRows.length) return null
      const totals = Object.fromEntries(REVIEW_METRICS.map(metric => [metric.key, teamRows.reduce((sum, row) => sum + row[metric.key], 0)]))
      const columnCount = view === 'maps' ? timeline.length + 2 : REVIEW_METRICS.length + 3
      return <section key={teamSide} className={styles.team} data-side={teamSide}>
        <header className={styles.teamHeading} data-winner={dossier.winnerSide === teamSide}>
          <TeamLogo team={dossier.match[`team_${teamSide.toLowerCase()}`]} seasonId={seasonId} teamShortName={team.short} teamName={team.full} className={styles.teamLogo} />
          <h3>{team.short}<small>{team.full}</small></h3>
          <span>{new Set(teamRows.map(row => row.identityKey)).size} {en ? 'players' : uiText("位选手", locale)}</span>
        </header>
        <div className={styles.tableScroll} tabIndex={0} role="region" aria-label={`${team.short} · ${view === 'maps' ? (en ? 'Map performance' : uiText("逐图表现", locale)) : (en ? 'Match totals' : uiText("全场汇总", locale))}`}>
          <table className={view === 'maps' ? styles.timelineTable : styles.summaryTable} style={view === 'maps' ? { '--map-count': timeline.length } : undefined}>
            <caption>{team.short} · {view === 'maps' ? (en ? 'Heroes and ratings by map' : uiText("逐图英雄与评分", locale)) : (en ? 'Full-match player statistics' : uiText("全场选手统计", locale))}</caption>
            <colgroup><col className={styles.playerColumn} />{view === 'maps' ? timeline.map(map => <col key={map.key} />) : <>{REVIEW_METRICS.map(metric => <col key={metric.key} className={ACTIVITY.includes(metric.key) ? styles.activityColumn : undefined} />)}<col className={styles.ratingColumn} /></>}<col className={styles.compareColumn} /></colgroup>
            <thead><tr><th scope="col" className={styles.identityCell}>{en ? 'Player / BattleTag' : uiText("选手 / 战网 ID", locale)}</th>
              {view === 'maps' ? timeline.map(map => <th key={map.key} scope="col" className={styles.mapHeading}><button type="button" onClick={() => onSelectMap(map.order)} aria-label={`${en ? 'View map' : uiText("查看地图", locale)} ${map.order} · ${map.name}`}><span>{String(map.order).padStart(2, '0')}</span><strong>{map.name}</strong></button></th>) : <>{REVIEW_METRICS.map(metric => <th key={metric.key} scope="col" className={ACTIVITY.includes(metric.key) ? styles.activity : undefined}>{en ? metric.en : uiText(metric.zh, locale)}</th>)}<th scope="col" className={styles.ratingCell}>{en ? 'Rating' : uiText("全场评分", locale)}</th></>}
              <th scope="col" className={styles.compareCell}>{en ? 'VS' : uiText("对位", locale)}</th>
            </tr></thead>
            <tbody>{slots.map(slot => {
              const row = teamRows.filter(item => item.role === slot.role)[slot.index]
              if (!row) return <tr key={`${slot.role}-${slot.index}`} className={styles.placeholder} aria-hidden="true"><td colSpan={columnCount}>—</td></tr>
              return <tr key={row.key} className={`${styles.playerRow} ${dataStyles.roleRow}`} data-role={row.role} data-match-best={row.key === matchMvp?.key || undefined} data-selected={row.key === a?.key || row.key === b?.key} data-player-record data-player-key={row.key}>
                <th scope="row" className={styles.identityCell}><PlayerIdentity row={row} {...identityProps} showHeroes={view === 'summary'} /></th>
                {view === 'maps' ? timeline.map(map => <TimelineCell key={map.key} row={row} map={map} en={en} onSelectMap={onSelectMap} />) : <>{REVIEW_METRICS.map(metric => <td key={metric.key} data-metric={metric.key} className={ACTIVITY.includes(metric.key) ? styles.activity : undefined}><span className={styles.mobileLabel} aria-hidden="true">{en ? metric.en : uiText(metric.zh, locale)}</span><span data-stat={metric.key}>{formatInt(row[metric.key], '—')}</span></td>)}<td className={styles.ratingCell}><span className={styles.mobileLabel} aria-hidden="true">{en ? 'Rating' : uiText("评分", locale)}</span><SignalRating value={row.rating} /></td></>}
                <td className={styles.compareCell}>{compareControl(row)}</td>
              </tr>
            })}</tbody>
            {view === 'summary' ? <tfoot><tr className={styles.totals}><th scope="row" className={styles.identityCell}>{query || role ? (en ? 'Filtered total' : uiText("筛选合计", locale)) : (en ? 'Team total' : uiText("队伍合计", locale))}</th>{REVIEW_METRICS.map(metric => <td key={metric.key} data-metric={metric.key} className={ACTIVITY.includes(metric.key) ? styles.activity : undefined}><span className={styles.mobileLabel} aria-hidden="true">{en ? metric.en : uiText(metric.zh, locale)}</span><span data-stat={metric.key}>{formatInt(totals[metric.key], '—')}</span></td>)}<td className={styles.ratingCell}>—</td><td className={styles.compareCell} /></tr></tfoot> : null}
          </table>
        </div>
      </section>
    })}</div>}
    </>}
    <details className={styles.explanation}><summary>{en ? 'About ratings' : uiText("评分说明", locale)}</summary><p>{en ? 'Match and map ratings use the same scale. Full-match performance is weighted by playtime within each role, then converted to a rating. Map win bonuses do not carry into multi-map match ratings. Match MVP uses unrounded performance scores and requires sufficient map appearances. Players who change roles have separate rows.' : uiText("全场与单图评分使用同一刻度。全场先按职责和出场时间汇总表现，再换算评分；单图胜方加分不计入多图全场评分。全场 MVP 按未取整的表现分评选，并设有出场图数门槛；更换职责的选手分别列出。", locale)}</p><p>{en ? 'An underline in the map view marks the highest rating on that team and map, including ties. A dash means a rating is unavailable.' : uiText("逐图表现中，评分下的短线标记本队本图最佳，同分并列。“—”表示暂无评分。", locale)}</p></details>
  </div>
}
