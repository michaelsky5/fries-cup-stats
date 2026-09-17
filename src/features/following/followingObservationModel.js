const subjectKey = reason => `${reason.type === 'team' ? 'team' : 'player'}:${reason.id}`
const validTime = value => Number.isFinite(Date.parse(value || '')) ? Date.parse(value) : null

export function createFollowingObservation(feed, { seasonId, accountId = 'guest', db, now = Date.now() }) {
  return {
    version: 1, seasonId, accountId, seenAt: now,
    ...(feed.weekly ? { cycleId: feed.weekly.cycle?.id || 'unpublished' } : {}),
    sourceTime: validTime(db?.updated_at || db?.updatedAt || db?.meta?.updated_at || db?.meta?.ranking_as_of),
    subjects: [...feed.teams.map(team => `team:${team.id}`), ...feed.players.map(player => `player:${player.id}`)].sort(),
    records: feed.matches.map(item => ({ id: item.id, subjects: [...new Set(item.relations.map(subjectKey))], status: item.presentation?.state || String(item.match.status || '').toUpperCase(), time: item.time, score: ['live', 'review', 'results'].includes(item.group) ? [item.scoreA, item.scoreB] : null }))
  }
}

export function isFollowingObservation(value, { seasonId, accountId = 'guest', cycleId }) {
  return value?.version === 1 && value.seasonId === seasonId && value.accountId === accountId && Number.isFinite(value.seenAt)
    && (value.cycleId || '') === (cycleId || '')
    && (value.sourceTime === null || Number.isFinite(value.sourceTime))
    && Array.isArray(value.subjects) && value.subjects.every(id => typeof id === 'string')
    && Array.isArray(value.records) && value.records.length <= 5000 && value.records.every(item => typeof item?.id === 'string' && typeof item.status === 'string'
      && Array.isArray(item.subjects) && item.subjects.every(id => typeof id === 'string')
      && (item.time === null || Number.isFinite(item.time)) && (item.score === null || Array.isArray(item.score) && item.score.length === 2 && item.score.every(score => score === null || Number.isFinite(score))))
}

// A newly followed object establishes its own baseline; it is not a new event.
export function reconcileFollowingSubjects(previous, current) {
  if (JSON.stringify(previous.subjects) === JSON.stringify(current.subjects)) return previous
  const retained = new Set(previous.subjects.filter(id => current.subjects.includes(id)))
  const records = new Map(previous.records.filter(item => item.subjects.some(id => retained.has(id))).map(item => [item.id, item]))
  for (const item of current.records) if (!records.has(item.id) && !item.subjects.some(id => retained.has(id))) records.set(item.id, item)
  return { ...previous, subjects: current.subjects, records: [...records.values()] }
}

export function getFollowingChanges(previous, current) {
  if (!isFollowingObservation(previous, current)) return { updates: [], olderSnapshot: false }
  const olderSnapshot = previous.sourceTime !== null && current.sourceTime !== null && current.sourceTime < previous.sourceTime
  if (olderSnapshot) return { updates: [], olderSnapshot }
  const retained = new Set(previous.subjects.filter(id => current.subjects.includes(id)))
  const records = new Map(previous.records.map(item => [item.id, item]))
  const updates = current.records.flatMap(item => {
    if (!item.subjects.some(id => retained.has(id))) return []
    const prior = records.get(item.id)
    const kinds = !prior ? ['added'] : [prior.status !== item.status && 'status', prior.time !== item.time && 'schedule', JSON.stringify(prior.score) !== JSON.stringify(item.score) && 'score'].filter(Boolean)
    return kinds.length ? [{ id: item.id, kinds }] : []
  })
  return { updates, olderSnapshot }
}

export function followingObservationKey(seasonId, accountId = 'guest', cycleId) {
  return 'fries-cup:following-observation:v1:' + encodeURIComponent(seasonId) + ':' + encodeURIComponent(accountId) + (cycleId ? ':cycle:' + encodeURIComponent(cycleId) : '')
}

export function getSubjectOutlook(feed, type, id) {
  const matches = feed.matches.filter(item => item.relations.some(reason => subjectKey(reason) === `${type}:${id}`))
  return { next: matches.find(item => ['live', 'review', 'upcoming'].includes(item.group)), latest: matches.find(item => item.group === 'results'), attention: matches.filter(item => ['postponed', 'pending', 'cancelled'].includes(item.group)) }
}
