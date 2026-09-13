import { pairedPerformance, aggregatePerformance, performanceRecordKey } from './teamPerformance.js'

export const SCOUTING_MIN_MAPS = 8
export const SCOUTING_MIN_SERIES = 3
const finite = (value) => typeof value === 'number' && Number.isFinite(value)
const unique = (records) => [
  ...new Map(records.map((record) => [performanceRecordKey(record), record])).values()
]
const seriesCount = (records) => new Set(records.map((record) => record.match.match_id)).size
const percent = (value) => `${Math.abs(value).toFixed(1)}%`
const number = (value) => (finite(value) ? value.toLocaleString('en-US', { maximumFractionDigits: 1 }) : '—')
const delta = (own, reference) =>
  finite(own) && finite(reference) && reference > 0 ? (own / reference - 1) * 100 : null
const signed = (value) => (finite(value) ? `${value > 0 ? '+' : ''}${value.toFixed(1)}%` : '—')
const enough = (records) => records.length >= SCOUTING_MIN_MAPS && seriesCount(records) >= SCOUTING_MIN_SERIES
const available = (record, metric) =>
  ['own', 'opponentStats'].every((side) => record[side]?.minutes > 0 && finite(record[side].values[metric]))
const mapRate = (record, side, metric) => (record[side].values[metric] * 10) / record[side].minutes
const proportion = (records, metric, direction) =>
  records.filter(
    (record) => direction * (mapRate(record, 'own', metric) - mapRate(record, 'opponentStats', metric)) > 0
  ).length / records.length

function combatSignal(report, en) {
  const records = report.records.filter(
    (record) => available(record, 'eliminations') && available(record, 'deaths')
  )
  if (!enough(records)) return { records, strength: null, watch: null }
  const paired = pairedPerformance(records)
  const eliminations = delta(paired.eliminations.own.value, paired.eliminations.opponent.value)
  const deaths = delta(paired.deaths.own.value, paired.deaths.opponent.value)
  const moreElims = eliminations >= 8 && proportion(records, 'eliminations', 1) >= 0.6
  const fewerDeaths = deaths <= -8 && proportion(records, 'deaths', -1) >= 0.6
  const facts = [
    {
      label: en ? 'Eliminations / 10 min · team / opponent' : '消灭 / 10 分钟 · 本队 / 对手',
      value: `${number(paired.eliminations.own.value)} / ${number(paired.eliminations.opponent.value)}`
    },
    {
      label: en ? 'Deaths / 10 min · team / opponent' : '死亡 / 10 分钟 · 本队 / 对手',
      value: `${number(paired.deaths.own.value)} / ${number(paired.deaths.opponent.value)}`
    }
  ]
  let strength = null
  if (moreElims && fewerDeaths)
    strength = {
      id: 'combat-balance',
      kind: 'strength',
      section: 'combat',
      metric: 'deaths',
      mode: 'paired',
      records,
      facts,
      title: en ? 'More eliminations. Fewer deaths.' : '同场消灭占优，死亡更少。',
      highlight: `−${percent(deaths)}`,
      highlightLabel: en ? 'deaths vs same-map opponents' : '相对同场对手的死亡记录',
      summary: en
        ? `Team eliminations are ${percent(eliminations)} higher and deaths ${percent(deaths)} lower on the same maps. Both directions appear on at least 60% of the comparable maps.`
        : `同一批地图上，本队消灭高 ${percent(eliminations)}、死亡低 ${percent(deaths)}；两个方向各自出现在至少六成可比地图中。`,
      review: en
        ? 'Use the videos to identify how the team preserves players and finishes fights. The counts alone do not establish fight win rate.'
        : '复盘时优先找出保住人数并完成收割的具体过程。消灭记录本身不能替代团战胜率。'
    }
  else if (fewerDeaths)
    strength = {
      id: 'lower-deaths',
      kind: 'strength',
      section: 'combat',
      metric: 'deaths',
      mode: 'paired',
      records,
      facts,
      title: en ? 'A lower same-map death burden.' : '同场的死亡负担较低。',
      highlight: `−${percent(deaths)}`,
      highlightLabel: en ? 'deaths vs same-map opponents' : '相对同场对手的死亡记录',
      summary: en
        ? `Deaths are ${percent(deaths)} lower than the same-map opponents, with fewer deaths on at least 60% of those maps.`
        : `每 10 分钟死亡比同场对手低 ${percent(deaths)}，至少六成可比地图呈现同一方向。`,
      review: en
        ? 'Check whether this comes from survival, successful disengagements, or different fight exposure; the records do not separate them.'
        : '结合录像区分存活、成功撤退和交战机会差异，再判断哪些做法值得延续。'
    }
  else if (moreElims && deaths !== null && deaths <= 3)
    strength = {
      id: 'higher-eliminations',
      kind: 'strength',
      section: 'combat',
      metric: 'eliminations',
      mode: 'paired',
      records,
      facts,
      title: en ? 'More recorded eliminations in the matchup.' : '同场的消灭记录占优。',
      highlight: `+${percent(eliminations)}`,
      highlightLabel: en ? 'eliminations vs same-map opponents' : '相对同场对手的消灭记录',
      summary: en
        ? `Eliminations are ${percent(eliminations)} higher, with the same direction on at least 60% of maps and no comparable rise in deaths.`
        : `消灭记录高 ${percent(eliminations)}，至少六成地图方向一致，死亡没有同比例增加。`,
      review: en
        ? 'Review how advantages are converted into the objective. Summed eliminations can count the same target for several players.'
        : '复盘优势怎样转成目标推进；选手消灭相加可能重复计入同一目标。'
    }
  let watch = null
  if (deaths >= 10 && proportion(records, 'deaths', 1) >= 0.6)
    watch = {
      id: 'death-pressure',
      kind: 'watch',
      section: 'combat',
      metric: 'deaths',
      mode: 'paired',
      records,
      facts,
      title: en ? 'Repeated pressure in the death records.' : '同场死亡偏多，值得优先复盘。',
      highlight: `+${percent(deaths)}`,
      highlightLabel: en ? 'deaths vs same-map opponents' : '相对同场对手的死亡记录',
      summary: en
        ? `Deaths are ${percent(deaths)} higher, with the same direction on at least 60% of comparable maps across multiple series.`
        : `每 10 分钟死亡比同场对手高 ${percent(deaths)}，至少六成可比地图方向一致，涉及多场交手。`,
      review: en
        ? 'Review first losses, regrouping and disengagements before deciding whether the issue is positioning, timing or execution.'
        : '优先核对首次减员、重组与撤退过程，再判断问题出在站位、时机还是执行。'
    }
  else if (eliminations <= -10 && proportion(records, 'eliminations', -1) >= 0.6)
    watch = {
      id: 'elimination-gap',
      kind: 'watch',
      section: 'combat',
      metric: 'eliminations',
      mode: 'paired',
      records,
      facts,
      title: en ? 'Fewer eliminations in comparable meetings.' : '同场消灭偏少，需要核对转化过程。',
      highlight: `−${percent(eliminations)}`,
      highlightLabel: en ? 'eliminations vs same-map opponents' : '相对同场对手的消灭记录',
      summary: en
        ? `Eliminations are ${percent(eliminations)} lower on the same maps; at least 60% of maps follow this direction.`
        : `同一批地图的消灭记录低 ${percent(eliminations)}，至少六成地图方向一致。`,
      review: en
        ? 'Check whether damage creates finishing chances and whether the team can follow them up. These counts do not identify a focus-fire problem by themselves.'
        : '核对伤害是否形成收割机会、队伍是否及时跟进；不能仅凭这项数据断言集火有问题。'
    }
  return { records, strength, watch }
}

function outcomeWatch(report, en) {
  const wins = report.records.filter(
    (record) => record.mapOutcome === 'win' && record.own?.minutes > 0 && finite(record.own.values.deaths)
  )
  const losses = report.records.filter(
    (record) => record.mapOutcome === 'loss' && record.own?.minutes > 0 && finite(record.own.values.deaths)
  )
  if (
    wins.length < 5 ||
    losses.length < 3 ||
    seriesCount(losses) < 2 ||
    seriesCount([...wins, ...losses]) < 3
  )
    return null
  const winValue = aggregatePerformance(wins).deaths.value
  const lossValue = aggregatePerformance(losses).deaths.value
  const change = delta(lossValue, winValue)
  if (change === null || change < 20) return null
  return {
    id: 'loss-context',
    kind: 'watch',
    section: 'combat',
    metric: 'deaths',
    mode: 'outcome',
    records: unique([...wins, ...losses]),
    title: en ? 'Deaths rise in the lost-map sample.' : '输图时，死亡负担明显上升。',
    highlight: number(lossValue),
    highlightLabel: en ? 'deaths / 10 min on lost maps' : '输图的死亡记录 / 10 分钟',
    summary: en
      ? `${losses.length} lost maps average ${number(lossValue)} deaths per 10 minutes, compared with ${number(winValue)} on ${wins.length} won maps.`
      : `${losses.length} 份输图样本每 10 分钟死亡 ${number(lossValue)}，${wins.length} 份赢图样本为 ${number(winValue)}。`,
    review: en
      ? 'Start with the lost maps and review the sequence of player losses. Different opponents and maps may contribute; this association does not establish the cause of losing.'
      : '优先复盘这些输图中的减员顺序。对手与地图可能不同，这种伴随变化不能直接解释输图原因。',
    facts: [
      {
        label: en ? 'Won maps · deaths / 10 min' : '赢图 · 死亡 / 10 分钟',
        value: `${number(winValue)} · ${wins.length} ${en ? 'maps' : '图'}`
      },
      {
        label: en ? 'Lost maps · deaths / 10 min' : '输图 · 死亡 / 10 分钟',
        value: `${number(lossValue)} · ${losses.length} ${en ? 'maps' : '图'}`
      }
    ]
  }
}

function modeWatch(report, mapPool, en) {
  const groups = new Map()
  for (const map of mapPool) {
    if (!groups.has(map.mode)) groups.set(map.mode, { mode: map.mode, records: [] })
    groups.get(map.mode).records.push(...map.records)
  }
  const all = unique([...groups.values()].flatMap((group) => group.records))
  const eligible = [...groups.values()]
    .map((group) => {
      const records = unique(group.records)
      const ids = new Set(records.map(performanceRecordKey))
      const others = all.filter((record) => !ids.has(performanceRecordKey(record)))
      const rate = records.filter((record) => record.mapOutcome === 'win').length / records.length
      const otherRate = others.filter((record) => record.mapOutcome === 'win').length / others.length
      return { ...group, records, others, rate, otherRate, gap: otherRate - rate }
    })
    .filter(
      (group) =>
        group.records.length >= 5 &&
        group.others.length >= 8 &&
        seriesCount(group.records) >= 3 &&
        group.gap >= 0.15
    )
    .sort((a, b) => b.gap - a.gap)
  const group = eligible[0]
  if (!group || !enough(report.records)) return null
  return {
    id: 'mode-gap',
    kind: 'watch',
    section: 'maps',
    records: unique([...group.records, ...group.others]),
    title: en ? `${group.mode} trails the other modes.` : `${group.mode}的赛果落后于其他模式。`,
    highlight: `${(group.rate * 100).toFixed(0)}%`,
    highlightLabel: en ? 'recorded map win rate' : '已记录地图胜率',
    summary: en
      ? `${group.records.length} maps in this mode, compared with ${group.others.length} in the other modes. The win-rate gap is ${(group.gap * 100).toFixed(1)} percentage points.`
      : `本模式 ${group.records.length} 图，其他模式 ${group.others.length} 图；胜率相差 ${(group.gap * 100).toFixed(1)} 个百分点。`,
    review: en
      ? 'Review the maps and opponents behind the difference before treating the mode as a veto priority.'
      : '先核对差异背后的具体地图和对手，再决定是否调整准备重点。',
    facts: [
      {
        label: group.mode,
        value: `${(group.rate * 100).toFixed(1)}% / ${group.records.length} ${en ? 'maps' : '图'}`
      },
      {
        label: en ? 'Other modes' : '其他模式',
        value: `${(group.otherRate * 100).toFixed(1)}% / ${group.others.length} ${en ? 'maps' : '图'}`
      }
    ]
  }
}

function rosterProfile(report, en) {
  const cohort = report.cohorts[0]
  const complete = report.records.filter((record) => record.own?.complete)
  if (!cohort || !enough(complete)) return null
  const share = cohort.records.length / complete.length
  const hero = report.heroes.find(
    (item) =>
      item.records.filter(
        (record) => record.own.complete && record.own.players.every((player) => player.hero)
      ).length >= 5
  )
  const heroRecords =
    hero?.records.filter(
      (record) => record.own.complete && record.own.players.every((player) => player.hero)
    ) || []
  const heroCoverage = report.records.filter(
    (record) => record.own.complete && record.own.players.every((player) => player.hero)
  )
  return {
    id: 'roster-profile',
    kind: 'profile',
    section: 'members',
    records: complete,
    title: share === 1
      ? (en ? 'One five-player group in every complete roster record.' : '完整出场记录中，始终是同一组五人。')
      : (en ? `The most recorded group covers ${(share * 100).toFixed(0)}% of complete roster records.` : `最常见五人组，覆盖 ${(share * 100).toFixed(0)}% 的完整记录。`),
    highlight: `${(share * 100).toFixed(0)}%`,
    highlightLabel: en ? 'share of the most recorded five-player group' : '最常见五人组合的记录占比',
    summary: en
      ? `One five-player group appears on ${cohort.records.length} of ${complete.length} complete roster maps.${heroRecords.length ? ` ${hero.label} appears on ${heroRecords.length} of ${heroCoverage.length} complete hero records.` : ''}`
      : `最常见五人组合共同出现 ${cohort.records.length} / ${complete.length} 图。${heroRecords.length ? `${hero.label}出现在 ${heroRecords.length} / ${heroCoverage.length} 份完整英雄记录中。` : ''}`,
    review: en
      ? 'Study the frequent group first, then check alternative members and heroes. Shared appearances do not prove coordination quality or full-map hero playtime.'
      : '备战先研究常见成员组合，再核对替代成员与英雄选择。共同出场不能直接证明配合质量，英雄记录也不等于整图使用时长。',
    facts: [
      {
        label: en ? 'Most recorded group · complete maps' : '最常见五人组合 · 完整名单样本',
        value: `${cohort.records.length} / ${complete.length}`
      },
      ...(heroRecords.length
        ? [
            {
              label: `${hero.label} · ${en ? 'complete hero records' : '完整英雄样本'}`,
              value: `${heroRecords.length} / ${heroCoverage.length}`
            }
          ]
        : [])
    ]
  }
}

function stageProfile(report, en) {
  const stages = report.stages.filter(
    (stage) =>
      stage.paired.eliminations.own.count >= 5 &&
      seriesCount(stage.paired.eliminations.own.records) >= 2 &&
      stage.paired.eliminations.opponent.value > 0
  )
  if (stages.length < 2) return null
  const first = stages[0],
    last = stages.at(-1)
  const firstDelta = delta(first.paired.eliminations.own.value, first.paired.eliminations.opponent.value)
  const lastDelta = delta(last.paired.eliminations.own.value, last.paired.eliminations.opponent.value)
  if (firstDelta === null || lastDelta === null || Math.abs(lastDelta - firstDelta) < 10) return null
  const direction = lastDelta === 0
    ? (en ? 'eliminations match the same-map opponents' : '消灭记录与同场对手持平')
    : firstDelta > 0 && lastDelta < 0
    ? (en ? 'the elimination lead becomes a deficit' : '消灭记录由领先转为落后')
    : firstDelta < 0 && lastDelta > 0
      ? (en ? 'the elimination deficit becomes a lead' : '消灭记录由落后转为领先')
      : lastDelta >= 0
        ? (lastDelta > firstDelta ? (en ? 'the elimination lead widens' : '消灭记录的领先幅度扩大') : (en ? 'the elimination lead narrows' : '消灭记录的领先幅度收窄'))
        : (lastDelta > firstDelta ? (en ? 'the elimination deficit narrows' : '消灭记录的落后幅度收窄') : (en ? 'the elimination deficit widens' : '消灭记录的落后幅度扩大'))
  return {
    id: 'stage-context',
    kind: 'context',
    section: 'trend',
    records: unique([...first.paired.eliminations.own.records, ...last.paired.eliminations.own.records]),
    title: en ? `${last.label}: ${direction}.` : `${last.label}，${direction}。`,
    highlight: signed(lastDelta),
    highlightLabel: `${last.label} · ${en ? 'eliminations vs opponents' : '相对同场对手的消灭记录'}`,
    summary: en
      ? `${first.label}: ${signed(firstDelta)}. ${last.label}: ${signed(lastDelta)}. Each stage uses its own same-map opponents.`
      : `${first.label}相对同场对手为 ${signed(firstDelta)}，${last.label}为 ${signed(lastDelta)}；各自使用该阶段的同场样本。`,
    review: en
      ? 'Check which meetings account for the change. Different opponents and maps prevent attributing it directly to improvement or decline.'
      : '找出哪些交手拉动了变化。对手与地图不同，不能直接归因为状态提升或下降。',
    facts: [
      {
        label: `${first.label} · ${first.paired.eliminations.own.count} ${en ? 'maps' : '图'}`,
        value: signed(firstDelta)
      },
      {
        label: `${last.label} · ${last.paired.eliminations.own.count} ${en ? 'maps' : '图'}`,
        value: signed(lastDelta)
      }
    ]
  }
}

function opponentException(report, combat, en) {
  if (!enough(combat.records)) return null
  const overall = pairedPerformance(combat.records).eliminations
  const overallDelta = delta(overall.own.value, overall.opponent.value)
  if (overallDelta === null || overallDelta < 8) return null
  const candidates = (report.opponents || []).flatMap(opponent => {
    const ids = new Set(opponent.rows.map(row => row.match.match_id))
    const records = combat.records.filter(record => ids.has(record.match.match_id))
    if (records.length < 5 || seriesCount(records) < 2) return []
    const pair = pairedPerformance(records).eliminations
    const change = delta(pair.own.value, pair.opponent.value)
    if (change === null || change > -8 || overallDelta - change < 20) return []
    return [{ opponent, records, pair, change }]
  }).sort((a, b) => a.change - b.change || b.records.length - a.records.length || a.opponent.id.localeCompare(b.opponent.id))
  const chosen = candidates[0]
  if (!chosen) return null
  const { opponent, records, pair, change } = chosen
  const overallDeaths = pairedPerformance(combat.records).deaths
  const deathsChange = delta(overallDeaths.own.value, overallDeaths.opponent.value)
  const deathContext = combat.strength?.id === 'combat-balance'
    ? (en ? ` Deaths are ${percent(deathsChange)} lower.` : `死亡低 ${percent(deathsChange)}。`) : ''
  return {
    id: `opponent-exception-${opponent.id}`, kind: 'watch', section: 'opponents', opponentId: opponent.id,
    records,
    title: en ? `An overall elimination edge. A different picture against ${opponent.name}.` : `总体消灭领先，面对 ${opponent.name} 时却未延续。`,
    headline: en ? ['An overall elimination edge.', `A different picture against ${opponent.name}.`] : ['总体消灭领先，', `面对 ${opponent.name} 时却未延续。`],
    summary: en
      ? `Across this scope, eliminations are ${percent(overallDelta)} above the same-map opponents.${deathContext} In ${seriesCount(records)} meetings with ${opponent.name}, eliminations are ${percent(change)} lower across ${records.length} maps.`
      : `当前范围内，消灭记录领先同场对手 ${percent(overallDelta)}。${deathContext}但在对阵 ${opponent.name} 的 ${seriesCount(records)} 场交手、${records.length} 张地图中，消灭低于对手 ${percent(change)}。`,
    highlight: signed(change), highlightLabel: en ? `eliminations vs ${opponent.name}` : `对阵 ${opponent.name} 的消灭差异`,
    review: en
      ? `Compare these ${seriesCount(records)} meetings first: which maps and lineups account for the difference? This is a matchup-specific review lead, not a persistent weakness or a tactical diagnosis.`
      : `先把这 ${seriesCount(records)} 次交手放在一起，核对差异集中在哪些地图和阵容。这是具体对阵的复盘线索，尚不足以定性为长期短板。`,
    chart: { label: en ? 'Eliminations / team 10 min' : '消灭 / 团队每 10 分钟', rows: [
      { label: en ? 'This team' : '本队', value: pair.own.value },
      { label: opponent.name, value: pair.opponent.value }
    ] },
    facts: [
      { label: en ? 'Full scope · relative to same-map opponents' : '当前范围 · 相对同场对手', value: signed(overallDelta) },
      { label: `${opponent.name} · ${en ? 'team / opponent, eliminations per 10 min' : '本队 / 对手，消灭每 10 分钟'}`, value: `${number(pair.own.value)} / ${number(pair.opponent.value)}` }
    ]
  }
}

export function buildScoutingBrief(report, mapPool = [], locale = 'zh-CN') {
  const en = locale === 'en-US'
  const combat = combatSignal(report, en)
  const exception = opponentException(report, combat, en)
  const watch = exception || combat.watch || modeWatch(report, mapPool, en) || outcomeWatch(report, en)
  // The matchup exception already contains the overall elimination edge and its death context.
  const independentStrength = exception && ['combat-balance', 'higher-eliminations'].includes(combat.strength?.id) ? null : combat.strength
  const findings = [exception, independentStrength, combat.watch, exception ? null : watch, stageProfile(report, en), rosterProfile(report, en)]
    .filter((finding, index, all) => finding && all.findIndex(item => item?.id === finding.id) === index)
    .slice(0, 3)
    .map(finding => {
      if (finding.chart || !finding.metric || finding.mode !== 'paired') return finding
      const pair = pairedPerformance(finding.records)[finding.metric]
      return { ...finding, chart: { label: en ? `${finding.metric === 'deaths' ? 'Deaths' : 'Eliminations'} / team 10 min` : `${finding.metric === 'deaths' ? '死亡' : '消灭'} / 团队每 10 分钟`, rows: [
        { label: en ? 'This team' : '本队', value: pair.own.value },
        { label: en ? 'Same-map opponents' : '同场对手', value: pair.opponent.value }
      ] } }
    })
  return {
    comparableMaps: combat.records.length,
    comparableSeries: seriesCount(combat.records),
    sufficient: enough(combat.records),
    findings,
    hasStrength: Boolean(combat.strength),
    hasWatch: Boolean(watch)
  }
}
