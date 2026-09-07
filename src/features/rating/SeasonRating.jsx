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

const METRIC_NAMES = {
  elims: ['消灭', 'Eliminations'], assists: ['助攻', 'Assists'], survival: ['生存', 'Survival'],
  damage: ['伤害', 'Damage'], healing: ['治疗', 'Healing'], blocked: ['承伤', 'Mitigation']
}
const fmt = (value, digits = 1) => value == null || !Number.isFinite(Number(value)) ? '—' : Number(value).toFixed(digits)
const signed = (value, digits = 0) => `${Number(value) > 0 ? '+' : ''}${fmt(value, digits)}`

function OpponentExplanation({ entry, en }) {
  const evidence = entry.seasonOpponentEvidence
  const available = evidence?.historyMinutes > 0
  return <section className={styles.section}>
    <h3>{en ? '04 / Opponent strength adjustment' : '04 / 对手强度校正'}</h3>
    <div className={styles.opponentResult}>
      <span>{en ? 'Base OVR' : '原 OVR'}<b>{fmt(entry.seasonOvrBeforeOpponent, 0)}</b></span>
      <span>{en ? 'Applied adjustment' : '实际调整'}<b>{signed(entry.seasonOpponentAdjustment ?? 0)}</b></span>
      <span>{en ? 'Final OVR' : '最终 OVR'}<b>{formatSeasonRatingValue(entry)}</b></span>
    </div>
    <p>{en
      ? `Only Season OVR is adjusted, by at most ±${SEASON_OPPONENT_POLICY.maxOvrAdjustment}. Team ratings use normal series results before the competition day; same-day results, forfeits, rulings and final standings are excluded. Each series has equal weight regardless of its length.`
      : `仅校正赛季 OVR，最多 ±${SEASON_OPPONENT_POLICY.maxOvrAdjustment} 分。队伍评级只用比赛日前的正常系列赛战绩；同日赛果、弃权、判罚和最终排名不参与。长短赛制每场权重相同。`}</p>
    {available ? <>
      <dl className={styles.calculation}>
        <div><dt>{en ? 'Average pre-day opponent rating' : '平均对手赛前评级'}</dt><dd>{fmt(evidence.weightedOpponentRating)}</dd></div>
        <div><dt>{en ? 'Playtime with opponent history' : '有对手历史战绩的出场时间占比'}</dt><dd>{fmt(evidence.historyCoverage * 100)}%</dd></div>
        <div><dt>{en ? 'Before rounding and sample cap' : '取整及样本上限前的校正量'}</dt><dd>{signed(evidence.requestedAdjustment, 2)}</dd></div>
      </dl>
      <p>{en
        ? `All teams start at ${SEASON_OPPONENT_POLICY.initialRating}. Opponents are weighted by this role’s playtime. Fewer than ${SEASON_OPPONENT_POLICY.matureMatches} prior opponent series, or fewer than ${SEASON_OPPONENT_POLICY.matureMatches} matched series in this player’s role, reduce the effect. Unknown time stays neutral. Each ${SEASON_OPPONENT_POLICY.ratingPointsPerOvr}-point difference after these reductions equals 1 OVR, rounded symmetrically within the existing sample cap.`
        : `所有队伍从 ${SEASON_OPPONENT_POLICY.initialRating} 起步。按本职责出场时间合并对手评级；对手历史不足 ${SEASON_OPPONENT_POLICY.matureMatches} 场，或选手本职责可确认的正常比赛不足 ${SEASON_OPPONENT_POLICY.matureMatches} 场时减弱影响，未知时段按中性处理。减弱后的评级差每 ${SEASON_OPPONENT_POLICY.ratingPointsPerOvr} 点折算 1 OVR，正负对称取整，并遵守原有样本上限。`}</p>
      <p>{en ? 'These are conservative policy weights, not a measured causal effect or a probability of player skill.' : '这是一组保守的规则权重，不代表已测得对手强弱对个人数据的精确影响。'}</p>
    </> : <p className={styles.notice}>{evidence?.status === 'NO_HISTORY'
      ? en ? 'Opponents had no earlier normal series on record. The adjustment is neutral.' : '这些对手在比赛日前尚无正常比赛战绩，本次按中性处理。'
      : en ? 'Match dates, results or historical team identifiers are insufficient to verify opponent strength. The adjustment is neutral.' : '比赛日期、正常赛果或历史队伍标识不足，无法确认对手强度，本次按中性处理。'}</p>}
    {evidence?.meetings?.length ? <details className={styles.opponents}>
      <summary>{en ? `View ${evidence.matchCount} matched series` : `查看 ${evidence.matchCount} 场可确认的对手记录`}</summary>
      <p>{en ? `${fmt(evidence.matchedMinutes)} of ${fmt(evidence.totalMinutes)} role minutes matched. Opponents without prior history stay neutral.` : `已匹配本职责 ${fmt(evidence.matchedMinutes)} / ${fmt(evidence.totalMinutes)} 分钟；没有历史战绩的对手按中性处理。`}</p>
      <ul>{evidence.meetings.map(meeting => <li key={`${meeting.matchId}:${meeting.teamId}`}>
        <div><b>{meeting.opponentName}</b><span>{meeting.date} · {fmt(meeting.minutes)} {en ? 'min' : '分钟'}</span></div>
        <div><b>{fmt(meeting.rating)}</b><span>{en ? `${meeting.priorMatches} prior series` : `此前 ${meeting.priorMatches} 场`}</span></div>
      </li>)}</ul>
    </details> : null}
  </section>
}

function RatingExplanation({ entry, locale, onClose }) {
  const dialogRef = useRef(null)
  const titleId = useId()
  const en = locale === 'en-US'
  const sample = entry.seasonSample || getSeasonSample(entry)
  const provisional = sample.status === 'PROVISIONAL'
  const rated = sample.status !== 'UNRATED'
  const evidence = entry.ratingEvidence
  const playerName = entry.nickname || entry.display_name || entry.player_name || entry.player_id
  const units = en ? { maps: 'Maps', minutes: 'Minutes', matches: 'Matches' } : { maps: '地图', minutes: '分钟', matches: '比赛' }

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

  return createPortal(<dialog ref={dialogRef} className={styles.dialog} aria-labelledby={titleId}
    onCancel={event => { event.preventDefault(); event.stopPropagation(); onClose() }} onClose={event => event.stopPropagation()}
    onClick={event => event.stopPropagation()} onKeyDown={event => event.stopPropagation()}>
    <header className={styles.header}>
      <div><span>{en ? 'SEASON RATING' : '赛季评分'} {entry.seasonRatingVersion || SEASON_RATING_VERSION}</span><h2 id={titleId}>{en ? 'How this rating is calculated' : '评分依据'}</h2></div>
      <button type="button" onClick={onClose} aria-label={en ? 'Close rating explanation' : '关闭评分说明'}>×</button>
    </header>
    <div className={styles.body}>
      <div className={styles.identity}>
        <div><h3>{playerName}</h3><p>{entry.team_short_name || entry.team_name || '—'} · {entry.role}</p></div>
        <div className={styles.result} data-status={sample.status}><b>{formatSeasonRatingValue(entry)}</b><span>{getSeasonRatingStatusLabel(entry, locale)}</span></div>
      </div>
      <section className={styles.section}>
        <h3>{en ? '01 / Sample in this role' : '01 / 本职责样本'}</h3>
        <div className={styles.samples}>{Object.keys(units).map(key => {
          const observed = sample.observed[key]
          const required = sample.requirements.formal[key]
          const met = observed != null && observed >= required
          return <div key={key} data-met={met}><span>{units[key]}</span><b>{observed == null ? '—' : fmt(observed, key === 'minutes' ? 1 : 0)} <small>/ {required}</small></b><em>{met ? (en ? 'Met' : '已达标') : observed == null ? (en ? 'Not published' : '缺少比赛标识') : en ? `${fmt(required - observed, key === 'minutes' ? 1 : 0)} more needed` : `还差 ${fmt(required - observed, key === 'minutes' ? 1 : 0)}`}</em></div>
        })}</div>
        <p>{en ? 'All three requirements must be met for an official rank. Matches are counted once per role, even with hero switches.' : '三项同时达标后进入正式排名。同一场比赛换英雄，只计一场；不同职责分别累计。'}</p>
        {!entry.eligible ? <p className={styles.notice}>{provisional
          ? en ? `Provisional estimate only; excluded from official ranks and role percentiles, capped at ${SEASON_SAMPLE_POLICY.provisionalOvrCap}.` : `当前为暂定评分，不参与正式名次和同职责分位，最高显示 ${SEASON_SAMPLE_POLICY.provisionalOvrCap}。`
          : en ? `A provisional estimate needs ${sample.requirements.provisional.maps} maps, ${sample.requirements.provisional.minutes} minutes and ${sample.requirements.provisional.matches} identified match. Until then, no rating is displayed.` : `至少 ${sample.requirements.provisional.maps} 图、${sample.requirements.provisional.minutes} 分钟、${sample.requirements.provisional.matches} 场比赛才显示暂定评分；当前保留出场数据，不展示评分。`}</p> : null}
        {sample.observed.matches == null && provisional ? <p>{en ? 'Match identifiers are missing. This estimate remains provisional until the count can be verified.' : '公开记录缺少比赛标识，目前仅作暂定估计，补齐比赛数前无法入榜。'}</p> : null}
      </section>
      {rated ? <section className={styles.section}>
        <h3>{en ? '02 / Where the performance comes from' : '02 / 表现来自哪些指标'}</h3>
        <p>{en ? 'Each hero segment is evaluated per 10 minutes and weighted by playtime. These contributions are relative to a neutral raw score of 50, before the Season OVR conversion.' : '先比较每段英雄记录的每 10 分钟数据，再按出场时间合并。下方为相对中性原始分 50 的贡献，不是 OVR 的直接加减分。'}</p>
        {evidence ? <div className={styles.metrics}>{evidence.metrics.map(metric => <div className={styles.metric} key={metric.metric}>
          <span>{METRIC_NAMES[metric.metric]?.[en ? 1 : 0] || metric.metric}<small>{en ? 'Weight' : '权重'} {fmt(metric.weight)}%</small></span>
          <div className={styles.track} aria-hidden="true"><i style={{ width: `${Math.min(50, Math.abs(metric.delta) / 20 * 50)}%`, left: metric.delta >= 0 ? '50%' : undefined, right: metric.delta < 0 ? '50%' : undefined }} data-positive={metric.delta >= 0} /></div>
          <b data-positive={metric.delta >= 0}>{metric.delta > 0 ? '+' : ''}{fmt(metric.delta)}</b>
        </div>)}</div> : <p className={styles.notice}>{en ? 'The published data does not support a metric breakdown for this rating.' : '当前公开数据不足以拆解这项评分的指标贡献。'}</p>}
        {evidence && Math.abs(evidence.ruleAdjustment) >= 0.05 ? <p>{en ? 'Profile rule adjustment' : '英雄定位规则修正'}：{evidence.ruleAdjustment > 0 ? '+' : ''}{fmt(evidence.ruleAdjustment)}</p> : null}
        <p>{en ? 'Survival rewards fewer deaths. Low-weight metrics have less influence on this hero’s rating.' : '生存项以死亡更少为优。权重越低，该指标对所用英雄的评分影响越小。'}</p>
      </section> : null}
      {rated ? <section className={styles.section}>
        <h3>{en ? '03 / From performance to rating' : '03 / 从表现到评分'}</h3>
        <dl className={styles.calculation}>
          <div><dt>{en ? 'Raw performance / 100' : '原始表现 / 100'}</dt><dd>{fmt(entry.rawScore)}</dd></div>
          <div><dt>{en ? 'Sample weight' : '样本权重'}</dt><dd>{fmt((entry.seasonScoreConfidence || 0) * 100, 0)}%</dd></div>
          <div><dt>{en ? 'Adjusted performance / 100' : '收敛后表现 / 100'}</dt><dd>{fmt(entry.seasonScore)}</dd></div>
          <div><dt>{en ? 'Performance mapped to percentile scale' : '表现映射值 / 100'}</dt><dd>{fmt(entry.seasonPerformancePercentile)}</dd></div>
          {!provisional ? <div><dt>{en ? 'Performance percentile within this role' : '同职责表现分位 / 100'}</dt><dd>{fmt(entry.seasonRolePercentile)}</dd></div> : null}
          <div><dt>{en ? 'Rating cap at this sample size' : '当前样本评分上限'}</dt><dd>{entry.seasonOvrCap ?? '—'}</dd></div>
        </dl>
        <p>{en ? 'Adjusted performance = 50 + (raw performance − 50) × sample weight. Maps, minutes and match count determine the weight; it is not a statistical confidence probability.' : '收敛后表现 = 50 +（原始表现 − 50）× 样本权重。权重取决于地图数、时长和比赛数，用于抑制小样本波动，不代表统计置信概率。'}</p>
        <p>{provisional
          ? en ? 'Base provisional OVR maps the adjusted performance without a role-ranking component. Opponent strength and the provisional cap are applied afterwards.' : '原暂定评分由收敛后的表现映射，不加入职责排名部分；随后应用对手校正与暂定上限。'
          : en ? 'Base OVR blends the performance mapping (70%) with the official role percentile (30%), then applies the 60–99 rating curve and sample cap. Opponent strength adjusts that base once. The leaderboard ranks by final OVR, with adjusted performance used to break ties.' : '原 OVR 由表现映射（70%）和正式同职责分位（30%）混合，再映射为 60–99 并应用样本上限。对手强度在原分上校正一次。榜单按最终 OVR 排名，同分时再比较收敛后的表现。'}</p>
      </section> : null}
      {rated ? <OpponentExplanation entry={entry} en={en} /> : null}
      <section className={styles.section}>
        <h3>{en ? 'Comparison basis' : '对比依据'}</h3>
        <p>{entry.ratingBaselineMode === 'frozen'
          ? en ? `Frozen Swiss-stage baseline · published snapshot ${entry.ratingBaselineSourceVersion ?? '—'}` : `瑞士轮结束时冻结的基线 · 发布快照 ${entry.ratingBaselineSourceVersion ?? '—'}`
          : en ? 'Baseline calculated from the currently published season records; new records may change it.' : '使用本赛季当前公开记录计算基线；新增记录可能改变对比基准。'}</p>
        {evidence ? <p>{en ? 'Baseline mix' : '基线混合占比'}：{en ? 'same hero' : '同英雄'} {fmt(evidence.baselineMix.hero * 100, 0)}% · {en ? 'same playstyle' : '同打法定位'} {fmt(evidence.baselineMix.profile * 100, 0)}% · {en ? 'same subrole' : '同细分职责'} {fmt(evidence.baselineMix.subrole * 100, 0)}%</p> : null}
        <p>{en ? `Season policy ${entry.seasonRatingVersion || SEASON_RATING_VERSION} · Hero calibration ${entry.ratingModelVersion || '—'}` : `赛季规则 ${entry.seasonRatingVersion || SEASON_RATING_VERSION} · 英雄评分模型 ${entry.ratingModelVersion || '—'}`}</p>
        <p className={styles.scope}>{en ? 'This describes performance within this season, with a limited schedule-strength adjustment. It is not an absolute cross-event skill rating; patch and roster changes are not modelled separately.' : '评分描述本赛季内的相对表现，并有限校正赛程强度。它不是跨赛事通用的实力值；游戏版本和队伍阵容变化尚未单独建模。'}</p>
      </section>
    </div>
  </dialog>, document.body)
}

export default function SeasonRating({ entry, locale = 'zh-CN', variant = 'compact', explanationOnly = false }) {
  const [open, setOpen] = useState(false)
  const en = locale === 'en-US'
  if (!entry) return <span>—</span>
  const name = entry.nickname || entry.display_name || entry.player_name || entry.player_id
  return <>
    <button type="button" className={`${styles.trigger} ${variant === 'large' ? styles.large : ''} ${explanationOnly ? styles.explanationOnly : ''}`}
      data-status={entry.seasonRatingStatus} aria-haspopup="dialog" aria-expanded={open}
      aria-label={`${en ? 'Rating explanation' : '评分依据'}：${name} · ${entry.role} · ${getSeasonRatingLabel(entry, locale)} ${formatSeasonRatingValue(entry)}`}
      onClick={event => { event.stopPropagation(); setOpen(true) }} onKeyDown={event => event.stopPropagation()}>
      {explanationOnly ? (en ? 'Rating details' : '评分依据') : <><b>{formatSeasonRatingValue(entry)}</b><small>{entry.eligible ? (en ? 'Details ↗' : '依据 ↗') : `${getSeasonRatingStatusLabel(entry, locale)} ↗`}</small></>}
    </button>
    {open ? <RatingExplanation entry={entry} locale={locale} onClose={() => setOpen(false)} /> : null}
  </>
}

export function SeasonRatingRules({ summary, locale = 'zh-CN' }) {
  const en = locale === 'en-US'
  return <div className={styles.rules}>
    <span><b>{en ? 'SEASON RATING' : '赛季评分'} {SEASON_RATING_VERSION}</b>{formatSeasonSampleRequirements(summary.minTimeMins, locale)}<small>{en ? `Includes opponent strength · capped at ±${SEASON_OPPONENT_POLICY.maxOvrAdjustment} OVR` : `已加入对手强度校正 · 最多 ±${SEASON_OPPONENT_POLICY.maxOvrAdjustment} OVR`}</small></span>
    <span>{summary.qualifiedEntries} {en ? 'ranked' : '正式'} · {summary.provisionalEntries} {en ? 'provisional' : '暂定'} · {summary.unratedEntries} {en ? 'unrated' : '未评级'}<small>{en ? 'Season-wide player × role entries · click a rating for details' : '全赛季选手 × 职责条目 · 点开评分查看依据'}</small></span>
  </div>
}
