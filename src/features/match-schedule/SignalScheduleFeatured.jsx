import { translateUiText as uiText } from '../../lib/uiText.js'
import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useOutletContext } from 'react-router-dom'
import TeamLogo from '../../components/matches/TeamLogo.jsx'
import { getMatchDisplayTeams, getMatchScore } from '../../lib/matchesSelectors.js'
import { getMatchFormatLabel } from '../../lib/matchFormat.js'
import { getMatchArchiveStages } from '../../lib/matchArchiveStages.js'
import { getReturnState, saveReturnScroll } from '../../lib/navigationState.js'
import ScheduleNav from './ScheduleNav.jsx'
import ScheduleTeamSearch from './ScheduleTeamSearch.jsx'
import { getScheduleHighlights } from './scheduleHighlights.js'
import { getScheduleMapRecords, getScheduleRoundLabel, getScheduleStageLabel, getScheduleStatusLabel, getScheduleTimeLabel } from './schedulePresentation.js'
import styles from './Schedule.module.css'

function MatchCard({ item, variant }) {
  const { withSeason, seasonId, locale = 'zh-CN' } = useOutletContext()
  const location = useLocation()
  const en = locale === 'en-US'
  const { match, fact } = item
  const primary = variant === 'primary'
  const compact = variant === 'compact'
  const teams = getMatchDisplayTeams(match)
  const maps = primary ? getScheduleMapRecords(match, locale) : []
  const round = getScheduleRoundLabel(match, locale)
  const stage = getScheduleStageLabel(match.stage, locale)
  const stageRound = round.toLowerCase().startsWith(stage.toLowerCase()) ? round : stage + ' · ' + round
  const winner = fact.winnerSide ? teams['team' + fact.winnerSide].short : ''
  const detailHint = primary && maps.length
    ? en ? 'Map results and match records' : uiText("单图赛果与比赛记录", locale)
    : fact.progress.length ? en ? 'Follow the map-by-map results' : uiText("逐图查看比赛经过", locale)
      : en ? 'Published match record' : uiText("已发布比赛记录", locale)
  const duel = <div className={styles.duel}>
    <div className={styles.team} data-side="A" data-winner={fact.winnerSide === 'A' || undefined}><span className={styles.logoWell}><TeamLogo team={match.team_a} seasonId={seasonId} className={styles.logo} /></span><strong>{teams.teamA.short}</strong>{primary ? <small>{teams.teamA.full}</small> : null}</div>
    <div className={styles.score}><strong>{getMatchScore(match)}</strong>{!compact ? <span>{getMatchFormatLabel(match)} · {winner && fact.kind !== 'awarded' ? winner + (en ? ' wins' : uiText(" 获胜", locale)) : getScheduleStatusLabel(match, locale)}</span> : null}</div>
    <div className={styles.team} data-side="B" data-winner={fact.winnerSide === 'B' || undefined}><span className={styles.logoWell}><TeamLogo team={match.team_b} seasonId={seasonId} className={styles.logo} /></span><strong>{teams.teamB.short}</strong>{primary ? <small>{teams.teamB.full}</small> : null}</div>
  </div>
  return <Link className={primary ? styles.spotlight : compact ? styles.compactRecord : styles.featureCard} data-featured-match={match.match_id} data-primary={primary || undefined} data-feature-kind={fact.kind} data-stage={match.stage} to={withSeason('/matches/' + encodeURIComponent(match.match_id))} state={getReturnState(location)} onClick={() => saveReturnScroll(location)} aria-label={(en ? 'Open match ' : uiText("查看比赛 ", locale)) + teams.teamA.short + ' vs ' + teams.teamB.short + ' · ' + round}>
    {compact ? <>
      <span className={styles.recordMeta}><strong>{round}</strong><time>{getScheduleTimeLabel(match, locale)}</time></span>
      {duel}
      <span className={styles.recordReason}>{fact.kind === 'result' ? getMatchFormatLabel(match) + ' · ' + getScheduleStatusLabel(match, locale) : fact.label}</span><i className={styles.recordArrow} aria-hidden="true">↗</i>
    </> : <>
      <header><span>{primary ? round : stageRound}</span><time>{getScheduleTimeLabel(match, locale)}</time></header>
      {!primary ? <h3>{fact.label}</h3> : null}
      {duel}
      {maps.length ? <ol className={styles.maps} aria-label={en ? 'Published map results' : uiText("已发布单图赛果", locale)}>{maps.map(map => <li key={map.key}><span><i aria-hidden="true">{String(map.order).padStart(2, '0')}</i>{map.name}</span><b>{map.hasScore ? map.score : en ? 'Result TBD' : uiText("赛果待定", locale)}</b></li>)}</ol> : null}
      {!primary ? <p className={styles.featureReason}>{fact.detail}</p> : null}
      <footer><span>{detailHint}</span><b>{en ? 'View match' : uiText("查看比赛", locale)} <i aria-hidden="true">↗</i></b></footer>
    </>}
  </Link>
}

export default function SignalScheduleFeatured({ hub }) {
  const { db, withSeason, locale = 'zh-CN' } = useOutletContext()
  const navigate = useNavigate()
  const en = locale === 'en-US'
  const [query, setQuery] = useState('')
  const stages = getMatchArchiveStages(hub.matches)
  const highlights = useMemo(() => getScheduleHighlights(hub.matches, hub.keyArchiveMatches, { ...db?.meta, ...db?.season }, locale), [hub.matches, hub.keyArchiveMatches, db, locale])
  const search = (value, teamId) => {
    const params = new URLSearchParams({ view: 'list' })
    if (value.trim()) params.set('team', value.trim())
    if (teamId) params.set('teamId', teamId)
    navigate(withSeason('/matches?' + params), { state: { restoreScrollY: 0 } })
  }
  return <div className={styles.shell} data-schedule-featured data-i18n-ignore>
    <ScheduleNav active="featured" />
    <header className={styles.heading}>
      <div><span className={styles.kicker}>{en ? 'THIS SEASON, MATCH BY MATCH' : uiText("本届赛程赛果", locale)}</span><h1>{en ? 'Every match. Still here.' : <>{uiText("每一场，", locale)}<span>{uiText("都在这里。", locale)}</span></>}</h1></div>
      <div className={styles.headingAside}><p><b>{hub.summary.total}</b> {en ? 'published matches' : uiText("场已发布比赛", locale)}<span> · {en ? 'Find a team. Explore a stage.' : uiText("按队伍查找，按阶段回看。", locale)}</span></p></div>
    </header>
    <div className={styles.lead}>
      {highlights.primary ? <MatchCard item={highlights.primary} variant="primary" /> : <div className={styles.noFeatured}><h2>{en ? 'Match records are on their way.' : uiText("比赛记录，等待更新。", locale)}</h2><p>{en ? 'Use the schedule to view published fixtures.' : uiText("进入完整赛程，查看已发布的对阵。", locale)}</p></div>}
      <section className={styles.finder} aria-label={en ? 'Find a match' : uiText("查找比赛", locale)}>
        <div className={styles.finderSearch}><h2>{en ? 'Find your match.' : uiText("找到你想看的比赛。", locale)}</h2><ScheduleTeamSearch matches={hub.matches} value={query} onValueChange={setQuery} onSearch={value => search(value)} onSelectTeam={team => search(team.short, team.id)} /></div>
        <div className={styles.stageLinks}><h3>{en ? 'Browse by stage' : uiText("按阶段回看", locale)}</h3>{stages.map(stage => <Link key={stage.value} to={withSeason('/matches?view=list&stage=' + encodeURIComponent(stage.value))} state={{ restoreScrollY: 0 }}><span>{getScheduleStageLabel(stage.value, locale)}</span><b>{stage.count}<small>{en ? ' matches' : uiText(" 场", locale)}</small></b><i aria-hidden="true">↗</i></Link>)}</div>
        <Link className={styles.allMatches} to={withSeason('/matches?view=list')} state={{ restoreScrollY: 0 }}>{en ? 'View full schedule' : uiText("查看完整赛程", locale)} <span aria-hidden="true">↗</span></Link>
      </section>
    </div>
    {highlights.focus.length ? <section className={styles.more}>
      <header><div><span className={styles.kicker}>{en ? 'MOMENTS FROM THE SEASON' : uiText("值得回看的对阵", locale)}</span><h2>{en ? 'More of the season.' : uiText("沿着赛季，继续回看。", locale)}</h2></div><p>{en ? 'Follow the story through the published map results.' : uiText("从逐图赛果，看见比赛的经过。", locale)}</p></header>
      <div className={styles.focusCards}>{highlights.focus.map(item => <MatchCard key={item.match.match_id} item={item} variant="focus" />)}</div>
    </section> : null}
    {highlights.records.length ? <section className={styles.otherRecords}>
      <header><h2>{en ? 'More matches to revisit' : uiText("还有这些比赛", locale)}</h2><Link to={withSeason('/matches?view=list')} state={{ restoreScrollY: 0 }}>{en ? 'Full schedule' : uiText("完整赛程", locale)} ↗</Link></header>
      <div className={styles.records}>{highlights.records.map(item => <MatchCard key={item.match.match_id} item={item} variant="compact" />)}</div>
    </section> : null}
    <p className={styles.sourceNote}>{en ? 'Match notes follow published results. The full schedule also retains forfeits and awarded results, excluding byes.' : uiText("比赛看点依据已发布赛果整理。完整赛程保留弃权与判罚结果，不包含轮空记录。", locale)}</p>
  </div>
}
