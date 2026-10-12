const text = value => String(value || '').trim()

export const MATCH_FEEDBACK_ISSUES = [
  { value: 'MATCH_RESULT', zh: '比分 / 赛果', en: 'Score / result' },
  { value: 'PLAYER_STATS', zh: '选手统计', en: 'Player statistics' },
  { value: 'LINEUP_HERO', zh: '出场 / 英雄记录', en: 'Lineup / hero records' },
  { value: 'RATING', zh: '评分 / MVP', en: 'Rating / MVP' },
  { value: 'MATCH_INFO', zh: '时间 / 地图 / 其他信息', en: 'Time / map / other details' }
]

export function getMatchFeedbackContext(dossier, seasonId, mapOrder = '') {
  seasonId = text(seasonId).toUpperCase().replace(/^FCW2026$/, 'FCW26').replace(/^FCR2026$/, 'FCR26')
  const matchId = text(dossier?.internalId)
  const targetId = text(dossier?.match?.raw_match_id) || matchId
  const selected = mapOrder === '' ? null : dossier?.mapRecords?.find(map => map.order === Number(mapOrder))
  if (!matchId || matchId.length > 120 || !targetId || targetId.length > 120 || !/^[a-zA-Z0-9_-]{1,40}$/.test(seasonId || '')) throw new Error('INVALID_CONTEXT')
  if (mapOrder !== '' && !selected) throw new Error('INVALID_MAP')
  const query = new URLSearchParams({ season: seasonId })
  if (selected) query.set('map', String(selected.order))
  const lines = [
    `比赛：${text(dossier.displayCode).slice(0, 120) || matchId} · ${text(dossier.title).slice(0, 100)}`,
    `比赛 ID：${matchId}`,
    ...(targetId !== matchId ? [`原始 ID：${targetId}`] : []),
    ...(selected ? [`地图：${selected.order} · ${text(selected.name).slice(0, 80)}`] : []),
    `页面：/matches/${encodeURIComponent(matchId)}?${query}`
  ]
  const context = lines.join('\n')
  return { seasonId, targetType: 'MATCH', targetId, context, maximumDescriptionLength: 1000 - context.length - 2 }
}

export function buildMatchFeedbackPayload(dossier, seasonId, form) {
  const context = getMatchFeedbackContext(dossier, seasonId, form.mapOrder)
  const description = text(form.description)
  if (!MATCH_FEEDBACK_ISSUES.some(issue => issue.value === form.issueType)) throw new Error('INVALID_ISSUE')
  if (description.length < 5 || description.length > context.maximumDescriptionLength) throw new Error('INVALID_DESCRIPTION')
  return { seasonId: context.seasonId, targetType: context.targetType, targetId: context.targetId,
    issueType: form.issueType, description: `${description}\n\n${context.context}` }
}

export function isMatchingFeedback(record, payload) {
  return Boolean(record?.id && payload && ['seasonId', 'targetType', 'targetId', 'issueType', 'description'].every(key => record[key] === payload[key]))
}

// A failed write response can still mean the server saved the report.
// Reconcile with the read endpoint before offering a manual retry.
export function isFeedbackOutcomeUnknown(error) {
  return Boolean(error?.data?.outcomeUnknown || error?.data?.error === 'INVALID_API_RESPONSE'
    || !error?.status || error.status >= 500)
}
