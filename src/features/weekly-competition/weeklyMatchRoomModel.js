const FINAL_STATES = new Set(['FINALIZED', 'OVERRIDDEN'])
const WRITABLE_WEEKS = new Set(['PUBLISHED', 'IN_PROGRESS', 'RESULT_REVIEW'])
const TERMINAL_STATES = new Set(['CLOSED', 'CANCELLED'])
const RESPONSE_STATES = new Set(['PENDING', 'CONFIRMED', 'DISPUTED'])

export const WEEKLY_RESPONSE_LABELS = {
  PENDING: '待响应',
  CONFIRMED: '已确认',
  DISPUTED: '已提出争议',
  FINALIZED: '已结算',
  OVERRIDDEN: '管理员已裁定',
  EXPIRED: '旧确认已失效'
}

export function weeklyTeamName(team) {
  return team?.shortName || team?.name || '队伍待确认'
}

export function weeklyRoomScore(room) {
  return Number.isInteger(room?.scoreA) && Number.isInteger(room?.scoreB)
    ? `${room.scoreA} : ${room.scoreB}`
    : '— : —'
}

export function weeklyMatchPhase(room) {
  if (room?.status === 'CANCELLED' || room?.week?.status === 'CANCELLED' || room?.cycle?.status === 'CANCELLED') return 'cancelled'
  if (FINAL_STATES.has(room?.confirmationState)) return 'settled'
  if (room?.week?.status === 'CLOSED' || room?.cycle?.status === 'CLOSED') return 'closed'
  if (room?.ready !== true && ['PENDING', 'SCHEDULED', 'READY'].includes(room?.status)) return 'scheduled'
  if (room?.ready !== true && room?.status === 'IN_PROGRESS') return 'live'
  return room?.ready === true ? 'response' : 'review'
}

export function weeklyRoomStatus(room, { readOnly = false } = {}) {
  const phase = weeklyMatchPhase(room)
  if (phase === 'cancelled') {
    return { label: '已取消', tone: 'quiet', detail: '比赛或所属周赛已取消，记录仅供查看。' }
  }
  if (phase === 'closed') return { label: '已结束 · 记录只读', tone: 'quiet', detail: '本周或所属周期已结束。已有赛果与响应保留供核对，如需更正请联系管理员。' }
  if (phase === 'scheduled') return { label: room.scheduledAt ? '等待开赛' : '比赛时间待定', tone: 'yellow', detail: room.scheduledAt ? '赛程已发布。请在下方查看房间安排，核对队伍准备状态；遇到问题可在本页提交给赛管。' : '本队配对已发布，等待管理员确认比赛时间。' }
  if (phase === 'live') return { label: '比赛进行中', tone: 'yellow', detail: '比赛正在进行，当前无需确认赛果。正式结果通过审核后，队长或经理再代表本队响应。' }
  if (room?.ready === false && phase === 'review' && room.confirmationState !== 'STALE') return { label: '赛果待审核', tone: 'quiet', detail: '比赛结果尚未完成正式审核，请等待裁判与管理员处理。' }
  if (room?.confirmationState === 'PENDING' && room.myTeams?.length) {
    const current = room.myTeams.filter(team => team.confirmation?.isCurrent === true && team.confirmation.revision === room.revision)
    if (current.length !== room.myTeams.length) return { label: '确认状态待同步', tone: 'yellow', detail: '本队响应与当前赛果修订尚未对齐，请刷新核对，等待管理员重新开启确认。' }
    if (current.length === room.myTeams.length && current.every(team => team.confirmation.status === 'CONFIRMED')) {
      return { label: current.length === 1 ? '本队已确认 · 等待对手' : '本队已确认 · 等待同步', tone: 'quiet', detail: current.length === 1 ? '本队已接受当前赛果，等待对手响应；无需重复确认。双方确认后由管理员结算。' : '本账号关联队伍已确认当前赛果，请刷新核对双方状态，再等待管理员结算。' }
    }
    if (current.some(team => team.confirmation.status === 'PENDING')) {
      const canAct = current.some(team => team.confirmation.status === 'PENDING' && weeklyResponseAccess(room, team, { readOnly }).allowed)
      return { label: canAct ? '待本队确认' : '等待队伍确认', tone: 'yellow', detail: canAct ? '请核对已审核比分，再代表下方待响应的队伍确认或提出争议。' : '等待本队队长或经理核对比分并响应；当前账号仅可查看。' }
    }
  }
  const states = {
    FINALIZED: { label: '已结算', tone: 'mint', detail: '管理员已完成积分结算，当前赛果确认已锁定。' },
    OVERRIDDEN: { label: '管理员已裁定', tone: 'mint', detail: '管理员已留下裁定并完成结算；如需更正，可在下方提交问题并跟踪赛管处理。' },
    DISPUTED: { label: '争议处理中', tone: 'red', detail: '至少一方提出争议，标准积分结算已冻结，等待周赛管理员处理。' },
    STALE: { label: '赛果已更新', tone: 'yellow', detail: '旧修订的确认已失效。请核对当前比分，等待管理员重新开启确认。' },
    CONFIRMED: { label: '双方已确认', tone: 'mint', detail: '双方已接受当前赛果，等待管理员按规则结算；确认不会自动增加积分。' },
    PENDING: { label: '等待双方确认', tone: 'yellow', detail: readOnly
      ? '等待本队队长或经理核对比分并响应；当前账号仅可查看。'
      : '请核对已审核比分，再代表本队确认或提出争议。' }
  }
  return states[room?.confirmationState] || (room?.ready
    ? { label: '等待开启确认', tone: 'quiet', detail: '赛果已通过审核，等待管理员为当前修订开启双方确认。' }
    : { label: '赛果待审核', tone: 'quiet', detail: '正式赛果仍由裁判提交与审核；审核完成前不能在这里确认。' })
}

export function buildWeeklyRoomJourney(room, options) {
  const phase = weeklyMatchPhase(room)
  const state = weeklyRoomStatus(room, options)
  const preMatch = ['scheduled', 'live'].includes(phase)
  const terminal = ['cancelled', 'closed', 'settled'].includes(phase)
  const teamConfirmed = ['CONFIRMED', 'FINALIZED', 'OVERRIDDEN'].includes(room?.confirmationState)
  const stages = preMatch ? [
    { key: 'schedule', en: 'SCHEDULE', label: room.scheduledAt ? '赛程已发布' : '等待比赛时间', state: room.scheduledAt ? 'done' : 'current' },
    { key: 'match', en: 'MATCH', label: phase === 'live' ? '比赛进行中' : '核对安排与准备', state: phase === 'live' || room.scheduledAt ? 'current' : 'waiting' },
    { key: 'result', en: 'RESULT', label: '赛后核对赛果', state: 'waiting' }
  ] : [
    { key: 'official', en: 'OFFICIAL', label: room?.ready ? '赛果已审核' : terminal ? '赛果未完成审核' : '等待赛果审核', state: room?.ready ? 'done' : terminal ? 'quiet' : 'current' },
    { key: 'response', en: 'TEAM RESPONSE', label: terminal && phase !== 'settled' ? '响应记录只读' : room?.ready ? state.label : '审核后开启确认', state: teamConfirmed ? 'done' : terminal ? 'quiet' : room?.ready ? 'current' : 'waiting' },
    { key: 'settlement', en: 'SETTLEMENT', label: phase === 'settled' ? '结算已完成' : terminal ? '结算记录由管理员核对' : room?.confirmationState === 'DISPUTED' ? '等待管理员处理争议' : teamConfirmed ? '等待管理员结算' : '确认后进入结算', state: phase === 'settled' ? 'done' : terminal ? 'quiet' : room?.confirmationState === 'DISPUTED' ? 'blocked' : teamConfirmed ? 'current' : 'waiting' }
  ]
  return { phase, state, preMatch, terminal, stages }
}

export function isWeeklyResponseReceipt(receipt, pending) {
  return Boolean(receipt?.id && receipt.matchId === pending.matchId && receipt.confirmingTeamId === pending.input.confirmingTeamId
    && receipt.revision === pending.input.expectedRevision && receipt.resultFingerprint === pending.fingerprint
    && receipt.status === pending.input.status && receipt.isCurrent === true && receipt.note === pending.input.note)
}

export function weeklyResponseAccess(room, ownTeam, { readOnly = true } = {}) {
  const teamId = ownTeam?.team?.id
  if (!teamId || !room?.myTeams?.some(item => item.team?.id === teamId) || ![room.teamAId, room.teamBId].includes(teamId)) {
    return { allowed: false, reason: '当前账号没有这支队伍的比赛关系。' }
  }
  if (FINAL_STATES.has(room.confirmationState) || FINAL_STATES.has(ownTeam.confirmation?.status)) {
    return { allowed: false, reason: '本场已结算，确认记录只读；更正请联系周赛管理员。' }
  }
  if (TERMINAL_STATES.has(room.week?.status) || TERMINAL_STATES.has(room.cycle?.status) || room.status === 'CANCELLED') {
    return { allowed: false, reason: '本周或所属周期已结束、取消，不能再提交响应。' }
  }
  if (ownTeam.role === 'PLAYER') {
    return { allowed: false, reason: '普通选手账号仅可查看，由本队队长或经理确认赛果、提交争议。' }
  }
  if (readOnly || ownTeam.accessMode !== 'WRITE' || !['LEADER', 'MANAGER'].includes(ownTeam.role)) {
    return { allowed: false, reason: '当前比赛房间为只读，不能代表队伍提交响应。' }
  }
  if (!room.ready) return { allowed: false, reason: '等待正式比赛赛果完成审核。' }
  if (room.confirmationState === 'STALE' || (ownTeam.confirmation && ownTeam.confirmation.isCurrent !== true)) {
    return { allowed: false, reason: '旧确认已失效，请等待管理员重新开启当前赛果修订的确认。' }
  }
  if (!ownTeam.confirmation || ownTeam.confirmation.revision !== room.revision || !RESPONSE_STATES.has(ownTeam.confirmation.status)) {
    return { allowed: false, reason: '管理员尚未开启当前修订的双方确认。' }
  }
  if (!WRITABLE_WEEKS.has(room.week?.status) || ownTeam.canRespond !== true) {
    return { allowed: false, reason: '当前状态不允许响应，请刷新或联系周赛管理员。' }
  }
  return { allowed: true, reason: '' }
}

export function buildWeeklyResponse(room, teamId, status, note, options) {
  const ownTeam = room?.myTeams?.find(item => item.team?.id === teamId)
  const access = weeklyResponseAccess(room, ownTeam, options)
  if (!access.allowed) return { error: access.reason }
  if (!['CONFIRMED', 'DISPUTED'].includes(status)) return { error: '请选择确认赛果或提出争议。' }
  const cleanNote = String(note || '').trim()
  if (cleanNote.length > 2000) return { error: '说明不能超过 2000 字。' }
  if (status === 'DISPUTED' && cleanNote.length < 2) return { error: '请填写争议说明，至少 2 字，便于管理员复核。' }
  if (!Number.isInteger(room.revision) || room.revision < 1) return { error: '当前赛果修订无效，请刷新后重试。' }
  return { input: { confirmingTeamId: teamId, status, note: cleanNote, expectedRevision: room.revision } }
}

export function sortWeeklyRooms(rooms = []) {
  const priority = { DISPUTED: 0, PENDING: 1, STALE: 2, NOT_OPEN: 3, CONFIRMED: 4, FINALIZED: 5, OVERRIDDEN: 5 }
  return [...rooms].sort((left, right) => (
    (priority[left.confirmationState] ?? 6) - (priority[right.confirmationState] ?? 6) ||
    (Date.parse(left.scheduledAt) || 0) - (Date.parse(right.scheduledAt) || 0) ||
    String(left.id).localeCompare(String(right.id))
  ))
}

export function selectWeeklyRoom(rooms, requestedId) {
  return requestedId ? rooms.find(room => room.id === requestedId) || null : rooms[0] || null
}

export function weeklyRoomError(error) {
  if (error?.name === 'TimeoutError') return '比赛资料同步超时，请重试。'
  const messages = {
    ACCOUNT_PORTAL_NOT_AVAILABLE: '当前账号不在本赛季开放范围内，请联系管理员核对邀请与邮箱验证状态。',
    ACCOUNT_FEATURE_HIDDEN: '本赛季比赛房间尚未开放。',
    ACCOUNT_FEATURE_READ_ONLY: '本赛季比赛房间已切换为只读。',
    WEEKLY_ACCOUNT_IDENTITY_REQUIRED: '当前账号没有有效的周赛队伍身份，请先完成邀请认领。',
    WEEKLY_TEAM_MANAGER_REQUIRED: '只有本队有效的队长或经理可以提交响应。',
    WEEKLY_TEAM_ACCESS_FORBIDDEN: '当前账号没有代表这支队伍提交响应的权限。',
    WEEKLY_MATCH_ROOM_FORBIDDEN: '当前账号不能代表这支队伍响应。',
    WEEKLY_RESULT_REVISION_CONFLICT: '正式赛果已更新，本次操作未保存。请重新核对最新比分后再提交。',
    WEEKLY_RESULT_CONFIRMATION_NOT_OPEN: '当前修订尚未开启确认，或旧确认已失效，请刷新后核对。',
    WEEKLY_RESULT_ALREADY_FINALIZED: '本场已结算，不能再修改确认；如需更正请联系周赛管理员。',
    WEEKLY_RESULT_IMMUTABLE: '本周或周期已结束，赛果确认只读。',
    MATCH_REVIEW_NOT_APPROVED: '正式赛果尚未通过审核，不能确认。',
    MATCH_RESULT_NOT_READY: '正式赛果还未准备好，不能确认。',
    UNAUTHORIZED: '登录已失效，请重新登录。'
  }
  return messages[error?.data?.error] || (error?.status === 401 ? messages.UNAUTHORIZED : '比赛房间同步或提交失败，请刷新后重试。')
}
