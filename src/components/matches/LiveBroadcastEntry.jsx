import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { useState } from 'react'
import { Link, useLocation, useOutletContext } from 'react-router-dom'
import {
  getMatchDisplayTeams,
  getMatchStatus,
  getMatchStatusText,
  getMatchTimeLabel,
  getRoundText,
  safeArr
} from '../../lib/matchesSelectors.js'
import { getBroadcastInfo } from '../../lib/broadcastSelectors.js'
import { getReturnState, saveReturnScroll } from '../../lib/navigationState.js'
import TeamLogo from './TeamLogo.jsx'
import styles from './MatchHub.module.css'

const DEFAULT_VISIBLE_BROADCASTS = 4

function getMatchKey(match, index) {
  return match?.match_id || match?.id || `${match?.team_a?.team_name || 'a'}-${match?.team_b?.team_name || 'b'}-${index}`
}

function getBroadcastMatches(hub) {
  const seen = new Set()
  const candidates = [
    ...safeArr(hub?.upcomingRoundMatches),
    ...safeArr(hub?.currentRoundMatches)
  ]

  return candidates
    .filter((match, index) => {
      const key = getMatchKey(match, index)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .map(match => ({
      match,
      broadcast: getBroadcastInfo(match)
    }))
    .filter(row => row.broadcast.hasPublicInfo)
}

function getNickname(person) {
  if (!person) return ''
  if (typeof person !== 'object') return String(person).trim()
  return String(person.name || person.nickname || person.displayName || person.battleTag || '').trim()
}

function getNicknameList(people) {
  const seen = new Set()
  return safeArr(people)
    .map(getNickname)
    .filter(Boolean)
    .filter(name => {
      const key = name.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .join(' / ')
}

function getBroadcastStaffGroups(broadcast) {
  return {
    casterText: getNicknameList(broadcast?.casters),
    refereeText: getNicknameList(broadcast?.referees)
  }
}

function BroadcastTeam({ team, source, seasonId, align = 'left' }) {
  return (
    <span className={`${styles.broadcastTeam} ${align === 'right' ? styles.broadcastTeamRight : ''}`}>
      <TeamLogo team={source} seasonId={seasonId} className={styles.broadcastLogo} />
      <span>
        <strong>{team.short}</strong>
        <em>{team.full}</em>
      </span>
    </span>
  )
}

function BroadcastCard({ row, index }) {
  const uiLocale = useUiLocale()
  const { withSeason = path => path, seasonId } = useOutletContext()
  const location = useLocation()
  const { match, broadcast } = row
  const teams = getMatchDisplayTeams(match)
  const matchId = match?.match_id || match?.id || ''
  const primaryStream = broadcast.streamLinks[0] || null
  const roomCount = broadcast.streamLinks.length
  const staff = getBroadcastStaffGroups(broadcast)
  const status = getMatchStatus(match)
  const statusClass = status === 'live'
    ? styles.broadcastCardLive
    : status === 'finished'
      ? styles.broadcastCardFinished
      : ''
  const streamLabel = status === 'finished'
    ? '查看回放'
    : status === 'live'
      ? '观看直播'
      : '进入直播间'

  return (
    <article className={`${styles.broadcastCard} ${statusClass}`}>
      <div className={styles.broadcastCardTop}>
        <div className={styles.broadcastCardMeta}>
          <span>{String(index + 1).padStart(2, '0')}</span>
          <div>
            <strong>{getRoundText(match)}</strong>
            <time>{getMatchTimeLabel(match)}</time>
          </div>
        </div>
        <div className={styles.broadcastCardState}>
          {roomCount > 1 ? <small>{roomCount}{uiText(" 路直播", uiLocale)}</small> : null}
          <em>{getMatchStatusText(match)}</em>
        </div>
      </div>

      <div className={styles.broadcastDuel} title={`${teams.teamA.full} vs ${teams.teamB.full}`}>
        <BroadcastTeam team={teams.teamA} source={match?.team_a} seasonId={seasonId} align="right" />
        <b>VS</b>
        <BroadcastTeam team={teams.teamB} source={match?.team_b} seasonId={seasonId} />
      </div>

      <footer className={styles.broadcastFooter}>
        <div className={styles.broadcastCrew}>
          <span>{match?.format || 'TBD'}</span>
          {staff.casterText || staff.refereeText ? (
            <div className={styles.broadcastStaffLine}>
              {staff.casterText ? (
                <p title={uiText("解说 {0}", uiLocale, [staff.casterText])}>
                  <b>{uiText("解说", uiLocale)}</b>
                  {staff.casterText}
                </p>
              ) : null}
              {staff.refereeText ? (
                <p title={uiText("赛管 {0}", uiLocale, [staff.refereeText])}>
                  <b>{uiText("赛管", uiLocale)}</b>
                  {staff.refereeText}
                </p>
              ) : null}
            </div>
          ) : (
            <div className={styles.broadcastStaffLine} />
          )}
        </div>
        <div className={styles.broadcastActions}>
          {primaryStream ? (
            <a
              className={styles.broadcastStreamLink}
              href={primaryStream.url}
              target="_blank"
              rel="noreferrer"
            >
              {streamLabel} →
            </a>
          ) : null}
          <Link
            className={styles.broadcastDetailLink}
            to={withSeason(`/matches/${encodeURIComponent(matchId)}`)}
            state={getReturnState(location)}
            onClick={() => saveReturnScroll(location)}
            aria-label={uiText("比赛详情", uiLocale)}
            title={uiText("比赛详情", uiLocale)}
          >
            →
          </Link>
        </div>
      </footer>
    </article>
  )
}

export default function LiveBroadcastEntry({ hub }) {
  const uiLocale = useUiLocale()
  const [expanded, setExpanded] = useState(false)
  const rows = getBroadcastMatches(hub)
  const visibleRows = expanded ? rows : rows.slice(0, DEFAULT_VISIBLE_BROADCASTS)

  if (!rows.length) return null

  return (
    <section className={styles.broadcastEntry} aria-labelledby="live-broadcast-title">
      <header className={styles.broadcastHead}>
        <div>
          <span>LIVE DESK</span>
          <h2 id="live-broadcast-title">{uiText("直播入口", uiLocale)}</h2>
        </div>
        <div className={styles.broadcastHeadMeta}>
          <p>{uiText("当前显示 ", uiLocale)}{visibleRows.length} / {rows.length}{uiText(" 场", uiLocale)}</p>
          {rows.length > DEFAULT_VISIBLE_BROADCASTS ? (
            <button
              type="button"
              className={styles.broadcastHeadToggle}
              aria-expanded={expanded}
              onClick={() => setExpanded(value => !value)}
            >
              {expanded ? uiText("收起 −", uiLocale) : uiText("全部直播 +", uiLocale)}
            </button>
          ) : null}
        </div>
      </header>
      <div className={styles.broadcastRows}>
        {visibleRows.map((row, index) => (
          <BroadcastCard key={getMatchKey(row.match, index)} row={row} index={index} />
        ))}
      </div>
    </section>
  )
}
