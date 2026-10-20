import { useId } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import TeamLogo from '../../components/matches/TeamLogo.jsx'
import AdvanceTeamPicker from '../../components/advance/AdvanceTeamPicker.jsx'
import { weeklyStatusLabel, weeklyTeamShort } from '../weekly-overview/weeklyPresentation.js'
import { buildWeeklyRouteModel } from './weeklyRouteModel.js'
import { routeScheduleNotice, routeSourceLabel, routeText as text, routeTime, routeTitle } from './weeklyRoutePresentation.js'
import signal from '../../components/advance/AdvanceSignal.module.css'
import styles from './WeeklyPlayoffBracket.module.css'

const idOf = team => String(team?.id || team?.team_id || '')
const fullName = team => team?.name || team?.team_name || weeklyTeamShort(team)
const resultFor = (node, id) => node.winner ? idOf(node.winner) === id ? 'win' : 'loss' : 'pending'

function RouteCard({ node, route, locale, seasonId, withSeason, returnProps }) {
  const activeId = idOf(route.activeTeam)
  const opponent = route.opponent(node)
  const condition = node.kind === 'FINAL' ? 'afterWin' : node.kind === 'THIRD_PLACE' ? 'afterLoss'
    : node.kind === 'SEMIFINAL' && route.route[0]?.kind === 'QUALIFIER' ? 'afterQualifier' : null
  const scoreVisible = node.match && node.scoreA != null && node.scoreB != null
  const score = idOf(node.a) === activeId ? [node.scoreA, node.scoreB] : [node.scoreB, node.scoreA]
  const content = <>
    <span className={signal.journeyNodeIndex}>{node.format || 'PLAYOFFS'} / {node.match ? text('published', locale) : text(node.planned ? 'planned' : 'pending', locale)}</span>
    <strong className={signal.journeyNodeRound}>{routeTitle(node, locale)}</strong>
    <span className={signal.journeyOpponent}>{opponent.team ? <TeamLogo team={opponent.team} seasonId={seasonId} className={signal.journeyOpponentLogo} /> : <span className={styles.sourceIcon} aria-hidden="true">↗</span>}<b>{node.type === 'BYE' ? text('bye', locale) : opponent.team ? weeklyTeamShort(opponent.team) : routeSourceLabel(opponent.source, route, locale)}</b></span>
    <time className={styles.routeTime} dateTime={node.scheduledAt || undefined}>{routeTime(node, locale)}</time>
    {scoreVisible && <span className={styles.routeScore}>{score[0]} : {score[1]}</span>}
    <em className={signal.journeyResult}>{node.type === 'BYE' ? text('bye', locale) : node.match ? weeklyStatusLabel(node.state, locale) : condition ? text(condition, locale) : text(node.planned ? 'conditional' : 'pending', locale)}</em>
    {node.match && <span className={styles.detailsArrow} aria-hidden="true">↗</span>}
  </>
  return node.match ? <Link className={styles.routeCard} to={withSeason(`/matches/${encodeURIComponent(node.match.id)}`)} {...returnProps}>{content}</Link>
    : <div className={styles.routeCard} data-planned-route={node.planned || undefined}>{content}</div>
}

function TeamRoute({ route, locale, seasonId, withSeason, returnProps }) {
  const marker = useId().replaceAll(':', '')
  const activeId = idOf(route.activeTeam)
  const hasQualifier = route.route.some(node => node.kind === 'QUALIFIER')
  const positions = new Map(route.route.map(node => [node.key, {
    x: node.kind === 'QUALIFIER' ? 28 : node.kind === 'SEMIFINAL' ? hasQualifier ? 340 : 80 : 720,
    y: node.kind === 'THIRD_PLACE' ? 322 : 82
  }]))
  return <div className={`${signal.journeyMapViewport} ${styles.routeViewport}`} tabIndex={0} role="region" aria-label={`${weeklyTeamShort(route.activeTeam)} · ${text('route', locale)}`} data-weekly-team-route={activeId}>
    {route.hasFork && <p className={styles.mobileForkNote}>{text('forkNote', locale)}</p>}
    <div className={`${signal.journeyMapCanvas} ${styles.routeCanvas}`}>
      <div className={signal.journeyLaneLabel} data-lane="upper"><span>ENTRY / ADVANCE</span><small>{text('entry', locale)}</small></div>
      <div className={`${signal.journeyLaneLabel} ${styles.finalLane}`} data-lane="final"><span>FINAL</span><small>{text('titleMatch', locale)}</small></div>
      {route.route.some(node => node.kind === 'THIRD_PLACE') && <div className={`${signal.journeyLaneLabel} ${styles.thirdLane}`} data-lane="lower"><span>THIRD PLACE</span><small>{text('placement', locale)}</small></div>}
      <span className={signal.journeyTeamGhost} aria-hidden="true">{weeklyTeamShort(route.activeTeam)}</span>
      <svg className={signal.journeyConnectors} viewBox="0 0 1000 520" preserveAspectRatio="none" aria-hidden="true"><defs><marker id={marker} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" /></marker></defs>{route.edges.filter(edge => edge.active && positions.has(edge.from) && positions.has(edge.to)).map(edge => {
        const from = positions.get(edge.from), to = positions.get(edge.to)
        return <path key={`${edge.from}-${edge.to}`} d={`M ${from.x + 220} ${from.y + 81} H ${to.x - 30} V ${to.y + 81} H ${to.x}`} markerEnd={`url(#${marker})`} data-drop={edge.result === 'loss' || undefined} />
      })}</svg>
      <ol className={`${signal.journeyNodes} ${styles.routeNodes}`}>{route.route.map(node => {
        const pos = positions.get(node.key)
        return <li key={node.key} style={{ '--journey-x': `${pos.x / 10}%`, '--journey-y': `${pos.y}px`, '--journey-card-width': '22%' }} data-lane={node.kind === 'FINAL' ? 'final' : node.kind === 'THIRD_PLACE' ? 'lower' : 'upper'} data-result={resultFor(node, activeId)} data-branch={route.hasFork && ['FINAL', 'THIRD_PLACE'].includes(node.kind) || undefined}>
          <RouteCard {...{ node, route, locale, seasonId, withSeason, returnProps }} />
        </li>
      })}</ol>
    </div>
  </div>
}

function FullMatchCard({ node, route, locale, seasonId, withSeason, returnProps, highlightId }) {
  const content = <><header><strong>{routeTitle(node, locale)}</strong><span>{node.format}</span></header><div className={styles.fullSides}>{[node.a, node.b].map((team, index) => <div key={index} data-winner={team && idOf(team) === idOf(node.winner) || undefined}>
    {team ? <><TeamLogo team={team} seasonId={seasonId} className={styles.fullLogo} /><strong>{weeklyTeamShort(team)}</strong></> : <strong className={styles.sourceLabel}>{node.type === 'BYE' ? text('bye', locale) : routeSourceLabel(node.sources[index], route, locale)}</strong>}
    {node.type !== 'BYE' && <b>{index === 0 ? node.scoreA ?? '—' : node.scoreB ?? '—'}</b>}
  </div>)}</div><time dateTime={node.scheduledAt || undefined}>{routeTime(node, locale)}</time><footer>{node.match ? weeklyStatusLabel(node.state, locale) : text(node.planned ? 'approved' : 'pending', locale)}{node.match && <span aria-hidden="true">↗</span>}</footer></>
  const props = { className: `${signal.matchIndexCard} ${styles.fullCard}`, 'data-active': Boolean(highlightId && node.candidateIds.includes(highlightId)) || undefined, 'data-planned-fixture': node.planned || undefined }
  return node.match ? <Link {...props} to={withSeason(`/matches/${encodeURIComponent(node.match.id)}`)} {...returnProps}>{content}</Link> : <article {...props}>{content}</article>
}

function FullBracket({ route, locale, seasonId, withSeason, returnProps, highlightId }) {
  const marker = useId().replaceAll(':', '')
  const hasQualifier = route.nodes.some(node => node.kind === 'QUALIFIER')
  const hasSemifinal = route.nodes.some(node => node.kind === 'SEMIFINAL')
  const semiX = hasQualifier ? 335 : 24
  const medalX = hasSemifinal ? hasQualifier ? 690 : 380 : 24
  const canvasWidth = hasQualifier ? 980 : hasSemifinal ? 700 : 300
  const positions = new Map(route.nodes.map(node => [node.key, { x: node.kind === 'QUALIFIER' ? 24 : node.kind === 'SEMIFINAL' ? semiX : medalX,
    y: node.kind === 'QUALIFIER' ? 245 + (node.index - 1) * 205 : node.kind === 'SEMIFINAL' ? 80 + (node.index - 1) * 320 : node.kind === 'THIRD_PLACE' ? 400 : 80 }]))
  const height = Math.max(630, ...[...positions.values()].map(pos => pos.y + 205))
  return <div className={styles.fullViewport} tabIndex={0} role="region" aria-label={text('full', locale)} data-weekly-full-bracket="true"><div className={styles.fullCanvas} style={{ height, width: canvasWidth, minWidth: canvasWidth }}>
    {hasQualifier && <div className={styles.fullCaption} style={{ left: 24 }}>01 / {text('qualifier', locale)}</div>}{hasSemifinal && <div className={styles.fullCaption} style={{ left: semiX }}>{hasQualifier ? '02' : '01'} / {text('semifinal', locale)}</div>}<div className={styles.fullCaption} style={{ left: medalX }}>{hasQualifier ? '03' : hasSemifinal ? '02' : '01'} / {text('medal', locale)}</div>
    <svg viewBox={`0 0 ${canvasWidth} ${height}`} className={styles.fullConnectors} aria-hidden="true"><defs><marker id={marker} markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0L7 3.5L0 7Z" /></marker></defs>{route.edges.map(edge => {
      const from = positions.get(edge.from), to = positions.get(edge.to)
      if (!from || !to) return null
      const targetY = to.y + (edge.from === 'semifinal-2' ? 115 : 75)
      return <path key={`${edge.from}-${edge.to}`} d={`M ${from.x + 250} ${from.y + 95} H ${to.x - (edge.from === 'semifinal-2' ? 26 : 48)} V ${targetY} H ${to.x}`} data-drop={edge.result === 'loss' || undefined} data-active={Boolean(highlightId && edge.active) || undefined} data-from={edge.from} data-to={edge.to} markerEnd={`url(#${marker})`} />
    })}</svg>
    {route.nodes.map(node => { const pos = positions.get(node.key); return <div key={node.key} className={styles.fullNode} style={{ left: pos.x, top: pos.y }} data-weekly-third-place={node.kind === 'THIRD_PLACE' || undefined}><FullMatchCard {...{ node, route, locale, seasonId, withSeason, returnProps, highlightId }} /></div> })}
  </div></div>
}

export default function WeeklyPlayoffBracket({ model, cycle, locale, seasonId, withSeason, returnProps, selectedTeamId, onSelectTeam }) {
  const [params, setParams] = useSearchParams()
  const route = buildWeeklyRouteModel(model, { cycle, seasonId, selectedTeamId })
  const teamOpen = params.get('view') === 'team'
  const setTeamView = open => { const next = new URLSearchParams(params); if (open) next.set('view', 'team'); else next.delete('view'); setParams(next, { replace: true, preventScrollReset: true }) }
  if (!route) return <section id="weekly-playoffs" className={styles.section} data-weekly-playoffs="pending"><h2>{text('bracket', locale)}</h2><p className={styles.emptyRoute}>{text('pending', locale)}</p></section>
  const notice = routeScheduleNotice(route, locale)
  const activeId = idOf(route.activeTeam)
  const highlightId = route.entrants.some(team => idOf(team) === selectedTeamId) ? selectedTeamId : null
  return <section id="weekly-playoffs" className={`${signal.playoffWorkspace} ${styles.section}`} data-chapter="02" aria-labelledby="weekly-playoffs-title" data-weekly-playoffs="true">
    <header className={`${signal.routeChapterHeading} ${styles.bracketHeading}`}><span>02 / PLAYOFFS / {cycle.code || cycle.name}</span><h2 id="weekly-playoffs-title">{text('bracket', locale)}{' '}<em>{text('bracketFocus', locale)}</em></h2><p>{text('bracketIntro', locale)}</p></header>
    <div className={styles.scheduleNotice}><strong>{notice.title}</strong><span>{text('timeZone', locale)}</span>{notice.note && <p>{notice.note}</p>}</div>
    {model.placements?.length === 4 && <section className={styles.placements} aria-label={text('finalPlacements', locale)}>
      <header><h3>{cycle.code} · {text('finalPlacements', locale)}</h3><span>{text(cycle.status === 'CLOSED' ? 'cycleClosed' : 'closeoutPending', locale)}</span></header>
      <ol>{model.placements.map(({ rank, team, match }) => <li key={idOf(team)} data-place={rank}>
        <span>{String(rank).padStart(2, '0')} / {text(['champion', 'runnerUp', 'thirdPlace', 'fourthPlace'][rank - 1], locale)}</span>
        <Link to={withSeason(`/matches/${encodeURIComponent(match.id)}`)} {...returnProps}><TeamLogo team={team} seasonId={seasonId} className={styles.placementLogo} /><strong>{weeklyTeamShort(team)}</strong><span aria-hidden="true">↗</span></Link>
      </li>)}</ol>
      <p>{text('placementsNote', locale)}</p>
    </section>}
    <div id="weekly-full-bracket" className={styles.bracketOverview}>
      <div className={styles.overviewPicker}><AdvanceTeamPicker teams={[{ id: '', label: text('all', locale) }, ...route.entrants.map(team => ({ id: idOf(team), label: `${weeklyTeamShort(team)} · ${fullName(team)}` }))]} value={highlightId || ''} onChange={onSelectTeam} locale={locale} /></div>
      <div className={`${signal.routeTeamDock} ${styles.teamDock} ${styles.bracketTeamDock}`}><header><span>PLAYOFF BRACKET</span><small>{text('timeZone', locale)}</small></header><div role="group" aria-label={text('selectHint', locale)}><button type="button" aria-pressed={!highlightId} data-active={!highlightId || undefined} onClick={() => onSelectTeam(null)}><strong>{text('all', locale)}</strong><i aria-hidden="true">↗</i></button>{route.entrants.map((team, index) => <button type="button" key={idOf(team)} aria-pressed={idOf(team) === highlightId} data-active={idOf(team) === highlightId || undefined} onClick={() => onSelectTeam(idOf(team))}><span>{String(index + 1).padStart(2, '0')}</span><TeamLogo team={team} seasonId={seasonId} className={signal.routeDockLogo} /><strong>{weeklyTeamShort(team)}</strong><i aria-hidden="true">↗</i></button>)}</div></div>
      <div className={styles.bracketMeta}><div className={styles.legend}><span>{text('winnerLine', locale)}</span>{route.nodes.some(node => node.kind === 'THIRD_PLACE') && <span data-loss="true">{text('loserLine', locale)}</span>}</div><Link to={withSeason(`/matches?cycle=${encodeURIComponent(cycle.id)}&week=all`)}>{text('schedule', locale)} ↗</Link></div>
      <p className={styles.swipeHint}>{text('swipe', locale)} ↔</p>
      <FullBracket {...{ route, locale, seasonId, withSeason, returnProps, highlightId }} />
      <footer className={styles.bracketFooter}>{text('points', locale)}{route.champion && <p className={styles.champion} data-weekly-champion={idOf(route.champion)}>{text('champion', locale)} · <strong>{weeklyTeamShort(route.champion)}</strong></p>}</footer>
    </div>
    {route.activeTeam && <details id="weekly-team-route" className={`${signal.fullBracketDisclosure} ${styles.teamRouteDisclosure}`} open={teamOpen} onToggle={event => { if (event.currentTarget.open !== teamOpen) setTeamView(event.currentTarget.open) }}><summary><span><b>TEAM ROUTE</b>{text('teamDetail', locale)}</span><span>{text('route', locale)} / {weeklyTeamShort(route.activeTeam)}</span><i aria-hidden="true">＋</i></summary>
    <section className={signal.routeStory} aria-label={text('title', locale)}>
      <div className={styles.teamPicker}><AdvanceTeamPicker teams={route.entrants.map(team => ({ id: idOf(team), label: `${weeklyTeamShort(team)} · ${fullName(team)}` }))} value={activeId} onChange={onSelectTeam} locale={locale} /></div>
      <header className={`${signal.routeStoryHeader} ${styles.storyHeader}`}><div><span>PLAYOFF TRANSMISSION / {cycle.code || 'FCW'}</span><strong>{text('title', locale)}</strong></div><dl><div><dt>{text('steps', locale)}</dt><dd>{String(route.route.length).padStart(2, '0')}</dd></div><div><dt>{text('finalFormat', locale)}</dt><dd>{model.finalFormat || (route.approvedPlan ? 'FT3' : '—')}</dd></div><div><dt>{text('zone', locale)}</dt><dd>UTC+8</dd></div></dl><a href="#weekly-full-bracket"><span>{text('full', locale)}</span><b aria-hidden="true">↗</b></a></header>
      {route.activeTeam ? <div className={signal.routeStoryBody}><aside className={signal.routeIdentity}>
        <span className={signal.routeIdentitySeed}>{route.officialSeed ? `${text('seedPublished', locale)} / ${route.officialSeed}` : text(route.plannedSeed ? 'planSlot' : 'contender', locale)}</span><span className={signal.routeIdentityGhost} aria-hidden="true">{weeklyTeamShort(route.activeTeam)}</span><TeamLogo team={route.activeTeam} seasonId={seasonId} className={signal.routeIdentityLogo} /><div><small>{text(idOf(route.champion) === activeId ? 'champion' : route.officialSeed ? 'seedPublished' : route.plannedSeed ? 'planSlot' : 'contender', locale)}</small><strong>{weeklyTeamShort(route.activeTeam)}</strong><p>{fullName(route.activeTeam)}</p></div><span className={signal.routeIdentityHint}>{text('route', locale)}<b>→</b></span>
      </aside><TeamRoute {...{ route, locale, seasonId, withSeason, returnProps }} /></div> : <p className={styles.emptyRoute}>{text('noTeam', locale)}</p>}
      <div className={`${signal.routeTeamDock} ${styles.teamDock}`}><header><span>CHOOSE A RUNNER</span><small>{text('selectHint', locale)}</small></header><div role="group" aria-label={text('selectHint', locale)}>{route.entrants.map((team, index) => <button type="button" key={idOf(team)} aria-pressed={idOf(team) === activeId} data-active={idOf(team) === activeId || undefined} onClick={() => onSelectTeam(idOf(team))}><span>{String(index + 1).padStart(2, '0')}</span><TeamLogo team={team} seasonId={seasonId} className={signal.routeDockLogo} /><strong>{weeklyTeamShort(team)}</strong><i aria-hidden="true">↗</i></button>)}</div></div>
      <footer className={signal.routeStoryFooter}><span>{text('points', locale)}</span><strong>{text('selectHint', locale)}</strong></footer>
    </section>
    </details>}
  </section>
}
