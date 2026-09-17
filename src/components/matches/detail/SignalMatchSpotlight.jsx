import { translateUiText as uiText } from '../../../lib/uiText.js'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import HeroArtwork from '../../media/HeroArtwork.jsx'
import { getMatchReviewMvp } from '../../../lib/matchReviewSelectors.js'
import { getRoleEnLabel, getRoleLabel } from '../../../lib/leaderboardSelectors.js'
import { formatInt } from '../../../lib/format.js'
import { SignalBattleTag, SignalHeroList } from './SignalPlayerData.jsx'
import styles from './SignalMatchSpotlight.module.css'

const METRIC_LABELS = { elim: 'Eliminations', ast: 'Assists', dth: 'Deaths', dmg: 'Damage', heal: 'Healing', block: 'Mitigation' }

export default function SignalMatchSpotlight({ dossier, locale, withSeason, returnState, onNavigate }) {
  const en = locale === 'en-US'
  const player = useMemo(() => getMatchReviewMvp(dossier), [dossier])
  if (!player) return null

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
      <details className={styles.ratingInfo}><summary>{en ? 'How ratings work' : uiText("评分口径", locale)}<span aria-hidden="true">＋</span></summary><div><p>{en ? 'Match and map ratings use the same scale. Full-match performance is weighted by playtime within each role, then converted to a rating.' : uiText("全场与单图评分使用同一刻度。全场先按职责和出场时间汇总表现，再换算评分。", locale)}</p><p>{en ? 'Map win bonuses do not carry into multi-map match ratings.' : uiText("单图胜方加分不计入多图全场评分。", locale)}{entry.matchAwardMinimumMaps > 0 ? (en ? ` MVP eligibility requires at least ${entry.matchAwardMinimumMaps} map appearances.` : uiText(" 本场 MVP 至少需出场 {0} 图。", locale, [entry.matchAwardMinimumMaps])) : ''}</p></div></details>
    </div>
  </section>
}
