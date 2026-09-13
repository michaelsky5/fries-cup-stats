import { localizeTraditionalReview } from './traditionalText.js'
import {
  FCR26_POSTSEASON_PLAYER_OVERRIDES,
  FCR26_REVIEW_IDENTITY_OVERRIDES,
  FCR26_REVIEW_ROSTER_SOURCE,
  FCR26_TEAM_STAFF_OVERRIDES
} from '../data/fcr26ReviewRosterOverrides.js'

const REVIEW_DB_CACHE = new WeakMap()

const SEASON_PROFILES = {
  FCR26: {
    id: 'FCR26',
    publicCode: 'FCR2026',
    mark: 'FCR 2026',
    shortMark: 'FCR26',
    eventTitle: '2026 薯条杯常规赛',
    eventNoun: '常规赛',
    logo: '/review/brand/fcr26-event-logo.png',
    routeLabel: '公开预选赛',
    organizerDate: '2026年8月17日',
    isRegular: true,
    localizedCopy: {
      'en-US': {
        eventTitle: '2026 Fries Cup Regular Season',
        eventNoun: 'Regular Season',
        routeLabel: 'Open Qualifier',
        organizerDate: '17 August 2026'
      },
      'ko-KR': {
        eventTitle: '2026 프라이즈 컵 정규 시즌',
        eventNoun: '정규 시즌',
        routeLabel: '공개 예선',
        organizerDate: '2026년 8월 17일'
      }
    }
  },
  FCA26: {
    id: 'FCA26',
    publicCode: 'FCA2026',
    mark: 'FCA 2026',
    shortMark: 'FCA26',
    eventTitle: '2026 薯条杯学院赛',
    eventNoun: '学院赛',
    logo: '/logos/fca_logo.png',
    routeLabel: '公开预选赛',
    organizerDate: '2026年5月18日',
    isRegular: false,
    localizedCopy: {
      'en-US': {
        eventTitle: '2026 Fries Cup Academy Series',
        eventNoun: 'Academy Series',
        routeLabel: 'Open Qualifier',
        organizerDate: '18 May 2026'
      },
      'ko-KR': {
        eventTitle: '2026 프라이즈 컵 아카데미 대회',
        eventNoun: '아카데미 대회',
        routeLabel: '공개 예선',
        organizerDate: '2026년 5월 18일'
      }
    }
  }
}

function normalizeSeasonId(value) {
  const raw = String(value || '').trim().toUpperCase()
  if (raw.startsWith('FCR')) return 'FCR26'
  if (raw.startsWith('FCA')) return 'FCA26'
  return ''
}

function getSeasonIdFromRows(db) {
  const ids = [
    db?.teams?.[0]?.team_id,
    db?.players?.[0]?.player_id,
    db?.matches?.[0]?.match_id,
    db?.team_reviews?.[0]?.team_id
  ]

  return ids.map(normalizeSeasonId).find(Boolean) || ''
}

export function getReviewSeasonProfile(source) {
  const seasonId = normalizeSeasonId(
    typeof source === 'string'
      ? source
      : source?.season?.id ||
        source?.season?.season_id ||
        source?.meta?.season_id ||
        source?.meta?.season_code ||
        source?.season_id ||
        source?.season_code
  ) || (source && typeof source === 'object' ? getSeasonIdFromRows(source) : '') || 'FCA26'

  return SEASON_PROFILES[seasonId] || SEASON_PROFILES.FCA26
}

export function getLocalizedReviewSeasonProfile(source, locale = 'zh-CN') {
  const profile = getReviewSeasonProfile(source)
  const rawLocale = String(locale || '').toLowerCase()
  if (rawLocale === 'zh-tw' || rawLocale.startsWith('zh-hant')) return localizeTraditionalReview(profile)
  const normalizedLocale = rawLocale === 'en' || rawLocale.startsWith('en-')
    ? 'en-US'
    : rawLocale === 'ko' || rawLocale.startsWith('ko-')
      ? 'ko-KR'
      : 'zh-CN'

  return {
    ...profile,
    ...(profile.localizedCopy?.[normalizedLocale] || {})
  }
}

export function formatReviewFinalRank(rank) {
  const value = Number(rank)
  if (!Number.isFinite(value) || value <= 0) return ''
  if (value === 1) return '冠军'
  if (value === 2) return '亚军'
  if (value === 3) return '季军'
  if (value === 4) return '殿军'
  return `第${value}名`
}

function getStandingMap(db) {
  return new Map((Array.isArray(db?.standings) ? db.standings : []).map(row => [String(row?.team_id || ''), row]))
}

function getFinalRank(row, standing) {
  const values = [
    row?.final_rank,
    row?.current_rank,
    standing?.current_rank,
    standing?.rank
  ]

  for (const value of values) {
    const rank = Number(value)
    if (Number.isFinite(rank) && rank > 0) return rank
  }

  return null
}

function enrichTeamRow(row, standing) {
  if (!row) return row

  const finalRank = getFinalRank(row, standing)
  const finalRankText = row.final_rank_text || formatReviewFinalRank(finalRank)

  return {
    ...row,
    final_rank: finalRank || row.final_rank || '',
    final_rank_text: finalRankText,
    final_rank_group: row.final_rank_group || (finalRank && finalRank <= 8 ? 'PLAYOFFS' : 'REGULAR_SEASON')
  }
}

function normalizeIdentityValue(value) {
  return String(value || '').normalize('NFKC').trim().toLocaleLowerCase('en-US')
}

function getRowBattleTag(row) {
  return row?.battle_tag || row?.battleTag || row?.battletag || row?.player_name || ''
}

function getRowTeamIdentity(row) {
  return row?.team_id || row?.teamId || row?.team_name || row?.teamName || row?.team_short_name || ''
}

function identityMatchesOverride(row, override) {
  if (!row || !override) return false

  const rowId = normalizeIdentityValue(row.player_id)
  const overrideId = normalizeIdentityValue(override.playerId)
  if (rowId && overrideId && rowId === overrideId) return true

  const tagMatches = normalizeIdentityValue(getRowBattleTag(row)) === normalizeIdentityValue(override.battleTag)
  if (!tagMatches) return false

  const rowTeam = normalizeIdentityValue(getRowTeamIdentity(row))
  const overrideTeams = [override.teamId, override.teamName, override.teamShortName]
    .map(normalizeIdentityValue)
    .filter(Boolean)

  return !rowTeam || overrideTeams.includes(rowTeam)
}

function applyPlayerOverride(row, override) {
  return {
    ...(row || {}),
    player_id: row?.player_id || override.playerId,
    player_name: override.battleTag,
    battle_tag: override.battleTag,
    display_name: override.displayName,
    nickname: override.displayName,
    role: override.role,
    rank: override.rank,
    team_id: override.teamId,
    team_name: override.teamName,
    team_short_name: override.teamShortName,
    join_stage: override.joinStage,
    roster_status: override.rosterStatus,
    status: override.status,
    exit_stage: override.exitStage || '',
    historical_match_logs: Array.isArray(row?.historical_match_logs) ? row.historical_match_logs : [],
    live_match_logs: Array.isArray(row?.live_match_logs) ? row.live_match_logs : [],
    match_logs: Array.isArray(row?.match_logs) ? row.match_logs : []
  }
}

function mergePlayerOverrides(rows) {
  const output = Array.isArray(rows) ? [...rows] : []

  FCR26_POSTSEASON_PLAYER_OVERRIDES.forEach(override => {
    const index = output.findIndex(row => identityMatchesOverride(row, override))
    if (index >= 0) {
      output[index] = applyPlayerOverride(output[index], override)
      return
    }

    output.push(applyPlayerOverride(null, override))
  })

  return output
}

function mergePlayerTotalOverrides(rows) {
  return (Array.isArray(rows) ? rows : []).map(row => {
    const override = FCR26_POSTSEASON_PLAYER_OVERRIDES.find(item => identityMatchesOverride(row, item))
    return override ? applyPlayerOverride(row, override) : row
  })
}

function getStaffEntryKeys(row) {
  if (!row || typeof row !== 'object') return [normalizeIdentityValue(row)].filter(Boolean)

  return [
    row?.battle_tag,
    row?.battleTag,
    row?.battletag,
    row?.display_name,
    row?.displayName,
    row?.name
  ].flatMap(value => {
    const normalized = normalizeIdentityValue(value)
    if (!normalized) return []
    return [normalized, normalizeIdentityValue(String(value).replace(/#\d+$/g, ''))]
  }).filter(Boolean)
}

function getStaffEntryBattleTags(row) {
  const values = row && typeof row === 'object'
    ? [row?.battle_tag, row?.battleTag, row?.battletag, row?.display_name, row?.displayName, row?.name]
    : [row]

  return [...new Set(values.flatMap(value => {
    return String(value || '').match(/[^\s、,，/｜|&＋+；;]+#\d+/g) || []
  }).map(normalizeIdentityValue).filter(Boolean))]
}

function removeCoveredCompositeStaffEntries(entries, overrides) {
  const explicitTags = new Set(overrides
    .map(override => normalizeIdentityValue(override?.battleTag))
    .filter(Boolean))

  if (explicitTags.size < 2) return entries

  return entries.filter(entry => {
    const entryTags = getStaffEntryBattleTags(entry)
    return entryTags.length < 2 || !entryTags.every(tag => explicitTags.has(tag))
  })
}

function mergeStaffEntryList(current, overrides) {
  const currentEntries = Array.isArray(current)
    ? [...current]
    : current
      ? [current]
      : []
  const output = removeCoveredCompositeStaffEntries(currentEntries, overrides)

  overrides.forEach(override => {
    const entry = {
      battle_tag: override.battleTag,
      display_name: override.displayName,
      join_stage: override.joinStage,
      roster_status: override.rosterStatus,
      status: override.status,
      review_identity_source: FCR26_REVIEW_ROSTER_SOURCE.label
    }
    const acceptedKeys = new Set([
      normalizeIdentityValue(override.battleTag),
      normalizeIdentityValue(override.displayName),
      normalizeIdentityValue(String(override.battleTag || '').replace(/#\d+$/g, ''))
    ].filter(Boolean))
    const index = output.findIndex(row => getStaffEntryKeys(row).some(key => acceptedKeys.has(key)))

    if (index >= 0) {
      output[index] = typeof output[index] === 'object'
        ? { ...output[index], ...entry }
        : entry
    } else {
      output.push(entry)
    }
  })

  return output
}

function mergeTeamStaffOverrides(rows) {
  return (Array.isArray(rows) ? rows : []).map(row => {
    const teamId = normalizeIdentityValue(row?.team_id || row?.id)
    const teamName = normalizeIdentityValue(row?.team_name || row?.name)
    const overrides = FCR26_TEAM_STAFF_OVERRIDES.filter(item => {
      return normalizeIdentityValue(item.teamId) === teamId || normalizeIdentityValue(item.teamName) === teamName
    })

    if (!overrides.length) return row

    const coaches = overrides.filter(item => item.role === 'coach')
    const managers = overrides.filter(item => item.role === 'manager')

    return {
      ...row,
      staff: {
        ...(row?.staff || {}),
        coaches: mergeStaffEntryList(row?.staff?.coaches, coaches),
        managers: mergeStaffEntryList(row?.staff?.managers, managers)
      }
    }
  })
}

function applyFcr26ReviewRosterOverrides(db) {
  return {
    ...db,
    teams: mergeTeamStaffOverrides(db?.teams),
    team_reviews: mergeTeamStaffOverrides(db?.team_reviews),
    players: mergePlayerOverrides(db?.players),
    player_totals: mergePlayerTotalOverrides(db?.player_totals),
    review_identity_records: FCR26_REVIEW_IDENTITY_OVERRIDES,
    meta: {
      ...(db?.meta || {}),
      review_roster_source: FCR26_REVIEW_ROSTER_SOURCE.label,
      review_roster_finalized_at: FCR26_REVIEW_ROSTER_SOURCE.finalizedAt,
      review_roster_overrides_applied: true
    }
  }
}

/**
 * The public FCR feed exposes live/current ranking fields after the bracket ends,
 * while the original review builders expect final_rank fields. Normalize only the
 * review-facing snapshot so the rest of the stats site keeps the source contract.
 */
export function prepareReviewDb(db) {
  if (!db || typeof db !== 'object') return db
  if (REVIEW_DB_CACHE.has(db)) return REVIEW_DB_CACHE.get(db)

  const profile = getReviewSeasonProfile(db)
  if (!profile.isRegular) {
    REVIEW_DB_CACHE.set(db, db)
    return db
  }

  const rosterDb = applyFcr26ReviewRosterOverrides(db)
  const standings = getStandingMap(rosterDb)
  const teams = (Array.isArray(rosterDb.teams) ? rosterDb.teams : []).map(row => enrichTeamRow(row, standings.get(String(row?.team_id || ''))))
  const reviews = (Array.isArray(rosterDb.team_reviews) ? rosterDb.team_reviews : []).map(row => enrichTeamRow(row, standings.get(String(row?.team_id || ''))))
  const rankByTeam = new Map([...teams, ...reviews].map(row => [String(row?.team_id || ''), row]))

  const enrichPlayer = row => {
    const team = rankByTeam.get(String(row?.team_id || ''))
    if (!team) return row
    return {
      ...row,
      team_final_rank: team.final_rank,
      team_final_rank_text: team.final_rank_text,
      team_final_rank_group: team.final_rank_group
    }
  }

  const prepared = {
    ...rosterDb,
    teams,
    team_reviews: reviews,
    players: (Array.isArray(rosterDb.players) ? rosterDb.players : []).map(enrichPlayer),
    player_totals: (Array.isArray(rosterDb.player_totals) ? rosterDb.player_totals : []).map(enrichPlayer),
    meta: {
      ...(rosterDb.meta || {}),
      review_final_ranks_derived: true,
      review_final_ranks_source: 'current_rank'
    }
  }

  REVIEW_DB_CACHE.set(db, prepared)
  REVIEW_DB_CACHE.set(prepared, prepared)
  return prepared
}

function adaptString(value, profile) {
  if (!profile.isRegular) return value

  return String(value)
    .replaceAll('2026 薯条杯学院赛', profile.eventTitle)
    .replaceAll('薯条杯学院赛', '薯条杯常规赛')
    .replaceAll('学院赛', profile.eventNoun)
    .replaceAll('公开预选赛阶段', profile.routeLabel)
    .replaceAll('公开预选赛', profile.routeLabel)
    .replaceAll('FCA 2026', profile.mark)
    .replaceAll('FCA2026', profile.publicCode)
    .replaceAll('FCA26', profile.shortMark)
    .replaceAll('/logos/fca_logo.png', profile.logo)
    .replaceAll('2026年5月18日', profile.organizerDate)
}

function adaptValue(value, profile) {
  if (typeof value === 'string') return adaptString(value, profile)
  if (Array.isArray(value)) return value.map(item => adaptValue(item, profile))
  if (!value || typeof value !== 'object') return value

  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, adaptValue(item, profile)]))
}

export function adaptReviewText(value, source) {
  return adaptString(value, getReviewSeasonProfile(source))
}

export function adaptReviewScenes(scenes, db) {
  const profile = getReviewSeasonProfile(db)
  const adapted = adaptValue(Array.isArray(scenes) ? scenes : [], profile)

  return adapted.map(scene => ({
    ...scene,
    seasonId: profile.id,
    season_id: profile.id,
    seasonCode: profile.publicCode,
    season_code: profile.publicCode,
    seasonMark: profile.mark,
    season_mark: profile.mark,
    eventTitle: profile.eventTitle,
    event_title: profile.eventTitle,
    eventLogo: profile.logo,
    event_logo: profile.logo,
    eventNoun: profile.eventNoun,
    event_noun: profile.eventNoun
  }))
}

export function isReviewByeMatch(match) {
  const teamValues = [
    match?.team_a?.id,
    match?.team_a?.name,
    match?.team_a?.short,
    match?.team_b?.id,
    match?.team_b?.name,
    match?.team_b?.short
  ].map(value => String(value || '').trim().toUpperCase())

  return teamValues.includes('BYE')
}
