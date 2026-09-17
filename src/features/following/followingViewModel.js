export const FOLLOWING_PAGE_SIZE = 6
const matchStates = ['live', 'review', 'upcoming', 'results', 'postponed', 'pending', 'cancelled']

function readLimit(value) {
  const number = Number(value)
  return Number.isSafeInteger(number) && number >= FOLLOWING_PAGE_SIZE ? number : FOLLOWING_PAGE_SIZE
}

export function getFollowingSubjects(feed) {
  return [
    ...feed.teams.map(team => ({ key: `team:${team.id}`, type: 'team', id: team.id, name: team.short })),
    ...feed.players.map(player => ({ key: `player:${player.id}`, type: 'player', id: player.id, name: player.name }))
  ]
}

export function getFollowingView(feed, search) {
  const params = new URLSearchParams(search)
  const subjectKey = params.get('follow') || ''
  const subjects = getFollowingSubjects(feed)
  const subject = subjects.find(item => item.key === subjectKey) || null
  const missingSubject = Boolean(subjectKey && !subject)
  const state = matchStates.includes(params.get('followState')) ? params.get('followState') : 'all'
  const collection = ['teams', 'players'].includes(params.get('followCollection')) ? params.get('followCollection') : feed.teams.length ? 'teams' : 'players'
  const matches = !subjectKey ? feed.matches : missingSubject ? [] : feed.matches.filter(item => item.relations.some(reason => (
    reason.id === subject.id && (subject.type === 'team' ? reason.type === 'team' : ['appearance', 'player-team'].includes(reason.type))
  )))
  const counts = Object.fromEntries(['all', ...matchStates].map(key => [key, key === 'all' ? matches.length : matches.filter(item => item.group === key).length]))
  const entries = state === 'all' ? matches : matches.filter(item => item.group === state)
  // Keep an explicitly selected empty state visible, including links from an earlier season state.
  const filters = ['all', ...matchStates.filter(key => key === state || (['live', 'upcoming'].includes(key) ? !feed.archived : key === 'results' || counts[key] > 0))]
  return { subjectKey, subject, subjects, missingSubject, state, collection, counts, entries, filters, limit: readLimit(params.get('followLimit')) }
}

export function updateFollowingSearch(search, patch) {
  const params = new URLSearchParams(search)
  if ('collection' in patch) {
    if (['teams', 'players'].includes(patch.collection)) params.set('followCollection', patch.collection)
    else params.delete('followCollection')
  }
  if ('cycleId' in patch) {
    if (patch.cycleId) params.set('cycle', patch.cycleId)
    else params.delete('cycle')
    params.delete('week')
    params.delete('followState')
    params.delete('followLimit')
  }
  if ('view' in patch) {
    if (patch.view === 'matches') params.set('followView', 'matches')
    else params.delete('followView')
  }
  if ('subjectKey' in patch) {
    if (patch.subjectKey) params.set('follow', patch.subjectKey)
    else params.delete('follow')
  }
  if ('state' in patch) {
    if (matchStates.includes(patch.state)) params.set('followState', patch.state)
    else params.delete('followState')
  }
  if ('subjectKey' in patch || 'state' in patch) params.delete('followLimit')
  if ('limit' in patch) {
    const limit = readLimit(patch.limit)
    if (limit > FOLLOWING_PAGE_SIZE) params.set('followLimit', String(limit))
    else params.delete('followLimit')
  }
  return params
}
