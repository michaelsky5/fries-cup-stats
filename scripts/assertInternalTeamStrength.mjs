import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { prepareTeamStrengthData, auditCrossSeasonIdentities, durationMinutes } from './lib/internalTeamStrengthData.mjs'
import { updateGlicko, expectedScore, ageRating, rosterRetention, adjustForRoster, runTeamStrengthSeason, TEAM_STRENGTH_POLICY, fitPerformanceCoefficients } from './lib/internalTeamStrengthEngine.mjs'
import { summarizePredictions, evaluateSeasons, pairedDayBootstrap } from './lib/internalTeamStrengthEvaluation.mjs'
import { renderTeamStrengthHtml } from './lib/internalTeamStrengthReport.mjs'

const roles = ['TANK', 'DPS', 'DPS', 'SUP', 'SUP']
const heroes = ['Winston', 'Tracer', 'Genji', 'Ana', 'Lúcio']
function makeRows(team, day, map, side) {
  return roles.map((role, index) => ({ player_id: `${team}-p${index}`, team_id: team, role, heroes_played: heroes[index], time: '',
    eliminations: 8 + ((day + map + index + side) % 16), assists: 3 + ((day + index + side) % 9), deaths: 2 + ((day + side + index) % 7),
    damage: 2000 + ((day * 281 + index * 811 + side * 977) % 6000), healing: index >= 3 ? 4500 + ((day * 101 + side * 113) % 3000) : 0,
    mitigation: index === 0 ? 4500 + day * 10 : 0 }))
}
function fixture({ days = 12, month = 1, seasonId = 'FCA26' } = {}) {
  const ids = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
  const matches = []
  for (let day = 1; day <= days; day += 1) {
    const rotation = [ids[0], ...ids.slice(1).map((_, index) => ids[1 + ((index + day - 1) % 7)])]
    for (let i = 0; i < 4; i += 1) {
      const a = rotation[i], b = rotation[7 - i], result = (day + i) % 3 ? 1 : 0
      matches.push({ match_id: `${seasonId}-${day}-${i}`, scheduled_date: `2026-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        status: 'COMPLETE', result_mode: 'NORMAL', winner: result ? a : b, format: 'FT2',
        team_a: { id: a, name: a, score: result ? 2 : 0 }, team_b: { id: b, name: b, score: result ? 0 : 2 },
        maps: [1, 2].map(order => ({ map_order: order, map_name: 'Ilios', map_type: 'Control', match_time: '10:00',
          winner: result ? a : b, team_a_stats: makeRows(a, day, order, 0), team_b_stats: makeRows(b, day, order, 1) })) })
    }
  }
  return { teams: ids.map(id => ({ team_id: id, team_name: id, team_short_name: id })),
    players: ids.flatMap(id => roles.map((role, index) => ({ player_id: `${id}-p${index}`, player_name: `${id}${index}#12345`, team_id: id, role, rank: '大师' }))), matches }
}
const run = (db, season = 'FCA26', options) => runTeamStrengthSeason(prepareTeamStrengthData(db, season), options)
const probabilities = result => result.predictions.map(row => ({ date: row.date, matchId: row.matchId, probabilities: row.probabilities, priorMatchesA: row.priorMatchesA, priorMatchesB: row.priorMatchesB }))

test('Glicko matches the original paper numerical example', () => {
  const updated = updateGlicko({ rating: 1500, rd: 200 }, [
    { opponent: { rating: 1400, rd: 30 }, result: 1 }, { opponent: { rating: 1550, rd: 100 }, result: 0 }, { opponent: { rating: 1700, rd: 300 }, result: 0 }
  ])
  assert.ok(Math.abs(updated.rating - 1464.106) < 0.01)
  assert.ok(Math.abs(updated.rd - 151.399) < 0.01)
})

test('opponent strength, uncertainty and inactivity have the intended direction', () => {
  const own = { rating: 1500, rd: 100, lastDate: '2026-01-01' }
  const strong = { rating: 1700, rd: 80 }, weak = { rating: 1300, rd: 80 }
  assert.ok(updateGlicko(own, [{ opponent: strong, result: 1 }]).rating > updateGlicko(own, [{ opponent: weak, result: 1 }]).rating)
  assert.ok(updateGlicko(own, [{ opponent: strong, result: 0 }]).rating > updateGlicko(own, [{ opponent: weak, result: 0 }]).rating)
  assert.ok(ageRating(own, '2026-03-01').rd > own.rd)
  assert.equal(ageRating(own, '2026-03-01').rating, own.rating)
  assert.ok(Math.abs(expectedScore(own, strong) + expectedScore(strong, own) - 1) < 1e-12)
  assert.ok(expectedScore({ rating: 1600, rd: 350 }, { rating: 1500, rd: 350 }) < expectedScore({ rating: 1600, rd: 50 }, { rating: 1500, rd: 50 }))
})

test('roster retention follows actual roles, reverts uncertain history without treating new teams as weak', () => {
  const before = { 'a:TANK': 1, 'b:DAMAGE': 1, 'c:DAMAGE': 1, 'd:SUPPORT': 1, 'e:SUPPORT': 1 }
  const after = { ...before, 'a:TANK': 0, 'f:TANK': 1 }
  assert.equal(rosterRetention(before, before), 1)
  assert.equal(rosterRetention(before, after), 0.8)
  const adjusted = adjustForRoster({ rating: 1750, rd: 80 }, 0.6)
  assert.equal(adjusted.rating, 1650)
  assert.ok(adjusted.rd > 80)
  assert.deepEqual(adjustForRoster({ rating: 1200, rd: 80 }, 0), { rating: 1500, rd: 350 })
})

test('durations reject missing, zero and malformed values', () => {
  assert.equal(durationMinutes('10:30'), 10.5)
  assert.equal(durationMinutes('01:10:30'), 70.5)
  for (const value of ['', null, '0:00', '1:99', '-2:30', 'unknown']) assert.equal(durationMinutes(value), null)
})

test('administrative results, invalid results, missing dates and duplicate IDs never rate', () => {
  for (const extra of [{ result_mode: 'FORFEIT' }, { result_mode: 'OVERRULED' }, { is_bye: true }, { is_forfeit: true }, { scheduled_date: '' }, { winner: 'OTHER' }, { status: 'PENDING' }]) {
    const db = fixture({ days: 1 }); Object.assign(db.matches[0], extra)
    const data = prepareTeamStrengthData(db, 'FCA26')
    assert.equal(data.matches.length, 3, JSON.stringify(extra))
    assert.equal(data.audit.excludedMatches.length, 1)
  }
  const db = fixture({ days: 1 }); db.matches.push(structuredClone(db.matches[0]))
  assert.equal(prepareTeamStrengthData(db, 'FCA26').matches.length, 3)
})

test('map copies, duplicate rows, ambiguous maps and explicit team mismatches are audited without deleting valid series outcomes', () => {
  const mutators = [
    map => { map.player_stats = [...structuredClone(map.team_a_stats), ...structuredClone(map.team_b_stats)]; map.player_stats[0].damage += 1 },
    map => { map.team_a_stats[1].player_id = map.team_a_stats[0].player_id },
    map => { map.team_a_stats[0].team_id = 'wrong-team' },
    map => { map.is_administrative = true },
    map => { map.team_b_stats = [] },
    map => { map.team_a_stats[0].time = '05:00' }
  ]
  for (const mutate of mutators) {
    const db = fixture({ days: 1 }); mutate(db.matches[0].maps[0])
    const data = prepareTeamStrengthData(db, 'FCA26')
    assert.equal(data.matches.length, 4)
    assert.equal(data.audit.verifiedLineupMaps, 7)
    assert.equal(data.matches[0].rosterCoverage, 0.5)
  }
  const db = fixture({ days: 1 }); db.matches[0].maps[1].map_order = 1
  assert.equal(prepareTeamStrengthData(db, 'FCA26').matches[0].maps.length, 0)
})

test('identical map copies are counted once, missing metrics stay missing, declared ranks do not become labels', () => {
  const db = fixture({ days: 1 })
  const map = db.matches[0].maps[0]
  map.player_stats = [...structuredClone(map.team_a_stats), ...structuredClone(map.team_b_stats)]
  assert.equal(prepareTeamStrengthData(db, 'FCA26').audit.verifiedLineupMaps, 8)
  delete map.player_stats
  for (const row of [...map.team_a_stats, ...map.team_b_stats]) row.healing = 0
  const normalized = prepareTeamStrengthData(db, 'FCA26').matches[0].maps[0]
  assert.ok(normalized.missingColumns.includes('healing'))
  assert.ok(normalized.rows.every(row => !Object.hasOwn(row.metrics, 'healing')))
  db.players.forEach(player => { player.rank = ''; player.team_id = 'A'; player.final_rank = 1 })
  assert.deepEqual(probabilities(run(db)), probabilities(run(fixture({ days: 1 }))))
})

test('same-day order and future results, stats, lineups and final standings cannot change earlier predictions', () => {
  const db = fixture()
  const baseline = run(db)
  const reversed = structuredClone(db); reversed.matches.reverse(); reversed.teams.reverse()
  assert.deepEqual(probabilities(run(reversed)), probabilities(baseline))
  const changed = structuredClone(db)
  const cutoff = '2026-01-08'
  for (const match of changed.matches.filter(match => match.scheduled_date >= cutoff)) {
    const score = match.team_a.score; match.team_a.score = match.team_b.score; match.team_b.score = score
    match.winner = match.team_a.score ? match.team_a.id : match.team_b.id
    for (const map of match.maps) for (const row of [...map.team_a_stats, ...map.team_b_stats]) { row.player_id += '-new'; row.damage *= 50 }
  }
  changed.teams.forEach(team => { team.final_rank = 1; team.current_rank = 1 })
  changed.players.forEach(player => { player.rank = '英杰'; player.team_id = 'H'; player.match_logs = [{ bad: 'future data' }] })
  assert.deepEqual(probabilities(run(changed)).filter(row => row.date <= cutoff), probabilities(baseline).filter(row => row.date <= cutoff))
  const prefix = structuredClone(db); prefix.matches = prefix.matches.filter(match => match.scheduled_date <= cutoff)
  assert.deepEqual(probabilities(run(prefix)), probabilities(baseline).filter(row => row.date <= cutoff))
})

test('the played lineup can only affect post-game ratings and subsequent dates', () => {
  const db = fixture({ days: 6 }), baseline = run(db)
  for (const match of db.matches.filter(match => match.scheduled_date === '2026-01-04')) for (const map of match.maps) for (const row of map.team_a_stats) row.player_id += '-replacement'
  const changed = run(db)
  assert.deepEqual(probabilities(changed).filter(row => row.date <= '2026-01-04'), probabilities(baseline).filter(row => row.date <= '2026-01-04'))
  assert.ok(changed.history.some(row => row.model === 'roster' && row.date === '2026-01-04' && row.retention === 0))
})

test('series length never multiplies result weight; map information remains an auxiliary signal', () => {
  const db = fixture({ days: 4 }), baseline = run(db)
  for (const match of db.matches) { match.format = 'FT4'; match.team_a.score *= 2; match.team_b.score *= 2; match.maps.push(...structuredClone(match.maps).map(map => ({ ...map, map_order: map.map_order + 2 }))) }
  const changed = run(db)
  for (const model of ['elo', 'glicko', 'roster']) assert.deepEqual(changed.history.filter(row => row.model === model).map(row => row.ratingAfter), baseline.history.filter(row => row.model === model).map(row => row.ratingAfter))
})

test('unplayed teams remain unrated and cannot be assigned the lowest band', () => {
  const db = fixture({ days: 1 }); db.teams.push({ team_id: 'NEW', team_name: 'New' })
  const team = run(db).ratings.find(row => row.id === 'new')
  assert.equal(team.status, 'UNRATED'); assert.equal(team.rating, null); assert.equal(team.band, null)
  assert.equal(prepareTeamStrengthData(db, 'FCA26').components.length, 5)
})

test('draws update ratings but are not misrepresented as binary winner predictions', () => {
  const db = fixture({ days: 1 }); db.matches[0].winner = 'DRAW'; db.matches[0].team_a.score = 2; db.matches[0].team_b.score = 2; db.matches[0].format = 'RR5'
  const result = run(db), summary = summarizePredictions(result.predictions)
  assert.equal(result.predictions.length, 4); assert.equal(summary.matches, 3); assert.equal(summary.excludedDraws, 1)
  assert.equal(result.ratings.find(team => team.id === 'a').draws, 1)
})

test('cross-event tag candidates never automatically transfer ratings and duplicates require review', () => {
  const a = prepareTeamStrengthData(fixture({ days: 1 }), 'FCA26')
  const b = prepareTeamStrengthData(fixture({ days: 1 }), 'FCR26')
  b.identities.push({ ...b.identities[0], playerId: 'duplicate' })
  const audit = auditCrossSeasonIdentities([a, b])
  assert.equal(audit.automaticRatingTransfers, 0); assert.equal(audit.ambiguous.length, 1); assert.equal(audit.candidates.length, 39)
})

test('validation freezes development coefficients and future training is rejected', () => {
  const development = run(fixture({ days: 16 }))
  const coefficients = fitPerformanceCoefficients(development.trainingRows)
  assert.ok(coefficients.performanceRows > 20)
  const validation = run(fixture({ days: 12, month: 3, seasonId: 'QGCS4' }), 'QGCS4', { frozenCoefficients: coefficients })
  assert.equal(validation.trainingRows.length, 0)
  assert.ok(validation.folds.every(fold => fold.coefficientMode === 'FROZEN_DEVELOPMENT'))
  for (const row of validation.predictions) assert.deepEqual(row.performance.coefficients, coefficients)
  assert.throws(() => run(fixture({ days: 1 }), 'FCA26', { frozenCoefficients: { ...coefficients, latestTrainingDate: '2026-12-31' } }), /Future/)
})

test('selection never consults validation scores and paired resampling is reproducible', () => {
  const make = (seasonId, favored) => ({ seasonId, predictions: Array.from({ length: 20 }, (_, i) => ({ seasonId, date: `2026-01-${String(i % 5 + 1).padStart(2, '0')}`, result: 1, priorMatchesA: 5, priorMatchesB: 5,
    probabilities: Object.fromEntries(TEAM_STRENGTH_POLICY.models.map(model => [model, model === favored ? 0.8 : 0.5])) })) })
  const dev = [make('FCA26', 'roster'), make('FCR26', 'roster')]
  const first = evaluateSeasons([...dev, make('QGCS4', 'elo')]), second = evaluateSeasons([...dev, make('QGCS4', 'performance')])
  assert.equal(first.developmentChoice, 'roster'); assert.equal(second.developmentChoice, 'roster')
  assert.equal(first.validationImprovesOverElo, false)
  assert.deepEqual(pairedDayBootstrap(dev[0].predictions, 'roster'), pairedDayBootstrap(dev[0].predictions, 'roster'))
  const summary = summarizePredictions(dev[0].predictions)
  assert.equal(summary.models.elo.accuracy, 0.5)
  assert.equal(summary.models.roster.calibration.reduce((sum, bin) => sum + bin.count, 0), summary.matches)
})

test('generated HTML safely embeds untrusted names and has no external assets', () => {
  const html = renderTeamStrengthHtml({ generatedAt: '2026-09-26', name: '</script><script>alert(1)</script>' })
  assert.ok(!html.includes('"name":"</script>'))
  assert.ok(html.includes('\\u003c/script>'))
  assert.ok(!/<(?:script|link|img)[^>]+(?:src|href)="https?:/.test(html))
})

test('real archive cohorts match the audited normal-series counts and every model covers the same matches', () => {
  const inputs = [['FCA26', 'friescup_db_review_ready.json', 117], ['FCR26', 'fcr2026_local_public.json', 113], ['QGCS4', 'qgcs4_review_public.json', 36]]
  const developmentHistory = []
  for (const [seasonId, file, expectedCount] of inputs) {
    const data = prepareTeamStrengthData(JSON.parse(fs.readFileSync(new URL(`../public/data/${file}`, import.meta.url))), seasonId)
    assert.equal(data.matches.length, expectedCount)
    const result = runTeamStrengthSeason(data, seasonId === 'QGCS4' ? { frozenCoefficients: fitPerformanceCoefficients(developmentHistory) } : { coefficientHistory: developmentHistory })
    developmentHistory.push(...result.trainingRows)
    assert.equal(result.predictions.length, expectedCount)
    assert.ok(result.predictions.every(row => Object.keys(row.probabilities).length === 4 && Object.values(row.probabilities).every(value => value > 0 && value < 1)))
    for (const fold of result.folds) assert.ok(!fold.coefficients.latestTrainingDate || fold.coefficients.latestTrainingDate < fold.date)
    const summary = summarizePredictions(result.predictions)
    for (const model of Object.values(summary.models)) assert.equal(model.calibration.reduce((sum, bin) => sum + bin.count, 0), summary.matches)
    if (seasonId === 'QGCS4') assert.equal(data.audit.missingDeclarations, 116)
  }
})
