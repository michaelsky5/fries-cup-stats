import { Link } from 'react-router-dom'
import { getMatchDisplayTeams } from '../../../lib/matchesSelectors.js'
import { formatMatchSchedule } from '../../../lib/scheduleFormat.js'
import { getMatchPath } from '../../../lib/matchDetailSelectors.js'
import styles from './MatchDetail.module.css'

function getLabel(match, locale) {
  if (!match) return ''
  const teams = getMatchDisplayTeams(match)
  const schedule = formatMatchSchedule(match, { locale })
  return `${teams.teamA.short} vs ${teams.teamB.short} · ${schedule.compact || schedule.title}`
}

export default function MatchDetailFooterNav({ adjacent, withSeason, returnTo, locale, t }) {
  const previousPath = adjacent.previous ? withSeason(getMatchPath(adjacent.previous)) : ''
  const nextPath = adjacent.next ? withSeason(getMatchPath(adjacent.next)) : ''

  return (
    <nav className={styles.footerNav} aria-label="Match navigation">
      {previousPath ? (
        <Link className={styles.footerNavLink} to={previousPath} state={{ returnTo }}>
          <span>{t('matchDetail.previous', 'Previous Match')}</span>
          <strong>{getLabel(adjacent.previous, locale)}</strong>
        </Link>
      ) : (
        <span className={styles.footerNavLink} aria-disabled="true">
          <span>{t('matchDetail.previous', 'Previous Match')}</span>
          <strong>-</strong>
        </span>
      )}

      <Link className={styles.footerNavLink} data-primary="true" to={returnTo || withSeason('/matches')}>
        <span>{t('matchDetail.back', 'Back to Matches')}</span>
        <strong>MATCHES</strong>
      </Link>

      {nextPath ? (
        <Link className={styles.footerNavLink} to={nextPath} state={{ returnTo }}>
          <span>{t('matchDetail.next', 'Next Match')}</span>
          <strong>{getLabel(adjacent.next, locale)}</strong>
        </Link>
      ) : (
        <span className={styles.footerNavLink} aria-disabled="true">
          <span>{t('matchDetail.next', 'Next Match')}</span>
          <strong>-</strong>
        </span>
      )}
    </nav>
  )
}
