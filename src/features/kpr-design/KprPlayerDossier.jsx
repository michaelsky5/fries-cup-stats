import { translateUiText as uiText } from '../../lib/uiText.js'
import { Link } from 'react-router-dom'
import HeroArtwork from '../../components/media/HeroArtwork.jsx'
import { formatOwHeroName } from '../../lib/heroes.js'
import { getEntrySeasonScoreMeta, getRoleLabel } from '../../lib/leaderboardSelectors.js'
import { getSeasonRatingLabel } from '../../lib/seasonRatingPolicy.js'
import SeasonRating from '../rating/SeasonRating.jsx'
import { getRoleCoreMetricIds, PUBLIC_METRICS } from '../../lib/leaderboardScoring.js'
import { formatLeaderboardStat } from '../../components/leaderboard/leaderboardFormat.js'
import { playerLabel } from './kprSelectors.js'
import { getRankingValue } from './rankingPresentation.js'
import styles from './KprLeaderboard.module.css'

export default function KprPlayerDossier({ entry, rank, rankScope, mode, modeLabel, locale, withSeason, returnState, isFavorite, isCompared, compareDisabled, compareLimitReached, onToggleFavorite, onToggleCompare, onProfileNavigate, id }) {
  const isEn = locale === 'en-US'
  if (!entry) return <div className={styles.emptyDossier}><span>PLAYER DOSSIER</span><p>{isEn ? 'A player’s season, in focus.' : uiText("一位选手，一份赛季档案。", locale)}</p><small>{isEn ? 'Select a matching name to explore.' : uiText("找到选手后，在这里继续查看。", locale)}</small></div>
  const metrics = getRoleCoreMetricIds(entry.role, entry.most_played_hero).slice(0, 3)
  const sampleMeta = getEntrySeasonScoreMeta(entry, locale)
  const comparisonReason = compareDisabled ? (isEn ? 'Same-role comparison only' : uiText("仅支持同职责比较", locale)) : compareLimitReached && !isCompared ? (isEn ? '4 selected; remove one to change' : uiText("已选满 4 位，移出后可更换", locale)) : ''
  return <article className={styles.dossier} id={id} aria-label={isEn ? 'Player dossier preview' : uiText("选手档案预览", locale)}>
    <div className={styles.dossierTop}><span>{isEn ? 'IN FOCUS / PLAYER' : uiText("当前选手 / PLAYER", locale)}</span><button type="button" aria-label={`${isFavorite ? (isEn ? 'Unfollow' : uiText("取消关注", locale)) : (isEn ? 'Follow player' : uiText("关注选手", locale))}：${playerLabel(entry)}`} aria-pressed={isFavorite} onClick={() => onToggleFavorite(entry)}>{isFavorite ? '★' : '☆'}</button></div>
    <div className={styles.dossierVisual}>
      <div className={styles.dossierRank}><small>{rankScope === 'ALL' ? (isEn ? 'Overall rank' : uiText("综合榜名次", locale)) : (isEn ? 'Role rank' : uiText("职责榜名次", locale))}</small><b>{rank ? String(rank).padStart(2, '0') : '—'}</b></div>
      <div className={styles.dossierArt}><HeroArtwork hero={entry.most_played_hero} variant="spotlight" decorative priority locale={locale} /></div>
      <span className={styles.dossierHeroName}>{isEn ? 'Most played' : uiText("常用英雄", locale)} / {formatOwHeroName(entry.most_played_hero, locale)}</span>
    </div>
    <div className={styles.dossierPerson}>
      <div className={styles.dossierIdentity}><span>{entry.team_short_name || entry.team_name || '—'} <b>/</b> {isEn ? entry.role : uiText(getRoleLabel(entry.role), locale)}</span><h2>{playerLabel(entry)}</h2><p>{entry.battleTag || entry.player_id}</p></div>
      <div className={styles.dossierRating}><span>{getSeasonRatingLabel(entry, locale)}</span><SeasonRating entry={entry} locale={locale} variant="large" /><p>{sampleMeta || (isEn ? 'Season rating' : uiText("赛季评分", locale))}</p></div>
    </div>
    <div className={styles.dossierActions}>
      <Link to={withSeason(`/players/${encodeURIComponent(entry.player_id)}?role=${entry.role}`)} state={returnState} onClick={onProfileNavigate}>{isEn ? 'Full player profile' : uiText("查看完整选手档案", locale)}<span aria-hidden="true">↗</span></Link>
      <button type="button" aria-pressed={isCompared} disabled={Boolean(comparisonReason)} onClick={() => onToggleCompare(entry, !isCompared)}>{comparisonReason || (isCompared ? (isEn ? 'Remove from comparison' : uiText("移出比较", locale)) : (isEn ? 'Compare in this role' : uiText("加入同职责比较", locale)))}<span aria-hidden="true">{isCompared ? '✓' : '+'}</span></button>
    </div>
    <dl className={styles.dossierSample}><div><dt>{isEn ? 'Maps played' : uiText("出场地图", locale)}</dt><dd>{entry.roleMapsPlayed || 0}<small>{isEn ? ' maps' : uiText(" 图", locale)}</small></dd></div><div><dt>{isEn ? 'Time played' : uiText("出场时间", locale)}</dt><dd>{Math.round(entry.roleTimeMins || 0)}<small>{isEn ? ' min' : uiText(" 分钟", locale)}</small></dd></div><div><dt>{isEn ? 'Matches' : uiText("参与比赛", locale)}</dt><dd>{entry.roleMatchesPlayed ?? '—'}<small>{isEn ? ' played' : uiText(" 场", locale)}</small></dd></div></dl>
    <div className={styles.dossierMetrics}><div><span>{isEn ? 'Core statistics' : uiText("核心数据", locale)}</span><b>{modeLabel}</b></div><dl>{metrics.map(id => {
      const metric = PUBLIC_METRICS.find(item => item.id === id)
      const value = getRankingValue(entry, id, mode)
      return <div key={id}><dt>{isEn ? metric?.short : uiText(metric?.label, locale)}</dt><dd>{value === null ? '—' : formatLeaderboardStat(value, mode, id)}</dd></div>
    })}</dl></div>
  </article>
}

