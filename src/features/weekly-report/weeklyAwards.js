import { getPlayerMatchLogs } from '../../lib/playerMatchLogs.js'
import { buildRatingBaselinesFromPlayerLogs } from '../../lib/ratingBaselines.js'
import { calculateMatchPlayerScoreV1 } from '../../lib/scoringEngineAdapter.js'
import { getRatingModelVersion } from '../../lib/ratingModel.js'
import { getOwHeroCanonicalName } from '../../lib/heroes.js'
import * as ratingConfig from '../../config/ratingModelConfig.js'
import { buildWeeklyReference, selectWeeklyReferenceReports, weeklyInputSnapshot } from './weeklyAwardReference.js'
import { WEEKLY_POSITIONS, WEEKLY_POSITION_ROLES, buildWeeklyPositionAssignments, weeklyLogPosition } from './weeklyPositions.js'

const list = value => Array.isArray(value) ? value : []
const text = value => String(value ?? '').trim()
const roleOf = value => ({ TANK: 'TANK', DPS: 'DPS', DAMAGE: 'DPS', SUP: 'SUP', SUPPORT: 'SUP' })[text(value).toUpperCase()] || ''
const engineRole = role => role === 'SUP' ? 'SUPPORT' : role
const roleOrder = ['TANK', 'DPS', 'SUP']
const slots = WEEKLY_POSITIONS
const metricFields = [
  ['elims', 'eliminations'], ['assists', 'assists'], ['deaths', 'deaths'],
  ['damage', 'damage'], ['healing', 'healing'], ['blocked', 'mitigation']
]
const emptyTotals = () => Object.fromEntries(metricFields.map(([key]) => [key, 0]))
const addTotals = (target, totals) => metricFields.forEach(([key]) => { target[key] += totals[key] })
const sameTotals = (a, b) => metricFields.every(([key]) => a[key] === b[key])

export const WEEKLY_AWARD_POLICY = Object.freeze({
  version: 'weekly-data-v4', minimumMaps: 3, slots, teamLimit: 2,
  positionAssignment: 'primary-current-week-hero-playtime', eligibilityScope: 'primary-position-maps',
  teamCapScope: 'all-recorded-week-teams',
  aggregation: 'time-weighted-current-week-primary-position', baseline: 'prior-week-independent-reference',
  tieBreak: ['unrounded-week-score', 'valid-role-maps', 'lower-deaths-per-10'],
  unresolvedTie: 'shared-mvp-or-best-five-slot-pending',
  uniquePlayer: true, matchResultBonus: false
})

function readTotals(row, log = false) {
  const source = log ? row?.totals : row
  const totals = {}
  for (const [key, field] of metricFields) {
    const value = source?.[log ? key : field] ?? (key === 'blocked' ? source?.blocked : undefined)
    if (value == null || text(value) === '' || typeof value === 'boolean' || !Number.isFinite(Number(value)) || Number(value) < 0) return null
    totals[key] = Number(value)
  }
  return totals
}

function duration(value) {
  const parts = text(value).split(':').map(Number)
  if (parts.length < 2 || parts.length > 3 || parts.some(part => !Number.isFinite(part) || part < 0)) return 0
  return parts.length === 3 ? parts[0] * 60 + parts[1] + parts[2] / 60 : parts[0] + parts[1] / 60
}

function signature(value) {
  let hash = 2166136261
  for (const char of JSON.stringify(value)) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619)
  return (hash >>> 0).toString(16).padStart(8, '0')
}

function collectIssueInputs(report, players) {
  const matches = new Map(list(report?.completed).filter(match => match.state === 'complete').map(match => [text(match.id), match]))
  const aliases = new Map()
  for (const match of matches.values()) {
    for (const id of [match.id, match.match_id, match.raw_match_id]) if (text(id)) aliases.set(text(id), text(match.id))
  }
  const groups = new Map(), scopes = new Map()
  for (const map of list(report?.maps)) {
    const match = matches.get(text(map.matchId)), order = Number(map.order ?? map.map_order)
    const minutes = duration(map.match_time || map.time)
    if (!match || !Number.isInteger(order) || order < 1 || map.is_administrative || map.rating_eligible === false || minutes <= 0) continue
    const scope = `${match.id}|${order}`
    if (scopes.has(scope)) continue
    scopes.set(scope, { match, order, minutes })
    const seen = new Set()
    const rows = list(map.player_stats).length ? map.player_stats : [...list(map.team_a_stats), ...list(map.team_b_stats)]
    for (const row of rows) {
      const id = text(row.player_id), role = roleOf(row.role)
      if (!id || !role) continue
      const key = `${scope}|${id}|${role}`
      const teamId = text(row.team_id || (text(row.side).toUpperCase() === 'A' ? match.team_a?.id : text(row.side).toUpperCase() === 'B' ? match.team_b?.id : ''))
      const totals = readTotals(row)
      const rowKey = JSON.stringify([key, teamId, row.heroes_played, totals])
      if (seen.has(rowKey)) continue
      seen.add(rowKey)
      const group = groups.get(key) || { key, id, role, scope, matchId: match.id, order, minutes, teamId, totals: emptyTotals(), logTotals: emptyTotals(), logs: [], invalid: false }
      if (!totals || !teamId || ![text(match.team_a?.id), text(match.team_b?.id)].includes(teamId) || group.teamId !== teamId) group.invalid = true
      if (totals) addTotals(group.totals, totals)
      groups.set(key, group)
    }
  }
  for (const player of list(players)) {
    const id = text(player.player_id || player.id)
    for (const log of getPlayerMatchLogs(player).logs) {
      const matchId = aliases.get(text(log.matchId || log.match_id)) || aliases.get(text(log.rawMatchId || log.raw_match_id))
      const role = roleOf(log.role), order = Number(log.mapOrder ?? log.map_order)
      const group = groups.get(`${matchId}|${order}|${id}|${role}`)
      if (!group) continue
      const totals = readTotals(log, true), minutes = Number(log.playtimeMinutes ?? log.raw_time_mins)
      const hero = getOwHeroCanonicalName(log.hero || log.heroes_played)
      const teamId = text(log.teamId || log.team_id)
      if (!totals || !Number.isFinite(minutes) || minutes <= 0 || !hero || /^(unknown|-)$/i.test(hero) || (teamId && teamId !== group.teamId)) { group.invalid = true; continue }
      addTotals(group.logTotals, totals)
      group.logs.push({ ...log, matchId, mapOrder: order, role, hero, teamId: group.teamId, playtimeMinutes: minutes, totals })
    }
  }
  const valid = [...groups.values()].filter(group => !group.invalid && group.logs.length && sameTotals(group.totals, group.logTotals) && Object.values(group.totals).some(value => value > 0))
    .sort((a, b) => a.key.localeCompare(b.key))
  for (const group of valid) {
    group.logs.sort((a, b) => signature(a).localeCompare(signature(b)))
    group.playtime = Math.min(group.minutes, group.logs.reduce((sum, log) => sum + log.playtimeMinutes, 0))
  }
  const byPlayer = new Map()
  for (const group of valid) {
    if (!byPlayer.has(group.id)) byPlayer.set(group.id, [])
    byPlayer.get(group.id).push(...group.logs)
  }
  const issuePlayers = list(players).filter(player => byPlayer.has(text(player.player_id || player.id))).map(player => ({ ...player, match_logs: byPlayer.get(text(player.player_id || player.id)), live_match_logs: [] }))
  return { valid, scopes, issuePlayers, rejectedAppearances: groups.size - valid.length }
}

// Scores keep the model's raw precision. Display rounding never resolves a tie.
export function compareWeeklyAwardCandidates(a, b) {
  const delta = b.score - a.score
  if (Math.abs(delta) > 1e-9) return delta
  if (a.maps !== b.maps) return b.maps - a.maps
  const deaths = a.per10.deaths - b.per10.deaths
  return Math.abs(deaths) > 1e-9 ? deaths : 0
}

const union = (a, b) => new Set([...a, ...b])
const intersection = (a, b) => new Set([...a].filter(key => b.has(key)))

// Process each person once, keeping role quotas and team counts in the state.
// Forget a team's count after its last candidate: it cannot affect later choices.
// Multi-team appearances count against every recorded team, never today's roster.
// Retain all optimal alternatives instead of awarding tied slots by name or ID.
export function selectWeeklyBestFive(candidates, { teamLimit = null } = {}) {
  const byPlayer = new Map(), byKey = new Map()
  for (const entry of candidates) {
    if(!WEEKLY_POSITIONS.includes(entry.position))continue
    const key = `${entry.id}|${entry.position}`
    byKey.set(key, entry)
    if (!byPlayer.has(entry.id)) byPlayer.set(entry.id, [])
    byPlayer.get(entry.id).push(entry)
  }
  const limited = Number.isInteger(teamLimit) && teamLimit > 0
  const teamsOf = entry => [...new Set(list(entry.teams).map(team => text(team.id || team.team_id)).filter(Boolean))].sort()
  const playerEntries = [...byPlayer.entries()].sort(([a, aEntries], [b, bEntries]) => {
    const aTeams = [...new Set(aEntries.flatMap(teamsOf))].sort().join(',')
    const bTeams = [...new Set(bEntries.flatMap(teamsOf))].sort().join(',')
    return limited && aTeams.localeCompare(bTeams) || a.localeCompare(b)
  }).map(([, entries]) => entries)
  const lastTeamCandidate = new Map()
  playerEntries.forEach((entries, index) => entries.flatMap(teamsOf).forEach(team => lastTeamCandidate.set(team, index)))
  let states = new Map([['0,0,0,0,0', { counts: [0, 0, 0, 0, 0], teamCounts: new Map(), value: [0, 0, 0], required: new Set(), possible: new Set() }]])
  const compareValue = (a, b) => {
    for (let i = 0; i < a.length; i++) if (Math.abs(a[i] - b[i]) > 1e-9) return a[i] - b[i]
    return 0
  }
  const storeState = (target, key, candidate) => {
    const current = target.get(key), delta = current ? compareValue(candidate.value, current.value) : 1
    if (delta > 0) target.set(key, candidate)
    else if (delta === 0) target.set(key, { ...current, required: intersection(current.required, candidate.required), possible: union(current.possible, candidate.possible) })
  }
  for (const [personIndex, entries] of playerEntries.entries()) {
    const next = new Map()
    const advance = candidate => {
      const teamCounts = new Map([...candidate.teamCounts].filter(([team]) => lastTeamCandidate.get(team) > personIndex))
      const key = `${candidate.counts.join(',')}|${[...teamCounts].sort(([a], [b]) => a.localeCompare(b)).map(([team, count]) => `${team}=${count}`).join(',')}`
      storeState(next, key, { ...candidate, teamCounts })
    }
    for (const state of states.values()) {
      advance(state)
      for (const entry of entries) {
        const index = WEEKLY_POSITIONS.indexOf(entry.position), teams = limited ? teamsOf(entry) : []
        if (index < 0 || state.counts[index] >= 1 || limited && (!teams.length || teams.some(team => (state.teamCounts.get(team) || 0) >= teamLimit))) continue
        const counts = [...state.counts]; counts[index]++
        const teamCounts = new Map(state.teamCounts)
        teams.forEach(team => teamCounts.set(team, (teamCounts.get(team) || 0) + 1))
        const key = `${entry.id}|${entry.position}`
        advance({
          counts, teamCounts, value: [state.value[0] + entry.score, state.value[1] + entry.maps, state.value[2] - entry.per10.deaths],
          required: union(state.required, [key]), possible: union(state.possible, [key])
        })
      }
    }
    states = next
  }
  const ranked = [...states.values()].sort((a, b) => b.counts.reduce((x, y) => x + y, 0) - a.counts.reduce((x, y) => x + y, 0) || compareValue(b.value, a.value))
  const best = ranked[0]
  // If the same optimum has different unfilled roles, preserve the ambiguity.
  const tied = ranked.filter(state => state.counts.reduce((x, y) => x + y, 0) === best.counts.reduce((x, y) => x + y, 0) && compareValue(state.value, best.value) === 0)
  const required = tied.reduce((set, state) => intersection(set, state.required), best.required)
  const possible = tied.reduce((set, state) => union(set, state.possible), best.possible)
  return WEEKLY_POSITIONS.map(position => {
    const selected = [...required].map(key => byKey.get(key)).filter(entry => entry.position === position).sort(compareWeeklyAwardCandidates)
    const contenders = [...possible].filter(key => !required.has(key)).map(key => byKey.get(key)).filter(entry => entry.position === position).sort(compareWeeklyAwardCandidates)
    const eligibleCount = candidates.filter(entry => entry.position === position && (!limited || teamsOf(entry).length)).length
    return {position,role:WEEKLY_POSITION_ROLES[position],player:selected[0]||null,status:selected[0]?'selected':contenders.length?'tie':eligibleCount?'lineup-limit':'insufficient-data',contenders:selected[0]?[]:contenders}
  })
}

export function buildWeeklyAwards(report, players = [], { referenceReports = [] } = {}) {
  const inputs = collectIssueInputs(report, players)
  const positionAssignments=buildWeeklyPositionAssignments(inputs.valid)
  const seasonId = text(report?.seasonId || inputs.scopes.values().next().value?.match?.season_id)
  const currentBaselines = buildRatingBaselinesFromPlayerLogs(inputs.issuePlayers, { seasonId, useFrozenBaselines: false })
  const referenceScope = selectWeeklyReferenceReports(report, referenceReports)
  const reference = buildWeeklyReference(report, inputs, referenceScope.reports.map(previous => collectIssueInputs(previous, players)), players, referenceScope)
  const referenceVersion = signature(reference.snapshot)
  const scoringLogs = new Map()
  for (const log of currentBaselines.logs) {
    const key = `${log.matchId}|${log.playerId}|${roleOf(log.role)}`
    if (!scoringLogs.has(key)) scoringLogs.set(key, [])
    scoringLogs.get(key).push(log)
  }
  const people = new Map(list(players).map(player => [text(player.player_id || player.id), player]))
  const entries = new Map(), matchRoles = new Map()
  for (const group of inputs.valid) {
    const key = `${group.matchId}|${group.id}|${group.role}`
    if (!matchRoles.has(key)) matchRoles.set(key, [])
    matchRoles.get(key).push(group)
  }
  for (const roleGroups of matchRoles.values()) {
    const first=roleGroups[0],assignment=positionAssignments.get(first.id),position=assignment?.position
    if(!position||WEEKLY_POSITION_ROLES[position]!==first.role)continue
    const positionRecord=assignment.positions.find(entry=>entry.position===position)
    const groups=roleGroups.filter(group=>positionRecord.mapMinutes[group.scope]>0)
    if(!groups.length)continue
    const match = inputs.scopes.get(first.scope).match
    const baselines = reference.forPlayer(first.id)
    const currentLogs = (scoringLogs.get(`${first.matchId}|${first.id}|${first.role}`) || []).filter(log=>log.resolution.known&&log.resolution.resolvedSubrole===position&&groups.some(group=>String(group.order)===String(log.mapOrder)))
    const hasReference = currentLogs.length > 0 && currentLogs.every(log => baselines.bySubrole[log.resolution.resolvedSubrole])
    const summary = hasReference ? calculateMatchPlayerScoreV1({
      entry: { player_id: first.id, role: engineRole(first.role), roleTimeMins: groups.reduce((sum, group) => sum + positionRecord.mapMinutes[group.scope], 0) },
      baselines: { ...baselines, logs: currentLogs },
      currentMatchIds: [first.matchId], currentMapOrders: groups.map(group => String(group.order)),
      mapDurationsByOrder: Object.fromEntries(groups.map(group => [String(group.order), positionRecord.mapMinutes[group.scope]]))
    }) : null
    const scored = summary?.sourceScope === 'current_match_hero_logs' && summary.sourceLogCount > 0 && Number.isFinite(summary.rawScore)
    const key = `${first.id}|${first.role}`, person = people.get(first.id)
    const candidate = entries.get(key) || {
      id: first.id, role: first.role, position, positionAssignment:assignment, name: text(person?.nickname || person?.display_name || person?.player_name || first.id).replace(/#\d+$/, ''),
      maps: 0, minutes: 0, scoredMaps: 0, weightedScore: 0, totals: emptyTotals(), heroMinutes: new Map(), teams: new Map(), sources: [], referenceSupport: 'broader'
    }
    const minutes = groups.reduce((sum, group) => sum + positionRecord.mapMinutes[group.scope], 0)
    candidate.maps += groups.length; candidate.minutes += minutes
    if (scored) { candidate.scoredMaps += groups.length; candidate.weightedScore += summary.rawScore * minutes }
    if (currentLogs.some(log => baselines.bySubrole[log.resolution.resolvedSubrole]?.supportStatus !== 'broader')) candidate.referenceSupport = 'limited'
    candidate.sources.push({ matchId: first.matchId, position, maps: groups.map(group => group.order), rawScore: scored ? summary.rawScore : null,
      minutes, scored: Boolean(scored), referenceVersion, model: getRatingModelVersion() })
    for (const group of groups) {
      const logs=group.logs.filter(log=>weeklyLogPosition(log,group.role)===position)
      for(const log of logs)addTotals(candidate.totals,log.totals)
      const team = [match.team_a, match.team_b].find(team => text(team?.id) === group.teamId)
      candidate.teams.set(group.teamId, team)
      const total = logs.reduce((sum, log) => sum + log.playtimeMinutes, 0)
      for (const log of logs) candidate.heroMinutes.set(log.hero, (candidate.heroMinutes.get(log.hero) || 0) + log.playtimeMinutes / total * positionRecord.mapMinutes[group.scope])
    }
    entries.set(key, candidate)
  }
  const candidates = [...entries.values()].map(entry => ({
    id: entry.id, role: entry.role, position:entry.position, positionAssignment:entry.positionAssignment, name: entry.name, maps: entry.maps, minutes: entry.minutes,
    score: entry.scoredMaps === entry.maps ? entry.weightedScore / entry.minutes : null,
    qualified: entry.maps >= WEEKLY_AWARD_POLICY.minimumMaps && entry.scoredMaps === entry.maps,
    sample: { maps: entry.maps, minutes: entry.minutes, matches: entry.sources.length,
      status: entry.scoredMaps !== entry.maps ? 'reference-pending' : entry.maps < WEEKLY_AWARD_POLICY.minimumMaps ? 'insufficient-maps' : 'eligible',
      referenceMode: reference.metadata.mode, referenceSupport: entry.referenceSupport },
    totals: entry.totals, per10: Object.fromEntries(metricFields.map(([key]) => [key, entry.totals[key] / entry.minutes * 10])),
    hero: [...entry.heroMinutes].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] || '',
    teams: [...entry.teams.values()].filter(Boolean), sources: entry.sources
  })).sort((a, b) => Number(b.score !== null) - Number(a.score !== null) || compareWeeklyAwardCandidates(a, b))
  const qualified = candidates.filter(entry => entry.qualified)
  for (const role of roleOrder) {
    const peers = qualified.filter(entry => entry.role === role)
    peers.forEach((entry, index) => { entry.roleRank = index && compareWeeklyAwardCandidates(entry, peers[index - 1]) === 0 ? peers[index - 1].roleRank : index + 1 })
  }
  for(const position of WEEKLY_POSITIONS){const peers=qualified.filter(entry=>entry.position===position);peers.forEach((entry,index)=>{entry.positionRank=index&&compareWeeklyAwardCandidates(entry,peers[index-1])===0?peers[index-1].positionRank:index+1})}
  const mvp = qualified.length ? [...new Map(qualified.filter(entry => compareWeeklyAwardCandidates(entry, qualified[0]) === 0).map(entry => [entry.id, entry])).values()] : []
  const bestFive = selectWeeklyBestFive(qualified, WEEKLY_AWARD_POLICY)
  const snapshot = {
    cycleId: report?.cycle?.id, weekId: report?.week?.id, sourceAt: report?.sourceAt,
    policy: WEEKLY_AWARD_POLICY, modelVersion: getRatingModelVersion(), modelConfig: { ...ratingConfig },
    inputs: weeklyInputSnapshot(inputs.valid), positionAssignments:[...positionAssignments].sort(([a],[b])=>a.localeCompare(b)).map(([id,assignment])=>({id,...assignment})), reference: reference.snapshot,
    baseline: reference.snapshot.baseline
  }
  return {
    status: 'automatic-preview', complete: mvp.length > 0 && bestFive.every(slot => slot.status === 'selected'),
    policy: WEEKLY_AWARD_POLICY, modelVersion: getRatingModelVersion(), inputVersion: signature(snapshot), snapshot,
    reference: { ...reference.metadata, inputVersion: referenceVersion },
    eligible: Object.fromEntries(roleOrder.map(role => [role, qualified.filter(entry => entry.role === role).length])),
    eligiblePositions:Object.fromEntries(WEEKLY_POSITIONS.map(position=>[position,qualified.filter(entry=>entry.position===position).length])),
    pendingPositions:[...positionAssignments].filter(([,assignment])=>assignment.status!=='assigned').map(([id,assignment])=>({id,name:text(people.get(id)?.nickname||people.get(id)?.display_name||id).replace(/#\d+$/,''),...assignment})),
    rejectedAppearances: inputs.rejectedAppearances,
    validMaps: new Set(inputs.valid.map(group => group.scope)).size,
    scoredMaps: new Set(candidates.flatMap(entry => entry.sources.filter(source => source.scored).flatMap(source => source.maps.map(order => `${source.matchId}|${order}`)))).size,
    candidates, mvp, bestFive
  }
}
