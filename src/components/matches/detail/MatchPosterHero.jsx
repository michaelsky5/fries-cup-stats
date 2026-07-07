import { Link } from 'react-router-dom'
import TeamLogo from '../TeamLogo.jsx'
import styles from './MatchDetail.module.css'

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
              <strong>{team.short}</strong>
              <span className={styles.posterTeamFullName}>{team.full}</span>
            </Link>
          ) : (
            <>
              <strong>{team.short}</strong>
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

function PosterBroadcast({ broadcast }) {
  if (!broadcast?.hasPublicInfo) return null

  return (
    <div className={styles.posterBroadcast}>
      {broadcast.streamLinks.map((stream, index) => (
        <BroadcastItem
          key={`${stream.url}-${index}`}
          label={stream.label || '\u76f4\u64ad\u95f4'}
          value={stream.url}
          href={stream.url}
        />
      ))}
      <BroadcastItem label={'\u89e3\u8bf4'} value={broadcast.casterText} />
      <BroadcastItem label={'\u8d5b\u7ba1'} value={broadcast.refereeText} />
    </div>
  )
}

export default function MatchPosterHero({
  dossier,
  seasonId,
  withSeason = path => path,
  returnState,
  onBack,
  onTeamNavigate,
  t = (key, fallback) => fallback || key
}) {
  const score = splitScore(dossier.scoreLabel)
  const stage = dossier.match?.stage || 'MATCH'
  const round = dossier.match?.round || dossier.rawDisplayName || ''
  const winnerA = dossier.winnerSide === 'A'
  const winnerB = dossier.winnerSide === 'B'
  const teamAPath = getTeamPath(dossier.teamA, withSeason)
  const teamBPath = getTeamPath(dossier.teamB, withSeason)

  return (
    <section className={styles.posterShell} aria-labelledby="match-dossier-title">
      <button type="button" className={styles.posterBack} onClick={onBack}>
        {t('matchDetail.back', 'Back to Matches')} {'->'}
      </button>

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
            <h1 id="match-dossier-title" className={styles.posterScore}>
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
          <span>{dossier.scheduleLabel}</span>
          <span>{dossier.match?.format || '-'}</span>
          <span>{dossier.statusLabel}</span>
          <span>{dossier.mapCountLabel}</span>
          {dossier.internalId ? <em>{dossier.internalId}</em> : null}
        </div>
        <PosterBroadcast broadcast={dossier.broadcast} />
      </div>
    </section>
  )
}
