import { getMatchScheduleDateKey } from './competitionDay.js'

// A bounded season-OVR policy, not a replacement for the hero performance model.
export const SEASON_OPPONENT_POLICY = Object.freeze({
  version: 'series_elo_v1',
  initialRating: 1500,
  matchK: 32,
  matureMatches: 3,
  ratingPointsPerOvr: 50,
  maxOvrAdjustment: 3
})

const timelineCache = new WeakMap()
const text = value => String(value ?? '').trim()
const key = value => text(value).toLowerCase()
const clamp = (value, min, max) => Math.min(max, Math.max(min, value))
const round = value => Math.round(value * 1000) / 1000
const positive = value => Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : 0
const score = value => value == null || text(value) === '' || !Number.isFinite(Number(value)) || Number(value) < 0 ? null : Number(value)

function isBye(team) {
  return [team?.id, team?.name, team?.short].some(value => /^(bye|轮空)$/i.test(text(value)))
}

function resultForMatch(match) {
  if (key(match?.status) !== 'complete' || key(match?.result_mode || 'NORMAL') !== 'normal' ||
    match?.is_forfeit || match?.is_bye || match?.is_administrative || isBye(match?.team_a) || isBye(match?.team_b)) return null
  const a = score(match?.team_a?.score)
  const b = score(match?.team_b?.score)
  const winner = key(match?.winner)
  const aWon = winner && [match?.team_a?.id, match?.team_a?.name, match?.team_a?.short].map(key).includes(winner)
  const bWon = winner && [match?.team_b?.id, match?.team_b?.name, match?.team_b?.short].map(key).includes(winner)
  // Missing scores are not 0-0 draws. Conflicting results have no rating effect.
  if (a == null || b == null || (aWon && bWon)) return null
  if (winner && !aWon && !bWon && !['draw', 'tie', '平局'].includes(winner)) return null
  if ((aWon && a <= b) || (bWon && b <= a) || (winner && !aWon && !bWon && a !== b)) return null
  return a === b ? 0.5 : a > b ? 1 : 0
}

function validDate(match) {
  const date = getMatchScheduleDateKey(match)
  const timestamp = Date.parse(`${date}T00:00:00Z`)
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === date ? date : ''
}

function register(map, id, value) {
  if (!id) return
  if (!map.has(id)) map.set(id, value)
  else if (map.get(id) !== value) map.set(id, null)
}

export function buildSeasonTeamTimeline(db) {
  if (db && timelineCache.has(db)) return timelineCache.get(db)
  const matches = Array.isArray(db?.matches) ? db.matches : []
  const idCounts = new Map()
  matches.forEach(match => {
    const id = key(match?.match_id || match?.id || match?.raw_match_id)
    idCounts.set(id, (idCounts.get(id) || 0) + 1)
  })
  const records = matches.map(match => {
    const id = key(match?.match_id || match?.id || match?.raw_match_id)
    const teamA = key(match?.team_a?.id)
    const teamB = key(match?.team_b?.id)
    const date = validDate(match)
    const result = resultForMatch(match)
    return {
      id, matchId: text(match?.match_id || match?.id || match?.raw_match_id), date, teamA, teamB,
      teamAName: text(match?.team_a?.name || match?.team_a?.short || match?.team_a?.id),
      teamBName: text(match?.team_b?.name || match?.team_b?.short || match?.team_b?.id),
      aliases: [...new Set([match?.match_id, match?.id, match?.raw_match_id].map(key).filter(Boolean))],
      eligible: Boolean(id && idCounts.get(id) === 1 && date && teamA && teamB && teamA !== teamB && result != null),
      result
    }
  }).sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
  const canonical = new Map()
  const aliases = new Map()
  const teams = new Map()
  const initial = () => ({ rating: SEASON_OPPONENT_POLICY.initialRating, matches: 0 })
  let ratedMatches = 0

  // All games on a competition day use the same prior-day snapshot. Start times
  // alone do not prove another series has finished; input ordering cannot leak it.
  for (let start = 0; start < records.length;) {
    let end = start + 1
    while (end < records.length && records[end].date === records[start].date) end += 1
    const updates = new Map()
    for (const record of records.slice(start, end)) {
      const a = teams.get(record.teamA) || initial()
      const b = teams.get(record.teamB) || initial()
      const context = { ...record, teamARating: a.rating, teamBRating: b.rating, teamAPriorMatches: a.matches, teamBPriorMatches: b.matches }
      register(canonical, record.id, context)
      record.aliases.forEach(alias => register(aliases, alias, context))
      if (!record.eligible) continue
      const expected = 1 / (1 + 10 ** ((b.rating - a.rating) / 400))
      const delta = SEASON_OPPONENT_POLICY.matchK * (record.result - expected)
      for (const [team, change] of [[record.teamA, delta], [record.teamB, -delta]]) {
        const update = updates.get(team) || { delta: 0, matches: 0 }
        update.delta += change
        update.matches += 1
        updates.set(team, update)
      }
      ratedMatches += 1
    }
    for (const [team, update] of updates) {
      const before = teams.get(team) || initial()
      teams.set(team, { rating: before.rating + update.delta, matches: before.matches + update.matches })
    }
    start = end
  }
  const timeline = { canonical, aliases, ratedMatches }
  if (db && typeof db === 'object') timelineCache.set(db, timeline)
  return timeline
}

function resolveContext(timeline, log) {
  // Published canonical IDs take precedence over older raw aliases, which may
  // have been renumbered. Ambiguous IDs are deliberately unavailable.
  for (const id of [...new Set([log?.matchId, log?.rawMatchId].map(key).filter(Boolean))]) {
    if (timeline.canonical.has(id)) return timeline.canonical.get(id)
    if (timeline.aliases.has(id)) return timeline.aliases.get(id)
  }
  return null
}

export function buildSeasonOpponentEvidence({ db, logs = [], totalMinutes = 0 } = {}) {
  const timeline = buildSeasonTeamTimeline(db)
  const minutes = Math.max(positive(totalMinutes), logs.reduce((sum, log) => sum + positive(log?.minutes), 0))
  const meetings = new Map()
  let matchedMinutes = 0
  let historyMinutes = 0
  let matureMinutes = 0
  let weightedDifference = 0
  let weightedRating = 0
  for (const log of logs) {
    const time = positive(log?.minutes)
    const context = resolveContext(timeline, log)
    const team = key(log?.teamId)
    if (!time || !context?.eligible || !team || ![context.teamA, context.teamB].includes(team)) continue
    const isA = team === context.teamA
    const opponentId = isA ? context.teamB : context.teamA
    const opponentName = isA ? context.teamBName : context.teamAName
    const rating = isA ? context.teamBRating : context.teamARating
    const priorMatches = isA ? context.teamBPriorMatches : context.teamAPriorMatches
    const historyWeight = clamp(priorMatches / SEASON_OPPONENT_POLICY.matureMatches, 0, 1)
    const difference = (rating - SEASON_OPPONENT_POLICY.initialRating) * historyWeight
    matchedMinutes += time
    if (priorMatches > 0) historyMinutes += time
    if (historyWeight === 1) matureMinutes += time
    weightedDifference += difference * time
    weightedRating += rating * time
    const meetingKey = `${context.id}:${team}`
    const meeting = meetings.get(meetingKey) || {
      matchId: context.matchId, date: context.date, teamId: team, opponentId, opponentName,
      rating: round(rating), priorMatches, historyWeight: round(historyWeight), minutes: 0
    }
    meeting.minutes += time
    meetings.set(meetingKey, meeting)
  }
  const matchCount = new Set([...meetings.values()].map(meeting => meeting.matchId)).size
  const sampleWeight = clamp(matchCount / SEASON_OPPONENT_POLICY.matureMatches, 0, 1)
  // Unmatched time stays in the denominator with a neutral contribution.
  const effectiveDifference = minutes > 0 ? weightedDifference / minutes : 0
  return {
    version: SEASON_OPPONENT_POLICY.version,
    status: !matchedMinutes ? 'UNAVAILABLE' : !historyMinutes ? 'NO_HISTORY' : matchedMinutes < minutes - 0.001 ? 'PARTIAL' : 'AVAILABLE',
    totalMinutes: round(minutes), matchedMinutes: round(matchedMinutes), historyMinutes: round(historyMinutes), matureMinutes: round(matureMinutes),
    coverage: minutes > 0 ? round(matchedMinutes / minutes) : 0,
    historyCoverage: minutes > 0 ? round(historyMinutes / minutes) : 0,
    weightedOpponentRating: matchedMinutes > 0 ? round(weightedRating / matchedMinutes) : null,
    effectiveOpponentRating: round(SEASON_OPPONENT_POLICY.initialRating + effectiveDifference),
    matchCount, sampleWeight: round(sampleWeight),
    requestedAdjustment: round(clamp(effectiveDifference / SEASON_OPPONENT_POLICY.ratingPointsPerOvr * sampleWeight, -SEASON_OPPONENT_POLICY.maxOvrAdjustment, SEASON_OPPONENT_POLICY.maxOvrAdjustment)),
    meetings: [...meetings.values()].map(meeting => ({ ...meeting, minutes: round(meeting.minutes) }))
      .sort((a, b) => a.date.localeCompare(b.date) || a.matchId.localeCompare(b.matchId) || a.teamId.localeCompare(b.teamId))
  }
}

export function applySeasonOpponentAdjustment(entry) {
  const provisional = entry.seasonRatingStatus === 'PROVISIONAL'
  const base = entry.seasonRatingStatus === 'UNRATED' ? null : score(provisional ? entry.provisionalSeasonOvr : entry.seasonOvr)
  const requested = Number(entry.seasonOpponentEvidence?.requestedAdjustment) || 0
  // Symmetric rounding avoids treating +0.5 and -0.5 differently.
  const delta = Math.sign(requested) * Math.round(Math.abs(clamp(requested, -SEASON_OPPONENT_POLICY.maxOvrAdjustment, SEASON_OPPONENT_POLICY.maxOvrAdjustment)))
  const cap = Math.min(99, score(entry.seasonOvrCap) ?? 99)
  const value = base == null ? null : clamp(base + delta, 60, cap)
  return {
    ...entry,
    seasonOvrBeforeOpponent: base,
    seasonOpponentAdjustment: value == null ? 0 : value - base,
    ...(provisional ? { provisionalSeasonOvr: value } : { seasonOvr: value })
  }
}
