import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { SIM_CHALLENGES, SIM_COURSES, SIM_SCENARIOS, createSimulation, simulationReducer, validateSimulationInput } from '../src/features/room-guide/roomSimulation.js'

const validInput = id => {
  const challenge = SIM_CHALLENGES[id]
  return { choice: challenge.correct, checks: challenge.checks || (id === 'review' ? ['screenshots'] : ['settlement-ready']), player: id === 'review' ? 'a2' : 'a6', note: 'A1 disconnected; authorized handover.', map: 'Busan', order: 'SECOND', players: ['a1','a2','a3','a4','a5'], hero: 'Kiriko', scoreA: id === 'settle' ? '9' : '2', scoreB: id === 'settle' ? '6' : '1' }
}

test('each role can finish its entire simulated course, without skipping or double-submitting', () => {
  for (const role of Object.keys(SIM_COURSES)) for (const mode of ['referee', 'captains']) {
    let state = createSimulation(role, '', mode)
    for (const id of state.ids) {
      assert.equal(state.ids[state.index], id)
      assert.strictEqual(simulationReducer(state, { type: 'NEXT' }), state)
      const before = structuredClone(state)
      const failed = simulationReducer(state, { type: 'SUBMIT', input: {} })
      assert.ok(failed.error); assert.equal(failed.complete, false); assert.equal(failed.index, state.index)
      assert.deepEqual(state, before)
      state = simulationReducer(state, { type: 'SUBMIT', input: validInput(id) })
      assert.equal(state.complete, true, `${role}/${id}`)
      assert.strictEqual(simulationReducer(state, { type: 'SUBMIT', input: {} }), state)
      state = simulationReducer(state, { type: 'NEXT' })
    }
    assert.deepEqual(state.history, state.ids); assert.equal(state.complete, true)
  }
})

test('only the representative-led course includes final game controls for representatives', () => {
  const refereeLed = createSimulation('representative', '', 'referee')
  const captainsLed = createSimulation('representative', '', 'captains')
  for (const id of ['start', 'map-score']) {
    assert.equal(refereeLed.ids.includes(id), false)
    assert.equal(captainsLed.ids.includes(id), true)
  }
})

test('simulated first-map choices carry into bans, and invalid lineups cannot lock', () => {
  let state = createSimulation('representative')
  state = simulationReducer(state, { type: 'SUBMIT', input: validInput('checkin') })
  state = simulationReducer(state, { type: 'NEXT' })
  state = simulationReducer(state, { type: 'SUBMIT', input: validInput('pick') })
  assert.deepEqual(state.setup, { map: 'Busan', order: 'SECOND' })
  assert.equal(validateSimulationInput('ban', { hero: 'Ashe' }, state.setup), 'ban')
  assert.equal(validateSimulationInput('ban', { hero: 'Kiriko' }, state.setup), '')
  assert.equal(validateSimulationInput('ban', { hero: 'Ashe' }, { order: 'FIRST' }), '')
  for (const players of [[], ['a1','a2','a3','a4','a6'], ['a1','a2','a3','a4','a4'], ['a1','a2','a3','a4','real-account']]) assert.equal(validateSimulationInput('lineup', { players }), 'lineup')
  assert.equal(validateSimulationInput('lineup', { players: ['a1','a6','a3','a4','a7'] }), '')
})

test('correction, player evidence and points have separate review gates', () => {
  assert.equal(validateSimulationInput('score-correct', { scoreA: 2, scoreB: 1 }), 'score')
  assert.equal(validateSimulationInput('score-correct', { scoreA: 1, scoreB: 2, note: 'swapped' }), 'score')
  assert.equal(validateSimulationInput('review', { player: 'a6', checks: ['screenshots'] }), 'review')
  assert.equal(validateSimulationInput('review', { player: 'a2', checks: [] }), 'review')
  assert.equal(validateSimulationInput('settle', { scoreA: 4, scoreB: 1, checks: ['settlement-ready'] }), 'settle')
  assert.equal(validateSimulationInput('settle', { scoreA: 9, scoreB: 6 }), 'settle')
  for (const id of ['score-correct','review','settle']) assert.equal(validateSimulationInput(id, validInput(id)), '')
})

test('scenarios use the responsible learning role and restart clears local progress', () => {
  for (const [scenario, course] of Object.entries(SIM_SCENARIOS)) {
    const state = createSimulation('member', scenario)
    assert.equal(state.role, course.role); assert.deepEqual(state.ids, course.ids)
    const completed = simulationReducer(state, { type: 'SUBMIT', input: validInput(state.ids[0]) })
    const reset = simulationReducer(completed, { type: 'RESET' })
    assert.deepEqual(reset, { ...state, round: 1 })
    assert.notStrictEqual(reset.history, completed.history)
  }
  assert.deepEqual(createSimulation('invalid', 'invalid', 'admin'), createSimulation())
})

test('every challenge, control and validation response is translated in all four languages', () => {
  const copy = JSON.parse(readFileSync(new URL('../src/features/room-guide/roomGuideCopy.json', import.meta.url)))
  for (const [locale, text] of Object.entries(copy)) for (const [id, challenge] of Object.entries(SIM_CHALLENGES)) {
    for (const field of ['title','task','success']) assert.ok(text[`sim.${id}.${field}`], `${locale}/${id}/${field}`)
    for (const option of challenge.options || []) assert.ok(text[`sim.option.${option}`])
    for (const check of challenge.checks || []) assert.ok(text[`sim.check.${check}`])
    const error = validateSimulationInput(id)
    assert.ok(error.startsWith('decision.') ? text[`sim.${id}.success`] : text[`sim.error.${error}`])
  }
})
