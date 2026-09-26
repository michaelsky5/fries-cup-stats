import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { useLocaleDomTranslation } from '../../hooks/useLocaleDomTranslation.js'
import { translateUiText } from '../../lib/uiText.js'
import { withLocale } from '../../lib/locales.js'
import { WeeklyRoomView } from '../weekly-competition/WeeklyLiveRoomPage.jsx'
import { RoomTransportProvider } from '../weekly-competition/RoomTransport.jsx'
import { buildRoomPractice, createPracticeSession, createPracticeTransport, practiceLesson, PRACTICE_ROLES } from './roomPractice.js'
import copy from './roomGuideCopy.json'
import styles from './RoomPracticePage.module.css'

function Practice({ role, initialScene, text, locale, onRole }) {
  const [session] = useState(() => createPracticeSession(role, initialScene))
  const state = useSyncExternalStore(session.subscribe, session.getSnapshot)
  const [notice, setNotice] = useState(''), [run, setRun] = useState(0), [hint, setHint] = useState(false)
  const textRef = useRef(text), room = useRef(null), coach = useRef(null)
  useLocaleDomTranslation(locale, room, translateUiText)
  useEffect(() => { textRef.current = text }, [text])
  const transport = useMemo(() => createPracticeTransport(session.getSnapshot, session.apply, code => text[`room.error.${code}`] || text['room.error.unsupported']), [session, text])
  const data = buildRoomPractice(state, text)
  const reset = () => { session.reset(); setRun(value => value + 1); setNotice(''); setHint(false) }
  const controller = {
    data, error: '', busy: false, notice,
    refresh: async () => setNotice(text['room.synced']), clearNotice: () => setNotice(''),
    mutate: async operation => {
      try { const result = await operation(); setHint(false); setNotice(textRef.current['room.saved']); return result }
      catch (error) { setNotice(error.practice ? error.message : textRef.current['room.error.unsupported']); return false }
    },
  }
  const staff = ['referee', 'admin'].includes(role)
  const teachingKey = practiceLesson(state)
  const target = state.scene === 'result' ? '[data-stage-view]' : role === 'manager' || state.scene === 'checkin' ? '[data-side="A"]' : ['member', 'caster'].includes(role) || (state.scene === 'live' && !staff && !state.pausedOnce) ? 'footer' : '[data-stage-view]'
  function locate() {
    setHint(true)
    const element = room.current?.querySelector(target)
    const surface = target === '[data-stage-view]' ? element?.querySelector('section') || element : element
    const control = [...(surface?.querySelectorAll('button:not(:disabled), input:not(:disabled)') || [])].find(node => node.getClientRects().length > 0)
    const scrollTarget = control || surface
    scrollTarget?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    control?.focus({ preventScroll: true })
  }
  const jumpResult = () => { session.apply('result', {}, 'scene'); setRun(value => value + 1); setNotice(''); setHint(false); coach.current?.scrollIntoView({ block: 'start' }) }
  return <div className={styles.page} lang={locale}>
    <header className={styles.topbar} data-i18n-ignore><Link to={withLocale(`/guides/weekly-room?role=${role}`, locale)}>← {text['room.exit']}</Link><strong>{text['room.title']}</strong><div><label>{text['sim.role']} <select value={role} onChange={event => onRole(event.target.value)}>{PRACTICE_ROLES.map(value => <option key={value} value={value}>{text[`role.${value}`]}</option>)}</select></label><button type="button" onClick={reset}>{text['sim.reset']}</button></div></header>
    <p className={styles.boundary} data-i18n-ignore>{text['room.boundary']}</p>
    <section ref={coach} className={styles.coach} data-i18n-ignore aria-labelledby="practice-task-title">
      <div className={styles.coachTitle}><span>SIMULATION / {text['room.coach']}</span><h1 id="practice-task-title">{text[`room.task.${teachingKey}`]}</h1><p>{text[`room.help.${teachingKey}`]}</p></div>
      <div className={styles.coachActions}><button type="button" onClick={locate}>{text['room.locate']} ↓</button>{['live', 'review'].includes(state.scene) && <button type="button" onClick={jumpResult}>{text['room.jump']} →</button>}<details><summary>{text['room.terms']}</summary><p>{text['room.glossary']}</p></details></div>
      {state.event !== 'welcome' && <p className={styles.response} role="status">✓ {text[`room.event.${state.event}`] || text['room.saved']}</p>}
    </section>
    <div ref={room} className={styles.room} data-hint={hint ? target === '[data-side="A"]' ? 'team' : target === 'footer' ? 'footer' : 'center' : ''}>
      <RoomTransportProvider value={transport}><WeeklyRoomView key={`${role}:${run}`} preview matchId={data.match.id} controller={controller} returnPathOverride={withLocale('/guides/weekly-room', locale)} returnLabelOverride={text['room.exit']} accountControl={<span className={styles.identity}>{text['room.you']} · {text[`role.${role}`]}</span>} /></RoomTransportProvider>
    </div>
    <footer className={styles.after} data-i18n-ignore><p>{text['room.after']}</p><Link to={withLocale('/me?section=matches', locale)}>{text['room.real-entry']} ↗</Link></footer>
  </div>
}

export default function RoomPracticePage() {
  const locale = useUiLocale(), [params, setParams] = useSearchParams()
  const text = copy[locale] || copy['zh-CN'], role = PRACTICE_ROLES.includes(params.get('role')) ? params.get('role') : 'representative'
  const scene = params.get('scene') || ''
  useEffect(() => { document.title = `${text['room.title']} · Fries Cup` }, [text])
  return <Practice key={role + scene} role={role} initialScene={scene} locale={locale} text={text} onRole={value => setParams({ role: value, ...(params.get('lang') ? { lang: params.get('lang') } : {}) })} />
}
