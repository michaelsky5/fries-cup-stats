import { buildWeeklyBracketPresentation } from './weeklyBracketPresentation.js'
import { C1_PLAYOFF_SCHEDULE } from './weeklyApprovedSchedules.js'
import { getMatchScheduleValue } from '../../lib/scheduleFormat.js'

const list = value => Array.isArray(value) ? value : []
const idOf = team => String(team?.id || team?.team_id || '')
const unique = ids => [...new Set(ids.filter(Boolean))]
const matchTime = match => getMatchScheduleValue(match) || null

export function buildWeeklyRouteModel(model, { cycle, seasonId, selectedTeamId } = {}) {
  if (!model) return null
  const diagram = buildWeeklyBracketPresentation(model)
  const qualifiers = list(model.qualifiers).flatMap(round => list(round.items).map(item => ({ ...item, round })))
  const plan = C1_PLAYOFF_SCHEDULE.cycleId === cycle?.id
    && C1_PLAYOFF_SCHEDULE.seasonIds.includes(seasonId)
    && qualifiers.some(item => item.match?.id === C1_PLAYOFF_SCHEDULE.qualifierMatchId)
    && [...C1_PLAYOFF_SCHEDULE.seedTeamIds, ...C1_PLAYOFF_SCHEDULE.qualifierTeamIds].every(id => model.teamById.has(id))
    && !diagram.directFinal ? C1_PLAYOFF_SCHEDULE : null
  const team = id => model.teamById.get(id) || null
  const seed = number => model.seedsCurrent
    ? model.seeds.find(row => row.seed === number)?.id
    : plan?.seedTeamIds[number - 1]
  const nodes = []
  const add = (item, key, kind, index, sources = [], schedule = null) => {
    if (item.type === 'BYE') schedule = null
    const actualTime = matchTime(item.match)
    const node = { ...item, key, kind, index, sources, scheduledAt: actualTime || schedule?.scheduledAt || null,
      format: item.type === 'BYE' ? 'BYE' : item.match?.format || item.format || schedule?.format || '',
      planned: !item.match && Boolean(schedule), plannedTime: !actualTime && Boolean(schedule?.scheduledAt),
      estimated: !actualTime && schedule?.estimated === true, candidateIds: [] }
    nodes.push(node)
    return node
  }
  const qNodes = qualifiers.map((item, index) => add({ ...item, winner: item.round.qualification_current === false ? null : item.winner }, `qualifier-${item.id}`, 'QUALIFIER', index + 1))
  const qNode = qNodes.find(node => node.match?.id === plan?.qualifierMatchId)
  const sourceCandidates = source => {
    if (source.kind === 'SEED') return seed(source.number) ? [seed(source.number)] : []
    const parent = nodes.find(node => node.key === source.key)
    if (!parent) return []
    if (parent.kind === 'QUALIFIER') {
      const round = parent.round
      if (round.qualification_current !== false && list(round.outcome_team_ids).length === 1 && parent.candidateIds.includes(round.outcome_team_ids[0])) return round.outcome_team_ids
      // A completed score alone does not publish the qualifier's outcome.
      return unique([idOf(parent.a), idOf(parent.b)])
    }
    const winnerId = idOf(parent.winner)
    if (winnerId) return source.kind === 'WINNER' ? [winnerId] : parent.candidateIds.filter(id => id !== winnerId)
    return parent.candidateIds
  }
  const resolve = source => {
    const ids = sourceCandidates(source)
    return ids.length === 1 ? team(ids[0]) : null
  }
  qNodes.forEach(node => { node.candidateIds = unique([idOf(node.a), idOf(node.b)]) })
  const semis = diagram.semifinals.map((item, index) => {
    const numbers = index === 0 ? [1, 4] : [2, 3]
    const sources = numbers.map(number => number === 4 && qNode
      ? { kind: 'WINNER', key: qNode.key, stage: 'QUALIFIER', number: 1 }
      : { kind: 'SEED', number })
    // A current official seed 4 supersedes the conditional qualifier slot.
    if (model.seedsCurrent && seed(4) && index === 0) sources[1] = { kind: 'SEED', number: 4 }
    const node = add(item, `semifinal-${index + 1}`, 'SEMIFINAL', index + 1, sources, plan?.semifinals[index])
    if (!node.match && node.type !== 'BYE') { node.a = resolve(sources[0]); node.b = resolve(sources[1]) }
    node.candidateIds = node.match || node.type === 'BYE' ? unique([idOf(node.a), idOf(node.b)]) : unique(sources.flatMap(sourceCandidates))
    return node
  })
  const medalSources = result => diagram.directFinal
    ? [1, 2].map(number => ({ kind: 'SEED', number }))
    : semis.map((node, index) => ({ kind: result, key: node.key, stage: 'SEMIFINAL', number: index + 1 }))
  const addMedal = (item, kind, schedule) => {
    const sources = medalSources(kind === 'FINAL' ? 'WINNER' : 'LOSER')
    const node = add(item, kind === 'FINAL' ? 'final' : 'third-place', kind, 1, sources, schedule)
    if (!node.match) { node.a = resolve(sources[0]); node.b = resolve(sources[1]) }
    node.candidateIds = node.match ? unique([idOf(node.a), idOf(node.b)]) : unique(sources.flatMap(sourceCandidates))
    return node
  }
  diagram.finals.forEach(item => addMedal(item, 'FINAL', plan?.final))
  const thirdItems = diagram.thirdPlaces.length ? diagram.thirdPlaces : plan
    ? [{ id: 'planned-third-place', type: 'PLACEHOLDER', state: 'unpublished', match: null, winner: null, scoreA: null, scoreB: null }]
    : []
  thirdItems.forEach(item => addMedal(item, 'THIRD_PLACE', plan?.thirdPlace))
  const entrants = unique([
    ...model.seeds.map(row => row.id),
    ...(plan ? [...plan.seedTeamIds, ...plan.qualifierTeamIds] : []),
    ...nodes.flatMap(node => [idOf(node.a), idOf(node.b)])
  ]).map(team).filter(Boolean)
  const activeTeam = entrants.find(row => idOf(row) === selectedTeamId)
    || entrants.find(row => idOf(row) === idOf(model.champion)) || entrants[0] || null
  const activeId = idOf(activeTeam)
  const route = nodes.filter(node => node.candidateIds.includes(activeId))
  const edges = nodes.flatMap(node => node.sources.filter(source => source.key).map(source => ({
    from: source.key, to: node.key, result: source.kind === 'LOSER' ? 'loss' : 'win',
    active: node.candidateIds.includes(activeId) && nodes.find(parent => parent.key === source.key)?.candidateIds.includes(activeId)
  })))
  const opponent = node => {
    if (idOf(node.a) === activeId) return { team: node.b, source: node.sources[1] }
    if (idOf(node.b) === activeId) return { team: node.a, source: node.sources[0] }
    const ownIndex = node.sources.findIndex(source => sourceCandidates(source).includes(activeId))
    return { team: ownIndex === 0 ? node.b : node.a, source: node.sources[ownIndex === 0 ? 1 : 0] }
  }
  return { nodes, edges, entrants, activeTeam, route, opponent, approvedPlan: Boolean(plan),
    officialSeeds: model.seedsCurrent, champion: model.champion,
    hasPlannedFixtures: Boolean(plan) && nodes.some(node => node.planned || node.plannedTime),
    hasFork: route.some(node => node.kind === 'FINAL') && route.some(node => node.kind === 'THIRD_PLACE'),
    qualificationRequired: model.qualificationRequired,
    officialSeed: model.seeds.find(row => row.id === activeId)?.seed || null,
    plannedSeed: plan ? plan.seedTeamIds.indexOf(activeId) + 1 || null : null }
}
