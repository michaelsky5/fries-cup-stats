import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { getRoleLabel } from '../../lib/leaderboardSelectors.js'
import { formatSeasonRatingValue, getSeasonRatingStatusLabel, SEASON_SAMPLE_POLICY } from '../../lib/seasonRatingPolicy.js'
import styles from './SeasonRating.module.css'

const METRIC_NAMES = {
  elims: ['消灭', 'Eliminations'], assists: ['助攻', 'Assists'], survival: ['生存', 'Survival'],
  damage: ['伤害', 'Damage'], healing: ['治疗', 'Healing'], blocked: ['承伤', 'Mitigation']
}
const hasNumber = value => value != null && String(value).trim() !== '' && Number.isFinite(Number(value))
const fmt = (value, digits = 1) => hasNumber(value) ? Number(value).toFixed(digits) : '—'
const signed = value => `${Number(value) > 0 ? '+' : ''}${fmt(value, 0)}`

function SampleSummary({ sample, en }) {
  const uiLocale = useUiLocale()
  const formal = sample.status === 'FORMAL'
  const unrated = sample.status === 'UNRATED'
  const target = sample.requirements[unrated ? 'provisional' : 'formal']
  const labels = en ? { maps: 'Maps', minutes: 'Minutes', matches: 'Matches' } : { maps: uiText("地图", uiLocale), minutes: uiText("分钟", uiLocale), matches: uiText("比赛", uiLocale) }
  return <details className={styles.sampleDisclosure} open={!formal}>
    <summary>
      <span className={styles.sampleLine}>
        <span><b>{fmt(sample.observed.maps, 0)}</b> {en ? (sample.observed.maps === 1 ? 'map' : 'maps') : uiText("张地图", uiLocale)}</span>
        <span><b>{fmt(sample.observed.minutes)}</b> {en ? 'min' : uiText("分钟", uiLocale)}</span>
        <span><b>{fmt(sample.observed.matches, 0)}</b> {en ? (sample.observed.matches === 1 ? 'match' : 'matches') : uiText("场比赛", uiLocale)}</span>
      </span>
      <span className={styles.sampleState} data-met={formal}>{formal
        ? (en ? 'Qualified · requirements' : uiText("已达标 · 查看门槛", uiLocale))
        : unrated ? (en ? 'Provisional requirements' : uiText("暂定评分门槛", uiLocale)) : (en ? 'Official rank requirements' : uiText("正式排名门槛", uiLocale))}</span>
    </summary>
    <div className={styles.sampleRequirements}>
      <div className={styles.samples}>{Object.keys(labels).map(key => {
        const observed = sample.observed[key]
        const required = target[key]
        const met = observed != null && observed >= required
        const digits = key === 'minutes' ? 1 : 0
        const remaining = required - observed
        const remainingLabel = key === 'minutes' && remaining > 0 && remaining < 0.1 ? '< 0.1' : fmt(remaining, digits)
        return <div key={key} data-met={met}>
          <span>{labels[key]}</span><b>{fmt(observed, digits)} <small>/ {required}</small></b>
          <em>{met ? (en ? 'Met' : uiText("已达标", uiLocale)) : observed == null ? (en ? 'Count unverified' : uiText("场数待确认", uiLocale)) : en ? `${remainingLabel} more needed` : uiText("还差 {0}", uiLocale, [remainingLabel])}</em>
        </div>
      })}</div>
      <p>{unrated
        ? (en ? 'A provisional estimate also needs usable performance records. Until then, statistics remain available without an OVR.' : uiText("暂定评分还需要可用的表现记录；条件满足前保留出场数据，不展示 OVR。", uiLocale))
        : (en ? 'All three requirements apply to this role. Hero switches within one match do not add matches.' : uiText("三项门槛均按本职责累计；同一场比赛换英雄，比赛数仍只计一场。", uiLocale))}</p>
      {sample.observed.matches == null ? <p>{en ? 'Published match identifiers are missing. An official rank requires a verified match count.' : uiText("公开记录缺少比赛标识，确认场数后才能判断是否满足正式排名门槛。", uiLocale)}</p> : null}
    </div>
  </details>
}

export default function SignalRatingSummary({ entry, locale, sample }) {
  const en = locale === 'en-US'
  const rated = sample.status !== 'UNRATED'
  const provisional = sample.status === 'PROVISIONAL'
  const evidence = entry.ratingEvidence
  const metrics = evidence?.metrics || []
  const nameOf = metric => METRIC_NAMES[metric]?.[en ? 1 : 0] || metric
  const knownMetrics = metrics.filter(metric => hasNumber(metric.delta))
  const positive = knownMetrics.filter(metric => Number(metric.delta) >= 0.05)
    .sort((a, b) => Number(b.delta) - Number(a.delta)).slice(0, 2)
  const summary = !rated
    ? (en ? 'The available records do not yet support a rating. Playing statistics are retained.' : uiText("当前记录尚不足以形成评分，出场数据继续保留。", locale))
    : !knownMetrics.length
      ? (en ? 'A rating is available, but the published records do not support a metric breakdown.' : uiText("已有评分，当前公开记录暂不支持拆解各项贡献。", locale))
      : positive.length
        ? (en ? `${positive.map(metric => nameOf(metric.metric)).join(' and ')} ${positive.length === 1 ? 'contributes' : 'contribute'} most positively to the raw performance score.` : uiText("{0}是原始表现分的主要正向贡献。", locale, [positive.map(metric => nameOf(metric.metric)).join('与')]))
        : (en ? 'The recorded metrics show no clear positive contribution relative to the neutral raw-score baseline.' : uiText("相对中性原始分基准，当前各项指标尚无明显正向贡献。", locale))

  return <>
    <div className={styles.signalIdentity}>
      <div className={styles.signalPlayer}>
        <p>{entry.team_short_name || entry.team_name || '—'} <span>/</span> {en ? entry.role : uiText(getRoleLabel(entry.role), locale)}</p>
        <h3>{entry.nickname || entry.display_name || entry.player_name || entry.player_id}</h3>
        <p className={styles.ratingReading}>{summary}</p>
      </div>
      <div className={styles.signalResult} data-status={sample.status}>
        <small>{provisional ? (en ? 'PROVISIONAL OVR' : uiText("暂定 OVR", locale)) : 'SEASON OVR'}</small>
        <b>{formatSeasonRatingValue(entry)}</b>
        <span>{getSeasonRatingStatusLabel(entry, locale)}</span>
      </div>
    </div>
    {provisional ? <p className={styles.statusReading}>{en
      ? `Provisional only · no official rank or role percentile · capped at ${SEASON_SAMPLE_POLICY.provisionalOvrCap}.`
      : uiText("当前为暂定评分，不参与正式名次与同职责分位，最高 {0} 分。", locale, [SEASON_SAMPLE_POLICY.provisionalOvrCap])}</p> : null}
    <SampleSummary sample={sample} en={en} />
    {rated ? <>
      <section className={`${styles.section} ${styles.ratingRoute}`}>
        <h3>{en ? '01 / How the OVR is formed' : uiText("01 / 评分如何形成", locale)}</h3>
        <div className={styles.scoreRoute}>
          <div><span>{en ? 'Base OVR' : uiText("基础 OVR", locale)}</span><b>{fmt(entry.seasonOvrBeforeOpponent, 0)}</b></div>
          <div><span>{en ? 'Opponent adjustment' : uiText("实际对手修正", locale)}</span><b data-direction={entry.seasonOpponentAdjustment > 0 ? 'positive' : entry.seasonOpponentAdjustment < 0 ? 'negative' : 'neutral'}>{signed(entry.seasonOpponentAdjustment)}</b></div>
          <div><span>{en ? 'Final OVR' : uiText("最终 OVR", locale)}</span><b>{formatSeasonRatingValue(entry)}</b></div>
        </div>
        <p>{provisional
          ? (en ? 'Base OVR maps sample-adjusted performance without an official role-ranking component.' : uiText("先调整小样本影响，再将表现换算为基础 OVR；暂不加入同职责排名。", locale))
          : (en ? 'Base OVR combines sample-adjusted performance with the official comparison within this role.' : uiText("先调整小样本影响，再结合正式同职责表现比较，换算为基础 OVR。", locale))}
          {' '}{en ? `Current sample cap: ${fmt(entry.seasonOvrCap, 0)}.` : uiText("当前样本上限 {0} 分。", locale, [fmt(entry.seasonOvrCap, 0)])}
          {hasNumber(entry.seasonOpponentAdjustment) && Number(entry.seasonOpponentAdjustment) === 0 ? ` ${en ? 'The opponent adjustment did not change this score.' : uiText("本次校正未改变评分。", locale)}` : null}</p>
      </section>
      <section className={`${styles.section} ${styles.contributions}`}>
        <h3>{en ? '02 / Contributions to raw performance' : uiText("02 / 对原始表现分的贡献", locale)}</h3>
        <p>{en ? 'Relative to a neutral raw score of 50. These values are not direct OVR additions or deductions.' : uiText("相对中性原始分 50 展示；这些数值不是 OVR 的直接加减分。", locale)}</p>
        {metrics.length ? <>
          <div className={styles.metricAxis} aria-hidden="true"><span>{en ? 'Negative' : uiText("负向贡献", locale)}</span><span>{en ? '0 · neutral' : uiText("0 · 中性", locale)}</span><span>{en ? 'Positive' : uiText("正向贡献", locale)}</span></div>
          <div className={styles.metrics}>{metrics.map(metric => {
            const known = hasNumber(metric.delta)
            const delta = Number(metric.delta)
            return <div className={styles.metric} key={metric.metric}>
              <span>{nameOf(metric.metric)}<small>{en ? 'Weight' : uiText("权重", locale)} {fmt(metric.weight)}%</small></span>
              <div className={styles.track} aria-hidden="true">{known ? <i style={{ width: `${Math.min(50, Math.abs(delta) / 20 * 50)}%`, left: delta >= 0 ? '50%' : undefined, right: delta < 0 ? '50%' : undefined }} data-positive={delta >= 0} /> : null}</div>
              <b data-positive={known && delta >= 0}>{known && delta > 0 ? '+' : ''}{fmt(metric.delta)}</b>
            </div>
          })}</div>
        </> : <p className={styles.notice}>{en ? 'Metric contributions are not available in the published data.' : uiText("当前公开数据不足以拆解这项评分的指标贡献。", locale)}</p>}
        {hasNumber(evidence?.ruleAdjustment) && Math.abs(evidence.ruleAdjustment) >= 0.05 ? <p>{en ? 'Hero-profile rule adjustment' : uiText("英雄定位规则修正", locale)}：{Number(evidence.ruleAdjustment) > 0 ? '+' : ''}{fmt(evidence.ruleAdjustment)}</p> : null}
        <p className={styles.metricFootnote}>{en ? 'Hero segments are compared per 10 minutes and combined by playtime. Survival rewards fewer deaths.' : uiText("按每段英雄记录的每 10 分钟数据比较，再按出场时间合并；生存项以死亡更少为优。", locale)}</p>
      </section>
    </> : null}
  </>
}
