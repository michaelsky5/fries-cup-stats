import { translateUiText as uiText } from '../../../lib/uiText.js'
import { useLayoutEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import TeamLogo from '../TeamLogo.jsx'
import styles from './matchDetailStyles.js'

const POSTER_SHORT_MIN_FONT_SIZE = 28

function splitScore(scoreLabel) {
  const parts = String(scoreLabel || 'VS').split(':').map(part => part.trim())
  if (parts.length !== 2) return { left: 'VS', right: '' }
  return { left: parts[0], right: parts[1] }
}

function getTeamPath(team, withSeason) {
  const routeId = String(team?.id || team?.short || team?.full || '').trim()
  if (!routeId || ['TBD', 'UNKNOWN', '-'].includes(routeId.toUpperCase())) return ''
  return withSeason(`/teams/${encodeURIComponent(routeId)}`)
}

function PosterTeamShortName({ children }) {
  const wrapRef = useRef(null)
  const textRef = useRef(null)

  useLayoutEffect(() => {
    const wrap = wrapRef.current
    const text = textRef.current
    if (!wrap || !text) return undefined

    let frame = 0
    let active = true

    const fit = () => {
      if (!active) return
      window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(() => {
        if (!active) return
        const availableWidth = wrap.clientWidth
        if (!availableWidth) return

        text.style.fontSize = ''
        const baseFontSize = Number.parseFloat(window.getComputedStyle(text).fontSize) || 98
        const naturalWidth = text.scrollWidth
        const fittedFontSize = naturalWidth > availableWidth
          ? Math.max(POSTER_SHORT_MIN_FONT_SIZE, Math.floor(baseFontSize * (availableWidth / naturalWidth)))
          : baseFontSize

        text.style.fontSize = `${fittedFontSize}px`
      })
    }

    fit()

    const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(fit)
    resizeObserver?.observe(wrap)
    window.addEventListener('resize', fit)
    document.fonts?.ready?.then(fit)

    return () => {
      active = false
      window.cancelAnimationFrame(frame)
      resizeObserver?.disconnect()
      window.removeEventListener('resize', fit)
    }
  }, [children])

  return (
    <div className={styles.posterTeamShortWrap} ref={wrapRef}>
      <strong ref={textRef}>{children}</strong>
    </div>
  )
}

function PosterTeam({ team, seasonId, winner, teamPath, returnState, onTeamNavigate, t }) {
  return (
    <div className={styles.posterTeam} data-winner={winner ? 'true' : 'false'}>
      <TeamLogo
        team={{ id: team.id, short: team.short, name: team.full }}
        seasonId={seasonId}
        teamShortName={team.short}
        teamName={team.full}
        className={styles.posterWatermark}
        large
      />
      <div className={styles.posterTeamIdentity}>
        <TeamLogo
          team={{ id: team.id, short: team.short, name: team.full }}
          seasonId={seasonId}
          teamShortName={team.short}
          teamName={team.full}
          className={styles.posterLogo}
          large
        />
        <div className={styles.posterTeamText}>
          {winner ? <span className={styles.winnerTag}>WINNER</span> : null}
          {teamPath ? (
            <Link
              to={teamPath}
              state={returnState}
              className={styles.posterTeamNameLink}
              aria-label={`${t('matchDetail.viewTeam', '\u67e5\u770b\u961f\u4f0d')} ${team.full || team.short}`}
              onClick={onTeamNavigate}
            >
              <PosterTeamShortName>{team.short}</PosterTeamShortName>
              <span className={styles.posterTeamFullName}>{team.full}</span>
            </Link>
          ) : (
            <>
              <PosterTeamShortName>{team.short}</PosterTeamShortName>
              <span className={styles.posterTeamFullName}>{team.full}</span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function BroadcastItem({ label, value, href }) {
  if (!value) return null
  const content = (
    <>
      <b>{label}</b>
      <strong>{value}</strong>
    </>
  )

  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer">
        {content}
      </a>
    )
  }

  return <span>{content}</span>
}

export function PosterBroadcast({ broadcast, locale = 'zh-CN' }) {
  if (!broadcast?.hasPublicInfo) return null
  const en = locale === 'en-US'

  return (
    <details className={styles.broadcastDetails}>
      <summary>{en ? 'Video & match staff' : uiText("录像与比赛人员", locale)}<span>{en ? 'View details' : uiText("查看资料", locale)} ↗</span></summary>
      <div className={styles.posterBroadcast}>
      {broadcast.streamLinks.map((stream, index) => (
        <BroadcastItem
          key={`${stream.url}-${index}`}
          label={stream.kind === 'archive' ? (en ? 'Tournament video archive' : uiText("赛事录像库", locale)) : stream.kind === 'replay' ? (en ? 'Match replay' : uiText("本场录像", locale)) : (en ? 'Live broadcast' : uiText("直播间", locale))}
          value={stream.kind === 'archive' ? (en ? 'Browse the event channel · search by opponent and date' : uiText("前往赛事账号，按对阵和日期查找", locale)) : (en ? 'Open video ↗' : uiText("打开观看 ↗", locale))}
          href={stream.url}
        />
      ))}
      <BroadcastItem label={en ? 'Casters' : uiText("解说", locale)} value={broadcast.casterText} />
      <BroadcastItem label={en ? 'Officials' : uiText("赛管", locale)} value={broadcast.refereeText} />
      </div>
    </details>
  )
}

export default function MatchPosterHero({
  dossier,
  seasonId,
  withSeason = path => path,
  returnState,
  onTeamNavigate,
  locale = 'zh-CN',
  t = (key, fallback) => fallback || key
}) {
  const score = splitScore(dossier.scoreLabel)
  const stage = dossier.match?.stage || 'MATCH'
  const round = dossier.match?.round || dossier.rawDisplayName || ''
  const winnerA = dossier.winnerSide === 'A'
  const winnerB = dossier.winnerSide === 'B'
  const teamAPath = getTeamPath(dossier.teamA, withSeason)
  const teamBPath = getTeamPath(dossier.teamB, withSeason)
  const en = locale === 'en-US'

  return (
    <section className={styles.posterShell} aria-labelledby="match-dossier-title">
      <div className={styles.posterFrame}>
        <div className={styles.posterStage}>
          <span>{stage}</span>
          {round ? <strong>{round}</strong> : null}
        </div>

        <div className={styles.posterBody}>
          <PosterTeam
            team={dossier.teamA}
            seasonId={seasonId}
            winner={winnerA}
            teamPath={teamAPath}
            returnState={returnState}
            onTeamNavigate={onTeamNavigate}
            t={t}
          />

          <div className={styles.posterScoreAxis}>
            <span className={styles.posterVersus}>MATCH DOSSIER</span>
            <h1 id="match-dossier-title" className={styles.posterScore} aria-label={`${dossier.title} · ${dossier.scoreLabel}`}>
              <span data-winner={winnerA ? 'true' : 'false'}>{score.left}</span>
              {score.right ? (
                <>
                  <b>:</b>
                  <span data-winner={winnerB ? 'true' : 'false'}>{score.right}</span>
                </>
              ) : null}
            </h1>
            <span className={styles.posterMatchup}>{dossier.teamA.short} vs {dossier.teamB.short}</span>
          </div>

          <PosterTeam
            team={dossier.teamB}
            seasonId={seasonId}
            winner={winnerB}
            teamPath={teamBPath}
            returnState={returnState}
            onTeamNavigate={onTeamNavigate}
            t={t}
          />
        </div>

        <div className={styles.posterInfoBand}>
          <span><small>{en ? 'SCHEDULE' : uiText("比赛时间", locale)}</small>{dossier.scheduleLabel}</span>
          <span><small>{en ? 'FORMAT' : uiText("比赛赛制", locale)}</small>{dossier.formatLabel}</span>
          <span data-status={dossier.state.isForfeit ? 'forfeit' : dossier.statusEn.toLowerCase()}><small>{en ? 'STATUS' : uiText("比赛状态", locale)}</small>{en ? (dossier.state.isForfeit ? 'Forfeit' : dossier.statusEn) : dossier.statusLabel}</span>
          <span><small>{en ? 'MAP RECORDS' : uiText("地图记录", locale)}</small>{dossier.mapCountLabel}</span>
        </div>
      </div>
    </section>
  )
}
