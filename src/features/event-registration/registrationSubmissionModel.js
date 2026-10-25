export function registrationSubmissionState({ members = [], rosterMin = 5, rosterMax = 7, pendingApplications = null, eligibilityRequired = false, rulesVersion, checkApplications = true }) {
  const issues = []
  const confirmed = members.filter(member => member.status === 'CONFIRMED' && member.confirmedAt)
  const missing = Math.max(0, rosterMin - members.length)
  if (missing) issues.push({ id: 'roster-short', message: '还需邀请 {0} 名选手，报名至少需要 {1} 人。', values: [missing, rosterMin] })
  if (members.length > rosterMax) issues.push({ id: 'roster-full', message: '名单超过 {0} 人上限，请先移出 {1} 名选手。', values: [rosterMax, members.length - rosterMax] })
  const unconfirmed = members.length - confirmed.length
  if (unconfirmed) issues.push({ id: 'consent', message: '还有 {0} 名选手未完成本人确认。', values: [unconfirmed] })
  const eligibilityPending = eligibilityRequired ? confirmed.filter(member => {
    const value = member.eligibility
    return !value?.rulesAccepted || !value.declaredAt || (rulesVersion && value.rulesVersion !== rulesVersion)
  }).length : 0
  if (eligibilityPending) issues.push({ id: 'eligibility', message: '还有 {0} 名选手需要核对并重新确认参赛资料。', values: [eligibilityPending] })
  if (checkApplications) {
    if (pendingApplications === null) issues.push({ id: 'applications-loading', message: '正在核对入队申请；若长时间未完成，请在下方重新读取。', values: [] })
    else if (pendingApplications > 0) issues.push({ id: 'applications', message: '还有 {0} 条入队申请待审核或待补充，请先处理。', values: [pendingApplications] })
  }
  return { ready: issues.length === 0, memberCount: members.length, confirmedCount: confirmed.length, issues }
}
