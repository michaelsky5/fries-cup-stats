import { translateUiText as uiText } from '../../lib/uiText.js'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import TeamLogo from '../matches/TeamLogo.jsx'
import { formatShortDateTime, teamShort } from '../../lib/advanceSelectors.js'
import { buildSwissSignalFlow } from '../../lib/swissSignalFlow.js'
import styles from './AdvanceSignal.module.css'

const FLOW_WIDTH = 1400
const FLOW_HEIGHT = 520
const FLOW_ROUND_START = 86
const FLOW_ROUND_END = 1112
const FLOW_OUTCOME_X = 1305

function copy(locale, zh, en) {
  return locale === 'en-US' ? en : zh
}

function teamRouteId(row) {
  return String(row?.team_id || row?.id || row?.team_short_name || '')
}

function matchRouteId(match) {
  return match?.match_id || match?.id || ''
}

function zoneDetail(zone, locale, rules = {}) {
  const directWins = rules.directAdvanceWins || 5
  const survivalWins = rules.lcqSurvivalWins || 3
  const eliminatedLosses = rules.eliminatedLosses || 4
  const labels = {
    all: copy(locale, '完整官方顺序', 'Complete official order'),
    direct: copy(locale, `${directWins} 胜直达季后赛`, `${directWins} wins · direct to playoffs`),
    breakthrough: copy(locale, `${survivalWins} 胜进入突围赛`, `${survivalWins} wins · breakthrough berth`),
    contending: copy(locale, '去向仍未确定', 'Outcome still open'),
    danger: copy(locale, `第 ${eliminatedLosses} 负将被淘汰`, `Eliminated on loss ${eliminatedLosses}`),
    eliminated: copy(locale, '本赛季止步', 'Season concluded')
  }
  return labels[zone] || labels.all
}

function flowRoundX(round, roundCount) {
  if (roundCount <= 1) return (FLOW_ROUND_START + FLOW_ROUND_END) / 2
  return FLOW_ROUND_START + ((round - 1) * (FLOW_ROUND_END - FLOW_ROUND_START)) / (roundCount - 1)
}

function flowY(position) {
  return 72 + Number(position || .5) * (FLOW_HEIGHT - 126)
}

function outcomePosition(index, count) {
  if (count <= 1) return .5
  return .16 + (index * .68) / (count - 1)
}

function curvePath(x1, y1, x2, y2) {
  const bend = Math.max(38, (x2 - x1) * .48)
  return `M ${x1} ${y1} C ${x1 + bend} ${y1}, ${x2 - bend} ${y2}, ${x2} ${y2}`
}

function resultLabel(result, locale) {
  const labels = {
    win: copy(locale, '胜', 'W'),
    loss: copy(locale, '负', 'L'),
    pending: copy(locale, '待赛', 'UP NEXT'),
    idle: copy(locale, '未出赛', 'NO MATCH')
  }
  return labels[result] || '—'
}

function SwissStandingRow({ row, seasonId, locale, t, selected, onSelect }) {
  const teamId = teamRouteId(row)
  const metrics = [
    { key: 'record', label: copy(locale, uiText("胜负", locale), 'W—L'), value: row.recordLabel },
    { key: 'buchholz', label: copy(locale, uiText("对手分", locale), 'BUCHHOLZ'), value: row.buchholz },
    { key: 'omw', label: copy(locale, uiText("对手胜率", locale), 'OMW'), value: row.opponentWinRateLabel },
    { key: 'diff', label: copy(locale, uiText("净胜", locale), 'DIFF'), value: row.mapDiffLabel }
  ]

  return (
    <li className={styles.swissLedgerRow} data-zone={row.status} data-selected={selected ? 'true' : undefined}>
      <span className={styles.swissLedgerRank}><small>NO.</small><b>{String(row.rank).padStart(2, '0')}</b></span>
      <button
        type="button"
        className={styles.swissLedgerTeam}
        aria-label={copy(locale, uiText("查看 {0} 的逐轮对阵", locale, [teamShort(row)]), `Show ${teamShort(row)} round-by-round matches`)}
        aria-pressed={selected}
        onClick={() => onSelect(teamId)}
      >
        <TeamLogo team={row} seasonId={seasonId} className={styles.swissLedgerLogo} />
        <span>
          <strong>{row.team_short_name || row.team_name}</strong>
          <small data-i18n-ignore>{row.team_name || row.team_short_name}</small>
        </span>
      </button>
      <dl className={styles.swissLedgerMetrics}>
        {metrics.map(metric => (
          <div key={metric.key}><dt>{metric.label}</dt><dd>{metric.value}</dd></div>
        ))}
      </dl>
      <span className={styles.swissLedgerZone}>{t(`advance.zone.${row.status}`, row.status)}</span>
    </li>
  )
}

function SwissFlowPool({ group, round, roundCount, selectedTeamId, seasonId }) {
  const selectedTeam = group.teams.find(team => teamRouteId(team) === selectedTeamId)
  const left = (flowRoundX(round, roundCount) / FLOW_WIDTH) * 100
  const top = (flowY(group.position) / FLOW_HEIGHT) * 100

  return (
    <div
      className={styles.swissFlowPool}
      data-selected={selectedTeam ? 'true' : undefined}
      style={{ '--flow-left': `${left}%`, '--flow-top': `${top}%` }}
    >
      <span><strong>{group.record}</strong><small>{String(group.teams.length).padStart(2, '0')}</small></span>
      <div className={styles.swissFlowPoolTeams}>
        {(selectedTeam ? [selectedTeam] : group.teams.slice(0, 3)).map(team => (
          <TeamLogo key={teamRouteId(team)} team={team} seasonId={seasonId} className={styles.swissFlowPoolLogo} />
        ))}
        {selectedTeam ? <b>{teamShort(selectedTeam)}</b> : group.teams.length > 3 ? <em>+{group.teams.length - 3}</em> : null}
      </div>
    </div>
  )
}

function SwissTraceStep({ step, seasonId, locale, withSeason }) {
  const content = (
    <>
      <header><span>ROUND {String(step.round).padStart(2, '0')}</span><b data-result={step.result}>{resultLabel(step.result, locale)}</b></header>
      <div>
        {step.opponent ? <TeamLogo team={step.opponent} seasonId={seasonId} className={styles.swissTraceOpponentLogo} /> : <i aria-hidden="true">◇</i>}
        <strong>{step.opponent ? teamShort(step.opponent) : copy(locale, uiText("无对阵", locale), 'NO MATCH')}</strong>
        <b>{step.score}</b>
      </div>
      <footer><span>{step.record}</span><small>{step.match ? formatShortDateTime(step.match) : copy(locale, uiText("本轮未出赛", locale), 'No match this round')}</small><em aria-hidden="true">{step.matchId ? '↗' : '·'}</em></footer>
    </>
  )

  return step.matchId
    ? <Link className={styles.swissTraceStep} data-result={step.result} to={withSeason(`/matches/${step.matchId}`)}>{content}</Link>
    : <div className={styles.swissTraceStep} data-result={step.result}>{content}</div>
}

export default function AdvanceSignalSwiss({
  overview,
  matches = [],
  zones,
  rows,
  tiebreakers,
  keyMatches,
  seasonId,
  locale = 'zh-CN',
  t,
  withSeason
}) {
  const [activeZone, setActiveZone] = useState('all')
  const [selectedTeamId, setSelectedTeamId] = useState(() => teamRouteId(rows[0]))
  const visibleRows = useMemo(
    () => activeZone === 'all' ? rows : rows.filter(row => row.status === activeZone),
    [activeZone, rows]
  )
  const flow = useMemo(
    () => buildSwissSignalFlow(rows, matches, overview.rounds),
    [matches, overview.rounds, rows]
  )
  const selectedRow = rows.find(row => teamRouteId(row) === selectedTeamId) || null
  const selectedSteps = selectedRow ? flow.stepsByTeam.get(teamRouteId(selectedRow)) || [] : []
  const archived = overview.seasonFinished || overview.swissFinished
  const zoneItems = zones.filter(zone => zone.count > 0 || !archived)
  const activeLabel = activeZone === 'all'
    ? copy(locale, '完整排名', 'Complete standings')
    : t(`advance.zone.${activeZone}`, activeZone)
  const rules = overview.rules || {}
  const outcomePositions = new Map(zoneItems.map((zone, index) => [zone.key, outcomePosition(index, zoneItems.length)]))
  const roundCount = flow.rounds.length

  const selectTeam = teamId => {
    setSelectedTeamId(teamId)
    setActiveZone('all')
  }

  const selectOutcome = zone => {
    setSelectedTeamId('')
    setActiveZone(zone)
  }

  return (
    <div className={styles.swissSignalWorkspace} data-chapter="01">
      <header className={styles.phaseSignalHeading} data-phase="swiss">
        <span>01 / SWISS STAGE / {seasonId}</span>
        <div>
          <h2>{copy(locale, <>{rows.length}{uiText(" 个信号，", locale)}<em>{uiText("六轮分流。", locale)}</em></>, <>{rows.length} signals.<em>Six rounds of separation.</em></>)}</h2>
          <p>{copy(locale, uiText("胜者向上，败者向下；每一场都在改变下一站。选择一支队伍，就能读出它的完整瑞士轮轨迹。", locale), 'Winners rise and losers fall. Every match changes the next stop; choose a team to trace its complete Swiss journey.')}</p>
        </div>
        <dl className={styles.phaseSignalSummary}>
          <div><dt>{copy(locale, uiText("轮次", locale), 'ROUNDS')}</dt><dd>{overview.currentRound}<small>/ {overview.rounds}</small></dd></div>
          <div><dt>{copy(locale, uiText("正式比赛", locale), 'OFFICIAL MATCHES')}</dt><dd>{overview.completedMatches}<small>/ {overview.totalMatches}</small></dd></div>
          <div><dt>{copy(locale, uiText("状态", locale), 'STATUS')}</dt><dd>{archived ? copy(locale, uiText("归档", locale), 'ARCHIVED') : copy(locale, uiText("进行中", locale), 'LIVE')}</dd></div>
        </dl>
      </header>

      <section className={styles.swissSignalBoard} data-has-selection={selectedRow ? 'true' : 'false'} aria-labelledby="signal-swiss-board-title">
        <header className={styles.signalBoardHeader}>
          <div>
            <span>SWISS SIGNAL FIELD / 01</span>
            <strong id="signal-swiss-board-title">{archived ? copy(locale, uiText("六轮轨迹已封存", locale), 'Six-round routes archived') : copy(locale, uiText("第 {0} 轮信号正在更新", locale, [overview.currentRound]), `Round ${overview.currentRound} signals updating`)}</strong>
          </div>
          <p>{copy(locale, uiText("灰线显示全场分流；选择队伍后，黄色信号只保留它真正走过的路线。", locale), 'Grey rails show the field; select a team and the yellow signal isolates its real route.')}</p>
        </header>

        <nav className={styles.swissTeamDock} aria-label={copy(locale, uiText("选择队伍查看六轮路径", locale), 'Choose a team to trace its six-round route')}>
          <button
            type="button"
            aria-pressed={!selectedRow}
            onClick={() => selectTeam('')}
          >
            <span>ALL SIGNALS</span><strong>{String(rows.length).padStart(2, '0')}</strong><small>{copy(locale, uiText("全局编组", locale), 'GLOBAL FIELD')}</small>
          </button>
          {rows.map(row => {
            const teamId = teamRouteId(row)
            return (
              <button
                key={teamId}
                type="button"
                aria-label={`${teamShort(row)} · ${row.team_name || row.team_short_name}`}
                aria-pressed={teamId === selectedTeamId}
                onClick={() => selectTeam(teamId)}
              >
                <TeamLogo team={row} seasonId={seasonId} className={styles.swissTeamDockLogo} />
                <strong>{teamShort(row)}</strong>
                <small>#{String(row.rank).padStart(2, '0')} · {row.recordLabel}</small>
              </button>
            )
          })}
        </nav>

        <div className={styles.swissFlowCanvasViewport}>
          <div className={styles.swissFlowCanvas} role="img" aria-label={copy(locale, uiText("六轮瑞士轮战绩分流图", locale), 'Six-round Swiss record routing map')}>
            <svg className={styles.swissFlowNetwork} viewBox={`0 0 ${FLOW_WIDTH} ${FLOW_HEIGHT}`} aria-hidden="true">
              <g className={styles.swissFlowAllRoutes}>
                {flow.edges.map(edge => (
                  <path
                    key={`${edge.fromRound}-${edge.fromRecord}-${edge.toRound}-${edge.toRecord}-${edge.result}`}
                    data-result={edge.result}
                    d={curvePath(
                      flowRoundX(edge.fromRound, roundCount),
                      flowY(edge.fromPosition),
                      flowRoundX(edge.toRound, roundCount),
                      flowY(edge.toPosition)
                    )}
                    style={{ '--flow-weight': Math.min(7, 1.2 + edge.count * .55) }}
                  />
                ))}
                {flow.finalEdges.map(edge => {
                  const position = outcomePositions.get(edge.status)
                  if (position === undefined) return null
                  return (
                    <path
                      key={`${edge.fromRecord}-${edge.status}`}
                      data-result={edge.status}
                      d={curvePath(
                        flowRoundX(edge.fromRound, roundCount),
                        flowY(edge.fromPosition),
                        FLOW_OUTCOME_X,
                        flowY(position)
                      )}
                      style={{ '--flow-weight': Math.min(8, 1.5 + edge.count * .6) }}
                    />
                  )
                })}
              </g>
              {selectedSteps.length ? (
                <g className={styles.swissFlowSelectedRoute}>
                  <path
                    data-result={selectedSteps[0].result}
                    d={curvePath(18, FLOW_HEIGHT / 2, flowRoundX(1, roundCount), flowY(selectedSteps[0].position))}
                  />
                  {selectedSteps.slice(1).map((step, index) => {
                    const previous = selectedSteps[index]
                    return (
                      <path
                        key={`${previous.round}-${step.round}`}
                        data-result={step.result}
                        d={curvePath(
                          flowRoundX(previous.round, roundCount),
                          flowY(previous.position),
                          flowRoundX(step.round, roundCount),
                          flowY(step.position)
                        )}
                      />
                    )
                  })}
                  {outcomePositions.has(selectedRow.status) ? (
                    <path
                      data-result={selectedRow.status}
                      d={curvePath(
                        flowRoundX(selectedSteps.at(-1).round, roundCount),
                        flowY(selectedSteps.at(-1).position),
                        FLOW_OUTCOME_X,
                        flowY(outcomePositions.get(selectedRow.status))
                      )}
                    />
                  ) : null}
                </g>
              ) : null}
            </svg>

            {flow.rounds.map(round => {
              const left = (flowRoundX(round.round, roundCount) / FLOW_WIDTH) * 100
              return (
                <div key={round.round} className={styles.swissFlowRoundLabel} style={{ '--flow-left': `${left}%` }}>
                  <span>R{String(round.round).padStart(2, '0')}</span>
                  <small>{round.completedMatches}/{round.matches}{round.byeRecords ? ` +${round.byeRecords}B` : ''}</small>
                </div>
              )
            })}

            {flow.rounds.flatMap(round => round.groups.map(group => (
              <SwissFlowPool
                key={`${round.round}-${group.record}`}
                group={group}
                round={round.round}
                roundCount={roundCount}
                selectedTeamId={selectedTeamId}
                seasonId={seasonId}
              />
            )))}

            {zoneItems.map((zone, index) => {
              const position = outcomePosition(index, zoneItems.length)
              const selectedOutcome = selectedRow?.status === zone.key
              return (
                <button
                  key={zone.key}
                  type="button"
                  className={styles.swissFlowOutcome}
                  data-zone={zone.key}
                  data-selected={selectedOutcome ? 'true' : undefined}
                  aria-pressed={!selectedRow && activeZone === zone.key}
                  style={{ '--flow-left': `${(FLOW_OUTCOME_X / FLOW_WIDTH) * 100}%`, '--flow-top': `${(flowY(position) / FLOW_HEIGHT) * 100}%` }}
                  onClick={() => selectOutcome(zone.key)}
                >
                  <span>{t(`advance.zone.${zone.key}`, zone.key)}</span>
                  <strong>{String(zone.count).padStart(2, '0')}</strong>
                  <small>{zoneDetail(zone.key, locale, rules)}</small>
                </button>
              )
            })}
          </div>
        </div>

        <ol className={styles.swissFlowMobileRounds} aria-label={copy(locale, uiText("各轮战绩编组", locale), 'Record groups by round')}>
          {flow.rounds.map(round => (
            <li key={round.round}>
              <header><strong>ROUND {String(round.round).padStart(2, '0')}</strong><span>{round.completedMatches} / {round.matches} {copy(locale, uiText("场完成", locale), 'COMPLETE')}{round.byeRecords ? ` · ${round.byeRecords} BYE` : ''}</span></header>
              <div>{round.groups.map(group => <span key={group.record}><b>{group.record}</b><small>{group.teams.length} {copy(locale, uiText("队", locale), 'TEAMS')}</small></span>)}</div>
            </li>
          ))}
        </ol>

        <nav className={styles.swissFlowMobileOutcomes} aria-label={copy(locale, uiText("按最终去向筛选", locale), 'Filter by final outcome')}>
          {zoneItems.map(zone => (
            <button key={zone.key} type="button" aria-pressed={!selectedRow && activeZone === zone.key} onClick={() => selectOutcome(zone.key)}>
              <span>{t(`advance.zone.${zone.key}`, zone.key)}</span><strong>{String(zone.count).padStart(2, '0')}</strong><small>{zoneDetail(zone.key, locale, rules)}</small>
            </button>
          ))}
        </nav>

        <div className={styles.swissFlowPrompt} data-selected={selectedRow ? 'true' : undefined}>
          <span>{selectedRow ? `SELECTED SIGNAL / #${String(selectedRow.rank).padStart(2, '0')}` : 'SELECT A SIGNAL'}</span>
          <strong>{selectedRow
            ? copy(locale, uiText("{0} 的黄色路径已锁定。", locale, [teamShort(selectedRow)]), `${teamShort(selectedRow)} is locked on the yellow route.`)
            : copy(locale, uiText("选择一支队伍，读出它在六轮赛制里的完整路径。", locale), 'Choose a team to reveal its complete route through the six-round field.')}</strong>
          <p>{selectedRow
            ? copy(locale, uiText("逐轮对手、比分和时间已收进下方排名工作台右侧。", locale), 'Round-by-round opponents, scores and times now sit beside the standings below.')
            : copy(locale, uiText("每个黄色节点都对应真实对局；胜利使用实线，失利使用虚线。", locale), 'Every yellow node is backed by a real match; wins use solid lines and losses use dashed lines.')}</p>
        </div>
      </section>

      <section className={styles.swissLedger} aria-labelledby="signal-swiss-ledger-title">
        <header className={styles.signalIndexHeader}>
          <div>
            <span>OFFICIAL ORDER / {String(visibleRows.length).padStart(2, '0')}</span>
            <h3 id="signal-swiss-ledger-title">{activeLabel}</h3>
          </div>
          <p>{zoneDetail(activeZone, locale, rules)} <b aria-hidden="true">↓</b></p>
        </header>

        <div className={styles.swissLedgerWorkspace}>
          <div className={styles.swissLedgerTable}>
            <div className={styles.swissLedgerHead} aria-hidden="true">
              <span>NO.</span><span>{copy(locale, uiText("战队", locale), 'TEAM')}</span><span>{copy(locale, uiText("胜负", locale), 'W—L')}</span><span>{copy(locale, uiText("对手分", locale), 'BUCHHOLZ')}</span><span>{copy(locale, uiText("对手胜率", locale), 'OMW')}</span><span>{copy(locale, uiText("净胜", locale), 'DIFF')}</span><span>{copy(locale, uiText("去向", locale), 'OUTCOME')}</span>
            </div>
            <div
              className={styles.swissLedgerScroller}
              tabIndex={0}
              aria-label={copy(locale, uiText("{0}，共 {1} 支队伍", locale, [activeLabel, visibleRows.length]), `${activeLabel}, ${visibleRows.length} teams`)}
            >
              <ol className={styles.swissLedgerRows}>
                {visibleRows.map(row => (
                  <SwissStandingRow
                    key={teamRouteId(row)}
                    row={row}
                    seasonId={seasonId}
                    locale={locale}
                    t={t}
                    selected={teamRouteId(row) === selectedTeamId}
                    onSelect={setSelectedTeamId}
                  />
                ))}
              </ol>
              {!visibleRows.length ? <p className={styles.swissLedgerEmpty}>{copy(locale, uiText("这一区域目前没有队伍。", locale), 'There are currently no teams in this outcome.')}</p> : null}
            </div>
            <footer className={styles.swissLedgerScrollFooter}>
              <span>{String(visibleRows.length).padStart(2, '0')} TEAMS / COMPACT INDEX</span>
              <p>{copy(locale, uiText("在此区域上下滚动查看完整排名", locale), 'Scroll this panel for the complete order')} <b aria-hidden="true">↕</b></p>
            </footer>
          </div>

          <aside className={styles.swissLedgerDetail} aria-live="polite">
            {selectedRow ? (
              <>
                <div className={styles.swissTraceIdentity}>
                  <span className={styles.swissTraceKicker}>SELECTED SIGNAL / #{String(selectedRow.rank).padStart(2, '0')}</span>
                  <TeamLogo team={selectedRow} seasonId={seasonId} className={styles.swissTraceIdentityLogo} />
                  <div><strong>{teamShort(selectedRow)}</strong><p data-i18n-ignore>{selectedRow.team_name || selectedRow.team_short_name}</p></div>
                  <dl>
                    <div><dt>{copy(locale, uiText("战绩", locale), 'RECORD')}</dt><dd>{selectedRow.recordLabel}</dd></div>
                    <div><dt>{copy(locale, uiText("排名", locale), 'RANK')}</dt><dd>{String(selectedRow.rank).padStart(2, '0')}</dd></div>
                    <div><dt>{copy(locale, uiText("去向", locale), 'OUTCOME')}</dt><dd>{t(`advance.zone.${selectedRow.status}`, selectedRow.status)}</dd></div>
                  </dl>
                  <Link className={styles.swissTraceProfileLink} to={withSeason(`/teams/${teamRouteId(selectedRow)}`)}>
                    <span>{copy(locale, uiText("查看队伍档案", locale), 'Open team profile')}</span><b aria-hidden="true">↗</b>
                  </Link>
                </div>
                <div className={styles.swissLedgerDetailBody}>
                  <header>
                    <span>MATCH TRACE / {String(selectedSteps.length).padStart(2, '0')}</span>
                    <strong>{copy(locale, uiText("逐轮具体对阵", locale), 'Round-by-round matches')}</strong>
                    <p>{copy(locale, uiText("胜利使用实线，失利使用虚线；点击卡片进入比赛记录。", locale), 'Wins use solid rails and losses use dashed rails. Open any card for the match record.')}</p>
                  </header>
                  <ol className={styles.swissLedgerDetailSteps} style={{ '--detail-row-count': Math.max(1, Math.ceil(selectedSteps.length / 2)) }}>
                    {selectedSteps.map(step => <li key={step.round}><SwissTraceStep step={step} seasonId={seasonId} locale={locale} withSeason={withSeason} /></li>)}
                  </ol>
                </div>
              </>
            ) : (
              <div className={styles.swissLedgerDetailEmpty}>
                <span>SELECT A TEAM / 00</span>
                <b aria-hidden="true">00</b>
                <strong>{copy(locale, uiText("从左侧排名选择队伍。", locale), 'Select a team from the standings.')}</strong>
                <p>{copy(locale, uiText("它的逐轮对手、比分、时间和最终去向会在这里展开。", locale), 'Its opponents, scores, dates and final outcome will unfold here.')}</p>
              </div>
            )}
          </aside>
        </div>
      </section>

      <section className={styles.swissMethodPanel} aria-labelledby="signal-swiss-method-title">
        <header>
          <div><span>DECISION ORDER / {String(tiebreakers.length).padStart(2, '0')}</span><strong id="signal-swiss-method-title">{copy(locale, uiText("同战绩时，按这个顺序判定。", locale), 'Ties are resolved in this order.')}</strong></div>
          <p>{copy(locale, uiText("胜场优先；之后依次比较对手强度、直接交手与地图表现。", locale), 'Match wins come first, followed by opponent strength, head-to-head results and map performance.')}</p>
        </header>
        <ol>
          {tiebreakers.map(rule => (
            <li key={`${rule.index}-${rule.key}`}><span>{String(rule.index).padStart(2, '0')}</span><strong>{t(`advance.tiebreaker.${rule.key}`, rule.key)}</strong></li>
          ))}
        </ol>
        {keyMatches.length ? (
          <aside className={styles.swissKeyMatches}>
            <span>KEY MATCHES</span>
            {keyMatches.map(match => (
              <Link key={matchRouteId(match)} to={withSeason(`/matches/${matchRouteId(match)}`)}>
                <strong>{teamShort(match.team_a)} <i>VS</i> {teamShort(match.team_b)}</strong>
                <small>{formatShortDateTime(match) || copy(locale, uiText("待定", locale), 'TBD')}</small>
                <b aria-hidden="true">↗</b>
              </Link>
            ))}
          </aside>
        ) : null}
      </section>
    </div>
  )
}
