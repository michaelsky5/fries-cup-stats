import { buildRatingBaselinesFromPlayerLogs } from '../../lib/ratingBaselines.js'

const list = value => Array.isArray(value) ? value : []
const text = value => String(value ?? '').trim()
const count = values => new Set(values.filter(Boolean)).size
const timestamp = value => value ? Date.parse(value) : NaN

// These are reference-support targets, not calibrated confidence percentages.
export const WEEKLY_REFERENCE_POLICY = Object.freeze({
  version: 'weekly-reference-v1', scope: 'same-season-cycle-format',
  minimumPlayers: 2, minimumTeams: 2,
  targets: Object.freeze({ logs: 20, minutes: 120, players: 6, teams: 4, matches: 3 }),
  startup: 'current-week-subrole-leave-player-out'
})

export function selectWeeklyReferenceReports(report, reports = []) {
  const scheduled = list(report?.overview?.matches || report?.completed).map(match => timestamp(match.scheduled_at)).filter(Number.isFinite)
  const weekStart = timestamp(report?.week?.starts_at || report?.week?.startsAt)
  const cutoff = Number.isFinite(weekStart) ? weekStart : scheduled.length ? Math.min(...scheduled) : NaN
  const formats = new Set(list(report?.completed).map(match => text(match.format)).filter(Boolean))
  const gameVersion = text(report?.gameVersion)
  const selected = []
  let versionVerified = Boolean(gameVersion), excludedMatches = 0
  const earlier = list(reports).filter(previous =>
    text(report?.seasonId) && text(report?.cycle?.id) &&
    text(previous?.seasonId) === text(report?.seasonId) && text(previous?.cycle?.id) === text(report?.cycle?.id) &&
    Number.isInteger(Number(previous?.week?.week_number)) && Number(previous.week.week_number) >= 1 &&
    Number(previous.week.week_number) < Number(report?.week?.week_number)
  ).sort((a, b) => Number(a.week.week_number) - Number(b.week.week_number) || text(a.week.id).localeCompare(text(b.week.id)))
  for (const previous of earlier) {
    const completed = list(previous.completed).filter(match => {
      const date = timestamp(match.scheduled_at)
      const patch = text(match.game_version || previous.gameVersion)
      const allowed = Number.isFinite(cutoff) && Number.isFinite(date) && date < cutoff &&
        (!formats.size || formats.has(text(match.format))) && (!gameVersion || !patch || patch === gameVersion)
      if (!allowed) excludedMatches++
      else if (!patch || !gameVersion) versionVerified = false
      return allowed
    })
    if (!completed.length) continue
    const ids = new Set(completed.map(match => text(match.id)))
    selected.push({ ...previous, completed, maps: list(previous.maps).filter(map => ids.has(text(map.matchId))) })
  }
  return {
    reports: selected, cutoff: Number.isFinite(cutoff) ? new Date(cutoff).toISOString() : null,
    cutoffMode: Number.isFinite(weekStart) ? 'week-start' : scheduled.length ? 'first-scheduled-match' : 'unavailable',
    gameVersion: gameVersion || null, versionStatus: versionVerified && selected.length ? 'verified' : 'unverified', excludedMatches
  }
}

function groupRows(baselines, type, key) {
  const field = { heroes: 'canonicalHeroName', scoringProfiles: 'scoringProfile', subroles: 'resolvedSubrole' }[type]
  return baselines.logs.filter(row => row.resolution[field] === key)
}

export function decorateWeeklyBaselines(baselines, { startup = false } = {}) {
  const result = { ...baselines }
  for (const [type, lookup] of [['heroes', 'byHero'], ['scoringProfiles', 'byScoringProfile'], ['subroles', 'bySubrole']]) {
    result[type] = startup && type !== 'subroles' ? [] : baselines[type].map(group => {
      const rows = groupRows(baselines, type, group.key)
      const uniqueMatches = count(rows.map(row => row.matchId))
      const targets = WEEKLY_REFERENCE_POLICY.targets
      const maturity = Math.min(1, group.sampleLogs / targets.logs, group.totalPlaytimeMinutes / targets.minutes,
        group.uniquePlayers / targets.players, group.uniqueTeams / targets.teams, uniqueMatches / targets.matches)
      return { ...group, uniqueMatches, independentSampleMaturity: maturity,
        referenceUsable: group.uniquePlayers >= WEEKLY_REFERENCE_POLICY.minimumPlayers && group.uniqueTeams >= WEEKLY_REFERENCE_POLICY.minimumTeams,
        supportStatus: maturity >= 1 ? 'broader' : 'limited' }
    })
    result[lookup] = Object.fromEntries(result[type].filter(group => group.referenceUsable).map(group => [group.key, group]))
  }
  return result
}

export function weeklyInputSnapshot(groups) {
  return groups.map(group => ({ matchId: group.matchId, mapOrder: group.order, playerId: group.id, role: group.role,
    teamId: group.teamId, mapMinutes: group.minutes,
    logs: group.logs.map(log => ({ hero: log.hero, minutes: log.playtimeMinutes, totals: log.totals })) }))
}

export function buildWeeklyReference(report, currentInputs, historyInputs, players, scope) {
  const historical = [...new Map(historyInputs.flatMap(inputs => inputs.valid).map(group => [group.key, group])).values()].sort((a, b) => a.key.localeCompare(b.key))
  const groups = historical.length ? historical : currentInputs.valid
  const byPlayer = new Map()
  for (const group of groups) {
    if (!byPlayer.has(group.id)) byPlayer.set(group.id, [])
    byPlayer.get(group.id).push(...group.logs)
  }
  const referencePlayers = list(players).filter(player => byPlayer.has(text(player.player_id || player.id)))
    .map(player => ({ ...player, match_logs: byPlayer.get(text(player.player_id || player.id)), live_match_logs: [] }))
  const startup = !historical.length
  const build = rows => decorateWeeklyBaselines(buildRatingBaselinesFromPlayerLogs(rows, { seasonId: report?.seasonId, useFrozenBaselines: false }), { startup })
  const baselines = build(referencePlayers), playerReferences = new Map()
  const metadata = {
    policy: WEEKLY_REFERENCE_POLICY, mode: startup ? 'startup-peer-subrole' : 'prior-weeks',
    cutoff: scope.cutoff, cutoffMode: scope.cutoffMode, gameVersion: scope.gameVersion, versionStatus: scope.versionStatus,
    weekIds: startup ? [] : scope.reports.filter(previous => historical.some(group => previous.completed.some(match => match.id === group.matchId))).map(previous => previous.week.id),
    matches: count(groups.map(group => group.matchId)), maps: count(groups.map(group => group.scope)),
    players: count(groups.map(group => group.id)), teams: count(groups.map(group => group.teamId)),
    logs: baselines.logs.length, minutes: groups.reduce((sum, group) => sum + group.playtime, 0),
    excludedMatches: scope.excludedMatches, sourceAt: report?.sourceAt,
    snapshotStatus: 'rebuilt-local-preview'
  }
  return {
    metadata, baselines,
    snapshot: { ...metadata, inputs: weeklyInputSnapshot(groups), baseline: { heroes: baselines.heroes, scoringProfiles: baselines.scoringProfiles, subroles: baselines.subroles } },
    forPlayer(id) {
      if (!startup) return baselines
      // A debut-week player's own performance never defines their peer reference.
      if (!playerReferences.has(id)) playerReferences.set(id, build(referencePlayers.filter(player => text(player.player_id || player.id) !== id)))
      return playerReferences.get(id)
    }
  }
}
