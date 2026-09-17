import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import styles from './TeamAnalysisReading.module.css'

export default function TeamAnalysisMethod({ report, en, opened, onToggle }) {
  const uiLocale = useUiLocale()
  const open = opened.includes('performance-method')
  return <details className={styles.method} open={open}>
    <summary onClick={event => { event.preventDefault(); onToggle('performance-method') }}>{en ? 'Data scope & reading guide' : uiText("数据范围与阅读说明", uiLocale)}<span aria-hidden="true">＋</span></summary>
    <p>{en ? `${report.summary.decided} played series in this scope; ${report.administrative} administrative results and ${report.byes} byes excluded. Missing values stay unknown. All sections follow the selected stage.` : uiText("当前范围 {0} 场实际交手；{1} 场判罚、{2} 次轮空另计。缺失数值保持未知，各栏目都使用所选赛段。", uiLocale, [report.summary.decided, report.administrative, report.byes])}</p>
    <p>{en ? 'Team rates use recorded player time ÷ 5, falling back to map duration when player time is unavailable. An incomplete five-player record or missing metric excludes that map from the metric. Same-match comparisons use only maps where both sides have the value. Field medians weight each eligible team equally; opponents, heroes and map types are not statistically adjusted.' : uiText("团队指标按选手总出场时间 ÷ 5 折算队伍时间，个人时长缺失时使用本图时长。五人记录不完整或某项指标缺失，该图不计入相应指标。同场对照只使用双方该项数据齐全的地图；赛事中位数按有数据队伍等权计算，未按对手、英雄和地图模式做统计校正。", uiLocale)}</p>
    <p>{en ? 'Team observations require 8 comparable maps across 3 series, an 8–10% difference and agreement on at least 60% of maps. Matchup exceptions need 5 maps across 2 meetings, an elimination reversal of at least 8% and a 20-point gap from the overall reading. Stage differences need 5 maps and 2 series per stage, and a change of 10 points. These are editorial filters, not confidence levels; overlapping observations are merged.' : uiText("团队观察至少要求 8 图、3 场、8–10% 差异及六成地图方向一致。特定对阵反差至少要求 2 场、5 图，消灭差异反向至少 8%，与整体相差至少 20 个百分点；阶段变化要求每阶段至少 5 图、2 场，差异变化至少 10 个百分点。这些是阅读筛选条件，不是统计置信度；重叠观察合并呈现。", uiLocale)}</p>
    <p>{en ? 'Eliminations may count the same target for several players. Final hero records do not describe full-map playtime, and bans only cover published named entries. These data do not include first-kill, teamfight or ultimate timelines; tactical causes still require video review. Metric percentiles and their sample rules are available in Players.' : uiText("消灭数可能重复计入同一目标。最终英雄记录不等于整图使用时长，禁用只统计具名记录。当前数据不含首杀、团战及大招事件时间线，战术原因仍需录像复盘；同职责数值分位与样本规则在成员表现中提供。", uiLocale)}</p>
  </details>
}
