import { pickUiLocale } from '../../lib/uiText.js'
import { weeklyTeamShort } from '../weekly-overview/weeklyPresentation.js'

const list = value => Array.isArray(value) ? value : []
const text = value => String(value ?? '').trim()
const teamId = team => text(team?.id || team?.team_id)
const teamName = team => weeklyTeamShort(team) === '?' ? text(team?.name || team?.team_name) : weeklyTeamShort(team)
const score = value => typeof value !== 'boolean' && text(value) !== '' && Number.isInteger(Number(value)) && Number(value) >= 0 ? Number(value) : null
const copy = (locale, templates, values = []) => pickUiLocale(locale, ...templates).replace(/\{(\d+)\}/g, (token, index) => values[index] ?? token)

function matchFact(match, maps) {
  const teams = [match.team_a, match.team_b].map(team => ({ id: teamId(team), name: teamName(team) }))
  const scores = [score(match.team_a?.score), score(match.team_b?.score)]
  const played = list(maps).filter(map => map.matchId === match.id).sort((a, b) => a.order - b.order)
  const verified = match.state === 'complete' && teams.every(team => team.id && team.name && team.name !== '?') && teams[0].id !== teams[1].id &&
    scores.every(value => value !== null) && scores[0] + scores[1] === 5 && played.length === 5 &&
    played.every((map, index) => !map.is_administrative && Number(map.order) === index + 1 && teams.some(team => team.id === text(map.winner))) &&
    teams.every((team, index) => played.filter(map => text(map.winner) === team.id).length === scores[index])
  return { id: match.id, state: match.state, teams, scores, scheduledAt: match.scheduled_at || null, verified, winnerId: verified ? teams[scores[0] > scores[1] ? 0 : 1].id : null }
}

// These facts come from the very same public payload and cutoff as the issue.
// Keep unresolved results as blockers instead of silently extending a streak.
export function collectWeeklyNewsContext(report, referenceReports = []) {
  const history = referenceReports.filter(previous => previous.cycle.id === report.cycle.id && previous.seasonId === report.seasonId && previous.sourceAt === report.sourceAt &&
    Number(previous.week.week_number) > 0 && Number(previous.week.week_number) < Number(report.week.week_number))
    .map(previous => ({ weekId: previous.week.id, weekNumber: Number(previous.week.week_number),
      complete: !previous.pending.length && list(previous.week.match_ids).length === list(previous.overview.matches).length,
      matches: previous.overview.matches.map(match => matchFact(match, previous.maps)) }))
    .sort((a, b) => a.weekNumber - b.weekNumber)
  const next = report.overview.weekEntries.find(entry => Number(entry.week.week_number) === Number(report.week.week_number) + 1 && (!entry.week.cycle_id || entry.week.cycle_id === report.cycle.id))
  const nextMatches = list(next?.matches).filter(match => match.state === 'upcoming' && teamId(match.team_a) && teamId(match.team_b) &&
    (!match.cycle_id || match.cycle_id === report.cycle.id) && (!match.cycle_week_id || match.cycle_week_id === next.week.id) &&
    teamId(match.team_a) !== teamId(match.team_b) && Number.isFinite(Date.parse(match.scheduled_at)) && Date.parse(match.scheduled_at) > Date.parse(report.sourceAt))
    .map(match => ({ id: match.id, teams: [match.team_a, match.team_b].map(team => ({ id: teamId(team), name: teamName(team) })), startAt: match.scheduled_at }))
    .filter(match => match.teams.every(team => team.name))
  return { history, nextWeek: nextMatches.length ? { id: next.week.id, number: Number(next.week.week_number), matches: nextMatches } : null }
}

export function buildMatchBackground(article, report, locale = 'zh-CN') {
  if (article.sequence.length !== 5) return null
  const [winner, loser] = article.displayTeams, winnerId = teamId(winner), loserId = teamId(loser)
  const history = list(report.newsContext?.history), currentWeek = Number(report.week.week_number)
  const fullHistory = history.length === currentWeek - 1 && history.every((week, index) => week.complete && week.weekNumber === index + 1) &&
    new Set(history.map(week => week.weekId)).size === history.length
  const appearances = id => history.flatMap(week => week.matches.filter(match => match.teams.some(team => team.id === id)).map(match => ({ ...match, week })))
  const winnerPast = appearances(winnerId), loserPast = appearances(loserId)
  const currentAppearances = id => [...report.completed, ...report.pending].filter(match => [match.team_a, match.team_b].some(team => teamId(team) === id)).length
  const singleWeeklyAppearance = matches => new Set(matches.map(match => match.week.weekId)).size === matches.length
  const chronological = matches => {
    const current = report.completed.find(match => match.id === article.id)
    const times = [...matches.map(match => Date.parse(match.scheduledAt)), Date.parse(current?.scheduled_at)]
    return times.every((time, index) => Number.isFinite(time) && time <= Date.parse(report.sourceAt) && (index === 0 || time > times[index - 1]))
  }
  const run = (matches, id) => {
    let count = 0
    for (const match of [...matches].reverse()) {
      if (!match.verified || match.winnerId !== id) break
      count++
    }
    return count
  }
  const sources = matches => matches.map(match => ({ weekId: match.week.weekId, weekNumber: match.week.weekNumber, matchId: match.id }))
  if (fullHistory && currentAppearances(winnerId) === 1 && currentAppearances(loserId) === 1 && singleWeeklyAppearance(winnerPast) && singleWeeklyAppearance(loserPast) && chronological(winnerPast) && chronological(loserPast)) {
    const ended = run(loserPast, loserId)
    if (ended >= 2) return { kind: 'streak-ended', priority: ended >= 3 ? 150 : 90, sources: sources(loserPast.slice(-ended)), text: copy(locale, [
      '{0}在此前连续 {1} 场实战获胜；本周由{2}终结这段连胜。',
      '{0} had won {1} consecutive played matches; {2} ended that run this week.',
      '{0}의 실제 경기 {1}연승이 이번 주 {2}전에서 끝났습니다.',
      '{0}在此前連續 {1} 場實戰獲勝；本週由{2}終結這段連勝。'
    ], [teamName(loser), ended, teamName(winner)]) }
    if (winnerPast.length && winnerPast.every(match => match.verified && match.winnerId !== winnerId)) return { kind: 'first-played-win', priority: winnerPast.length >= 2 ? 140 : 80, sources: sources(winnerPast), text: copy(locale, [
      '在本周期已公布的实战赛果中，{0}此前 {1} 场均负，本周取得首次胜利。',
      '{0} lost its previous {1} played matches and records its first win in this cycle’s published results.',
      '이 주기의 공개된 실제 경기 결과에서 {0}은 앞선 {1}경기 패배 후 첫 승리를 기록했습니다.',
      '在本週期已公布的實戰賽果中，{0}此前 {1} 場均負，本週取得首次勝利。'
    ], [teamName(winner), winnerPast.length]) }
    const continued = run(winnerPast, winnerId)
    if (continued >= 1) return { kind: 'winning-run', priority: 70, sources: sources(winnerPast.slice(-continued)), text: copy(locale, [
      '加上本周这场胜利，{0}已连续赢下 {1} 场实战对阵。',
      'With this result, {0} has won {1} consecutive played matches.',
      '이번 승리로 {0}은 실제 경기 {1}연승을 기록했습니다.',
      '加上本週這場勝利，{0}已連續贏下 {1} 場實戰對陣。'
    ], [teamName(winner), continued + 1]) }
  }
  const meeting = winnerPast.filter(match => match.verified && match.teams.some(team => team.id === loserId)).at(-1)
  if (!meeting) return null
  return { kind: 'previous-meeting', priority: 60, sources: sources([meeting]), text: copy(locale, [
    '第 {0} 周，两队的已确认赛果为 {1} {2}:{3} {4}；本周由{5}获胜。',
    'Their confirmed week {0} result was {1} {2}:{3} {4}; {5} wins this week.',
    '{0}주차 두 팀의 확정 결과는 {1} {2}:{3} {4}였으며, 이번 주에는 {5}이 승리했습니다.',
    '第 {0} 週，兩隊的已確認賽果為 {1} {2}:{3} {4}；本週由{5}獲勝。'
  ], [meeting.week.weekNumber, meeting.teams[0].name, ...meeting.scores, meeting.teams[1].name, teamName(winner)]) }
}

export function selectWeeklyLead(articles, fallbackId) {
  const significant = articles.filter(article => article.background?.priority >= 140)
    .sort((a, b) => b.background.priority - a.background.priority || Number(Boolean(b.decisive)) - Number(Boolean(a.decisive)) || a.id.localeCompare(b.id))
  return significant[0] || articles.find(article => article.id === fallbackId) || articles[0] || null
}

export function buildLeadIntro(article, articles, locale = 'zh-CN') {
  if (!article) return ''
  const complete = articles.filter(item => item.sequence.length === 5)
  const close = complete.filter(item => item.displayScores[0] === 3 && item.displayScores[1] === 2)
  const context = article.background?.priority >= 140 ? article.background.text : close.includes(article) && close.length === 1 && complete.length > 1 ? copy(locale, [
    '这是本期 {0} 场完整五图赛果中唯一的 3:2 对阵。',
    'It is the only 3:2 result among this issue’s {0} fully recorded five-map matches.',
    '이번 호에 다섯 맵 결과가 모두 수록된 {0}경기 중 유일한 3:2입니다.',
    '這是本期 {0} 場完整五圖賽果中唯一的 3:2 對陣。'
  ], [complete.length]) : ''
  return [article.brief, context].filter(Boolean).join(String(locale).startsWith('en') || String(locale).startsWith('ko') ? ' ' : '')
}

export function formatUpcomingMatch(match, locale = 'zh-CN') {
  const language = String(locale).startsWith('en') ? 'en-GB' : locale
  const time = new Intl.DateTimeFormat(language, { timeZone: 'Asia/Singapore', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(match.startAt))
  return `${match.teams[0].name} vs ${match.teams[1].name} · ${time} UTC+8`
}
