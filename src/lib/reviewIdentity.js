import { decodeStaffKey, normalizeText, safeArr } from './reviewAssets.js'

const IDENTITY_ENTRIES_CACHE = new WeakMap()
const IDENTITY_PORTFOLIO_CACHE = new WeakMap()

function normalize(value) {
  return normalizeText(String(value || '').normalize('NFKC'))
}

function stripBattleTag(value) {
  return String(value || '').replace(/#\d+$/g, '').trim()
}

function getPlayerBattleTag(row) {
  return row?.battle_tag || row?.battleTag || row?.battletag || row?.player_name || ''
}

function getTeamRow(db, identity) {
  const requested = normalize(identity)
  if (!requested) return null

  return [...safeArr(db?.team_reviews), ...safeArr(db?.teams)].find(row => {
    return [row?.team_id, row?.id, row?.team_name, row?.name, row?.team_short_name, row?.short]
      .some(value => normalize(value) === requested)
  }) || null
}

function getPlayerTotal(db, playerId) {
  return safeArr(db?.player_totals).find(row => normalize(row?.player_id) === normalize(playerId)) || null
}

function getIdentityKey(entry) {
  return [entry.identityType, entry.playerId, entry.teamId, entry.battleTag]
    .map(normalize)
    .filter(Boolean)
    .join('::')
}

function uniqueEntries(entries) {
  const seen = new Set()

  return entries.filter(entry => {
    const key = getIdentityKey(entry)
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function getReviewIdentityEntries(db) {
  if (db && typeof db === 'object' && IDENTITY_ENTRIES_CACHE.has(db)) {
    return IDENTITY_ENTRIES_CACHE.get(db)
  }

  const players = safeArr(db?.players).map(player => {
    const total = getPlayerTotal(db, player?.player_id)
    const source = total || player
    const team = getTeamRow(db, player?.team_id || player?.team_name || player?.team_short_name)

    return {
      identityType: 'player',
      battleTag: getPlayerBattleTag(player) || getPlayerBattleTag(source),
      displayName: source?.display_name || source?.nickname || player?.display_name || stripBattleTag(getPlayerBattleTag(player)),
      playerId: player?.player_id || source?.player_id,
      role: source?.role || player?.role || 'FLEX',
      teamId: player?.team_id || source?.team_id,
      teamName: player?.team_name || source?.team_name || team?.team_name || team?.name || '',
      teamShortName: player?.team_short_name || source?.team_short_name || team?.team_short_name || team?.short || '',
      joinStage: source?.join_stage || player?.join_stage || 'SEASON',
      rosterStatus: source?.roster_status || player?.roster_status || 'ACTIVE',
      status: source?.status || player?.status || 'ACTIVE',
      exitStage: source?.exit_stage || player?.exit_stage || '',
      mapsPlayed: Number(source?.maps_played || source?.map_count || safeArr(player?.match_logs || player?.live_match_logs).length || 0),
      minutes: Number(source?.raw_time_mins || source?.playtimeMinutes || 0),
      finalRankText: source?.team_final_rank_text || team?.final_rank_text || '',
      source: player
    }
  })

  const staff = safeArr(db?.review_identity_records)
    .filter(row => row?.identityType === 'coach' || row?.identityType === 'manager')
    .map(row => {
      const team = getTeamRow(db, row?.teamId || row?.teamName)
      const record = team?.season_record || {}

      return {
        ...row,
        teamShortName: team?.team_short_name || team?.short || '',
        finalRankText: team?.final_rank_text || '',
        teamMatches: Number(record?.matches_played || 0),
        teamWins: Number(record?.match_wins || 0),
        teamLosses: Number(record?.match_losses || 0),
        source: row
      }
    })

  const entries = uniqueEntries([...players, ...staff]).filter(entry => entry.battleTag)

  if (db && typeof db === 'object') {
    IDENTITY_ENTRIES_CACHE.set(db, entries)
  }

  return entries
}

export function getReviewIdentityPortfolio(db, identityKey) {
  const decoded = decodeStaffKey(identityKey)
  const requested = normalize(decoded)
  if (!requested) return null

  let portfolioCache = null
  if (db && typeof db === 'object') {
    portfolioCache = IDENTITY_PORTFOLIO_CACHE.get(db)
    if (!portfolioCache) {
      portfolioCache = new Map()
      IDENTITY_PORTFOLIO_CACHE.set(db, portfolioCache)
    }
    if (portfolioCache.has(requested)) return portfolioCache.get(requested)
  }

  const all = getReviewIdentityEntries(db)
  const exact = all.filter(entry => normalize(entry.battleTag) === requested)
  const entries = exact.length
    ? exact
    : all.filter(entry => [entry.displayName, stripBattleTag(entry.battleTag)].some(value => normalize(value) === requested))

  if (!entries.length) {
    portfolioCache?.set(requested, null)
    return null
  }

  const displayEntry = entries.find(entry => entry.joinStage === 'PLAYOFFS') || entries.find(entry => entry.displayName) || entries[0]
  const displayName = displayEntry?.displayName || stripBattleTag(entries[0].battleTag)
  const battleTag = entries[0].battleTag
  const teamNames = Array.from(new Set(entries.map(entry => entry.teamShortName || entry.teamName).filter(Boolean)))
  const identityTypes = Array.from(new Set(entries.map(entry => entry.identityType)))

  const portfolio = {
    battleTag,
    displayName,
    entries,
    teamNames,
    identityTypes,
    isMultiple: entries.length > 1,
    hasMultipleTeams: teamNames.length > 1,
    hasMultipleRoles: identityTypes.length > 1
  }

  portfolioCache?.set(requested, portfolio)
  return portfolio
}

export function getReviewIdentityLabel(entry) {
  if (entry?.identityType === 'coach') return '教练'
  if (entry?.identityType === 'manager') return '经理'

  const role = String(entry?.role || '').toUpperCase()
  if (role === 'TANK') return '坦克选手'
  if (role === 'DPS') return '输出选手'
  if (role === 'SUP' || role === 'SUPPORT') return '辅助选手'
  return '选手'
}
