import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import TeamLobbyEntry from '../../features/team-lobby/TeamLobbyEntry.jsx'
import { getLobbyConfig } from '../../features/team-lobby/lobbyApi.js'
import { pickUiLocale } from '../../lib/uiText.js'
import styles from './HomeTopEntry.module.css'

const OPEN_LOBBY_MODES = new Set(['READ_ONLY', 'WRITE'])
const MAX_TIMER_MS = 2 ** 31 - 1

// Read the lobby switch once per page load; a failed read is retried on the next visit.
let lobbyConfigRequest = null
function loadLobbyConfig() {
  lobbyConfigRequest ??= getLobbyConfig().catch(() => {
    lobbyConfigRequest = null
    return null
  })
  return lobbyConfigRequest
}

function registrationDeadline(db) {
  const registration = db?.season?.rules?.registration
  const closesAt = Date.parse(registration?.closesAt || '')
  return registration?.enabled === true && Number.isFinite(closesAt) ? closesAt : null
}

// One slot above the season overview, filled by whatever is open right now:
// season registration until its deadline, then the team lobby once System
// opens it. A lobby that is OFF, still loading or unreadable shows nothing, so
// Home never links to a page that only says "not open yet".
export default function HomeTopEntry({ db, season, locale, withSeason }) {
  const deadline = registrationDeadline(db)
  const [now, setNow] = useState(() => Date.now())
  const [lobbyOpen, setLobbyOpen] = useState(false)
  const registrationOpen = deadline !== null && now < deadline

  useEffect(() => {
    if (!registrationOpen) return undefined
    const timer = setTimeout(() => setNow(Date.now()), Math.min(deadline - Date.now() + 1000, MAX_TIMER_MS))
    return () => clearTimeout(timer)
  }, [deadline, registrationOpen])

  useEffect(() => {
    if (registrationOpen) return undefined
    let active = true
    loadLobbyConfig().then(config => {
      if (active) setLobbyOpen(OPEN_LOBBY_MODES.has(config?.mode))
    })
    return () => { active = false }
  }, [registrationOpen])

  if (registrationOpen) return <RegistrationBand deadline={deadline} season={season} locale={locale} withSeason={withSeason} />
  return lobbyOpen ? <div className={styles.lobbySlot}><TeamLobbyEntry locale={locale} /></div> : null
}

function RegistrationBand({ deadline, season, locale, withSeason }) {
  const closes = new Intl.DateTimeFormat(String(locale).startsWith('en') ? 'en-GB' : 'zh-CN', {
    timeZone: 'Asia/Shanghai', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false
  }).format(new Date(deadline))
  return <section className={styles.band} data-home-registration="true" aria-label={pickUiLocale(locale, '队伍报名', 'Team registration', '팀 등록', '隊伍報名')} data-i18n-ignore>
    <p className={styles.copy}>
      <strong>{pickUiLocale(locale, '队伍报名开放中', 'Team registration is open', '팀 등록 진행 중', '隊伍報名開放中')}</strong>
      <span>{pickUiLocale(locale, `${closes} 截止`, `Closes ${closes} (UTC+8)`, `${closes} 마감 (UTC+8)`, `${closes} 截止`)}</span>
    </p>
    <Link className={styles.action} to={withSeason(`/participate/${encodeURIComponent(season.id)}`)}>
      {pickUiLocale(locale, '去报名', 'Register', '등록하기', '去報名')}<span aria-hidden="true">→</span>
    </Link>
  </section>
}
