import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  buildPredictionCenterView,
  filterPredictionMatches,
  getPredictionEmptyCopy,
  getPredictionLifecycle,
  sortPredictionMatches
} from '../src/features/predictions/predictionCenterModel.js'

const openMatch = {
  id: 'open',
  status: 'PENDING',
  scheduledAt: '2026-07-20T11:00:00Z',
  teamA: { shortName: 'BAN' },
  teamB: { shortName: 'IH' },
  lockState: { locked: false, reason: 'OPEN' }
}
const submittedOpenMatch = {
  ...openMatch,
  id: 'submitted-open',
  scheduledAt: '2026-07-20T10:00:00Z',
  myPrediction: { scoreA: 3, scoreB: 1 }
}
const lockedMatch = {
  ...openMatch,
  id: 'locked',
  scheduledAt: '2026-07-19T10:00:00Z',
  lockState: { locked: true, reason: 'SCHEDULE_LOCK' },
  myPrediction: { scoreA: 3, scoreB: 2 }
}
const runningMatch = {
  ...lockedMatch,
  id: 'running',
  status: 'IN_PROGRESS',
  lockState: { locked: true, reason: 'MATCH_STARTED' }
}
const awaitingMatch = {
  ...lockedMatch,
  id: 'awaiting',
  status: 'SUBMITTED',
  lockState: { locked: true, reason: 'MATCH_SUBMITTED' }
}
const settledMatch = {
  ...awaitingMatch,
  id: 'settled',
  scheduledAt: '2026-07-18T10:00:00Z',
  status: 'COMPLETE',
  settlement: { myAward: { points: 10 } }
}
const missedMatch = {
  ...lockedMatch,
  id: 'missed',
  myPrediction: null
}
const cancelledMatch = {
  ...lockedMatch,
  id: 'cancelled',
  status: 'CANCELLED',
  lockState: { locked: true, reason: 'MATCH_CANCELLED' }
}

assert.equal(getPredictionLifecycle(openMatch).key, 'AVAILABLE')
assert.equal(getPredictionLifecycle(submittedOpenMatch).key, 'EDITABLE')
assert.equal(getPredictionLifecycle(lockedMatch).key, 'LOCKED')
assert.equal(getPredictionLifecycle(runningMatch).label, '比赛进行中')
assert.equal(getPredictionLifecycle(awaitingMatch).key, 'AWAITING')
assert.equal(getPredictionLifecycle(settledMatch).key, 'SETTLED')
assert.equal(getPredictionLifecycle(missedMatch).key, 'MISSED')
assert.equal(getPredictionLifecycle(cancelledMatch).key, 'CANCELLED')

const allMatches = [openMatch, submittedOpenMatch, lockedMatch, runningMatch, awaitingMatch, settledMatch, missedMatch, cancelledMatch]
const activeView = buildPredictionCenterView({
  eligibility: { eligible: true },
  matches: allMatches
}, {
  participants: 12,
  viewer: { rank: 4, points: 25, participated: 3, winnerCorrect: 2, exactScoreCorrect: 1 }
})

assert.equal(activeView.action.key, 'predict')
assert.equal(activeView.action.targetId, 'open')
assert.equal(activeView.action.filter, 'AVAILABLE')
assert.equal(activeView.counts.open, 2)
assert.equal(activeView.counts.unsubmitted, 1)
assert.equal(activeView.counts.editable, 1)
assert.equal(activeView.counts.submitted, 6)
assert.equal(activeView.counts.locked, 2)
assert.equal(activeView.counts.settled, 1)
assert.equal(activeView.counts.settledMine, 1)
assert.equal(activeView.counts.awaitingSettlement, 1)
assert.equal(activeView.viewer.accuracy, 67)
assert.equal(activeView.facts[3].detail, '当前第 4 名')
assert.deepEqual(activeView.lifecycle.map(stage => stage.value), [1, 3, 1, 1])

const blockedView = buildPredictionCenterView({ eligibility: { eligible: false }, matches: [openMatch] })
assert.equal(blockedView.action.key, 'verify')
assert.equal(blockedView.action.href, 'security')

const completeView = buildPredictionCenterView({ eligibility: { eligible: true }, matches: [submittedOpenMatch] })
assert.equal(completeView.action.key, 'complete')
assert.equal(completeView.action.tab, 'mine')
assert.equal(completeView.action.filter, 'EDITABLE')

const lockedView = buildPredictionCenterView({ eligibility: { eligible: true }, matches: [lockedMatch] })
assert.equal(lockedView.action.key, 'locked')
assert.equal(lockedView.action.filter, 'LOCKED')

const awaitingView = buildPredictionCenterView({ eligibility: { eligible: true }, matches: [awaitingMatch] })
assert.equal(awaitingView.action.key, 'waiting')
assert.equal(awaitingView.action.filter, 'PENDING')

const settledView = buildPredictionCenterView({ eligibility: { eligible: true }, matches: [settledMatch] }, { viewer: { points: 10 } })
assert.equal(settledView.action.key, 'settled')
assert.equal(settledView.action.tab, 'ranking')

assert.equal(buildPredictionCenterView({ eligibility: { eligible: true }, matches: [] }).action.key, 'empty')
assert.deepEqual(sortPredictionMatches([openMatch, settledMatch]).map(match => match.id), ['settled', 'open'])
assert.deepEqual(filterPredictionMatches(allMatches, { tab: 'board', filter: 'AVAILABLE' }).map(match => match.id), ['open'])
assert.deepEqual(filterPredictionMatches(allMatches, { tab: 'board', filter: 'OPEN' }).map(match => match.id), ['submitted-open', 'open'])
assert.deepEqual(filterPredictionMatches(allMatches, { tab: 'board', filter: 'SETTLED' }).map(match => match.id), ['settled'])
assert.deepEqual(filterPredictionMatches(allMatches, { tab: 'mine', filter: 'EDITABLE' }).map(match => match.id), ['submitted-open'])
assert.deepEqual(filterPredictionMatches(allMatches, { tab: 'mine', filter: 'LOCKED' }).map(match => match.id), ['locked', 'running'])
assert.deepEqual(filterPredictionMatches(allMatches, { tab: 'mine', filter: 'PENDING' }).map(match => match.id), ['awaiting'])
assert.deepEqual(filterPredictionMatches(allMatches, { tab: 'mine', filter: 'SETTLED' }).map(match => match.id), ['settled'])
assert.equal(getPredictionEmptyCopy('mine', 'PENDING')[1], '没有待结算的预测')
assert.equal(getPredictionEmptyCopy('board', 'AVAILABLE')[1], '当前没有待提交的预测')

const source = readFileSync(new URL('../src/features/predictions/PredictionCenter.jsx', import.meta.url), 'utf8')
assert.equal(source.includes('MY PREDICTION FLOW'), true)
assert.equal(source.includes('赛后待结算与已结算会分别标记'), true)
assert.equal(source.includes('每届独立累计，只有正式结算的场次进入排行榜'), true)
assert.equal(source.includes('role="tablist"'), true)
assert.equal(source.includes('同分并列'), true)

const css = readFileSync(new URL('../src/features/predictions/PredictionCenter.module.css', import.meta.url), 'utf8')
assert.equal(css.includes('.lifecycleRail'), true)
assert.equal(css.includes('.lifecycleStatus'), true)
assert.equal(css.includes('.scoringGuide'), true)

console.log('Prediction center UI assertions passed.')
