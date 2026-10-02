export function currentRosterReview(roster) {
  return roster?.review && roster.review.rosterRevision === roster.revision ? roster.review : null
}

export function rosterReviewPresentation(roster, { dirty = false, automatic = false } = {}) {
  const review = currentRosterReview(roster)
  if (dirty) return { status: 'DRAFT', title: '名单有未提交的修改', detail: '修改后需重新提交并检查，旧的审阅结果不适用于新名单。', issues: [] }
  if (roster?.status === 'LOCKED') return { status: 'LOCKED', title: review?.lockMethod === 'AUTOMATIC' ? '已自动锁定' : '管理员已锁定', detail: '正式名单已经确认，截止后的变更须经管理员审批。', issues: [] }
  if (roster?.status !== 'SUBMITTED') return { status: 'DRAFT', title: '提交后自动检查', detail: '系统检查人数、重复报名、名单继承和参赛资格；无法确定的问题交管理员复核。', issues: [] }
  if (!review) return { status: 'PENDING', title: automatic ? '等待自动检查' : '等待管理员审核', detail: automatic ? '检查结果尚未同步，请刷新后核对。' : '已提交给周赛管理员，等待锁定，无需重复提交。', issues: [] }
  const issues = (review.issues || []).filter(issue => !(issue.severity === 'REVIEW' && review.clearance?.codes?.includes(issue.code)))
  const titles = { PASSED: review.clearance ? '人工复核通过' : '自动检查通过', MANUAL_REVIEW: '待人工复核', NEEDS_CHANGES: '需调整名单' }
  const details = { PASSED: '截止前可以修改，每次重新检查；截止时锁定通过的名单。', MANUAL_REVIEW: '名单已提交，管理员只需核对以下问题，无需重复提交。', NEEDS_CHANGES: '请返回调整人员，修正问题后保存并重新提交。' }
  return { status: review.status, title: titles[review.status] || '等待自动检查', detail: details[review.status] || '检查结果尚未同步，请刷新后核对。', issues }
}

export const rosterReviewIssueLabels = {
  PLAYER_DUPLICATE: '该选手在本队或同周另一队伍名单中重复，请核对。',
  IDENTITY_POSSIBLE_DUPLICATE: '可能存在同一选手的多份档案，需管理员核对。',
  IDENTITY_RESTRICTED: '该选手身份已停用，不能通过检查。',
  BATTLETAG_MISSING: '请核对该选手的完整 BattleTag。',
  PLAYER_IDENTITY_UNCONFIRMED: '该选手身份尚无绑定或历史审核记录。',
  TEAM_QUALIFICATION_UNCONFIRMED: '首次参赛资格尚无审核通过记录。',
  ROSTER_DEADLINE_MISSING: '本周名单截止时间尚未配置，需管理员设置。',
  WEEKLY_ROSTER_COUNT_INVALID: '名单人数不符合本周要求。',
  WEEKLY_ROSTER_PLAYER_INVALID: '名单包含本队不可用的选手。',
  WEEKLY_ROSTER_CONTINUITY_REQUIRED: '名单未满足至少保留三名选手的继承要求。',
  WEEKLY_ROSTER_HISTORY_MISSING: '历史正式名单缺失，需要管理员核对。',
  WEEKLY_TEAM_SUSPENDED: '本队当前处于停赛期。',
  WEEKLY_PLAYOFF_PLAYER_INELIGIBLE: '名单包含不符合季后赛资格的选手。',
  WEEKLY_PLAYER_ALREADY_LOCKED: '该选手已在同周另一队伍名单中提交。'
}
