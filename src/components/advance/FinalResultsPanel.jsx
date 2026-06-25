import { Link } from 'react-router-dom'
import TeamLogo from '../matches/TeamLogo.jsx'
import ChampionPath from './ChampionPath.jsx'
import FinalRanking from './FinalRanking.jsx'
import PlayoffBracket from './PlayoffBracket.jsx'
import { teamFull, teamShort } from '../../lib/advanceSelectors.js'
import styles from '../../pages/advance/AdvancePage.module.css'

function matchRouteId(match) {
  return match?.match_id || match?.id || ''
}

export default function FinalResultsPanel({
  result,
  playoffBracket,
  seasonId,
  t,
  withSeason,
  isFavoriteTeam,
  isPrimaryFavoriteTeam
}) {
  const champion = result.champion
  const finalMatch = result.grandFinal

  return (
    <div className={styles.phaseStack}>
      <section className={styles.finalHero}>
        <div className={styles.finalChampionBlock}>
          <span className={styles.sectionLabel}>CHAMPION</span>
          <TeamLogo team={champion} seasonId={seasonId} className={styles.finalHeroLogo} />
          <h2>{teamShort(champion)}</h2>
          <p>{teamFull(champion)}</p>
        </div>
        <div className={styles.finalMatchBlock}>
          <span>{t('advance.final.grandFinal', '总决赛')}</span>
          {finalMatch ? (
            <>
              <strong>{teamShort(finalMatch.team_a)} {result.scoreLabel} {teamShort(finalMatch.team_b)}</strong>
              <Link to={withSeason(`/matches/${matchRouteId(finalMatch)}`)}>
                {t('advance.common.details', '进入比赛详情')} →
              </Link>
            </>
          ) : (
            <strong>{t('advance.final.noGrandFinal', '暂无总决赛记录')}</strong>
          )}
        </div>
      </section>

      <PlayoffBracket
        bracket={playoffBracket}
        eyebrow="PLAYOFFS"
        title={t('advance.playoffs.fullBracket', '完整季后赛晋级图')}
        t={t}
        seasonId={seasonId}
        withSeason={withSeason}
        isFavoriteTeam={isFavoriteTeam}
        isPrimaryFavoriteTeam={isPrimaryFavoriteTeam}
      />

      <ChampionPath
        champion={champion}
        path={result.championPath}
        seasonId={seasonId}
        t={t}
        withSeason={withSeason}
      />

      <FinalRanking
        rows={result.finalRanking}
        seasonId={seasonId}
        t={t}
        withSeason={withSeason}
        isFavoriteTeam={isFavoriteTeam}
        isPrimaryFavoriteTeam={isPrimaryFavoriteTeam}
      />

      <Link to={withSeason('/advance?phase=swiss')} className={styles.secondaryAction}>
        {t('advance.final.viewSwiss', '查看瑞士轮最终积分榜')} →
      </Link>
    </div>
  )
}
