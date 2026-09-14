import { translateUiText as uiText } from '../../lib/uiText.js'
import { useSearchParams } from 'react-router-dom'
import Link from './AdvanceRecordLink.jsx'
import { updateAdvanceReadingSearch } from './advanceReadingState.js'
import TeamLogo from '../matches/TeamLogo.jsx'
import PlayoffBracket from './PlayoffBracket.jsx'
import { PublishedTeamRoute } from './AdvanceSignalPlayoffs.jsx'
import { getMatchStatusLabelKey, teamFull, teamShort } from '../../lib/advanceSelectors.js'
import styles from './AdvanceSignal.module.css'

function copy(locale, zh, en) {
  return locale === 'en-US' ? en : zh
}

function matchRouteId(match) {
  return match?.id || match?.matchId || match?.match_id || ''
}

function teamKey(team) {
  return String(team?.team_id || team?.id || team?.team_short_name || team?.short || '')
}

function isComplete(match) {
  return ['completed', 'finished', 'final'].includes(String(match?.status || '').toLowerCase())
}

function slotSource(slot, locale) {
  if (slot?.type === 'seed' || slot?.seed) return `#${slot.seed}`
  if (slot?.winnerOf) return copy(locale, `M${slot.winnerOf} 胜`, `M${slot.winnerOf} W`)
  return 'TBD'
}

function formatSchedule(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).format(date)
}

function LcqSignalMatchCard({ match, seasonId, locale, withSeason, t }) {
  const winnerKey = teamKey(match?.winner)
  const href = matchRouteId(match) ? withSeason(`/matches/${matchRouteId(match)}`) : ''
  const firstTo = Math.floor(Number(match?.bestOf || 1) / 2) + 1
  const status = String(match?.status || 'pending').toLowerCase()
  const content = (
    <>
      <header>
        <span>{match?.label || `M${match?.number || '—'}`}</span>
        <small>FT{firstTo}</small>
      </header>
      <div className={styles.lcqSignalTeams}>
        {(match?.slots || []).slice(0, 2).map((slot, index) => {
          const won = Boolean(winnerKey && teamKey(slot.team) === winnerKey)
          return (
            <div key={`${slotSource(slot, locale)}-${teamKey(slot.team) || index}`} data-winner={won ? 'true' : undefined}>
              <span>{slotSource(slot, locale)}</span>
              <TeamLogo team={slot.team} seasonId={seasonId} className={styles.lcqSignalLogo} />
              <strong>{teamShort(slot.team)}</strong>
              <b>{match?.scores?.[index] ?? '—'}</b>
            </div>
          )
        })}
      </div>
      <footer><span>{formatSchedule(match?.scheduledAt) || t(getMatchStatusLabelKey(status), status)}</span><b aria-hidden="true">{href ? '↗' : '·'}</b></footer>
    </>
  )

  return href
    ? <Link className={styles.lcqSignalMatch} data-status={status} to={href}>{content}</Link>
    : <div className={styles.lcqSignalMatch} data-status={status}>{content}</div>
}

export default function AdvanceSignalBreakthrough({ state, seasonId, locale = 'zh-CN', t, withSeason, getPhaseHref }) {
  const layout = state?.layout
  const divisions = layout?.divisions || []
  const [params, setParams] = useSearchParams()
  const selectedDivision = Number(params.get('division')) || divisions[0]?.number || 1
  const setSelectedDivision = division => setParams(updateAdvanceReadingSearch(params, { division }), { replace: true, preventScrollReset: true })
  const activeDivision = divisions.find(division => division.number === selectedDivision) || divisions[0]
  const matches = layout
    ? divisions.flatMap(division => [division.playInMatch, ...division.roundOf16Matches, division.qualificationMatch].filter(Boolean))
    : state?.matches || []
  const completedMatches = matches.filter(isComplete).length
  const phaseComplete = Boolean(matches.length && completedMatches === matches.length)
  const activeMatches = activeDivision
    ? [activeDivision.playInMatch, ...activeDivision.roundOf16Matches, activeDivision.qualificationMatch].filter(Boolean)
    : []
  const activeWinner = activeDivision?.qualificationMatch?.winner
  const activeComplete = isComplete(activeDivision?.qualificationMatch)
  const activeNumber = activeDivision?.number || 1

  // The four-division route belongs to the Regular format. Other seasons
  // retain their published bracket instead of showing an unannounced route.
  if (!layout && state?.bracket?.rounds?.length) return (
    <div className={styles.lcqSignalWorkspace} data-chapter="02">
      <header className={styles.phaseSignalHeading} data-phase="breakthrough">
        <span>02 / BREAKTHROUGH / {seasonId}</span>
        <div>
          <h2>{copy(locale, <>{uiText('突围之路，', locale)}<em>{uiText('逐场回看。', locale)}</em></>, <>The breakthrough.{' '}<em>Match by match.</em></>)}</h2>
          <p>{copy(locale, uiText('按本届已发布的轮次与赛果，回看队伍的突围过程。', locale), 'Follow the published rounds and results from this event.')}</p>
        </div>
        <dl className={styles.phaseSignalSummary}><div><dt>{copy(locale, uiText('比赛', locale), 'MATCHES')}</dt><dd>{state.completedMatches}<small>/ {matches.length}</small></dd></div></dl>
      </header>
      <PublishedTeamRoute matches={state.bracket.rounds.flatMap(round => round.matches.map(match => ({ ...match, roundLabel: round.label })))} seasonId={seasonId} locale={locale} t={t} withSeason={withSeason} />
      <div className={styles.desktopBracket}><PlayoffBracket bracket={state.bracket} eyebrow="BREAKTHROUGH" title={copy(locale, uiText('突围赛晋级图', locale), 'Breakthrough bracket')} t={t} seasonId={seasonId} locale={locale} withSeason={withSeason} showFilter={false} /></div>
      <details className={styles.mobileBracketDisclosure} open={params.get('lcqBracket') === 'full'} onToggle={event => {
        const open = event.currentTarget.open
        if (open !== (params.get('lcqBracket') === 'full')) setParams(updateAdvanceReadingSearch(params, { lcqBracket: open ? 'full' : null }), { replace: true, preventScrollReset: true })
      }}><summary>{copy(locale, uiText('完整突围赛签表', locale), 'Complete breakthrough bracket')} <span aria-hidden="true">＋</span></summary><PlayoffBracket bracket={state.bracket} eyebrow="BREAKTHROUGH" title={copy(locale, uiText('突围赛晋级图', locale), 'Breakthrough bracket')} t={t} seasonId={seasonId} locale={locale} withSeason={withSeason} showFilter={false} /></details>
    </div>
  )

  return (
    <div className={styles.lcqSignalWorkspace} data-chapter="02">
      <header className={styles.phaseSignalHeading} data-phase="breakthrough">
        <span>02 / BREAKTHROUGH / {seasonId}</span>
        <div>
          <h2>{copy(locale, <>{uiText("四条路线，", locale)}<em>{uiText("四个出口。", locale)}</em></>, <>Four routes.{' '}<em>Four exits.</em></>)}</h2>
          <p>{copy(locale, uiText("每个分区五支队，任何一次失利都会结束突围。选择一条路线，看它如何收束成一个季后赛席位。", locale), 'Five teams enter each division and one loss ends the run. Choose a route and see how it narrows into one playoff berth.')}</p>
        </div>
        <dl className={styles.phaseSignalSummary}>
          <div><dt>{copy(locale, uiText("队伍", locale), 'TEAMS')}</dt><dd>{layout?.participantCount || '—'}</dd></div>
          <div><dt>{copy(locale, uiText("比赛", locale), 'MATCHES')}</dt><dd>{completedMatches}<small>/ {matches.length}</small></dd></div>
          <div><dt>{copy(locale, uiText("名额", locale), 'SLOTS')}</dt><dd>{layout?.advanceSlots || '—'}</dd></div>
        </dl>
      </header>

      {layout && activeDivision ? (
        <section className={styles.lcqSignalStory} aria-labelledby="signal-lcq-story-title">
          <header className={styles.signalBoardHeader}>
            <div>
              <span>BREAKTHROUGH CONTROL / {String(activeNumber).padStart(2, '0')}</span>
              <strong id="signal-lcq-story-title">{phaseComplete ? copy(locale, uiText("四个季后赛席位已确认", locale), 'Four playoff berths confirmed') : copy(locale, uiText("一个分区，只留下一个名字", locale), 'One division leaves one name')}</strong>
            </div>
            <Link to={getPhaseHref('playoffs')}><span>{copy(locale, uiText("进入季后赛", locale), 'OPEN PLAYOFFS')}</span><b aria-hidden="true">↗</b></Link>
          </header>

          <nav className={styles.lcqGateDock} aria-label={copy(locale, uiText("选择要查看的突围分区", locale), 'Choose a breakthrough division')}>
            {divisions.map(division => {
              const winner = division.qualificationMatch?.winner
              const active = division.number === activeNumber
              return (
                <button key={division.number} type="button" aria-pressed={active} onClick={() => setSelectedDivision(division.number)}>
                  <span className={styles.lcqGateLabel}>GATE {String(division.number).padStart(2, '0')}</span>
                  {winner ? <TeamLogo team={winner} seasonId={seasonId} className={styles.lcqGateLogo} /> : <i aria-hidden="true">◇</i>}
                  <strong>{teamShort(winner)}</strong>
                  <small>{division.seeds.map(seed => `#${seed}`).join(' · ')}</small>
                  <em>{winner ? copy(locale, uiText("已晋级", locale), 'QUALIFIED') : copy(locale, uiText("待决出", locale), 'PENDING')}</em>
                </button>
              )
            })}
          </nav>

          <div className={styles.lcqActiveRoute}>
            <aside className={styles.lcqRouteIdentity} data-complete={activeComplete ? 'true' : undefined}>
              <span>PLAYOFF SLOT / {String(activeNumber).padStart(2, '0')}</span>
              <span className={styles.lcqIdentityGhost} aria-hidden="true">{teamShort(activeWinner)}</span>
              {activeWinner ? <TeamLogo team={activeWinner} seasonId={seasonId} className={styles.lcqIdentityLogo} /> : null}
              <div>
                <small>{activeWinner ? copy(locale, uiText("突围成功", locale), 'ROUTE CLEARED') : copy(locale, uiText("等待晋级者", locale), 'AWAITING WINNER')}</small>
                <strong>{teamShort(activeWinner)}</strong>
                <p data-i18n-ignore>{activeWinner ? teamFull(activeWinner) : copy(locale, uiText("晋级赛结束后锁定", locale), 'Locked after qualification match')}</p>
              </div>
              <dl>
                <div><dt>{copy(locale, uiText("起点", locale), 'START')}</dt><dd>{activeDivision.seeds.length}<small>{copy(locale, uiText(" 队", locale), ' TEAMS')}</small></dd></div>
                <div><dt>{copy(locale, uiText("路径", locale), 'ROUTE')}</dt><dd>{activeMatches.length}<small>{copy(locale, uiText(" 场", locale), ' MATCHES')}</small></dd></div>
                <div><dt>{copy(locale, uiText("出口", locale), 'EXIT')}</dt><dd>01</dd></div>
              </dl>
            </aside>

            <div className={styles.lcqRoutePlan}>
              <header>
                <div><span>DIVISION {String(activeNumber).padStart(2, '0')}</span><strong>{copy(locale, uiText("五进一 · 单败路径", locale), 'Five to one · single elimination')}</strong></div>
                <p>{activeDivision.seeds.map(seed => `#${seed}`).join(' / ')}</p>
              </header>
              <div className={styles.lcqRoundFlow}>
                <section data-round="play-in">
                  <header><span>01 / PLAY-IN</span><strong>{copy(locale, uiText("入围赛", locale), 'Play-in')}</strong></header>
                  <LcqSignalMatchCard match={activeDivision.playInMatch} seasonId={seasonId} locale={locale} withSeason={withSeason} t={t} />
                </section>
                <span className={styles.lcqFlowArrow}><small>{copy(locale, uiText("胜者加入主线", locale), 'WINNER JOINS MAIN ROUTE')}</small><b aria-hidden="true">→</b></span>
                <section data-round="round-of-16">
                  <header><span>02 / ROUND OF 16</span><strong>{copy(locale, uiText("十六强", locale), 'Round of 16')}</strong></header>
                  <div>{activeDivision.roundOf16Matches.map(match => <LcqSignalMatchCard key={matchRouteId(match) || match.number} match={match} seasonId={seasonId} locale={locale} withSeason={withSeason} t={t} />)}</div>
                </section>
                <span className={styles.lcqFlowArrow}><small>{copy(locale, uiText("两支胜者会师", locale), 'WINNERS CONVERGE')}</small><b aria-hidden="true">→</b></span>
                <section data-round="qualification">
                  <header><span>03 / QUALIFICATION</span><strong>{copy(locale, uiText("晋级赛", locale), 'Qualification')}</strong></header>
                  <LcqSignalMatchCard match={activeDivision.qualificationMatch} seasonId={seasonId} locale={locale} withSeason={withSeason} t={t} />
                </section>
                <div className={styles.lcqRouteTarget}>
                  <span>PLAYOFFS</span>
                  <strong>{String(activeNumber).padStart(2, '0')}</strong>
                  <small>{teamShort(activeWinner)}</small>
                </div>
              </div>
            </div>
          </div>

          <footer className={styles.lcqStoryFooter}>
            <span>{String(completedMatches).padStart(2, '0')} / {String(matches.length).padStart(2, '0')} {copy(locale, uiText("场比赛完成", locale), 'MATCHES COMPLETE')}</span>
            <strong>{copy(locale, uiText("选择上方分区，读取另外三条晋级路径。", locale), 'Choose another gate above to read the other qualification routes.')}</strong>
          </footer>
        </section>
      ) : (
        <section className={styles.lcqSignalPending}>
          <span>FORMAT / PENDING</span>
          <h2>{copy(locale, uiText("突围赛路径待确认", locale), 'Breakthrough route pending')}</h2>
          <p>{copy(locale, uiText("赛制、对阵与名额发布后，这里会生成真实晋级路径。", locale), 'The route will appear once format, bracket and slots are published.')}</p>
        </section>
      )}
    </div>
  )
}
