import { translateUiText as uiText } from '../../lib/uiText.js'
import { useEffect, useId, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { buildParticipationJourneys, getParticipationView, summarizeParticipation, PARTICIPATION_FILTERS, PARTICIPATION_LABELS } from './participationJourneyModel.js'
import styles from './ParticipationPreparation.module.css'

const symbols = { done: '✓', action: '→', blocked: '!', waiting: '·', quiet: '—' }

export default function ParticipationPreparation({ plans, source, roomSource, seasonId, roomsReadOnly = true, withSeason, matchesVisible = false, locale = 'zh-CN', compact = false, summaryOnly = false }) {
  const [params, setParams] = useSearchParams()
  const headingId = useId()
  const detailRef = useRef(null)
  const sectionRef = useRef(null)
  const items = buildParticipationJourneys(plans, roomSource?.status === 'ready' ? roomSource.data : null, { seasonId, readOnly: roomsReadOnly })
  const view = getParticipationView(items, params)
  const summary = summarizeParticipation(items)
  const expanded = !compact || params.has('journey') || params.has('progress')
  const wasExpanded = useRef(expanded)
  useEffect(() => {
    if (wasExpanded.current && !expanded) {
      sectionRef.current?.focus({ preventScroll: true })
      sectionRef.current?.scrollIntoView({ block: 'start', behavior: 'auto' })
    }
    wasExpanded.current = expanded
  }, [expanded])
  const archived = source?.data?.season?.status === 'ARCHIVED' || roomSource?.data?.season?.status === 'ARCHIVED'
  const en = locale === 'en-US'
  const item = view.selected
  const requestedJourney = params.get('journey')
  const requestedProgress = params.get('progress')
  const hasItems = items.length > 0
  const selectedJourney = item?.id
  useEffect(() => {
    if (!requestedJourney || !selectedJourney || !detailRef.current) return
    detailRef.current.focus({ preventScroll: true })
    detailRef.current.scrollIntoView({ block: 'start', behavior: 'auto' })
  }, [requestedJourney, selectedJourney])
  useEffect(() => {
    if (!expanded || !requestedProgress || requestedJourney || !hasItems) return
    sectionRef.current?.focus({ preventScroll: true })
    sectionRef.current?.scrollIntoView({ block: 'start', behavior: 'auto' })
  }, [expanded, requestedProgress, requestedJourney, hasItems])
  const pending = [source, roomSource].filter(Boolean).some(entry => entry.status !== 'ready')
  const updateView = patch => {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(patch)) value ? next.set(key, value) : next.delete(key)
    setParams(next, { preventScrollReset: true })
  }
  if (!source && !roomSource) return null
  if (summaryOnly) return <nav className={styles.progressLinks} aria-label={uiText("参赛进度入口", locale)}><span>{uiText("提交后的事项继续保留在参赛进度中。", locale)}</span><Link to={withSeason('/me?section=overview&progress=current')}>{uiText("当前进度 ", locale)}{pending ? `${summary.counts.current}+` : summary.counts.current} ↗</Link><Link to={withSeason('/me?section=overview&progress=history')}>{uiText("参赛记录 ↗", locale)}</Link></nav>
  return <section ref={sectionRef} tabIndex={-1} className={styles.preparation} aria-labelledby={headingId}>
    <header className={styles.header}><div><span>MY PARTICIPATION</span><h2 id={headingId}>{uiText("参赛进度", locale)}</h2><p>{expanded ? uiText("查看这次参赛经过了哪些步骤，接下来由谁处理。", locale) : uiText("准备、参赛与赛果，按当前状态继续跟进。", locale)}</p></div>{compact && expanded ? <button type="button" onClick={() => updateView({ progress: '', journey: '' })}>{uiText("收起进度详情 ↑", locale)}</button> : null}</header>
    {pending && <p className={styles.syncNote} role="status">{uiText("部分参赛进度尚未同步，已读取的事项仍可查看。", locale)}</p>}
    {expanded ? <div className={styles.filters} role="group" aria-label={uiText("参赛事项状态", locale)}>{PARTICIPATION_FILTERS.filter(key => ['current', 'all', 'action', 'waiting'].includes(key) || view.counts[key] || view.filter === key).map(key => <button key={key} type="button" aria-pressed={view.filter === key} onClick={() => updateView({ progress: key, journey: '' })}>{PARTICIPATION_LABELS[key]}<span>{pending ? String(view.counts[key]) + '+' : view.counts[key]}</span></button>)}</div> : null}
    {!items.length ? <div className={styles.empty}><strong>{pending ? uiText("正在核对参赛事项", locale) : archived ? en ? 'No participation records for this event' : uiText("本届暂无可展示的参赛记录", locale) : uiText("当前没有已关联的参赛事项", locale)}</strong><p>{pending ? uiText("同步完成后才能确认当前进度。", locale) : archived ? en ? 'This event is archived. Ask the event administrator if a record is missing.' : uiText("本届赛事已归档，如记录有遗漏，请联系周赛管理员核对。", locale) : uiText("接受队伍邀请、确认参赛后，这里会持续显示准备与比赛进度。", locale)}</p><Link to={withSeason('/me?section=team')}>{uiText("查看队伍与参赛入口 ↗", locale)}</Link></div>
      : !expanded ? <>
        <div className={styles.summaryCounts} aria-label={uiText("参赛进度摘要", locale)}>{['action', 'waiting', 'blocked', 'active'].filter(key => summary.counts[key]).map(key => <button type="button" key={key} data-category={key} onClick={() => updateView({ progress: key, journey: '' })}>{PARTICIPATION_LABELS[key]} <b>{summary.counts[key]}{pending ? '+' : ''}</b></button>)}</div>
        {summary.current.length ? <div className={styles.summaryList}>{summary.current.map(entry => <button key={entry.id} type="button" data-category={entry.category} onClick={() => updateView({ journey: entry.id, progress: '' })}>
          <div><span>{entry.scope}</span><strong>{entry.title}</strong></div><div><b>{entry.summary}</b><small>{entry.owner}</small></div><span className={styles.summaryArrow} aria-label={uiText("查看进度详情", locale)}>↗</span>
        </button>)}</div> : <p className={styles.summaryEmpty}>{pending ? uiText("同步后继续核对当前进度。", locale) : uiText("当前没有进行中的事项，已有记录可随时回看。", locale)}</p>}
        <footer className={styles.summaryFooter}>{summary.remaining > 0 ? <button type="button" onClick={() => updateView({ progress: 'current', journey: '' })}>{uiText("还有 ", locale)}{summary.remaining}{uiText(" 项 · 查看当前进度 →", locale)}</button> : null}<button type="button" onClick={() => updateView({ progress: 'history', journey: '' })}>{uiText("参赛记录 ", locale)}{summary.counts.history}{pending ? '+' : ''} ↗</button></footer>
      </> : <div className={styles.workspace}>
        <div className={styles.itemList} aria-label={uiText("参赛事项", locale)}>{view.visible.length ? view.visible.map(entry => <button key={entry.id} type="button" aria-pressed={item?.id === entry.id} data-category={entry.category} onClick={() => updateView({ journey: entry.id })}><span>{entry.scope}</span><strong>{entry.title}</strong><b>{entry.summary}</b><small>{entry.owner}</small></button>) : <p className={styles.empty}>{uiText("当前没有“", locale)}{PARTICIPATION_LABELS[view.filter]}{uiText("”的事项。", locale)}</p>}</div>
        {view.unavailable ? <div className={styles.empty}><strong>{uiText("这项进度不在当前列表中", locale)}</strong><p>{uiText("事项状态可能已变化，或当前赛事关系已不可用。", locale)}</p><button type="button" onClick={() => updateView({ progress: '', journey: '' })}>{uiText("查看全部当前事项", locale)}</button></div> : item ? <div className={styles.detail} ref={detailRef} tabIndex={-1} role="region" aria-label={item.title + ' · ' + item.summary}>
          <div className={styles.context}><div><span>{item.scope}</span><strong>{item.summary}</strong></div><span className={styles.access}>{PARTICIPATION_LABELS[item.category]}</span></div>
          <div className={styles.handoff}><strong>{item.owner}</strong><p>{item.detail}</p>{item.score && <span>{uiText("已审核比分 ", locale)}{item.score}</span>}{item.dueAt && <time dateTime={item.dueAt}>{uiText("截止 ", locale)}{new Date(item.dueAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}{uiText("（北京时间）", locale)}</time>}</div>
          <ol className={styles.stages}>{item.stages.map((stage, index) => <li key={stage.key} data-state={stage.state}><div className={styles.stageTop}><span>{String(index + 1).padStart(2, '0')} / {stage.title}</span><b aria-hidden="true">{symbols[stage.state]}</b></div><h3>{stage.label}</h3>{stage.detail && <p>{stage.detail}</p>}</li>)}</ol>
          <footer className={styles.footer}><Link className={item.category === 'action' ? styles.primary : ''} to={withSeason(item.actionUrl)}>{item.actionLabel} →</Link>{item.readyForSchedule && matchesVisible && <Link to={withSeason('/me?section=matches')}>{uiText("查看比赛安排 ↗", locale)}</Link>}</footer>
        </div> : null}
      </div>}
  </section>
}
