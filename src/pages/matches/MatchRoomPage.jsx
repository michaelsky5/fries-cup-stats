import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { useAuth } from '../../features/auth/AuthProvider.jsx'
import {
  checkInMatchRoom,
  confirmMatchRoomMapResult,
  fetchMatchRoom,
  resolveMatchRoomMapResult,
  subscribeMatchRoom,
  submitMatchRoomFinalResult,
  transferMatchRoomCaptain,
  updateMatchRoomMap,
  updateMatchRoomState
} from '../../features/match-room/matchRoomApi.js'
import {
  MATCH_ROOM_STEP_KEYS,
  buildMatchRoomModel,
  getMapResultVerdict
} from '../../features/match-room/matchRoomModel.js'
import { getMatchRoomLifecycle } from '../../features/match-room/matchRoomLifecycle.js'
import {
  OW_HEROES,
  OW_MAPS,
  formatOwHeroName,
  formatOwMapMode,
  formatOwMapName,
  getOwHeroAssetKey,
  getOwHeroCanonicalKey,
  getOwHeroRole,
  getOwMapImageName,
  getOwMapModeFolder
} from '../../lib/heroes.js'
import styles from '../../features/account-ui/roomStyles.js'

const LINEUP_SLOT_META = [
  { slot: 'C1', role: 'DPS', label: '输出 1' },
  { slot: 'C2', role: 'DPS', label: '输出 2' },
  { slot: 'T', role: 'TANK', label: '重装' },
  { slot: 'N1', role: 'SUPPORT', label: '支援 1' },
  { slot: 'N2', role: 'SUPPORT', label: '支援 2' }
]
const LINEUP_SLOT_PATTERN_LABEL = '输出 / 输出 / 重装 / 支援 / 支援'
const LINEUP_SLOT_DISPLAY_LABELS = {
  C1: '输出',
  C2: '输出',
  T: '重装',
  N1: '支援',
  N2: '支援'
}
const ROLE_LABELS = {
  TANK: '重装',
  DPS: '输出',
  SUPPORT: '支援',
  SUP: '支援'
}
const HERO_ROLE_LABELS = {
  tank: '重装',
  damage: '输出',
  support: '支援'
}
const MAP_MODE_ORDER = ['control', 'hybrid', 'escort', 'push', 'flashpoint', 'clash']
const MAP_TYPES = ['控制', '混合', '运载', '推进', '闪点', '冲突']
const MAP_POOL_KEYS = {
  PUBLIC_QUALIFIER: 'publicQualifier',
  PLAYOFF: 'playoff'
}
const FCR2026_MAP_POOLS = {
  [MAP_POOL_KEYS.PUBLIC_QUALIFIER]: {
    control: ['ilios', 'antarctic-peninsula', 'oasis'],
    hybrid: ['hollywood', 'numbani', 'kings-row'],
    escort: ['circuit-royal', 'rialto', 'dorado'],
    push: ['new-queen-street', 'runasapi'],
    flashpoint: ['new-junk-city', 'suravasa']
  },
  [MAP_POOL_KEYS.PLAYOFF]: {
    control: ['ilios', 'antarctic-peninsula', 'nepal'],
    hybrid: ['hollywood', 'kings-row', 'neon-junction'],
    escort: ['circuit-royal', 'dorado', 'junkertown'],
    push: ['new-queen-street', 'colosseo'],
    flashpoint: ['new-junk-city', 'aatlis']
  }
}
const MAP_POOL_META = {
  [MAP_POOL_KEYS.PUBLIC_QUALIFIER]: {
    label: '公开预选赛地图池',
    labelEn: 'Open Qualifier Map Pool',
    hint: '首图轮换：伊利奥斯 → 南极半岛 → 绿洲城',
    hintEn: 'Map 1 rotation: Ilios -> Antarctic Peninsula -> Oasis'
  },
  [MAP_POOL_KEYS.PLAYOFF]: {
    label: '季后淘汰赛地图池',
    labelEn: 'Playoff Knockout Map Pool',
    hint: '首图由高顺位选择占领要点，后续败方选图/攻防',
    hintEn: 'Higher seed picks Control for Map 1; losing side picks after that'
  }
}
const SWISS_FIRST_MAP_ROTATION_IDS = ['ilios', 'antarctic-peninsula', 'oasis']
const AVAILABLE_MAP_IMAGE_IDS = new Set([
  'ilios',
  'antarctic-peninsula',
  'oasis',
  'nepal',
  'hollywood',
  'numbani',
  'kings-row',
  'neon-junction',
  'circuit-royal',
  'rialto',
  'dorado',
  'junkertown',
  'new-queen-street',
  'runasapi',
  'colosseo',
  'new-junk-city',
  'suravasa',
  'aatlis'
])
const MAP_PICK_LIMIT_SECONDS = 60
const HERO_BAN_LIMIT_SECONDS = 60
const CHECKIN_WINDOW_MINUTES = 15
const MAP_FORFEIT_INTERVAL_MINUTES = 5
const DEFAULT_CUSTOM_ROOM_CODE = '8034C'
const CUSTOM_ROOM_CHECK_GROUPS = [
  {
    key: 'settings',
    label: '房间设置',
    meta: 'ROOM SETUP',
    items: [
      { label: '预设', value: '竞技 / 职责被动' },
      { label: '权限', value: '仅邀请' },
      { label: '流程', value: '手动开始 / 暂停开启 / 镜头关闭' },
      { label: '服务器', value: '杭州默认 / 跨区测延迟' }
    ]
  },
  {
    key: 'reminders',
    label: '赛前核对',
    meta: 'REMINDER',
    items: [
      { label: '席位', value: LINEUP_SLOT_PATTERN_LABEL },
      { label: '出场', value: '报名账号 / 首发五人' },
      { label: '观战', value: '赛事人员 / 名单内教练/经理' },
      { label: '留存', value: '结算截图 / 回放 15\'' }
    ]
  }
]
const CUSTOM_ROOM_STEPS = [
  '-10\' 建房',
  '导入 8034C',
  '核对后开赛'
]
const MATCH_FLOW_LIMITS = [
  { stage: '赛前集合', limit: '-10\' 建房 / +5\'核对' },
  { stage: '地图选择', limit: `${MAP_PICK_LIMIT_SECONDS}s` },
  { stage: '首发锁定', limit: '开图前锁定' },
  { stage: '英雄禁用', limit: `${HERO_BAN_LIMIT_SECONDS}s / 可跳过` },
  { stage: '比赛进行', limit: '回游戏完成' },
  { stage: '地图确认', limit: '小分确认' },
  { stage: '全场结束', limit: '15\' 回放' }
]
const SIDE_CHOICE_MODES = new Set(['hybrid', 'escort'])
const PRESENCE_HEARTBEAT_MS = 30000
const PRESENCE_STALE_MS = 90000
const TEAM_ROOM_IDENTITY_TYPES = new Set(['PLAYER', 'MANAGER', 'COACH'])
const STAFF_ROOM_IDENTITY_TYPES = new Set(['REFEREE', 'CASTER'])
const ROOM_FLOW_OPERATOR_TYPES = new Set(['ADMIN', 'REFEREE'])
const ROOM_IDENTITY_TITLES = {
  PLAYER: '选手',
  MANAGER: '经理',
  COACH: '教练',
  REFEREE: '赛管',
  CASTER: '解说'
}
const STAFF_PERMISSION_NOTES = {
  REFEREE: {
    title: '赛管权限',
    summary: '流程仲裁 / 超时记录 / 异常推进',
    detail: '常规选图、首发、HERO BAN、赛果确认优先由双方队长完成；赛管负责迟到判罚、争议记录、双方卡住时推进流程，以及赛后数据异常修正。'
  },
  CASTER: {
    title: '解说权限',
    summary: '只读观战 / 无房间设置权限',
    detail: '解说可以查看双方名单、地图流程、HERO BAN 与比分信息；不能修改房间设置、首发名单、地图选择、英雄禁用或赛果。'
  },
  DEFAULT: {
    title: '赛事人员',
    summary: '按身份分配权限',
    detail: '赛事人员进入房间后可查看比赛流程；可写操作仍由队长或赛管身份控制。'
  }
}

function cleanText(value) {
  return String(value ?? '').trim()
}

function getRoomSetupCode(remoteRoom, model) {
  const room = remoteRoom?.room || {}
  const state = room.state || {}
  return cleanText(
    room.customGameCode ||
    room.customRoomCode ||
    room.roomCode ||
    room.importCode ||
    state.customGameCode ||
    state.customRoomCode ||
    state.roomCode ||
    state.importCode ||
    model?.customGameCode ||
    model?.customRoomCode ||
    model?.roomCode ||
    DEFAULT_CUSTOM_ROOM_CODE
  )
}

async function copyTextToClipboard(text) {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }

  if (typeof document === 'undefined') throw new Error('Clipboard is unavailable')

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.left = '-9999px'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()

  try {
    if (!document.execCommand('copy')) throw new Error('Copy command failed')
  } finally {
    document.body.removeChild(textarea)
  }
}

function normalizeRoomKey(value) {
  return cleanText(value).toLowerCase()
}

function uniqueRoomKeys(values) {
  return [...new Set(values.map(normalizeRoomKey).filter(Boolean))]
}

function roomParticipantUserLabel(participant) {
  const user = participant?.user || {}
  return cleanText(user.username || user.displayName)
}

function isRoomParticipantOnline(participant) {
  if (!participant?.isOnline) return false
  if (!participant.lastSeenAt) return true
  const lastSeen = new Date(participant.lastSeenAt).getTime()
  if (!Number.isFinite(lastSeen)) return Boolean(participant.isOnline)
  return Date.now() - lastSeen <= PRESENCE_STALE_MS
}

function getRoomPermission(remoteRoom, currentUser, lifecycle = null) {
  const access = remoteRoom?.access
  const identities = access?.identities || []
  const userId = cleanText(currentUser?.id)
  const hasGlobalOperator = Boolean(access?.canOperate && identities.some(identity => (
    ROOM_FLOW_OPERATOR_TYPES.has(cleanText(identity.identityType).toUpperCase())
  )))
  const captainParticipants = (remoteRoom?.room?.participants || []).filter(participant => (
    participant.isCaptain &&
    cleanText(participant.user?.id) &&
    cleanText(participant.user?.id) === userId
  ))
  const activeCaptainSides = Array.isArray(access?.activeCaptainSides)
    ? access.activeCaptainSides
    : identities
        .filter(identity => identity?.isCaptain)
        .map(identity => cleanText(identity?.side).toUpperCase())
  const captainSides = [...new Set([
    ...activeCaptainSides,
    ...captainParticipants.map(participant => cleanText(participant.side).toUpperCase())
  ].filter(side => side === 'A' || side === 'B'))]
  const canManageFlow = Boolean((hasGlobalOperator || captainSides.length > 0) && lifecycle?.canOperate !== false)

  return {
    canManageFlow,
    canManageAll: Boolean((access?.canManageAll || hasGlobalOperator) && lifecycle?.canOperate !== false),
    isReadOnly: Boolean(lifecycle?.isReadOnly),
    captainSides,
    label: hasGlobalOperator
      ? '赛管权限'
      : captainSides.length
        ? `TEAM ${captainSides.join('/')} 队长`
        : access?.canEnter
          ? '仅队长 / 赛管可操作'
          : '进入房间后可操作'
  }
}

function canManageRoomSide(roomPermission, side) {
  if (!roomPermission?.canManageFlow) return false
  if (roomPermission.canManageAll) return true
  return roomPermission.captainSides?.includes(side)
}

function localParticipantKeys(participant) {
  return uniqueRoomKeys([
    participant?.key,
    participant?.name,
    participant?.battleTag
  ])
}

function remoteParticipantKeys(participant) {
  return uniqueRoomKeys([
    participant?.targetId,
    participant?.displayName,
    participant?.battleTag,
    participant?.teamId,
    roomParticipantUserLabel(participant)
  ])
}

function roomParticipantsMatch(localParticipant, remoteParticipant) {
  if (!localParticipant || !remoteParticipant) return false
  if (cleanText(localParticipant.identityType).toUpperCase() !== cleanText(remoteParticipant.identityType).toUpperCase()) return false
  const localKeys = new Set(localParticipantKeys(localParticipant))
  return remoteParticipantKeys(remoteParticipant).some(key => localKeys.has(key))
}

function remoteParticipantToLocal(participant, side, index) {
  const identityType = cleanText(participant?.identityType).toUpperCase()
  const name = cleanText(participant?.displayName || participant?.targetId || roomParticipantUserLabel(participant) || ROOM_IDENTITY_TITLES[identityType] || '成员')
  const keySeed = participant?.id || participant?.targetId || participant?.battleTag || name || index
  return {
    key: `${side}-remote-${normalizeRoomKey(keySeed) || index}`,
    side,
    identityType,
    title: ROOM_IDENTITY_TITLES[identityType] || identityType || '成员',
    name,
    battleTag: cleanText(participant?.battleTag),
    role: '',
    isCaptain: Boolean(participant?.isCaptain),
    isCurrentAccount: false,
    isOnline: isRoomParticipantOnline(participant),
    isCheckedIn: true,
    lastSeenAt: participant?.lastSeenAt || '',
    accountLabel: roomParticipantUserLabel(participant),
    remoteParticipantId: participant?.id || '',
    remoteUserId: cleanText(participant?.user?.id || participant?.userId)
  }
}

function makeBroadcastStaffParticipant(person, identityType, index) {
  const name = cleanText(person?.name || person?.displayName || person?.display_name || person?.nickname || person)
  const battleTag = cleanText(person?.battleTag || person?.battle_tag || person?.battletag || person?.tag)
  const keySeed = battleTag || name || `${identityType}-${index}`
  return {
    key: `staff-${identityType}-${normalizeRoomKey(keySeed) || index}`,
    side: 'STAFF',
    identityType,
    title: ROOM_IDENTITY_TITLES[identityType] || identityType,
    name: name || battleTag || ROOM_IDENTITY_TITLES[identityType] || '赛事人员',
    battleTag,
    role: '',
    isCaptain: false,
    isCurrentAccount: false,
    isOnline: false,
    isCheckedIn: false,
    lastSeenAt: '',
    accountLabel: '',
    remoteParticipantId: ''
  }
}

function buildLocalBroadcastStaff(model) {
  const broadcast = model?.broadcast || {}
  const casters = (broadcast.casters || []).map((person, index) => makeBroadcastStaffParticipant(person, 'CASTER', index))
  const referees = (broadcast.referees || []).map((person, index) => makeBroadcastStaffParticipant(person, 'REFEREE', index))
  return [...referees, ...casters]
}

function buildRoomStaff(model, remoteRoom) {
  const localStaff = buildLocalBroadcastStaff(model)
  const remoteStaff = (remoteRoom?.room?.participants || [])
    .filter(participant => STAFF_ROOM_IDENTITY_TYPES.has(cleanText(participant.identityType).toUpperCase()))
  const usedRemoteIds = new Set()

  const staff = localStaff.map(localParticipant => {
    const matchedRemote = remoteStaff.find((participant, index) => {
      const key = participant.id || `remote-staff-${index}`
      return !usedRemoteIds.has(key) && roomParticipantsMatch(localParticipant, participant)
    })

    if (!matchedRemote) return localParticipant

    usedRemoteIds.add(matchedRemote.id || `remote-staff-${remoteStaff.indexOf(matchedRemote)}`)
    return {
      ...localParticipant,
      name: localParticipant.name || matchedRemote.displayName || localParticipant.title,
      battleTag: localParticipant.battleTag || cleanText(matchedRemote.battleTag),
      isOnline: isRoomParticipantOnline(matchedRemote),
      isCheckedIn: true,
      lastSeenAt: matchedRemote.lastSeenAt || '',
      accountLabel: roomParticipantUserLabel(matchedRemote),
      remoteParticipantId: matchedRemote.id || '',
      remoteUserId: cleanText(matchedRemote?.user?.id || matchedRemote?.userId)
    }
  })

  const extras = remoteStaff
    .filter((participant, index) => !usedRemoteIds.has(participant.id || `remote-staff-${index}`))
    .map((participant, index) => remoteParticipantToLocal(participant, 'STAFF', index))

  const people = [...staff, ...extras]
  const refereePeople = people.filter(participant => cleanText(participant.identityType).toUpperCase() === 'REFEREE')
  return {
    people,
    onlineCount: people.filter(participant => participant.isOnline).length,
    checkedInCount: people.filter(participant => participant.isCheckedIn).length,
    refereeCount: refereePeople.length,
    onlineRefereeCount: refereePeople.filter(participant => participant.isOnline).length
  }
}

function buildRoomTeam(team, remoteRoom) {
  const remoteParticipants = (remoteRoom?.room?.participants || [])
    .filter(participant => cleanText(participant.side).toUpperCase() === team.side && TEAM_ROOM_IDENTITY_TYPES.has(cleanText(participant.identityType).toUpperCase()))
  const usedRemoteIds = new Set()
  const hasRemoteCaptain = remoteParticipants.some(participant => participant.isCaptain)

  const participants = team.participants.map(localParticipant => {
    const matchedRemote = remoteParticipants.find((participant, index) => {
      const key = participant.id || `remote-${index}`
      return !usedRemoteIds.has(key) && roomParticipantsMatch(localParticipant, participant)
    })

    if (!matchedRemote) {
      return {
        ...localParticipant,
        isCaptain: hasRemoteCaptain ? false : localParticipant.isCaptain,
        isOnline: false,
        isCheckedIn: false
      }
    }

    usedRemoteIds.add(matchedRemote.id || `remote-${remoteParticipants.indexOf(matchedRemote)}`)
    return {
      ...localParticipant,
      name: localParticipant.name || matchedRemote.displayName || localParticipant.title,
      battleTag: localParticipant.battleTag || cleanText(matchedRemote.battleTag),
      isCaptain: hasRemoteCaptain ? Boolean(matchedRemote.isCaptain) : localParticipant.isCaptain,
      isOnline: isRoomParticipantOnline(matchedRemote),
      isCheckedIn: true,
      lastSeenAt: matchedRemote.lastSeenAt || '',
      accountLabel: roomParticipantUserLabel(matchedRemote),
      remoteParticipantId: matchedRemote.id || '',
      remoteUserId: cleanText(matchedRemote?.user?.id || matchedRemote?.userId)
    }
  })

  const extras = remoteParticipants
    .filter((participant, index) => !usedRemoteIds.has(participant.id || `remote-${index}`))
    .map((participant, index) => remoteParticipantToLocal(participant, team.side, index))

  const mergedParticipants = [...participants, ...extras]
  const captain = mergedParticipants.find(participant => participant.isCaptain) || team.captain || null

  return {
    ...team,
    participants: mergedParticipants,
    captain,
    onlineCount: mergedParticipants.filter(participant => participant.isOnline).length,
    checkedInCount: mergedParticipants.filter(participant => participant.isCheckedIn).length
  }
}

function getPlayerOptions(team) {
  return team.players.map(player => ({
    value: player.key,
    label: getPlayerDisplayName(player) || player.name,
    detail: getPlayerBattleTagLabel(player)
  }))
}

function getInitialLineup() {
  return LINEUP_SLOT_META.map(slot => ({
    slot: slot.slot,
    role: slot.role,
    playerKey: ''
  }))
}

function normalizeLineupSlots(rows = []) {
  return LINEUP_SLOT_META.map((meta, index) => ({
    slot: rows[index]?.slot || meta.slot,
    role: rows[index]?.role || meta.role,
    playerKey: rows[index]?.playerKey || ''
  }))
}

function normalizeRoleName(role) {
  const value = cleanText(role).toUpperCase()
  if (value === 'SUP') return 'SUPPORT'
  if (value === 'DAMAGE') return 'DPS'
  return value
}

function getRoleLabel(role) {
  return ROLE_LABELS[normalizeRoleName(role)] || cleanText(role) || '-'
}

function getLineupSlotDisplayLabel(slot) {
  const slotKey = cleanText(typeof slot === 'string' ? slot : slot?.slot).toUpperCase()
  const role = cleanText(typeof slot === 'string' ? '' : slot?.role).toUpperCase()
  if (LINEUP_SLOT_DISPLAY_LABELS[slotKey]) return LINEUP_SLOT_DISPLAY_LABELS[slotKey]
  if (role === 'SUPPORT') return 'SUP'
  if (role === 'TANK') return 'TANK'
  if (role === 'DPS' || role === 'DAMAGE') return 'DPS'
  return slotKey || '-'
}

function getPlayerByKey(team, key) {
  return team.players.find(player => player.key === key) || null
}

function getPlayerBattleTagLabel(player) {
  return cleanText(player?.battleTag || player?.accountLabel || player?.name)
}

function getPlayerDisplayName(player) {
  return cleanText(player?.name || player?.battleTag || player?.accountLabel)
}

function getParticipantLabel(team, key) {
  const player = getPlayerByKey(team, key)
  if (!player) return '未选择'
  return getPlayerDisplayName(player) || getPlayerBattleTagLabel(player)
}

function updateLineupSlot(lineup, setLineup, side, index, playerKey) {
  setLineup(currentLineup => {
    const sourceLineup = currentLineup || lineup || {}
    const rows = normalizeLineupSlots(sourceLineup?.[side])
    const nextRows = rows.map((row, rowIndex) => {
      if (rowIndex === index) return { ...row, playerKey }
      if (playerKey && row.playerKey === playerKey) return { ...row, playerKey: '' }
      return row
    })
    return { ...sourceLineup, [side]: nextRows }
  })
}

function getLineupAssignment(slots, playerKey) {
  return slots.find(slot => slot.playerKey === playerKey) || null
}

function normalizeMapType(type) {
  const text = cleanText(type)
  const lower = text.toLowerCase()
  if (lower === 'control' || text === '控制图') return '控制'
  if (lower === 'hybrid' || text === '混合图') return '混合'
  if (lower === 'escort' || lower === 'payload' || text === '运载目标') return '运载'
  if (lower === 'push' || text === '机动推进') return '推进'
  if (lower === 'flashpoint' || text === '闪点作战') return '闪点'
  if (lower === 'clash' || text === '冲突模式') return '冲突'
  return text
}

function getMapModeLabel(mode, locale) {
  return normalizeMapType(formatOwMapMode(mode, locale) || mode)
}

function getMapNameKey(value) {
  return normalizeRoomKey(formatOwMapName(value || '', 'en'))
}

function getMapModeByName(value) {
  const key = getMapNameKey(value)
  if (!key) return ''
  const map = OW_MAPS.find(item => getMapNameKey(item.en || item.id) === key || getMapNameKey(item.id) === key)
  return map?.mode || ''
}

function getMapModeByType(value) {
  const key = normalizeRoomKey(normalizeMapType(value))
  if (!key) return ''
  return MAP_MODE_ORDER.find(mode => (
    key === normalizeRoomKey(mode) ||
    key === normalizeRoomKey(getMapModeLabel(mode, 'zh-CN')) ||
    key === normalizeRoomKey(getMapModeLabel(mode, 'en-US'))
  )) || ''
}

function isEnglishRoomLocale(locale) {
  return String(locale || '').toLowerCase().startsWith('en')
}

function normalizeMapPoolKey(value) {
  const text = cleanText(value)
  const lower = text.toLowerCase()
  if (!text) return ''
  if (
    lower.includes('lcq') ||
    lower.includes('playoff') ||
    lower.includes('knockout') ||
    lower.includes('final') ||
    text.includes('季后') ||
    text.includes('淘汰') ||
    text.includes('决赛')
  ) {
    return MAP_POOL_KEYS.PLAYOFF
  }
  if (
    lower.includes('public') ||
    lower.includes('qualifier') ||
    lower.includes('swiss') ||
    lower.includes('open') ||
    text.includes('公开') ||
    text.includes('预选') ||
    text.includes('瑞士')
  ) {
    return MAP_POOL_KEYS.PUBLIC_QUALIFIER
  }
  return ''
}

function getMatchRuleText(model) {
  return [
    model?.matchId,
    model?.match?.stage,
    model?.match?.round,
    model?.match?.match_display_name,
    model?.title,
    model?.fullTitle
  ].map(cleanText).join(' ')
}

function getMatchPhase(model) {
  const text = getMatchRuleText(model).toUpperCase()
  if (text.includes('LCQ')) return 'LCQ'
  if (text.includes('PLAYOFF') || text.includes('KNOCKOUT') || text.includes('GRAND') || text.includes('FINAL')) return 'PLAYOFF'
  if (text.includes('SWISS')) return 'SWISS'
  return ''
}

function getMatchRoundNumber(model) {
  const values = [
    model?.match?.round,
    model?.matchId,
    model?.match?.match_display_name,
    model?.title,
    model?.fullTitle
  ].map(cleanText).filter(Boolean)

  for (const value of values) {
    const roundMatch = value.match(/\bROUND\s*0?([1-9]\d*)/i)
    if (roundMatch) return Number(roundMatch[1])
    const swissMatch = value.match(/\bSWISS[-_\s]*R\s*0?([1-9]\d*)/i)
    if (swissMatch) return Number(swissMatch[1])
    const shortMatch = value.match(/\bR\s*0?([1-9]\d*)\b/i)
    if (shortMatch) return Number(shortMatch[1])
  }
  return 0
}

function getMatchMapPoolKey(model, remoteRoom) {
  const explicitPoolKey = normalizeMapPoolKey(
    remoteRoom?.room?.mapPoolKey ||
    remoteRoom?.room?.map_pool_key ||
    model?.match?.mapPoolKey ||
    model?.match?.map_pool_key
  )
  if (explicitPoolKey) return explicitPoolKey

  const matchText = [
    model?.matchId,
    model?.match?.stage,
    model?.match?.round,
    model?.match?.match_display_name,
    model?.title,
    model?.fullTitle
  ].map(cleanText).join(' ')
  return normalizeMapPoolKey(matchText) || MAP_POOL_KEYS.PUBLIC_QUALIFIER
}

function getMapPoolMeta(poolKey, locale) {
  const meta = MAP_POOL_META[poolKey] || MAP_POOL_META[MAP_POOL_KEYS.PUBLIC_QUALIFIER]
  const useEnglish = isEnglishRoomLocale(locale)
  return {
    label: useEnglish ? meta.labelEn : meta.label,
    hint: useEnglish ? meta.hintEn : meta.hint
  }
}

function getMapImageSrc(map) {
  if (map?.id && !AVAILABLE_MAP_IMAGE_IDS.has(map.id)) return ''
  if (!map?.imageName || !map?.mode) return ''
  return encodeURI(`/maps/${getOwMapModeFolder(map.mode)}/${map.imageName}.jpg`)
}

function toMapPoolItem(map, mode, locale) {
  const imageName = getOwMapImageName(map.en || map.id)
  return {
    id: map.id,
    mode,
    type: getMapModeLabel(mode, locale),
    name: formatOwMapName(map.en || map.id, locale),
    imageName,
    imageSrc: getMapImageSrc({
      id: map.id,
      mode,
      imageName
    })
  }
}

function getMapPoolItemById(id, locale) {
  const map = OW_MAPS.find(item => item.id === id)
  return map ? toMapPoolItem(map, map.mode, locale) : null
}

function getMapPickRule(model, currentMapOrder, locale) {
  const mapOrder = Number(currentMapOrder || 1)
  if (mapOrder !== 1) return null

  const phase = getMatchPhase(model)
  if (phase === 'SWISS') {
    const roundNumber = getMatchRoundNumber(model) || 1
    const mapId = SWISS_FIRST_MAP_ROTATION_IDS[(roundNumber - 1) % SWISS_FIRST_MAP_ROTATION_IDS.length]
    const map = getMapPoolItemById(mapId, locale)
    if (!map) return null
    return {
      kind: 'locked',
      lockedMapId: map.id,
      lockedMap: map,
      pickerSide: '',
      fixedPickerSide: true,
      label: uiText("瑞士轮 R{0} 首图", locale, [roundNumber]),
      detail: `${map.name} / 赛事方指定`,
      badge: '固定首图'
    }
  }

  if (phase === 'LCQ' || phase === 'PLAYOFF') {
    return {
      kind: 'seedPick',
      allowedMode: 'control',
      pickerSide: 'A',
      fixedPickerSide: true,
      label: phase === 'LCQ' ? uiText("LCQ 首图", locale) : uiText("淘汰赛首图", locale),
      detail: `${model?.teamA?.short || 'TEAM A'} 高顺位先选，占领要点`,
      badge: '高顺位先选'
    }
  }

  return null
}

function getMapRuleTags(currentMapOrder, mapPickRule) {
  const mapOrder = Number(currentMapOrder || 1)
  const tags = []

  if (mapOrder === 1 && mapPickRule?.kind === 'seedPick') {
    tags.push('高顺位先选控制图')
  }

  tags.push(mapOrder === 1 ? '后续败方选图/攻防' : '败方选图/攻防')
  tags.push('同图不可重复')
  tags.push('类型轮换/五类重置')

  return tags
}

function useRoomClock(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(timer)
  }, [intervalMs])

  return now
}

function parseRoomTimestamp(value) {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null

  const text = cleanText(value)
  if (!text) return null

  const compactMatch = text.match(/(\d{4}[-/]\d{1,2}[-/]\d{1,2})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/)
  const normalized = compactMatch
    ? `${compactMatch[1].replace(/\//g, '-')}T${compactMatch[2].padStart(2, '0')}:${compactMatch[3]}:${compactMatch[4] || '00'}+08:00`
    : text
  const timestamp = new Date(normalized).getTime()
  return Number.isFinite(timestamp) ? timestamp : null
}

function getMatchStartTimestamp(model) {
  const match = model?.match || {}
  const candidates = [
    match.scheduledAt,
    match.scheduled_at,
    match.startAt,
    match.start_at,
    match.matchTime,
    match.match_time,
    match.time,
    model?.scheduleLabel
  ]

  if (match.date && match.time) candidates.unshift(`${match.date} ${match.time}`)
  if (match.scheduledDate && match.scheduledTime) candidates.unshift(`${match.scheduledDate} ${match.scheduledTime}`)
  if (match.scheduled_date && match.scheduled_time) candidates.unshift(`${match.scheduled_date} ${match.scheduled_time}`)

  for (const candidate of candidates) {
    const timestamp = parseRoomTimestamp(candidate)
    if (timestamp) return timestamp
  }
  return null
}

function formatRoomClock(timestamp, { withDate = false, withSeconds = true } = {}) {
  if (!timestamp) return '-'
  const options = withDate
    ? { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }
    : { hour: '2-digit', minute: '2-digit', second: withSeconds ? '2-digit' : undefined, hour12: false }
  return new Intl.DateTimeFormat('zh-CN', options).format(new Date(timestamp))
}

function formatDurationSeconds(seconds) {
  const safeSeconds = Math.max(0, Number(seconds || 0))
  const minutes = Math.floor(safeSeconds / 60)
  const remainder = safeSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
}

function getLateStatus(startTimestamp, now, targetWins = 2) {
  if (!startTimestamp) {
    return {
      status: 'missing',
      label: '等待赛程时间',
      detail: '后台同步开赛时间后显示迟到窗口'
    }
  }

  const requiredWins = Number.isFinite(Number(targetWins)) && Number(targetWins) > 0 ? Number(targetWins) : 2
  const seriesForfeitMinutes = requiredWins * MAP_FORFEIT_INTERVAL_MINUTES
  const checkinTimestamp = startTimestamp - CHECKIN_WINDOW_MINUTES * 60000
  if (now < checkinTimestamp) {
    return {
      status: 'early',
      label: `距离入场窗口 ${Math.ceil((checkinTimestamp - now) / 60000)} 分钟`,
      detail: `赛前 ${CHECKIN_WINDOW_MINUTES} 分钟开始签到和人员确认`
    }
  }

  if (now < startTimestamp) {
    return {
      status: 'warning',
      label: '赛前入场窗口',
      detail: `距离开赛 ${Math.ceil((startTimestamp - now) / 60000)} 分钟，首发需进入房间`
    }
  }

  const diffMinutes = Math.floor((now - startTimestamp) / 60000)
  if (diffMinutes >= seriesForfeitMinutes) {
    return {
      status: 'critical',
      label: `已到 FT${requiredWins} 判定线`,
      detail: `每 ${MAP_FORFEIT_INTERVAL_MINUTES} 分钟可判 1 张地图负；连续不足 5 人可结束比赛`
    }
  }

  const forfeitableMaps = Math.floor(diffMinutes / MAP_FORFEIT_INTERVAL_MINUTES)
  const nextPenaltyMinutes = MAP_FORFEIT_INTERVAL_MINUTES - (diffMinutes % MAP_FORFEIT_INTERVAL_MINUTES)
  if (forfeitableMaps > 0) {
    return {
      status: 'critical',
      label: `已可判 ${forfeitableMaps} 张地图负`,
      detail: `继续不足 5 人，${nextPenaltyMinutes} 分钟后可再判当前地图负`
    }
  }

  return {
    status: 'live',
    label: `已到开赛时间 ${diffMinutes} 分钟`,
    detail: `不足 5 人，${nextPenaltyMinutes} 分钟后当前地图判负`
  }
}

function getStepStartedTimestamp(remoteRoom, remoteMap) {
  const room = remoteRoom?.room || {}
  const state = getSafeRoomState(remoteRoom)
  const candidates = [
    state.stepStartedAt,
    state.step_started_at,
    room.stepStartedAt,
    room.step_started_at,
    remoteMap?.stepStartedAt,
    remoteMap?.step_started_at,
    remoteMap?.updatedAt,
    remoteMap?.updated_at,
    remoteMap?.createdAt,
    remoteMap?.created_at,
    room.updatedAt,
    room.updated_at,
    room.createdAt,
    room.created_at
  ]

  for (const candidate of candidates) {
    const timestamp = parseRoomTimestamp(candidate)
    if (timestamp) return timestamp
  }
  return null
}

function getStepTimer(activeStep, remoteRoom, remoteMap, now) {
  const limit = activeStep === MATCH_ROOM_STEP_KEYS.MAP_PICK
    ? MAP_PICK_LIMIT_SECONDS
    : activeStep === MATCH_ROOM_STEP_KEYS.HERO_BAN
      ? HERO_BAN_LIMIT_SECONDS
      : 0
  if (!limit) return null

  const startedAt = getStepStartedTimestamp(remoteRoom, remoteMap)
  if (!startedAt) {
    return {
      label: activeStep === MATCH_ROOM_STEP_KEYS.MAP_PICK ? '地图选择限时' : '英雄禁用限时',
      remaining: limit,
      elapsed: 0,
      expired: false,
      isSynced: false
    }
  }

  const elapsed = Math.max(0, Math.floor((now - startedAt) / 1000))
  return {
    label: activeStep === MATCH_ROOM_STEP_KEYS.MAP_PICK ? '地图选择限时' : '英雄禁用限时',
    remaining: Math.max(0, limit - elapsed),
    elapsed,
    expired: elapsed >= limit,
    isSynced: true
  }
}

function getMapSideChoiceLabel(side, model) {
  if (side === 'A') return model?.teamA?.short || 'TEAM A'
  if (side === 'B') return model?.teamB?.short || 'TEAM B'
  return ''
}

function getMapPool(locale, poolKey = MAP_POOL_KEYS.PUBLIC_QUALIFIER) {
  const pool = FCR2026_MAP_POOLS[poolKey] || FCR2026_MAP_POOLS[MAP_POOL_KEYS.PUBLIC_QUALIFIER]
  return MAP_MODE_ORDER
    .map(mode => ({
      mode,
      label: getMapModeLabel(mode, locale),
      maps: (pool[mode] || [])
        .map(id => OW_MAPS.find(map => map.id === id))
        .filter(Boolean)
        .map(map => toMapPoolItem(map, mode, locale))
    }))
    .filter(group => group.maps.length)
}

function getUsedRoomMaps(remoteRoom, currentMapOrder = 1) {
  return (remoteRoom?.room?.maps || [])
    .filter(map => cleanText(map.mapName) || cleanText(map.mapType))
    .filter(map => map.status && map.status !== 'PENDING')
    .map(map => ({
      mapOrder: Number(map.mapOrder || 0),
      isCurrent: Number(map.mapOrder || 0) === Number(currentMapOrder),
      mapNameKey: getMapNameKey(map.mapName || ''),
      mapTypeKey: normalizeRoomKey(normalizeMapType(map.mapType)),
      mapModeKey: getMapModeByName(map.mapName || '') || getMapModeByType(map.mapType)
    }))
}

function getHeroBanForSide(map, side) {
  const heroBans = map?.heroBans || map?.hero_bans || {}
  return heroBans?.[side] || heroBans?.[String(side).toLowerCase()] || null
}

function getHeroBanKey(ban) {
  const hero = cleanText(ban?.hero)
  if (!hero) return ''
  return getOwHeroCanonicalKey(hero) || normalizeRoomKey(hero)
}

function getHeroBanRoleKey(ban) {
  const heroRole = getOwHeroRole(ban?.hero)
  if (heroRole) return heroRole

  const role = cleanText(ban?.role).toUpperCase()
  if (role === 'TANK') return 'tank'
  if (role === 'DPS' || role === 'DAMAGE') return 'damage'
  if (role === 'SUP' || role === 'SUPPORT') return 'support'
  return normalizeRoomKey(role)
}

function getPriorTeamBanKeys(remoteRoom, currentMapOrder, side) {
  return new Set((remoteRoom?.room?.maps || [])
    .filter(map => Number(map?.mapOrder || 0) !== Number(currentMapOrder || 0))
    .map(map => getHeroBanKey(getHeroBanForSide(map, side)))
    .filter(Boolean))
}

function normalizeRoomSide(value) {
  const side = cleanText(value).toUpperCase()
  return side === 'A' || side === 'B' ? side : ''
}

function getOppositeRoomSide(side) {
  return normalizeRoomSide(side) === 'B' ? 'A' : 'B'
}

function getBanRoleValue(role) {
  const key = normalizeRoomKey(role)
  if (key === 'tank') return 'TANK'
  if (key === 'damage' || key === 'dps') return 'DPS'
  if (key === 'support' || key === 'sup') return 'SUPPORT'
  return ''
}

function createEmptyHeroBans() {
  return {
    A: { role: '', hero: '' },
    B: { role: '', hero: '' }
  }
}

function normalizeHeroBanSide(ban) {
  const hero = cleanText(ban?.hero)
  const isPass = Boolean(ban?.isPass || ban?.is_pass || ban?.pass || ban?.timeout) && !hero
  return {
    role: hero ? getBanRoleValue(getHeroBanRoleKey(ban)) || getBanRoleValue(ban?.role) : '',
    hero,
    isPass,
    timeout: Boolean(ban?.timeout) && !hero,
    reason: isPass ? cleanText(ban?.reason) || 'TIMEOUT' : ''
  }
}

function normalizeHeroBanDraft(heroBans) {
  return {
    A: normalizeHeroBanSide(heroBans?.A),
    B: normalizeHeroBanSide(heroBans?.B),
    firstSide: normalizeRoomSide(heroBans?.firstSide) || normalizeRoomSide(heroBans?.first_side)
  }
}

function getTeamBanRecords(remoteRoom, currentMapOrder, side) {
  return (remoteRoom?.room?.maps || [])
    .filter(map => Number(map?.mapOrder || 0) !== Number(currentMapOrder || 0))
    .map(map => {
      const ban = getHeroBanForSide(map, side)
      const heroKey = getHeroBanKey(ban)
      if (!heroKey) return null
      return {
        heroKey,
        mapOrder: Number(map?.mapOrder || 0),
        side,
        hero: cleanText(ban?.hero),
        role: getHeroBanRoleKey(ban)
      }
    })
    .filter(Boolean)
}

function getTeamBanHistoryRecords(remoteRoom, currentMapOrder, side) {
  return (remoteRoom?.room?.maps || [])
    .filter(map => Number(map?.mapOrder || 0) !== Number(currentMapOrder || 0))
    .map(map => {
      const ban = normalizeHeroBanSide(getHeroBanForSide(map, side))
      if (!ban.hero && !ban.isPass) return null
      return {
        mapOrder: Number(map?.mapOrder || 0),
        side,
        hero: ban.hero,
        role: getHeroBanRoleKey(ban),
        isPass: ban.isPass,
        timeout: ban.timeout
      }
    })
    .filter(Boolean)
    .sort((a, b) => Number(a.mapOrder || 0) - Number(b.mapOrder || 0))
}

function getActiveMapTypeKeys(usedMaps, mapPool) {
  const poolModes = new Set(mapPool.map(group => group.mode).filter(Boolean))
  if (!poolModes.size) return new Set()

  const activeCycle = new Set()
  ;[...usedMaps]
    .sort((a, b) => Number(a.mapOrder || 0) - Number(b.mapOrder || 0))
    .forEach(map => {
      const mode = map.mapModeKey
      if (!mode || !poolModes.has(mode)) return
      activeCycle.add(mode)
      if (activeCycle.size >= poolModes.size) activeCycle.clear()
    })

  return activeCycle
}

function getHeroGroups(locale) {
  return ['tank', 'damage', 'support'].map(role => ({
    role,
    label: HERO_ROLE_LABELS[role],
    heroes: OW_HEROES
      .filter(hero => hero.role === role)
      .map(hero => ({
        id: hero.id,
        role,
        name: formatOwHeroName(hero.en || hero.id, locale),
        value: hero.en || hero.id,
        avatar: getHeroPortraitSrc(hero)
      }))
  }))
}

function getHeroPortraitSrc(hero) {
  const role = hero?.role === 'tank' ? 'tank' : hero?.role === 'support' ? 'support' : 'damage'
  const slug = getOwHeroAssetKey(hero?.en || hero?.id) || String(hero?.assetKey || hero?.id || '').replace(/-/g, '_')
  return slug ? `/heroes/${role}/${slug}.png` : ''
}

function getBanPortraitSrc(heroValue, roleValue) {
  const role = getOwHeroRole(heroValue) || getHeroBanRoleKey({ role: roleValue })
  return getHeroPortraitSrc({ en: heroValue, id: heroValue, role })
}

function getCurrentRemoteMap(remoteRoom) {
  const room = remoteRoom?.room
  if (!room) return null
  const mapOrder = Number(room.currentMapOrder || 1)
  return room.maps?.find(map => Number(map.mapOrder) === mapOrder) || room.maps?.[0] || null
}

function getRemoteMapLineup(map, side) {
  const key = side === 'B' ? 'lineupB' : 'lineupA'
  if (!Array.isArray(map?.[key])) return null

  const lineup = normalizeLineupSlots(map[key])
  return lineup.some(slot => slot.playerKey) ? lineup : null
}

function getPreviousRemoteMapLineup(remoteRoom, currentMapOrder, side) {
  const maps = remoteRoom?.room?.maps
  if (!Array.isArray(maps)) return null

  const order = Number(currentMapOrder || 1)
  return maps
    .filter(map => Number(map?.mapOrder || 0) < order)
    .sort((a, b) => Number(b?.mapOrder || 0) - Number(a?.mapOrder || 0))
    .map(map => getRemoteMapLineup(map, side))
    .find(Boolean) || null
}

function getLineupForRemoteMap(remoteRoom, remoteMap, side) {
  const currentMapOrder = remoteMap?.mapOrder || remoteRoom?.room?.currentMapOrder || 1
  return getRemoteMapLineup(remoteMap, side) ||
    getPreviousRemoteMapLineup(remoteRoom, currentMapOrder, side) ||
    getInitialLineup()
}

function getSafeRoomState(remoteRoom) {
  const state = remoteRoom?.room?.state
  if (!state || typeof state !== 'object' || Array.isArray(state)) return {}
  return state
}

function getRoomStepStatus(stepKey) {
  if (stepKey === MATCH_ROOM_STEP_KEYS.WAITING) return 'WAITING'
  if (stepKey === MATCH_ROOM_STEP_KEYS.MATCH_FINISHED) return 'FINISHED'
  return 'ACTIVE'
}

function normalizeDisplayStepKey(stepKey) {
  if (stepKey === MATCH_ROOM_STEP_KEYS.READY_CHECK) return MATCH_ROOM_STEP_KEYS.IN_GAME
  return stepKey
}

function getSyncErrorState(error, labels = {}) {
  const statusCode = Number(error?.status || 0)
  if (statusCode === 401) return { status: 'unauthorized', label: labels.unauthorized || '登录后同步' }
  if (statusCode === 403) return { status: 'forbidden', label: labels.forbidden || '无房间权限' }
  if (statusCode === 404) return { status: 'missing', label: labels.missing || '房间未创建' }
  if (statusCode >= 500) return { status: 'error', label: labels.error || '后端报错' }
  return { status: 'offline', label: labels.offline || '网络未连接' }
}

function getConfirmation(remoteMap, side) {
  return remoteMap?.confirmations?.find(item => item.side === side) || null
}

function confirmationScore(confirmation) {
  if (!confirmation) return '-'
  return `${confirmation.scoreA}:${confirmation.scoreB}`
}

function confirmationUser(confirmation) {
  return confirmation?.user?.username || confirmation?.user?.displayName || confirmation?.user?.email || ''
}

function hasSameScore(left, right) {
  return Boolean(left && right && left.scoreA === right.scoreA && left.scoreB === right.scoreB)
}

function getRemoteMapVerdict(remoteMap, model) {
  if (!remoteMap) {
    return {
      status: 'local',
      label: '等待同步',
      detail: '当前显示为本地预览'
    }
  }

  const confirmationA = getConfirmation(remoteMap, 'A')
  const confirmationB = getConfirmation(remoteMap, 'B')
  const submittedSides = remoteMap?.resultConfirmation?.submittedSides || [
    confirmationA ? 'A' : '',
    confirmationB ? 'B' : ''
  ].filter(Boolean)
  if (remoteMap.status === 'COMPLETE' || remoteMap.status === 'DRAW') {
    const winner = remoteMap.isDraw
      ? '平局地图'
      : remoteMap.winnerSide === 'A'
        ? model.teamA.short
        : model.teamB.short
    return {
      status: 'complete',
      label: `${winner} 已锁定`,
      detail: `${remoteMap.scoreA ?? '-'}:${remoteMap.scoreB ?? '-'}`
    }
  }

  if (remoteMap.status === 'DISPUTED' || remoteMap?.resultConfirmation?.disputed || (confirmationA && confirmationB && !hasSameScore(confirmationA, confirmationB))) {
    return {
      status: 'conflict',
      label: '小分不一致，流程已冻结',
      detail: '等待赛管核对截图并裁定，双方提交内容不会互相公开'
    }
  }

  if (submittedSides.length) {
    const submittedLabels = submittedSides.map(side => side === 'A' ? model.teamA.short : model.teamB.short)
    return {
      status: 'waiting',
      label: '等待另一方确认',
      detail: `${submittedLabels.join(' / ')} 已提交`
    }
  }

  return {
    status: 'empty',
    label: '等待双方确认',
    detail: `地图 ${remoteMap.mapOrder || 1}`
  }
}

function canConfirmSide(roomPermission, side) {
  return Boolean(roomPermission?.canManageAll || roomPermission?.captainSides?.includes(side))
}

function mergeRemoteMap(remoteRoom, nextMap) {
  if (!remoteRoom?.room || !nextMap) return remoteRoom
  const maps = remoteRoom.room.maps || []
  const exists = maps.some(map => Number(map.mapOrder) === Number(nextMap.mapOrder))
  const nextMaps = exists
    ? maps.map(map => Number(map.mapOrder) === Number(nextMap.mapOrder) ? nextMap : map)
    : [...maps, nextMap].sort((a, b) => Number(a.mapOrder) - Number(b.mapOrder))

  return {
    ...remoteRoom,
    room: {
      ...remoteRoom.room,
      maps: nextMaps,
      updatedAt: new Date().toISOString()
    }
  }
}

function mergeRemoteRoom(remoteRoom, nextRoom) {
  if (!remoteRoom || !nextRoom) return remoteRoom
  return {
    ...remoteRoom,
    room: nextRoom
  }
}

function getSeriesScore(remoteRoom) {
  const maps = remoteRoom?.room?.maps || []
  return maps.reduce((score, map) => {
    if (map.status !== 'COMPLETE') return score
    if (map.winnerSide === 'A') return { ...score, A: score.A + 1, played: score.played + 1 }
    if (map.winnerSide === 'B') return { ...score, B: score.B + 1, played: score.played + 1 }
    return score
  }, { A: 0, B: 0, played: 0 })
}

function isRemoteMapLocked(remoteMap) {
  return remoteMap?.status === 'COMPLETE' || remoteMap?.status === 'DRAW'
}

function getTargetWins(remoteRoom, model) {
  const targetWins = Number(remoteRoom?.room?.targetWins || model?.targetWins || 2)
  return Number.isFinite(targetWins) && targetWins > 0 ? targetWins : 2
}

function getSeriesWinnerSide(remoteRoom, model) {
  const score = getSeriesScore(remoteRoom)
  const targetWins = getTargetWins(remoteRoom, model)
  if (score.A >= targetWins) return 'A'
  if (score.B >= targetWins) return 'B'
  return ''
}

function getNextPickerSide(remoteMap) {
  if (remoteMap?.winnerSide === 'A') return 'B'
  if (remoteMap?.winnerSide === 'B') return 'A'
  return remoteMap?.pickerSide || ''
}

function getNextMapOrder(remoteRoom, remoteMap) {
  const currentOrder = Number(remoteMap?.mapOrder || remoteRoom?.room?.currentMapOrder || 1)
  return Number.isFinite(currentOrder) && currentOrder > 0 ? currentOrder + 1 : 1
}

function getMapProgression(remoteRoom, model, remoteMap) {
  const score = getSeriesScore(remoteRoom)
  const targetWins = getTargetWins(remoteRoom, model)
  const winnerSide = getSeriesWinnerSide(remoteRoom, model)
  return {
    isLocked: isRemoteMapLocked(remoteMap),
    score,
    targetWins,
    winnerSide,
    nextMapOrder: getNextMapOrder(remoteRoom, remoteMap),
    nextPickerSide: getNextPickerSide(remoteMap)
  }
}

function getFinalWinnerSide(scoreA, scoreB) {
  const a = Number(scoreA)
  const b = Number(scoreB)
  if (!Number.isInteger(a) || !Number.isInteger(b) || a === b) return ''
  return a > b ? 'A' : 'B'
}

function LineupPlayerSelect({
  value,
  options,
  disabled,
  open,
  side = 'A',
  placement = 'bottom',
  onToggle,
  onChange
}) {
  const uiLocale = useUiLocale()
  const selected = options.find(option => option.value === value)
  const displayLabel = selected?.label || '未选择'

  return (
    <div
      className={styles.lineupPlayerSelect}
      data-lineup-picker-root="true"
      data-open={open ? 'true' : 'false'}
      data-filled={selected ? 'true' : 'false'}
      data-side={side}
      data-placement={placement}
      onKeyDown={event => {
        if (event.key === 'Escape' && open) onToggle(false)
      }}
    >
      <button
        type="button"
        className={styles.lineupSelectButton}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => onToggle()}
      >
        <strong data-i18n-ignore>{displayLabel}</strong>
      </button>
      {open && !disabled ? (
        <div className={styles.lineupSelectMenu} role="listbox">
          <button
            type="button"
            className={styles.lineupSelectOption}
            role="option"
            aria-selected={!selected}
            data-selected={!selected ? 'true' : 'false'}
            onClick={() => onChange('')}
              >
                <strong>{uiText("未选择", uiLocale)}</strong>
                <em>{uiText("清空", uiLocale)}</em>
              </button>
          {options.map(option => {
            const detail = cleanText(option.detail)
            const showDetail = detail && detail !== option.label
            return (
              <button
                type="button"
                key={option.value}
                className={styles.lineupSelectOption}
                role="option"
                aria-selected={option.value === value}
                data-selected={option.value === value ? 'true' : 'false'}
                onClick={() => onChange(option.value)}
              >
                <strong data-i18n-ignore>{option.label}</strong>
                <em data-i18n-ignore>{showDetail ? detail : uiText("战网 ID 待同步", uiLocale)}</em>
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

function getTeamFullLabel(team) {
  const full = cleanText(team?.full || team?.fullName || team?.name)
  const short = cleanText(team?.short)
  return full && full !== short ? full : ''
}

function getTeamMatchLabel(team) {
  return getTeamFullLabel(team) || cleanText(team?.full || team?.short || team?.name) || '-'
}

function getWinnerTeamId(model, side) {
  if (side === 'A') return model.teamA.id
  if (side === 'B') return model.teamB.id
  return ''
}

function buildFinalSubmissionPayload(remoteRoom) {
  const room = remoteRoom?.room
  return {
    schemaVersion: 'match-room-final-v1',
    roomId: room?.id || '',
    maps: (room?.maps || []).map(map => ({
      mapOrder: map.mapOrder,
      status: map.status,
      mapType: map.mapType,
      mapName: map.mapName,
      scoreA: map.scoreA,
      scoreB: map.scoreB,
      winnerSide: map.winnerSide,
      isDraw: map.isDraw,
      confirmations: (map.confirmations || []).map(item => ({
        side: item.side,
        scoreA: item.scoreA,
        scoreB: item.scoreB,
        winnerSide: item.winnerSide,
        isDraw: item.isDraw,
        userId: item.user?.id || ''
      }))
    }))
  }
}

function latestFinalSubmission(remoteRoom) {
  return remoteRoom?.room?.finalSubmissions?.[0] || null
}

function mergeRemoteFinalSubmission(remoteRoom, finalSubmission) {
  if (!remoteRoom?.room || !finalSubmission) return remoteRoom
  return {
    ...remoteRoom,
    room: {
      ...remoteRoom.room,
      status: 'FINISHED',
      currentStep: MATCH_ROOM_STEP_KEYS.MATCH_FINISHED,
      finalSubmissions: [
        finalSubmission,
        ...(remoteRoom.room.finalSubmissions || []).filter(item => item.id !== finalSubmission.id)
      ],
      updatedAt: new Date().toISOString()
    }
  }
}

function Header({ model, withSeason, onBack, syncState, onCheckIn, activeStep, roomLifecycle }) {
  const uiLocale = useUiLocale()
  const checkInLabel = syncState.status === 'connected' && String(syncState.label || '').includes('已签到')
    ? '刷新签到'
    : '签到'
  const displayStepKey = normalizeDisplayStepKey(activeStep)
  const currentStep = model.flowSteps.find(step => step.key === displayStepKey) || model.flowSteps[0]
  const syncActivityLabel = syncState.status === 'connected'
    ? `最近同步 ${formatRoomClock(syncState.lastSyncedAt)}`
    : '未同步'
  const fullMatchLabel = `${getTeamMatchLabel(model.teamA)} vs ${getTeamMatchLabel(model.teamB)}`

  return (
    <header className={styles.header}>
      <div className={styles.roomChrome}>
        <Link className={styles.roomChromeBrand} to={withSeason('/me')}><img src="/logos/fries-cup-symbol.png" alt="" /><span>FRIES CUP<small>DATA CENTER</small></span></Link>
        <div className={styles.roomChromeMatch}><span>{uiText("比赛房 · ", uiLocale)}{model.format} · {model.statusLabel}</span><h1>{model.teamA.short}<b>VS</b>{model.teamB.short}</h1><small>{fullMatchLabel}</small><em>{model.scheduleLabel}</em></div>
        <div className={styles.roomChromeStatus}><div className={styles.roomStepBadge}><span>{uiText("当前阶段", uiLocale)}</span><strong>{String(currentStep.index).padStart(2, '0')} {currentStep.label}</strong></div><div className={styles.syncStatus} data-status={syncState.status}><span>{uiText("同步状态", uiLocale)}</span><strong>{syncState.label}</strong><em>{syncActivityLabel}</em></div></div>
        <div className={styles.roomChromeActions}><button type="button" className={styles.checkInButton} onClick={onCheckIn} disabled={syncState.isLoading || roomLifecycle?.isReadOnly}>{roomLifecycle?.isReadOnly ? uiText("只读记录", uiLocale) : syncState.isLoading ? uiText("同步中", uiLocale) : checkInLabel}</button><Link className={styles.detailLink} to={withSeason(`/matches/${encodeURIComponent(model.matchId)}`)}>{uiText("比赛详情 ↗", uiLocale)}</Link><button type="button" className={styles.exitButton} onClick={onBack}>{uiText("离开比赛房", uiLocale)}</button></div>
      </div>
    </header>
  )
}

function StepRail({ model, activeStep, onSelect }) {
  const uiLocale = useUiLocale()
  const displayActiveStep = normalizeDisplayStepKey(activeStep)
  const activeIndex = model.flowSteps.find(step => step.key === displayActiveStep)?.index || 1

  return (
    <nav
      className={styles.stepRail}
      aria-label={uiText("比赛房间流程", uiLocale)}
      style={{ '--room-step-count': model.flowSteps.length }}
    >
      {model.flowSteps.map(step => {
        const disabled = step.key === MATCH_ROOM_STEP_KEYS.HERO_BAN && !model.heroBanEnabled
        const state = disabled
          ? 'skipped'
          : step.index < activeIndex
            ? 'done'
            : step.key === displayActiveStep
              ? 'current'
              : 'upcoming'
        return (
          <button
            key={step.key}
            type="button"
            className={styles.stepButton}
            data-active={displayActiveStep === step.key ? 'true' : 'false'}
            data-disabled={disabled ? 'true' : 'false'}
            data-state={state}
            disabled={disabled}
            aria-current={step.key === displayActiveStep ? 'step' : undefined}
            onClick={() => onSelect(step.key)}
          >
            <span>{String(step.index).padStart(2, '0')}</span>
            <strong>{step.label}</strong>
            <em>{disabled ? uiText("跳过", uiLocale) : step.meta}</em>
          </button>
        )
      })}
    </nav>
  )
}

function FlowStatusRow({ model, activeStep, onSelect, staff, onOpenStaff }) {
  return (
    <div className={styles.flowStatusRow}>
      <StepRail model={model} activeStep={activeStep} onSelect={onSelect} />
      <StaffPanel staff={staff} onOpen={onOpenStaff} />
    </div>
  )
}

function ParticipantRow({
  participant,
  selected = false,
  lineupRole = ''
}) {
  const uiLocale = useUiLocale()
  const identityType = cleanText(participant.identityType).toUpperCase()
  const activeRole = normalizeRoleName(lineupRole)
  const rosterRole = normalizeRoleName(participant.role)
  const isPlayer = identityType === 'PLAYER'
  const participantKind = isPlayer
    ? 'player'
      : TEAM_ROOM_IDENTITY_TYPES.has(identityType)
        ? 'team-staff'
        : 'match-staff'
  const identityLabel = !isPlayer ? (participant.title || ROOM_IDENTITY_TITLES[identityType] || identityType) : ''
  const isStarter = Boolean(selected && activeRole)
  const displayedRole = isStarter ? activeRole : rosterRole

  return (
    <li
      className={styles.participantRow}
      data-kind={participantKind}
      data-identity={identityType}
      data-current={participant.isCurrentAccount ? 'true' : 'false'}
      data-online={participant.isOnline ? 'true' : 'false'}
      data-captain={participant.isCaptain ? 'true' : 'false'}
      data-roster-role={rosterRole}
      data-selected={selected ? 'true' : 'false'}
      data-lineup-role={activeRole}
    >
      <div>
        <strong>{participant.name}</strong>
        <em title={participant.battleTag || participant.accountLabel || ''}>{participant.battleTag || participant.accountLabel || '-'}</em>
      </div>
      <div className={styles.participantTags}>
        {participant.isCaptain ? <b data-title="captain">{uiText("队长", uiLocale)}</b> : null}
        {identityLabel ? <b data-identity-role={identityType}>{identityLabel}</b> : null}
        {isStarter ? <b data-starter="true">{uiText("首发", uiLocale)}</b> : null}
        {displayedRole ? <b data-roster-role={displayedRole} data-role={displayedRole}>{uiText(getRoleLabel(displayedRole), uiLocale)}</b> : null}
        {participant.isCurrentAccount ? <b data-current="true">{uiText("我", uiLocale)}</b> : null}
        {participant.isOnline ? <b data-online="true">{uiText("在线", uiLocale)}</b> : participant.isCheckedIn ? <b>{uiText("已签到", uiLocale)}</b> : null}
      </div>
    </li>
  )
}

function LineupSlotCard({ slot, team }) {
  const uiLocale = useUiLocale()
  const player = getPlayerByKey(team, slot.playerKey)
  const roleName = normalizeRoleName(slot.role)
  const slotLabel = getLineupSlotDisplayLabel(slot)
  const roleLabel = uiText(getRoleLabel(slot.role), uiLocale)
  const playerIdentity = player ? getPlayerDisplayName(player) : ''
  const playerTitle = player
    ? [player.name, player.battleTag || player.accountLabel].map(cleanText).filter(Boolean).join(' · ')
    : ''

  return (
    <div
      className={styles.lineupSlotCard}
      data-filled={player ? 'true' : 'false'}
      data-role={roleName}
    >
      <div className={styles.lineupSlotCode}>
        <span>{slotLabel}</span>
        <b>{roleLabel}</b>
      </div>
      <div className={styles.lineupSlotBody}>
        <strong data-i18n-ignore title={playerTitle}>
          {playerIdentity || uiText("未选择", uiLocale)}
        </strong>
        {player ? null : <em>{uiText("等待首发锁定", uiLocale)}</em>}
      </div>
    </div>
  )
}

function getTeamPanelState(activeStep, roomPermission, side) {
  const isLineupEditStep = activeStep === MATCH_ROOM_STEP_KEYS.LINEUP_LOCK
  const canEdit = canManageRoomSide(roomPermission, side) && isLineupEditStep
  return {
    canEdit,
    mode: isLineupEditStep ? 'edit' : 'review'
  }
}

function TeamLineupPanel({ team, lineup, roomPermission, activeStep }) {
  const uiLocale = useUiLocale()
  const side = team.side
  const slots = normalizeLineupSlots(lineup?.[side])
  const { mode } = getTeamPanelState(activeStep, roomPermission, side)
  const fullLabel = getTeamFullLabel(team)

  return (
    <aside className={styles.teamLineupPanel} data-side={side} data-mode={mode}>
      <div className={styles.teamPanelHead}>
        <span>{team.side === 'A' ? 'TEAM A' : 'TEAM B'}</span>
        <strong>{team.short}</strong>
        {fullLabel ? <i>{fullLabel}</i> : null}
        <em>{team.captain?.name ? uiText("队长 {0}", uiLocale, [team.captain.name]) : uiText("队长待定", uiLocale)}</em>
        <small>{team.onlineCount || 0}{uiText(" 在线 / ", uiLocale)}{team.checkedInCount || 0}{uiText(" 已签到", uiLocale)}</small>
      </div>
      <section className={styles.sideLineupPanel}>
        <div className={styles.sideLineupHead}>
          <span>{uiText("首发名单", uiLocale)}</span>
          <strong>{LINEUP_SLOT_PATTERN_LABEL}</strong>
        </div>
        <div className={styles.sideLineupSlots}>
          {slots.map((slot, index) => (
            <LineupSlotCard
              key={`${side}-${slot.slot}-${index}`}
              slot={slot}
              team={team}
            />
          ))}
        </div>
      </section>
    </aside>
  )
}

function TeamRosterPanel({ team, lineup, roomPermission, activeStep }) {
  const uiLocale = useUiLocale()
  const side = team.side
  const slots = normalizeLineupSlots(lineup?.[side])
  const { mode } = getTeamPanelState(activeStep, roomPermission, side)
  const playerCount = team.participants.filter(participant => cleanText(participant.identityType).toUpperCase() === 'PLAYER').length
  const rosterCount = team.participants.length

  return (
    <aside
      className={styles.teamRosterPanel}
      data-side={side}
      data-mode={mode}
      data-count={rosterCount}
      data-player-count={playerCount}
    >
      <div className={styles.rosterTitle}>
        <span>{uiText("完整名单", uiLocale)}</span>
        <strong>{rosterCount}</strong>
      </div>
      <ul
        className={styles.participantList}
        data-count={rosterCount}
        data-player-count={playerCount}
        data-overflow={rosterCount > 8 ? 'true' : 'false'}
      >
        {team.participants.length ? (
          team.participants.map(participant => {
            const assignment = getLineupAssignment(slots, participant.key)
            return (
              <ParticipantRow
                key={participant.key}
                participant={participant}
                selected={Boolean(assignment)}
                lineupRole={assignment?.role || ''}
              />
            )
          })
        ) : (
          <li className={styles.emptyRoster}>{uiText("名单待同步", uiLocale)}</li>
        )}
      </ul>
    </aside>
  )
}

function TeamControlPanel({
  team,
  lineup,
  roomPermission,
  activeStep,
  captainTransferState,
  onTransferCaptain
}) {
  const uiLocale = useUiLocale()
  const side = team.side
  const slots = normalizeLineupSlots(lineup?.[side])
  const { mode } = getTeamPanelState(activeStep, roomPermission, side)
  const [transferTarget, setTransferTarget] = useState('')
  const participants = team.participants || []
  const playerCount = participants.filter(participant => cleanText(participant.identityType).toUpperCase() === 'PLAYER').length
  const rosterCount = participants.length
  const fullLabel = getTeamFullLabel(team)
  const canTransferCaptain = canManageRoomSide(roomPermission, side)
  const eligibleCaptainTargets = participants.filter(participant => {
    const identityType = cleanText(participant.identityType).toUpperCase()
    return (identityType === 'MANAGER' || identityType === 'PLAYER') &&
      participant.remoteUserId &&
      !participant.isCaptain
  })
  const transferBusy = Boolean(captainTransferState?.isLoading && captainTransferState?.side === side)

  return (
    <aside
      className={styles.teamControlPanel}
      data-side={side}
      data-mode={mode}
      data-count={rosterCount}
      data-player-count={playerCount}
    >
      <header className={styles.teamControlHeader}>
        <div>
          <span>{side === 'A' ? 'TEAM A' : 'TEAM B'}</span>
          <strong>{fullLabel || team.short}</strong>
          <em>{team.captain?.name ? uiText("队长 {0}", uiLocale, [team.captain.name]) : uiText("队长待定", uiLocale)}</em>
        </div>
        <div className={styles.teamControlMetrics}>
          <b>{team.onlineCount || 0}{uiText(" 在线", uiLocale)}</b>
          <b>{team.checkedInCount || 0}{uiText(" 已签到", uiLocale)}</b>
        </div>
      </header>

      {canTransferCaptain && eligibleCaptainTargets.length ? (
        <div className={styles.captainTransferBar}>
          <label htmlFor={`captain-transfer-${side}`}>{uiText("转交队长", uiLocale)}</label>
          <select
            id={`captain-transfer-${side}`}
            value={transferTarget}
            disabled={transferBusy}
            onChange={event => setTransferTarget(event.target.value)}
          >
            <option value="">{uiText("选择本队经理或选手", uiLocale)}</option>
            {eligibleCaptainTargets.map(participant => (
              <option key={participant.remoteUserId} value={participant.remoteUserId}>
                {participant.name} · {participant.title}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!transferTarget || transferBusy}
            onClick={async () => {
              const transferred = await onTransferCaptain?.(side, transferTarget)
              if (transferred) setTransferTarget('')
            }}
          >
            {transferBusy ? uiText("转交中", uiLocale) : uiText("确认", uiLocale)}
          </button>
        </div>
      ) : null}
      {captainTransferState?.side === side && captainTransferState?.message ? (
        <div className={styles.captainTransferMessage} data-status={captainTransferState.status}>
          {captainTransferState.message}
        </div>
      ) : null}

      <section className={styles.teamControlRoster}>
        <div className={styles.teamControlSectionHead}>
          <span>{uiText("完整名单", uiLocale)}</span>
          <strong>{rosterCount}</strong>
        </div>
        <ul
          className={styles.participantList}
          data-count={rosterCount}
          data-player-count={playerCount}
          data-overflow={rosterCount > 8 ? 'true' : 'false'}
        >
          {participants.length ? (
            participants.map(participant => {
              const assignment = getLineupAssignment(slots, participant.key)
              return (
                <ParticipantRow
                  key={participant.key}
                  participant={participant}
                  selected={Boolean(assignment)}
                  lineupRole={assignment?.role || ''}
                />
              )
            })
          ) : (
            <li className={styles.emptyRoster}>{uiText("名单待同步", uiLocale)}</li>
          )}
        </ul>
      </section>

      <section className={styles.teamControlLineup}>
        <div className={styles.teamControlSectionHead}>
          <span>{uiText("首发名单", uiLocale)}</span>
          <strong>{LINEUP_SLOT_PATTERN_LABEL}</strong>
        </div>
        <div className={styles.sideLineupSlots}>
          {slots.map((slot, index) => (
            <LineupSlotCard
              key={`${side}-${slot.slot}-${index}`}
              slot={slot}
              team={team}
            />
          ))}
        </div>
      </section>
    </aside>
  )
}

function StaffPanelBody({ staff }) {
  const uiLocale = useUiLocale()
  const people = staff?.people || []
  const hasReferee = Boolean(staff?.refereeCount)
  const statusLabel = people.length
    ? hasReferee
      ? `${people.length} 人 / ${staff.onlineCount || 0} 在线 / ${staff.checkedInCount || 0} 已签到`
      : `${people.length} 人 / 无当值赛管`
    : '无当值赛管 / 队长自助'

  return (
    <section className={styles.staffPanel} data-mode={hasReferee ? 'staffed' : 'self-service'}>
      <div className={styles.staffPanelHead}>
        <div>
          <span>MATCH STAFF</span>
          <strong>{uiText("赛事人员", uiLocale)}</strong>
        </div>
        <small>{statusLabel}</small>
      </div>
      {people.length ? (
        <ul className={styles.staffList}>
          {people.map(participant => (
            <ParticipantRow key={participant.key} participant={participant} />
          ))}
        </ul>
      ) : null}
      {!hasReferee ? (
        <p className={styles.staffPanelNotice}>{uiText("无当值赛管时，双方队长按流程自助推进；迟到、人数不足或争议情况需保留截图后提交赛务。", uiLocale)}</p>
      ) : null}
    </section>
  )
}

function getStaffPermissionNote(identityType) {
  return STAFF_PERMISSION_NOTES[cleanText(identityType).toUpperCase()] || STAFF_PERMISSION_NOTES.DEFAULT
}

function getStaffStatusLabel(participant) {
  if (participant?.isOnline) return '在线'
  if (participant?.isCheckedIn) return '已签到'
  return '未进入'
}

function StaffPanelHead({ statusLabel }) {
  const uiLocale = useUiLocale()
  return (
    <div className={styles.staffPanelHead}>
      <div>
        <span>MATCH STAFF</span>
        <strong>{uiText("赛事人员", uiLocale)}</strong>
      </div>
      <small>{statusLabel}</small>
    </div>
  )
}

function StaffDetailRow({ participant }) {
  const uiLocale = useUiLocale()
  const identityType = cleanText(participant.identityType).toUpperCase()
  const permission = getStaffPermissionNote(identityType)
  const battleTag = cleanText(participant.battleTag)
  const accountLabel = cleanText(participant.accountLabel)

  return (
    <li className={styles.staffDetailRow} data-identity={identityType} data-online={participant.isOnline ? 'true' : 'false'}>
      <div className={styles.staffDetailMain}>
        <span>{participant.title || ROOM_IDENTITY_TITLES[identityType] || permission.title}</span>
        <strong>{participant.name || permission.title}</strong>
        <em>{getStaffStatusLabel(participant)}</em>
      </div>
      <dl className={styles.staffDetailMeta}>
        <div>
          <dt>{uiText("战网 ID", uiLocale)}</dt>
          <dd title={battleTag || '-'}>{battleTag || '-'}</dd>
        </div>
        <div>
          <dt>{uiText("账号", uiLocale)}</dt>
          <dd title={accountLabel || '-'}>{accountLabel || '-'}</dd>
        </div>
      </dl>
      <p>{permission.summary}</p>
    </li>
  )
}

function StaffModal({ staff, onClose }) {
  const uiLocale = useUiLocale()
  const people = staff?.people || []
  const groups = [
    {
      key: 'REFEREE',
      title: uiText("赛管", uiLocale),
      people: people.filter(participant => cleanText(participant.identityType).toUpperCase() === 'REFEREE')
    },
    {
      key: 'CASTER',
      title: uiText("解说", uiLocale),
      people: people.filter(participant => cleanText(participant.identityType).toUpperCase() === 'CASTER')
    },
    {
      key: 'OTHER',
      title: uiText("其他赛事人员", uiLocale),
      people: people.filter(participant => !['REFEREE', 'CASTER'].includes(cleanText(participant.identityType).toUpperCase()))
    }
  ].filter(group => group.people.length)

  useEffect(() => {
    const handleKeyDown = event => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div className={styles.staffModalBackdrop} role="dialog" aria-modal="true" aria-labelledby="match-room-staff-title" onClick={onClose}>
      <section className={styles.staffModal} onClick={event => event.stopPropagation()}>
        <header className={styles.staffModalHeader}>
          <div>
            <span>MATCH STAFF</span>
            <h2 id="match-room-staff-title">{uiText("赛事人员", uiLocale)}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label={uiText("关闭赛事人员弹窗", uiLocale)}>×</button>
        </header>

        <div className={styles.staffModalSummary}>
          <strong>{people.length || 0}</strong>
          <span>{staff?.onlineCount || 0}{uiText(" 在线 / ", uiLocale)}{staff?.checkedInCount || 0}{uiText(" 已签到", uiLocale)}</span>
          <em>{staff?.refereeCount ? uiText("{0} 名赛管", uiLocale, [staff.refereeCount]) : uiText("无当值赛管", uiLocale)}</em>
        </div>

        <div className={styles.staffPermissionGrid}>
          {['REFEREE', 'CASTER'].map(type => {
            const permission = getStaffPermissionNote(type)
            return (
              <article key={type} data-identity={type}>
                <span>{permission.title}</span>
                <strong>{permission.summary}</strong>
                <p>{permission.detail}</p>
              </article>
            )
          })}
        </div>

        {groups.length ? (
          <div className={styles.staffGroupList}>
            {groups.map(group => (
              <section key={group.key} className={styles.staffGroup}>
                <header>
                  <span>{group.title}</span>
                  <strong>{group.people.length}</strong>
                </header>
                <ul>
                  {group.people.map(participant => (
                    <StaffDetailRow key={participant.key} participant={participant} />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        ) : (
          <div className={styles.staffModalEmpty}>{uiText("当前没有登记的赛事人员。无当值赛管时，双方队长按流程自助推进；迟到、人数不足或争议情况需要保留截图后提交赛事方。", uiLocale)}</div>
        )}
      </section>
    </div>
  )
}

function StaffPanel({ staff, onOpen }) {
  const uiLocale = useUiLocale()
  const people = staff?.people || []
  const hasReferee = Boolean(staff?.refereeCount)
  const statusLabel = people.length
    ? hasReferee
      ? `${people.length} 人 / ${staff.onlineCount || 0} 在线 / ${staff.checkedInCount || 0} 已签到`
      : `${people.length} 人 / 无当值赛管`
    : '无当值赛管 / 队长自助'

  if (!onOpen) return <StaffPanelBody staff={staff} />

  return (
    <button
      type="button"
      className={`${styles.staffPanel} ${styles.staffPanelButton}`}
      data-mode={hasReferee ? 'staffed' : 'self-service'}
      onClick={onOpen}
      aria-haspopup="dialog"
      aria-label={uiText("查看进入房间的赛事人员", uiLocale)}
    >
      <StaffPanelHead statusLabel={statusLabel} />
    </button>
  )
}

function getSeriesMapSlots(remoteRoom) {
  const maps = [...(remoteRoom?.room?.maps || [])]
    .sort((a, b) => Number(a.mapOrder || 0) - Number(b.mapOrder || 0))
  const currentOrder = Number(remoteRoom?.room?.currentMapOrder || maps[0]?.mapOrder || 1)
  const maxPlayedOrder = maps.reduce((max, map) => Math.max(max, Number(map.mapOrder || 0)), 0)
  const slotCount = Math.max(currentOrder, maxPlayedOrder, 1)

  return Array.from({ length: slotCount }, (_, index) => {
    const mapOrder = index + 1
    return maps.find(map => Number(map.mapOrder || 0) === mapOrder) || {
      mapOrder,
      status: 'PENDING'
    }
  })
}

function getMapBanLabel(map, side, locale) {
  const ban = normalizeHeroBanSide(getHeroBanForSide(map, side))
  if (ban.hero) return formatOwHeroName(ban.hero, locale)
  if (ban.isPass) return '空 BAN'
  return '待定'
}

function mapStatusLabel(status) {
  return { PENDING: '尚未开始', MAP_PICK: '选择地图', LINEUP_LOCK: '确认首发', HERO_BAN: '英雄禁用', READY_CHECK: '赛前确认', IN_GAME: '比赛进行中', MAP_RESULT_CONFIRM: '等待比分确认', COMPLETE: '已完成' }[status] || '等待更新'
}

function SeriesStatusBar({ model, remoteRoom, activeStep, locale }) {
  const displayStepKey = normalizeDisplayStepKey(activeStep)
  const currentStep = model.flowSteps.find(step => step.key === displayStepKey) || model.flowSteps[0]
  const score = getSeriesScore(remoteRoom)
  const maps = getSeriesMapSlots(remoteRoom)
  const currentOrder = Number(remoteRoom?.room?.currentMapOrder || 1)

  return (
    <section className={styles.seriesStatusBar}>
      <div className={styles.seriesScoreChip}>
        <span>SERIES</span>
        <strong>{model.teamA.short} {score.A}:{score.B} {model.teamB.short}</strong>
        <em>{model.scheduleLabel} / {model.format} / {String(currentStep.index).padStart(2, '0')} {currentStep.label}</em>
      </div>
      <div className={styles.seriesMapRail}>
        {maps.map(map => {
          const order = Number(map.mapOrder || 1)
          const winnerSide = map.isDraw ? 'DRAW' : normalizeRoomSide(map.winnerSide)
          const winnerLabel = winnerSide === 'A'
            ? model.teamA.short
            : winnerSide === 'B'
              ? model.teamB.short
              : winnerSide === 'DRAW'
                ? 'DRAW'
                : order === currentOrder
                  ? 'LIVE'
                  : 'PENDING'
          const scoreLabel = map.scoreA !== undefined || map.scoreB !== undefined
            ? `${map.scoreA ?? '-'}:${map.scoreB ?? '-'}`
            : mapStatusLabel(map.status)
          const firstSide = normalizeRoomSide(map.heroBans?.firstSide || map.heroBans?.first_side)
          const secondSide = firstSide ? getOppositeRoomSide(firstSide) : ''
          const firstTeam = firstSide === 'A' ? model.teamA.short : firstSide === 'B' ? model.teamB.short : '-'
          const secondTeam = secondSide === 'A' ? model.teamA.short : secondSide === 'B' ? model.teamB.short : '-'

          return (
            <article
              key={`series-map-${order}`}
              className={styles.seriesMapCard}
              data-current={order === currentOrder ? 'true' : 'false'}
              data-winner={winnerSide || 'NONE'}
            >
              <div>
                <span>MAP {String(order).padStart(2, '0')}</span>
                <strong>{map.mapName || uiText("待定地图", locale)}</strong>
                <em>{formatOwMapMode(map.mapType, locale) || uiText("地图", locale)} / {scoreLabel}</em>
              </div>
              <dl>
                <dt>HERO BAN</dt>
                <dd>{firstSide ? `${firstTeam} → ${secondTeam}` : uiText("待定", locale)}</dd>
                <dt>BAN</dt>
                <dd>{model.teamA.short} {getMapBanLabel(map, 'A', locale)} / {model.teamB.short} {getMapBanLabel(map, 'B', locale)}</dd>
              </dl>
              <b>{winnerLabel}</b>
            </article>
          )
        })}
      </div>
    </section>
  )
}

function PermissionNotice({ roomPermission }) {
  const uiLocale = useUiLocale()
  if (roomPermission?.canManageFlow) return null

  return (
    <div className={styles.permissionNotice}>
      <span>{uiText("权限", uiLocale)}</span>
      <strong>{roomPermission?.label || uiText("仅队长 / 赛管可操作", uiLocale)}</strong>
    </div>
  )
}

export function GameReturnPanel({
  model,
  remoteRoom,
  remoteMap,
  roomPermission,
  actionState,
  onMoveToMapResultConfirm,
  locale
}) {
  const isBusy = Boolean(actionState?.isLoading)
  const mapOrder = Number(remoteMap?.mapOrder || remoteRoom?.room?.currentMapOrder || 1)
  const mapName = cleanText(remoteMap?.mapName) || '待定地图'
  const mapType = cleanText(remoteMap?.mapType) || 'MAP'
  const mapMode = getMapModeByName(mapName) || getMapModeByType(mapType)
  const mapImageName = getOwMapImageName(mapName)
  const mapImageSrc = mapMode && mapImageName && mapImageName !== 'unknown'
    ? getMapImageSrc({ mode: mapMode, imageName: mapImageName })
    : ''
  const seriesScore = getSeriesScore(remoteRoom)
  const targetWins = getTargetWins(remoteRoom, model)
  const pickerSide = normalizeRoomSide(remoteMap?.pickerSide || remoteMap?.picker_side)
  const attackSide = normalizeRoomSide(remoteMap?.attackSide || remoteMap?.attack_side)
  const defenseSide = normalizeRoomSide(remoteMap?.defenseSide || remoteMap?.defense_side)
  const pickerLabel = getMapSideChoiceLabel(pickerSide, model) || '赛事方'
  const attackLabel = getMapSideChoiceLabel(attackSide, model)
  const defenseLabel = getMapSideChoiceLabel(defenseSide, model)
  const rawBanA = normalizeHeroBanSide(getHeroBanForSide(remoteMap, 'A'))
  const rawBanB = normalizeHeroBanSide(getHeroBanForSide(remoteMap, 'B'))
  const banA = getMapBanLabel(remoteMap, 'A', locale)
  const banB = getMapBanLabel(remoteMap, 'B', locale)
  const canManage = Boolean(roomPermission?.canManageFlow)
  const sideSetupLabel = attackLabel
    ? `${attackLabel} 攻${defenseLabel ? ` / ${defenseLabel} 防` : ''}`
    : '无需攻防'
  const heroBanLabel = model.heroBanEnabled
    ? `${model.teamA.short} ${banA} / ${model.teamB.short} ${banB}`
    : '跳过'
  const heroBanItems = model.heroBanEnabled
    ? [
        {
          side: model.teamA.short,
          value: banA || '待定',
          avatar: rawBanA.hero ? getBanPortraitSrc(rawBanA.hero, rawBanA.role) : '',
          state: rawBanA.isPass || rawBanA.timeout ? 'pass' : rawBanA.hero ? 'locked' : 'pending'
        },
        {
          side: model.teamB.short,
          value: banB || '待定',
          avatar: rawBanB.hero ? getBanPortraitSrc(rawBanB.hero, rawBanB.role) : '',
          state: rawBanB.isPass || rawBanB.timeout ? 'pass' : rawBanB.hero ? 'locked' : 'pending'
        }
      ]
    : []
  const fallbackDefenseSide = attackSide === 'A' ? 'B' : 'A'
  const gameLeftSide = attackSide ? (defenseSide && defenseSide !== attackSide ? defenseSide : fallbackDefenseSide) : 'A'
  const gameRightSide = attackSide || 'B'
  const liveLineups = [
    {
      gameSide: 'left',
      positionLabel: '游戏左侧',
      sideStatus: attackSide ? '防守' : '左侧',
      side: gameLeftSide,
      team: gameLeftSide === 'B' ? model.teamB : model.teamA,
      rows: normalizeLineupSlots(getLineupForRemoteMap(remoteRoom, remoteMap, gameLeftSide))
    },
    {
      gameSide: 'right',
      positionLabel: '游戏右侧',
      sideStatus: attackSide ? '先攻' : '右侧',
      side: gameRightSide,
      team: gameRightSide === 'B' ? model.teamB : model.teamA,
      rows: normalizeLineupSlots(getLineupForRemoteMap(remoteRoom, remoteMap, gameRightSide))
    }
  ]
  const stageTitle = '比赛进行'
  const stageKicker = 'LIVE'
  const heroTitle = 'IN GAME'
  const heroHeadline = '返回游戏内'
  const heroStatus = '网页设置已锁定，不再更改'
  const heroDetail = '按下方本图设置完成游戏内配置；本图结束后回网页确认地图小分。'
  const mapHeroStyle = mapImageSrc
    ? { '--game-return-map-image': `url("${mapImageSrc}")` }
    : undefined
  const lockedFacts = [
    { label: uiText("地图", locale), value: mapName, meta: formatOwMapMode(mapType, locale), image: mapImageSrc, kind: 'map' },
    { label: uiText("选图方", locale), value: pickerLabel, kind: 'picker' },
    { label: uiText("攻防", locale), value: sideSetupLabel, kind: 'side' },
    { label: 'HERO BAN', value: heroBanLabel, items: heroBanItems, kind: 'hero-ban' }
  ]

  return (
    <section className={`${styles.workspaceSection} ${styles.gameReturnStage}`} data-mode="live">
      <div className={styles.sectionHead}>
        <span>{stageKicker}</span>
        <h2>{stageTitle}</h2>
        <em>MAP {String(mapOrder).padStart(2, '0')}</em>
      </div>

      <div className={styles.gameReturnPanel}>
        <article className={styles.gameReturnHero} style={mapHeroStyle}>
          <span>{heroTitle}</span>
          <strong>{heroHeadline}</strong>
          <em>{heroStatus}</em>
          <p>{heroDetail}</p>
        </article>

        <article className={styles.gameReturnSeries}>
          <span>SERIES</span>
          <strong>{seriesScore.A}:{seriesScore.B}</strong>
          <em>{model.teamA.short} vs {model.teamB.short} · FT{targetWins}</em>
        </article>

        <div className={styles.gameReturnLockStrip}>
          <article className={styles.gameReturnLockTitle}>
            <span>LOCKED</span>
            <strong>{uiText("本图设置", locale)}</strong>
            <em>{uiText("回游戏内按此执行", locale)}</em>
          </article>
          {lockedFacts.map(fact => (
            <article key={fact.label} className={styles.gameReturnLockFact} data-kind={fact.kind}>
              <span>{fact.label}</span>
              {fact.items?.length ? (
                <div className={styles.gameReturnHeroBanList}>
                  {fact.items.map(item => (
                    <div key={item.side} data-state={item.state}>
                      <b>{item.side}</b>
                      {item.avatar ? (
                        <img src={item.avatar} alt="" loading="lazy" />
                      ) : (
                        <i>{item.state === 'pass' ? '—' : '?'}</i>
                      )}
                      <strong>{item.value}</strong>
                    </div>
                  ))}
                </div>
              ) : fact.image ? (
                <div className={styles.gameReturnMapFact}>
                  <img src={fact.image} alt="" loading="lazy" />
                  <div>
                    <strong>{fact.value}</strong>
                    {fact.meta ? <em>{fact.meta}</em> : null}
                  </div>
                </div>
              ) : (
                <>
                  <strong>{fact.value}</strong>
                  {fact.meta ? <em>{fact.meta}</em> : null}
                </>
              )}
            </article>
          ))}
        </div>

        <div className={styles.gameReturnLiveDetail}>
          <article className={styles.gameReturnLineupBoard}>
            <header>
              <span>STARTING FIVE</span>
              <strong>{uiText("本图上场五人 · 右侧先攻", locale)}</strong>
            </header>
            <div className={styles.gameReturnLineupSides}>
              {liveLineups.map(lineup => (
                <section key={lineup.gameSide} data-game-side={lineup.gameSide}>
                  <div className={styles.gameReturnLineupTeam}>
                    <span>{lineup.positionLabel}</span>
                    <strong>{lineup.team.short}</strong>
                    <em>{lineup.sideStatus}</em>
                  </div>
                  <ol>
                    {lineup.rows.map((slot, index) => {
                      const player = getPlayerByKey(lineup.team, slot.playerKey)
                      const battleTag = player
                        ? cleanText(player.battleTag || player.accountLabel) || '战网 ID 待同步'
                        : '待定'
                      const roleName = normalizeRoleName(slot.role)
                      return (
                        <li key={`${lineup.side}-${slot.slot}-${index}`} data-role={roleName}>
                          <div className={styles.gameReturnLineupRole}>
                            <b>{uiText(getRoleLabel(slot.role), locale)}</b>
                          </div>
                          <div>
                            <strong title={battleTag}>{battleTag}</strong>
                          </div>
                        </li>
                      )
                    })}
                  </ol>
                </section>
              ))}
            </div>
          </article>
        </div>

        <div className={styles.gameReturnFooter}>
          <div>
            <span>{uiText("比赛结束后", locale)}</span>
            <strong>{uiText("双方回到网页确认地图小分", locale)}</strong>
          </div>
          <button
            type="button"
            disabled={isBusy || !canManage}
            onClick={onMoveToMapResultConfirm}
          >
            {isBusy ? uiText("同步中", locale) : uiText("进入地图确认", locale)}
          </button>
        </div>
      </div>

      {actionState.message ? (
        <div className={styles.confirmMessage} data-status={actionState.status}>
          {actionState.message}
        </div>
      ) : null}
      <PermissionNotice roomPermission={roomPermission} />
    </section>
  )
}

function TimerPill({ timer }) {
  const uiLocale = useUiLocale()
  if (!timer) return null

  return (
    <div
      className={styles.timerPill}
      data-expired={timer.expired ? 'true' : 'false'}
      data-unsynced={timer.isSynced ? 'false' : 'true'}
    >
      <span>{timer.label}</span>
      <strong>{timer.expired ? uiText("超时", uiLocale) : formatDurationSeconds(timer.remaining)}</strong>
      {!timer.isSynced ? <em>{uiText("本地计时", uiLocale)}</em> : null}
    </div>
  )
}

export function LobbyPanel({ model, now, remoteRoom, roomPermission, actionState, onStartMapPick, staff }) {
  const uiLocale = useUiLocale()
  const [copyState, setCopyState] = useState('idle')
  const startTimestamp = getMatchStartTimestamp(model)
  const targetWinsValue = Number(model.targetWins || 2)
  const targetWins = Number.isFinite(targetWinsValue) && targetWinsValue > 0 ? targetWinsValue : 2
  const maxForfeitMinutes = targetWins * MAP_FORFEIT_INTERVAL_MINUTES
  const lateStatus = getLateStatus(startTimestamp, now, targetWins)
  const isAfterScheduledStart = Boolean(startTimestamp && now >= startTimestamp)
  const hasReferee = Boolean(staff?.refereeCount)
  const checkActorLabel = hasReferee ? '赛管' : '双方队长'
  const confirmActorLabel = hasReferee ? '赛管确认' : '双方队长确认'
  const rulingOwnerLabel = hasReferee ? '赛管人工确认' : '双方队长留证'
  const rulingTimeLabel = hasReferee ? '赛管裁量时间' : '双方队长确认时间'
  const roomState = remoteRoom?.room?.state || {}
  const rulingState = remoteRoom?.room?.ruling || roomState.ruling || {}
  const rulingText = [
    rulingState.status,
    rulingState.reason,
    rulingState.type,
    rulingState.side,
    roomState.attendanceStatus,
    roomState.presenceStatus,
    roomState.lateStatus,
    roomState.forfeitStatus
  ].map(cleanText).join(' ').toLowerCase()
  const hasReportedAttendanceIssue = Boolean(
    rulingState.active ||
    rulingState.isActive ||
    rulingState.hasShortage ||
    rulingState.shortage ||
    rulingState.forfeitSide ||
    roomState.lateRulingActive ||
    roomState.attendanceIssue ||
    roomState.shortageSide ||
    roomState.forfeitSide ||
    /late|shortage|forfeit|absence|absent|迟到|不足|弃权/.test(rulingText)
  )
  const shouldShowPenaltyDetails = hasReportedAttendanceIssue
  const visibleStatus = (() => {
    if (!startTimestamp) {
      return {
        ...lateStatus,
        label: uiText("等待开赛时间", uiLocale),
        detail: hasReferee
          ? '同步赛程后显示迟到判定节点；赛管可按现场情况调整口径。'
          : '同步赛程后显示迟到判定节点；无当值赛管时由双方队长自助推进。'
      }
    }
    if (!isAfterScheduledStart) {
      return {
        ...lateStatus,
        detail: '提醒双方进入自定义房，核对首发、席位、服务器和观战人员。'
      }
    }
    if (lateStatus.status === 'critical' && hasReportedAttendanceIssue) {
      return {
        ...lateStatus,
        label: `${lateStatus.label} · ${confirmActorLabel}`,
        detail: '异常已标记，查看下方迟到规则。'
      }
    }
    if (lateStatus.status === 'critical') {
      return {
        ...lateStatus,
        status: 'warning',
        label: uiText("已过判定时间", uiLocale),
        detail: `等待${checkActorLabel}核对。`
      }
    }
    return {
      ...lateStatus,
      label: uiText("开赛时间已到", uiLocale),
      detail: `等待${checkActorLabel}确认。`
    }
  })()
  const canManage = Boolean(roomPermission?.canManageFlow)
  const isBusy = Boolean(actionState?.isLoading)
  const customRoomCode = getRoomSetupCode(remoteRoom, model)
  const customRoomCodeLabel = customRoomCode || (hasReferee ? '待赛管发布' : '待队长发布')
  const copyButtonLabel = copyState === 'copied'
    ? '已复制'
    : copyState === 'error'
      ? '复制失败'
      : '复制代码'
  const scheduleText = startTimestamp
    ? formatRoomClock(startTimestamp, { withDate: true, withSeconds: false })
    : model.scheduleLabel || '-'
  const elapsedMinutes = startTimestamp ? Math.max(0, Math.floor((now - startTimestamp) / 60000)) : 0
  const forfeitableMaps = startTimestamp ? Math.min(targetWins, Math.floor(elapsedMinutes / MAP_FORFEIT_INTERVAL_MINUTES)) : 0
  const penaltySteps = Array.from({ length: targetWins }, (_, index) => {
    const minute = (index + 1) * MAP_FORFEIT_INTERVAL_MINUTES
    const state = index < forfeitableMaps
      ? 'done'
      : index === forfeitableMaps && startTimestamp && now >= startTimestamp
        ? 'active'
        : 'pending'
    return { index: index + 1, minute, state }
  })
  const handleCopyCustomRoomCode = async () => {
    if (!customRoomCode) return

    try {
      await copyTextToClipboard(customRoomCode)
      setCopyState('copied')
    } catch {
      setCopyState('error')
    }

    if (typeof window !== 'undefined') {
      window.setTimeout(() => setCopyState('idle'), 1600)
    }
  }

  return (
    <section className={styles.workspaceSection}>
      <div className={styles.controlStageHeader}>
        <div className={styles.controlStageTitle}>
          <span>ROOM CHECK-IN</span>
          <h2>{uiText("赛前集合", uiLocale)}</h2>
          <em>Match Control Room</em>
        </div>
        <div className={styles.controlStageMeta}>
          <span>{uiText("开赛时间", uiLocale)}</span>
          <strong>{scheduleText}</strong>
          <em>{model.formatLabel || `FT${targetWins}`}</em>
        </div>
      </div>

      <div
        className={styles.roomControlPanel}
        data-status={visibleStatus.status}
        data-penalty-mode={shouldShowPenaltyDetails ? 'detailed' : 'compact'}
      >
        <div className={styles.controlStatusGrid}>
          <article className={styles.controlStatusCard} data-kind="clock">
            <span>LOCAL CLOCK</span>
            <strong>{formatRoomClock(now)}</strong>
            <em>{uiText("所有倒计时以本地时间显示", uiLocale)}</em>
          </article>

          <article className={styles.controlStatusCard} data-kind="code">
            <span>CUSTOM GAME CODE</span>
            <strong data-empty={customRoomCode ? 'false' : 'true'}>{customRoomCodeLabel}</strong>
            <em>{uiText("自定义房导入代码", uiLocale)}</em>
          </article>

          <article className={styles.controlStatusCard} data-kind="ruling">
            <span>{visibleStatus.status === 'critical' ? 'RULING WINDOW' : 'CHECK-IN NOTE'}</span>
            <strong>{visibleStatus.label}</strong>
            <em>{visibleStatus.detail}</em>
          </article>
        </div>

        <div className={styles.roomOpsGrid}>
          {CUSTOM_ROOM_CHECK_GROUPS.map(group => (
            <section key={group.key} className={styles.controlChecklistGroup} data-kind={group.key}>
              <div className={styles.controlChecklistHead}>
                <span>{group.meta}</span>
                <strong>{group.label}</strong>
              </div>
              <dl>
                {group.items.map(item => (
                  <div key={item.label}>
                    <dt>{item.label}</dt>
                    <dd>{item.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>

        <div className={styles.nextActionPanel}>
          <div className={styles.nextActionCopy}>
            <span>NEXT ACTION</span>
            <strong>{uiText("开始地图选择", uiLocale)}</strong>
            <em>{uiText("确认双方已进自定义房、名单和房间设置无误后进入地图选择阶段。", uiLocale)}</em>
          </div>
          <button
            className={styles.primaryControlButton}
            type="button"
            disabled={isBusy || !canManage}
            onClick={onStartMapPick}
          >
            {isBusy ? uiText("同步中", uiLocale) : uiText("开始地图选择", uiLocale)}
          </button>
          <div className={styles.secondaryActionGrid}>
            {CUSTOM_ROOM_STEPS.map((step, index) => (
              <span key={step}>
                <b>{String(index + 1).padStart(2, '0')}</b>
                {step}
              </span>
            ))}
            <button
              className={styles.secondaryControlButton}
              type="button"
              disabled={!customRoomCode}
              onClick={handleCopyCustomRoomCode}
            >
              {copyButtonLabel}
            </button>
          </div>
        </div>

        <div className={styles.lobbyPenaltyPanel} data-mode={shouldShowPenaltyDetails ? 'detailed' : 'compact'}>
          <div className={styles.lobbyPenaltyCopy} data-tone={shouldShowPenaltyDetails ? 'alert' : 'quiet'}>
            <span>LATE RULING</span>
            <strong>
              <b>{shouldShowPenaltyDetails ? uiText("不足 5 人", uiLocale) : uiText("迟到规则", uiLocale)}</b>
              <i>{rulingOwnerLabel}</i>
            </strong>
            <em>
              {shouldShowPenaltyDetails
                ? uiText("每 {0} 分钟不足 5 人 = 1 地图负；FT{1} 理论 {2}' 结束比赛。", uiLocale, [MAP_FORFEIT_INTERVAL_MINUTES, targetWins, maxForfeitMinutes])
                : uiText("仅在迟到或人数不足时启用；以游戏房状态、{0}和带系统时间截图为准。", uiLocale, [confirmActorLabel])}
            </em>
          </div>
          {shouldShowPenaltyDetails ? (
            <>
              <div className={styles.lobbyPenaltyTrack}>
                {penaltySteps.map(step => (
                  <div key={step.index} className={styles.lobbyPenaltyStep} data-state={step.state}>
                    <span>MAP {String(step.index).padStart(2, '0')}</span>
                    <strong>+{step.minute}'</strong>
                    <em>{step.index === targetWins ? uiText("结束线", uiLocale) : uiText("当前地图负", uiLocale)}</em>
                  </div>
                ))}
              </div>
              <p className={styles.lobbyPenaltyNote}>{uiText("单方不足 5 人可判该方弃权；双方均不足 5 人则双方弃权。判定以游戏内人数、", uiLocale)}{rulingTimeLabel}{uiText("和截图留证为准。", uiLocale)}</p>
            </>
          ) : null}
        </div>

        <section className={styles.lobbyFlowPanel} aria-label={uiText("比赛流程时间限制", uiLocale)}>
          <div className={styles.lobbyFlowHead}>
            <span>MATCH FLOW</span>
            <strong>{uiText("比赛流程", uiLocale)}</strong>
          </div>
          <div className={styles.lobbyFlowTrack}>
            {MATCH_FLOW_LIMITS.map((item, index) => (
              <div key={item.stage} className={styles.lobbyFlowStep}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <strong>{item.stage}</strong>
                <em>{item.limit}</em>
              </div>
            ))}
          </div>
        </section>
      </div>

      {actionState?.message ? (
        <div className={styles.confirmMessage} data-status={actionState.status}>
          {actionState.message}
        </div>
      ) : null}
    </section>
  )
}

export function MapPickPanel({ mapDraft, setMapDraft, model, remoteRoom, remoteMap, locale, roomPermission, actionState, onLockMap, timer }) {
  const isBusy = Boolean(actionState?.isLoading)
  const currentMapOrder = remoteRoom?.room?.currentMapOrder || remoteMap?.mapOrder || 1
  const usedMaps = getUsedRoomMaps(remoteRoom, currentMapOrder)
  const usedMapKeys = new Set(usedMaps.map(map => map.mapNameKey).filter(Boolean))
  const mapPickRule = getMapPickRule(model, currentMapOrder, locale)
  const displayMapName = mapPickRule?.lockedMap?.name || mapDraft.name || ''
  const displayMapType = mapPickRule?.lockedMap?.type || mapDraft.type || ''
  const pickerSideValue = mapPickRule?.fixedPickerSide ? mapPickRule.pickerSide : mapDraft.pickerSide
  const canConfirmOrganizerMap = Boolean(
    mapPickRule?.lockedMapId &&
    !pickerSideValue &&
    canManageRoomSide(roomPermission, 'A')
  )
  const canManage = mapPickRule?.lockedMapId && !pickerSideValue
    ? Boolean(roomPermission?.canManageAll || canConfirmOrganizerMap)
    : pickerSideValue
      ? canManageRoomSide(roomPermission, pickerSideValue)
      : Boolean(roomPermission?.canManageAll)
  const pickerSideLabel = pickerSideValue === 'A'
    ? model.teamA.short
    : pickerSideValue === 'B'
      ? model.teamB.short
      : '赛事方'
  const selectedMapKey = getMapNameKey(displayMapName)
  const selectedModeKey = getMapModeByType(displayMapType) || getMapModeByName(displayMapName)
  const needsSideChoice = SIDE_CHOICE_MODES.has(selectedModeKey)
  const mapPoolKey = getMatchMapPoolKey(model, remoteRoom)
  const mapPool = getMapPool(locale, mapPoolKey)
  const mapPoolMeta = getMapPoolMeta(mapPoolKey, locale)
  const activeUsedModeKeys = getActiveMapTypeKeys(usedMaps, mapPool)
  const showPickerControls = !mapPickRule?.lockedMapId || Boolean(mapPickRule?.pickerSide)
  const ruleTags = getMapRuleTags(currentMapOrder, mapPickRule)
  const attackSideLabel = getMapSideChoiceLabel(mapDraft.attackSide, model)
  const mapPoolLabel = mapPoolMeta.label.replace(/地图池$/, '')
  const mapPickLabel = mapPickRule?.badge || mapPickRule?.label || `${pickerSideLabel} 选择`
  const lockHint = displayMapName
    ? needsSideChoice && !attackSideLabel
      ? '选择先攻方后锁定地图。'
      : `确认 ${displayMapName} 后进入首发锁定。`
    : '请选择地图后锁定。'

  return (
    <section className={`${styles.workspaceSection} ${styles.mapPickWorkspace}`}>
      <div className={styles.sectionHead}>
        <span>MAP PICK</span>
        <h2>{uiText("地图选择", locale)}</h2>
        <em>MAP {String(currentMapOrder).padStart(2, '0')}</em>
      </div>
      <div className={styles.mapPickShell}>
        <div className={styles.mapPickOverview}>
          <div className={styles.mapPickCurrentPlate} data-locked={mapPickRule?.lockedMapId ? 'true' : 'false'}>
            <span>CURRENT PICK</span>
            <strong>{displayMapName || uiText("未选择地图", locale)}</strong>
            <em>{displayMapType || uiText("等待选择", locale)} / {mapPickLabel}</em>
          </div>
          <div className={styles.mapPickFacts}>
            <span>
              <b>{uiText("选择方", locale)}</b>
              <strong>{pickerSideLabel}</strong>
            </span>
            <span>
              <b>{uiText("规则", locale)}</b>
              <strong>{mapPickRule?.label || (currentMapOrder === 1 ? uiText("首图选择", locale) : uiText("败方选图", locale))}</strong>
            </span>
            <span>
              <b>{uiText("地图池", locale)}</b>
              <strong>{mapPoolLabel}</strong>
            </span>
          </div>
          {showPickerControls ? (
            <div className={styles.mapPickControls}>
              <TimerPill timer={timer} />
              <label>
                <span>{uiText("选择方", locale)}</span>
                <select
                  value={pickerSideValue}
                  disabled={mapPickRule?.fixedPickerSide || !roomPermission?.canManageAll || isBusy}
                  onChange={event => setMapDraft({ ...mapDraft, pickerSide: event.target.value })}
                >
                  <option value="">{uiText("赛事方", locale)}</option>
                  <option value="A">{model.teamA.short}</option>
                  <option value="B">{model.teamB.short}</option>
                </select>
              </label>
              {needsSideChoice ? (
                <label>
                  <span>{uiText("先攻方", locale)}</span>
                  <select
                    value={mapDraft.attackSide || ''}
                    disabled={!canManage || isBusy}
                    onChange={event => setMapDraft({ ...mapDraft, attackSide: event.target.value })}
                  >
                    <option value="">{uiText("未选择", locale)}</option>
                    <option value="A">{model.teamA.short}{uiText(" 先攻", locale)}</option>
                    <option value="B">{model.teamB.short}{uiText(" 先攻", locale)}</option>
                  </select>
                </label>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className={styles.mapPool}>
          {mapPool.map(group => {
            const typeUsed = activeUsedModeKeys.has(group.mode)
            return (
              <section key={group.mode} className={styles.mapPoolGroup} data-used={typeUsed ? 'true' : 'false'}>
                <div className={styles.mapPoolHead}>
                  <span>{group.label}</span>
                  <strong>{group.maps.length}</strong>
                </div>
                <div className={styles.mapPoolGrid} data-count={group.maps.length}>
                  {group.maps.map(map => {
                    const mapKey = getMapNameKey(map.name)
                    const mapUsed = usedMapKeys.has(mapKey)
                    const ruleBlocked = mapPickRule?.lockedMapId
                      ? map.id !== mapPickRule.lockedMapId
                      : mapPickRule?.allowedMode
                        ? map.mode !== mapPickRule.allowedMode
                        : false
                    const selected = selectedMapKey === mapKey && (!selectedModeKey || selectedModeKey === group.mode)
                    const disabled = !canManage || (!selected && (mapUsed || typeUsed || ruleBlocked))
                    const statusLabel = selected
                      ? (mapPickRule?.badge || `${pickerSideLabel} 选择`)
                      : mapUsed
                        ? '已打过'
                        : typeUsed
                          ? '类型已用'
                          : ruleBlocked
                            ? '首图限制'
                            : ''
                    return (
                      <button
                        key={map.id}
                        type="button"
                        data-selected={selected ? 'true' : 'false'}
                        data-used={mapUsed || typeUsed || ruleBlocked ? 'true' : 'false'}
                        disabled={disabled}
                        onClick={() => setMapDraft({
                          ...mapDraft,
                          type: map.type,
                          name: map.name,
                          attackSide: SIDE_CHOICE_MODES.has(map.mode) ? mapDraft.attackSide || '' : ''
                        })}
                      >
                        {map.imageSrc ? <img className={styles.mapThumb} src={map.imageSrc} alt="" loading="lazy" /> : null}
                        <span>{map.name}</span>
                        {statusLabel ? <em>{statusLabel}</em> : null}
                      </button>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </div>
        <div className={`${styles.actionBar} ${styles.mapPickDock}`}>
          <div className={styles.mapPickDockCopy}>
            <span>NEXT ACTION</span>
            <strong>{displayMapName ? uiText("锁定 {0}", locale, [displayMapName]) : uiText("锁定地图", locale)}</strong>
            <em>{lockHint}</em>
          </div>
          {ruleTags.length ? (
            <div className={styles.mapPickRuleGroup} aria-label={uiText("选图规则", locale)}>
              <span>RULES</span>
              <div className={styles.mapRuleStrip}>
                {ruleTags.map(tag => <span key={tag}>{tag}</span>)}
                {needsSideChoice && attackSideLabel ? <span>{attackSideLabel}{uiText(" 先攻", locale)}</span> : null}
              </div>
            </div>
          ) : null}
          <button type="button" disabled={isBusy || !canManage} onClick={onLockMap}>
            {isBusy ? uiText("同步中", locale) : uiText("锁定地图", locale)}
          </button>
        </div>
      </div>
      <PermissionNotice roomPermission={roomPermission} />
      {actionState?.message ? (
        <div className={styles.confirmMessage} data-status={actionState.status}>
          {actionState.message}
        </div>
      ) : null}
    </section>
  )
}

export function LineupPanel({ model, lineup, setLineup, roomPermission, actionState, onLockLineup, remoteMap }) {
  const uiLocale = useUiLocale()
  const isBusy = Boolean(actionState?.isLoading)
  const lineupLocks = remoteMap?.lineupLocks || {}
  const isLocked = Boolean(lineupLocks.A && lineupLocks.B)
  const managedSides = roomPermission?.canManageAll
    ? ['A', 'B']
    : ['A', 'B'].filter(side => canManageRoomSide(roomPermission, side))
  const [openSlotKey, setOpenSlotKey] = useState('')
  const getSelectedCount = sideKey => normalizeLineupSlots(lineup[sideKey]).filter(slot => slot.playerKey).length
  const lineupsComplete = getSelectedCount('A') === LINEUP_SLOT_META.length && getSelectedCount('B') === LINEUP_SLOT_META.length
  const editableManagedSides = managedSides.filter(side => !lineupLocks[side])
  const submissionReady = Boolean(editableManagedSides.length && editableManagedSides.every(side => getSelectedCount(side) === LINEUP_SLOT_META.length))
  const canManage = Boolean(roomPermission?.canManageFlow && editableManagedSides.length)
  const getSummaryText = (sideKey, team) => normalizeLineupSlots(lineup[sideKey])
    .map(slot => `${getLineupSlotDisplayLabel(slot)} ${getParticipantLabel(team, slot.playerKey)}`)
    .join(' / ')

  useEffect(() => {
    if (!canManage && openSlotKey) {
      setOpenSlotKey('')
      return undefined
    }

    if (!openSlotKey || typeof document === 'undefined') return undefined

    const closeOnOutsidePointer = event => {
      if (!event.target?.closest?.('[data-lineup-picker-root="true"]')) setOpenSlotKey('')
    }

    document.addEventListener('pointerdown', closeOnOutsidePointer)
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer)
  }, [canManage, openSlotKey])

  const renderSide = (sideKey, team) => {
    const options = getPlayerOptions(team)
    const rows = normalizeLineupSlots(lineup[sideKey])
    const fullLabel = getTeamFullLabel(team)
    const selectedCount = rows.filter(slot => slot.playerKey).length
    const sideLocked = Boolean(lineupLocks[sideKey])
    const canManageSide = Boolean(canManageRoomSide(roomPermission, sideKey) && !sideLocked)

    return (
      <div className={styles.lineupSide} data-side={sideKey} data-ready={selectedCount === rows.length ? 'true' : 'false'}>
        <div className={styles.lineupHead}>
          <div>
            <span>{sideKey === 'A' ? 'TEAM A' : 'TEAM B'}</span>
            <strong>{team.short}</strong>
            {fullLabel ? <small>{fullLabel}</small> : null}
          </div>
          <b>{selectedCount}/{rows.length}</b>
        </div>
        <div className={styles.lineupRows}>
          {rows.map((slot, index) => {
            const roleName = normalizeRoleName(slot.role)
            return (
              <div
                key={`${sideKey}-${slot.slot}-${index}`}
                className={styles.lineupRow}
                data-role={roleName}
                data-filled={slot.playerKey ? 'true' : 'false'}
              >
                <span>
                  <b>{getLineupSlotDisplayLabel(slot)}</b>
                  <em>{uiText(getRoleLabel(slot.role), uiLocale)}</em>
                </span>
                <LineupPlayerSelect
                  value={slot.playerKey}
                  disabled={!canManageSide}
                  options={options}
                  open={openSlotKey === `${sideKey}-${slot.slot}-${index}`}
                  side={sideKey}
                  placement={index >= 3 ? 'top' : 'bottom'}
                  onToggle={nextOpen => {
                    const slotKey = `${sideKey}-${slot.slot}-${index}`
                    setOpenSlotKey(current => {
                      if (typeof nextOpen === 'boolean') return nextOpen ? slotKey : ''
                      return current === slotKey ? '' : slotKey
                    })
                  }}
                  onChange={playerKey => {
                    updateLineupSlot(lineup, setLineup, sideKey, index, playerKey)
                    setOpenSlotKey('')
                  }}
                />
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <section className={`${styles.workspaceSection} ${styles.lineupStageSection}`}>
      <div className={styles.sectionHead}>
        <span>LINEUP</span>
        <h2>{uiText("首发五人", uiLocale)}</h2>
        <em>{isLocked ? uiText("已锁定", uiLocale) : lineupsComplete ? uiText("等待锁定", uiLocale) : uiText("下拉选择", uiLocale)}</em>
      </div>
      <div className={styles.lineupGrid}>
        {renderSide('A', model.teamA)}
        {renderSide('B', model.teamB)}
      </div>
      <div className={styles.lineupLockDock} data-ready={submissionReady ? 'true' : 'false'}>
        <div className={styles.lockPreview}>
          <span><b>{model.teamA.short}</b>{getSummaryText('A', model.teamA)}</span>
          <span><b>{model.teamB.short}</b>{getSummaryText('B', model.teamB)}</span>
        </div>
        <div className={styles.lineupLockState}>
          <strong>{lineupLocks.A ? 'A OK' : `${getSelectedCount('A')}/5`} · {lineupLocks.B ? 'B OK' : `${getSelectedCount('B')}/5`}</strong>
          <em>{isLocked ? uiText("双方首发已锁定", uiLocale) : submissionReady ? uiText("可锁定你负责的首发", uiLocale) : uiText("等待双方分别完成首发", uiLocale)}</em>
        </div>
        <div className={styles.actionBar}>
          <button type="button" disabled={isBusy || !canManage || !submissionReady} onClick={onLockLineup}>
            {isBusy ? uiText("同步中", uiLocale) : isLocked ? uiText("双方已锁定", uiLocale) : !editableManagedSides.length ? managedSides.length ? uiText("本队已锁定", uiLocale) : uiText("当前只读", uiLocale) : roomPermission?.canManageAll ? uiText("锁定未确认阵容", uiLocale) : uiText("锁定 TEAM {0}", uiLocale, [editableManagedSides.join('/')])}
          </button>
        </div>
      </div>
      <PermissionNotice roomPermission={roomPermission} />
      {actionState?.message ? (
        <div className={styles.confirmMessage} data-status={actionState.status}>
          {actionState.message}
        </div>
      ) : null}
    </section>
  )
}

export function BanPanel({
  model,
  bans,
  setBans,
  banFirstSide,
  setBanFirstSide,
  remoteRoom,
  remoteMap,
  locale,
  roomPermission,
  actionState,
  onSubmitBans,
  timer
}) {
  const [activeSide, setActiveSide] = useState(normalizeRoomSide(banFirstSide) || 'A')

  useEffect(() => {
    setActiveSide(normalizeRoomSide(banFirstSide) || 'A')
  }, [banFirstSide, remoteMap?.mapOrder])

  if (!model.heroBanEnabled) {
    return (
      <section className={styles.workspaceSection}>
        <div className={styles.sectionHead}>
          <span>HERO BAN</span>
          <h2>{uiText("英雄禁用", locale)}</h2>
        </div>
        <div className={styles.skipPanel}>{uiText("本场赛制跳过 HERO BAN", locale)}</div>
      </section>
    )
  }

  const isBusy = Boolean(actionState?.isLoading)
  const canManage = Boolean(roomPermission?.canManageFlow)
  const heroGroups = getHeroGroups(locale)
  const normalizedBans = normalizeHeroBanDraft(bans)
  const lockedBans = normalizeHeroBanDraft(remoteMap?.heroBans || {})
  const hasChoice = ban => Boolean(ban?.hero || ban?.isPass || ban?.timeout)
  const currentMapOrder = Number(remoteRoom?.room?.currentMapOrder || remoteMap?.mapOrder || 1)
  const currentMapLabel = `MAP ${String(currentMapOrder).padStart(2, '0')}`
  const pickerSide = normalizeRoomSide(remoteMap?.pickerSide) || 'A'
  const firstSide = normalizeRoomSide(banFirstSide) || pickerSide
  const secondSide = getOppositeRoomSide(firstSide)
  const active = normalizeRoomSide(activeSide) || firstSide
  const otherSide = getOppositeRoomSide(active)
  const activeTeam = active === 'B' ? model.teamB : model.teamA
  const otherTeam = otherSide === 'B' ? model.teamB : model.teamA
  const pickerTeam = pickerSide === 'B' ? model.teamB : model.teamA
  const otherPickerTeam = getOppositeRoomSide(pickerSide) === 'B' ? model.teamB : model.teamA
  const priorBanByHero = new Map(getTeamBanRecords(remoteRoom, currentMapOrder, active).map(record => [record.heroKey, record]))
  const banHistoryBySide = {
    A: getTeamBanHistoryRecords(remoteRoom, currentMapOrder, 'A'),
    B: getTeamBanHistoryRecords(remoteRoom, currentMapOrder, 'B')
  }
  const hasBanHistory = Boolean(banHistoryBySide.A.length || banHistoryBySide.B.length)
  const managedSides = roomPermission?.canManageAll
    ? ['A', 'B']
    : ['A', 'B'].filter(side => canManageRoomSide(roomPermission, side))
  const canManagePicker = Boolean(roomPermission?.canManageAll || canManageRoomSide(roomPermission, pickerSide))
  const firstBanLocked = hasChoice(lockedBans[firstSide])
  const editableManagedSides = managedSides.filter(side => !hasChoice(lockedBans[side]))
  const submissionSides = roomPermission?.canManageAll
    ? editableManagedSides
    : editableManagedSides.filter(side => side === firstSide || firstBanLocked)
  const orderOnly = Boolean(!roomPermission?.canManageAll && canManagePicker && firstSide !== pickerSide && !firstBanLocked)
  const timerExpired = Boolean(timer?.expired)
  const canSubmitBans = Boolean(
    orderOnly ||
    (submissionSides.length && (timerExpired || submissionSides.every(side => hasChoice(normalizedBans[side]))))
  )
  const sides = [
    ['A', model.teamA],
    ['B', model.teamB]
  ]
  const setPickerOrder = choice => {
    if (!canManagePicker) return
    const nextFirstSide = choice === 'second' ? getOppositeRoomSide(pickerSide) : pickerSide
    setBanFirstSide(nextFirstSide)
    setActiveSide(canManageRoomSide(roomPermission, nextFirstSide) ? nextFirstSide : managedSides[0] || nextFirstSide)
  }
  const updateHeroBan = (side, hero) => {
    if (!canManageRoomSide(roomPermission, side)) return
    const next = {
      ...normalizedBans,
      firstSide,
      [side]: {
        role: getBanRoleValue(hero.role),
        hero: hero.value
      }
    }
    setBans(next)
    const nextSide = getOppositeRoomSide(side)
    if (!normalizedBans[nextSide]?.hero) setActiveSide(nextSide)
  }
  const clearHeroBan = side => {
    if (!canManageRoomSide(roomPermission, side) || hasChoice(lockedBans[side])) return
    setBans({
      ...normalizedBans,
      firstSide,
      [side]: { role: '', hero: '' }
    })
    setActiveSide(side)
  }

  return (
    <section className={`${styles.workspaceSection} ${styles.banStageSection}`}>
      <div className={styles.sectionHead}>
        <span>HERO BAN</span>
        <h2>{uiText("英雄禁用", locale)}</h2>
      </div>
      <div className={styles.banMeta}>
        <TimerPill timer={timer} />
        <span>{uiText("双方各 1 BAN", locale)}</span>
        <span>{uiText("同图职责不可重复", locale)}</span>
        <span>{uiText("同队英雄不可重复", locale)}</span>
        <span>{uiText("超时赛管记录", locale)}</span>
        {hasBanHistory ? (
          <div className={styles.banHistoryRail}>
            <strong>{uiText("过往 BAN", locale)}</strong>
            {sides.map(([side, team]) => (
              <div key={side} className={styles.banHistorySide}>
                <span>{team.short}</span>
                {banHistoryBySide[side].map(record => (
                  <b key={`${side}-${record.mapOrder}-${record.hero || 'pass'}`} data-pass={record.isPass ? 'true' : 'false'}>
                    MAP {String(record.mapOrder).padStart(2, '0')} {record.isPass ? uiText("空 BAN", locale) : formatOwHeroName(record.hero, locale)}
                  </b>
                ))}
              </div>
            ))}
          </div>
        ) : null}
      </div>
      <div className={styles.banOrderBar}>
        <div className={styles.banOrderSummary}>
          <span>BAN ORDER</span>
          <strong>{pickerTeam.short}{uiText(" 选图方", locale)}</strong>
          <em>{firstSide === pickerSide ? uiText("{0} 先 BAN", locale, [pickerTeam.short]) : uiText("{0} 后 BAN", locale, [pickerTeam.short])}</em>
        </div>
        <button
          type="button"
          data-active={firstSide === pickerSide ? 'true' : 'false'}
          disabled={!canManagePicker || isBusy}
          onClick={() => setPickerOrder('first')}
        >{uiText("选图方先 BAN", locale)}</button>
        <button
          type="button"
          data-active={firstSide !== pickerSide ? 'true' : 'false'}
          disabled={!canManagePicker || isBusy}
          onClick={() => setPickerOrder('second')}
        >
          {otherPickerTeam.short}{uiText(" 先 BAN", locale)}</button>
        <small>{firstSide} → {secondSide}</small>
        {sides.map(([side, team]) => {
          const selectedHero = normalizedBans[side].hero
          const selectedRole = normalizedBans[side].role
          const selectedIsPass = Boolean(normalizedBans[side].isPass || normalizedBans[side].timeout)
          const selectedPortrait = getBanPortraitSrc(selectedHero, selectedRole)
          const selectedRoleLabel = selectedIsPass ? '超时' : HERO_ROLE_LABELS[getHeroBanRoleKey(normalizedBans[side])] || '待定'
          const selectedLabel = selectedHero ? formatOwHeroName(selectedHero, locale) : selectedIsPass ? '空 BAN' : '未选择'
          const orderIndex = firstSide === side ? '01' : '02'

          return (
          <div
            key={side}
            className={styles.banMiniSide}
            data-side={side}
            data-active={active === side ? 'true' : 'false'}
            data-filled={selectedHero ? 'true' : 'false'}
            data-pass={selectedIsPass ? 'true' : 'false'}
          >
            <button
              type="button"
              className={styles.banMiniMain}
              data-active={active === side ? 'true' : 'false'}
              disabled={!canManageRoomSide(roomPermission, side) || isBusy}
              onClick={() => setActiveSide(side)}
            >
              <span>{orderIndex} / {team.short}</span>
              {selectedPortrait ? (
                <img src={selectedPortrait} alt="" loading="lazy" />
              ) : (
                <b>{side}</b>
              )}
              <em>{active === side ? uiText("当前", locale) : uiText("切换", locale)}</em>
              <small>{selectedRoleLabel}</small>
              <strong>{selectedLabel}</strong>
            </button>
              {selectedHero || selectedIsPass ? (
                <button className={styles.banMiniClear} type="button" disabled={!canManageRoomSide(roomPermission, side) || hasChoice(lockedBans[side]) || isBusy} onClick={() => clearHeroBan(side)}>{uiText("清空", locale)}</button>
              ) : null}
          </div>
          )
        })}
        <button
          type="button"
          className={styles.banSubmitInline}
          disabled={isBusy || !canManage || !canSubmitBans}
          onClick={onSubmitBans}
        >
          {isBusy ? uiText("同步中", locale) : orderOnly ? uiText("确认 BAN 顺序", locale) : uiText("提交 HERO BAN", locale)}
        </button>
      </div>
      <div className={styles.heroPool}>
        {heroGroups.map(group => (
          <section key={group.role} className={styles.heroPoolGroup}>
            <div className={styles.heroPoolHead}>
              <span>{group.label}</span>
              <strong>{group.heroes.length}</strong>
            </div>
            <div className={styles.heroPoolGrid}>
              {group.heroes.map(hero => {
                const heroKey = normalizeRoomKey(hero.value)
                const selectedForActive = normalizeRoomKey(normalizedBans[active]?.hero) === heroKey
                const sameHeroPickedByOther = normalizeRoomKey(normalizedBans[otherSide]?.hero) === heroKey
                const otherRole = getHeroBanRoleKey(normalizedBans[otherSide])
                const roleLockedByOther = Boolean(otherRole && otherRole === hero.role && !selectedForActive)
                const priorRecord = priorBanByHero.get(heroKey)
                const priorTeam = priorRecord ? (normalizeRoomSide(priorRecord.side) === 'B' ? model.teamB : model.teamA) : null
                const priorBanCode = priorRecord ? `M${String(priorRecord.mapOrder).padStart(2, '0')} / ${priorTeam.short}` : ''
                const currentBanCode = sameHeroPickedByOther ? `M${String(currentMapOrder).padStart(2, '0')} / ${otherTeam.short}` : ''
                const heroBanStatusCode = priorBanCode || currentBanCode
                const currentBanLabel = sameHeroPickedByOther ? `${currentMapLabel} / ${otherTeam.short}` : ''
                const priorBanLabel = priorRecord ? `MAP ${String(priorRecord.mapOrder).padStart(2, '0')} / ${priorTeam.short}` : ''
                const shortPriorBanLabel = priorRecord ? `MAP ${String(priorRecord.mapOrder).padStart(2, '0')} 已禁` : ''
                const lockedLabel = roleLockedByOther ? `${HERO_ROLE_LABELS[hero.role]} 已锁` : ''
                const cardStatus = selectedForActive
                  ? 'selected'
                  : sameHeroPickedByOther || priorRecord
                    ? 'used'
                    : roleLockedByOther
                      ? 'locked'
                      : 'open'
                const stateLabel = selectedForActive
                  ? '当前'
                  : sameHeroPickedByOther
                    ? `${otherTeam.short} 已选`
                    : shortPriorBanLabel || lockedLabel
                const isDisabled = !canManageRoomSide(roomPermission, active) || hasChoice(lockedBans[active]) || isBusy || Boolean(!selectedForActive && (sameHeroPickedByOther || priorRecord || roleLockedByOther))
                return (
                  <button
                    key={hero.id}
                    type="button"
                    className={styles.heroBanCard}
                    data-role={hero.role}
                    data-status={cardStatus}
                    data-ban-code={heroBanStatusCode}
                    data-selected={selectedForActive ? 'true' : 'false'}
                    data-used={(sameHeroPickedByOther || priorRecord) && !selectedForActive ? 'true' : 'false'}
                    data-locked={roleLockedByOther && !selectedForActive ? 'true' : 'false'}
                    disabled={isDisabled}
                    onClick={() => updateHeroBan(active, hero)}
                    title={currentBanLabel || priorBanLabel || lockedLabel || uiText("{0} 禁用 {1}", locale, [activeTeam.short, hero.name])}
                  >
                    <img src={hero.avatar} alt="" loading="lazy" />
                    <span>{hero.name}</span>
                    <em>{group.label}</em>
                    {stateLabel ? (
                      <strong data-ban-code={heroBanStatusCode}>
                        {stateLabel}
                      </strong>
                    ) : null}
                  </button>
                )
              })}
            </div>
          </section>
        ))}
      </div>
      <PermissionNotice roomPermission={roomPermission} />
      {actionState?.message ? (
        <div className={styles.confirmMessage} data-status={actionState.status}>
          {actionState.message}
        </div>
      ) : null}
    </section>
  )
}

function ConfirmationCard({ side, team, confirmation, submitted, revealScore }) {
  const uiLocale = useUiLocale()
  const isConfirmed = Boolean(submitted || confirmation)
  return (
    <div className={styles.confirmationCard} data-status={isConfirmed ? 'confirmed' : 'waiting'}>
      <span>TEAM {side}</span>
      <strong>{isConfirmed ? revealScore && confirmation ? confirmationScore(confirmation) : uiText("已提交", uiLocale) : uiText("待提交", uiLocale)}</strong>
      <em>{revealScore && confirmation ? confirmationUser(confirmation) || team.short : team.short}</em>
    </div>
  )
}

export function MapResultPanel({
  model,
  mapScore,
  setMapScore,
  remoteMap,
  confirmState,
  actionState,
  roomPermission,
  mapProgression,
  onConfirmSide,
  onResolveResult,
  onAdvanceNextMap,
  onAdvanceFinal
}) {
  const uiLocale = useUiLocale()
  const verdict = getMapResultVerdict(mapScore.A, mapScore.B, model.teamA, model.teamB)
  const remoteVerdict = getRemoteMapVerdict(remoteMap, model)
  const confirmationA = getConfirmation(remoteMap, 'A')
  const confirmationB = getConfirmation(remoteMap, 'B')
  const submittedSides = new Set(remoteMap?.resultConfirmation?.submittedSides || [
    confirmationA ? 'A' : '',
    confirmationB ? 'B' : ''
  ].filter(Boolean))
  const scoreA = Number(mapScore.A)
  const scoreB = Number(mapScore.B)
  const hasScoreText = String(mapScore.A).trim() !== '' && String(mapScore.B).trim() !== ''
  const hasValidScore = hasScoreText && Number.isInteger(scoreA) && scoreA >= 0 && Number.isInteger(scoreB) && scoreB >= 0
  const mapOrder = remoteMap?.mapOrder || 1
  const isLocked = Boolean(mapProgression?.isLocked)
  const isDisputed = Boolean(remoteMap?.status === 'DISPUTED' || remoteMap?.resultConfirmation?.disputed)
  const seriesScore = mapProgression?.score || { A: 0, B: 0 }
  const finishSide = mapProgression?.winnerSide || ''
  const finishTeam = finishSide === 'A' ? model.teamA.short : finishSide === 'B' ? model.teamB.short : ''
  const nextPickerSide = mapProgression?.nextPickerSide || ''
  const nextPickerLabel = nextPickerSide === 'A' ? model.teamA.short : nextPickerSide === 'B' ? model.teamB.short : '赛事方'
  const isAdvancing = Boolean(actionState?.isLoading)
  const canManage = Boolean(roomPermission?.canManageFlow)
  const projectedScore = hasValidScore && !isLocked && verdict.side !== 'DRAW'
    ? {
        A: seriesScore.A + (verdict.side === 'A' ? 1 : 0),
        B: seriesScore.B + (verdict.side === 'B' ? 1 : 0)
      }
    : seriesScore
  const nextMapLabel = `MAP ${String(mapProgression?.nextMapOrder || Number(mapOrder) + 1).padStart(2, '0')}`
  const pointLabel = isLocked
    ? '本图已计入总比分'
    : hasValidScore
      ? verdict.side === 'DRAW'
        ? '平局不计分'
        : `${verdict.label} +1`
      : '地图胜方 +1'

  return (
    <section className={styles.workspaceSection}>
      <div className={styles.sectionHead}>
        <span>SCORE CHECK</span>
        <h2>{uiText("地图结果确认", uiLocale)}</h2>
        <em>MAP {String(mapOrder).padStart(2, '0')}</em>
      </div>
      <div className={styles.remoteResultBanner} data-status={remoteVerdict.status}>
        <span>{remoteVerdict.label}</span>
        <strong>{remoteVerdict.detail}</strong>
      </div>
      <div className={styles.seriesProgressPanel}>
        <div>
          <span>{uiText("系列赛比分", uiLocale)}</span>
          <strong>{model.teamA.short} {projectedScore.A}:{projectedScore.B} {model.teamB.short}</strong>
          <em>FT{mapProgression?.targetWins || model.targetWins}{uiText(" · 先到 ", uiLocale)}{mapProgression?.targetWins || model.targetWins}{uiText(" 分结束", uiLocale)}</em>
        </div>
        <div>
          <span>{uiText("本图计分", uiLocale)}</span>
          <strong>{pointLabel}</strong>
          <em>{finishSide ? uiText("{0} 达到赛点", uiLocale, [finishTeam]) : uiText("未到 FT 会继续进入 {0}", uiLocale, [nextMapLabel])}</em>
        </div>
      </div>
      <div className={styles.scoreInputGrid}>
        <label>
          <span>{model.teamA.short}</span>
          <input
            type="number"
            min="0"
            value={mapScore.A}
            onChange={event => {
              const value = event.target.value
              setMapScore(current => ({ ...current, A: value }))
            }}
          />
        </label>
        <label>
          <span>{model.teamB.short}</span>
          <input
            type="number"
            min="0"
            value={mapScore.B}
            onChange={event => {
              const value = event.target.value
              setMapScore(current => ({ ...current, B: value }))
            }}
          />
        </label>
        <div className={styles.winnerBox} data-side={verdict.side || 'NONE'} data-i18n-ignore>
          <span>{uiText("判定", uiLocale)}</span>
          <strong>{verdict.label}</strong>
          <em>{verdict.scoreLabel || '-'}</em>
        </div>
      </div>
      <div className={styles.confirmationGrid}>
        <ConfirmationCard
          side="A"
          team={model.teamA}
          confirmation={confirmationA}
          submitted={submittedSides.has('A')}
          revealScore={Boolean(roomPermission?.canManageAll || roomPermission?.captainSides?.includes('A'))}
        />
        <ConfirmationCard
          side="B"
          team={model.teamB}
          confirmation={confirmationB}
          submitted={submittedSides.has('B')}
          revealScore={Boolean(roomPermission?.canManageAll || roomPermission?.captainSides?.includes('B'))}
        />
      </div>
      <div className={styles.confirmGrid}>
        <button
          type="button"
          disabled={isLocked || isDisputed || submittedSides.has('A') || !hasValidScore || confirmState.isLoading || !canConfirmSide(roomPermission, 'A')}
          onClick={() => onConfirmSide('A')}
        >
          {submittedSides.has('A') ? uiText("{0} 已提交", uiLocale, [model.teamA.short]) : confirmState.side === 'A' && confirmState.isLoading ? uiText("提交中", uiLocale) : uiText("{0} 提交小分", uiLocale, [model.teamA.short])}
        </button>
        <button
          type="button"
          disabled={isLocked || isDisputed || submittedSides.has('B') || !hasValidScore || confirmState.isLoading || !canConfirmSide(roomPermission, 'B')}
          onClick={() => onConfirmSide('B')}
        >
          {submittedSides.has('B') ? uiText("{0} 已提交", uiLocale, [model.teamB.short]) : confirmState.side === 'B' && confirmState.isLoading ? uiText("提交中", uiLocale) : uiText("{0} 提交小分", uiLocale, [model.teamB.short])}
        </button>
      </div>
      {isDisputed && roomPermission?.canManageAll ? (
        <div className={styles.mapAdvancePanel} data-disputed="true">
          <div>
            <span>{uiText("赛管裁定", uiLocale)}</span>
            <strong>{uiText("核对截图后填写最终整数小分", uiLocale)}</strong>
            <em>{uiText("裁定会解除冻结并按相同规则计算胜方或平局", uiLocale)}</em>
          </div>
          <button
            type="button"
            disabled={!hasValidScore || confirmState.isLoading}
            onClick={onResolveResult}
          >
            {confirmState.side === 'REFEREE' && confirmState.isLoading ? uiText("裁定中", uiLocale) : uiText("按当前小分裁定", uiLocale)}
          </button>
        </div>
      ) : null}
      {confirmState.message ? (
        <div className={styles.confirmMessage} data-status={confirmState.status}>
          {confirmState.message}
        </div>
      ) : null}
      {isLocked ? (
        <div className={styles.mapAdvancePanel} data-finished={finishSide ? 'true' : 'false'}>
          <div>
            <span>{uiText("当前总比分", uiLocale)}</span>
            <strong>{model.teamA.short} {seriesScore.A}:{seriesScore.B} {model.teamB.short}</strong>
            <em>
              {finishSide
                ? uiText("{0} 已达到 FT{1}", uiLocale, [finishTeam, mapProgression.targetWins])
                : uiText("下一张 MAP {0} · {1} 选图", uiLocale, [String(mapProgression.nextMapOrder).padStart(2, '0'), nextPickerLabel])}
            </em>
          </div>
          <button
            type="button"
            disabled={isAdvancing || !canManage}
            onClick={finishSide ? onAdvanceFinal : onAdvanceNextMap}
          >
            {isAdvancing ? uiText("同步中", uiLocale) : finishSide ? uiText("进入完整赛果", uiLocale) : uiText("进入 {0} 选图", uiLocale, [nextMapLabel])}
          </button>
        </div>
      ) : null}
      {isLocked ? <PermissionNotice roomPermission={roomPermission} /> : null}
      {actionState?.message ? (
        <div className={styles.confirmMessage} data-status={actionState.status}>
          {actionState.message}
        </div>
      ) : null}
    </section>
  )
}

function FinalSubmissionRow({ submission, model }) {
  const uiLocale = useUiLocale()
  const winner = submission.winnerTeamId === model.teamA.id
    ? model.teamA.short
    : submission.winnerTeamId === model.teamB.id
      ? model.teamB.short
      : '-'

  return (
    <div className={styles.finalSubmissionRow}>
      <div>
        <span>{submission.status || 'SUBMITTED'}</span>
        <strong>{winner} {submission.scoreA ?? '-'}:{submission.scoreB ?? '-'}</strong>
        <em>{submission.submittedBy?.username || submission.submittedBy?.displayName || submission.submittedBy?.email || uiText("未知账号", uiLocale)}</em>
      </div>
      <b>{submission.replayCode || '-'}</b>
    </div>
  )
}

export function FinalResultPanel({
  model,
  finalResult,
  setFinalResult,
  remoteRoom,
  roomPermission,
  submitState,
  onSubmitFinal
}) {
  const uiLocale = useUiLocale()
  const seriesScore = getSeriesScore(remoteRoom)
  const winnerSide = getFinalWinnerSide(finalResult.scoreA, finalResult.scoreB)
  const winnerLabel = winnerSide === 'A' ? model.teamA.short : winnerSide === 'B' ? model.teamB.short : '等待总比分'
  const replayCode = String(finalResult.replayCode || '').trim()
  const canSubmit = Boolean(winnerSide && canManageRoomSide(roomPermission, winnerSide) && replayCode && !submitState.isLoading)
  const latestSubmission = latestFinalSubmission(remoteRoom)
  const finalMaps = (remoteRoom?.room?.maps || [])
    .filter(map => cleanText(map.mapName) || cleanText(map.mapType) || cleanText(map.status))
    .sort((a, b) => Number(a.mapOrder || 0) - Number(b.mapOrder || 0))
  const timelineMaps = finalMaps.length
    ? finalMaps
    : [{ mapOrder: 1, mapName: '等待地图记录', mapType: 'MAP', status: 'PENDING', winnerSide: 'NONE' }]
  const boardScoreA = finalResult.scoreA === '' ? seriesScore.A : finalResult.scoreA
  const boardScoreB = finalResult.scoreB === '' ? seriesScore.B : finalResult.scoreB
  const boardWinnerSide = getFinalWinnerSide(boardScoreA, boardScoreB)
  const boardWinnerLabel = boardWinnerSide === 'A'
    ? model.teamA.short
    : boardWinnerSide === 'B'
      ? model.teamB.short
      : `FT${model.targetWins}`

  return (
    <section className={`${styles.workspaceSection} ${styles.finalResultSection}`}>
      <div className={styles.sectionHead}>
        <span>FINAL RESULT</span>
        <h2>{uiText("完整赛果提交", uiLocale)}</h2>
        <em>{seriesScore.played ? `${seriesScore.played} MAPS LOCKED` : 'ROOM RESULT'}</em>
      </div>
      <div className={styles.finalResultBoard}>
        <div className={styles.finalScoreBoard} data-winner={boardWinnerSide || 'NONE'}>
          <span>SERIES</span>
          <strong>{model.teamA.short} {boardScoreA}:{boardScoreB} {model.teamB.short}</strong>
          <em>{boardWinnerSide ? uiText("{0} 胜出", uiLocale, [boardWinnerLabel]) : uiText("{0} · 等待总比分", uiLocale, [boardWinnerLabel])}</em>
        </div>
        <div className={styles.finalMapTimeline}>
          {timelineMaps.map(map => {
            const mapWinner = map.isDraw ? 'DRAW' : map.winnerSide || 'NONE'
            const scoreLabel = map.scoreA !== undefined || map.scoreB !== undefined
              ? `${map.scoreA ?? '-'}:${map.scoreB ?? '-'}`
              : mapStatusLabel(map.status)
            return (
              <div
                key={`${map.mapOrder || 'map'}-${map.mapName || map.status || 'pending'}`}
                className={styles.finalMapCard}
                data-winner={mapWinner}
              >
                <span>MAP {String(map.mapOrder || 1).padStart(2, '0')}</span>
                <strong>{map.mapName || uiText("未记录地图", uiLocale)}</strong>
                <em>{formatOwMapMode(map.mapType) || uiText("地图", uiLocale)} / {scoreLabel}</em>
              </div>
            )
          })}
        </div>
      </div>
      <div className={styles.finalGrid}>
        <div className={styles.finalScoreEntry}>
          <label>
            <span>{model.teamA.short}{uiText(" 地图胜", uiLocale)}</span>
            <input
              type="number"
              min="0"
              value={finalResult.scoreA}
              onChange={event => {
                const value = event.target.value
                setFinalResult(current => ({ ...current, scoreA: value }))
              }}
            />
          </label>
          <b aria-hidden="true">:</b>
          <label>
            <span>{model.teamB.short}{uiText(" 地图胜", uiLocale)}</span>
            <input
              type="number"
              min="0"
              value={finalResult.scoreB}
              onChange={event => {
                const value = event.target.value
                setFinalResult(current => ({ ...current, scoreB: value }))
              }}
            />
          </label>
        </div>
        <div className={styles.finalWinnerBox} data-side={winnerSide || 'NONE'} data-i18n-ignore>
          <span>{uiText("胜方", uiLocale)}</span>
          <strong>{winnerLabel}</strong>
          <em>{winnerSide ? `${finalResult.scoreA}:${finalResult.scoreB}` : uiText("总比分不能相同", uiLocale)}</em>
        </div>
        <label className={styles.finalReplayField}>
          <span>{uiText("回放代码", uiLocale)}</span>
          <input
            value={finalResult.replayCode}
            onChange={event => {
              const value = event.target.value.toUpperCase()
              setFinalResult(current => ({ ...current, replayCode: value }))
            }}
            placeholder={uiText("比赛结束后填写", uiLocale)}
          />
        </label>
      </div>
      <label className={styles.finalNotesField}>
        <span>{uiText("赛果备注 ", uiLocale)}<em>{uiText("可选", uiLocale)}</em></span>
        <textarea
          className={styles.resultNotes}
          value={finalResult.notes}
          onChange={event => {
            const value = event.target.value
            setFinalResult(current => ({ ...current, notes: value }))
          }}
          placeholder={uiText("记录判罚、争议或其他需要随赛果保留的信息", uiLocale)}
        />
      </label>
      {latestSubmission ? (
        <div className={styles.finalSubmissionList}>
          <span>{uiText("最近提交", uiLocale)}</span>
          <FinalSubmissionRow submission={latestSubmission} model={model} />
        </div>
      ) : null}
      <div className={styles.actionBar}>
        <button type="button" disabled={!canSubmit} onClick={onSubmitFinal}>
          {submitState.isLoading ? uiText("提交中", uiLocale) : uiText("提交完整赛果", uiLocale)}
        </button>
      </div>
      <PermissionNotice roomPermission={roomPermission} />
      {submitState.message ? (
        <div className={styles.confirmMessage} data-status={submitState.status}>
          {submitState.message}
        </div>
      ) : null}
    </section>
  )
}

function Workspace({
  model,
  activeStep,
  remoteRoom,
  roomPermission,
  lineup,
  setLineup,
  locale,
  staff,
  teamA,
  teamB,
  onRemoteMapChange,
  onRemoteRoomChange
}) {
  const [mapDraft, setMapDraft] = useState({ type: MAP_TYPES[0], name: '', pickerSide: '', attackSide: '' })
  const [bans, setBans] = useState(() => createEmptyHeroBans())
  const [banFirstSide, setBanFirstSide] = useState('A')
  const [mapScore, setMapScore] = useState({ A: '', B: '' })
  const [finalResult, setFinalResult] = useState({ scoreA: '', scoreB: '', replayCode: '', notes: '' })
  const [confirmState, setConfirmState] = useState({
    status: 'idle',
    message: '',
    side: '',
    isLoading: false
  })
  const [submitState, setSubmitState] = useState({
    status: 'idle',
    message: '',
    isLoading: false
  })
  const [actionState, setActionState] = useState({
    status: 'idle',
    message: '',
    isLoading: false
  })
  const remoteMap = useMemo(() => getCurrentRemoteMap(remoteRoom), [remoteRoom])
  const canManageFlow = Boolean(roomPermission?.canManageFlow)
  const seriesScore = useMemo(() => getSeriesScore(remoteRoom), [remoteRoom])
  const mapProgression = useMemo(() => getMapProgression(remoteRoom, model, remoteMap), [remoteRoom, model, remoteMap])
  const now = useRoomClock()
  const stepTimer = getStepTimer(activeStep, remoteRoom, remoteMap, now)

  useEffect(() => {
    setLineup({
      A: getInitialLineup(model.teamA),
      B: getInitialLineup(model.teamB)
    })
  }, [model.matchId, model.teamA, model.teamB])

  useEffect(() => {
    if (!remoteMap) return
    setConfirmState({
      status: 'idle',
      message: '',
      side: '',
      isLoading: false
    })
    setActionState({
      status: 'idle',
      message: '',
      isLoading: false
    })
    setMapScore({ A: '', B: '' })
    setMapDraft(current => ({
      type: remoteMap.mapType || current.type || MAP_TYPES[0],
      name: remoteMap.mapName || '',
      pickerSide: remoteMap.pickerSide || '',
      attackSide: remoteMap.attackSide || remoteMap.attack_side || ''
    }))

    setLineup({
      A: getLineupForRemoteMap(remoteRoom, remoteMap, 'A'),
      B: getLineupForRemoteMap(remoteRoom, remoteMap, 'B')
    })

    const nextBans = remoteMap.heroBans && typeof remoteMap.heroBans === 'object' && !Array.isArray(remoteMap.heroBans)
      ? normalizeHeroBanDraft(remoteMap.heroBans)
      : createEmptyHeroBans()
    const pickerSide = normalizeRoomSide(remoteMap.pickerSide) || 'A'
    const nextFirstSide = normalizeRoomSide(nextBans.firstSide) || pickerSide
    setBans(nextBans)
    setBanFirstSide(nextFirstSide)
  }, [remoteMap?.mapOrder, model.teamA, model.teamB])

  useEffect(() => {
    if (!remoteMap) return
    setLineup(current => ({
      A: remoteMap.lineupLocks?.A ? getLineupForRemoteMap(remoteRoom, remoteMap, 'A') : current.A,
      B: remoteMap.lineupLocks?.B ? getLineupForRemoteMap(remoteRoom, remoteMap, 'B') : current.B
    }))

    if (remoteMap.heroBans && typeof remoteMap.heroBans === 'object' && !Array.isArray(remoteMap.heroBans)) {
      const remoteBans = normalizeHeroBanDraft(remoteMap.heroBans)
      setBans(current => {
        const localBans = normalizeHeroBanDraft(current)
        return {
          ...localBans,
          ...remoteBans,
          A: remoteBans.A.hero || remoteBans.A.isPass ? remoteBans.A : localBans.A,
          B: remoteBans.B.hero || remoteBans.B.isPass ? remoteBans.B : localBans.B
        }
      })
      const nextFirstSide = normalizeRoomSide(remoteBans.firstSide)
      if (nextFirstSide) setBanFirstSide(nextFirstSide)
    }
  }, [remoteMap?.lineupLocks?.A, remoteMap?.lineupLocks?.B, remoteMap?.heroBanSubmittedAt])

  useEffect(() => {
    const currentMapOrder = remoteRoom?.room?.currentMapOrder || remoteMap?.mapOrder || 1
    const mapPickRule = getMapPickRule(model, currentMapOrder, locale)
    if (!mapPickRule) return

    setMapDraft(current => {
      const next = { ...current }
      if (mapPickRule.lockedMap) {
        next.type = mapPickRule.lockedMap.type
        next.name = mapPickRule.lockedMap.name
      } else if (mapPickRule.allowedMode) {
        const allowedType = getMapModeLabel(mapPickRule.allowedMode, locale)
        const currentMode = getMapModeByName(current.name)
        next.type = allowedType
        if (current.name && currentMode && currentMode !== mapPickRule.allowedMode) next.name = ''
      }
      if (mapPickRule.fixedPickerSide) next.pickerSide = mapPickRule.pickerSide || ''
      const nextMode = getMapModeByType(next.type) || getMapModeByName(next.name)
      if (!SIDE_CHOICE_MODES.has(nextMode)) next.attackSide = ''

      return next.type === current.type &&
        next.name === current.name &&
        next.pickerSide === current.pickerSide &&
        next.attackSide === current.attackSide
        ? current
        : next
    })
  }, [
    model,
    locale,
    remoteRoom?.room?.currentMapOrder,
    remoteMap?.mapOrder
  ])

  useEffect(() => {
    if (!seriesScore.played) return
    setFinalResult(result => ({
      ...result,
      scoreA: String(seriesScore.A),
      scoreB: String(seriesScore.B)
    }))
  }, [seriesScore.A, seriesScore.B, seriesScore.played])

  useEffect(() => {
    if (!remoteMap) return
    if (remoteMap.scoreA !== null && remoteMap.scoreA !== undefined && remoteMap.scoreB !== null && remoteMap.scoreB !== undefined) {
      setMapScore({ A: String(remoteMap.scoreA), B: String(remoteMap.scoreB) })
      return
    }

    const ownSide = roomPermission?.captainSides?.find(side => side === 'A' || side === 'B')
    const ownConfirmation = ownSide ? getConfirmation(remoteMap, ownSide) : null
    if (ownConfirmation) {
      setMapScore({
        A: String(ownConfirmation.scoreA),
        B: String(ownConfirmation.scoreB)
      })
      return
    }

    setMapScore({ A: '', B: '' })
  }, [remoteMap, roomPermission?.captainSides])

  const updateRoomStep = async (nextStep, { statePatch = null, currentMapOrder = null } = {}) => {
    const body = {
      status: getRoomStepStatus(nextStep),
      currentStep: nextStep
    }
    if (currentMapOrder) body.currentMapOrder = currentMapOrder
    if (statePatch) body.state = { ...getSafeRoomState(remoteRoom), ...statePatch }

    const data = await updateMatchRoomState(model.matchId, body)
    onRemoteRoomChange(data.room)
    return data.room
  }

  const setActionError = message => {
    setActionState({
      status: 'error',
      message,
      isLoading: false
    })
  }

  const handleStartMapPick = async () => {
    if (!canManageFlow) {
      setActionError('仅队长或赛管可以推进流程')
      return
    }

    const mapOrder = remoteRoom?.room?.currentMapOrder || remoteMap?.mapOrder || 1
    setActionState({
      status: 'loading',
      message: '正在进入地图选择',
      isLoading: true
    })

    try {
      await updateRoomStep(MATCH_ROOM_STEP_KEYS.MAP_PICK, { currentMapOrder: mapOrder })
      setActionState({
        status: 'success',
        message: '已进入地图选择',
        isLoading: false
      })
    } catch (error) {
      setActionError(error?.status === 401 ? '请先登录' : error?.status === 403 ? '当前账号不能推进流程' : '流程同步失败')
    }
  }

  const handleLockMap = async () => {
    const mapOrder = remoteRoom?.room?.currentMapOrder || remoteMap?.mapOrder || 1
    const mapPickRule = getMapPickRule(model, mapOrder, locale)
    const pickerSide = normalizeRoomSide(mapPickRule?.fixedPickerSide ? mapPickRule.pickerSide : mapDraft.pickerSide)
    const canConfirmOrganizerMap = Boolean(
      mapPickRule?.lockedMapId &&
      !pickerSide &&
      canManageRoomSide(roomPermission, 'A')
    )
    const canLockMap = mapPickRule?.lockedMapId && !pickerSide
      ? Boolean(roomPermission?.canManageAll || canConfirmOrganizerMap)
      : pickerSide
        ? canManageRoomSide(roomPermission, pickerSide)
        : Boolean(roomPermission?.canManageAll)
    if (!canLockMap) {
      setActionError(pickerSide ? `仅 TEAM ${pickerSide} 队长或赛管可以锁定本图` : '本图由赛管锁定')
      return
    }

    const forcedMap = mapPickRule?.lockedMap || null
    const mapName = forcedMap?.name || String(mapDraft.name || '').trim()
    const mapType = forcedMap?.type || mapDraft.type
    const mapMode = forcedMap?.mode || getMapModeByName(mapName) || getMapModeByType(mapType)
    const needsSideChoice = SIDE_CHOICE_MODES.has(mapMode)
    if (!mapName) {
      setActionError('请先填写地图名称')
      return
    }

    if (mapPickRule?.allowedMode && getMapModeByName(mapName) !== mapPickRule.allowedMode) {
      setActionError('首图只能选择占领要点地图')
      return
    }

    if (needsSideChoice && !mapDraft.attackSide) {
      setActionError('混合 / 运载地图需要选择先攻方')
      return
    }

    setActionState({
      status: 'loading',
      message: '正在锁定地图',
      isLoading: true
    })

    try {
      const data = await updateMatchRoomMap(model.matchId, mapOrder, {
        status: 'PICKED',
        mapType,
        mapName,
        pickerSide: mapPickRule?.fixedPickerSide ? mapPickRule.pickerSide || null : mapDraft.pickerSide || null,
        attackSide: needsSideChoice ? mapDraft.attackSide : null,
        defenseSide: needsSideChoice ? (mapDraft.attackSide === 'A' ? 'B' : 'A') : null
      })
      onRemoteMapChange(data.map)
      await updateRoomStep(MATCH_ROOM_STEP_KEYS.LINEUP_LOCK, { currentMapOrder: mapOrder })
      setActionState({
        status: 'success',
        message: '地图已锁定，进入首发锁定',
        isLoading: false
      })
    } catch (error) {
      setActionError(error?.status === 401 ? '请先登录' : error?.status === 403 ? '当前账号不能锁定地图' : '地图锁定失败')
    }
  }

  const handleLockLineup = async () => {
    if (!canManageFlow) {
      setActionError('仅队长或赛管可以锁定阵容')
      return
    }

    const sides = roomPermission?.canManageAll
      ? ['A', 'B']
      : ['A', 'B'].filter(side => canManageRoomSide(roomPermission, side))
    const editableSides = sides.filter(side => !remoteMap?.lineupLocks?.[side])
    if (!editableSides.length) {
      setActionError('你负责的本图首发已经锁定，不能撤回或重选')
      return
    }

    const normalizedLineup = {
      A: normalizeLineupSlots(lineup.A),
      B: normalizeLineupSlots(lineup.B)
    }
    const incompleteSide = editableSides.find(side => normalizedLineup[side].some(slot => !slot.playerKey))
    if (incompleteSide) {
      setActionError(`TEAM ${incompleteSide} 还有首发位置未选择`)
      return
    }

    const duplicateSide = editableSides.find(side => {
      const players = normalizedLineup[side].map(slot => slot.playerKey).filter(Boolean)
      return new Set(players).size !== players.length
    })
    if (duplicateSide) {
      setActionError(`TEAM ${duplicateSide} 首发不能重复选择同一名选手`)
      return
    }

    const mapOrder = remoteRoom?.room?.currentMapOrder || remoteMap?.mapOrder || 1
    const nextStep = model.heroBanEnabled ? MATCH_ROOM_STEP_KEYS.HERO_BAN : MATCH_ROOM_STEP_KEYS.IN_GAME
    const nextMapStatus = model.heroBanEnabled ? 'LINEUP_LOCKED' : 'LIVE'
    setActionState({
      status: 'loading',
      message: '正在锁定首发',
      isLoading: true
    })

    try {
      const mapPatch = { status: nextMapStatus }
      if (editableSides.includes('A')) mapPatch.lineupA = normalizedLineup.A
      if (editableSides.includes('B')) mapPatch.lineupB = normalizedLineup.B
      const data = await updateMatchRoomMap(model.matchId, mapOrder, mapPatch)
      onRemoteMapChange(data.map)
      const bothLocked = Boolean(data.map?.lineupLocks?.A && data.map?.lineupLocks?.B)
      if (bothLocked) {
        await updateRoomStep(nextStep, {
          currentMapOrder: mapOrder,
          statePatch: nextStep === MATCH_ROOM_STEP_KEYS.IN_GAME
            ? { liveStartedAt: new Date().toISOString() }
            : null
        })
      }
      setActionState({
        status: 'success',
        message: bothLocked
          ? model.heroBanEnabled ? '双方首发已锁定，进入 HERO BAN' : '双方首发已锁定，进入比赛进行'
          : `TEAM ${editableSides.join('/')} 首发已锁定，等待另一方`,
        isLoading: false
      })
    } catch (error) {
      setActionError(error?.status === 401 ? '请先登录' : error?.status === 403 ? '当前账号不能锁定阵容' : '阵容锁定失败')
    }
  }

  const handleSubmitBans = async () => {
    if (!canManageFlow) {
      setActionError('仅队长或赛管可以提交 HERO BAN')
      return
    }

    const normalizedBans = normalizeHeroBanDraft(bans)
    const remoteBans = normalizeHeroBanDraft(remoteMap?.heroBans || {})
    const hasChoice = ban => Boolean(ban?.hero || ban?.isPass || ban?.timeout)
    const isBanTimeout = Boolean(stepTimer?.expired)
    const pickerSide = normalizeRoomSide(remoteMap?.pickerSide) || 'A'
    const firstSide = normalizeRoomSide(banFirstSide) || normalizeRoomSide(remoteBans.firstSide) || pickerSide
    const managedSides = roomPermission?.canManageAll
      ? ['A', 'B']
      : ['A', 'B'].filter(side => canManageRoomSide(roomPermission, side))
    const editableSides = managedSides.filter(side => !hasChoice(remoteBans[side]))
    const canChooseOrder = Boolean(roomPermission?.canManageAll || canManageRoomSide(roomPermission, pickerSide))
    const firstBanLocked = hasChoice(remoteBans[firstSide])
    const orderOnly = Boolean(!roomPermission?.canManageAll && canChooseOrder && firstSide !== pickerSide && !firstBanLocked)
    const submissionSides = roomPermission?.canManageAll
      ? editableSides
      : editableSides.filter(side => side === firstSide || firstBanLocked)

    if (!editableSides.length) {
      setActionError('你负责的本图 HERO BAN 已经锁定')
      return
    }
    if (!submissionSides.length && !orderOnly) {
      setActionError(`请等待 TEAM ${firstSide} 先提交 HERO BAN`)
      return
    }

    const submittedBans = { ...normalizedBans }
    for (const side of submissionSides) {
      if (!hasChoice(submittedBans[side]) && isBanTimeout) {
        submittedBans[side] = { role: '', hero: '', isPass: true, timeout: true, reason: 'TIMEOUT' }
      }
    }

    if (!orderOnly && !isBanTimeout && submissionSides.some(side => !hasChoice(submittedBans[side]))) {
      setActionError(`请先选择 TEAM ${submissionSides.join('/')} 的禁用英雄`)
      return
    }

    const mapOrder = remoteRoom?.room?.currentMapOrder || remoteMap?.mapOrder || 1
    const effectiveBans = {
      ...submittedBans,
      A: hasChoice(remoteBans.A) ? remoteBans.A : submittedBans.A,
      B: hasChoice(remoteBans.B) ? remoteBans.B : submittedBans.B
    }
    const banRoleA = getHeroBanRoleKey(effectiveBans.A)
    const banRoleB = getHeroBanRoleKey(effectiveBans.B)
    if (banRoleA && banRoleB && banRoleA === banRoleB) {
      setActionError('同一张地图双方禁用英雄必须来自不同职责')
      return
    }

    for (const side of submissionSides) {
      const banKey = getHeroBanKey(submittedBans[side])
      if (banKey && getPriorTeamBanKeys(remoteRoom, mapOrder, side).has(banKey)) {
        const team = side === 'A' ? model.teamA : model.teamB
        setActionError(`${team.short} 本场已经禁用过该英雄`)
        return
      }
    }

    setActionState({
      status: 'loading',
      message: '正在提交 HERO BAN',
      isLoading: true
    })

    try {
      const heroBansPatch = {}
      for (const side of submissionSides) heroBansPatch[side] = submittedBans[side]
      if (canChooseOrder) {
        heroBansPatch.firstSide = firstSide
        heroBansPatch.pickerSide = pickerSide
      }
      const data = await updateMatchRoomMap(model.matchId, mapOrder, {
        status: 'LIVE',
        heroBans: heroBansPatch
      })
      onRemoteMapChange(data.map)
      const savedBans = normalizeHeroBanDraft(data.map?.heroBans || {})
      const bothSubmitted = hasChoice(savedBans.A) && hasChoice(savedBans.B)
      if (bothSubmitted) {
        await updateRoomStep(MATCH_ROOM_STEP_KEYS.IN_GAME, {
          currentMapOrder: mapOrder,
          statePatch: { liveStartedAt: new Date().toISOString() }
        })
      }
      setActionState({
        status: 'success',
        message: bothSubmitted
          ? '双方 HERO BAN 已提交，进入比赛进行'
          : orderOnly
            ? `BAN 顺序已锁定，等待 TEAM ${firstSide}`
            : `TEAM ${submissionSides.join('/')} HERO BAN 已锁定，等待另一方`,
        isLoading: false
      })
    } catch (error) {
      setActionError(error?.status === 401 ? '请先登录' : error?.status === 403 ? '当前账号不能提交 HERO BAN' : 'HERO BAN 提交失败')
    }
  }

  const handleMoveToMapResultConfirm = async () => {
    if (!canManageFlow) {
      setActionError('仅队长或赛管可以推进流程')
      return
    }

    const mapOrder = remoteRoom?.room?.currentMapOrder || remoteMap?.mapOrder || 1
    setActionState({
      status: 'loading',
      message: '正在进入小分确认',
      isLoading: true
    })

    try {
      const data = await updateMatchRoomMap(model.matchId, mapOrder, {
        status: 'CONFIRMING'
      })
      onRemoteMapChange(data.map)
      await updateRoomStep(MATCH_ROOM_STEP_KEYS.MAP_RESULT_CONFIRM, { currentMapOrder: mapOrder })
      setActionState({
        status: 'success',
        message: '已进入地图结果确认',
        isLoading: false
      })
    } catch (error) {
      setActionError(error?.status === 401 ? '请先登录' : error?.status === 403 ? '当前账号不能推进流程' : '流程同步失败')
    }
  }

  const handleConfirmSide = async side => {
    const scoreA = Number(mapScore.A)
    const scoreB = Number(mapScore.B)
    const hasScoreText = String(mapScore.A).trim() !== '' && String(mapScore.B).trim() !== ''
    if (!hasScoreText || !Number.isInteger(scoreA) || scoreA < 0 || !Number.isInteger(scoreB) || scoreB < 0) {
      setConfirmState({
        status: 'error',
        message: '请先填写有效小分',
        side,
        isLoading: false
      })
      return
    }

    const mapOrder = remoteMap?.mapOrder || remoteRoom?.room?.currentMapOrder || 1
    setConfirmState({
      status: 'loading',
      message: '正在提交确认',
      side,
      isLoading: true
    })

    try {
      const data = await confirmMatchRoomMapResult(model.matchId, mapOrder, {
        side,
        scoreA,
        scoreB
      })
      onRemoteMapChange(data.map)
      setConfirmState({
        status: 'success',
        message: data.map?.status === 'COMPLETE' || data.map?.status === 'DRAW'
          ? '双方小分一致，地图结果已锁定'
          : data.map?.status === 'DISPUTED'
            ? '双方小分不一致，流程已冻结并通知赛管'
            : '已提交，等待另一方独立填写',
        side: '',
        isLoading: false
      })
    } catch (error) {
      const status = error?.status === 401
        ? '请先登录'
        : error?.status === 403
          ? '当前账号不能确认这一方'
          : error?.message || '提交失败，请稍后重试'
      setConfirmState({
        status: 'error',
        message: status,
        side: '',
        isLoading: false
      })
    }
  }

  const handleResolveResult = async () => {
    const scoreA = Number(mapScore.A)
    const scoreB = Number(mapScore.B)
    const hasScoreText = String(mapScore.A).trim() !== '' && String(mapScore.B).trim() !== ''
    if (!hasScoreText || !Number.isInteger(scoreA) || scoreA < 0 || !Number.isInteger(scoreB) || scoreB < 0) {
      setConfirmState({
        status: 'error',
        message: '赛管裁定必须填写双方最终整数小分',
        side: 'REFEREE',
        isLoading: false
      })
      return
    }

    const mapOrder = remoteMap?.mapOrder || remoteRoom?.room?.currentMapOrder || 1
    setConfirmState({ status: 'loading', message: '正在提交赛管裁定', side: 'REFEREE', isLoading: true })
    try {
      const data = await resolveMatchRoomMapResult(model.matchId, mapOrder, {
        scoreA,
        scoreB,
        note: '赛管核对双方截图后裁定'
      })
      onRemoteMapChange(data.map)
      setConfirmState({
        status: 'success',
        message: '争议已裁定，地图结果已锁定',
        side: '',
        isLoading: false
      })
    } catch (error) {
      setConfirmState({
        status: 'error',
        message: error?.status === 403 ? '只有赛管可以裁定争议' : error?.message || '裁定提交失败',
        side: '',
        isLoading: false
      })
    }
  }

  const handleAdvanceNextMap = async () => {
    if (!canManageFlow) {
      setActionError('仅队长或赛管可以推进下一张地图')
      return
    }

    if (!mapProgression.isLocked) {
      setActionError('请先完成当前地图双方小分确认')
      return
    }

    if (mapProgression.winnerSide) {
      setActionError('已达到 FT 胜场，请进入完整赛果提交')
      return
    }

    const nextMapOrder = mapProgression.nextMapOrder
    const nextPickerSide = mapProgression.nextPickerSide || null
    setActionState({
      status: 'loading',
      message: '正在进入下一张地图',
      isLoading: true
    })

    try {
      const data = await updateMatchRoomMap(model.matchId, nextMapOrder, {
        status: 'PENDING',
        pickerSide: nextPickerSide
      })
      onRemoteMapChange(data.map)
      await updateRoomStep(MATCH_ROOM_STEP_KEYS.MAP_PICK, {
        currentMapOrder: nextMapOrder
      })
      setMapScore({ A: '', B: '' })
      setBans(createEmptyHeroBans())
      setBanFirstSide(normalizeRoomSide(nextPickerSide) || 'A')
      setMapDraft(current => ({
        ...current,
        name: '',
        pickerSide: nextPickerSide || '',
        attackSide: ''
      }))
      setActionState({
        status: 'success',
        message: `已进入 MAP ${String(nextMapOrder).padStart(2, '0')}`,
        isLoading: false
      })
    } catch (error) {
      setActionError(error?.status === 401 ? '请先登录' : error?.status === 403 ? '当前账号不能推进下一张地图' : '下一张地图同步失败')
    }
  }

  const handleAdvanceFinal = async () => {
    if (!canManageFlow) {
      setActionError('仅队长或赛管可以结束比赛')
      return
    }

    if (!mapProgression.winnerSide) {
      setActionError('还没有队伍达到目标胜场')
      return
    }

    setActionState({
      status: 'loading',
      message: '正在进入完整赛果提交',
      isLoading: true
    })

    try {
      await updateRoomStep(MATCH_ROOM_STEP_KEYS.MATCH_FINISHED)
      setFinalResult(result => ({
        ...result,
        scoreA: String(mapProgression.score.A),
        scoreB: String(mapProgression.score.B)
      }))
      setActionState({
        status: 'success',
        message: '已进入完整赛果提交',
        isLoading: false
      })
    } catch (error) {
      setActionError(error?.status === 401 ? '请先登录' : error?.status === 403 ? '当前账号不能结束比赛' : '进入完整赛果失败')
    }
  }

  const handleSubmitFinal = async () => {
    if (!canManageFlow) {
      setSubmitState({
        status: 'error',
        message: '仅队长或赛管可以提交完整赛果',
        isLoading: false
      })
      return
    }

    const scoreA = Number(finalResult.scoreA)
    const scoreB = Number(finalResult.scoreB)
    const winnerSide = getFinalWinnerSide(scoreA, scoreB)
    const replayCode = String(finalResult.replayCode || '').trim().toUpperCase()

    if (!winnerSide) {
      setSubmitState({
        status: 'error',
        message: '请先填写有效总比分，且双方地图胜不能相同',
        isLoading: false
      })
      return
    }

    if (!canManageRoomSide(roomPermission, winnerSide)) {
      setSubmitState({
        status: 'error',
        message: '仅胜方队长或赛管可以提交完整赛果',
        isLoading: false
      })
      return
    }

    if (!replayCode) {
      setSubmitState({
        status: 'error',
        message: '请填写回放代码',
        isLoading: false
      })
      return
    }

    setSubmitState({
      status: 'loading',
      message: '正在提交完整赛果',
      isLoading: true
    })

    try {
      const data = await submitMatchRoomFinalResult(model.matchId, {
        winnerTeamId: getWinnerTeamId(model, winnerSide),
        scoreA,
        scoreB,
        replayCode,
        payload: buildFinalSubmissionPayload(remoteRoom),
        note: finalResult.notes
      })
      setSubmitState({
        status: 'success',
        message: '完整赛果已提交',
        isLoading: false
      })
      onRemoteMapChange(null, data.finalSubmission)
    } catch (error) {
      const message = error?.status === 401
        ? '请先登录'
        : error?.status === 403
          ? '当前账号不能提交完整赛果'
          : '完整赛果提交失败'
      setSubmitState({
        status: 'error',
        message,
        isLoading: false
      })
    }
  }

  if (activeStep === MATCH_ROOM_STEP_KEYS.MAP_PICK) {
    return (
      <MapPickPanel
        mapDraft={mapDraft}
        setMapDraft={setMapDraft}
        model={model}
        remoteRoom={remoteRoom}
        remoteMap={remoteMap}
        locale={locale}
        roomPermission={roomPermission}
        actionState={actionState}
        onLockMap={handleLockMap}
        timer={stepTimer}
      />
    )
  }

  if (activeStep === MATCH_ROOM_STEP_KEYS.LINEUP_LOCK) {
    return (
      <LineupPanel
        model={model}
        lineup={lineup}
        setLineup={setLineup}
        roomPermission={roomPermission}
        actionState={actionState}
        onLockLineup={handleLockLineup}
        remoteMap={remoteMap}
      />
    )
  }

  if (activeStep === MATCH_ROOM_STEP_KEYS.HERO_BAN) {
    return (
      <BanPanel
        model={model}
        bans={bans}
        setBans={setBans}
        banFirstSide={banFirstSide}
        setBanFirstSide={setBanFirstSide}
        remoteRoom={remoteRoom}
        remoteMap={remoteMap}
        locale={locale}
        roomPermission={roomPermission}
        actionState={actionState}
        onSubmitBans={handleSubmitBans}
        timer={stepTimer}
      />
    )
  }

  if (activeStep === MATCH_ROOM_STEP_KEYS.MAP_RESULT_CONFIRM) {
    return (
      <MapResultPanel
        model={model}
        mapScore={mapScore}
        setMapScore={setMapScore}
        remoteMap={remoteMap}
        confirmState={confirmState}
        actionState={actionState}
        roomPermission={roomPermission}
        mapProgression={mapProgression}
        onConfirmSide={handleConfirmSide}
        onResolveResult={handleResolveResult}
        onAdvanceNextMap={handleAdvanceNextMap}
        onAdvanceFinal={handleAdvanceFinal}
      />
    )
  }

  if (activeStep === MATCH_ROOM_STEP_KEYS.MATCH_FINISHED) {
    return (
      <FinalResultPanel
        model={model}
        finalResult={finalResult}
        setFinalResult={setFinalResult}
        remoteRoom={remoteRoom}
        roomPermission={roomPermission}
        submitState={submitState}
        onSubmitFinal={handleSubmitFinal}
      />
    )
  }

  if (activeStep === MATCH_ROOM_STEP_KEYS.IN_GAME || activeStep === MATCH_ROOM_STEP_KEYS.READY_CHECK) {
    return (
      <GameReturnPanel
        model={model}
        remoteRoom={remoteRoom}
        remoteMap={remoteMap}
        roomPermission={roomPermission}
        actionState={actionState}
        onMoveToMapResultConfirm={handleMoveToMapResultConfirm}
        locale={locale}
      />
    )
  }

  if (activeStep === MATCH_ROOM_STEP_KEYS.WAITING) {
    return (
      <LobbyPanel
        model={model}
        now={now}
        remoteRoom={remoteRoom}
        roomPermission={roomPermission}
        actionState={actionState}
        onStartMapPick={handleStartMapPick}
        teamA={teamA}
        teamB={teamB}
        lineup={lineup}
        staff={staff}
      />
    )
  }

  return (
    <GameReturnPanel
      model={model}
      remoteRoom={remoteRoom}
      remoteMap={remoteMap}
      roomPermission={roomPermission}
      actionState={actionState}
      onMoveToMapResultConfirm={handleMoveToMapResultConfirm}
      locale={locale}
    />
  )
}

export default function MatchRoomPage() {
  const { user: currentUser, isAuthenticated, isBootstrapping, isAccountDataLoading, accountDataError, refreshAccountData } = useAuth()
  const context = useOutletContext() || {}
  const {
    db,
    withSeason = path => path,
    locale = 'zh-CN',
    accountIdentity,
    accountCapabilities,
    accountIdentityTarget
  } = context
  const { matchId } = useParams()
  const navigate = useNavigate()
  const roomText = (zh, en) => locale === 'en-US' ? en : zh
  const openAccount = () => window.dispatchEvent(new CustomEvent('fries-cup:open-account'))
  useEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: 'instant' }) }, [matchId])
  const model = useMemo(() => buildMatchRoomModel({
    db,
    matchId,
    accountIdentity,
    accountCapabilities,
    accountIdentityTarget,
    locale
  }), [db, matchId, accountIdentity, accountCapabilities, accountIdentityTarget, locale])
  const [activeStep, setActiveStep] = useState(MATCH_ROOM_STEP_KEYS.WAITING)
  const [lineup, setLineup] = useState(() => model ? ({
    A: getInitialLineup(model.teamA),
    B: getInitialLineup(model.teamB)
  }) : { A: [], B: [] })
  const [remoteRoom, setRemoteRoom] = useState(null)
  const [syncState, setSyncState] = useState({
    status: 'idle',
    label: uiText("本地预览", locale),
    isLoading: false,
    lastSyncedAt: null
  })
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false)
  const [captainTransferState, setCaptainTransferState] = useState({
    status: 'idle',
    message: '',
    side: '',
    isLoading: false
  })
  const now = useRoomClock()
  const roomLifecycle = useMemo(
    () => getMatchRoomLifecycle(model?.match, { now, room: remoteRoom?.room }),
    [model?.match, now, remoteRoom?.room]
  )
  const roomTeamA = useMemo(() => model ? buildRoomTeam(model.teamA, remoteRoom) : null, [model, remoteRoom])
  const roomTeamB = useMemo(() => model ? buildRoomTeam(model.teamB, remoteRoom) : null, [model, remoteRoom])
  const roomStaff = useMemo(() => model ? buildRoomStaff(model, remoteRoom) : null, [model, remoteRoom])
  const roomPermission = useMemo(
    () => getRoomPermission(remoteRoom, currentUser, { ...roomLifecycle, canOperate: roomLifecycle.canOperate && syncState.status === 'connected' }),
    [remoteRoom, currentUser, roomLifecycle, syncState.status]
  )

  const applyRemoteRoomData = (data, { label } = {}) => {
    setRemoteRoom(data)
    if (data?.room?.currentStep) setActiveStep(data.room.currentStep)
    const identityTargetIds = new Set(
      (data?.access?.identities || [])
        .flatMap(identity => [identity?.targetId, identity?.id])
        .filter(Boolean)
        .map(String)
    )
    const isCheckedIn = (data?.room?.participants || []).some(participant => {
      if (!participant?.isOnline) return false
      return [participant?.targetId, participant?.userId, participant?.id]
        .filter(Boolean)
        .some(id => identityTargetIds.has(String(id)))
    })
    const accessLabel = data?.access?.label || '已连接'
    const resolvedLabel = label || (isCheckedIn ? `${accessLabel} 已签到` : accessLabel)

    setSyncState({
      status: 'connected',
      label: roomLifecycle.isReadOnly ? uiText("比赛记录 · 只读", locale) : resolvedLabel,
      isLoading: false,
      lastSyncedAt: Date.now()
    })
  }

  useEffect(() => {
    if (model?.initialStep) setActiveStep(model.initialStep)
  }, [model?.matchId, model?.initialStep])

  useEffect(() => {
    if (!model) return
    setLineup({
      A: getInitialLineup(model.teamA),
      B: getInitialLineup(model.teamB)
    })
  }, [model?.matchId])

  useEffect(() => {
    if (!model?.matchId || !model.access?.canEnter || !roomLifecycle.canEnter) {
      setRemoteRoom(null)
      setSyncState({
        status: roomLifecycle.state === 'LOCKED' ? 'locked' : 'idle',
        label: model?.access?.canEnter ? roomLifecycle.label : model?.access?.label || uiText("无房间权限", locale),
        isLoading: false
      })
      return undefined
    }

    let alive = true
    let requestInFlight = false

    const syncRoom = async ({ quiet = false } = {}) => {
      if (requestInFlight) return
      requestInFlight = true
      if (!quiet) {
        setSyncState(current => ({
          ...current,
          status: 'loading',
          label: uiText("同步中", locale),
          isLoading: true
        }))
      }

      try {
        const data = await fetchMatchRoom(model.matchId)
        if (!alive) return
        applyRemoteRoomData(data)
      } catch (error) {
        if (!alive) return
        const nextSyncState = getSyncErrorState(error, {
          forbidden: '非本场人员',
          missing: '房间未创建',
          offline: '后端未连接'
        })

        if ([401, 403, 404].includes(error?.status)) setRemoteRoom(null)
        setSyncState({
          ...nextSyncState,
          isLoading: false
        })
      } finally {
        requestInFlight = false
      }
    }

    syncRoom()
    const pollId = window.setInterval(() => syncRoom({ quiet: true }), 3000)
    const unsubscribe = subscribeMatchRoom(model.matchId, () => syncRoom({ quiet: true }))

    return () => {
      alive = false
      window.clearInterval(pollId)
      unsubscribe()
    }
  }, [model?.matchId, model?.access?.canEnter, accountIdentity?.status, roomLifecycle.canEnter, roomLifecycle.label, roomLifecycle.state])

  useEffect(() => {
    if (!model?.matchId || !remoteRoom?.access?.canEnter || roomLifecycle.isReadOnly) return undefined

    let alive = true
    let hasSignedIn = false
    const getSignedInLabel = data => data?.access?.label ? `${data.access.label} 已签到` : '已签到'

    const syncPresence = async ({ quiet = false } = {}) => {
      try {
        const data = await checkInMatchRoom(model.matchId, true, quiet ? { keepalive: true } : {})
        hasSignedIn = true
        if (!alive) return
        applyRemoteRoomData(data, { label: getSignedInLabel(data) })
      } catch (error) {
        if (!alive) return
        const nextSyncState = getSyncErrorState(error, {
          forbidden: '无房间权限',
          offline: '在线同步失败'
        })
        setSyncState(current => ({
          ...current,
          ...nextSyncState,
          isLoading: false
        }))
      }
    }

    const signOut = () => {
      if (!hasSignedIn) return
      checkInMatchRoom(model.matchId, false, { keepalive: true }).catch(() => {})
    }

    syncPresence()
    const heartbeatId = window.setInterval(() => syncPresence({ quiet: true }), PRESENCE_HEARTBEAT_MS)
    window.addEventListener('pagehide', signOut)

    return () => {
      alive = false
      window.clearInterval(heartbeatId)
      window.removeEventListener('pagehide', signOut)
      signOut()
    }
  }, [model?.matchId, remoteRoom?.access?.canEnter, roomLifecycle.isReadOnly])

  const handleCheckIn = async () => {
    if (!model?.matchId || roomLifecycle.isReadOnly) return
    setSyncState(current => ({
      ...current,
      label: uiText("签到中", locale),
      isLoading: true
    }))

    try {
      const data = await checkInMatchRoom(model.matchId, true)
      applyRemoteRoomData(data, {
        label: data?.access?.label ? uiText("{0} 已签到", locale, [data.access.label]) : uiText("已签到", locale)
      })
    } catch (error) {
      const nextSyncState = getSyncErrorState(error, {
        forbidden: '无房间权限',
        offline: '签到失败'
      })
      setSyncState({
        ...nextSyncState,
        isLoading: false
      })
    }
  }

  const handleBack = () => {
    navigate(withSeason(model?.matchId ? `/matches/${model.matchId}` : '/matches'))
  }

  const handleRemoteRoomChange = nextRoom => {
    setRemoteRoom(current => mergeRemoteRoom(current, nextRoom))
    if (nextRoom?.currentStep) setActiveStep(nextRoom.currentStep)
    setSyncState(current => ({ ...current, lastSyncedAt: Date.now() }))
  }

  const handleTransferCaptain = async (side, targetUserId) => {
    if (!model?.matchId || !targetUserId) return false
    setCaptainTransferState({
      status: 'loading',
      message: '正在转交队长',
      side,
      isLoading: true
    })
    try {
      const data = await transferMatchRoomCaptain(model.matchId, {
        side,
        targetUserId,
        note: '比赛房间内转交队长'
      })
      applyRemoteRoomData(data, { label: data?.access?.label || uiText("队长已更新", locale) })
      setCaptainTransferState({
        status: 'success',
        message: '队长已转交，操作权限已立即切换',
        side,
        isLoading: false
      })
      return true
    } catch (error) {
      setCaptainTransferState({
        status: 'error',
        message: error?.status === 403
          ? '只有现任队长或赛管可以转交'
          : error?.message || '队长转交失败',
        side,
        isLoading: false
      })
      return false
    }
  }

  const handleRemoteMapChange = (nextMap, finalSubmission = null) => {
    setRemoteRoom(current => {
      const withMap = nextMap ? mergeRemoteMap(current, nextMap) : current
      return finalSubmission ? mergeRemoteFinalSubmission(withMap, finalSubmission) : withMap
    })
    setSyncState(current => ({ ...current, lastSyncedAt: Date.now() }))
    if (finalSubmission) setActiveStep(MATCH_ROOM_STEP_KEYS.MATCH_FINISHED)
  }

  const handleSelectStep = async stepKey => {
    setActiveStep(stepKey)
    if (!model?.matchId || !roomPermission.canManageFlow) return

    setSyncState(current => ({
      ...current,
      label: uiText("同步阶段中", locale),
      isLoading: true
    }))

    try {
      const data = await updateMatchRoomState(model.matchId, {
        status: getRoomStepStatus(stepKey),
        currentStep: stepKey
      })
      handleRemoteRoomChange(data.room)
      setSyncState(current => ({
        ...current,
        status: 'connected',
        label: remoteRoom?.access?.label || uiText("已同步", locale),
        isLoading: false,
        lastSyncedAt: Date.now()
      }))
    } catch (error) {
      const nextSyncState = getSyncErrorState(error, {
        forbidden: '无阶段权限',
        offline: '阶段同步失败'
      })
      setSyncState({
        ...nextSyncState,
        isLoading: false
      })
    }
  }

  if (!model) {
    return (
      <main className={styles.shell} data-design="signal">
        <div className={styles.statePanel}>
          <h1>{uiText("比赛房间不存在", locale)}</h1>
          <p>{matchId}</p>
          <button type="button" onClick={handleBack}>{uiText("返回赛程", locale)}</button>
        </div>
      </main>
    )
  }

  if (isBootstrapping || isAccountDataLoading || accountDataError || !isAuthenticated || !model.access?.canEnter) {
    const checking = isBootstrapping || isAccountDataLoading
    const serviceUnavailable = Boolean(accountDataError && ![401, 403].includes(Number(accountDataError.status)))
    const title = checking ? roomText('正在确认身份', 'Checking your account')
      : serviceUnavailable ? roomText('账户服务暂时不可用', 'Account service unavailable')
        : !isAuthenticated ? roomText('登录后进入比赛房', 'Sign in to enter the match room')
          : roomText('当前账号无比赛房权限', 'This account cannot enter the match room')
    return (
      <main className={styles.shell} data-design="signal">
        <div className={styles.statePanel} data-i18n-ignore aria-busy={checking}>
          <h1>{title}</h1>
          <p>{checking ? roomText('正在核对本场比赛的身份与权限。', 'Checking your identity and access for this match.')
            : serviceUnavailable ? roomText('暂时无法核对登录状态与比赛身份，请稍后重试。', 'Your session and match identity could not be checked. Please retry shortly.')
              : !isAuthenticated ? roomText('请登录本场参赛或执赛账号，系统将核对你的比赛房权限。', 'Sign in with your participant or match staff account to check room access.')
                : roomText('请在账号中心核对认证身份，或联系赛事组确认本场安排。', 'Check your verified identity in the account center, or contact the organizer about your assignment.')}</p>
          <div className={styles.stateActions}>
            {!checking ? <button type="button" onClick={openAccount}>{roomText(isAuthenticated ? '查看账号身份' : '登录账号', isAuthenticated ? 'Open account' : 'Sign in')}</button> : null}
            {serviceUnavailable ? <button type="button" onClick={() => isAuthenticated ? refreshAccountData().catch(() => {}) : window.location.reload()}>{roomText('重试', 'Retry')}</button> : null}
            <button type="button" onClick={handleBack}>{roomText('返回比赛详情', 'Back to match details')}</button>
          </div>
        </div>
      </main>
    )
  }

  if (!roomLifecycle.canEnter) {
    return (
      <main className={styles.shell} data-design="signal">
        <div className={styles.statePanel}>
          <span>ROOM LOCKED</span>
          <h1>{roomLifecycle.actionLabel}</h1>
          <p>{roomLifecycle.label}{uiText("。每场比赛可单独配置，当前默认赛前 15 分钟开放。", locale)}</p>
          <button type="button" onClick={handleBack}>{uiText("返回比赛详情", locale)}</button>
        </div>
      </main>
    )
  }

  if (!remoteRoom && ['unauthorized', 'forbidden', 'missing', 'error', 'offline'].includes(syncState.status)) {
    return (
      <main className={styles.shell} data-design="signal">
        <div className={styles.statePanel}>
          <h1>{syncState.label}</h1>
          <p>{roomText('比赛房暂时无法载入。请核对账号或稍后重试，也可以返回公开比赛记录。', 'The room could not be loaded. Check your account, retry shortly, or return to the public match record.')}</p>
          <div className={styles.stateActions}>
            {syncState.status === 'unauthorized' ? <button type="button" onClick={openAccount}>{roomText('重新登录', 'Sign in again')}</button> : null}
            <button type="button" onClick={() => window.location.reload()}>{roomText('重新载入', 'Reload')}</button>
            <button type="button" onClick={handleBack}>{roomText('返回比赛详情', 'Back to match details')}</button>
          </div>
        </div>
      </main>
    )
  }

  const displayTeamA = roomTeamA || model.teamA
  const displayTeamB = roomTeamB || model.teamB

  return <MatchRoomSurface model={model} withSeason={withSeason} onBack={handleBack} syncState={syncState} onCheckIn={handleCheckIn} activeStep={activeStep} roomLifecycle={roomLifecycle} onSelect={handleSelectStep} staff={roomStaff} onOpenStaff={() => setIsStaffModalOpen(true)} remoteRoom={remoteRoom} locale={locale} teamA={displayTeamA} teamB={displayTeamB} lineup={lineup} roomPermission={roomPermission} captainTransferState={captainTransferState} onTransferCaptain={handleTransferCaptain} overlay={isStaffModalOpen ? <StaffModal staff={roomStaff} onClose={() => setIsStaffModalOpen(false)} /> : null}>
        <Workspace
          model={model}
          activeStep={activeStep}
          remoteRoom={remoteRoom}
          roomPermission={roomPermission}
          lineup={lineup}
          setLineup={setLineup}
          locale={locale}
          staff={roomStaff}
          teamA={displayTeamA}
          teamB={displayTeamB}
          onRemoteMapChange={handleRemoteMapChange}
          onRemoteRoomChange={handleRemoteRoomChange}
        />
  </MatchRoomSurface>
}

// The same visual surface is used by the live room and the development fixture.
// It owns no API calls; permissions and mutations stay with the live controller.
export function MatchRoomSurface({ model, withSeason, onBack, syncState, onCheckIn, activeStep, roomLifecycle, onSelect, staff, onOpenStaff, remoteRoom, locale, teamA = model.teamA, teamB = model.teamB, lineup, roomPermission, captainTransferState, onTransferCaptain, children, overlay }) {
  return <main className={styles.shell} data-design="signal">
    <Header model={model} withSeason={withSeason} onBack={onBack} syncState={syncState} onCheckIn={onCheckIn} activeStep={activeStep} roomLifecycle={roomLifecycle} />
    <FlowStatusRow model={model} activeStep={activeStep} onSelect={onSelect} staff={staff} onOpenStaff={onOpenStaff} />
    <SeriesStatusBar model={model} remoteRoom={remoteRoom} activeStep={activeStep} locale={locale} />
    <div className={styles.roomGrid}>
      <TeamControlPanel team={teamA} lineup={lineup} roomPermission={roomPermission} activeStep={activeStep} captainTransferState={captainTransferState} onTransferCaptain={onTransferCaptain} />
      {children}
      <TeamControlPanel team={teamB} lineup={lineup} roomPermission={roomPermission} activeStep={activeStep} captainTransferState={captainTransferState} onTransferCaptain={onTransferCaptain} />
    </div>{overlay}
  </main>
}
