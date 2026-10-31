import { useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { withLocale } from '../../lib/locales.js'
import { GUIDE_ROLES, GUIDE_SCENARIOS, GUIDE_VERSION, ROOM_PRACTICE_CASES, guideLessons, guidePracticeUrl, guideReturnPath, readGuideContext, roomGuideUrl } from './roomGuideModel.js'
import copy from './roomGuideCopy.json'
import RoomGuideSimulator from './RoomGuideSimulator.jsx'
import styles from './WeeklyRoomGuidePage.module.css'
import { GUIDE_FORMATS, guideCopyForFormat } from './roomGuideFormats.js'

const FIELDS = ['who', 'where', 'action', 'success', 'trouble']

export default function WeeklyRoomGuidePage() {
  const locale = useUiLocale()
  const [params, setParams] = useSearchParams()
  const context = readGuideContext(params), text = guideCopyForFormat(copy[locale] || copy['zh-CN'], context.format)
  const [query, setQuery] = useState(''), [shareStatus, setShareStatus] = useState('')
  const [simulationScenario, setSimulationScenario] = useState(context.scenario), [simulationRun, setSimulationRun] = useState(0)
  const caseRef = useRef(null), lessonRef = useRef(null), simulatorRef = useRef(null)
  const lessons = guideLessons(context.role, context.step)
  const stepIndex = lessons.indexOf(context.step)
  const search = query.trim().toLocaleLowerCase()
  const cases = GUIDE_SCENARIOS.filter(key => `${text[`case.${key}.title`]} ${text[`case.${key}.body`]}`.toLocaleLowerCase().includes(search))
  const selectedCase = cases.includes(context.scenario) ? context.scenario : cases[0]
  const sharePath = roomGuideUrl(context, locale, { share: true })
  const practiceUrl = guidePracticeUrl(import.meta.env.VITE_SYSTEM_APP_URL || 'https://admin.fries-cup.com', context.season)
  const simulationUrl = withLocale(`/guides/weekly-room/simulate?role=${context.role}&format=${context.format}`, locale)
  function select(values) {
    setShareStatus('')
    if (values.role) setSimulationScenario('')
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(values)) value ? next.set(key, value) : next.delete(key)
    setParams(next)
  }
  const goStep = step => { select({ step }); lessonRef.current?.focus({ preventScroll: true }) }
  // 票 2.26: the guide sits inside the event centre frame, so the shared header, status line and
  // tab bar replace its own brand, 我的空间 and language bar; the title comes from the frame.
  return <div className={styles.page} data-room-guide data-i18n-ignore lang={locale}>
    <div className={styles.shell}>
      <section className={styles.hero}><div><h1>{text.title}</h1><p className={styles.lead}>{text.intro}</p><p className={styles.public}><span aria-hidden="true">●</span> {text.public}</p></div></section>
      <section className={styles.start}><div><h2>{text['room.start']}</h2><p>{text['room.intro']}</p></div><Link to={simulationUrl}>{text['room.enter']} →</Link></section>
      <div className={styles.utility}><Link to={guideReturnPath(context, locale)}>← {text.back}</Link><button type="button" onClick={async () => { try { await navigator.clipboard.writeText(new URL(sharePath, window.location.origin).href); setShareStatus('copied') } catch { setShareStatus('copy-failed') } }}>{text.share}</button></div>
      {shareStatus && <div className={styles.shareFeedback} role="status"><p>{text[shareStatus]}</p>{shareStatus === 'copy-failed' && <input aria-label={text.share} readOnly value={new URL(sharePath, window.location.origin).href} onFocus={event => event.target.select()} />}<small>{text.privacy}</small></div>}
      <section className={styles.roleSection} aria-labelledby="guide-role-title"><div className={styles.sectionTitle}><h2 id="guide-role-title">{text.role}</h2></div><div className={styles.roles}>{GUIDE_ROLES.map(role => <button type="button" key={role} aria-pressed={context.role === role} onClick={() => select({ role, step: 'entry', scenario: '' })}>{text[`role.${role}`]}<span aria-hidden="true">{context.role === role ? '●' : '→'}</span></button>)}</div><p className={styles.roleIntro}>{text[`intro.${context.role}`]}</p><p className={styles.note}>{text['role-note']}</p><Link className={styles.guideLink} to={simulationUrl}>{text['room.enter']} →</Link></section>
      <section className={styles.modeSection} aria-labelledby="guide-format-title"><div><h2 id="guide-format-title">{text['format.title']}</h2><div className={styles.modeButtons}>{GUIDE_FORMATS.map(format => <button type="button" key={format} aria-pressed={context.format === format} onClick={() => select({ format })}>{text[`format.${format}.label`]}</button>)}</div></div><p>{text[`format.${context.format}.body`]}</p></section>
      <section className={styles.modeSection} aria-labelledby="guide-mode-title"><div><h2 id="guide-mode-title">{text.mode}</h2><div className={styles.modeButtons}>{['referee', 'captains'].map(mode => <button type="button" key={mode} aria-pressed={context.mode === mode} onClick={() => select({ mode })}>{text[`mode.${mode}`]}</button>)}</div></div><p>{text[`mode.${context.mode}.body`]}</p></section>
      <details className={styles.reference}><summary>{text['timing.title']}</summary><section className={styles.practice}><p>{text['timing.limits']}</p><p>{text['timing.grace']}</p><p>{text['timing.penalty']}</p></section></details>
      <details className={styles.reference} ref={simulatorRef} open={Boolean(simulationScenario) || undefined}><summary>{text['sim.title']}</summary><RoomGuideSimulator key={context.role + ':' + context.mode + ':' + context.format + ':' + simulationScenario + ':' + simulationRun} role={context.role} mode={context.mode} format={context.format} scenario={simulationScenario} text={text} onFullCourse={role => { setSimulationScenario(''); select({ role, scenario: '', step: 'entry' }) }} /></details>
      <details className={styles.reference} open={context.step !== 'entry' || undefined}><summary>{text['sim.read-guide']}</summary><section className={styles.course} aria-labelledby="guide-stages-title"><nav className={styles.lessonNav} aria-label={text.steps}><div className={styles.sectionTitle}><h2 id="guide-stages-title">{text.steps}</h2></div><ol>{lessons.map((step, index) => <li key={step}><button type="button" aria-current={context.step === step ? 'step' : undefined} onClick={() => goStep(step)}><span>{String(index + 1).padStart(2, '0')}</span>{text[`step.${step}.title`]}</button></li>)}</ol></nav>
        <article ref={lessonRef} tabIndex={-1} className={styles.lesson} aria-labelledby="guide-lesson-title"><p className={styles.eyebrow}>{String(stepIndex + 1).padStart(2, '0')} / {String(lessons.length).padStart(2, '0')}</p><h2 id="guide-lesson-title">{text[`step.${context.step}.title`]}</h2>
          <figure className={styles.diagram}><div className={styles.diagramBar}><span>FRIES CUP</span><b>A <i>VS</i> B</b><span>{context.format}</span></div><div className={styles.diagramBody}><div><span>①</span><strong>{text['visual.header']}</strong></div><div className={styles.diagramStages}><span>②</span><strong>{text['visual.stage']}</strong><b>{text[`format.${context.format}.progress`]}</b></div><div className={styles.diagramActive}><span>③</span><strong>{text['visual.action']}</strong><em>{text[`step.${context.step}.title`]}</em></div><div><span>④</span><strong>{text['visual.status']}</strong></div></div><figcaption>{text.illustration}</figcaption></figure>
          <dl className={styles.instructions}>{FIELDS.map(field => <div key={field} data-field={field}><dt>{text[field]}</dt><dd>{text[`step.${context.step}.${field}`]}</dd></div>)}</dl><div className={styles.pager}><button type="button" disabled={stepIndex === 0} onClick={() => goStep(lessons[stepIndex - 1])}>← {text.previous}</button><button type="button" disabled={stepIndex === lessons.length - 1} onClick={() => goStep(lessons[stepIndex + 1])}>{text.next} →</button></div>
        </article>
      </section></details>
      <section ref={caseRef} className={styles.cases} aria-labelledby="guide-cases-title"><div className={styles.sectionTitle}><h2 id="guide-cases-title">{text.situations}</h2></div><label className={styles.search}><span>{text.search}</span><input type="search" value={query} onChange={event => setQuery(event.target.value)} /></label><div className={styles.caseGrid}>{cases.map(key => <button type="button" key={key} aria-pressed={selectedCase === key} onClick={() => select({ scenario: key })}>{text[`case.${key}.title`]}<span aria-hidden="true">→</span></button>)}</div>{selectedCase ? <article className={styles.caseAnswer} aria-live="polite"><h3>{text[`case.${selectedCase}.title`]}</h3><p>{text[`case.${selectedCase}.body`]}</p><p><strong>{text.who}：</strong>{text[`case.${selectedCase}.who`]}</p><button type="button" onClick={() => { setSimulationScenario(selectedCase); setSimulationRun(value => value + 1); requestAnimationFrame(() => simulatorRef.current?.scrollIntoView({ block: 'start', behavior: 'instant' })) }}>{text['sim.try-case']} →</button>{ROOM_PRACTICE_CASES[selectedCase] && <Link className={styles.guideLink} to={withLocale('/guides/weekly-room/simulate?' + new URLSearchParams(ROOM_PRACTICE_CASES[selectedCase]), locale)}>{text['room.enter']} →</Link>}</article> : <p role="status">{text['no-results']}</p>}</section>
      <section className={styles.practice} aria-labelledby="guide-practice-title"><div className={styles.sectionTitle}><h2 id="guide-practice-title">{text.practice}</h2></div><p>{text['practice.body']}</p><p>{text['practice.route']}</p><p className={styles.note}>{text['practice.checklist']}</p>{practiceUrl && <a href={practiceUrl} target="_blank" rel="noopener noreferrer">{text['practice.link']} ↗</a>}</section>
      <footer className={styles.footer}><p>{text.scope}</p><span>{text.version} · {GUIDE_VERSION}</span></footer>
    </div>
  </div>
}
