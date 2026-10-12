import { translateUiText as uiText } from '../../../lib/uiText.js'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import HeroArtwork from '../../media/HeroArtwork.jsx'
import { getMatchReviewMvp, getMatchReviewMvpUnavailableReason } from '../../../lib/matchReviewSelectors.js'
import { getRoleEnLabel, getRoleLabel } from '../../../lib/leaderboardSelectors.js'
import { formatInt } from '../../../lib/format.js'
import { SignalBattleTag, SignalHeroList } from './SignalPlayerData.jsx'
import styles from './SignalMatchSpotlight.module.css'
import { getStatisticalRatingNotes } from '../../../lib/statisticalRatingPresentation.js'

const METRIC_LABELS = { elim: 'Eliminations', ast: 'Assists', dth: 'Deaths', dmg: 'Damage', heal: 'Healing', block: 'Mitigation' }

export default function SignalMatchSpotlight({ dossier, locale, withSeason, returnState, onNavigate }) {
  const en = locale === 'en-US'
  const player = useMemo(() => getMatchReviewMvp(dossier), [dossier])
  if (!player) {
    const reason = getMatchReviewMvpUnavailableReason(dossier)
    if (!reason) return null
    return <div className={styles.unavailable} data-match-mvp-unavailable={reason}><strong>{en ? 'MATCH MVP' : uiText('全场 MVP', locale)}</strong><details><summary>{reason === 'REFERENCE_UNAVAILABLE' ? (en ? 'Insufficient references' : uiText('暂无足够参照，暂不评选统计 MVP', locale)) : reason === 'NO_ELIGIBLE_PLAYER' ? (en ? 'No eligible player' : uiText('暂无满足出场门槛的选手', locale)) : (en ? 'Player statistics unavailable' : uiText('选手统计尚未齐备', locale))}<span aria-hidden="true">＋</span></summary><p>{reason === 'REFERENCE_UNAVAILABLE' ? (en ? 'The current model compares against earlier competition days within the same version group. No usable scores are available for this match. Version groups are inferred from dates, and later matches do not backfill this award.' : uiText('当前模型使用同版本分组的此前比赛日参照，本场暂缺可用评分。版本分组按日期推定，后续比赛不会反过来补算本场 MVP。', locale)) : reason === 'NO_ELIGIBLE_PLAYER' ? (en ? `This match requires at least ${dossier.rating.awardEligibility.minimumMaps} map appearances for MVP eligibility.` : uiText('本场 MVP 至少需出场 {0} 图。', locale, [dossier.rating.awardEligibility.minimumMaps])) : (en ? 'An MVP can be selected once the published player records support a match rating.' : uiText('待已发布的选手记录能够支持全场评分后，再评选 MVP。', locale))}</p></details></div>
  }

  const team = dossier[`team${player.side}`]
  const entry = player.ratingEntry
  const coreStats = (entry.coreStats || []).filter(stat => Number.isFinite(Number(stat.value))).slice(0, 2)
  const role = en ? getRoleEnLabel(player.role) : uiText(getRoleLabel(player.role), locale)
  const hero = entry.most_played_hero
  const playerPath = player.playerId ? withSeason(`/players/${encodeURIComponent(player.playerId)}?role=${encodeURIComponent(player.role)}`) : ''

  return <section className={styles.spotlight} data-match-mvp={player.key} aria-labelledby="match-mvp-title">
    <div className={styles.profile}>
      <div className={styles.portrait} aria-hidden="true">
        {hero ? <HeroArtwork hero={hero} decorative priority locale={locale} variant="spotlight" /> : <span className={styles.monogram}>{team.short}</span>}
      </div>
      <div className={styles.identity}>
        <div className={styles.eyebrow}><h2 id="match-mvp-title">{en ? 'MATCH MVP' : uiText("全场 MVP", locale)}</h2></div>
        <div className={styles.playerName}>
          {playerPath ? <Link to={playerPath} state={returnState} onClick={onNavigate}>{player.displayName}<span aria-hidden="true">↗</span></Link> : <strong>{player.displayName}</strong>}
        </div>
        <div className={styles.byline}><strong>{team.short}</strong><span>{role}</span><span className={styles.battleTag} data-battle-tag><SignalBattleTag value={player.battleTag} en={en} /></span></div>
        <SignalHeroList row={player} en={en} />
      </div>
    </div>

    <div className={styles.performance}>
      <div className={styles.rating}>
        <span>{en ? 'Overall match rating' : uiText("全场综合评分", locale)}</span>
        <strong aria-label={`${en ? 'Match rating' : uiText("全场评分", locale)} ${player.rating.toFixed(1)} / 10`}>{player.rating.toFixed(1)}<small>/ 10</small></strong>
      </div>
      <dl className={styles.facts}>
        {coreStats.map(stat => <div key={stat.metricId}><dt>{en ? METRIC_LABELS[stat.metricId] || stat.label : uiText(stat.label, locale)}</dt><dd>{formatInt(stat.value, '—')}</dd></div>)}
        <div><dt>{en ? 'Maps played' : uiText("出场地图", locale)}</dt><dd>{player.maps.length}<small> / {dossier.mapRecords.length}</small></dd></div>
      </dl>
      <details className={styles.ratingInfo}><summary>{en ? 'How ratings work' : uiText("评分口径", locale)}<span aria-hidden="true">＋</span></summary><div><p>{en ? 'Match and map ratings use the same scale. Full-match performance is weighted by playtime within each role, then converted to a rating.' : uiText("全场与单图评分使用同一刻度。全场先按职责和出场时间汇总表现，再换算评分。", locale)}</p><p>{entry.statisticalRating ? (en ? 'Statistical ratings have no map-win bonus.' : uiText('统计表现分不增加单图胜方加分。', locale)) : en ? 'Map win bonuses do not carry into multi-map match ratings.' : uiText("单图胜方加分不计入多图全场评分。", locale)}{entry.matchAwardMinimumMaps > 0 ? (en ? ` MVP eligibility requires at least ${entry.matchAwardMinimumMaps} map appearances.` : uiText(" 本场 MVP 至少需出场 {0} 图。", locale, [entry.matchAwardMinimumMaps])) : ''}</p>{getStatisticalRatingNotes(entry, locale).map(note => <p key={note}>{uiText(note, locale)}</p>)}</div></details>
    </div>
  </section>
}
