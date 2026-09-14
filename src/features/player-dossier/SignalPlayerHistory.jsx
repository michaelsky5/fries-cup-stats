import { translateUiText as uiText } from '../../lib/uiText.js'
import { Link } from 'react-router-dom'
import { SignalHeroPortrait, SignalRating } from '../../components/matches/detail/SignalPlayerData.jsx'
import TeamLogo from '../../components/matches/TeamLogo.jsx'
import { formatOwHeroName, formatOwMapName, getOwHeroCanonicalKey } from '../../lib/heroes.js'
import { formatPlayerMatchStage, playerMapKey } from './playerDossierPresentation.js'
import styles from './SignalPlayerDossier.module.css'

const resultLabel = (result, en, labelLocale = 'zh-CN') => uiText(({ win: en ? 'WIN' : '胜', loss: en ? 'LOSS' : '负', draw: en ? 'DRAW' : '平', pending: en ? 'LIVE' : '进行中', unknown: '—' })[result], labelLocale)
const score = record => record.scoreFor != null && record.scoreAgainst != null ? `${record.scoreFor} : ${record.scoreAgainst}` : '—'
const number = value => Number.isFinite(value) ? value.toLocaleString('en-US') : '—'

export default function SignalPlayerHistory({ matches, en, locale, seasonId, selectedHero, selectedMap = '', expanded, onExpand, linkProps }) {
  return <div className={styles.matchList}>
    {matches.length > 0 && <div className={styles.matchColumns} aria-hidden="true"><span>{en ? 'Date / Opponent' : uiText("时间 / 对手", locale)}</span><span>{en ? 'Result' : uiText("赛果", locale)}</span><span>{en ? 'Recorded heroes' : uiText("使用英雄", locale)}</span><span>{en ? 'Match rating' : uiText("全场评分", locale)}</span><span>{en ? 'Maps' : uiText("地图", locale)}</span></div>}
    {matches.map(match => {
      const open = expanded === match.key
      return <section className={styles.match} key={match.key} data-result={match.result}>
        <div className={styles.matchRow}>
          <Link {...linkProps(`/matches/${encodeURIComponent(match.matchId)}`)} className={styles.opponent} aria-label={`${match.opponent.short} · ${match.dateLabel} · ${en ? 'Match report' : uiText("比赛战报", locale)}`}>
            <TeamLogo team={match.opponent} seasonId={seasonId} className={styles.opponentLogo} /><span><small>{match.dateLabel}</small><strong><em>vs</em> {match.opponent.short}<span aria-hidden="true"> ↗</span></strong><small>{formatPlayerMatchStage(match.stage, en)}</small></span>
          </Link>
          <div className={styles.result}><span>{resultLabel(match.result, en, locale)}</span><strong>{score(match)}</strong></div>
          <div className={styles.matchHeroes}>{match.heroes.map(hero => <SignalHeroPortrait key={hero} hero={hero} role={match.role} description={formatOwHeroName(hero, locale)} />)}</div>
          <div className={styles.matchRating}><SignalRating value={match.rating} en={en} /><small>{en ? 'Match rating' : uiText("全场评分", locale)}</small></div>
          <button type="button" className={styles.expand} aria-expanded={open} aria-controls={open ? `player-maps-${match.key.replaceAll(':', '-')}` : undefined} onClick={() => onExpand(open ? '' : match.key)} aria-label={`${en ? 'Map records' : uiText("逐图记录", locale)} · ${match.opponent.short} · ${match.dateLabel}`}><span>{match.maps.length} {en ? (match.maps.length === 1 ? 'map' : 'maps') : uiText("图", locale)}</span><b aria-hidden="true">{open ? '−' : '+'}</b></button>
        </div>
        {open && <div id={`player-maps-${match.key.replaceAll(':', '-')}`} className={styles.mapRecords}>
          <div className={styles.mapScroll} role="region" aria-label={en ? 'Player map statistics' : uiText("选手逐图数据", locale)} tabIndex={0}>
            <table><caption>{en ? 'Map totals · ratings out of 10' : uiText('逐图累计数据 · 评分满分 10', locale)}</caption><thead><tr><th scope="col">{en ? 'Map / Hero' : uiText("地图 / 英雄", locale)}</th><th scope="col">{en ? 'Result' : uiText("赛果", locale)}</th><th scope="col">{en ? 'ELIM' : uiText("消灭", locale)}</th><th scope="col">{en ? 'AST' : uiText("助攻", locale)}</th><th scope="col">{en ? 'DTH' : uiText("阵亡", locale)}</th><th scope="col">{en ? 'Damage' : uiText("伤害", locale)}</th><th scope="col">{en ? 'Healing' : uiText("治疗", locale)}</th><th scope="col">{en ? 'Mitigation' : uiText("阻挡", locale)}</th><th scope="col">{en ? 'Rating' : uiText("评分", locale)}</th></tr></thead><tbody>
              {match.maps.map(map => <tr key={map.order} data-hero-match={(selectedHero || selectedMap) && (!selectedMap || playerMapKey(map.name) === selectedMap) && (!selectedHero || map.heroes.some(hero => getOwHeroCanonicalKey(hero) === selectedHero)) || undefined}>
                <th scope="row"><Link {...linkProps(`/matches/${encodeURIComponent(match.matchId)}?map=${map.order}`)}><span className={styles.mapIdentity}><small>{String(map.order).padStart(2, '0')}</small><strong>{formatOwMapName(map.name, locale)} ↗</strong></span><span className={styles.mapHeroes}>{map.heroes.map(hero => <SignalHeroPortrait key={hero} hero={hero} role={map.role} description={formatOwHeroName(hero, locale)} />)}</span></Link></th>
                <td className={styles.mapResult} data-result={map.result} data-label={en ? 'Map result' : uiText('地图赛果', locale)}><span>{resultLabel(map.result, en, locale)}</span><b>{score(map)}</b></td>
                <td data-label={en ? 'ELIM' : uiText('消灭', locale)}>{number(map.eliminations)}</td><td data-label={en ? 'AST' : uiText('助攻', locale)}>{number(map.assists)}</td><td data-label={en ? 'DTH' : uiText('阵亡', locale)}>{number(map.deaths)}</td><td data-label={en ? 'Damage' : uiText('伤害', locale)}>{number(map.damage)}</td><td data-label={en ? 'Healing' : uiText('治疗', locale)}>{number(map.healing)}</td><td data-label={en ? 'Mitigation' : uiText('阻挡', locale)}>{number(map.mitigation)}</td><td data-label={en ? 'Rating / 10' : uiText('评分 / 10', locale)}><SignalRating value={map.rating} en={en} /></td>
              </tr>)}
            </tbody></table>
          </div>
        </div>}
      </section>
    })}
  </div>
}
