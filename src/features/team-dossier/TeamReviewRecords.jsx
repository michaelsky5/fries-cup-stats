import { translateUiText as uiText } from '../../lib/uiText.js'
import { Link } from 'react-router-dom'
import { formatOwHeroName, getOwHeroCanonicalKey } from '../../lib/heroes.js'
import { getDossierMapMatchPath } from './teamDossierAnalysis.js'
import { performanceRecordKey } from './teamPerformance.js'
import { getReviewBan } from './teamHeroReview.js'
import { HeroPortrait, resultLabel } from './TeamPerformancePrimitives.jsx'
import styles from './TeamHeroReview.module.css'

export default function TeamReviewRecords({ records, en, locale, withSeason, returnState, onLeave, opened, onToggle, evidenceKey, highlightHero, memberId, playerNames }) {
  const ordered = [...new Map(records.map(record => [performanceRecordKey(record), record])).values()]
    .sort((a, b) => String(b.match.scheduled_at || '').localeCompare(String(a.match.scheduled_at || '')) || b.mapIndex - a.mapIndex)
  const moreKey = `review-more-${evidenceKey}`
  const showAll = opened.includes(moreKey)
  return <div className={styles.records}>
    {(showAll ? ordered : ordered.slice(0, 6)).map(record => <article className={styles.record} key={performanceRecordKey(record)}>
      <header>
        <div><small>{record.timeLabel} · {record.roundLabel}</small><h4>{record.opponentLabel}<span> / {record.mapName} · {en ? 'Map' : uiText("第", locale)} {record.mapOrder}{en ? '' : uiText(" 图", locale)}</span></h4></div>
        <div className={styles.result}><b>{record.mapScore}</b><span>{resultLabel(record.mapOutcome, en)}</span></div>
        <Link to={withSeason(getDossierMapMatchPath(record))} state={returnState} onClick={onLeave}
          aria-label={en ? `Open match against ${record.opponentLabel}, ${record.mapName}, map ${record.mapOrder}, ${record.timeLabel}` : uiText("打开对阵{0}的比赛，{1}第{2}图，{3}", locale, [record.opponentLabel, record.mapName, record.mapOrder, record.timeLabel])}>{en ? 'Open match' : uiText("打开比赛", locale)} ↗</Link>
      </header>
      <div className={styles.players} aria-label={en ? 'Recorded team players and heroes' : uiText("本队成员与最终英雄记录", locale)}>
        {[...record.own.players].sort((a, b) => ({ TANK: 0, DPS: 1, SUP: 2 }[a.role] ?? 3) - ({ TANK: 0, DPS: 1, SUP: 2 }[b.role] ?? 3) || a.id.localeCompare(b.id)).map(player => <div key={player.id}
          data-highlight={(memberId ? player.id === memberId : false) || (highlightHero ? getOwHeroCanonicalKey(player.hero) === highlightHero : false)}>
          <HeroPortrait hero={player.hero} /><span><b title={player.name}>{playerNames?.[player.id] || player.name}</b><small>{player.hero ? formatOwHeroName(player.hero, locale) : (en ? 'Hero unrecorded' : uiText("英雄未收录", locale))}</small></span>
        </div>)}
      </div>
      {!record.own.complete ? <p className={styles.partial}>{en ? 'Player records are incomplete for this map.' : uiText("这张地图的成员记录不完整。", locale)}</p> : null}
      <footer>{['opponent', 'own'].map(side => {
        const ban = getReviewBan(record, side)
        return <span key={side}><small>{side === 'own' ? (en ? 'Team ban' : uiText("本队禁用", locale)) : (en ? 'Opponent ban' : uiText("对手禁用", locale))}</small><b>{ban.kind === 'named' ? formatOwHeroName(ban.hero, locale) : ban.kind === 'none' ? (en ? 'No ban' : uiText("未禁用", locale)) : (en ? 'Unrecorded' : uiText("未收录", locale))}</b></span>
      })}</footer>
    </article>)}
    {!ordered.length ? <p className={styles.empty}>{en ? 'No map records in this selection.' : uiText("当前选择下暂无地图记录。", locale)}</p> : null}
    {ordered.length > 6 ? <button type="button" className={styles.more} aria-expanded={showAll} onClick={() => onToggle(moreKey)}>{showAll ? (en ? 'Show latest six maps' : uiText("仅显示最近六图", locale)) : (en ? `Show all ${ordered.length} maps` : uiText("展开全部 {0} 张地图", locale, [ordered.length]))}<span>{showAll ? '−' : '+'}</span></button> : null}
  </div>
}
