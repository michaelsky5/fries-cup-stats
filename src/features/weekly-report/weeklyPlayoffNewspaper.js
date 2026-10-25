import { buildWeeklyElimination } from '../weekly-advance/weeklyEliminationModel.js'
import { pickUiLocale } from '../../lib/uiText.js'

const list = value => Array.isArray(value) ? value : []
const idOf = team => String(team?.id || team?.team_id || '')
const teamFact = team => team ? Object.fromEntries(['id', 'team_id', 'name', 'short', 'team_name', 'team_short_name', 'logo', 'logo_url', 'seed'].filter(key => team[key] !== undefined).map(key => [key, team[key]])) : null

export const playoffText = (key, locale) => pickUiLocale(locale, ...({
  edition: ['季后赛专刊', 'PLAYOFF EDITION', '플레이오프 특집', '季後賽專刊'],
  route: ['晋级之路', 'ROAD TO THE TITLE', '우승을 향한 여정', '晉級之路'],
  SEMIFINAL: ['半决赛', 'SEMIFINALS', '준결승', '準決賽'],
  FINAL: ['决赛', 'FINAL', '결승', '決賽'],
  THIRD_PLACE: ['季军赛', 'THIRD-PLACE MATCH', '3위 결정전', '季軍賽'],
  champion: ['冠军', 'CHAMPION', '우승', '冠軍'],
  runnerUp: ['亚军', 'RUNNER-UP', '준우승', '亞軍'],
  third: ['季军', 'THIRD PLACE', '3위', '季軍'],
  pending: ['待确认', 'TO BE CONFIRMED', '확정 대기', '待確認'],
  review: ['成绩待审核', 'RESULT UNDER REVIEW', '결과 검토 중', '成績待審核'],
  scheduled: ['待赛', 'UPCOMING', '경기 예정', '待賽'],
  live: ['比赛进行中', 'IN PROGRESS', '경기 진행 중', '比賽進行中'],
  ruling: ['赛事判定', 'OFFICIAL RULING', '공식 판정', '賽事判定'],
  missing: ['签表尚未公布', 'BRACKET NOT YET PUBLISHED', '대진표 미공개', '籤表尚未公布'],
  note: ['以本期数据截至时的公开签表与已确认赛果为准。', 'Published bracket and confirmed results at this issue’s cutoff.', '이번 호 마감 시점의 공개 대진표와 확정 결과 기준입니다.', '以本期數據截至時的公開籤表與已確認賽果為準。'],
}[key] || [key, key, key, key]))

export function hasPlayoffNewspaperFacts(report) {
  const p = report?.playoff
  return report?.week?.phase === 'PLAYOFFS' && p?.schema === 'friescup-playoff-paper-v1' &&
    p.cycleId === report.cycle?.id && p.weekId === report.week.id && p.sourceAt === report.sourceAt &&
    Array.isArray(p.rounds) && Array.isArray(p.placements)
}

// Freeze the public bracket with this issue. No label guessing, live winner,
// standings-derived medal, or later week's result may change an earlier issue.
export function buildPlayoffNewspaperFacts(db, overview, sourceAt) {
  const { cycle, week } = overview
  if (week?.phase !== 'PLAYOFFS') return null
  const result = { schema: 'friescup-playoff-paper-v1', cycleId: cycle.id, weekId: week.id, sourceAt,
    finalFormat: null, rounds: [], placements: [], bracketAvailable: false }
  if (cycle.elimination?.bracket_type !== 'SINGLE_ELIMINATION' || overview.isPilot) return result
  const scoped = { ...overview, weekEntries: overview.weekEntries.map(entry => ({ ...entry,
    matches: Number(entry.week.week_number) <= Number(week.week_number) ? entry.matches
      : entry.matches.filter(match => match.state === 'upcoming') })) }
  const bracket = buildWeeklyElimination(db, scoped)
  if (!bracket) return result
  const groups = [['SEMIFINAL', bracket.semifinals, 2], ['FINAL', bracket.finals, 1], ['THIRD_PLACE', bracket.thirdPlaces, 1]]
  const itemsByKind = new Map()
  const allIds = groups.flatMap(([, rounds]) => rounds.flatMap(round => round.items.map(item => item.id)))
  if (new Set(allIds).size !== allIds.length) return result
  for (const [kind, rounds, maximum] of groups) {
    const items = rounds.flatMap(round => round.items.map(item => ({ ...item, weekId: round.week_id })))
    if (items.length > maximum || new Set(items.map(item => item.id)).size !== items.length) continue
    itemsByKind.set(kind, items)
    result.rounds.push({ kind, items: items.map(item => {
      const confirmed = ['complete', 'ruling'].includes(item.state)
      return { id: item.id, weekId: item.weekId, kind, a: teamFact(item.a), b: teamFact(item.b),
        state: item.state, format: item.match?.format || null,
        scheduledAt: item.match?.scheduled_at || null,
        scores: confirmed ? [item.scoreA, item.scoreB] : null,
        winnerId: confirmed ? idOf(item.winner) || null : null }
    }) })
  }
  result.bracketAvailable = result.rounds.some(round => round.items.length)
  result.finalFormat = bracket.finalFormat
  const semis = itemsByKind.get('SEMIFINAL') || []
  const entrants = semis.flatMap(item => [idOf(item.a), idOf(item.b)])
  if (semis.length !== 2 || entrants.some(id => !id) || new Set(entrants).size !== 4 || semis.some(item => !item.winner)) return result
  const loser = item => [item.a, item.b].find(team => idOf(team) !== idOf(item.winner))
  for (const [kind, teams, rank] of [['FINAL', semis.map(item => item.winner), 1], ['THIRD_PLACE', semis.map(loser), 3]]) {
    const [item] = itemsByKind.get(kind) || []
    if (!item?.winner || item.type !== 'MATCH' || [idOf(item.a), idOf(item.b)].sort().join('|') !== teams.map(idOf).sort().join('|')) continue
    result.placements.push({ rank, team: teamFact(item.winner), matchId: item.id },
      { rank: rank + 1, team: teamFact(loser(item)), matchId: item.id })
  }
  return result
}

export function playoffLeadId(playoff, completed) {
  const ids = new Set(list(completed).map(match => match.id))
  return playoff?.rounds.find(round => round.kind === 'FINAL')?.items.find(item => item.winnerId && ids.has(item.id))?.id || null
}
