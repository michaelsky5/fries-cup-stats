export function scheduleProposalTiming(proposal) {
  const [label, field] = proposal.status === 'OPEN' ? ['协商确认截止时间：', 'expiresAt']
    : proposal.status === 'CONFIRMED' ? ['赛程确认时间：', 'confirmedAt']
      : ['提案发起时间：', 'createdAt']
  const value = proposal[field]
  return { label, timestamp: value && Number.isFinite(new Date(value).getTime()) ? value : null }
}
