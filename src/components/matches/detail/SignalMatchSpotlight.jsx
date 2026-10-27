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
    return <div className={styles.unavailable} data-match-mvp-unavailable={reason}><strong>{en ? 'MATCH MVP' : uiText('全场 MVP', locale)}</strong><details><summary>{reason === 'REFERENCE_UNAVAILABLE' ? (en ? 'Award evidence incomplete' : uiText('MVP 评选依据尚未齐备', locale)) : reason === 'NO_ELIGIBLE_PLAYER' ? (en ? 'No eligible player' : uiText('暂无满足出场门槛的选手', locale)) : (en ? 'Player statistics unavailable' : uiText('选手统计尚未齐备', locale))}<span aria-hidden="true">＋</span></summary><p>{reason === 'REFERENCE_UNAVAILABLE' ? (en ? 'No reference rating is available, and the published match records do not yet support an independent award comparison.' : uiText('当前评分缺少参照，已发布的本场记录也暂不足以完成独立 MVP 评选。', locale)) : reason === 'NO_ELIGIBLE_PLAYER' ? (en ? `This match requires at least ${dossier.rating.awardEligibility.minimumMaps} map appearances for MVP eligibility.` : uiText('本场 MVP 至少需出场 {0} 图。', locale, [dossier.rating.awardEligibility.minimumMaps])) : (en ? 'An MVP can be selected once the published player records support a match rating.' : uiText('待已发布的选手记录能够支持全场评分后，再评选 MVP。', locale))}</p></details></div>
  }

  const team = dossier[`team${player.side}`]
  const matchRelative = player.awardMethod === 'MATCH_RELATIVE'
  const entry = player.awardEntry || player.ratingEntry
  const coreStats = (entry.coreStats || []).filter(stat => Number.isFinite(Number(stat.value))).slice(0, 2)
  const role = en ? getRoleEnLabel(player.role) : uiText(getRoleLabel(player.role), locale)
  const hero = entry.most_played_hero
  const playerPath = player.playerId ? withSeason(`/players/${encodeURIComponent(player.playerId)}?role=${encodeURIComponent(player.role)}`) : ''

  return <section className={styles.spotlight} data-match-mvp={player.key} data-match-mvp-method={matchRelative ? 'MATCH_RELATIVE' : 'RATING'} aria-labelledby="match-mvp-title">
    <div className={styles.profile}>
      <div className={styles.portrait} aria-hidden="true">
        {hero ? <HeroArtwork hero={hero} decorative priority locale={locale} variant="spotlight" /> : <span className={styles.monogram}>{team.short}</span>}
      </div>
      <div className={styles.identity}>
        <div className={styles.eyebrow}><h2 id="match-mvp-title">{en ? 'MATCH MVP' : uiText("全场 MVP", locale)}</h2></div>
        <div className={styles.playerName}>
          {playerPath ? <Link to={playerPath} state={returnState} onClick={onNavigate}>{player.displayName}<span aria-hidden="true">→</span></Link> : <strong>{player.displayName}</strong>}
        </div>
        <div className={styles.byline}><strong>{team.short}</strong><span>{role}</span><span className={styles.battleTag} data-battle-tag><SignalBattleTag value={player.battleTag} en={en} /></span></div>
        <SignalHeroList row={player} en={en} />
      </div>
    </div>

    <div className={styles.performance}>
      <div className={styles.rating}>
        <span>{matchRelative ? (en ? 'Award basis' : uiText('评选依据', locale)) : (en ? 'Overall match rating' : uiText("全场综合评分", locale))}</span>
        {matchRelative ? <strong className={styles.awardBasis}>{en ? 'Match statistics' : uiText('本场数据', locale)}</strong> : <strong aria-label={`${en ? 'Match rating' : uiText("全场评分", locale)} ${player.rating.toFixed(1)} / 10`}>{player.rating.toFixed(1)}<small>/ 10</small></strong>}
      </div>
      <dl className={styles.facts}>
        {coreStats.map(stat => <div key={stat.metricId}><dt>{en ? METRIC_LABELS[stat.metricId] || stat.label : uiText(stat.label, locale)}</dt><dd>{formatInt(stat.value, '—')}</dd></div>)}
        <div><dt>{en ? 'Maps played' : uiText("出场地图", locale)}</dt><dd>{player.maps.length}<small> / {dossier.mapRecords.length}</small></dd></div>
      </dl>
      <details className={styles.ratingInfo}><summary>{matchRelative ? (en ? 'How MVP is selected' : uiText('评选口径', locale)) : (en ? 'How ratings work' : uiText("评分口径", locale))}<span aria-hidden="true">＋</span></summary><div><p>{matchRelative ? (en ? 'Without prior rating references, MVP uses this series only: per-10-minute statistics, comparisons within each role, existing hero-profile weights and the appearance requirement. Later matches cannot change this comparison.' : uiText('缺少此前评分参照时，MVP 只依据本场数据：按每 10 分钟统计、同职责比较，沿用现有英雄权重和出场门槛。后续比赛不会影响本场比较。', locale)) : (en ? 'Match and map ratings use the same scale. Full-match performance is weighted by playtime within each role, then converted to a rating.' : uiText("全场与单图评分使用同一刻度。全场先按职责和出场时间汇总表现，再换算评分。", locale))}</p>{matchRelative ? <p>{en ? 'This comparison selects the award only. It does not supply a v1.5 rating or season OVR, and recorded statistics do not fully measure tactical contribution.' : uiText('本场比较只用于 MVP 评选，不补填 v1.5 评分或赛季 OVR；已记录统计尚不能完整衡量战术贡献。', locale)}</p> : null}<p>{entry.statisticalRating ? (en ? 'Statistical ratings have no map-win bonus.' : uiText('统计表现分不增加单图胜方加分。', locale)) : en ? 'Map win bonuses do not carry into multi-map match ratings.' : uiText("单图胜方加分不计入多图全场评分。", locale)}{entry.matchAwardMinimumMaps > 0 ? (en ? ` MVP eligibility requires at least ${entry.matchAwardMinimumMaps} map appearances.` : uiText(" 本场 MVP 至少需出场 {0} 图。", locale, [entry.matchAwardMinimumMaps])) : ''}</p>{getStatisticalRatingNotes(entry, locale).map(note => <p key={note}>{uiText(note, locale)}</p>)}</div></details>
    </div>
  </section>
}
