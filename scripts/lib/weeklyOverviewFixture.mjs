// Deliberately fictional schedule. Existing crests are layout assets only.
// Isolated dev preview; never included in the public production payload.
const identities = [
  ['AIP', 'Apes In Pajamas'], ['REG', 'ReGret'], ['ECNU', '重生之我在瓦西大读研究生'],
  ['SPC', 'SPC'], ['BANANA', 'BANANA'], ['IH', 'IHAN']
]
const teams = identities.map(([short, name], index) => ({ team_id: `FCW26-T00${index + 1}`, team_name: name, team_short_name: short, team_logo: `/logos/FCR/${short}.png`, player_ids: [] }))
const teamRef = (index, score) => ({ id: teams[index].team_id, name: teams[index].team_name, short: teams[index].team_short_name, team_logo: teams[index].team_logo, score: score ?? '' })
const mapNames = ['绿洲城', '国王大道', '里阿尔托', '新皇后街', '苏拉瓦萨']
function series(week, pair, a, b, score, status, date, cycle = 'sample-cycle-1') {
  const id = `FCW26-W${week}-M${pair}`
  const results = score ? [...Array(score[0]).fill(a), ...Array(score[1]).fill(b)] : []
  return { match_id: id, raw_match_id: `raw-${id}`, cycle_id: cycle, cycle_week_id: `${cycle}-w${week}`, stage: 'WEEKLY', round: `WEEK ${week}`, status, format: 'RR5', scheduled_at: date,
    team_a: teamRef(a, score?.[0]), team_b: teamRef(b, score?.[1]), is_forfeit: false,
    winner: status === 'COMPLETE' ? teams[score[0] > score[1] ? a : b].team_id : null,
    maps: results.map((winner, index) => ({ map_order: index + 1, map_name: mapNames[index], map_type: ['CONTROL', 'HYBRID', 'ESCORT', 'PUSH', 'FLASHPOINT'][index], winner: teams[winner].team_id, score_a: winner === a ? 1 : 0, score_b: winner === b ? 1 : 0, match_time: '10:00', time: '10:00', player_stats: [] })) }
}

export function buildWeeklyOverviewFixture() {
  const matches = [
    series(1, 1, 0, 3, [3, 2], 'COMPLETE', '2026-08-29T11:00:00Z'),
    series(1, 2, 1, 2, [2, 3], 'COMPLETE', '2026-08-29T12:00:00Z'),
    series(1, 3, 4, 5, [3, 2], 'COMPLETE', '2026-08-30T12:00:00Z'),
    series(2, 1, 0, 2, [4, 1], 'COMPLETE', '2026-09-05T11:00:00Z'),
    series(2, 2, 1, 4, [3, 2], 'COMPLETE', '2026-09-05T12:00:00Z'),
    series(2, 3, 3, 5, [3, 2], 'COMPLETE', '2026-09-06T12:00:00Z'),
    series(3, 1, 0, 1, [3, 0], 'IN_PROGRESS', '2026-09-12T11:00:00Z'),
    series(3, 2, 2, 3, [2, 3], 'COMPLETE', '2026-09-12T09:00:00Z'),
    series(3, 3, 4, 5, null, 'PENDING', '2026-09-13T12:00:00Z'),
    series(4, 1, 0, 4, null, 'PENDING', '2026-09-19T11:00:00Z'),
    series(4, 2, 1, 3, null, 'PENDING', null),
    series(4, 3, 2, 5, null, 'PENDING', '2026-09-20T12:00:00Z'),
    series(1, 'P', 0, 1, [3, 2], 'COMPLETE', '2026-08-22T12:00:00Z', 'sample-pilot')
  ]
  const standing = (index, rank, points, played, wins, tied = false) => ({ team_id: teams[index].team_id, team_name: teams[index].team_name, team_short_name: teams[index].team_short_name, display_rank: rank, points, played, wins, losses: played - wins, draws: 0, tied })
  // Public-shape examples only. The example.com URL is not an actual broadcast.
  matches.find(match => match.match_id === 'FCW26-W3-M1').broadcast = {
    is_broadcast: true, stream_url: 'https://example.com/fries-cup-design-preview',
    crew: [{ role: 'REFEREE', name: '样例赛管' }, { role: 'CASTER', name: '样例解说 A' }, { role: 'CASTER', name: '样例解说 B' }]
  }
  const cycle = { id: 'sample-cycle-1', code: 'C1', name: '第一周期', sequence: 1, status: 'ACTIVE', counts_toward_standings: true, ranking_policy: 'POINTS_ONLY', tiebreak_configured: false,
    weeks: [1, 2, 3, 4].map((number, index) => ({ id: `sample-cycle-1-w${number}`, week_number: number, label: `第 ${number} 周`, status: ['CLOSED', 'CLOSED', 'IN_PROGRESS', 'PUBLISHED'][index], match_ids: matches.filter(match => match.cycle_id === 'sample-cycle-1' && match.cycle_week_id.endsWith(`w${number}`)).map(match => match.raw_match_id) })),
    standings: [standing(3, 1, 23, 3, 2), standing(2, 2, 21, 3, 1), standing(0, 3, 17, 2, 2), standing(1, 4, 15, 2, 1, true), standing(4, 4, 15, 2, 1, true), standing(5, 6, 14, 2, 0)] }
  const pilot = { id: 'sample-pilot', code: 'PILOT', name: '试运行', sequence: 0, status: 'CLOSED', counts_toward_standings: false, ranking_policy: 'POINTS_ONLY', tiebreak_configured: false, standings: [], weeks: [{ id: 'sample-pilot-w1', week_number: 1, label: '试运行周', status: 'CLOSED', match_ids: ['raw-FCW26-W1-MP'] }] }
  return { meta: { season_id: 'FCW26', season_name: '2026 薯条杯周赛', preview: true, rules: { weeklyCompetition: { enabled: true } } }, updated_at: '2026-09-12T11:45:00Z', teams, players: [], matches, standings: [], player_totals: [], weekly_competition: { schema_version: 'friescup-weekly-public-v1', cycles: [pilot, cycle] } }
}
