import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { buildWeeklyReportPreview, listWeeklyReportPreviews } from '../src/features/weekly-report/weeklyReportPreview.js'
import { buildWeeklyAwards, compareWeeklyAwardCandidates, selectWeeklyBestFive } from '../src/features/weekly-report/weeklyAwards.js'
import { buildRatingBaselinesFromPlayerLogs } from '../src/lib/ratingBaselines.js'
import { buildWeeklyReference, decorateWeeklyBaselines, selectWeeklyReferenceReports } from '../src/features/weekly-report/weeklyAwardReference.js'
import { getBlendedMetricPercentile } from '../src/lib/ratingModel.js'
import { WEEKLY_POSITIONS, WEEKLY_POSITION_ROLES, buildWeeklyPositionAssignments, weeklyLogPosition } from '../src/features/weekly-report/weeklyPositions.js'

const fixture = JSON.parse(fs.readFileSync(new URL('./fixtures/weekly-newspaper/published-FCW26.json', import.meta.url), 'utf8'))
const weekId = 'cmuaweero02s401mj6vik784t'
const clone = value => structuredClone(value)
const reportOf = db => buildWeeklyReportPreview(db, { weekId })
const baseline = reportOf(fixture)
const previousReports = listWeeklyReportPreviews(fixture).filter(report => report.week.week_number < 3)
const result = awards => ({ mvp: awards.mvp.map(p => [p.id, p.position, p.score]), five: awards.bestFive.map(s => [s.position, s.status, s.player?.id, s.player?.score]) })
const choice = (id, position, score, maps = 5, deaths = 5, teamIds = []) => ({ id, position, role:WEEKLY_POSITION_ROLES[position], score, maps, per10: { deaths }, teams: teamIds.map(id => ({ id })) })

test('real issue uses 15 played maps and fills the agreed role slots with distinct players', () => {
  const awards = baseline.awards
  assert.equal(awards.complete, true)
  assert.deepEqual(awards.eligible, { TANK: 6, DPS: 11, SUP: 12 })
  assert.deepEqual(awards.eligiblePositions,{TANK:6,FLEX_DPS:7,HITSCAN:4,MAIN_SUPPORT:6,FLEX_SUPPORT:6})
  assert.equal(awards.scoredMaps, 15)
  assert.equal(awards.rejectedAppearances, 0)
  assert.deepEqual(awards.bestFive.map(s => s.position), WEEKLY_POSITIONS)
  assert.ok(awards.bestFive.every(slot=>slot.player.position===slot.position))
  assert.equal(new Set(awards.bestFive.map(s => s.player.id)).size, 5)
  assert.ok(awards.bestFive.every(s => s.player.maps >= 3))
  assert.deepEqual(awards.mvp.map(p => p.name), ['KK'])
  assert.deepEqual(awards.bestFive.map(s => s.player.name), ['大堡垒', 'suiciy', 'KK', '白华', 'slipknot'])
  assert.equal(awards.policy.teamLimit, 2)
  assert.equal(awards.bestFive.filter(s => s.player.teams[0].id === awards.mvp[0].teams[0].id).length, 2)
  assert.equal(new Set(awards.bestFive.flatMap(s => s.player.teams.map(t => t.id))).size, 3)
  const uncapped = selectWeeklyBestFive(awards.candidates.filter(p => p.qualified))
  assert.deepEqual(uncapped.map(s => s.player.name), ['男神', 'Jerry', 'KK', '白华', 'Mai'])
  assert.equal(awards.mvp[0].score, 93.341)
  assert.deepEqual([awards.reference.mode, awards.reference.matches, awards.reference.maps], ['prior-weeks', 7, 35])
  assert.equal(awards.reference.versionStatus, 'unverified')
  assert.deepEqual(awards.mvp[0].sample, { maps: 4, minutes: awards.mvp[0].minutes, matches: 1, status: 'eligible', referenceMode: 'prior-weeks', referenceSupport: 'broader' })
})

test('future-week extremes cannot change an earlier issue, its performance or reference', () => {
  const db = clone(fixture), report = buildWeeklyReportPreview(fixture, { weekId: previousReports.find(r => r.week.week_number === 2).week.id })
  const future = new Set(baseline.completed.map(m => m.id))
  for (const player of db.players) for (const field of ['match_logs', 'live_match_logs']) for (const log of player[field] || []) {
    if (!future.has(log.matchId)) continue
    log.playtimeMinutes = 999999
    for (const key of Object.keys(log.totals)) log.totals[key] = 999999999
  }
  const changed = buildWeeklyReportPreview(db, { weekId: report.week.id }).awards
  assert.deepEqual(result(changed), result(report.awards))
  assert.equal(changed.inputVersion, report.awards.inputVersion)
})

test('higher-scoring hitscans or flex supports cannot take another position’s seat',()=>{
  const candidates=[choice('tank','TANK',70),choice('free','FLEX_DPS',50),choice('gun1','HITSCAN',90),choice('gun2','HITSCAN',89),choice('main','MAIN_SUPPORT',40),choice('flex1','FLEX_SUPPORT',95),choice('flex2','FLEX_SUPPORT',94)]
  const five=selectWeeklyBestFive(candidates)
  assert.deepEqual(five.map(slot=>slot.player?.id),['tank','free','gun1','main','flex1'])
  const missing=selectWeeklyBestFive(candidates.filter(player=>player.position!=='MAIN_SUPPORT'))
  assert.equal(missing[3].status,'insufficient-data')
  assert.equal(missing[3].player,null)
  assert.equal(missing[4].player.id,'flex1')
})

test('primary position adds all heroes in a subrole, caps map playtime and holds ties or unknowns',()=>{
  const group=(id,scope,role,minutes,logs)=>({id,scope,role,playtime:minutes,logs:logs.map(([hero,playtimeMinutes])=>({hero,playtimeMinutes}))})
  const records=[group('combined','m1','DPS',13,[['Cassidy',3],['Ashe',4],['Tracer',6]]),group('capped','m2','DPS',10,[['Cassidy',30],['Tracer',20]]),group('tied','m3','DPS',10,[['Cassidy',5],['Tracer',5]]),group('unknown','m4','DPS',10,[['Cassidy',9],['Not a known hero',1]])]
  const assignments=buildWeeklyPositionAssignments(records)
  assert.equal(assignments.get('combined').position,'HITSCAN')
  assert.equal(assignments.get('combined').positions[0].minutes,7)
  assert.equal(assignments.get('capped').totalMinutes,10)
  assert.equal(assignments.get('capped').positions[0].minutes,6)
  assert.equal(assignments.get('tied').position,null)
  assert.equal(assignments.get('tied').status,'position-tie')
  assert.equal(assignments.get('unknown').position,null)
  assert.equal(assignments.get('unknown').status,'unknown-hero')
  assert.equal(weeklyLogPosition({hero:'Not a known hero'},'DPS'),null)
})

test('candidate score, portrait and key statistics exclude heroes outside the assigned position',()=>{
  for(const candidate of baseline.awards.candidates){
    const primary=baseline.awards.snapshot.inputs.filter(row=>row.playerId===candidate.id).flatMap(row=>row.logs.filter(log=>weeklyLogPosition(log,row.role)===candidate.position))
    const expected=Object.fromEntries(['elims','assists','deaths','damage','healing','blocked'].map(metric=>[metric,primary.reduce((sum,log)=>sum+log.totals[metric],0)]))
    assert.deepEqual(candidate.totals,expected,candidate.name)
    assert.equal(weeklyLogPosition({hero:candidate.hero},candidate.role),candidate.position)
    assert.ok(candidate.sources.every(source=>source.position===candidate.position))
    for(const metric of Object.keys(expected))assert.equal(candidate.per10[metric],expected[metric]/candidate.minutes*10)
  }
  const kk=baseline.awards.candidates.find(player=>player.name==='KK')
  assert.equal(kk.position,'HITSCAN');assert.equal(kk.maps,4);assert.equal(kk.minutes,37.5)
  const white=baseline.awards.candidates.find(player=>player.name==='白华')
  assert.equal(white.position,'MAIN_SUPPORT');assert.equal(white.maps,3);assert.equal(white.minutes,28)
  assert.ok(white.positionAssignment.positions.some(position=>position.position==='FLEX_SUPPORT'))
})

test('every archived issue uses five separate primary-position pools without weakening map eligibility',()=>{
  for(const report of listWeeklyReportPreviews(fixture)){
    const awards=report.awards
    assert.deepEqual(awards.bestFive.map(slot=>slot.position),WEEKLY_POSITIONS)
    assert.ok(awards.bestFive.every(slot=>!slot.player||slot.player.position===slot.position&&slot.player.maps>=3))
    assert.equal(new Set(awards.candidates.map(player=>player.id)).size,awards.candidates.length)
  }
})

test('duplicate public rows and mirrored or repeated logs count once', () => {
  const db = clone(fixture), current = new Set(baseline.completed.map(m => m.id))
  for (const match of db.matches.filter(m => current.has(m.match_id || m.id))) for (const map of match.maps) {
    map.player_stats.push(...clone(map.player_stats))
  }
  for (const player of db.players) for (const field of ['match_logs', 'live_match_logs']) player[field]?.push(...clone(player[field]))
  assert.deepEqual(result(reportOf(db).awards), result(baseline.awards))
})

test('missing statistics, missing time and stale normalized totals do not earn valid maps', () => {
  for (const defect of ['missing-stats', 'missing-time', 'stale-log']) {
    const report = clone(baseline), players = clone(fixture.players), id = baseline.awards.mvp[0].id
    const maps = report.maps.filter(map => map.player_stats.some(row => row.player_id === id)).slice(0, 3)
    for (const map of maps) {
      const row = map.player_stats.find(row => row.player_id === id)
      const log = players.find(p => p.player_id === id).match_logs.find(log => log.matchId === map.matchId && Number(log.mapOrder) === Number(map.order))
      if (defect === 'missing-stats') delete row.damage
      if (defect === 'missing-time') log.playtimeMinutes = 0
      if (defect === 'stale-log') log.totals.damage++
    }
    const awards = buildWeeklyAwards(report, players)
    const removedPrimary=maps.filter(map=>baseline.awards.mvp[0].sources.some(source=>source.matchId===map.matchId&&source.maps.includes(map.order))).length
    assert.equal(awards.candidates.find(p => p.id === id).maps, baseline.awards.mvp[0].maps-removedPrimary, defect)
    assert.ok(awards.mvp.every(p => p.id !== id), defect)
    assert.ok(awards.bestFive.every(slot => slot.player?.id !== id), defect)
    assert.equal(awards.rejectedAppearances, 3, defect)
  }
})

test('administrative maps and results under review are outside award scope', () => {
  const report = clone(baseline), id = baseline.awards.mvp[0].id
  const affected = report.maps.find(map => map.player_stats.some(row => row.player_id === id)).matchId
  for (const map of report.maps) if (map.matchId === affected) map.is_administrative = true
  assert.ok(buildWeeklyAwards(report, fixture.players).candidates.every(p => p.id !== id))
  const underReview = clone(baseline)
  underReview.completed.find(match => match.id === affected).state = 'review'
  assert.ok(buildWeeklyAwards(underReview, fixture.players).candidates.every(p => p.id !== id))
})

test('a lone player cannot self-award; role peers allow a three-map one-week sample', () => {
  const player = { player_id: 'weekly-player', display_name: 'Player', match_logs: [] }
  const report = { cycle: { id: 'cycle' }, week: { id: 'week' }, completed: [], maps: [], sourceAt: '2026-10-05T00:00:00Z' }
  for (let i = 1; i <= 3; i++) {
    const id = `match-${i}`, team = { id: 'team', name: 'Team' }, totals = { elims: 10, assists: 10, deaths: 2, damage: 3000, healing: 5000, blocked: 0 }
    report.completed.push({ id, state: 'complete', team_a: team, team_b: { id: 'other' } })
    report.maps.push({ matchId: id, order: 1, match_time: '5:00', player_stats: [{ player_id: player.player_id, role: 'SUP', team_id: team.id, heroes_played: 'Ana', eliminations: totals.elims, assists: totals.assists, deaths: totals.deaths, damage: totals.damage, healing: totals.healing, mitigation: totals.blocked }] })
    player.match_logs.push({ matchId: id, mapOrder: 1, hero: 'Ana', role: 'SUP', teamId: team.id, playtimeMinutes: 5, totals })
  }
  const isolated = buildWeeklyAwards(report, [player])
  assert.equal(isolated.candidates[0].sample.status, 'reference-pending')
  assert.equal(isolated.candidates[0].score, null)
  assert.equal(isolated.mvp.length, 0)
  assert.ok(isolated.bestFive.every(s => !s.player))
  const peers = ['peer-a', 'peer-b'].map((id, index) => ({ player_id: id, match_logs: player.match_logs.map(log => ({ ...clone(log), teamId: index ? 'other' : 'team', totals: Object.fromEntries(Object.entries(log.totals).map(([key, value]) => [key, key === 'deaths' ? value + 2 : value * 0.8])) })) }))
  for (const map of report.maps) for (const peer of peers) {
    const log = peer.match_logs.find(log => log.matchId === map.matchId)
    map.player_stats.push({ ...map.player_stats[0], player_id: peer.player_id, team_id: log.teamId, eliminations: log.totals.elims, assists: log.totals.assists, deaths: log.totals.deaths, damage: log.totals.damage, healing: log.totals.healing, mitigation: log.totals.blocked })
  }
  const awards = buildWeeklyAwards(report, [player, ...peers])
  const selected = awards.candidates.find(candidate => candidate.id === player.player_id)
  assert.equal(selected.maps, 3)
  assert.equal(selected.minutes, 15)
  assert.equal(selected.sources.length, 3)
  assert.equal(selected.qualified, true)
  assert.equal(selected.score, selected.sources.reduce((sum, source) => sum + source.rawScore * source.minutes, 0) / selected.minutes)
  report.maps.pop()
  const small = buildWeeklyAwards(report, [player, ...peers])
  assert.equal(small.mvp.length, 0)
  assert.ok(small.bestFive.every(s => s.status === 'insufficient-data'))
})

test('removing another current-week match leaves a retained player and historical reference unchanged', () => {
  const mvp = baseline.awards.mvp[0]
  for (const removed of baseline.completed.filter(match => !mvp.sources.some(source => source.matchId === match.id))) {
    const report = clone(baseline)
    report.completed = report.completed.filter(match => match.id !== removed.id)
    report.maps = report.maps.filter(map => map.matchId !== removed.id)
    const awards = buildWeeklyAwards(report, fixture.players, { referenceReports: previousReports })
    const retained = awards.candidates.find(player => player.id === mvp.id && player.role === mvp.role)
    assert.equal(retained.score, mvp.score)
    assert.equal(awards.reference.inputVersion, baseline.awards.reference.inputVersion)
    assert.deepEqual(retained.sample, mvp.sample)
  }
})

test('reference membership requires an earlier week, scheduled cutoff and matching competition scope', () => {
  const earlier = clone(previousReports[0])
  const original = selectWeeklyReferenceReports(baseline, [earlier])
  assert.equal(original.reports.length, 1)
  for (const defect of ['future-schedule', 'missing-date', 'different-cycle', 'different-season', 'different-format', 'same-week']) {
    const report = clone(earlier)
    if (defect === 'future-schedule') report.completed.forEach(match => { match.scheduled_at = baseline.awards.reference.cutoff })
    if (defect === 'missing-date') report.completed.forEach(match => { match.scheduled_at = null })
    if (defect === 'different-cycle') report.cycle.id = 'elsewhere'
    if (defect === 'different-season') report.seasonId = 'FCR2026'
    if (defect === 'different-format') report.completed.forEach(match => { match.format = 'BO7' })
    if (defect === 'same-week') report.week.week_number = baseline.week.week_number
    assert.equal(selectWeeklyReferenceReports(baseline, [report]).reports.length, 0, defect)
  }
  const patch = { ...baseline, gameVersion: 'patch-A' }
  assert.equal(selectWeeklyReferenceReports(patch, [{ ...earlier, gameVersion: 'patch-B' }]).reports.length, 0)
  assert.equal(selectWeeklyReferenceReports(patch, [{ ...earlier, gameVersion: 'patch-A' }]).versionStatus, 'verified')
  assert.equal(selectWeeklyReferenceReports(patch, [earlier]).versionStatus, 'unverified')
})

test('first-week references use peer subroles and never borrow later weeks or sparse hero profiles', () => {
  const first = previousReports.find(report => report.week.week_number === 1)
  assert.equal(first.awards.reference.mode, 'startup-peer-subrole')
  assert.deepEqual(first.awards.reference.weekIds, [])
  assert.equal(first.awards.snapshot.baseline.heroes.length, 0)
  assert.equal(first.awards.snapshot.baseline.scoringProfiles.length, 0)
  const recalculated = buildWeeklyAwards(first, fixture.players, { referenceReports: [baseline, ...previousReports] })
  assert.deepEqual(result(recalculated), result(first.awards))
  assert.ok(recalculated.candidates.every(candidate => candidate.score !== null || candidate.sample.status === 'reference-pending'))
})

test('twenty logs from one player do not mature a rare-hero reference; legacy baselines keep their blend', () => {
  const make = (id, teamId, hero, n) => ({ player_id: id, match_logs: Array.from({ length: n }, (_, index) => ({ matchId: `match-${Math.floor(index / 5)}`, mapOrder: index + 1, hero, role: 'SUP', teamId, playtimeMinutes: 10, totals: { elims: 10, assists: 10, deaths: 2, damage: 3000, healing: 5000, blocked: 0 } })) })
  const raw = buildRatingBaselinesFromPlayerLogs([make('one', 'A', 'Ana', 20), make('two', 'B', 'Kiriko', 20), make('three', 'C', 'Kiriko', 20)], { useFrozenBaselines: false })
  const annotated = decorateWeeklyBaselines(raw), ana = annotated.heroes.find(group => group.key === 'Ana')
  assert.equal(ana.sampleLogs, 20)
  assert.equal(ana.uniquePlayers, 1)
  assert.equal(ana.uniqueMatches, 4)
  assert.equal(ana.independentSampleMaturity, 1 / 6)
  assert.equal(ana.referenceUsable, false)
  assert.equal(annotated.byHero.Ana, undefined)
  const hero = raw.byHero.Ana, profile = raw.scoringProfiles[0], subrole = raw.bySubrole.FLEX_SUPPORT
  const before = getBlendedMetricPercentile({ metric: 'elims', value: 10, heroBaseline: hero, profileBaseline: profile, subroleBaseline: subrole })
  assert.equal(before.sourceWeights.hero, 0.5)
  const reduced = getBlendedMetricPercentile({ metric: 'elims', value: 10, heroBaseline: ana, profileBaseline: profile, subroleBaseline: subrole })
  assert.ok(reduced.sourceWeights.hero < before.sourceWeights.hero)
  assert.equal(raw.byHero.Ana.independentSampleMaturity, undefined)
})

test('historical performance defines only the cohort reference, not personal weekly eligibility or playtime', () => {
  const currentIds = new Set(baseline.completed.map(match => match.id))
  assert.ok(baseline.awards.snapshot.inputs.every(row => currentIds.has(row.matchId)))
  assert.ok(baseline.awards.snapshot.reference.inputs.every(row => !currentIds.has(row.matchId)))
  for (const candidate of baseline.awards.candidates) {
    assert.ok(candidate.sources.every(source => currentIds.has(source.matchId)))
    assert.equal(candidate.sample.matches, candidate.sources.length)
    assert.equal(candidate.minutes, candidate.sources.reduce((sum, source) => sum + source.minutes, 0))
  }
  const removed = clone(baseline), id = baseline.awards.mvp[0].id
  removed.maps = removed.maps.filter(map => !map.player_stats.some(row => row.player_id === id))
  assert.ok(buildWeeklyAwards(removed, fixture.players, { referenceReports: previousReports }).candidates.every(candidate => candidate.id !== id))
})

test('startup references exclude all of the scored player’s records, even after an extreme own performance', () => {
  const first = previousReports.find(report => report.week.week_number === 1), target = first.awards.mvp[0].id
  const groups = first.awards.snapshot.inputs.map(row => ({ id: row.playerId, teamId: row.teamId, role: row.role,
    key: `${row.matchId}|${row.mapOrder}|${row.playerId}|${row.role}`, scope: `${row.matchId}|${row.mapOrder}`, matchId: row.matchId,
    order: row.mapOrder, minutes: row.mapMinutes, playtime: row.logs.reduce((sum, log) => sum + log.minutes, 0),
    logs: row.logs.map(log => ({ ...log, matchId: row.matchId, mapOrder: row.mapOrder, teamId: row.teamId, role: row.role, playtimeMinutes: log.minutes })) }))
  const scope = selectWeeklyReferenceReports(first, [])
  const before = buildWeeklyReference(first, { valid: groups }, [], fixture.players, scope).forPlayer(target)
  assert.ok(before.logs.every(log => log.playerId !== target))
  const altered = clone(groups)
  altered.filter(group => group.id === target).forEach(group => group.logs.forEach(log => { log.totals.damage = 9999999 }))
  const after = buildWeeklyReference(first, { valid: altered }, [], fixture.players, scope).forPlayer(target)
  assert.deepEqual(after.subroles, before.subroles)
})

test('role overlap selects the best feasible full lineup without assigning one person twice', () => {
  const candidates = [choice('flex', 'TANK', 100), choice('flex', 'FLEX_DPS', 99), choice('tank', 'TANK', 98), choice('damage1', 'HITSCAN', 90), choice('damage2', 'FLEX_DPS', 80), choice('support1', 'MAIN_SUPPORT', 90), choice('support2', 'FLEX_SUPPORT', 80)]
  const five = selectWeeklyBestFive(candidates)
  assert.deepEqual(five.map(s => s.player?.id), ['tank', 'flex', 'damage1', 'support1', 'support2'])
  assert.equal(new Set(five.map(s => s.player.id)).size, 5)
  assert.deepEqual(selectWeeklyBestFive([...candidates].reverse()).map(s => s.player?.id), five.map(s => s.player.id))
})

test('unresolved cutoff ties remain pending, and display rounding does not create a tie', () => {
  const candidates = [choice('tank', 'TANK', 90), choice('d1', 'FLEX_DPS', 90), choice('d2', 'HITSCAN', 80), choice('d3', 'HITSCAN', 80), choice('s1', 'MAIN_SUPPORT', 90), choice('s2', 'FLEX_SUPPORT', 80)]
  const five = selectWeeklyBestFive(candidates)
  assert.equal(five[1].player.id, 'd1')
  assert.equal(five[2].status, 'tie')
  assert.deepEqual(new Set(five[2].contenders.map(p => p.id)), new Set(['d2', 'd3']))
  assert.ok(compareWeeklyAwardCandidates(choice('a', 'DPS', 80.041), choice('b', 'DPS', 80.042)) > 0)
  assert.ok(compareWeeklyAwardCandidates(choice('a', 'DPS', 80, 4), choice('b', 'DPS', 80, 5)) > 0)
  assert.ok(compareWeeklyAwardCandidates(choice('a', 'DPS', 80, 5, 4), choice('b', 'DPS', 80, 5, 5)) < 0)
  assert.equal(compareWeeklyAwardCandidates(choice('first-name', 'DPS', 80), choice('last-name', 'DPS', 80)), 0)
})

test('ordering changes preserve the saved input version and award result', () => {
  const db = clone(fixture)
  db.players.reverse()
  for (const player of db.players) player.match_logs?.reverse()
  for (const match of db.matches) for (const map of match.maps) map.player_stats?.reverse()
  const awards = reportOf(db).awards
  assert.deepEqual(result(awards), result(baseline.awards))
  assert.equal(awards.inputVersion, baseline.awards.inputVersion)
})

test('team caps preserve role quotas and choose the best full lineup rather than picking roles greedily', () => {
  const candidates = [
    choice('ta', 'TANK', 100, 5, 5, ['A']), choice('tb', 'TANK', 95, 5, 5, ['B']),
    choice('da', 'FLEX_DPS', 90, 5, 5, ['A']), choice('db', 'FLEX_DPS', 89, 5, 5, ['B']), choice('dc', 'HITSCAN', 10, 5, 5, ['C']),
    choice('sa1', 'MAIN_SUPPORT', 88, 5, 5, ['A']), choice('sa2', 'FLEX_SUPPORT', 87, 5, 5, ['A']),
    choice('sc', 'MAIN_SUPPORT', 5, 5, 5, ['C']), choice('sd', 'FLEX_SUPPORT', 4, 5, 5, ['D'])
  ]
  const five = selectWeeklyBestFive(candidates, { teamLimit: 2 })
  assert.deepEqual(five.map(s => s.player?.id), ['tb', 'db', 'dc', 'sa1', 'sa2'])
  assert.deepEqual(selectWeeklyBestFive([...candidates].reverse(), { teamLimit: 2 }).map(s => s.player?.id), five.map(s => s.player.id))
  const singleTeam = candidates.filter(p => p.teams[0].id === 'A')
  const limited = selectWeeklyBestFive(singleTeam, { teamLimit: 2 })
  assert.equal(limited.filter(s => s.player).length, 2)
  assert.ok(limited.some(s => s.status === 'lineup-limit'))
  assert.ok(selectWeeklyBestFive([choice('missing-team', 'TANK', 100)], { teamLimit: 2 }).every(s => !s.player))
})

test('team-cap DP agrees with exhaustive lineups, including multi-role, multi-team and tied candidates', () => {
  const compare = (a, b) => {
    for (let i = 0; i < a.length; i++) if (Math.abs(a[i] - b[i]) > 1e-9) return a[i] - b[i]
    return 0
  }
  const exhaustive = (candidates, cap) => {
    let best = [-1, 0, 0, 0], optimal = []
    for (let bits = 0; bits < 2 ** candidates.length; bits++) {
      const lineup = candidates.filter((_, index) => bits & (1 << index))
      if (lineup.length > 5 || new Set(lineup.map(p => p.id)).size !== lineup.length) continue
      if (WEEKLY_POSITIONS.some(position=>lineup.filter(p=>p.position===position).length>1)) continue
      const teams = new Map()
      lineup.forEach(p => p.teams.forEach(t => teams.set(t.id, (teams.get(t.id) || 0) + 1)))
      if ([...teams.values()].some(count => count > cap)) continue
      const value = [lineup.length, lineup.reduce((sum, p) => sum + p.score, 0), lineup.reduce((sum, p) => sum + p.maps, 0), -lineup.reduce((sum, p) => sum + p.per10.deaths, 0)]
      const delta = compare(value, best)
      if (delta > 0) { best = value; optimal = [lineup] } else if (!delta) optimal.push(lineup)
    }
    const key = p => `${p.id}|${p.position}`
    return {
      required: new Set(optimal[0].filter(p => optimal.every(lineup => lineup.some(q => key(q) === key(p)))).map(key)),
      possible: new Set(optimal.flatMap(lineup => lineup.map(key)))
    }
  }
  let seed = 7
  const random = n => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % n }
  for (let run = 0; run < 24; run++) {
    const candidates = Array.from({ length: 10 }, (_, i) => choice(`p${Math.floor(i / 2)}`, WEEKLY_POSITIONS[(i + run) % 5], 60 + random(3), 3 + random(3), 4 + random(2), [...new Set([`T${random(4)}`, ...(random(3) === 0 ? [`T${random(4)}`] : [])])]))
    for (const cap of [1, 2]) {
      const expected = exhaustive(candidates, cap), five = selectWeeklyBestFive(candidates, { teamLimit: cap })
      const selected = new Set(five.filter(s => s.player).map(s => `${s.player.id}|${s.player.position}`))
      const possible = new Set(five.flatMap(s => s.player ? [s.player] : s.contenders).map(p => `${p.id}|${p.position}`))
      assert.deepEqual(selected, expected.required, `required, run ${run}, cap ${cap}`)
      assert.deepEqual(possible, expected.possible, `possible, run ${run}, cap ${cap}`)
    }
  }
})
