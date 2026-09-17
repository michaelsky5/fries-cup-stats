export const ANALYSIS_TOPICS = [
  { id: 'team', zh: '团队表现', en: 'Team output' },
  { id: 'members', zh: '成员表现', en: 'Players' },
  { id: 'heroes', zh: '英雄与阵容', en: 'Heroes & lineups' },
  { id: 'opponents', zh: '对手研究', en: 'Opponents' },
  { id: 'maps', zh: '地图与模式', en: 'Maps & modes' }
]

const topicForSection = section => ({ combat: 'team', trend: 'team', members: 'members', heroes: 'heroes', opponents: 'opponents', maps: 'maps' })[section] || 'team'

export function getAnalysisReading(params) {
  const evidence = params.get('teamEvidence') || ''
  const legacyTopic = params.has('teamMap') || params.has('mapEvidence') || params.get('chapter') === 'maps' ? 'maps'
    : params.has('teamOpponent') || /opponent|rematch/.test(evidence) ? 'opponents'
      : params.has('performanceHero') || params.has('banSide') || /hero|lineup|ban/.test(evidence) ? 'heroes'
        : params.has('memberMetric') || params.has('performanceMember') || /member|cohort|roster/.test(evidence) ? 'members'
          : params.has('combatMetric') || params.has('combatView') || params.has('trendMetric') || evidence || ['records'].includes(params.get('chapter')) || params.get('tab') === 'stats' ? 'team' : null
  const requestedTopic = ANALYSIS_TOPICS.find(item => item.id === params.get('analysisTopic'))?.id
  const topic = requestedTopic || legacyTopic || 'team'
  const requested = params.get('analysisView')
  return { view: requested === 'brief' || requested === 'full' ? requested : (legacyTopic || requestedTopic ? 'full' : 'brief'), topic }
}

export function getFindingDestination(finding) {
  const query = { analysisView: 'full', analysisTopic: topicForSection(finding.section) }
  if (finding.opponentId) query.teamOpponent = finding.opponentId
  if (finding.metric) Object.assign(query, { combatMetric: finding.metric, combatView: finding.mode || 'paired' })
  if (finding.section === 'trend') query.trendMetric = 'eliminations'
  if (finding.mapName) query.teamMap = finding.mapName
  const evidence = finding.opponentId ? `performance-opponent-${finding.opponentId}`
    : finding.section === 'combat' ? 'combat-evidence' : null
  return { query, evidence, target: finding.section === 'trend' ? 'performance-trend' : `performance-${finding.section}` }
}

export function getAnalysisMember(report, params) {
  return report.members.find(member => member.id === (params.get('member') || params.get('performanceMember')))
    || report.members.find(member => member.maps > 0) || report.members[0] || null
}

export function getAnalysisTeamPath(id, params, { comparison = false } = {}) {
  const query = new URLSearchParams({ analysisView: comparison ? 'full' : 'brief' })
  if (params.get('analysisStage')) query.set('analysisStage', params.get('analysisStage'))
  if (comparison) {
    query.set('analysisTopic', 'team')
    query.set('combatView', 'field')
    if (params.get('combatMetric')) query.set('combatMetric', params.get('combatMetric'))
  }
  return `/teams/${encodeURIComponent(id)}/analysis?${query}`
}

export function getFindingMatches(report, finding) {
  if (!finding?.opponentId) return []
  const ids = new Set(finding.records.map(record => record.match.match_id))
  const rows = report.played.filter(row => ids.has(row.match.match_id))
  return rows.length <= 2 ? rows : [rows[0], rows.at(-1)]
}
