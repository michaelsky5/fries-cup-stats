import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
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
  isPrimaryFavoriteTeam,
  originPhase = 'swiss',
  singleElimination = false
}) {
  const uiLocale = useUiLocale()
  const champion = result.champion
  const finalMatch = result.grandFinal

  return (
    <div className={styles.phaseStack}>
      <section className={styles.finalHero}>
        <div className={styles.finalChampionBlock}>
          <span className={styles.sectionLabel}>CHAMPION</span>
          <div className={styles.finalChampionIdentity}>
            <TeamLogo team={champion} seasonId={seasonId} className={styles.finalHeroLogo} />
            <div>
              <span className={styles.finalChampionSeason}>{seasonId} · SEASON WINNER</span>
              <h2>{teamShort(champion)}</h2>
              <p>{teamFull(champion)}</p>
            </div>
          </div>
        </div>
        <div className={styles.finalMatchBlock}>
          <div className={styles.finalMatchHeading}>
            <span>{t('advance.final.grandFinal', uiText("总决赛", uiLocale))}</span>
            <em>GRAND FINAL · FT4</em>
          </div>
          {finalMatch ? (
            <>
              <strong>{teamShort(finalMatch.team_a)} {result.scoreLabel} {teamShort(finalMatch.team_b)}</strong>
              <p>{teamFull(finalMatch.team_a)} vs {teamFull(finalMatch.team_b)}</p>
              <Link to={withSeason(`/matches/${matchRouteId(finalMatch)}`)}>
                {t('advance.common.details', uiText("进入比赛详情", uiLocale))} →
              </Link>
            </>
          ) : (
            <strong>{t('advance.final.noGrandFinal', uiText("暂无总决赛记录", uiLocale))}</strong>
          )}
        </div>
      </section>

      <PlayoffBracket
        bracket={playoffBracket}
        eyebrow="PLAYOFFS"
        title={t('advance.playoffs.fullBracket', uiText("完整季后赛晋级图", uiLocale))}
        t={t}
        seasonId={seasonId}
        withSeason={withSeason}
        isFavoriteTeam={isFavoriteTeam}
        isPrimaryFavoriteTeam={isPrimaryFavoriteTeam}
        showFilter={!singleElimination}
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

      <Link to={withSeason(`/advance?phase=${originPhase}`)} className={styles.secondaryAction}>
        {singleElimination ? t('advance.final.viewGroups', uiText("查看小组赛最终积分榜", uiLocale)) : t('advance.final.viewSwiss', uiText("查看瑞士轮最终积分榜", uiLocale))} →
      </Link>
    </div>
  )
}
