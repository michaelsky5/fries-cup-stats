import { translateUiText as uiText } from '../../lib/uiText.js'
import { Link, useSearchParams } from 'react-router-dom'
import AdvanceRecordLink from './AdvanceRecordLink.jsx'
import AdvanceTeamPicker from './AdvanceTeamPicker.jsx'
import { playoffRouteOutcome, publishedPlayoffWinnerId, resolveAdvanceTeam, updateAdvanceReadingSearch } from './advanceReadingState.js'
import TeamLogo from '../matches/TeamLogo.jsx'
import { getMatchStatusLabelKey, teamFull, teamShort } from '../../lib/advanceSelectors.js'
import { getMatchFormatLabel } from '../../lib/matchFormat.js'
import styles from './AdvanceSignal.module.css'

const FIXED_CARD_WIDTH = 218
const FIXED_CARD_HEIGHT = 114
const FIXED_CANVAS_WIDTH = 1500
const FIXED_CANVAS_HEIGHT = 1090

const FIXED_MATCH_POSITIONS = {
  1: { x: 24, y: 112 },
  2: { x: 24, y: 244 },
  3: { x: 24, y: 424 },
  4: { x: 24, y: 556 },
  5: { x: 270, y: 786 },
  6: { x: 270, y: 946 },
  7: { x: 270, y: 178 },
  8: { x: 270, y: 490 },
  9: { x: 516, y: 786 },
  10: { x: 516, y: 946 },
  11: { x: 516, y: 334 },
  12: { x: 762, y: 866 },
  13: { x: 1008, y: 866 },
  14: { x: 1254, y: 612 }
}

function copy(locale, zh, en) {
  return locale === 'en-US' ? en : zh
}

function publishedRoundLabel(label, locale) {
  const names = {
    'UB QF': ['胜者组首轮', 'Upper quarterfinals'],
    'UB SF': ['胜者组半决赛', 'Upper semifinals'],
    'UB FINAL': ['胜者组决赛', 'Upper final'],
    'LB R1': ['败者组第一轮', 'Lower round 1'],
    'LB R2': ['败者组第二轮', 'Lower round 2'],
    'LB R3': ['败者组第三轮', 'Lower round 3'],
    'LB FINAL': ['败者组决赛', 'Lower final'],
    QUARTERFINALS: ['四分之一决赛', 'Quarterfinals'],
    SEMIFINALS: ['半决赛', 'Semifinals'],
    '3RD PLACE': ['季军赛', 'Third-place match'],
    'GRAND FINALS': ['总决赛', 'Grand final']
  }
  const pair = names[String(label || '').toUpperCase()]
  return pair ? copy(locale, uiText(pair[0], locale), pair[1]) : label
}

function journeyResultText(match, won, lost, locale) {
  const labels = {
    champion: ['胜 / 夺冠', 'WIN / CHAMPION'],
    'runner-up': ['负 / 亚军', 'LOSS / RUNNER-UP'],
    win: ['胜 / 晋级', 'WIN / ADVANCE'],
    drop: ['负 / 转入败者组', 'LOSS / LOWER BRACKET'],
    out: ['负 / 止步', 'LOSS / ELIMINATED'],
    loss: ['负', 'LOSS'],
    live: ['进行中', 'LIVE'],
    pending: ['待赛', 'UP NEXT']
  }
  const [zh, en] = labels[playoffRouteOutcome({ won, lost, round: match.round, status: match.status })]
  return copy(locale, uiText(zh, locale), en)
}

function matchRouteId(match) {
  return match?.matchId || match?.match_id || match?.id || ''
}

function teamKey(team) {
  return String(team?.team_id || team?.id || team?.team_short_name || team?.short || '')
}

function isComplete(match) {
  return ['completed', 'finished', 'final'].includes(String(match?.status || '').toLowerCase())
}

function sourceLabel(slot, locale) {
  if (slot?.seed) return `#${slot.seed}`
  if (slot?.winnerOf) return copy(locale, `M${slot.winnerOf} 胜`, `M${slot.winnerOf} W`)
  if (slot?.loserOf) return copy(locale, `M${slot.loserOf} 负`, `M${slot.loserOf} L`)
  return 'TBD'
}

function matchSlots(match, locale = 'zh-CN') {
  if (match?.slots?.length) {
    return match.slots.slice(0, 2).map((slot, index) => ({
      source: sourceLabel(slot, locale),
      team: slot.team,
      score: index === 0 ? match.scoreA : match.scoreB
    }))
  }

  return [
    { source: match?.teamA?.seed ? `#${match.teamA.seed}` : 'A', team: match?.teamA, score: match?.scoreA ?? match?.teamA?.score },
    { source: match?.teamB?.seed ? `#${match.teamB.seed}` : 'B', team: match?.teamB, score: match?.scoreB ?? match?.teamB?.score }
  ]
}

function formatMatchTime(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).format(date)
}

function MatchIndexCard({ match, seasonId, withSeason, t, locale = 'zh-CN', activeTeamKey = '' }) {
  const slots = matchSlots(match, locale)
  const winnerKey = publishedPlayoffWinnerId(match)
  const href = matchRouteId(match) ? withSeason(`/matches/${matchRouteId(match)}`) : ''
  const status = String(match?.status || 'scheduled').toLowerCase()
  const isOnActiveRoute = Boolean(activeTeamKey && slots.some(slot => teamKey(slot.team) === activeTeamKey))
  const content = (
    <>
      <header>
        <span>{match?.label || `M${match?.number || '—'}`}</span>
        <small>{getMatchFormatLabel(match)}</small>
      </header>
      <div className={styles.matchIndexTeams}>
        {slots.map((slot, index) => {
          const won = winnerKey && teamKey(slot.team) === winnerKey
          return (
            <div key={`${slot.source}-${teamKey(slot.team) || index}`} data-winner={won ? 'true' : undefined} data-route-active={activeTeamKey && teamKey(slot.team) === activeTeamKey ? 'true' : undefined}>
              <span>{slot.source}</span>
              <TeamLogo team={slot.team} seasonId={seasonId} className={styles.matchIndexLogo} />
              <strong>{teamShort(slot.team)}</strong>
              <b>{slot.score ?? '—'}</b>
            </div>
          )
        })}
      </div>
      <footer>
        <span>{formatMatchTime(match?.scheduledAt || match?.scheduled_at) || t(getMatchStatusLabelKey(status), status)}</span>
        {href ? <b aria-hidden="true">↗</b> : null}
      </footer>
    </>
  )

  return href ? (
    <AdvanceRecordLink className={styles.matchIndexCard} to={href} data-status={status} data-route-active={isOnActiveRoute ? 'true' : undefined}>{content}</AdvanceRecordLink>
  ) : (
    <div className={styles.matchIndexCard} data-status={status} data-route-active={isOnActiveRoute ? 'true' : undefined}>{content}</div>
  )
}

function fixedEdges(layout) {
  return (layout?.matches || []).flatMap(target => (target.slots || []).map((slot, targetSlot) => {
    const sourceNumber = slot.winnerOf || slot.loserOf
    if (!sourceNumber || !FIXED_MATCH_POSITIONS[sourceNumber] || !FIXED_MATCH_POSITIONS[target.number]) return null
    return {
      id: `${sourceNumber}-${target.number}-${targetSlot}`,
      sourceNumber,
      targetNumber: target.number,
      targetSlot,
      result: slot.winnerOf ? 'winner' : 'loser'
    }
  }).filter(Boolean))
}

function edgePath(edge) {
  const source = FIXED_MATCH_POSITIONS[edge.sourceNumber]
  const target = FIXED_MATCH_POSITIONS[edge.targetNumber]
  const startX = source.x + FIXED_CARD_WIDTH
  const startY = source.y + (FIXED_CARD_HEIGHT / 2)
  const endX = target.x
  const endY = target.y + 41 + (edge.targetSlot * 34)
  const railX = endX - 17 - (edge.targetSlot * 10)
  return `M ${startX} ${startY} H ${railX} V ${endY} H ${endX}`
}

function resultTeam(match, result) {
  if (result === 'winner') return match?.winner
  if (match?.loser) return match.loser
  const winnerKey = teamKey(match?.winner)
  return matchSlots(match).map(slot => slot.team).find(team => teamKey(team) && teamKey(team) !== winnerKey) || null
}

function BracketRoundCaption({ x, y, index, code, label, meta }) {
  return (
    <div className={styles.bracketRoundCaption} style={{ left: x, top: y }}>
      <span>{index} / {code}</span>
      <strong>{label}</strong>
      <small>{meta}</small>
    </div>
  )
}

function bracketRoundName(match, locale) {
  const labels = {
    upperRound1: copy(locale, '胜者组首轮', 'Upper round 1'),
    upperSemifinal: copy(locale, '胜者组半决赛', 'Upper semifinal'),
    upperFinal: copy(locale, '胜者组决赛', 'Upper final'),
    lowerRound1: copy(locale, '败者组第一轮', 'Lower round 1'),
    lowerRound2: copy(locale, '败者组第二轮', 'Lower round 2'),
    lowerRound3: copy(locale, '败者组第三轮', 'Lower round 3'),
    lowerFinal: copy(locale, '败者组决赛', 'Lower final'),
    grandFinal: copy(locale, '总决赛', 'Grand final')
  }
  return labels[match?.round] || match?.round || 'PLAYOFFS'
}

function FocusedRouteSummary({ matches, activeTeamKey, locale }) {
  if (!activeTeamKey) return null
  const route = matches.filter(match => matchSlots(match, locale).some(slot => teamKey(slot.team) === activeTeamKey))
  if (!route.length) return null
  const activeTeam = matchSlots(route[0], locale).find(slot => teamKey(slot.team) === activeTeamKey)?.team
  const wins = route.filter(match => teamKey(match?.winner) === activeTeamKey).length
  const losses = route.filter(match => isComplete(match) && teamKey(match?.winner) && teamKey(match.winner) !== activeTeamKey).length

  return (
    <section className={styles.focusedRouteSummary} aria-label={copy(locale, uiText("{0} 的比赛路线", locale, [teamShort(activeTeam)]), `${teamShort(activeTeam)} match route`)}>
      <header>
        <span>FOCUSED JOURNEY</span>
        <strong>{teamShort(activeTeam)} · {copy(locale, uiText("{0} 场 / {1} 胜 {2} 负", locale, [route.length, wins, losses]), `${route.length} matches / ${wins}W ${losses}L`)}</strong>
      </header>
      <ol>
        {route.map((match, index) => {
          const slots = matchSlots(match, locale)
          const ownIndex = slots.findIndex(slot => teamKey(slot.team) === activeTeamKey)
          const ownSlot = slots[ownIndex]
          const opponent = slots[ownIndex === 0 ? 1 : 0]
          const won = teamKey(match?.winner) === activeTeamKey
          const lost = isComplete(match) && teamKey(match?.winner) && !won
          return (
            <li key={match.number || matchRouteId(match)} data-result={won ? 'win' : lost ? 'loss' : 'pending'}>
              <span>{match.label || `M${match.number}`} / {bracketRoundName(match, locale)}</span>
              <strong>{teamShort(ownSlot?.team)} {ownSlot?.score ?? '—'}<b>:</b>{opponent?.score ?? '—'} {teamShort(opponent?.team)}</strong>
              <em>{won ? copy(locale, uiText("胜", locale), 'WIN') : lost ? copy(locale, uiText("负", locale), 'LOSS') : copy(locale, uiText("待赛", locale), 'UP NEXT')}</em>
              {index < route.length - 1 ? <i aria-hidden="true">{lost ? '↓' : '→'}</i> : null}
            </li>
          )
        })}
      </ol>
    </section>
  )
}

function journeyLane(match) {
  if (match?.round === 'grandFinal') return 'final'
  if (String(match?.round || '').startsWith('lower')) return 'lower'
  return 'upper'
}

function journeyCoordinates(route) {
  const cardWidth = 136
  const start = 28
  const end = 836
  const step = route.length > 1 ? (end - start) / (route.length - 1) : 0
  const laneTop = { upper: 82, final: 202, lower: 322 }

  return route.map((match, index) => ({
    match,
    lane: journeyLane(match),
    x: start + (step * index),
    y: laneTop[journeyLane(match)],
    cardWidth
  }))
}

function journeyEdgePath(source, target) {
  const startX = source.x + source.cardWidth
  const startY = source.y + 62
  const endX = target.x
  const endY = target.y + 62
  const bendX = startX + Math.max(18, (endX - startX) * .48)
  return `M ${startX} ${startY} H ${bendX} V ${endY} H ${endX}`
}

function TeamJourneyStage({ matches, activeTeamKey, seasonId, locale, withSeason }) {
  const route = matches.filter(match => matchSlots(match, locale).some(slot => teamKey(slot.team) === activeTeamKey))
  const points = journeyCoordinates(route)
  const activeTeam = route.length
    ? matchSlots(route[0], locale).find(slot => teamKey(slot.team) === activeTeamKey)?.team
    : null

  if (!route.length) {
    return <p className={styles.journeyEmpty}>{copy(locale, uiText("这支队伍尚未进入季后赛路径。", locale), 'This team has no playoff route yet.')}</p>
  }

  return (
    <div className={styles.journeyMapViewport} tabIndex={0} aria-label={copy(locale, uiText("{0} 的季后赛路线", locale, [teamShort(activeTeam)]), `${teamShort(activeTeam)} playoff journey`)}>
      <p className={styles.mobileScoreNote}>{copy(locale, uiText('比分以 {0} 在前', locale, [teamShort(activeTeam)]), `${teamShort(activeTeam)}’s score is shown first`)}</p>
      <div className={styles.journeyMapCanvas}>
        <div className={styles.journeyLaneLabel} data-lane="upper"><span>UPPER</span><small>{copy(locale, uiText("胜者路线", locale), 'WINNERS ROUTE')}</small></div>
        <div className={styles.journeyLaneLabel} data-lane="lower"><span>LOWER</span><small>{copy(locale, uiText("背水一战", locale), 'ONE LIFE LEFT')}</small></div>
        <div className={styles.journeyLaneLabel} data-lane="final"><span>FINAL</span><small>{copy(locale, uiText("冠军战", locale), 'TITLE MATCH')}</small></div>
        <span className={styles.journeyTeamGhost} aria-hidden="true">{teamShort(activeTeam)}</span>

        <svg className={styles.journeyConnectors} viewBox="0 0 1000 520" aria-hidden="true">
          <defs>
            <marker id="journey-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 Z" />
            </marker>
          </defs>
          {points.slice(0, -1).map((point, index) => {
            const next = points[index + 1]
            return <path key={`${point.match.number}-${next.match.number}`} d={journeyEdgePath(point, next)} markerEnd="url(#journey-arrow)" data-drop={point.lane === 'upper' && next.lane === 'lower' ? 'true' : undefined} />
          })}
        </svg>

        <ol className={styles.journeyNodes}>
          {points.map((point, index) => {
            const slots = matchSlots(point.match, locale)
            const ownIndex = slots.findIndex(slot => teamKey(slot.team) === activeTeamKey)
            const own = slots[ownIndex]
            const opponent = slots[ownIndex === 0 ? 1 : 0]
            const won = teamKey(point.match?.winner) === activeTeamKey
            const lost = isComplete(point.match) && teamKey(point.match?.winner) && !won
            const href = matchRouteId(point.match) ? withSeason(`/matches/${matchRouteId(point.match)}`) : ''
            const content = (
              <>
                <span className={styles.journeyNodeIndex}>{String(index + 1).padStart(2, '0')} / {point.match?.label || `M${point.match?.number}`}</span>
                <strong className={styles.journeyNodeRound}>{bracketRoundName(point.match, locale)}</strong>
                <span className={styles.journeyOpponent}>
                  <TeamLogo team={opponent?.team} seasonId={seasonId} className={styles.journeyOpponentLogo} />
                  <b>{teamShort(opponent?.team) || 'TBD'}</b>
                </span>
                <span className={styles.journeyScore}><b>{own?.score ?? '—'}</b><i>:</i><b>{opponent?.score ?? '—'}</b></span>
                <em className={styles.journeyResult}>{journeyResultText(point.match, won, lost, locale)}</em>
              </>
            )

            return (
              <li
                key={point.match.number || matchRouteId(point.match)}
                style={{ '--journey-x': `${point.x}px`, '--journey-y': `${point.y}px`, '--journey-card-width': `${point.cardWidth}px` }}
                data-lane={point.lane}
                data-result={won ? 'win' : lost ? 'loss' : 'pending'}
              >
                {href ? <AdvanceRecordLink to={href}>{content}</AdvanceRecordLink> : <div>{content}</div>}
              </li>
            )
          })}
        </ol>

        {points.some((point, index) => point.lane === 'upper' && points[index + 1]?.lane === 'lower') ? (
          <span className={styles.journeyDropNote}>{copy(locale, uiText("一次失利，路线转入败者组", locale), 'ONE LOSS. ROUTE TRANSFERRED TO LOWER.')}</span>
        ) : null}
      </div>
    </div>
  )
}

function ConnectedDoubleBracket({ layout, seasonId, locale, t, withSeason, activeTeamKey, showFocusedRoute = true }) {
  const byNumber = new Map((layout?.matches || []).map(match => [match.number, match]))
  const edges = fixedEdges(layout).map(edge => ({
    ...edge,
    active: Boolean(activeTeamKey && teamKey(resultTeam(byNumber.get(edge.sourceNumber), edge.result)) === activeTeamKey)
  })).sort((a, b) => Number(a.active) - Number(b.active))
  const champion = byNumber.get(14)?.winner
  const championActive = Boolean(activeTeamKey && teamKey(champion) === activeTeamKey)

  return (
    <div className={styles.connectedBracket}>
      {showFocusedRoute ? <FocusedRouteSummary matches={layout?.matches || []} activeTeamKey={activeTeamKey} locale={locale} /> : null}
      <div className={styles.connectedBracketToolbar}>
        <div className={styles.routeLegend} aria-label={copy(locale, uiText("路线图例", locale), 'Route legend')}>
          <span data-kind="winner">{copy(locale, uiText("获胜晋级", locale), 'Win advances')}</span>
          <span data-kind="loser">{copy(locale, uiText("失利落入败者组", locale), 'Loss drops to lower')}</span>
          <span data-kind="active">{copy(locale, uiText("当前追踪路线", locale), 'Focused route')}</span>
        </div>
        <p>{copy(locale, uiText("沿连线读取，不需要换算 W-M / L-M；窄屏左右拖动。", locale), 'Follow the connectors—no W-M / L-M decoding required. Drag sideways on narrow screens.')}</p>
      </div>

      <div className={styles.connectedBracketViewport} tabIndex={0} aria-label={copy(locale, uiText("完整双败晋级图，可横向滚动", locale), 'Complete double-elimination bracket, horizontally scrollable')}>
        <div className={styles.connectedBracketCanvas} style={{ width: FIXED_CANVAS_WIDTH, height: FIXED_CANVAS_HEIGHT }}>
          <div className={styles.bracketFinalField} aria-hidden="true" />
          <div className={styles.bracketLaneRule} data-lane="upper" aria-hidden="true" />
          <div className={styles.bracketLaneRule} data-lane="lower" aria-hidden="true" />

          <div className={styles.bracketLaneTitle} data-lane="upper">
            <span>UPPER</span><strong>{copy(locale, uiText("胜者组", locale), 'UPPER BRACKET')}</strong><small>{copy(locale, uiText("保持全胜，直通总决赛", locale), 'Stay unbeaten to reach the final')}</small>
          </div>
          <BracketRoundCaption x={24} y={70} index="01" code="UB R1" label={copy(locale, uiText("胜者组首轮", locale), 'Upper round 1')} meta="M1–M4 · FT3" />
          <BracketRoundCaption x={270} y={136} index="02" code="UB SF" label={copy(locale, uiText("胜者组半决赛", locale), 'Upper semifinal')} meta="M7–M8 · FT3" />
          <BracketRoundCaption x={516} y={292} index="03" code="UB F" label={copy(locale, uiText("胜者组决赛", locale), 'Upper final')} meta="M11 · FT3" />

          <div className={styles.bracketLaneTitle} data-lane="lower">
            <span>LOWER</span><strong>{copy(locale, uiText("败者组", locale), 'LOWER BRACKET')}</strong><small>{copy(locale, uiText("再输一场即淘汰", locale), 'One more loss ends the run')}</small>
          </div>
          <BracketRoundCaption x={270} y={744} index="01" code="LB R1" label={copy(locale, uiText("败者组第一轮", locale), 'Lower round 1')} meta="M5–M6 · FT3" />
          <BracketRoundCaption x={516} y={744} index="02" code="LB R2" label={copy(locale, uiText("败者组第二轮", locale), 'Lower round 2')} meta={copy(locale, 'M9–M10 · 交叉落位', 'M9–M10 · crossover')} />
          <BracketRoundCaption x={762} y={824} index="03" code="LB R3" label={copy(locale, uiText("败者组第三轮", locale), 'Lower round 3')} meta="M12 · FT3" />
          <BracketRoundCaption x={1008} y={824} index="04" code="LB F" label={copy(locale, uiText("败者组决赛", locale), 'Lower final')} meta="M13 · FT3" />

          <div className={styles.bracketFinalCaption}>
            <span>05 / GRAND FINAL</span>
            <strong>{copy(locale, uiText("总决赛", locale), 'GRAND FINAL')}</strong>
            <small>{copy(locale, uiText("两条路线在此汇合 · FT4", locale), 'Both routes converge here · FT4')}</small>
          </div>

          <svg className={styles.bracketConnectors} viewBox={`0 0 ${FIXED_CANVAS_WIDTH} ${FIXED_CANVAS_HEIGHT}`} aria-hidden="true">
            <defs>
              <marker id="signal-route-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
                <path d="M0,0 L7,3.5 L0,7 Z" />
              </marker>
              <marker id="signal-route-arrow-active" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
                <path d="M0,0 L7,3.5 L0,7 Z" />
              </marker>
            </defs>
            {edges.map(edge => (
              <path
                key={edge.id}
                d={edgePath(edge)}
                data-result={edge.result}
                data-route-active={edge.active ? 'true' : undefined}
                markerEnd={edge.active ? 'url(#signal-route-arrow-active)' : 'url(#signal-route-arrow)'}
              />
            ))}
            <path className={styles.bracketChampionConnector} data-route-active={championActive ? 'true' : undefined} d="M 1363 726 V 758" />
          </svg>

          {(layout?.matches || []).map(match => {
            const position = FIXED_MATCH_POSITIONS[match.number]
            if (!position) return null
            return (
              <div
                key={match.number}
                className={styles.bracketMatchNode}
                style={{ left: position.x, top: position.y, width: FIXED_CARD_WIDTH }}
                data-match={`M${match.number}`}
              >
                <MatchIndexCard match={match} seasonId={seasonId} locale={locale} withSeason={withSeason} t={t} activeTeamKey={activeTeamKey} />
              </div>
            )
          })}

          <div className={styles.bracketCrossoverNote}>
            <span>DROP / CROSSOVER</span>
            <strong>{copy(locale, uiText("M7、M8 的败者交叉落位", locale), 'M7 and M8 losers cross over')}</strong>
          </div>

          <div className={styles.bracketUpperHoldNote}>
            <span>UPPER WINNER / FINAL BERTH</span>
            <strong>{copy(locale, uiText("M11 胜者锁定总决赛席位", locale), 'The M11 winner secures a grand-final berth')}</strong>
          </div>

          <div className={styles.bracketChampionTarget} data-route-active={championActive ? 'true' : undefined}>
            <span>WINNER / SEASON CHAMPION</span>
            <div>
              {champion ? <TeamLogo team={champion} seasonId={seasonId} className={styles.bracketChampionLogo} /> : null}
              <strong>{teamShort(champion) || copy(locale, uiText("冠军席位", locale), 'CHAMPION')}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function genericLanes(bracket) {
  return [{
    id: 'route',
    label: 'PLAYOFF ROUTE',
    note: bracket?.bracketType === 'double_elimination' ? 'DOUBLE ELIMINATION' : 'SINGLE ELIMINATION',
    rounds: (bracket?.rounds || []).map(round => ({
      id: round.id,
      label: round.label || round.id,
      matches: round.matches || []
    }))
  }]
}

function GenericBracket({ bracket, seasonId, locale, t, withSeason }) {
  const lanes = genericLanes(bracket)
  return (
    <div className={styles.playoffLanes}>
      {lanes.map(lane => (
        <section key={lane.id} className={styles.playoffLane} data-lane={lane.id}>
          <header>
            <div><span>{lane.id.toUpperCase()}</span><strong>{lane.label}</strong></div>
            <small>{lane.note}</small>
          </header>
          <div className={styles.playoffLaneScroll} tabIndex={0}>
            <div className={styles.playoffRounds} style={{ '--playoff-round-count': lane.rounds.length }}>
              {lane.rounds.map((round, index) => (
                <section key={round.id} className={styles.playoffRound}>
                  <header>
                    <span>{String(index + 1).padStart(2, '0')} / {round.id}</span>
                    <strong>{publishedRoundLabel(round.label, locale)}</strong>
                    {index < lane.rounds.length - 1 ? <i aria-hidden="true">→</i> : null}
                  </header>
                  <div>
                    {round.matches.map(match => (
                      <MatchIndexCard key={matchRouteId(match) || match.label} match={match} seasonId={seasonId} locale={locale} withSeason={withSeason} t={t} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </section>
      ))}
    </div>
  )
}

export function PublishedTeamRoute({ matches, seasonId, locale, t, withSeason, preferredTeamId = '' }) {
  const [params, setParams] = useSearchParams()
  const teams = [...new Map(matches.flatMap(match => matchSlots(match, locale)
    .filter(slot => (slot.team?.id || slot.team?.team_id) && !slot.team?.isTbd)
    .map(slot => [teamKey(slot.team), slot.team]))).values()]
  const selected = resolveAdvanceTeam(params.get('teamId'), teams.map(teamKey), preferredTeamId)
  const activeTeam = teams.find(team => teamKey(team) === selected)
  const route = selected ? matches.filter(match => matchSlots(match, locale).some(slot => teamKey(slot.team) === selected)) : []
  const wins = route.filter(match => publishedPlayoffWinnerId(match) === selected).length
  const losses = route.filter(match => publishedPlayoffWinnerId(match) && publishedPlayoffWinnerId(match) !== selected).length

  return <section className={styles.mobilePlayoffRoute} aria-label={copy(locale, uiText('队伍比赛路径', locale), 'Team match route')}>
    {activeTeam ? <>
      <AdvanceTeamPicker teams={teams.map(team => ({ id: teamKey(team), label: `${teamShort(team)} · ${teamFull(team)}` }))} value={selected} onChange={teamId => setParams(updateAdvanceReadingSearch(params, { teamId }), { replace: true, preventScrollReset: true })} locale={locale} />
      <div className={styles.mobileRouteIdentity}><TeamLogo team={activeTeam} seasonId={seasonId} className={styles.routeDockLogo} /><strong>{teamShort(activeTeam)}</strong><span>{wins + losses ? `${wins}W · ${losses}L` : copy(locale, uiText('赛果待确认', locale), 'Results pending')}</span></div>
      <ol>{route.map(match => <li key={matchRouteId(match) || match.label}><h3>{publishedRoundLabel(match.roundLabel, locale)}</h3><MatchIndexCard match={match} seasonId={seasonId} locale={locale} t={t} withSeason={withSeason} activeTeamKey={selected} /></li>)}</ol>
    </> : <p className={styles.journeyEmpty}>{copy(locale, uiText('参赛队伍待公布', locale), 'Participating teams are to be announced')}</p>}
  </section>
}

export default function AdvanceSignalPlayoffs({
  bracket,
  seasonId,
  locale = 'zh-CN',
  t,
  withSeason,
  getPhaseHref,
  singleElimination = false
}) {
  const [params, setParams] = useSearchParams()
  const fullBracketOpen = params.get('bracket') === 'full'
  const toggleFullBracket = event => {
    const open = event.currentTarget.open
    if (open !== fullBracketOpen) setParams(updateAdvanceReadingSearch(params, { bracket: open ? 'full' : null }), { replace: true, preventScrollReset: true })
  }
  const routeSelection = params.get('teamId') || ''
  const setRouteSelection = teamId => setParams(updateAdvanceReadingSearch(params, { teamId }), { replace: true, preventScrollReset: true })
  const layout = bracket?.layout?.format === 'fixed_double_elimination' ? bracket.layout : null
  const allMatches = layout?.matches || (bracket?.rounds || []).flatMap(round => (round.matches || []).map(match => ({ ...match, roundLabel: round.label || round.id })))
  const completedMatches = allMatches.filter(isComplete).length
  const participantCount = layout?.participantCount || new Set(allMatches.flatMap(match => matchSlots(match, locale).map(slot => teamKey(slot.team))).filter(Boolean)).size
  const lastMatch = layout ? layout.matches.find(match => match.number === 14) : allMatches.at(-1)
  const champion = matchSlots(lastMatch, locale).find(slot => teamKey(slot.team) === publishedPlayoffWinnerId(lastMatch))?.team
  const phaseComplete = Boolean(allMatches.length && completedMatches === allMatches.length)
  const seeds = layout?.seededTeams || [...new Map(allMatches.flatMap(match => matchSlots(match, locale).filter(slot => teamKey(slot.team)).map(slot => [teamKey(slot.team), slot.team]))).values()]
  const activeTeamKey = resolveAdvanceTeam(routeSelection, seeds.map(teamKey), teamKey(champion))
  const activeTeam = seeds.find(seed => teamKey(seed) === activeTeamKey) || champion || seeds[0]
  const activeRoute = allMatches.filter(match => matchSlots(match, locale).some(slot => teamKey(slot.team) === activeTeamKey))
  const activeWins = activeRoute.filter(match => publishedPlayoffWinnerId(match) === activeTeamKey).length
  const activeLosses = activeRoute.filter(match => publishedPlayoffWinnerId(match) && publishedPlayoffWinnerId(match) !== activeTeamKey).length
  const activeSeed = activeTeam?.seed || seeds.findIndex(seed => teamKey(seed) === activeTeamKey) + 1

  if (!allMatches.length) {
    return (
      <div className={styles.playoffWorkspace} data-chapter={singleElimination ? '02' : '03'}>
        <div className={styles.playoffPending}>
          <span>BRACKET / PENDING</span>
          <h2>{copy(locale, uiText("对阵尚未发布", locale), 'Bracket not published')}</h2>
          <p>{copy(locale, uiText("晋级队伍与签位确认后，这里会按真实轮次生成完整路径。", locale), 'The complete route will appear once teams and seeds are confirmed.')}</p>
        </div>
      </div>
    )
  }

  if (!layout) {
    return (
      <div className={styles.playoffWorkspace} data-chapter={singleElimination ? '02' : '03'}>
        <header className={styles.chapterIntro}>
          <div>
            <span>{singleElimination ? '02' : '03'} / PLAYOFFS / {seasonId}</span>
            <h2>{copy(locale, <>{uiText("八支队伍，", locale)}<em>{uiText("一条冠军路。", locale)}</em></>, <>Eight teams.{' '}<em>One road to the title.</em></>)}</h2>
          </div>
          <p>{copy(locale, uiText("胜者逐轮向冠军推进；其他名次赛按已发布赛程展示。", locale), 'Winners advance round by round toward the title. Placement matches follow the published schedule.')}</p>
        </header>
        <PublishedTeamRoute matches={allMatches} seasonId={seasonId} locale={locale} t={t} withSeason={withSeason} preferredTeamId={teamKey(champion)} />
        <div className={styles.desktopBracket}><GenericBracket bracket={bracket} seasonId={seasonId} locale={locale} t={t} withSeason={withSeason} /></div>
        <details className={styles.mobileBracketDisclosure} open={fullBracketOpen} onToggle={toggleFullBracket}><summary>{copy(locale, uiText('完整季后赛签表', locale), 'Complete playoff bracket')} <span aria-hidden="true">＋</span></summary><GenericBracket bracket={bracket} seasonId={seasonId} locale={locale} t={t} withSeason={withSeason} /></details>
      </div>
    )
  }

  return (
    <div className={styles.playoffWorkspace} data-chapter="03">
      <header className={styles.routeChapterHeading}>
        <span>03 / PLAYOFFS / {seasonId}</span>
        <h2 id="signal-playoff-route-title">{copy(locale, <>{uiText("选一支队，", locale)}<em>{uiText("走完它的赛季。", locale)}</em></>, <>Choose a team.{' '}<em>Follow the whole run.</em></>)}</h2>
        <p>{copy(locale, uiText("全胜可以直达终局，一次失利会改写方向。选择一个名字，读取它如何晋级、落位，或告别赛季。", locale), 'An unbeaten run reaches the final directly; one loss rewrites the route. Choose a name and read how it advanced, dropped, or exited the season.')}</p>
      </header>

      <section className={styles.routeStory} aria-labelledby="signal-playoff-route-title">
        <AdvanceTeamPicker teams={seeds.map(team => ({ id: teamKey(team), label: `${teamShort(team)} · ${teamFull(team)}` }))} value={activeTeamKey} onChange={setRouteSelection} locale={locale} />
        <header className={styles.routeStoryHeader}>
          <div>
            <span>PLAYOFF TRANSMISSION / {String(activeSeed || '—').padStart(2, '0')}</span>
            <strong>{phaseComplete ? copy(locale, uiText("赛季路径已封存", locale), 'SEASON ROUTE ARCHIVED') : copy(locale, uiText("赛季路径正在更新", locale), 'LIVE ROUTE SIGNAL')}</strong>
          </div>
          <dl>
            <div><dt>{copy(locale, uiText("战绩", locale), 'RECORD')}</dt><dd>{activeWins}<small>W</small> {activeLosses}<small>L</small></dd></div>
            <div><dt>{copy(locale, uiText("比赛", locale), 'MATCHES')}</dt><dd>{String(activeRoute.length).padStart(2, '0')}</dd></div>
            <div><dt>{copy(locale, uiText("赛制", locale), 'FORMAT')}</dt><dd>DE</dd></div>
          </dl>
          <Link to={getPhaseHref('final')}><span>{copy(locale, uiText("最终结果", locale), 'FINAL RESULT')}</span><b aria-hidden="true">↗</b></Link>
        </header>

        <div className={styles.routeStoryBody}>
          <aside className={styles.routeIdentity}>
            <span className={styles.routeIdentitySeed}>SEED / {String(activeSeed || '—').padStart(2, '0')}</span>
            <span className={styles.routeIdentityGhost} aria-hidden="true">{teamShort(activeTeam)}</span>
            <TeamLogo team={activeTeam} seasonId={seasonId} className={styles.routeIdentityLogo} />
            <div>
              <small>{teamKey(activeTeam) === teamKey(champion) ? copy(locale, uiText("赛季冠军", locale), 'SEASON CHAMPION') : copy(locale, uiText("季后赛参赛队", locale), 'PLAYOFF CONTENDER')}</small>
              <strong>{teamShort(activeTeam)}</strong>
              <p data-i18n-ignore>{teamFull(activeTeam)}</p>
            </div>
            <span className={styles.routeIdentityHint}>{copy(locale, uiText("向右读取每一次胜负", locale), 'READ EACH RESULT TO THE RIGHT')} <b>→</b></span>
          </aside>

          <TeamJourneyStage matches={allMatches} activeTeamKey={activeTeamKey} seasonId={seasonId} locale={locale} withSeason={withSeason} />
        </div>

        <div className={styles.routeTeamDock}>
          <header>
            <span>CHOOSE A RUNNER</span>
            <small>{copy(locale, uiText("切换队伍，路线立即重构", locale), 'CHANGE TEAM · REBUILD THE ROUTE')}</small>
          </header>
          <div role="group" aria-label={copy(locale, uiText("选择要追踪的队伍路线", locale), 'Select a team route to follow')}>
            {seeds.map(seed => {
              const key = teamKey(seed)
              const active = Boolean(key && key === activeTeamKey)
              return (
                <button key={seed.seed || key} type="button" aria-pressed={active} data-active={active ? 'true' : undefined} onClick={() => setRouteSelection(key)}>
                  <span>{String(seed.seed || '—').padStart(2, '0')}</span>
                  <TeamLogo team={seed} seasonId={seasonId} className={styles.routeDockLogo} />
                  <strong>{teamShort(seed)}</strong>
                  <i aria-hidden="true">↗</i>
                </button>
              )
            })}
          </div>
        </div>

        <footer className={styles.routeStoryFooter}>
          <span>{String(completedMatches).padStart(2, '0')} / {String(allMatches.length).padStart(2, '0')} {copy(locale, uiText("场比赛完成归档", locale), 'MATCHES ARCHIVED')}</span>
          <strong>{copy(locale, uiText("先读一支队的命运，再读整个签表。", locale), 'ONE TEAM FIRST. THE WHOLE BRACKET SECOND.')}</strong>
        </footer>
      </section>

      <details className={styles.fullBracketDisclosure} open={fullBracketOpen} onToggle={toggleFullBracket}>
        <summary>
          <span><b>FULL SYSTEM</b>{copy(locale, uiText("完整双败签表", locale), 'FULL DOUBLE-ELIMINATION BRACKET')}</span>
          <span>{participantCount || '—'} {copy(locale, uiText("支队伍", locale), 'TEAMS')} / {allMatches.length} {copy(locale, uiText("场比赛", locale), 'MATCHES')} / {getMatchFormatLabel(lastMatch)} FINAL</span>
          <i aria-hidden="true">+</i>
        </summary>
        <div className={styles.fullBracketBody}>
          <header>
            <span>DEPENDENCY MAP / WIN + LOSS ROUTES</span>
            <p>{copy(locale, uiText("已高亮 {0}；实线代表胜者晋级，虚线代表败者落位。", locale, [teamShort(activeTeam)]), `${teamShort(activeTeam)} is highlighted. Solid lines advance winners; dashed lines place losers.`)}</p>
          </header>
          <ConnectedDoubleBracket layout={layout} seasonId={seasonId} locale={locale} t={t} withSeason={withSeason} activeTeamKey={activeTeamKey} showFocusedRoute={false} />
        </div>
      </details>
    </div>
  )
}
