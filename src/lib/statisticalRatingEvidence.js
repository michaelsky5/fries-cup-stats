import { collectRatingLogRowsFromPlayers } from './ratingBaselines.js'
import { resolveHeroSubrole } from './heroSubroleSelectors.js'
import { getOwMapMode } from './heroes.js'
import { STATISTICAL_RATING_POLICY, EVIDENCE_SCHEMA_VERSION, STAT_KEYS } from '../config/statisticalRatingConfig.js'

export const text = value => String(value ?? '').trim()
export const finite = value => (typeof value === 'number' || typeof value === 'string' && value.trim() !== '') &&
  Number.isFinite(Number(value))
export const round = (value, digits = 4) => Number.isFinite(value) ? +value.toFixed(digits) : null
export const groupBy = (rows, getKey) => {
  const result = new Map()
  for (const row of rows) {
    const key = getKey(row)
    if (!result.has(key)) result.set(key, [])
    result.get(key).push(row)
  }
  return result
}
export const evidenceKey = row => [row.seasonId, row.matchId, row.mapOrder, row.playerId].map(text).join('|')

export function localDay(timestamp) {
  if (!text(timestamp) || !Number.isFinite(Date.parse(timestamp))) return null
  return new Date(Date.parse(timestamp) + STATISTICAL_RATING_POLICY.timezoneOffsetHours * 3600000).toISOString().slice(0, 10)
}

export function getEra(day, patch = '') {
  if (patch) return { key: 'patch:' + patch, verified: true }
  if (!day || STATISTICAL_RATING_POLICY.transitionDays.includes(day)) return { key: 'unknown-transition', verified: false }
  return { key: day >= STATISTICAL_RATING_POLICY.firstSeason5Day ? 'calendar:season5' : 'calendar:legacy', verified: false }
}

export function heroVersion(row) {
  if (row.hero === 'Sombra') return row.resolution.officialRole === 'SUPPORT' ? 'support-rework' : 'damage-legacy'
  if (row.hero === 'Roadhog') {
    if (row.patch) return row.patch >= '2026-10-06' ? 'season5-rework' : 'legacy'
    if (row.era.key === 'unknown-transition') return 'unknown'
    return row.day >= STATISTICAL_RATING_POLICY.firstSeason5Day ? 'season5-rework-proxy' : 'legacy-proxy'
  }
  return row.patch ? 'patch:' + row.patch : row.era.key
}

const aliases = {
  elims: ['elims', 'eliminations', 'total_elim', 'elim'], assists: ['assists', 'asts', 'total_ast', 'ast'],
  deaths: ['deaths', 'dths', 'total_dth', 'dth'], damage: ['damage', 'total_dmg', 'dmg'],
  healing: ['healing', 'heal', 'total_heal'], blocked: ['blocked', 'block', 'mitigation', 'total_block']
}

function readTotals(log) {
  return Object.fromEntries(STAT_KEYS.map(key => {
    const values = aliases[key].flatMap(alias => [log?.totals?.[alias], log?.[alias]])
    const value = values.find(value => value !== undefined)
    return [key, finite(value) && Number(value) >= 0 ? Number(value) : null]
  }))
}

function rawPlayerRow(map, playerId) {
  return [...(map?.team_a_stats || []), ...(map?.team_b_stats || []), ...(map?.player_stats || [])]
    .find(row => text(row.player_id || row.playerId) === playerId)
}

export function validateEvidence(record, parent) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) return { valid: false, errors: ['RECORD_INVALID'] }
  if (!parent) return { valid: false, errors: ['PARENT_REQUIRED'] }
  const errors = []
  if (record?.schemaVersion !== EVIDENCE_SCHEMA_VERSION) errors.push('SCHEMA_VERSION')
  if (!parent || evidenceKey(record) !== evidenceKey(parent)) errors.push('IDENTITY_MISMATCH')
  if (record?.status !== 'CONFIRMED' || !text(record?.verifiedBy) || !text(record?.sourceReference)) errors.push('PROVENANCE_REQUIRED')
  const validPatchDate = /^\d{4}-\d{2}-\d{2}$/.test(record?.patch || '') &&
    Number.isFinite(Date.parse(record.patch)) && new Date(record.patch).toISOString().slice(0, 10) === record.patch
  if (!validPatchDate || (parent?.day && record.patch > parent.day)) errors.push('PATCH_INVALID')
  if (record?.gameFormat !== '5V5_STANDARD') errors.push('GAME_FORMAT_REQUIRED')
  if (!['HERO_SEGMENTS', 'MAP_SINGLE_HERO'].includes(record?.statsScope)) errors.push('STATS_SCOPE')
  const segments = Array.isArray(record?.segments) ? record.segments : []
  if (!segments.length) errors.push('SEGMENTS_REQUIRED')
  const totals = Object.fromEntries(STAT_KEYS.map(key => [key, 0]))
  const intervals = []
  const ids = new Set()
  for (const segment of segments) {
    if (!segment || typeof segment !== 'object' || Array.isArray(segment)) {
      errors.push('SEGMENT_INVALID')
      continue
    }
    if (!text(segment.segmentId) || ids.has(text(segment.segmentId))) errors.push('SEGMENT_ID')
    ids.add(text(segment.segmentId))
    const resolution = resolveHeroSubrole(segment.hero, { role: segment.role })
    const role = { TANK: 'TANK', DPS: 'DAMAGE', DAMAGE: 'DAMAGE', SUP: 'SUPPORT', SUPPORT: 'SUPPORT' }[text(segment.role).toUpperCase()]
    if (!resolution.known || !role || resolution.officialRole !== role) errors.push('HERO_OR_ROLE_INVALID')
    if (resolution.canonicalHeroName === 'Sombra' && validPatchDate &&
      (record.patch >= '2026-10-06' ? role !== 'SUPPORT' : role !== 'DAMAGE')) errors.push('ROLE_VERSION_MISMATCH')
    if (finite(segment.startSeconds) && finite(segment.endSeconds) &&
      Number(segment.startSeconds) >= 0 && Number(segment.endSeconds) > Number(segment.startSeconds) &&
      Number(segment.endSeconds) <= (parent?.playtimeMinutes || 0) * 60 + 1) {
      intervals.push([Number(segment.startSeconds), Number(segment.endSeconds)])
    } else errors.push('SEGMENT_TIME_INVALID')
    for (const key of STAT_KEYS) {
      const state = segment.metricStates?.[key] || 'OBSERVED'
      const value = segment.totals?.[key]
      if (!['OBSERVED', 'MISSING', 'NOT_APPLICABLE'].includes(state)) errors.push('METRIC_STATE_INVALID:' + key)
      if (state === 'OBSERVED') {
        if (!finite(value) || Number(value) < 0) errors.push('TOTAL_INVALID:' + key)
        else totals[key] += Number(value)
      } else if (value !== null) errors.push('UNOBSERVED_TOTAL_MUST_BE_NULL:' + key)
      if (state === 'NOT_APPLICABLE' && !text(segment.metricNotes?.[key])) errors.push('APPLICABILITY_REASON_REQUIRED:' + key)
    }
  }
  intervals.sort((a, b) => a[0] - b[0])
  for (let index = 1; index < intervals.length; index++) {
    if (intervals[index][0] < intervals[index - 1][1]) errors.push('SEGMENTS_OVERLAP')
  }
  for (const key of STAT_KEYS) {
    if (finite(parent?.totals?.[key]) && totals[key] > parent.totals[key] + 1e-6) errors.push('TOTAL_EXCEEDS_MAP:' + key)
  }
  if (record?.statsScope === 'MAP_SINGLE_HERO') {
    const segment = segments[0]
    if (segments.length !== 1 || Number(segment?.startSeconds) !== 0 ||
      Math.abs(Number(segment?.endSeconds) - (parent?.playtimeMinutes || 0) * 60) > 1) errors.push('SINGLE_HERO_FULL_TIME_REQUIRED')
    for (const key of STAT_KEYS) {
      if ((segment?.metricStates?.[key] || 'OBSERVED') === 'OBSERVED' &&
        (!finite(parent?.totals?.[key]) || Math.abs(totals[key] - parent.totals[key]) > 1e-6)) errors.push('SINGLE_HERO_TOTAL_MISMATCH:' + key)
    }
  }
  return { valid: errors.length === 0, errors: [...new Set(errors)] }
}

function finishRow(row) {
  row.per10 = Object.fromEntries(STAT_KEYS.map(key => [key,
    finite(row.totals[key]) ? row.totals[key] / row.playtimeMinutes * 10 : null]))
  row.era = getEra(row.day, row.patch)
  row.heroVersion = heroVersion(row)
  return row
}

export function prepareStatisticalRatingData(db, seasonId, evidenceRecords = []) {
  if (!Array.isArray(evidenceRecords) || evidenceRecords.some(record => !record || typeof record !== 'object' || Array.isArray(record))) {
    throw new Error('Evidence must be an array of record objects')
  }
  const collected = collectRatingLogRowsFromPlayers(db.players || [], { seasonId })
  const matches = new Map()
  for (const match of db.matches || []) {
    for (const id of [match.match_id, match.raw_match_id].filter(Boolean)) matches.set(text(id), match)
  }
  const annotations = new Map()
  for (const record of evidenceRecords.filter(record => record.seasonId === seasonId)) {
    const id = evidenceKey(record)
    if (annotations.has(id)) throw new Error('Duplicate evidence identity: ' + id)
    annotations.set(id, record)
  }
  const coverage = { collected: collected.rows.length, excluded: {}, proxyRows: 0, verifiedRows: 0, invalidEvidence: [] }
  const rows = []
  const exclude = reason => { coverage.excluded[reason] = (coverage.excluded[reason] || 0) + 1 }
  const parentIdentity = original => evidenceKey({
    seasonId, matchId: (matches.get(original.matchId) || matches.get(original.rawMatchId))?.match_id || original.matchId,
    mapOrder: original.mapOrder, playerId: original.playerId
  })
  const identities = groupBy(collected.rows, parentIdentity)
  for (const original of collected.rows) {
    if (identities.get(parentIdentity(original)).length > 1) { exclude('AMBIGUOUS_MAP_IDENTITY'); continue }
    const match = matches.get(original.matchId) || matches.get(original.rawMatchId)
    if (!match || match.status !== 'COMPLETE' || match.is_forfeit) { exclude('MATCH_NOT_COMPLETED'); continue }
    const map = match.maps?.find(map => text(map.map_order) === original.mapOrder)
    if (!map || map.rating_eligible === false || map.is_administrative) { exclude('MAP_NOT_ELIGIBLE'); continue }
    const day = localDay(match.scheduled_at)
    if (!day) { exclude('MATCH_DATE_UNKNOWN'); continue }
    const sides = [text(match.team_a?.id), text(match.team_b?.id)]
    if (!sides.includes(original.teamId)) { exclude('TEAM_NOT_IN_MATCH'); continue }
    const totals = readTotals(original.rawLog)
    const sourceRow = rawPlayerRow(map, original.playerId)
    if (!sourceRow) { exclude('MAP_PLAYER_MISSING'); continue }
    const rawTotals = readTotals(sourceRow)
    if (STAT_KEYS.some(key => finite(totals[key]) && finite(rawTotals[key]) && totals[key] !== rawTotals[key])) {
      exclude('MAP_TOTAL_MISMATCH'); continue
    }
    const parent = {
      ...original, seasonId, matchId: text(match.match_id), totals, day, patch: '',
      result: sides.includes(text(map.winner)) ? text(map.winner) === original.teamId ? 'WIN' : 'LOSS' : null,
      mode: getOwMapMode(map.map_type || original.rawLog.mapType),
      statsScope: 'MAP_TOTAL_WITH_HERO_LABEL', verified: false,
      metricStates: Object.fromEntries(STAT_KEYS.map(key => [key, finite(totals[key]) ? 'OBSERVED' : 'MISSING']))
    }
    parent.rowId = evidenceKey(parent) + ':map'
    const annotation = annotations.get(evidenceKey(parent))
    if (annotation) {
      const validation = validateEvidence(annotation, parent)
      if (!validation.valid) {
        coverage.invalidEvidence.push({ key: evidenceKey(parent), errors: validation.errors })
        exclude('INVALID_EVIDENCE')
        continue
      }
      annotations.delete(evidenceKey(parent))
      for (const segment of annotation.segments) {
        const resolution = resolveHeroSubrole(segment.hero, { role: segment.role, seasonId, teamId: parent.teamId, playerId: parent.playerId })
        rows.push(finishRow({
          ...parent, rowId: evidenceKey(parent) + ':' + segment.segmentId, parentRow: parent,
          hero: resolution.canonicalHeroName, role: segment.role, resolution,
          playtimeMinutes: (Number(segment.endSeconds) - Number(segment.startSeconds)) / 60,
          totals: { ...segment.totals }, patch: annotation.patch, statsScope: annotation.statsScope, verified: true,
          metricStates: Object.fromEntries(STAT_KEYS.map(key => [key, segment.metricStates?.[key] || 'OBSERVED'])),
          sourceReference: annotation.sourceReference, verifiedBy: annotation.verifiedBy,
          evidenceRecordKey: evidenceKey(parent), evidenceSegmentId: text(segment.segmentId)
        }))
        coverage.verifiedRows++
      }
    } else {
      rows.push(finishRow(parent))
      coverage.proxyRows++
    }
  }
  for (const id of annotations.keys()) coverage.invalidEvidence.push({ key: id, errors: ['UNMATCHED_OR_EXCLUDED_MAP'] })
  return { seasonId, rows, coverage, cleaning: collected.cleaning }
}
