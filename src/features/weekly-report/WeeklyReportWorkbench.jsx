import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useOutletContext, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider.jsx'
import { translateUiText } from '../../lib/uiText.js'
import { buildWeeklyOverview } from '../weekly-overview/weeklyOverviewModel.js'
import { weeklyCycleTitle } from '../weekly-overview/weeklyPresentation.js'
import { changeNewspaper, readNewspaperWorkbench } from './weeklyNewspaperApi.js'
import { applyIssueEdits, validateIssueDraft } from './weeklyIssueVersions.js'
import WeeklyNewspaper from './WeeklyNewspaper.jsx'
import styles from './WeeklyReportWorkbench.module.css'

export default function WeeklyReportWorkbench() {
  const { db, seasonId, locale, withSeason } = useOutletContext()
  const { user, isBootstrapping } = useAuth()
  const [params, setParams] = useSearchParams()
  const cycleId = params.get('cycle'), weekId = params.get('week')
  const overview = useMemo(() => buildWeeklyOverview(db, { cycleId, weekId }), [db, cycleId, weekId])
  const scope = useMemo(() => ({ seasonId, cycleId: cycleId || overview.cycle?.id, weekId: weekId || overview.week?.id, locale }), [seasonId, cycleId, weekId, overview.cycle?.id, overview.week?.id, locale])
  const key = JSON.stringify([scope, user?.id])
  const [record, setRecord] = useState(null), [edits, setEdits] = useState(null)
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [epoch, setEpoch] = useState(0)
  const previewRef = useRef(null)
  const t = (zh, en) => String(locale).startsWith('en') ? en : translateUiText(zh, locale)
  const active = record?.key === key ? record : null
  const draft = useMemo(() => active?.latest ? { ...active.latest.draft, edits: edits || active.latest.draft.edits } : null, [active, edits])
  const paper = useMemo(() => draft ? applyIssueEdits(draft) : null, [draft])
  const checks = draft ? validateIssueDraft(draft) : { errors: [] }
  const dirty = Boolean(edits && active?.latest && JSON.stringify(edits) !== JSON.stringify(active.latest.draft.edits))

  useEffect(() => {
    if (!user?.id || !scope.cycleId || !scope.weekId) return undefined
    const controller = new AbortController()
    readNewspaperWorkbench(scope, { signal: controller.signal })
      .then(result => { if (!controller.signal.aborted) { setRecord({ key, ...result }); setEdits(null); setError('') } })
      .catch(failure => { if (!controller.signal.aborted) setRecord({ key, denied: failure.status === 401 || failure.status === 403, error: failure.message }) })
    return () => controller.abort()
  }, [scope, key, user?.id, epoch])
  useEffect(() => {
    const warn = event => { if (dirty) { event.preventDefault(); event.returnValue = '' } }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])
  async function run(action) {
    setBusy(true); setError('')
    try {
      const expectedRevision = active?.issue?.headRevision || 0
      await changeNewspaper(scope, action, action === 'revisions'
        ? { expectedRevision, expectedSourceVersionId: active.latest.source.id, edits: draft.edits }
        : { expectedRevision })
      setEpoch(value => value + 1)
    } catch (failure) { setError(failure.message) }
    finally { setBusy(false) }
  }
  if (!scope.cycleId || !scope.weekId) return <section className={styles.unavailable}><h1>{t('周报工作台', 'Newspaper workbench')}</h1><p>{t('请选择已有赛程的周赛。', 'Choose a weekly event with a published schedule.')}</p><Link to={withSeason('/')}>{t('返回赛事总览', 'Return to overview')} →</Link></section>
  if (isBootstrapping || (user?.id && !active)) return <p role="status">{t('正在核对管理权限…', 'Checking editorial access…')}</p>
  if (!user?.id || active?.denied) return <section className={styles.unavailable}><h1>{t('周报工作台', 'Newspaper workbench')}</h1><p>{t('仅赛事管理员可使用，请登录有权限的账号。', 'Sign in with an authorized event administrator account.')}</p><Link to={withSeason('/')}>{t('返回赛事总览', 'Return to overview')} →</Link></section>
  if (active?.error) return <p role="alert">{active.error}</p>
  return <div className={styles.root} data-weekly-workbench data-i18n-ignore>
    <nav className={styles.breadcrumbs}><Link to={withSeason('/reports?cycle=' + encodeURIComponent(scope.cycleId))}>← {t('周报归档', 'Report archive')}</Link></nav>
    <header className={styles.heading}><h1>{t('周报工作台', 'Newspaper workbench')}</h1><p>{weeklyCycleTitle(overview.cycle, locale)}</p></header>
    <div className={styles.workspace}>
    <section className={styles.desk}><div className={styles.deskBody}>
    <nav className={styles.weekTabs} aria-label={t('选择周次', 'Choose week')}>{overview.weeks.map(week => <button type="button" key={week.id} aria-pressed={week.id === scope.weekId} disabled={busy || dirty} onClick={() => { setEdits(null); setParams({ cycle: scope.cycleId, week: week.id, lang: params.get('lang') || 'zh', season: params.get('season') || seasonId }) }}>{t('第 ' + week.week_number + ' 周', 'Week ' + week.week_number)}</button>)}</nav>
      <p>{t('版本 ', 'Revision ') + (active?.issue?.headRevision || 0)} · {active?.issue?.publishedRevision ? t('已刊登版本 ', 'Published revision ') + active.issue.publishedRevision : t('尚未刊登', 'Unpublished')}</p>
      <button type="button" disabled={busy || dirty} onClick={() => run('generate')}>{t('生成本期', 'Generate issue')}</button>
      {draft && <>
        <label className={styles.field}>{t('主标题', 'Headline')}<textarea rows={2} value={draft.edits.headline} maxLength={checks.headlineLimit} disabled={busy} onChange={event => setEdits({ ...draft.edits, headline: event.target.value })} /></label>
        {draft.paper.briefs.map(article => <label className={styles.field} key={article.id}>{article.title}<textarea value={draft.edits.briefs[article.id]} maxLength={checks.briefLimit} disabled={busy} onChange={event => setEdits({ ...draft.edits, briefs: { ...draft.edits.briefs, [article.id]: event.target.value } })} /></label>)}
        {checks.errors.map(message => <p key={message} role="alert">{message}</p>)}
        <button type="button" disabled={busy || !dirty || checks.errors.length > 0} onClick={() => run('revisions')}>{t('保存新版本', 'Save revision')}</button>
        <button type="button" disabled={busy || dirty || checks.errors.length > 0 || active.issue.publishedRevision === active.issue.headRevision} onClick={() => run('publish')}>{t('检查排版并刊登', 'Validate and publish')}</button>
      </>}
      {error && <p role="alert">{error}</p>}
    </div></section>
    {draft && <div className={styles.preview} ref={previewRef}><WeeklyNewspaper report={draft.report} newspaperOverride={paper} locale={locale} seasonId={seasonId} withSeason={withSeason} embedded /></div>}
    </div>
  </div>
}
