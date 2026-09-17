import { getMatchDossier } from '../../lib/matchDetailSelectors.js'
import {
  formatStaffPerson,
  getTeamFullName,
  getTeamRosterPlayers,
  getTeamRouteId,
  getTeamShortName,
  getTeamStaff,
  normalizeRosterRole,
  normalizeStaffIdentity,
  safeArr
} from '../../lib/rosterSelectors.js'

export const MATCH_ROOM_STEP_KEYS = {
  WAITING: 'WAITING',
  MAP_PICK: 'MAP_PICK',
  LINEUP_LOCK: 'LINEUP_LOCK',
  HERO_BAN: 'HERO_BAN',
  // Kept for old room state compatibility; new flow enters IN_GAME directly.
  READY_CHECK: 'READY_CHECK',
  IN_GAME: 'IN_GAME',
  MAP_RESULT_CONFIRM: 'MAP_RESULT_CONFIRM',
  MATCH_FINISHED: 'MATCH_FINISHED'
}

export const MATCH_ROOM_STEPS = [
  { key: MATCH_ROOM_STEP_KEYS.WAITING, index: 1, label: '赛前集合', meta: 'ROOM' },
  { key: MATCH_ROOM_STEP_KEYS.MAP_PICK, index: 2, label: '地图选择', meta: 'MAP' },
  { key: MATCH_ROOM_STEP_KEYS.LINEUP_LOCK, index: 3, label: '首发锁定', meta: 'LINEUP' },
  { key: MATCH_ROOM_STEP_KEYS.HERO_BAN, index: 4, label: '英雄禁用', meta: 'HERO BAN' },
  { key: MATCH_ROOM_STEP_KEYS.IN_GAME, index: 5, label: '比赛进行', meta: 'LIVE' },
  { key: MATCH_ROOM_STEP_KEYS.MAP_RESULT_CONFIRM, index: 6, label: '地图确认', meta: 'SCORE' },
  { key: MATCH_ROOM_STEP_KEYS.MATCH_FINISHED, index: 7, label: '全场结束', meta: 'RESULT' }
]

const TEAM_MEMBER_TYPES = new Set(['PLAYER', 'MANAGER', 'COACH'])
const STAFF_TYPES = new Set(['REFEREE', 'CASTER'])
const LOCAL_TEST_ROOM_PREFIX = 'FCR26-TEST-ROOM'
const SYNC_TEST_ROOM_PREFIX = 'FCR26-SYNC-ROOM'
const LOCAL_TEST_ROOM_TEAMS = {
  A: { id: 'FCR26-T001', short: 'FF', full: 'French Fries' },
  B: { id: 'FCR26-T003', short: 'MNW', full: 'MagicNightWish' }
}

function clean(value) {
  return String(value ?? '').trim()
}

function normalizeKey(value) {
  return clean(value).toLowerCase()
}

function unique(values) {
  return [...new Set(values.map(clean).filter(Boolean))]
}

function teamIdentities(team) {
  return unique([
    team?.team_id,
    team?.id,
    team?.routeId,
    team?.team_short_name,
    team?.shortName,
    team?.short,
    team?.team_name,
    team?.fullName,
    team?.name
  ]).map(normalizeKey)
}

function hasOverlap(left, right) {
  const rightSet = new Set(safeArr(right).map(normalizeKey).filter(Boolean))
  return safeArr(left).some(value => rightSet.has(normalizeKey(value)))
}

function resolveTeamRecord(db, teamLike) {
  const needles = teamIdentities(teamLike)
  return safeArr(db?.teams).find(team => hasOverlap(teamIdentities(team), needles)) || teamLike || {}
}

function isLocalTestRoom(matchId) {
  const value = clean(matchId).toUpperCase()
  return value.startsWith(LOCAL_TEST_ROOM_PREFIX) || value.startsWith(SYNC_TEST_ROOM_PREFIX)
}

function getLocalTestTeam(side) {
  return LOCAL_TEST_ROOM_TEAMS[side] || {}
}

function makeLocalTestDossierTeam(db, side) {
  const fallback = getLocalTestTeam(side)
  const teamRecord = resolveTeamRecord(db, {
    team_id: fallback.id,
    team_short_name: fallback.short,
    team_name: fallback.full,
    id: fallback.id,
    short: fallback.short,
    name: fallback.full
  })

  return {
    side,
    id: clean(getTeamRouteId(teamRecord) || teamRecord?.team_id || teamRecord?.id || fallback.id),
    short: clean(getTeamShortName(teamRecord) || teamRecord?.team_short_name || teamRecord?.short || fallback.short),
    full: clean(getTeamFullName(teamRecord) || teamRecord?.team_name || teamRecord?.name || fallback.full),
    score: '',
    rawScore: ''
  }
}

function buildLocalTestDossier(db, matchId) {
  if (!isLocalTestRoom(matchId)) return null

  const id = clean(matchId) || `${LOCAL_TEST_ROOM_PREFIX}-01`
  const teamA = makeLocalTestDossierTeam(db, 'A')
  const teamB = makeLocalTestDossierTeam(db, 'B')
  const scheduledAt = '2026-07-04T23:30:00+08:00'

  return {
    match: {
      match_id: id,
      raw_match_id: id,
      match_display_name: 'TEST ROOM / FF VS MNW',
      stage: 'SWISS',
      round: 'TEST ROOM',
      format: 'FT2',
      status: 'PENDING',
      scheduled_at: scheduledAt,
      team_a: {
        id: teamA.id,
        name: teamA.full,
        short: teamA.short,
        score: ''
      },
      team_b: {
        id: teamB.id,
        name: teamB.full,
        short: teamB.short,
        score: ''
      },
      maps: []
    },
    state: {
      status: 'PENDING',
      resultMode: '',
      isForfeit: false,
      isComplete: false,
      isCancelled: false,
      isPostponed: false,
      isLive: false,
      isUpcoming: true,
      canShowResults: false
    },
    teamA,
    teamB,
    title: `${teamA.short} vs ${teamB.short}`,
    fullTitle: `${teamA.full} vs ${teamB.full}`,
    scheduleLabel: '2026-07-04 23:30',
    scheduleCompact: '07-04 23:30',
    statusLabel: '待开始',
    statusEn: 'PENDING',
    scoreLabel: 'VS',
    winnerSide: '',
    hasSeriesScore: false,
    mapCountLabel: '0',
    totalDurationLabel: '',
    internalId: id,
    rawDisplayName: 'TEST ROOM / FF VS MNW',
    metaItems: [],
    maps: [],
    completedMaps: [],
    mapRecords: [],
    hasMapRecords: false,
    seriesPath: [],
    comparison: null,
    rating: null,
    mapTypeResults: [],
    seriesPeakPlayers: {},
    analysisFacts: [],
    rosters: { teamA: [], teamB: [] },
    broadcast: {},
    statusNote: '本地测试场次',
    adjacent: { previous: null, next: null }
  }
}

function formatRole(role) {
  const normalized = normalizeRosterRole(role)
  if (normalized === 'SUP') return 'SUPPORT'
  return normalized || 'FLEX'
}

function getPlayerName(player) {
  return clean(player?.nickname || player?.display_name || player?.displayName || player?.player_name || player?.player_id || player?.id || 'PLAYER')
}

function getBattleTag(source) {
  return clean(source?.battle_tag || source?.battleTag || source?.battletag || source?.raw || source?.player_name)
}

function makeParticipant({ side, identityType, title, name, battleTag, keySource, role = '', order = 0 }) {
  const keyBase = keySource || battleTag || name || `${identityType}-${order}`
  return {
    key: `${side}-${identityType}-${normalizeKey(keyBase) || order}`,
    side,
    identityType,
    title,
    name: clean(name) || title,
    battleTag: clean(battleTag),
    role: clean(role),
    isCaptain: false,
    isCurrentAccount: false
  }
}

function buildStaffParticipants(side, teamRecord) {
  const staff = getTeamStaff(teamRecord)
  const managers = staff.managers.map((person, index) => {
    const identity = normalizeStaffIdentity(person)
    return makeParticipant({
      side,
      identityType: 'MANAGER',
      title: '经理',
      name: formatStaffPerson(person) || identity.name,
      battleTag: identity.battleTag,
      keySource: identity.key,
      order: index
    })
  })
  const coaches = staff.coaches.map((person, index) => {
    const identity = normalizeStaffIdentity(person)
    return makeParticipant({
      side,
      identityType: 'COACH',
      title: '教练',
      name: formatStaffPerson(person) || identity.name,
      battleTag: identity.battleTag,
      keySource: identity.key,
      order: index
    })
  })

  return [...managers, ...coaches]
}

function buildPlayerParticipants(db, side, teamRecord) {
  return getTeamRosterPlayers(db, teamRecord).map((player, index) => makeParticipant({
    side,
    identityType: 'PLAYER',
    title: '选手',
    name: getPlayerName(player),
    battleTag: getBattleTag(player),
    keySource: player?.player_id || player?.id || player?.battle_tag || player?.battleTag || player?.player_name,
    role: formatRole(player?.role),
    order: index
  }))
}

function markCurrentAccount(participants, accountIdentity, accountIdentityTarget) {
  const identityType = clean(accountIdentity?.identityType).toUpperCase()
  const targetIds = unique([
    accountIdentity?.targetId,
    accountIdentity?.battleTag,
    accountIdentityTarget?.playerRouteId,
    accountIdentityTarget?.player?.player_id,
    accountIdentityTarget?.player?.id,
    accountIdentityTarget?.player?.battle_tag,
    accountIdentityTarget?.player?.battleTag,
    accountIdentityTarget?.player?.player_name,
    accountIdentityTarget?.player?.nickname
  ]).map(normalizeKey)

  if (!identityType || !targetIds.length) return participants

  return participants.map(participant => {
    if (participant.identityType !== identityType) return participant
    const participantIds = [participant.key, participant.name, participant.battleTag].map(normalizeKey)
    return {
      ...participant,
      isCurrentAccount: hasOverlap(participantIds, targetIds)
    }
  })
}

function assignCaptain(participants) {
  const priority = ['MANAGER', 'COACH', 'PLAYER']
  const captain = priority
    .map(type => participants.find(item => item.identityType === type))
    .find(Boolean)

  if (!captain) return participants
  return participants.map(item => ({
    ...item,
    isCaptain: item.key === captain.key
  }))
}

function buildTeamSide({ db, side, sourceTeam, dossierTeam, accountIdentity, accountIdentityTarget }) {
  const teamRecord = resolveTeamRecord(db, sourceTeam || dossierTeam)
  const staff = buildStaffParticipants(side, teamRecord)
  const players = buildPlayerParticipants(db, side, teamRecord)
  const participants = assignCaptain(markCurrentAccount([...staff, ...players], accountIdentity, accountIdentityTarget))

  return {
    side,
    id: clean(dossierTeam?.id || getTeamRouteId(teamRecord)),
    short: clean(dossierTeam?.short || getTeamShortName(teamRecord)),
    full: clean(dossierTeam?.full || getTeamFullName(teamRecord)),
    routeId: getTeamRouteId(teamRecord),
    identities: teamIdentities(teamRecord),
    participants,
    staff,
    players,
    captain: participants.find(item => item.isCaptain) || null
  }
}

function parseTargetWins(format) {
  const match = clean(format).toUpperCase().match(/FT\s*(\d+)/)
  if (!match) return 2
  const value = Number(match[1])
  return Number.isFinite(value) && value > 0 ? value : 2
}

function shouldEnableHeroBan(match, targetWins) {
  const text = `${match?.stage || ''} ${match?.round || ''} ${match?.match_display_name || ''}`.toUpperCase()
  return targetWins >= 3 || text.includes('PLAYOFF') || text.includes('淘汰') || text.includes('决赛')
}

function getInitialStep(dossier) {
  if (dossier?.state?.isComplete) return MATCH_ROOM_STEP_KEYS.MATCH_FINISHED
  if (dossier?.state?.isLive) return MATCH_ROOM_STEP_KEYS.IN_GAME
  return MATCH_ROOM_STEP_KEYS.WAITING
}

function teamMatchesIdentity(teamSide, accountIdentity, accountIdentityTarget) {
  const identityTeamValues = unique([
    accountIdentity?.teamId,
    accountIdentity?.targetType === 'TEAM' ? accountIdentity?.targetId : '',
    accountIdentityTarget?.teamRouteId,
    accountIdentityTarget?.team?.team_id,
    accountIdentityTarget?.team?.id,
    accountIdentityTarget?.team?.team_short_name,
    accountIdentityTarget?.team?.short,
    accountIdentityTarget?.team?.team_name,
    accountIdentityTarget?.team?.name
  ]).map(normalizeKey)

  if (hasOverlap(teamSide.identities, identityTeamValues)) return true

  const playerValues = unique([
    accountIdentity?.targetType === 'PLAYER' ? accountIdentity?.targetId : '',
    accountIdentity?.battleTag,
    accountIdentityTarget?.playerRouteId,
    accountIdentityTarget?.player?.player_id,
    accountIdentityTarget?.player?.id,
    accountIdentityTarget?.player?.player_name,
    accountIdentityTarget?.player?.nickname,
    accountIdentityTarget?.player?.battle_tag,
    accountIdentityTarget?.player?.battleTag
  ]).map(normalizeKey)

  return teamSide.players.some(player => hasOverlap([player.key, player.name, player.battleTag], playerValues))
}

function getAccessState(model, accountIdentity, accountCapabilities, accountIdentityTarget) {
  if (!accountIdentity?.isVerified) {
    return {
      status: accountIdentity?.isPending ? 'PENDING' : 'UNVERIFIED',
      label: accountIdentity?.isPending ? '认证审核中' : '未认证',
      side: '',
      canEnter: false,
      canOperate: false
    }
  }

  const identityType = clean(accountIdentity.identityType).toUpperCase()
  const isTeamMember = TEAM_MEMBER_TYPES.has(identityType)
  const isStaff = STAFF_TYPES.has(identityType) || accountCapabilities?.canAccessStaffSpace
  const matchesA = teamMatchesIdentity(model.teamA, accountIdentity, accountIdentityTarget)
  const matchesB = teamMatchesIdentity(model.teamB, accountIdentity, accountIdentityTarget)

  if (isTeamMember && (matchesA || matchesB)) {
    return {
      status: 'TEAM_MEMBER',
      label: matchesA ? `${model.teamA.short} 成员` : `${model.teamB.short} 成员`,
      side: matchesA ? 'A' : 'B',
      canEnter: true,
      canOperate: true
    }
  }

  if (isStaff) {
    return {
      status: 'STAFF',
      label: identityType === 'CASTER' ? '指定解说' : '指定赛管',
      side: 'STAFF',
      canEnter: true,
      canOperate: true,
      requiresAssignment: true
    }
  }

  return {
    status: 'OUT_OF_MATCH',
    label: '非本场人员',
    side: '',
    canEnter: false,
    canOperate: false
  }
}

function getLocalTestAccessState() {
  return {
    status: 'LOCAL_TEST',
    label: '本地测试赛管',
    side: 'STAFF',
    canEnter: true,
    canOperate: true
  }
}

export function getMapResultVerdict(scoreA, scoreB, teamA, teamB) {
  const scoreAText = String(scoreA ?? '').trim()
  const scoreBText = String(scoreB ?? '').trim()
  if (!scoreAText || !scoreBText) {
    return { side: '', label: '等待小分', scoreLabel: '' }
  }

  const a = Number(scoreA)
  const b = Number(scoreB)
  if (!Number.isFinite(a) || !Number.isFinite(b)) {
    return { side: '', label: '等待小分', scoreLabel: '' }
  }
  if (a === b) {
    return { side: 'DRAW', label: '平局地图', scoreLabel: `${a}:${b}` }
  }
  const side = a > b ? 'A' : 'B'
  return {
    side,
    label: side === 'A' ? teamA.short : teamB.short,
    scoreLabel: `${a}:${b}`
  }
}

export function buildMatchRoomModel({
  db,
  matchId,
  accountIdentity,
  accountCapabilities,
  accountIdentityTarget,
  locale = 'zh-CN'
} = {}) {
  const dossier = getMatchDossier(db, matchId, { locale }) || buildLocalTestDossier(db, matchId)
  if (!dossier) return null

  const format = clean(dossier.match?.format || 'FT2')
  const targetWins = parseTargetWins(format)
  const model = {
    dossier,
    match: dossier.match,
    matchId: dossier.internalId || matchId,
    title: dossier.title,
    fullTitle: dossier.fullTitle,
    scheduleLabel: dossier.scheduleLabel,
    statusLabel: dossier.statusLabel,
    format,
    targetWins,
    heroBanEnabled: isLocalTestRoom(matchId) || shouldEnableHeroBan(dossier.match, targetWins),
    initialStep: getInitialStep(dossier),
    teamA: buildTeamSide({
      db,
      side: 'A',
      sourceTeam: dossier.match?.team_a,
      dossierTeam: dossier.teamA,
      accountIdentity,
      accountIdentityTarget
    }),
    teamB: buildTeamSide({
      db,
      side: 'B',
      sourceTeam: dossier.match?.team_b,
      dossierTeam: dossier.teamB,
      accountIdentity,
      accountIdentityTarget
    }),
    maps: dossier.maps,
    completedMaps: dossier.completedMaps,
    mapRecords: dossier.mapRecords,
    flowSteps: MATCH_ROOM_STEPS,
    broadcast: dossier.broadcast
  }

  return {
    ...model,
    access: isLocalTestRoom(matchId)
      ? getLocalTestAccessState()
      : getAccessState(model, accountIdentity, accountCapabilities, accountIdentityTarget)
  }
}
