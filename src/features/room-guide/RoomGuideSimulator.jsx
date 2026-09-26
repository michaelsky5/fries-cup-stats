import { useReducer, useState } from 'react'
import { SIM_CHALLENGES, SIM_PLAYERS, createSimulation, simulationReducer } from './roomSimulation.js'
import styles from './RoomGuideSimulator.module.css'

const HEROES = [['Reinhardt', 'TANK'], ['DVa', 'TANK'], ['Ashe', 'DPS'], ['Tracer', 'DPS'], ['Kiriko', 'SUP'], ['Mercy', 'SUP']]
const playerName = id => id.toUpperCase()
const lineupOrder = players => ['DPS', 'TANK', 'SUP'].flatMap(role => SIM_PLAYERS.filter(player => player.role === role && players.includes(player.id)))

function Challenge({ state, dispatch, text }) {
  const id = state.ids[state.index], challenge = SIM_CHALLENGES[id]
  const [input, setInput] = useState(() => ({ checks: [], players: [], note: '', map: '', order: '', hero: '', choice: '', player: challenge.type === 'review' ? 'a6' : '', scoreA: challenge.type === 'correction' ? '1' : '', scoreB: challenge.type === 'correction' ? '2' : '' }))
  const set = (key, value) => setInput(current => ({ ...current, [key]: value }))
  const toggle = (key, value) => setInput(current => ({ ...current, [key]: current[key].includes(value) ? current[key].filter(item => item !== value) : [...current[key], value] }))
  const checks = challenge.checks || (challenge.type === 'review' ? ['screenshots'] : challenge.type === 'settle' ? ['settlement-ready'] : [])
  const needsNote = ['reason', 'dispute', 'handover', 'correction'].includes(challenge.type)
  const evidence = ({ score: 'score-fact', correction: 'correction-fact', review: 'review-fact', settle: 'settle-fact' })[challenge.type]
  const needsScore = ['score', 'correction', 'settle'].includes(challenge.type)
  const needsPlayer = ['handover', 'review'].includes(challenge.type)
  const error = state.error.startsWith('decision.') ? text[`sim.${id}.success`] : text[`sim.error.${state.error}`]
  const requestPause = id === 'pause' && state.role === 'representative' && state.mode === 'referee'
  return <form className={styles.task} onSubmit={event => { event.preventDefault(); dispatch({ type: 'SUBMIT', input }) }}>
    <div className={styles.taskHeader}><span>{text['sim.step']} {state.index + 1} / {state.ids.length}</span><h3>{text[`sim.${id}.title`]}</h3><p>{text[`sim.${id}.task`]}</p></div>
    {evidence && <aside className={styles.evidence}><strong>{text['sim.evidence']}</strong><p>{text[`sim.${evidence}`]}</p></aside>}
    <fieldset disabled={state.complete} className={styles.controls}>
      <legend className={styles.srOnly}>{text[`sim.${id}.title`]}</legend>
      {challenge.type === 'decision' && <div className={styles.options} role="group" aria-label={text['sim.choice']}>{challenge.options.map(option => <button type="button" key={option} aria-pressed={input.choice === option} onClick={() => set('choice', option)}>{text[`sim.option.${option}`]}</button>)}</div>}
      {challenge.type === 'pick' && <>
        <div className={styles.options} role="group" aria-label={text['sim.map']}>{['Samoa', 'Busan', 'Lijiang Tower'].map((map, index) => <button className={styles.mapCard} type="button" key={map} aria-pressed={input.map === map} onClick={() => set('map', map)}><span aria-hidden="true">0{index + 1} / CONTROL</span><strong>{text[`sim.map.${map}`]}</strong></button>)}</div>
        <div className={styles.options} role="group" aria-label={text['sim.order']}>{['FIRST', 'SECOND'].map(order => <button type="button" key={order} aria-pressed={input.order === order} onClick={() => set('order', order)}>{text[`sim.${order === 'FIRST' ? 'first' : 'second'}`]}</button>)}</div>
      </>}
      {challenge.type === 'lineup' && <><p>{text['sim.lineup']} · {text['sim.selected']} {input.players.length}/5</p><div className={styles.roster}>{SIM_PLAYERS.map(player => <label key={player.id} className={styles.player} data-selected={input.players.includes(player.id)}><input type="checkbox" checked={input.players.includes(player.id)} onChange={() => toggle('players', player.id)} /><b>{playerName(player.id)}</b><span>{text[`sim.role.${player.role}`]}</span></label>)}</div><div className={styles.formation} aria-label={text['sim.lineup-order']}><span>{text['sim.lineup-order']}</span><div>{lineupOrder(input.players).map(player => <b key={player.id}>{player.role === 'DPS' ? 'C' : player.role === 'TANK' ? 'T' : 'N'}<small>{playerName(player.id)}</small></b>)}</div></div></>}
      {challenge.type === 'ban' && <><p className={styles.evidence}>{text[`sim.ban.${state.setup.order === 'SECOND' ? 'second' : 'first'}`]}</p><div className={styles.heroes} role="group" aria-label={text['sim.ban']}>{HEROES.map(([hero, role]) => <button type="button" key={hero} aria-pressed={input.hero === hero} onClick={() => set('hero', hero)}><span>{text[`sim.role.${role}`]}</span><strong>{text[`sim.hero.${hero}`]}</strong></button>)}</div></>}
      {needsPlayer && <label className={styles.field}>{text[challenge.type === 'review' ? 'sim.report-player' : 'sim.new-representative']}<select value={input.player} onChange={event => set('player', event.target.value)}><option value="">{text['sim.choose']}</option>{SIM_PLAYERS.map(player => <option key={player.id} value={player.id}>{text['sim.player']} {playerName(player.id)} · {text[`sim.role.${player.role}`]}</option>)}</select></label>}
      {needsScore && <div className={styles.scores}>{['A', 'B'].map(side => <label className={styles.field} key={side}>{text[`sim.${challenge.type === 'settle' ? 'points' : 'score'}-${side.toLowerCase()}`]}<input type="number" min="0" max="99" step="1" value={input[`score${side}`]} onChange={event => set(`score${side}`, event.target.value)} /></label>)}</div>}
      {needsNote && <label className={styles.field}>{text['sim.note']}<textarea rows={3} maxLength={600} value={input.note} onChange={event => set('note', event.target.value)} /></label>}
      {checks.length > 0 && <div className={styles.checks}>{checks.map(check => <label key={check}><input type="checkbox" checked={input.checks.includes(check)} onChange={() => toggle('checks', check)} /><span>{text[`sim.check.${check}`]}</span></label>)}</div>}
      {!state.complete && <button type="submit" className={styles.primary}>{text[requestPause ? 'sim.ask-pause' : 'sim.submit']} →</button>}
    </fieldset>
    {state.error && <p className={styles.error} role="alert"><strong>{text['sim.retry']}</strong><br />{error}</p>}
    {state.complete && <div className={styles.success} role="status"><strong>✓ {text['sim.success']}</strong><p>{text[`sim.${id}.success`]}</p>{state.index < state.ids.length - 1 && <button type="button" className={styles.primary} onClick={() => dispatch({ type: 'NEXT' })}>{text['sim.next']} →</button>}</div>}
  </form>
}

export default function RoomGuideSimulator({ role, mode, scenario = '', text, onFullCourse }) {
  const [state, dispatch] = useReducer(simulationReducer, { role, scenario, mode }, ({ role: initialRole, scenario: initialScenario, mode: initialMode }) => createSimulation(initialRole, initialScenario, initialMode))
  const currentId = state.ids[state.index], stage = SIM_CHALLENGES[currentId].stage
  const finished = state.complete && state.index === state.ids.length - 1
  return <section className={styles.simulator} aria-labelledby="simulation-title" id="room-simulation">
    <header className={styles.heading}><div><span className={styles.eyebrow}>LEARN BY PLAYING / RR5</span><h2 id="simulation-title">{text['sim.title']}</h2><p>{text['sim.intro']}</p></div><span className={styles.demo}>SIMULATION</span></header>
    <p className={styles.boundary}>{text['sim.boundary']}</p>
    <div className={styles.toolbar}><p>{text['sim.role']} <strong>{text[`role.${state.role}`]}</strong>{state.scenario && <> · {text[`case.${state.scenario}.title`]}</>}</p><div>{state.scenario && <button type="button" onClick={() => onFullCourse(state.role)}>{text['sim.full']}</button>}<button type="button" onClick={() => dispatch({ type: 'RESET' })}>{text['sim.reset']}</button></div></div>
    {state.scenario && <p className={styles.note}>{text['sim.role-change']}</p>}
    <div className={styles.progress}><label htmlFor="simulation-progress">{text['sim.progress']} {state.history.length}/{state.ids.length}</label><progress id="simulation-progress" max={state.ids.length} value={state.history.length} /></div>
    <div className={styles.layout}><div className={styles.room}>
      <div className={styles.scoreboard}><span>{text['sim.team-a']}</span><strong>A <i>VS</i> B</strong><span>{text['sim.team-b']}</span></div>
      <div className={styles.stage}><span>RR5 / 05 MAPS</span><strong>{text[`step.${stage}.title`]}</strong></div>
      <dl className={styles.board} aria-label={text['sim.board']}><div><dt>{text['sim.map']}</dt><dd>{state.setup.map ? text[`sim.map.${state.setup.map}`] : text['sim.pending']}</dd></div><div><dt>{text['sim.order']}</dt><dd>{state.setup.order ? text[state.setup.order === 'FIRST' ? 'sim.first' : 'sim.second'] : text['sim.pending']}</dd></div><div><dt>{text['sim.ban']}</dt><dd>{state.setup.hero ? text[`sim.hero.${state.setup.hero}`] : text['sim.pending']}</dd></div></dl>
      {state.setup.players && <div className={styles.savedLineup}><span>{text['sim.lineup-order']}</span><div>{lineupOrder(state.setup.players).map(player => <b key={player.id}>{playerName(player.id)}<small>{text[`sim.role.${player.role}`]}</small></b>)}</div></div>}
      <aside className={styles.opponent} aria-live="polite"><strong>◉ {text['sim.scripted']}</strong><p>{state.complete ? text[`sim.${currentId}.success`] : text['sim.waiting']}</p></aside>
      <details className={styles.log} open={state.history.length > 0 || undefined}><summary>{text['sim.log']} · {state.history.length}</summary><ol>{state.history.map(id => <li key={id}>✓ {text[`sim.${id}.title`]}</li>)}</ol></details>
      <p className={styles.note}>{text['sim.advance-story']}</p>
    </div><Challenge key={`${state.round}:${state.index}`} state={state} dispatch={dispatch} text={text} /></div>
    {finished && <div className={styles.finished} role="status"><span aria-hidden="true">★</span><div><h3>{text['sim.finished']}</h3><p>{text['sim.finished.body']}</p></div><button type="button" onClick={() => dispatch({ type: 'RESET' })}>{text['sim.reset']}</button></div>}
  </section>
}
