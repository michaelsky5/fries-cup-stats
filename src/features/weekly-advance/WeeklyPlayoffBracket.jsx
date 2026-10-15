import { useId } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import TeamLogo from '../../components/matches/TeamLogo.jsx'
import AdvanceTeamPicker from '../../components/advance/AdvanceTeamPicker.jsx'
import { weeklyStatusLabel, weeklyTeamShort } from '../weekly-overview/weeklyPresentation.js'
import { buildWeeklyRouteModel } from './weeklyRouteModel.js'
import { routeSourceLabel, routeText as text, routeTime, routeTitle } from './weeklyRoutePresentation.js'
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

function FullMatchCard({ node, route, locale, seasonId, withSeason, returnProps }) {
  const content = <><header><strong>{routeTitle(node, locale)}</strong><span>{node.format}</span></header><div className={styles.fullSides}>{[node.a, node.b].map((team, index) => <div key={index} data-winner={team && idOf(team) === idOf(node.winner) || undefined}>
    {team ? <><TeamLogo team={team} seasonId={seasonId} className={styles.fullLogo} /><strong>{weeklyTeamShort(team)}</strong></> : <strong className={styles.sourceLabel}>{node.type === 'BYE' ? text('bye', locale) : routeSourceLabel(node.sources[index], route, locale)}</strong>}
    {node.type !== 'BYE' && <b>{index === 0 ? node.scoreA ?? '—' : node.scoreB ?? '—'}</b>}
  </div>)}</div><time dateTime={node.scheduledAt || undefined}>{routeTime(node, locale)}</time><footer>{node.match ? weeklyStatusLabel(node.state, locale) : text(node.planned ? 'approved' : 'pending', locale)}{node.match && <span aria-hidden="true">↗</span>}</footer></>
  const props = { className: `${signal.matchIndexCard} ${styles.fullCard}`, 'data-active': node.candidateIds.includes(idOf(route.activeTeam)) || undefined, 'data-planned-fixture': node.planned || undefined }
  return node.match ? <Link {...props} to={withSeason(`/matches/${encodeURIComponent(node.match.id)}`)} {...returnProps}>{content}</Link> : <article {...props}>{content}</article>
}

function FullBracket({ route, locale, seasonId, withSeason, returnProps }) {
  const marker = useId().replaceAll(':', '')
  const hasQualifier = route.nodes.some(node => node.kind === 'QUALIFIER')
  const hasSemifinal = route.nodes.some(node => node.kind === 'SEMIFINAL')
  const semiX = hasQualifier ? 335 : 24
  const medalX = hasSemifinal ? hasQualifier ? 690 : 380 : 24
  const canvasWidth = hasQualifier ? 980 : hasSemifinal ? 700 : 300
  const positions = new Map(route.nodes.map(node => [node.key, { x: node.kind === 'QUALIFIER' ? 24 : node.kind === 'SEMIFINAL' ? semiX : medalX,
    y: node.kind === 'QUALIFIER' ? 245 + (node.index - 1) * 205 : node.kind === 'SEMIFINAL' ? 80 + (node.index - 1) * 320 : node.kind === 'THIRD_PLACE' ? 400 : 80 }]))
  const height = Math.max(630, ...[...positions.values()].map(pos => pos.y + 205))
  return <div className={styles.fullViewport} tabIndex={0} role="region" aria-label={text('full', locale)}><div className={styles.fullCanvas} style={{ height, width: canvasWidth, minWidth: canvasWidth }}>
    {hasQualifier && <div className={styles.fullCaption} style={{ left: 24 }}>01 / QUALIFIER</div>}{hasSemifinal && <div className={styles.fullCaption} style={{ left: semiX }}>{hasQualifier ? '02' : '01'} / SEMIFINALS</div>}<div className={styles.fullCaption} style={{ left: medalX }}>{hasQualifier ? '03' : hasSemifinal ? '02' : '01'} / MEDAL MATCHES</div>
    <svg viewBox={`0 0 ${canvasWidth} ${height}`} className={styles.fullConnectors} aria-hidden="true"><defs><marker id={marker} markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0L7 3.5L0 7Z" /></marker></defs>{route.edges.map(edge => {
      const from = positions.get(edge.from), to = positions.get(edge.to)
      if (!from || !to) return null
      const targetY = to.y + (edge.from === 'semifinal-2' ? 115 : 75)
      return <path key={`${edge.from}-${edge.to}`} d={`M ${from.x + 250} ${from.y + 95} H ${to.x - (edge.from === 'semifinal-2' ? 26 : 48)} V ${targetY} H ${to.x}`} data-drop={edge.result === 'loss' || undefined} data-active={edge.active || undefined} markerEnd={`url(#${marker})`} />
    })}</svg>
    {route.nodes.map(node => { const pos = positions.get(node.key); return <div key={node.key} className={styles.fullNode} style={{ left: pos.x, top: pos.y }} data-weekly-third-place={node.kind === 'THIRD_PLACE' || undefined}><FullMatchCard {...{ node, route, locale, seasonId, withSeason, returnProps }} /></div> })}
  </div></div>
}

export default function WeeklyPlayoffBracket({ model, cycle, locale, seasonId, withSeason, returnProps, selectedTeamId, onSelectTeam }) {
  const [params, setParams] = useSearchParams()
  const route = buildWeeklyRouteModel(model, { cycle, seasonId, selectedTeamId })
  if (!route) return null
  const fullOpen = params.get('bracket') === 'full'
  const setFull = open => { const next = new URLSearchParams(params); if (open) next.set('bracket', 'full'); else next.delete('bracket'); setParams(next, { replace: true, preventScrollReset: true }) }
  const activeId = idOf(route.activeTeam)
  return <section id="weekly-playoffs" className={`${signal.playoffWorkspace} ${styles.section}`} data-chapter="03" aria-labelledby="weekly-playoffs-title" data-weekly-playoffs="true">
    <header className={`${signal.routeChapterHeading} ${styles.chapterHeading}`}><span>02 / PLAYOFFS / {cycle.code || cycle.name}</span><h2 id="weekly-playoffs-title">{text('choose', locale)}{' '}<em>{text('follow', locale)}</em></h2><p>{text('intro', locale)}</p></header>
    <div className={styles.scheduleNotice}><strong>{text(route.hasPlannedFixtures ? 'approved' : route.nodes.some(node => node.match) ? 'official' : 'pending', locale)}</strong><span>{text('timeZone', locale)}</span>{route.hasPlannedFixtures && <p>{text('planNote', locale)}</p>}</div>
    <section className={signal.routeStory} aria-label={text('title', locale)}>
      <div className={styles.teamPicker}><AdvanceTeamPicker teams={route.entrants.map(team => ({ id: idOf(team), label: `${weeklyTeamShort(team)} · ${fullName(team)}` }))} value={activeId} onChange={onSelectTeam} locale={locale} /></div>
      <header className={`${signal.routeStoryHeader} ${styles.storyHeader}`}><div><span>PLAYOFF TRANSMISSION / {cycle.code || 'FCW'}</span><strong>{text('title', locale)}</strong></div><dl><div><dt>{text('steps', locale)}</dt><dd>{String(route.route.length).padStart(2, '0')}</dd></div><div><dt>{text('finalFormat', locale)}</dt><dd>{model.finalFormat || (route.approvedPlan ? 'FT3' : '—')}</dd></div><div><dt>{text('zone', locale)}</dt><dd>UTC+8</dd></div></dl><a href="#weekly-full-bracket" onClick={() => setFull(true)}><span>{text('full', locale)}</span><b aria-hidden="true">↗</b></a></header>
      {route.activeTeam ? <div className={signal.routeStoryBody}><aside className={signal.routeIdentity}>
        <span className={signal.routeIdentitySeed}>{route.officialSeed ? `${text('seedPublished', locale)} / ${route.officialSeed}` : text(route.plannedSeed ? 'planSlot' : 'contender', locale)}</span><span className={signal.routeIdentityGhost} aria-hidden="true">{weeklyTeamShort(route.activeTeam)}</span><TeamLogo team={route.activeTeam} seasonId={seasonId} className={signal.routeIdentityLogo} /><div><small>{text(idOf(route.champion) === activeId ? 'champion' : route.officialSeed ? 'seedPublished' : route.plannedSeed ? 'planSlot' : 'contender', locale)}</small><strong>{weeklyTeamShort(route.activeTeam)}</strong><p>{fullName(route.activeTeam)}</p></div><span className={signal.routeIdentityHint}>{text('route', locale)}<b>→</b></span>
      </aside><TeamRoute {...{ route, locale, seasonId, withSeason, returnProps }} /></div> : <p className={styles.emptyRoute}>{text('noTeam', locale)}</p>}
      <div className={`${signal.routeTeamDock} ${styles.teamDock}`}><header><span>CHOOSE A RUNNER</span><small>{text('selectHint', locale)}</small></header><div role="group" aria-label={text('selectHint', locale)}>{route.entrants.map((team, index) => <button type="button" key={idOf(team)} aria-pressed={idOf(team) === activeId} data-active={idOf(team) === activeId || undefined} onClick={() => onSelectTeam(idOf(team))}><span>{String(index + 1).padStart(2, '0')}</span><TeamLogo team={team} seasonId={seasonId} className={signal.routeDockLogo} /><strong>{weeklyTeamShort(team)}</strong><i aria-hidden="true">↗</i></button>)}</div></div>
      <footer className={signal.routeStoryFooter}><span>{text('points', locale)}</span><strong>{text('selectHint', locale)}</strong></footer>
    </section>
    <details id="weekly-full-bracket" className={signal.fullBracketDisclosure} open={fullOpen} onToggle={event => { if (event.currentTarget.open !== fullOpen) setFull(event.currentTarget.open) }}><summary><span><b>FULL SYSTEM</b>{text('full', locale)}</span><span>{text('timeZone', locale)}</span><i aria-hidden="true">＋</i></summary><div className={signal.fullBracketBody}><header><span>{text(route.approvedPlan ? 'approved' : 'official', locale)}</span><p><Link to={withSeason(`/matches?cycle=${encodeURIComponent(cycle.id)}&week=all`)}>{text('schedule', locale)} ↗</Link></p></header><FullBracket {...{ route, locale, seasonId, withSeason, returnProps }} />{route.champion && <p className={styles.champion} data-weekly-champion={idOf(route.champion)}>{text('champion', locale)} · <strong>{weeklyTeamShort(route.champion)}</strong></p>}</div></details>
  </section>
}
