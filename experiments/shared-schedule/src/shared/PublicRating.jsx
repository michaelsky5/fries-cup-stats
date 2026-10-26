import { useMemo, useState } from 'react'
import { getSeasonSample, getSeasonRatingStatusLabel, formatSeasonRatingValue, getSeasonSampleRequirements, SEASON_RATING_VERSION } from '../../../../src/lib/seasonRatingPolicy.js'
import { getRankingMinTimeMins, getLeaderboardSummary, getLeaderboardHighlights, formatEntrySeasonOvr } from '../../../../src/lib/leaderboardSelectors.js'
import { SEASON_OPPONENT_POLICY } from '../../../../src/lib/seasonOpponentStrength.js'
import { Section, Empty } from './PublicUi'
import { StatsTable } from './CenterViews'
import { metricText, playerName, roleLabel } from './centerModel'
import { openCenter } from '../platform'

const names = { elims: '消灭', assists: '助攻', survival: '生存', damage: '伤害', healing: '治疗', blocked: '承伤' }
const signed = value => value == null ? '—' : `${Number(value) > 0 ? '+' : ''}${metricText(value)}`

export function PublicRatingRules({ entries, model, selection }) {
  const [expanded, setExpanded] = useState(false)
  const minimum = getRankingMinTimeMins(model.season, model.raw)
  const summary = useMemo(() => getLeaderboardSummary(entries, minimum, model.raw), [entries, minimum, model.raw])
  const leaders = useMemo(() => getLeaderboardHighlights(entries), [entries])
  const requirements = getSeasonSampleRequirements(minimum)
  const formal = requirements.formal
  return <Section title={`赛季评分 ${SEASON_RATING_VERSION}`} meta='选手 × 职责'>
    <p>正式 {summary.qualifiedEntries} · 暂定 {summary.provisionalEntries} · 未评级 {summary.unratedEntries}</p>
    <p className='center-note'>本职责至少 {formal.maps} 图 · {formal.minutes} 分钟 · {formal.matches} 场比赛。实际对手修正最多 ±{SEASON_OPPONENT_POLICY.maxOvrAdjustment} OVR。</p>
    <button className='center-link public-rating-rules' onClick={() => setExpanded(value => !value)}>{expanded ? '收起评分说明' : '查看评分说明'} ↗</button>
    {expanded ? <><p>评分采用 Stats 的英雄校准、出场时间合并、小样本调整、同职责比较和实际对手校正。统计模式只改变数据显示方式。</p><p>暂定评分要求本职责至少 {requirements.provisional.maps} 图 · {requirements.provisional.minutes} 分钟 · {requirements.provisional.matches} 场。暂定记录不进入正式名次；未评级记录继续保留统计。</p><p>评分是一项数据模型结果。不同职责的原始数值不能直接比较，也不替代赛事奖项或实际比赛表现。</p></> : null}
    {leaders.dataMvp ? <button className='public-stat-row' onClick={() => openCenter({ player: leaders.dataMvp.player_id, role: leaders.dataMvp.role, section: 'analysis' }, selection)}><span><b>数据榜首 · {playerName(leaders.dataMvp)}</b><small>{leaders.dataMvp.team_short_name} · {roleLabel(leaders.dataMvp.role)}</small></span><strong>{formatEntrySeasonOvr(leaders.dataMvp)}</strong></button> : <Empty>尚无达到正式样本门槛的记录。</Empty>}
    {Object.entries(leaders.roleLeaders).map(([role, entry]) => entry ? <button className='public-stat-row' key={role} onClick={() => openCenter({ player: entry.player_id, role, section: 'analysis' }, selection)}><span><b>{roleLabel(role)}榜首 · {playerName(entry)}</b><small>{entry.team_short_name} · {entry.roleMapsPlayed} 图</small></span><strong>{formatEntrySeasonOvr(entry)}</strong></button> : null)}
  </Section>
}

export default function PublicRating({ entry, season, raw }) {
  const [expanded, setExpanded] = useState(false)
  const sample = entry.seasonSample || getSeasonSample(entry, getRankingMinTimeMins(season, raw))
  const target = sample.requirements[sample.status === 'UNRATED' ? 'provisional' : 'formal']
  const metrics = entry.ratingEvidence?.metrics || []
  const opponent = entry.seasonOpponentEvidence
  return <Section title='赛季评分依据' meta={getSeasonRatingStatusLabel(entry)}>
    <div className='public-summary'><div><strong>{formatSeasonRatingValue(entry)}</strong><span>{sample.status === 'PROVISIONAL' ? '暂定 OVR' : '赛季 OVR'}</span></div><div><strong>{roleLabel(entry.role)}</strong><span>{getSeasonRatingStatusLabel(entry)}</span></div></div>
    <StatsTable columns={['样本', '实际', '门槛', '状态']} rows={Object.entries({ maps: '地图', minutes: '分钟', matches: '比赛' }).map(([key, label]) => ({ key, cells: [label, metricText(sample.observed[key]), target[key], sample.observed[key] == null ? '待确认' : sample.observed[key] >= target[key] ? '已达标' : `还差 ${metricText(target[key] - sample.observed[key])}`] }))} />
    <p className='center-note'>{sample.status === 'FORMAL' ? '三项门槛均按本职责累计；同一场比赛换英雄不增加比赛数。' : sample.status === 'PROVISIONAL' ? '暂定评分不参与正式名次与同职责百分位。' : '记录尚不足以形成评分，出场统计继续保留。'}</p>
    <button className='center-link public-rating-details' onClick={() => setExpanded(value => !value)}>{expanded ? '收起贡献拆解' : '查看贡献拆解'} ↗</button>
    {expanded && sample.status !== 'UNRATED' ? <>
      <StatsTable columns={['基础 OVR', '对手修正', '最终 OVR', '样本上限']} rows={[{ key: 'rating', cells: [metricText(entry.seasonOvrBeforeOpponent), signed(entry.seasonOpponentAdjustment), formatSeasonRatingValue(entry), metricText(entry.seasonOvrCap)] }]} />
      <p className='center-note'>下表相对中性原始分 50 展示指标贡献，这些数值不是 OVR 的直接加减分。</p>
      {metrics.length ? <StatsTable columns={['指标', '权重 %', '贡献']} rows={metrics.map(metric => ({ key: metric.metric, cells: [names[metric.metric] || metric.metric, metricText(metric.weight), signed(metric.delta)] }))} /> : <Empty>公开记录暂不支持各项贡献拆解。</Empty>}
      {entry.ratingEvidence?.ruleAdjustment != null ? <p>英雄定位规则修正 {signed(entry.ratingEvidence.ruleAdjustment)}</p> : null}
      <p className='center-note'>按每段英雄记录的每十分钟数据比较，再按出场时间合并；生存项以死亡更少为优。</p>
      <h3>对手强度校正</h3>
      <p className='center-note'>队伍评级只使用比赛日前的正常系列赛。轮空、弃权、判罚、同日赛果及最终排名均不参与；长短赛制每场权重相同。</p>
      {opponent?.historyMinutes > 0 ? <><p>平均对手赛前评级 {metricText(opponent.weightedOpponentRating)} · 有历史战绩的时间占比 {metricText(opponent.historyCoverage * 100)}%</p><p>取整及样本上限前校正 {signed(opponent.requestedAdjustment)}</p><p className='center-note'>所有队伍从 {SEASON_OPPONENT_POLICY.initialRating} 起步。对手历史或本职责正常比赛不足 {SEASON_OPPONENT_POLICY.matureMatches} 场时减弱影响，未知时段保持中性。减弱后的评级差每 {SEASON_OPPONENT_POLICY.ratingPointsPerOvr} 点折算 1 OVR。</p></> : <p>对手历史记录不足，本次按中性处理。</p>}
      {opponent?.meetings?.length ? <StatsTable columns={['对手 / 日期', '职责分钟', '赛前评级', '此前比赛']} rows={opponent.meetings.map(meeting => ({ key: `${meeting.matchId}:${meeting.teamId}`, cells: [`${meeting.opponentName} · ${meeting.date}`, metricText(meeting.minutes), metricText(meeting.rating), meeting.priorMatches] }))} /> : null}
    </> : expanded ? <Empty>满足暂定样本门槛并有可用表现记录后才能生成评分。</Empty> : null}
  </Section>
}
