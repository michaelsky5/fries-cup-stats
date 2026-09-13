import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { HeroPortrait, PerformanceEvidence } from './TeamPerformancePrimitives.jsx'
import TeamReviewRecords from './TeamReviewRecords.jsx'
import styles from './TeamHeroReview.module.css'

function reviewResultText(results, en) {
  return `${results.wins} ${en ? 'W' : '胜'} / ${results.losses} ${en ? 'L' : '负'}${results.draws ? ` / ${results.draws} ${en ? 'D' : '平'}` : ''}`
}

export default function TeamHeroReview({ review, scopeLabel, ...context }) {
  const uiLocale = useUiLocale()
  const { en, updateQuery } = context
  const { hero, member, counts, report, sample } = review
  const mapUnit = count => en ? (count === 1 ? 'map' : 'maps') : uiText("图", uiLocale)
  const evidenceKey = [hero.key, member?.id || 'all', sample].join('-')
  const recordContext = { ...context, highlightHero: hero.key, memberId: member?.id }
  return <section id="performance-hero-evidence" className={styles.review} tabIndex={-1} aria-label={en ? `${hero.label} review` : uiText("{0}复盘", uiLocale, [hero.label])}>
    <span className={styles.eyebrow}>01 / HERO RECORDS</span>
    <div className={styles.reviewHeading}>
      <div className={styles.identity}><HeroPortrait hero={hero.hero} /><div><h3>{hero.label}</h3><small>{scopeLabel}</small></div></div>
      <div className={styles.scope} aria-live="polite"><strong>{report.records.length}<small>{en ? 'maps in scope' : uiText("图符合当前范围", uiLocale)}</small></strong><span>{report.records.length ? reviewResultText(review.results, en) : (en ? 'No matching records' : uiText("暂无对应记录", uiLocale))}</span></div>
    </div>
    <p className={styles.scopeNote}>{member
      ? (en ? `Hero records belong to ${member.name}. Ban sets use team bans on maps where this player appeared.` : uiText("英雄记录对应 {0} 本人；禁用记录统计该成员出场地图中的队伍禁用。", uiLocale, [member.name]))
      : (en ? 'Hero appearances and bans are separate map sets. Lineups and records below follow your selection.' : uiText("英雄有记录与英雄被禁用分别查阅；下方阵容与比赛跟随当前选择。", uiLocale))}</p>
    {review.members.length ? <div className={styles.members}>
      <span>{sample === 'recorded' ? (en ? 'Players with this hero' : uiText("记录该英雄的成员", uiLocale)) : (en ? 'Players on these maps' : uiText("这些地图的出场成员", uiLocale))}</span>
      {review.members.map(player => <button key={player.id} type="button" aria-pressed={member?.id === player.id}
        aria-label={en ? `Filter review by ${player.name}` : uiText("按{0}筛选复盘", uiLocale, [player.name])}
        onClick={() => updateQuery({ member: member?.id === player.id ? null : player.id, performanceMember: null })}>
        <b>{player.name}</b><small>{player.records.length} {mapUnit(player.records.length)}</small><span aria-hidden="true">{member?.id === player.id ? '×' : '↗'}</span>
      </button>)}
    </div> : null}
    {review.repeated.length ? <div className={styles.repeated}>
      <header><b>{en ? 'Same opponent. Same map.' : uiText("同一对手，同一张地图。", uiLocale)}</b><span>{en ? 'Compare repeated meetings' : uiText("把重复交手放在一起核对", uiLocale)}</span></header>
      {review.repeated.slice(0, 2).map(group => <PerformanceEvidence key={group.key} id={`hero-repeat-${evidenceKey}-${encodeURIComponent(group.key)}`}
        title={`${group.opponent} / ${group.map} · ${group.records.length} ${en ? 'maps' : uiText("图", uiLocale)} · ${reviewResultText(group, en)}`}
        label={en ? `Compare ${group.records.length} maps against ${group.opponent} on ${group.map}` : uiText("对照{0}在{1}的{2}张地图", uiLocale, [group.opponent, group.map, group.records.length])} {...context}>
        <TeamReviewRecords records={group.records} evidenceKey={`repeat-${evidenceKey}-${encodeURIComponent(group.key)}`} {...recordContext} />
      </PerformanceEvidence>)}
    </div> : null}
    {report.records.length ? <PerformanceEvidence id={`hero-review-${evidenceKey}`} title={en ? `${report.records.length === 1 ? 'Inspect this map' : `Inspect all ${report.records.length} maps`} · players, lineups & bans` : uiText("核对全部 {0} 张地图 · 成员、阵容与禁用", uiLocale, [report.records.length])} {...context}>
      <TeamReviewRecords records={report.records} evidenceKey={evidenceKey} {...recordContext} />
    </PerformanceEvidence> : <p className={styles.empty}>{sample !== 'recorded' && counts[sample] === null
      ? (en ? 'Named bans have not been published for this side in the selected scope.' : uiText("当前范围尚未收录这一方的具名禁用。", uiLocale))
      : (en ? 'Try another player, hero or stage to inspect recorded maps.' : uiText("可以切换成员、英雄或赛段，查阅其他地图记录。", uiLocale))}</p>}
  </section>
}
