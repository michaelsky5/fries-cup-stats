// Browser-only teaching state. No account IDs, room IDs, network calls or storage.
export const SIM_PLAYERS = [
  { id: 'a1', role: 'DPS' }, { id: 'a2', role: 'DPS' }, { id: 'a3', role: 'TANK' },
  { id: 'a4', role: 'SUP' }, { id: 'a5', role: 'SUP' }, { id: 'a6', role: 'DPS' }, { id: 'a7', role: 'SUP' },
]
export const SIM_CHALLENGES = {
  checkin: { type: 'checks', checks: ['identity','team'], stage: 'entry' },
  assign: { type: 'handover', stage: 'entry' },
  nominate: { type: 'handover', stage: 'entry' },
  pick: { type: 'pick', stage: 'map' },
  lineup: { type: 'lineup', stage: 'lineup' },
  ban: { type: 'ban', stage: 'ban' },
  ready: { type: 'checks', checks: ['lineup','lobby'], stage: 'ready' },
  preflight: { type: 'checks', checks: ['lobby','lineup','network'], stage: 'ready' },
  start: { type: 'decision', options: ['actual-start','web-start'], correct: 'actual-start', stage: 'ready' },
  pause: { type: 'reason', stage: 'live' },
  resume: { type: 'checks', checks: ['recovery-a','recovery-b'], stage: 'live' },
  'map-score': { type: 'score', stage: 'map-result' },
  'score-correct': { type: 'correction', stage: 'map-result' },
  rr5: { type: 'decision', options: ['continue-five','end-three','sixth-map'], correct: 'continue-five', stage: 'map-result' },
  confirm: { type: 'decision', options: ['confirm-result','edit-points'], correct: 'confirm-result', stage: 'result' },
  dispute: { type: 'dispute', stage: 'result' },
  report: { type: 'checks', checks: ['screenshots','players','series'], stage: 'result' },
  review: { type: 'review', stage: 'result' },
  settle: { type: 'settle', stage: 'result' },
  publish: { type: 'checks', checks: ['settled','published'], stage: 'result' },
  forfeit: { type: 'checks', checks: ['forfeit-evidence','forfeit-side','forfeit-review'], stage: 'result' },
  'access-fix': { type: 'decision', options: ['check-link','new-team','share-account'], correct: 'check-link', stage: 'entry' },
  identity: { type: 'decision', options: ['ask-representative','change-guide-role','share-account'], correct: 'ask-representative', stage: 'entry' },
  substitution: { type: 'decision', options: ['approved-roster','type-new-name','play-first'], correct: 'approved-roster', stage: 'lineup' },
  'opening-error': { type: 'reason', stage: 'map' },
  sync: { type: 'decision', options: ['sync-record','repeat-submit','assume-saved'], correct: 'sync-record', stage: 'live' },
  'caster-access': { type: 'decision', options: ['check-assignment','new-team','share-account'], correct: 'check-assignment', stage: 'entry' },
  'caster-lineup': { type: 'checks', checks: ['lineup','bans'], stage: 'ban' },
  'caster-pause': { type: 'decision', options: ['production-message','resume-game','confirm-result'], correct: 'production-message', stage: 'live' },
  'caster-result': { type: 'decision', options: ['working-result','official-result'], correct: 'working-result', stage: 'result' },
}
export const SIM_COURSES = {
  representative: ['checkin','pick','lineup','ban','ready','pause','resume','rr5','confirm'],
  manager: ['nominate','substitution','rr5','sync'],
  member: ['identity','substitution','sync','rr5'],
  referee: ['preflight','start','pause','resume','map-score','score-correct','report','forfeit'],
  caster: ['caster-access','caster-lineup','caster-pause','caster-result','rr5'],
  admin: ['access-fix','assign','substitution','forfeit','review','settle','publish'],
}
export const SIM_SCENARIOS = {
  access: { role: 'admin', ids: ['access-fix'] }, disabled: { role: 'member', ids: ['identity'] },
  handover: { role: 'referee', ids: ['assign'] }, substitution: { role: 'representative', ids: ['substitution','lineup'] },
  'opening-error': { role: 'referee', ids: ['opening-error'] }, disconnect: { role: 'referee', ids: ['pause','resume'] },
  'result-error': { role: 'referee', ids: ['score-correct','report'] }, rr5: { role: 'representative', ids: ['rr5'] },
  forfeit: { role: 'admin', ids: ['forfeit'] }, dispute: { role: 'representative', ids: ['dispute'] },
  sync: { role: 'member', ids: ['sync'] }, broadcast: { role: 'caster', ids: ['caster-access','caster-pause'] },
}

export function createSimulation(role = 'representative', scenario = '', mode = 'referee') {
  const course = SIM_SCENARIOS[scenario]
  const ids = !course && role === 'representative' && mode === 'captains'
    ? ['checkin','pick','lineup','ban','ready','start','pause','resume','map-score','rr5','confirm']
    : course?.ids || SIM_COURSES[role] || SIM_COURSES.representative
  return { role: course?.role || (SIM_COURSES[role] ? role : 'representative'), scenario: course ? scenario : '', mode: mode === 'captains' ? mode : 'referee',
    ids: [...ids], round: 0, index: 0, complete: false, error: '', attempts: 0, history: [], setup: {} }
}

export function validateSimulationInput(challengeId, input = {}, setup = {}) {
  const challenge = SIM_CHALLENGES[challengeId]
  if (!challenge) return 'invalid'
  const note = String(input.note || '').trim()
  if (challenge.type === 'decision') return input.choice === challenge.correct ? '' : `decision.${challengeId}`
  if (challenge.type === 'checks') return challenge.checks.every(key => input.checks?.includes(key)) ? '' : 'checks'
  if (challenge.type === 'handover') return input.player === 'a6' && note.length >= 2 ? '' : 'handover'
  if (challenge.type === 'pick') return ['Samoa','Busan','Lijiang Tower'].includes(input.map) && ['FIRST','SECOND'].includes(input.order) ? '' : 'pick'
  if (challenge.type === 'lineup') {
    const ids = [...new Set(input.players || [])], selected = ids.map(id => SIM_PLAYERS.find(player => player.id === id))
    return ids.length === 5 && selected.every(Boolean) && ['DPS','TANK','SUP'].every(role => selected.filter(player => player.role === role).length === (role === 'TANK' ? 1 : 2)) ? '' : 'lineup'
  }
  if (challenge.type === 'ban') {
    const heroes = { Reinhardt: 'TANK', DVa: 'TANK', Ashe: 'DPS', Tracer: 'DPS', Kiriko: 'SUP', Mercy: 'SUP' }
    return heroes[input.hero] && !(setup.order === 'SECOND' && heroes[input.hero] === 'DPS') ? '' : 'ban'
  }
  if (['reason','dispute'].includes(challenge.type)) return note.length >= 2 ? '' : 'note'
  if (['score','correction'].includes(challenge.type)) return String(input.scoreA) === '2' && String(input.scoreB) === '1' && (challenge.type !== 'correction' || note.length >= 2) ? '' : 'score'
  if (challenge.type === 'review') return input.player === 'a2' && input.checks?.includes('screenshots') ? '' : 'review'
  if (challenge.type === 'settle') return String(input.scoreA) === '9' && String(input.scoreB) === '6' && input.checks?.includes('settlement-ready') ? '' : 'settle'
  return 'invalid'
}

export function simulationReducer(state, action) {
  if (action.type === 'RESET') return { ...createSimulation(state.role, state.scenario, state.mode), round: state.round + 1 }
  if (action.type === 'NEXT') return state.complete && state.index < state.ids.length - 1 ? { ...state, index: state.index + 1, complete: false, error: '' } : state
  if (action.type !== 'SUBMIT' || state.complete) return state
  const challengeId = state.ids[state.index], input = action.input || {}
  const error = validateSimulationInput(challengeId, input, state.setup)
  if (error) return { ...state, error, attempts: state.attempts + 1 }
  return { ...state, complete: true, error: '', history: [...state.history, challengeId], setup: challengeId === 'pick' ? { ...state.setup, map: input.map, order: input.order } : challengeId === 'lineup' ? { ...state.setup, players: [...input.players] } : challengeId === 'ban' ? { ...state.setup, hero: input.hero } : state.setup }
}
