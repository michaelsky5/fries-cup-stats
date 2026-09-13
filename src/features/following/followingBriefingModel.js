export function getFollowingBriefing(feed) {
  const { live = [], review = [], upcoming = [], results = [], postponed = [], pending = [], cancelled = [] } = feed.groups
  const lead = feed.archived ? review[0] || results[0] : live[0] || review[0] || upcoming[0] || results[0]
  const candidates = feed.archived ? [review[0], ...results] : [live[0], review[0], upcoming[0], results[0]]
  const seen = new Set(lead ? [lead.id] : [])
  const related = candidates.filter(item => {
    if (!item || seen.has(item.id)) return false
    seen.add(item.id)
    return true
  }).slice(0, 2)
  return { lead: lead || null, related, attention: [...postponed, ...pending, ...cancelled] }
}
