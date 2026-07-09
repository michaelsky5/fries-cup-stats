import { useState } from 'react'
import { Link, useLocation, useOutletContext } from 'react-router-dom'
import {
  getMatchDisplayTeams,
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
  const { withSeason = path => path, seasonId } = useOutletContext()
  const location = useLocation()
  const { match, broadcast } = row
  const teams = getMatchDisplayTeams(match)
  const matchId = match?.match_id || match?.id || ''
  const primaryStream = broadcast.streamLinks[0] || null
  const roomCount = broadcast.streamLinks.length
  const staff = getBroadcastStaffGroups(broadcast)

  return (
    <article className={styles.broadcastCard}>
      <div className={styles.broadcastCardTop}>
        <span>{String(index + 1).padStart(2, '0')}</span>
        <strong>{getRoundText(match)}</strong>
        <time>{getMatchTimeLabel(match)}</time>
        <em>{getMatchStatusText(match)}</em>
        <div className={styles.broadcastActions}>
          {primaryStream ? (
            <a href={primaryStream.url} target="_blank" rel="noreferrer">
              进入直播间 →
            </a>
          ) : null}
          {roomCount > 1 ? <span>共 {roomCount} 个直播间</span> : null}
          <Link
            to={withSeason(`/matches/${encodeURIComponent(matchId)}`)}
            state={getReturnState(location)}
            onClick={() => saveReturnScroll(location)}
          >
            比赛详情 →
          </Link>
        </div>
      </div>

      <div className={styles.broadcastDuel} title={`${teams.teamA.full} vs ${teams.teamB.full}`}>
        <BroadcastTeam team={teams.teamA} source={match?.team_a} seasonId={seasonId} align="right" />
        <b>VS</b>
        <BroadcastTeam team={teams.teamB} source={match?.team_b} seasonId={seasonId} />
      </div>

      <div className={styles.broadcastCrew}>
        <span>{match?.format || 'TBD'}</span>
        {staff.casterText || staff.refereeText ? (
          <div className={styles.broadcastStaffLine}>
            {staff.casterText ? (
              <p title={`解说 ${staff.casterText}`}>
                <b>解说</b>
                {staff.casterText}
              </p>
            ) : null}
            {staff.refereeText ? (
              <p title={`赛管 ${staff.refereeText}`}>
                <b>赛管</b>
                {staff.refereeText}
              </p>
            ) : null}
          </div>
        ) : (
          <div className={styles.broadcastStaffLine} />
        )}
      </div>
    </article>
  )
}

export default function LiveBroadcastEntry({ hub }) {
  const [expanded, setExpanded] = useState(false)
  const rows = getBroadcastMatches(hub)
  const visibleRows = expanded ? rows : rows.slice(0, DEFAULT_VISIBLE_BROADCASTS)

  if (!rows.length) return null

  return (
    <section className={styles.broadcastEntry} aria-labelledby="live-broadcast-title">
      <header className={styles.broadcastHead}>
        <div>
          <span>LIVE DESK</span>
          <h2 id="live-broadcast-title">直播入口</h2>
        </div>
        <p>
          {rows.length > DEFAULT_VISIBLE_BROADCASTS
            ? `默认显示 ${DEFAULT_VISIBLE_BROADCASTS} 场，可展开全部 ${rows.length} 场`
            : `已公布直播信息的本轮比赛 · ${rows.length} 场`}
        </p>
      </header>
      <div className={styles.broadcastRows}>
        {visibleRows.map((row, index) => (
          <BroadcastCard key={getMatchKey(row.match, index)} row={row} index={index} />
        ))}
      </div>
      {rows.length > DEFAULT_VISIBLE_BROADCASTS ? (
        <button
          type="button"
          className={styles.broadcastToggle}
          aria-expanded={expanded}
          onClick={() => setExpanded(value => !value)}
        >
          {expanded ? '收起直播场次' : `展开全部 ${rows.length} 场直播`}
        </button>
      ) : null}
    </section>
  )
}
