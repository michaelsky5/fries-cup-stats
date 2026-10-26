import { Link } from 'react-router-dom'
import { newspaperTeamName } from './weeklyReportPresentation.js'
import { playoffText } from './weeklyPlayoffNewspaper.js'
import styles from './WeeklyNewspaper.module.css'

export default function PlayoffNewspaperPath({ playoff, locale, withSeason }) {
  const t = key => playoffText(key, locale)
  const round = kind => playoff.rounds.find(item => item.kind === kind)?.items || []
  const placement = rank => playoff.placements.find(item => item.rank === rank)
  const fixture = item => <Link key={item.id} to={withSeason(`/matches/${encodeURIComponent(item.id)}`)} className={styles.playoffFixture} data-playoff-match={item.id} data-result-state={item.state}>
    {[item.a, item.b].map((team, index) => <div key={index} data-confirmed-winner={Boolean(team && item.winnerId === String(team.id || team.team_id))}>
      <span>{team ? newspaperTeamName(team) : t('pending')}</span><b>{item.scores?.[index] ?? '—'}</b>
    </div>)}
    <small>{[item.format, item.state === 'review' ? t('review') : item.state === 'ruling' ? t('ruling') : !item.winnerId ? t(item.state === 'live' ? 'live' : 'scheduled') : ''].filter(Boolean).join(' · ')}</small>
  </Link>
  // 票 2.51: the tiebreak qualifier opens the road to the title, one line above the bracket.
  const qualifiers = round('QUALIFIER')
  return <section className={styles.playoffPath} data-playoff-path aria-label={t('route')}>
    <header><h3>{t('route')}</h3><small>{t('note')}</small></header>
    {qualifiers.length > 0 && <div className={styles.playoffQualifier} data-playoff-qualifier>
      <h4>{t('QUALIFIER')}</h4>
      <ol>{qualifiers.map(item => {
        const side = team => <span data-confirmed-winner={Boolean(team && item.winnerId === String(team.id || team.team_id))}>{team ? newspaperTeamName(team) : t('pending')}</span>
        return <li key={item.id}><Link to={withSeason(`/matches/${encodeURIComponent(item.id)}`)} data-playoff-match={item.id} data-result-state={item.state}>
          {side(item.a)}<b>{item.scores ? `${item.scores[0]} : ${item.scores[1]}` : '—'}</b>{side(item.b)}
          <small>{[item.format, item.state === 'review' ? t('review') : item.state === 'ruling' ? t('ruling') : !item.winnerId ? t(item.state === 'live' ? 'live' : 'scheduled') : ''].filter(Boolean).join(' · ')}</small>
        </Link></li>
      })}</ol>
    </div>}
    <div className={styles.playoffBracket}>
      <div className={styles.playoffSemis}><h4>{t('SEMIFINAL')}</h4>{round('SEMIFINAL').map(fixture)}{!round('SEMIFINAL').length && <p>{t('missing')}</p>}</div>
      <div className={styles.playoffMedalMatches}><div><h4>{t('FINAL')}</h4>{round('FINAL').map(fixture)}{!round('FINAL').length && <p>{t('pending')}</p>}</div><div><h4>{t('THIRD_PLACE')}</h4>{round('THIRD_PLACE').map(fixture)}{!round('THIRD_PLACE').length && <p>{t('pending')}</p>}</div></div>
      <ol className={styles.playoffPodium}>{['champion', 'runnerUp', 'third'].map((key, index) => <li key={key} data-placement={index + 1} data-confirmed={Boolean(placement(index + 1))}><span>{String(index + 1).padStart(2, '0')}</span><div><small>{t(key)}</small><b>{placement(index + 1) ? newspaperTeamName(placement(index + 1).team) : t('pending')}</b></div></li>)}</ol>
    </div>
  </section>
}
