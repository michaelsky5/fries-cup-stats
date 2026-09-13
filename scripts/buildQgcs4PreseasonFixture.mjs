import fs from 'node:fs'
import path from 'node:path'
import Papa from 'papaparse'

const DEFAULT_TEAM_CSV = 'C:/Users/shenk/Downloads/QGCS4_Website_Team.csv'
const DEFAULT_PLAYER_CSV = 'C:/Users/shenk/Downloads/QGCS4_Website_Player.csv'
const DEFAULT_OUTPUT = 'public/data/qgcs4_preseason_public.json'

const GROUPS = {
  A: ['QGCS4-T01', 'QGCS4-T06', 'QGCS4-T03', 'QGCS4-T02', 'QGCS4-T08'],
  B: ['QGCS4-T11', 'QGCS4-T15', 'QGCS4-T05', 'QGCS4-T12', 'QGCS4-T16'],
  C: ['QGCS4-T10', 'QGCS4-T17', 'QGCS4-T19', 'QGCS4-T14', 'QGCS4-T07'],
  D: ['QGCS4-T09', 'QGCS4-T13', 'QGCS4-T04', 'QGCS4-T18']
}

const SCHEDULE = [
  ['A', 1, '2026-08-24', '19:00', 1, 1, 2, 1],
  ['B', 1, '2026-08-24', '19:00', 2, 3, 4, 32],
  ['D', 1, '2026-08-24', '19:00', 3, 3, 4, 10],
  ['A', 1, '2026-08-24', '20:00', 1, 4, 5, 4],
  ['C', 1, '2026-08-24', '20:00', 2, 1, 2, 5],
  ['B', 1, '2026-08-24', '21:00', 1, 1, 2, 2],
  ['C', 1, '2026-08-24', '21:00', 2, 3, 4, 7],
  ['A', 1, '2026-08-24', '22:00', 1, 1, 3, 8],
  ['D', 1, '2026-08-24', '22:00', 2, 1, 2, 3],

  ['B', 2, '2026-08-25', '19:00', 1, 1, 3, 9],
  ['B', 2, '2026-08-25', '19:00', 2, 2, 5, 29],
  ['A', 2, '2026-08-25', '20:00', 1, 1, 4, 11],
  ['C', 2, '2026-08-25', '20:00', 2, 1, 3, 12],
  ['D', 2, '2026-08-25', '20:00', 3, 2, 4, 20],
  ['A', 2, '2026-08-25', '21:00', 1, 2, 3, 14],
  ['C', 2, '2026-08-25', '21:00', 2, 2, 4, 34],
  ['B', 2, '2026-08-25', '22:00', 1, 1, 4, 16],
  ['D', 2, '2026-08-25', '22:00', 2, 1, 3, 13],

  ['A', 3, '2026-08-26', '19:00', 1, 1, 5, 18],
  ['C', 3, '2026-08-26', '19:00', 2, 2, 5, 17],
  ['A', 3, '2026-08-26', '20:00', 1, 2, 4, 23],
  ['B', 3, '2026-08-26', '20:00', 2, 4, 5, 6],
  ['B', 3, '2026-08-26', '21:00', 1, 2, 3, 15],
  ['C', 3, '2026-08-26', '21:00', 2, 1, 4, 19],
  ['D', 3, '2026-08-26', '21:00', 3, 1, 4, 28],
  ['A', 3, '2026-08-26', '22:00', 1, 3, 5, 25],
  ['C', 3, '2026-08-26', '22:00', 2, 3, 5, 35],

  ['B', 4, '2026-08-27', '19:00', 1, 1, 5, 21],
  ['C', 4, '2026-08-27', '19:00', 2, 1, 5, 30],
  ['A', 4, '2026-08-27', '20:00', 1, 2, 5, 31],
  ['B', 4, '2026-08-27', '20:00', 2, 2, 4, 22],
  ['A', 4, '2026-08-27', '21:00', 1, 3, 4, 33],
  ['C', 4, '2026-08-27', '21:00', 2, 2, 3, 24],
  ['B', 4, '2026-08-27', '22:00', 1, 3, 5, 27],
  ['C', 4, '2026-08-27', '22:00', 2, 4, 5, 26],
  ['D', 4, '2026-08-27', '22:00', 3, 2, 3, 36]
]

function getArg(name, fallback) {
  const index = process.argv.indexOf(name)
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback
}

function parseCsv(filePath) {
  const input = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '')
  const parsed = Papa.parse(input, { header: true, skipEmptyLines: true })
  if (parsed.errors.length) {
    throw new Error(`${filePath}: ${parsed.errors.map(error => error.message).join('; ')}`)
  }
  return parsed.data
}

function normalizeStatus(value) {
  return String(value || '').trim() === '活跃' ? 'ACTIVE' : String(value || '').trim().toUpperCase()
}

function displayName(value) {
  return String(value || '').trim().split(/[#＃]/)[0] || String(value || '').trim()
}

const teamCsv = path.resolve(getArg('--teams', DEFAULT_TEAM_CSV))
const playerCsv = path.resolve(getArg('--players', DEFAULT_PLAYER_CSV))
const output = path.resolve(getArg('--output', DEFAULT_OUTPUT))
const sourceTeams = parseCsv(teamCsv)
const sourcePlayers = parseCsv(playerCsv)

const groupByTeam = new Map()
Object.entries(GROUPS).forEach(([groupLabel, ids]) => {
  ids.forEach((teamId, index) => groupByTeam.set(teamId, { groupLabel, groupSeed: index + 1 }))
})

const players = sourcePlayers.map(row => {
  const name = String(row.player_name || '').trim()
  return {
    player_id: row.player_id,
    player_name: name,
    nickname: displayName(name),
    display_name: displayName(name),
    battle_tag: name,
    team_id: row.team_id,
    team_name: row.team_name,
    role: row.role,
    rank: row.rank,
    status: normalizeStatus(row.status),
    roster_status: normalizeStatus(row.status),
    join_stage: row.join_stage || 'SEASON',
    exit_stage: row.exit_stage || '',
    main_heroes: [row.main_heroes_1, row.main_heroes_2, row.main_heroes_3].filter(Boolean),
    allowed_flex: [],
    historical_match_logs: [],
    live_match_logs: []
  }
})

const sourceTeamById = new Map(sourceTeams.map(team => [team.team_id, team]))
const teams = sourceTeams.map(row => {
  const group = groupByTeam.get(row.team_id)
  if (!group) throw new Error(`No group assignment for ${row.team_id}`)
  return {
    team_id: row.team_id,
    team_name: row.team_name,
    team_short_name: row.team_name_shortform || row.team_name,
    team_logo: row.team_logo || '',
    team_manager: row.team_manager || '',
    team_coach: row.team_coach || '',
    team_club: row.team_club || '',
    final_rank: row.final_rank || '',
    group_label: group.groupLabel,
    group_seed: group.groupSeed,
    competition_status: 'GROUP_ACTIVE',
    current_rank_stage: 'GROUP',
    current_rank: group.groupSeed,
    player_ids: players.filter(player => player.team_id === row.team_id).map(player => player.player_id)
  }
}).sort((a, b) => a.group_label.localeCompare(b.group_label) || a.group_seed - b.group_seed)

const teamsById = new Map(teams.map(team => [team.team_id, team]))
players.forEach(player => {
  player.team_short_name = teamsById.get(player.team_id)?.team_short_name || player.team_name
})

function matchTeam(teamId) {
  const team = teamsById.get(teamId)
  if (!team) throw new Error(`Unknown team ${teamId}`)
  return {
    id: team.team_id,
    team_id: team.team_id,
    name: team.team_name,
    team_name: team.team_name,
    short: team.team_short_name,
    team_short_name: team.team_short_name,
    score: ''
  }
}

const matches = SCHEDULE.map(([groupLabel, day, date, time, lane, seedA, seedB, matchNumber]) => {
  const teamAId = GROUPS[groupLabel][seedA - 1]
  const teamBId = GROUPS[groupLabel][seedB - 1]
  const teamA = matchTeam(teamAId)
  const teamB = matchTeam(teamBId)
  return {
    match_id: `QGCS4-GROUP-${groupLabel}-M${String(matchNumber).padStart(2, '0')}`,
    raw_match_id: `QGCS4-GROUP-${groupLabel}-M${String(matchNumber).padStart(2, '0')}`,
    match_display_name: `GROUP ${groupLabel} / ${teamA.short} VS ${teamB.short}`,
    stage: 'GROUP',
    round: `GROUP ${groupLabel} / DAY ${day}`,
    group_label: groupLabel,
    competition_day: day,
    lane,
    format: 'FT3',
    status: 'PENDING',
    scheduled_at: `${date}T${time}:00+08:00`,
    scheduled_date: date,
    scheduled_time: time,
    schedule_meta: {
      source: 'qgcs4-system-draft',
      exactTime: true,
      displayTime: time,
      lane
    },
    team_a: teamA,
    team_b: teamB,
    winner: '',
    maps: [],
    progress: { maps: 'PENDING', result: 'PENDING', players: 'PENDING' },
    is_forfeit: false,
    result_mode: 'NORMAL',
    ruling: null
  }
})

function buildStanding(team, rank) {
  return {
    rank,
    group_rank: rank,
    team_id: team.team_id,
    team_name: team.team_name,
    team_short_name: team.team_short_name,
    group_label: team.group_label,
    group_seed: team.group_seed,
    matches_played: 0,
    match_wins: 0,
    match_losses: 0,
    maps_won: 0,
    maps_lost: 0,
    map_differential: 0,
    head_to_head_wins: 0,
    qualified: false,
    requires_tiebreak: false,
    status: 'PENDING'
  }
}

const groupStandings = Object.entries(GROUPS).map(([groupLabel, ids]) => ({
  group_label: groupLabel,
  completed_matches: 0,
  expected_matches: ids.length * (ids.length - 1) / 2,
  complete: false,
  requires_tiebreak: false,
  teams: ids.map((id, index) => buildStanding(teamsById.get(id), index + 1))
}))

const fixture = {
  updated_at: '2026-08-23T00:30:00+08:00',
  meta: {
    schema_version: 'friescup-master-v1',
    contract_version: '2026-08-23',
    generated_by: 'fries-cup-stats-preseason-fixture',
    season_id: 'QGCS4',
    season_code: 'QGCS4',
    season_name: '全高杯 S4',
    season_name_en: 'Hammer Cup S4',
    series_code: 'QGCS4',
    team_count: teams.length,
    player_count: players.length,
    match_count: matches.length,
    map_count: 0,
    ranking_stage: 'GROUP',
    public_match_count: matches.length,
    hidden_match_count: 0,
    preseason_fallback: true,
    updated_at: '2026-08-23T00:30:00+08:00'
  },
  season: {
    id: 'QGCS4',
    code: 'QGCS4',
    name: '全高杯 S4',
    competition_format: 'GROUP'
  },
  teams,
  players,
  matches,
  maps: [],
  player_totals: [],
  player_hero_totals: [],
  team_totals: [],
  standings: groupStandings.flatMap(group => group.teams),
  group_standings: groupStandings,
  playoff_seeds: []
}

if (teams.length !== 19 || players.length !== 116 || matches.length !== 36) {
  throw new Error(`Unexpected fixture scale: ${teams.length} teams, ${players.length} players, ${matches.length} matches`)
}

fs.mkdirSync(path.dirname(output), { recursive: true })
fs.writeFileSync(output, `${JSON.stringify(fixture, null, 2)}\n`, 'utf8')
console.log(`Wrote ${path.relative(process.cwd(), output)} (${teams.length} teams, ${players.length} players, ${matches.length} matches)`)
