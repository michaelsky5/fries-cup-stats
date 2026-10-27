import { pickUiLocale, translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { Link } from 'react-router-dom'
import TeamLogo from '../../components/matches/TeamLogo.jsx'
import { formatDossierRecord } from './teamDossierPresentation.js'
import { TEAM_MATCHES_ANCHOR } from './teamArchiveRoutes.js'
import styles from './SignalTeamDossier.module.css'

const percent = value => value === null ? '—' : `${Math.round(value * 100)}%`

function MatchRow({ row, withSeason, returnState, onLeave, en, seasonId }) {
  const uiLocale = useUiLocale()
  return <Link className={styles.matchRow} to={withSeason(`/matches/${encodeURIComponent(row.match.match_id)}`)} state={returnState} onClick={onLeave}>
    <time className={styles.matchDate}>{row.timeLabel.split(' ')[0]}<small>{row.timeLabel.split(' ').slice(1).join(' ')}</small></time>
    <span className={styles.matchOpponent}><TeamLogo team={row.opponent} seasonId={seasonId} className={styles.opponentLogo} /><span><b><small>{en ? 'vs' : uiText("对阵", uiLocale)} </small>{row.opponentLabel}</b><small>{row.roundLabel}{row.note ? ` · ${row.note}` : ''}</small></span></span>
    <strong className={styles.matchScore}>{row.scoreLabel}</strong>
    <span className={styles.result} data-tone={row.tone}>{row.label}</span>
    <span className={styles.rowArrow} aria-hidden="true">→</span>
  </Link>
}

function WinRateTrace({ rows, en }) {
  const uiLocale = useUiLocale()
  const decided = rows.filter(row => row.decided)
  if (!decided.length) return null
  let wins = 0
  const rates = []
  for (const row of decided) {
    if (row.tone === 'win') wins += 1
    rates.push(wins / (rates.length + 1))
  }
  const points = rates.map((rate, index) => `${12 + index / Math.max(1, rates.length - 1) * 264},${102 - rate * 88}`)
  const endY = 102 - rates.at(-1) * 88
  return <div className={styles.winTrace}>
    <span className={styles.eyebrow}>{en ? 'THE SEASON IN MOTION' : uiText("赛季轨迹", uiLocale)}</span>
    <h3>{en ? 'Cumulative win rate' : uiText("累计比赛胜率", uiLocale)}</h3>
    <svg viewBox="0 0 288 116" role="img" aria-label={en ? `Win rate after each decided series: ${rates.map(percent).join(', ')}` : uiText("每场有赛果的比赛之后，累计胜率依次为 {0}", uiLocale, [rates.map(percent).join('、')])}>
      <path d="M12 14H276M12 58H276M12 102H276" className={styles.traceGuides} />
      <polyline points={points.join(' ')} className={styles.traceLine} />
      {rates.map((rate, index) => <circle key={decided[index].match.match_id} cx={12 + index / Math.max(1, rates.length - 1) * 264} cy={102 - rate * 88} r="2.5" className={styles.traceDot} />)}
      <circle cx={rates.length > 1 ? 276 : 12} cy={endY} r="4" className={styles.traceEnd} />
    </svg>
    <div><span>{en ? 'First series' : uiText("首场", uiLocale)} / {decided[0].timeLabel.split(' ')[0]}</span><b>{percent(rates.at(-1))}</b></div>
    <p>{en ? 'One point per decided series, in schedule order. Includes administrative results.' : uiText("每个点对应一场已发布赛果，按赛程先后排列，包含判罚结果。", uiLocale)}</p>
  </div>
}

// 票 2.42: the 数据 page's "赛程赛果" — every published fixture, filterable by stage and result.
// (Formerly the 赛季征程 page's "全部比赛记录".)
export default function TeamMatchLedger({ team, seasonId, locale, rows, stages, params, updateQuery, onShowAll, withSeason, returnState, onLeave }) {
  const en = locale === 'en-US'
  const t = (zh, english, ko, tw) => pickUiLocale(locale, zh, english, ko, tw)
  const requestedStage = params.get('teamStage') || 'all'
  const selectedStage = stages.some(stage => stage.key === requestedStage) ? requestedStage : 'all'
  const requestedResult = params.get('result') || 'all'
  const selectedResult = ['all', 'win', 'loss', 'pending'].includes(requestedResult) ? requestedResult : 'all'
  const oldestFirst = params.get('teamOrder') === 'oldest'
  const matchingRows = rows.filter(row => (selectedStage === 'all' || row.match.stage === selectedStage) && (selectedResult === 'all' || (selectedResult === 'pending' ? ['pending', 'live'].includes(row.tone) : row.tone === selectedResult)))
  const orderedRows = oldestFirst ? matchingRows : [...matchingRows].reverse()
  const visibleRows = params.get('journey') === 'all' ? orderedRows : orderedRows.slice(0, 8)
  const focus = rows.find(row => row.live) || rows.find(row => row.tone === 'pending')
  return <section id={TEAM_MATCHES_ANCHOR} className={styles.ledgerSection} tabIndex={-1} aria-labelledby="team-matches-title" data-dossier-chapter="matches">
    <header className={styles.sectionHeading}>
      <h2 id="team-matches-title">{t('赛程赛果', 'Schedule and results', '일정과 결과', '賽程賽果')}</h2>
      <p>{t(`${rows.length} 条赛程记录，含轮空与判罚`, `${rows.length} schedule entries, including byes and rulings`, `일정 기록 ${rows.length}건 · 부전승과 판정 포함`, `${rows.length} 條賽程記錄，含輪空與判罰`)}</p>
    </header>
    <div className={styles.journeyGrid}>
      <aside className={styles.journeyAside}>
        <div className={styles.stageRail}>{stages.map((stage, index) => <button type="button" key={stage.key} aria-pressed={selectedStage === stage.key} onClick={() => updateQuery({ teamStage: selectedStage === stage.key ? 'all' : stage.key, journey: null })}><span className={styles.stageIndex}>0{index + 1}</span><span><b>{stage.label}</b><small>{stage.summary.completed ? formatDossierRecord(stage.summary, locale) : en ? 'Awaiting results' : uiText("等待赛果", locale)}{stage.summary.byes ? ` · ${stage.summary.byes} ${en ? 'bye' : uiText("轮空", locale)}` : ''}</small></span><span aria-hidden="true">→</span></button>)}</div>
        {focus ? <Link className={styles.focusMatch} to={withSeason(`/matches/${encodeURIComponent(focus.match.match_id)}`)} state={returnState} onClick={onLeave}><span className={styles.eyebrow}>{focus.live ? (en ? 'LIVE NOW' : uiText("正在进行", locale)) : (en ? 'NEXT MATCH' : uiText("下一场比赛", locale))}</span><p>{focus.roundLabel}</p><div><TeamLogo team={focus.opponent} seasonId={seasonId} className={styles.focusLogo} /><b>{en ? 'vs' : uiText("对阵", locale)} {focus.opponentLabel}</b></div><strong>{focus.scoreLabel}</strong><footer><span>{focus.timeLabel}</span><span aria-hidden="true">→</span></footer></Link> : null}
        <WinRateTrace rows={rows} en={en} />
      </aside>
      <div className={styles.journeyLedger}>
        <div className={styles.matchControls}><div role="group" aria-label={en ? 'Filter results' : uiText("筛选赛果", locale)}>{[['all', '全部', 'All'], ['win', '胜场', 'Wins'], ['loss', '负场', 'Losses'], ['pending', '待赛', 'Upcoming']].map(([id, zh, english]) => <button type="button" key={id} aria-pressed={selectedResult === id} onClick={() => updateQuery({ result: id, journey: null })}>{en ? english : uiText(zh, locale)}</button>)}</div><select aria-label={en ? 'Match order' : uiText("比赛排序", locale)} value={oldestFirst ? 'oldest' : 'newest'} onChange={event => updateQuery({ teamOrder: event.target.value === 'oldest' ? 'oldest' : null })}><option value="newest">{en ? 'Newest first' : uiText("最新比赛在前", locale)}</option><option value="oldest">{en ? 'Oldest first' : uiText("从赛季起点看", locale)}</option></select></div>
        {selectedStage !== 'all' ? <div className={styles.activeFilter}><span>{stages.find(stage => stage.key === selectedStage)?.label} · {matchingRows.length} {en ? 'records' : uiText("条记录", locale)}</span><button type="button" onClick={() => updateQuery({ teamStage: null, journey: null })}>{en ? 'All stages ×' : uiText("查看全部阶段 ×", locale)}</button></div> : null}
        <div className={styles.matchList}>{visibleRows.map(row => <MatchRow key={row.match.match_id} row={row} seasonId={seasonId} withSeason={withSeason} returnState={returnState} onLeave={onLeave} en={en} />)}</div>
        {!matchingRows.length ? <div className={styles.empty}><p>{en ? 'No matches match this selection.' : uiText("这个条件下暂无比赛。", locale)}</p>{selectedStage !== 'all' || selectedResult !== 'all' ? <button type="button" onClick={() => updateQuery({ teamStage: null, result: null })}>{en ? 'Clear filters' : uiText("清除筛选", locale)}</button> : null}</div> : null}
        {visibleRows.length < matchingRows.length ? <button className={styles.showAll} type="button" onClick={onShowAll}>{en ? `Show all ${matchingRows.length} records` : uiText("展开全部 {0} 条记录", locale, [matchingRows.length])} ↓</button> : null}
        <div className={styles.ledgerFoot}><span>{visibleRows.length} / {matchingRows.length}</span><Link to={withSeason(`/matches?view=list&tab=all&team=${encodeURIComponent(team.shortName)}&teamId=${encodeURIComponent(team.routeId)}`)} state={returnState} onClick={onLeave}>{en ? 'Open match index' : uiText("前往赛程索引", locale)} →</Link></div>
      </div>
    </div>
  </section>
}
