import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  formatSeasonRatingValue,
  formatSeasonSampleRequirements,
  getSeasonRatingLabel,
  getSeasonRatingStatusLabel,
  getSeasonSample,
  SEASON_RATING_VERSION,
  SEASON_SAMPLE_POLICY
} from '../../lib/seasonRatingPolicy.js'
import styles from './SeasonRating.module.css'
import { SEASON_OPPONENT_POLICY } from '../../lib/seasonOpponentStrength.js'
import SignalRatingSummary from './SignalRatingSummary.jsx'

const METRIC_NAMES = {
  elims: ['消灭', 'Eliminations'], assists: ['助攻', 'Assists'], survival: ['生存', 'Survival'],
  damage: ['伤害', 'Damage'], healing: ['治疗', 'Healing'], blocked: ['承伤', 'Mitigation']
}
const fmt = (value, digits = 1) => value == null || !Number.isFinite(Number(value)) ? '—' : Number(value).toFixed(digits)
const signed = (value, digits = 0) => `${Number(value) > 0 ? '+' : ''}${fmt(value, digits)}`

function OpponentExplanation({ entry, en, signal = false }) {
  const uiLocale = useUiLocale()
  const evidence = entry.seasonOpponentEvidence
  const available = evidence?.historyMinutes > 0
  return <section className={styles.section}>
    <h3>{signal ? '' : '04 / '}{en ? 'Opponent strength adjustment' : uiText("对手强度校正", uiLocale)}</h3>
    <div className={styles.opponentResult}>
      <span>{en ? 'Base OVR' : uiText("基础 OVR", uiLocale)}<b>{fmt(entry.seasonOvrBeforeOpponent, 0)}</b></span>
      <span>{en ? 'Applied adjustment' : uiText("实际调整", uiLocale)}<b>{signed(entry.seasonOpponentAdjustment ?? (signal ? null : 0))}</b></span>
      <span>{en ? 'Final OVR' : uiText("最终 OVR", uiLocale)}<b>{formatSeasonRatingValue(entry)}</b></span>
    </div>
    <p>{en
      ? `Only Season OVR is adjusted, by at most ±${SEASON_OPPONENT_POLICY.maxOvrAdjustment}. Team ratings use normal series results before the competition day; same-day results, forfeits, rulings and final standings are excluded. Each series has equal weight regardless of its length.`
      : uiText("仅校正赛季 OVR，最多 ±{0} 分。队伍评级只用比赛日前的正常系列赛战绩；同日赛果、弃权、判罚和最终排名不参与。长短赛制每场权重相同。", uiLocale, [SEASON_OPPONENT_POLICY.maxOvrAdjustment])}</p>
    {available ? <>
      <dl className={styles.calculation}>
        <div><dt>{en ? 'Average pre-day opponent rating' : uiText("平均对手赛前评级", uiLocale)}</dt><dd>{fmt(evidence.weightedOpponentRating)}</dd></div>
        <div><dt>{en ? 'Playtime with opponent history' : uiText("有对手历史战绩的出场时间占比", uiLocale)}</dt><dd>{fmt(evidence.historyCoverage * 100)}%</dd></div>
        <div><dt>{en ? 'Before rounding and sample cap' : uiText("取整及样本上限前的校正量", uiLocale)}</dt><dd>{signed(evidence.requestedAdjustment, 2)}</dd></div>
      </dl>
      <p>{en
        ? `All teams start at ${SEASON_OPPONENT_POLICY.initialRating}. Opponents are weighted by this role’s playtime. Fewer than ${SEASON_OPPONENT_POLICY.matureMatches} prior opponent series, or fewer than ${SEASON_OPPONENT_POLICY.matureMatches} matched series in this player’s role, reduce the effect. Unknown time stays neutral. Each ${SEASON_OPPONENT_POLICY.ratingPointsPerOvr}-point difference after these reductions equals 1 OVR, rounded symmetrically within the existing sample cap.`
        : uiText("所有队伍从 {0} 起步。按本职责出场时间合并对手评级；对手历史不足 {1} 场，或选手本职责可确认的正常比赛不足 {2} 场时减弱影响，未知时段按中性处理。减弱后的评级差每 {3} 点折算 1 OVR，正负对称取整，并遵守原有样本上限。", uiLocale, [SEASON_OPPONENT_POLICY.initialRating, SEASON_OPPONENT_POLICY.matureMatches, SEASON_OPPONENT_POLICY.matureMatches, SEASON_OPPONENT_POLICY.ratingPointsPerOvr])}</p>
      <p>{en ? 'These are conservative policy weights, not a measured causal effect or a probability of player skill.' : uiText("这是一组保守的规则权重，不代表已测得对手强弱对个人数据的精确影响。", uiLocale)}</p>
    </> : <p className={styles.notice}>{evidence?.status === 'NO_HISTORY'
      ? en ? 'Opponents had no earlier normal series on record. The adjustment is neutral.' : uiText("这些对手在比赛日前尚无正常比赛战绩，本次按中性处理。", uiLocale)
      : en ? 'Match dates, results or historical team identifiers are insufficient to verify opponent strength. The adjustment is neutral.' : uiText("比赛日期、正常赛果或历史队伍标识不足，无法确认对手强度，本次按中性处理。", uiLocale)}</p>}
    {evidence?.meetings?.length ? <details className={styles.opponents}>
      <summary>{en ? `View ${evidence.matchCount} matched series` : uiText("查看 {0} 场可确认的对手记录", uiLocale, [evidence.matchCount])}</summary>
      <p>{en ? `${fmt(evidence.matchedMinutes)} of ${fmt(evidence.totalMinutes)} role minutes matched. Opponents without prior history stay neutral.` : uiText("已匹配本职责 {0} / {1} 分钟；没有历史战绩的对手按中性处理。", uiLocale, [fmt(evidence.matchedMinutes), fmt(evidence.totalMinutes)])}</p>
      <ul>{evidence.meetings.map(meeting => <li key={`${meeting.matchId}:${meeting.teamId}`}>
        <div><b>{meeting.opponentName}</b><span>{meeting.date} · {fmt(meeting.minutes)} {en ? 'min' : uiText("分钟", uiLocale)}</span></div>
        <div><b>{fmt(meeting.rating)}</b><span>{en ? `${meeting.priorMatches} prior series` : uiText("此前 {0} 场", uiLocale, [meeting.priorMatches])}</span></div>
      </li>)}</ul>
    </details> : null}
  </section>
}

function RatingExplanation({ entry, locale, onClose, signal }) {
  const dialogRef = useRef(null)
  const titleId = useId()
  const en = locale === 'en-US'
  const sample = entry.seasonSample || getSeasonSample(entry)
  const provisional = sample.status === 'PROVISIONAL'
  const rated = sample.status !== 'UNRATED'
  const evidence = entry.ratingEvidence
  const playerName = entry.nickname || entry.display_name || entry.player_name || entry.player_id
  const units = en ? { maps: 'Maps', minutes: 'Minutes', matches: 'Matches' } : { maps: uiText("地图", locale), minutes: uiText("分钟", locale), matches: uiText("比赛", locale) }
  const EvidencePanel = signal ? 'details' : 'div'

  useEffect(() => {
    const dialog = dialogRef.current
    const previousFocus = document.activeElement
    const previousOverflow = document.body.style.overflow
    dialog.showModal()
    document.body.style.overflow = 'hidden'
    return () => {
      dialog.close()
      document.body.style.overflow = previousOverflow
      if (previousFocus?.isConnected) previousFocus.focus()
    }
  }, [])

  return createPortal(<dialog ref={dialogRef} className={styles.dialog} data-design={signal ? 'signal' : undefined} aria-labelledby={titleId}
    onCancel={event => { event.preventDefault(); event.stopPropagation(); onClose() }} onClose={event => event.stopPropagation()}
    onClick={event => event.stopPropagation()} onKeyDown={event => event.stopPropagation()}>
    <header className={styles.header}>
      <div><span>{en ? 'SEASON RATING' : uiText("赛季评分", locale)} {entry.seasonRatingVersion || SEASON_RATING_VERSION}</span><h2 id={titleId}>{en ? 'How this rating is calculated' : uiText("评分依据", locale)}</h2></div>
      <button type="button" onClick={onClose} aria-label={en ? 'Close rating explanation' : uiText("关闭评分说明", locale)}>×</button>
    </header>
    <div className={styles.body}>
      {signal ? <SignalRatingSummary entry={entry} locale={locale} sample={sample} /> : <>
      <div className={styles.identity}>
        <div><h3>{playerName}</h3><p>{entry.team_short_name || entry.team_name || '—'} · {entry.role}</p></div>
        <div className={styles.result} data-status={sample.status}><b>{formatSeasonRatingValue(entry)}</b><span>{getSeasonRatingStatusLabel(entry, locale)}</span></div>
      </div>
      <section className={styles.section}>
        <h3>{en ? '01 / Sample in this role' : uiText("01 / 本职责样本", locale)}</h3>
        <div className={styles.samples}>{Object.keys(units).map(key => {
          const observed = sample.observed[key]
          const required = sample.requirements.formal[key]
          const met = observed != null && observed >= required
          return <div key={key} data-met={met}><span>{units[key]}</span><b>{observed == null ? '—' : fmt(observed, key === 'minutes' ? 1 : 0)} <small>/ {required}</small></b><em>{met ? (en ? 'Met' : uiText("已达标", locale)) : observed == null ? (en ? 'Not published' : uiText("缺少比赛标识", locale)) : en ? `${fmt(required - observed, key === 'minutes' ? 1 : 0)} more needed` : uiText("还差 {0}", locale, [fmt(required - observed, key === 'minutes' ? 1 : 0)])}</em></div>
        })}</div>
        <p>{en ? 'All three requirements must be met for an official rank. Matches are counted once per role, even with hero switches.' : uiText("三项同时达标后进入正式排名。同一场比赛换英雄，只计一场；不同职责分别累计。", locale)}</p>
        {!entry.eligible ? <p className={styles.notice}>{provisional
          ? en ? `Provisional estimate only; excluded from official ranks and role percentiles, capped at ${SEASON_SAMPLE_POLICY.provisionalOvrCap}.` : uiText("当前为暂定评分，不参与正式名次和同职责分位，最高显示 {0}。", locale, [SEASON_SAMPLE_POLICY.provisionalOvrCap])
          : en ? `A provisional estimate needs ${sample.requirements.provisional.maps} maps, ${sample.requirements.provisional.minutes} minutes and ${sample.requirements.provisional.matches} identified match. Until then, no rating is displayed.` : uiText("至少 {0} 图、{1} 分钟、{2} 场比赛才显示暂定评分；当前保留出场数据，不展示评分。", locale, [sample.requirements.provisional.maps, sample.requirements.provisional.minutes, sample.requirements.provisional.matches])}</p> : null}
        {sample.observed.matches == null && provisional ? <p>{en ? 'Match identifiers are missing. This estimate remains provisional until the count can be verified.' : uiText("公开记录缺少比赛标识，目前仅作暂定估计，补齐比赛数前无法入榜。", locale)}</p> : null}
      </section>
      {rated ? <section className={styles.section}>
        <h3>{en ? '02 / Where the performance comes from' : uiText("02 / 表现来自哪些指标", locale)}</h3>
        <p>{en ? 'Each hero segment is evaluated per 10 minutes and weighted by playtime. These contributions are relative to a neutral raw score of 50, before the Season OVR conversion.' : uiText("先比较每段英雄记录的每 10 分钟数据，再按出场时间合并。下方为相对中性原始分 50 的贡献，不是 OVR 的直接加减分。", locale)}</p>
        {evidence ? <div className={styles.metrics}>{evidence.metrics.map(metric => <div className={styles.metric} key={metric.metric}>
          <span>{uiText(METRIC_NAMES[metric.metric]?.[en ? 1 : 0], locale) || metric.metric}<small>{en ? 'Weight' : uiText("权重", locale)} {fmt(metric.weight)}%</small></span>
          <div className={styles.track} aria-hidden="true"><i style={{ width: `${Math.min(50, Math.abs(metric.delta) / 20 * 50)}%`, left: metric.delta >= 0 ? '50%' : undefined, right: metric.delta < 0 ? '50%' : undefined }} data-positive={metric.delta >= 0} /></div>
          <b data-positive={metric.delta >= 0}>{metric.delta > 0 ? '+' : ''}{fmt(metric.delta)}</b>
        </div>)}</div> : <p className={styles.notice}>{en ? 'The published data does not support a metric breakdown for this rating.' : uiText("当前公开数据不足以拆解这项评分的指标贡献。", locale)}</p>}
        {evidence && Math.abs(evidence.ruleAdjustment) >= 0.05 ? <p>{en ? 'Profile rule adjustment' : uiText("英雄定位规则修正", locale)}：{evidence.ruleAdjustment > 0 ? '+' : ''}{fmt(evidence.ruleAdjustment)}</p> : null}
        <p>{en ? 'Survival rewards fewer deaths. Low-weight metrics have less influence on this hero’s rating.' : uiText("生存项以死亡更少为优。权重越低，该指标对所用英雄的评分影响越小。", locale)}</p>
      </section> : null}
      </>}
      <EvidencePanel className={signal ? styles.explanationDetails : undefined}>
      {signal ? <summary>{rated ? (en ? 'Full calculation & sources' : uiText("查看完整计算依据", locale)) : (en ? 'Comparison basis & version' : uiText("比较基准与版本", locale))}<span>{rated ? (en ? 'Formula · opponents · baseline' : uiText("公式 · 对手记录 · 比较基准", locale)) : (en ? 'Baseline source · rating scope' : uiText("基线来源 · 评分适用范围", locale))}</span></summary> : null}
      {rated ? <section className={styles.section}>
        <h3>{signal ? (en ? 'From performance to OVR' : uiText("从表现到 OVR", locale)) : (en ? '03 / From performance to rating' : uiText("03 / 从表现到评分", locale))}</h3>
        <dl className={styles.calculation}>
          <div><dt>{en ? 'Raw performance / 100' : uiText("原始表现 / 100", locale)}</dt><dd>{fmt(entry.rawScore)}</dd></div>
          <div><dt>{en ? 'Sample weight' : uiText("样本权重", locale)}</dt><dd>{signal && entry.seasonScoreConfidence == null ? '—' : `${fmt((entry.seasonScoreConfidence || 0) * 100, 0)}%`}</dd></div>
          <div><dt>{en ? 'Adjusted performance / 100' : uiText("收敛后表现 / 100", locale)}</dt><dd>{fmt(entry.seasonScore)}</dd></div>
          <div><dt>{en ? 'Performance mapped to percentile scale' : uiText("表现映射值 / 100", locale)}</dt><dd>{fmt(entry.seasonPerformancePercentile)}</dd></div>
          {!provisional ? <div><dt>{en ? 'Performance percentile within this role' : uiText("同职责表现分位 / 100", locale)}</dt><dd>{fmt(entry.seasonRolePercentile)}</dd></div> : null}
          <div><dt>{en ? 'Rating cap at this sample size' : uiText("当前样本评分上限", locale)}</dt><dd>{entry.seasonOvrCap ?? '—'}</dd></div>
        </dl>
        <p>{en ? 'Adjusted performance = 50 + (raw performance − 50) × sample weight. Maps, minutes and match count determine the weight; it is not a statistical confidence probability.' : uiText("收敛后表现 = 50 +（原始表现 − 50）× 样本权重。权重取决于地图数、时长和比赛数，用于抑制小样本波动，不代表统计置信概率。", locale)}</p>
        <p>{provisional
          ? en ? 'Base provisional OVR maps the adjusted performance without a role-ranking component. Opponent strength and the provisional cap are applied afterwards.' : uiText("基础暂定评分由收敛后的表现映射，不加入职责排名部分；随后应用对手校正与暂定上限。", locale)
          : en ? 'Base OVR blends the performance mapping (70%) with the official role percentile (30%), then applies the 60–99 rating curve and sample cap. Opponent strength adjusts that base once. The leaderboard ranks by final OVR, with adjusted performance used to break ties.' : uiText("基础 OVR 由表现映射（70%）和正式同职责分位（30%）混合，再映射为 60–99 并应用样本上限。对手强度在基础分上校正一次。榜单按最终 OVR 排名，同分时再比较收敛后的表现。", locale)}</p>
      </section> : null}
      {rated ? <OpponentExplanation entry={entry} en={en} signal={signal} /> : null}
      <section className={styles.section}>
        <h3>{en ? 'Comparison basis' : uiText("对比依据", locale)}</h3>
        <p>{entry.ratingBaselineMode === 'frozen'
          ? en ? `Frozen Swiss-stage baseline · published snapshot ${entry.ratingBaselineSourceVersion ?? '—'}` : uiText("瑞士轮结束时冻结的基线 · 发布快照 {0}", locale, [entry.ratingBaselineSourceVersion ?? '—'])
          : en ? 'Baseline calculated from the currently published season records; new records may change it.' : uiText("使用本赛季当前公开记录计算基线；新增记录可能改变对比基准。", locale)}</p>
        {evidence?.baselineMix ? <p>{en ? 'Baseline mix' : uiText("基线混合占比", locale)}：{en ? 'same hero' : uiText("同英雄", locale)} {fmt(evidence.baselineMix.hero * 100, 0)}% · {en ? 'same playstyle' : uiText("同打法定位", locale)} {fmt(evidence.baselineMix.profile * 100, 0)}% · {en ? 'same subrole' : uiText("同细分职责", locale)} {fmt(evidence.baselineMix.subrole * 100, 0)}%</p> : null}
        <p>{en ? `Season policy ${entry.seasonRatingVersion || SEASON_RATING_VERSION} · Hero calibration ${entry.ratingModelVersion || '—'}` : uiText("赛季规则 {0} · 英雄评分模型 {1}", locale, [entry.seasonRatingVersion || SEASON_RATING_VERSION, entry.ratingModelVersion || '—'])}</p>
        <p className={styles.scope}>{en ? 'This describes performance within this season, with a limited schedule-strength adjustment. It is not an absolute cross-event skill rating; patch and roster changes are not modelled separately.' : uiText("评分描述本赛季内的相对表现，并有限校正赛程强度。它不是跨赛事通用的实力值；游戏版本和队伍阵容变化尚未单独建模。", locale)}</p>
      </section>
      </EvidencePanel>
    </div>
  </dialog>, document.body)
}

export default function SeasonRating({ entry, locale = 'zh-CN', variant = 'compact', explanationOnly = false }) {
  const [openDesign, setOpenDesign] = useState(null)
  const en = locale === 'en-US'
  if (!entry) return <span>—</span>
  const name = entry.nickname || entry.display_name || entry.player_name || entry.player_id
  return <>
    <button type="button" className={`${styles.trigger} ${variant === 'large' ? styles.large : ''} ${explanationOnly ? styles.explanationOnly : ''}`}
      data-status={entry.seasonRatingStatus} aria-haspopup="dialog" aria-expanded={Boolean(openDesign)}
      aria-label={`${en ? 'Rating explanation' : uiText("评分依据", locale)}：${name} · ${entry.role} · ${getSeasonRatingLabel(entry, locale)} ${formatSeasonRatingValue(entry)}`}
      onClick={event => {
        event.stopPropagation()
        setOpenDesign(event.currentTarget.closest('[data-design="kpr"], [data-design="signal"]') ? 'signal' : 'original')
      }} onKeyDown={event => event.stopPropagation()}>
      {explanationOnly ? (en ? 'Rating details' : uiText("评分依据", locale)) : <><b>{formatSeasonRatingValue(entry)}</b><small>{entry.eligible ? (en ? 'Details ↗' : uiText("依据 ↗", locale)) : `${getSeasonRatingStatusLabel(entry, locale)} ↗`}</small></>}
    </button>
    {openDesign ? <RatingExplanation entry={entry} locale={locale} signal={openDesign === 'signal'} onClose={() => setOpenDesign(null)} /> : null}
  </>
}

export function SeasonRatingRules({ summary, locale = 'zh-CN' }) {
  const en = locale === 'en-US'
  return <div className={styles.rules}>
    <span><b>{en ? 'SEASON RATING' : uiText("赛季评分", locale)} {SEASON_RATING_VERSION}</b>{formatSeasonSampleRequirements(summary.minTimeMins, locale)}<small>{en ? `Includes opponent strength · capped at ±${SEASON_OPPONENT_POLICY.maxOvrAdjustment} OVR` : uiText("已加入对手强度校正 · 最多 ±{0} OVR", locale, [SEASON_OPPONENT_POLICY.maxOvrAdjustment])}</small></span>
    <span>{summary.qualifiedEntries} {en ? 'ranked' : uiText("正式", locale)} · {summary.provisionalEntries} {en ? 'provisional' : uiText("暂定", locale)} · {summary.unratedEntries} {en ? 'unrated' : uiText("未评级", locale)}<small>{en ? 'Season-wide player × role entries · click a rating for details' : uiText("全赛季选手 × 职责条目 · 点开评分查看依据", locale)}</small></span>
  </div>
}
