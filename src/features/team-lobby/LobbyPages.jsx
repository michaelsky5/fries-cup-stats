import { lobbyText as t } from './lobbyCopy.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams, useBlocker } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider.jsx'
import * as api from './lobbyApi.js'
import { LOBBY_ROLES, roleLabel, lobbyDate, accountFailure, leavesLobbyPage, lobbyReadFailure, retryableRead, canPublishLobby, lobbyRegistrationMessage, lobbyCardCopy, needsLabel } from './lobbyModel.js'
import { reportInvalidField, revealAlert } from './lobbyFocus.js'
import styles from './Lobby.module.css'
import { useLobbyMine as useMine } from './useLobbyState.js'
import { ContactEntry } from './LobbyContacts.jsx'

function ErrorNotice({ error, ref }) {
  useUiLocale()
 return error ? <p ref={ref} tabIndex={-1} role="alert" className={styles.error}>{accountFailure(error)}</p> : null }
function ReadFailure({ error, onRetry }) {
  useUiLocale()
  return error ? <p role="alert" className={styles.error}>{lobbyReadFailure(error)}{onRetry && retryableRead(error) && <> <button type="button" onClick={onRetry}>{t("重新读取")}</button></>}</p> : null
}

function Access({ children, write = false, data }) {
  useUiLocale()

  const { user, isBootstrapping, authConfig } = useAuth()
  const registrationMessage = lobbyRegistrationMessage(authConfig)
  const location = useLocation()
  if (isBootstrapping) return <p role="status">{t("正在读取账号…")}</p>
  if (!user) return <section className={styles.empty}><h1>{t("登录后管理我的组队")}</h1>{registrationMessage && <p>{registrationMessage}</p>}<Link className={styles.primary} to={`/account/login?returnTo=${encodeURIComponent(location.pathname + location.search)}`}>{t("登录／注册")}</Link></section>
  if (write && !user.emailVerifiedAt) return <section className={styles.empty}><h1>{t("先验证邮箱")}</h1><Link className={styles.primary} to={`/account/verify-email?returnTo=${encodeURIComponent(location.pathname + location.search)}`}>{t("前往验证邮箱")}</Link></section>
  if (write && data && !data.canWrite) return <section className={styles.empty}><h1>{t("暂时不能发布或修改")}</h1><p>{data.restriction || t("大厅当前为只读或尚未开放。")}</p><Link to="/lobby/me">{t("返回本人记录")}</Link></section>
  return children
}
function CardSummary({ card, returnTo }) {
  useUiLocale()
  const copy = lobbyCardCopy(card.kind)

  return <article className={styles.card}>
    <div className={styles.cardTop}><span className={styles.eyebrow}>{card.kind === 'PERSON' ? t("个人找队") : card.forming ? t("组队中") : t("队伍招募")}</span><span>{card.roles.map(roleLabel).join(' / ')}</span></div>
    <h2><Link to={`/lobby/cards/${card.publicId}`} state={{ returnTo }}>{card.title}</Link></h2>
    {card.needs && <p>{needsLabel(card.needs)}</p>}
    <dl><div><dt>{t("可赛时间")}</dt><dd>{card.availability}</dd></div><div><dt>{t("组队目标")}</dt><dd>{card.goal}</dd></div>
      {card.level && <div><dt>{copy.levelLabel}</dt><dd>{card.level}</dd></div>}
      {card.kind === 'PERSON' && card.heroes && <div><dt>{copy.heroesLabel}</dt><dd>{card.heroes}</dd></div>}</dl>
    <p className={styles.excerpt}>{card.bio}</p><footer>{t("需求确认于")} {lobbyDate(card.confirmedAt)}<Link to={`/lobby/cards/${card.publicId}`} state={{ returnTo }}>{t("查看详情 →")}</Link></footer>
  </article>
}
export function LobbyIndex() {
  useUiLocale()

  const [query, setQuery] = useSearchParams()
  const [data, setData] = useState(null), [config, setConfig] = useState(null), [error, setError] = useState(null), [attempt, setAttempt] = useState(0)
  const type = query.get('type') === 'people' ? 'people' : 'teams'
  const role = LOBBY_ROLES.some(item => item.value === query.get('role')) ? query.get('role') : 'all'
  const page = Math.max(1, Math.min(10000, Number(query.get('page')) || 1))
  useEffect(() => {
    const controller = new AbortController()
    setError(null); setData(null)
    api.getLobbyConfig({ signal: controller.signal }).then(value => {
      if (controller.signal.aborted) return null
      setConfig(value)
      return value.mode === 'OFF' ? null : api.getLobbyCards({ type, role, page }, { signal: controller.signal })
    }).then(value => { if (!controller.signal.aborted) setData(value) }).catch(failure => { if (!controller.signal.aborted) setError(failure) })
    return () => controller.abort()
  }, [type, role, page, attempt])
  function filter(key, value) { const next = new URLSearchParams(query); next.set(key, value); next.set('page', '1'); setQuery(next) }
  return <>
    <div className={styles.pageHeading}><div><h1>{t("找到下一位队友")}</h1><p>{t("发布求队名片，或为队伍找到合适的人。")}</p></div>{canPublishLobby(config, error) && <div className={styles.actions}><Link className={styles.primary} to="/lobby/me/publish?type=person">{t("发布我的求队")}</Link><Link to="/lobby/me/publish?type=team">{t("队伍招募")}</Link></div>}</div>
    {config && config.mode !== 'OFF' && !error && <div className={styles.filters}><div className={styles.tabs}><button aria-pressed={type === 'teams'} onClick={() => filter('type', 'teams')}>{t("队伍招人")}</button><button aria-pressed={type === 'people'} onClick={() => filter('type', 'people')}>{t("个人找队")}</button></div><label>{t("岗位")} <select value={role} onChange={event => filter('role', event.target.value)}><option value="all">{t("全部岗位")}</option>{LOBBY_ROLES.map(item => <option key={item.value} value={item.value}>{t(item.label)}</option>)}</select></label></div>}
    {error && <><p role="alert" className={styles.error}>{lobbyReadFailure(error)}</p><button onClick={() => setAttempt(value => value + 1)}>{t("重新读取")}</button></>}
    {config?.mode === 'OFF' ? <div className={styles.empty}><h2>{t("组队大厅暂未开放")}</h2><p>{t("需求记录会保留，已有账号仍可按各自开放范围登录。")}</p></div> : !data && !error ? <p role="status">{t("正在读取需求…")}</p> : data && <>
      {config?.mode === 'READ_ONLY' && <p className={styles.notice}>{t("大厅当前只读，可以浏览需求和管理已有联系。")}</p>}
      {data.cards.length ? <div className={styles.cards}>{data.cards.map(card => <CardSummary key={card.publicId} card={card} returnTo={`/lobby?${query}`} />)}</div>
        : data.total > 0 ? <div className={styles.empty}><h2>{t("这一页已经没有需求了")}</h2><button onClick={() => filter('page', '1')}>{t("回到第一页")}</button></div>
        : <div className={styles.empty}><h2>{role === 'all' ? t("暂时没有展示中的需求") : t("没有符合这个岗位的需求")}</h2><p>{t("这里仅展示仍有效的真实需求。")}</p>{role !== 'all' && <button onClick={() => filter('role', 'all')}>{t("清除岗位筛选")}</button>}</div>}
      {data.total > 0 && <div className={styles.pagination}><button disabled={page <= 1} onClick={() => setQuery(current => { current.set('page', String(page - 1)); return current })}>{t("上一页")}</button><span>{t('第 {0} 页 · {1} 条需求', [page, data.total])}</span><button disabled={page * data.pageSize >= data.total} onClick={() => setQuery(current => { current.set('page', String(page + 1)); return current })}>{t("下一页")}</button></div>}
    </>}
  </>
}
export function LobbyDetail() {
  useUiLocale()

  const { publicId } = useParams(), location = useLocation()
  const [card, setCard] = useState(null), [error, setError] = useState(null), [attempt, setAttempt] = useState(0)
  const returnTo = location.state?.returnTo?.startsWith('/lobby?') ? location.state.returnTo : '/lobby'
  const copy = card ? lobbyCardCopy(card.kind) : null
  useEffect(() => { const controller = new AbortController(); setCard(null); setError(null); api.getLobbyCard(publicId, { signal: controller.signal }).then(value => { if (!controller.signal.aborted) setCard(value.card) }).catch(failure => { if (!controller.signal.aborted) setError(failure) }); return () => controller.abort() }, [publicId, attempt])
  return <><Link to={returnTo}>{t("← 返回需求列表")}</Link><ReadFailure error={error} onRetry={() => setAttempt(value => value + 1)} />{!card && !error && <p role="status">{t("正在读取卡片…")}</p>}{card && <div className={styles.detailGrid}><article className={styles.detail}><span className={styles.eyebrow}>{card.kind === 'PERSON' ? t("个人找队") : card.forming ? t("组队中") : t("队伍招募")}</span><h1>{card.title}</h1><div className={styles.tags}>{card.roles.map(role => <span key={role}>{roleLabel(role)}</span>)}</div><dl><div><dt>{t("可赛时间")}</dt><dd>{card.availability}</dd></div><div><dt>{t("组队目标")}</dt><dd>{card.goal}</dd></div>{card.needs && <div><dt>{t("招募需求")}</dt><dd>{needsLabel(card.needs)}</dd></div>}{card.level && <div><dt>{copy.levelLabel}</dt><dd>{card.level}{copy.levelNote}</dd></div>}{card.heroes && <div><dt>{copy.heroesLabel}</dt><dd>{card.heroes}</dd></div>}</dl><h2>{copy.bio}</h2><p className={styles.bodyCopy}>{card.bio}</p><p>{t("需求有效至")} {lobbyDate(card.expiresAt)}</p></article><aside className={styles.actionPanel}><ContactEntry card={card} /></aside></div>}</>
}
export { default as MyLobby } from './MyLobbyPage.jsx'

const blank = { title: '', roles: [], availability: '', goal: '', bio: '', level: '', heroes: '', counts: { TANK: 1, DPS: 1, SUP: 1 } }
export function LobbyEditor() {
  useUiLocale()

  const { cardId } = useParams(), [query] = useSearchParams(), location = useLocation()
  const formation = location.pathname.endsWith('/formation')
  const { data, error, refresh } = useMine()
  return <Access write data={data}><ReadFailure error={error} onRetry={refresh} />{data ? <Editor key={`${cardId || query.get('id') || ''}:${formation}:${query.get('type')}`} data={data} cardId={cardId} formation={formation} query={query} /> : !error && <p role="status">{t("正在读取可管理需求…")}</p>}</Access>
}
function Editor({ data, cardId, formation, query }) {
  useUiLocale()

  const navigate = useNavigate()
  const existing = cardId ? data.cards.find(item => item.id === cardId) : !formation && query.get('type') !== 'team' ? data.cards.find(item => item.kind === 'PERSON') : null
  const application = formation && query.get('id') ? data.formations.find(item => item.id === query.get('id')) : null
  const kind = formation || existing?.kind === 'TEAM' || query.get('type') === 'team' ? 'TEAM' : 'PERSON'
  const copy = lobbyCardCopy(kind)
  const sources = [...data.organizations.map(item => ({ value: `organization:${item.id}`, name: item.name, label: item.name })), ...data.teams.filter(item => !item.organizationId).map(item => ({ value: `team:${item.id}`, name: item.name, label: t('{0}（组队中）', [item.name]) }))]
  const requestedTeam = data.teams.find(item => item.id === query.get('team'))
  const [source, setSource] = useState(existing?.organizationId ? `organization:${existing.organizationId}` : existing?.teamId ? `team:${existing.teamId}` : requestedTeam?.organizationId ? `organization:${requestedTeam.organizationId}` : requestedTeam ? `team:${requestedTeam.id}` : sources[0]?.value || '')
  const sourceTeamId = source.startsWith('organization:') ? data.teams.find(item => item.organizationId === source.slice(13))?.id : source.slice(5)
  const sourceCard = kind === 'TEAM' && !formation ? data.cards.find(item => item.teamId === sourceTeamId) : null
  const prior = existing || sourceCard || application
  const seed = prior || (kind === 'TEAM' && !formation ? data.formations.find(item => item.status === 'APPROVED' && item.teamId === sourceTeamId) : null)
  const initial = seed ? { ...blank, ...seed, title: seed.title || seed.name, counts: Object.fromEntries((seed.needs || []).map(item => [item.role, item.count])) } : blank
  const [form, setForm] = useState(initial), [preview, setPreview] = useState(false), [error, setError] = useState(null), [busy, setBusy] = useState(false), [dirty, setDirty] = useState(false)
  const lock = useRef(false), operation = useRef(crypto.randomUUID()), committed = useRef(false), renewOperation = useRef(crypto.randomUUID())
  // Editing never changes visibility. A closed or expired card needs the same
  // explicit renew that My lobby uses, so offer it here instead of a silent save.
  const republishable = !formation && ['EXPIRED', 'CLOSED'].includes(prior?.state)
  const [savedOnly, setSavedOnly] = useState(null), savedRef = useRef(null)
  useEffect(() => { if (savedOnly) revealAlert(savedRef.current) }, [savedOnly])
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && !committed.current && leavesLobbyPage(currentLocation, nextLocation))
  useEffect(() => { if (!dirty) return undefined; const warn = event => { event.preventDefault(); event.returnValue = '' }; window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn) }, [dirty])
  const field = key => ({ name: key, value: form[key], onChange: event => { setForm(current => ({ ...current, [key]: event.target.value })); setDirty(true) }, disabled: busy })
  const alertRef = useRef(null)
  useEffect(() => { if (error) revealAlert(alertRef.current) }, [error])
  const requiredText = [...(kind === 'PERSON' || formation ? [['title', formation ? t("筹建队名") : t("公开显示名称")]] : []),
    ['availability', copy.availability], ['goal', t("组队目标")], ['bio', formation ? t("筹建介绍") : copy.bio]]
  const text = key => String(form[key] || '').trim()
  if (cardId && !existing) return <p role="alert">{t("没有找到本人可管理的卡片。")}<Link to="/lobby/me">{t("返回本人记录")}</Link></p>
  if (formation && query.get('id') && (!application || application.status !== 'RETURNED')) return <p role="alert">{t("这份申请当前不能重提，请查看实际进度。")}<Link to="/lobby/me">{t("返回")}</Link></p>
  if (prior?.state === 'HIDDEN') return <p role="alert">{t("卡片已被管理隐藏：")}{prior.moderationReason}<Link to="/lobby/me">{t("返回记录")}</Link></p>
  if (kind === 'TEAM' && !formation && !sources.length) return <section className={styles.empty}><h1>{t("从一个负责人开始组队")}</h1><p>{t("暂无可管理队伍。申请筹建招募，经首次核对后即可招人。")}</p><Link className={styles.primary} to="/lobby/me/formation">{t("申请筹建招募")}</Link></section>
  function updateSource(value) {
    setSource(value)
    const teamId = value.startsWith('organization:') ? data.teams.find(item => item.organizationId === value.slice(13))?.id : value.slice(5)
    const selected = data.cards.find(item => item.teamId === teamId)
    setForm(selected ? { ...blank, ...selected, counts: Object.fromEntries((selected.needs || []).map(item => [item.role, item.count])) } : blank)
    operation.current = crypto.randomUUID(); setDirty(false); setError(null); setPreview(false)
  }
  async function submit(event) {
    event.preventDefault()
    if (lock.current) return
    const formElement = event.currentTarget
    const blank = requiredText.find(([key]) => !text(key))
    if (blank) { reportInvalidField(formElement.elements.namedItem(blank[0]), t("请填写「{0}」，不能只输入空格。", [blank[1]])); return }
    if (!form.roles.length) { if (!reportInvalidField(formElement.querySelector('input[name=roles]'), t("请至少选择一个岗位。"))) setError(new Error(t("请至少选择一个岗位。"))); return }
    if (!preview) { setPreview(true); return }
    const republish = republishable && event.nativeEvent?.submitter?.value !== 'save'
    lock.current = true; setBusy(true); setError(null)
    const payload = { roles: form.roles, availability: text('availability'), goal: text('goal'), bio: text('bio'), operationId: operation.current, ...(prior ? { revision: prior.revision } : {}) }
    if (kind === 'TEAM') payload.needs = form.roles.map(role => ({ role, count: Number(form.counts[role] || 1) }))
    try {
      if (formation) await api.saveFormation({ ...payload, name: text('title') }, application?.id)
      else {
        const saved = await api.saveCard({ ...payload, kind, title: kind === 'TEAM' ? sources.find(item => item.value === source)?.name || t("队伍招募") : text('title'),
          level: text('level'), heroes: text('heroes'), ...(kind === 'TEAM' ? source.startsWith('organization:') ? { organizationId: source.slice(13) } : { teamId: source.slice(5) } : {}) })
        if (republish) {
          try { await api.changeCard(saved.card.id, { action: 'RENEW', revision: saved.card.revision, operationId: renewOperation.current }) }
          // The details are saved; renewing again from My lobby is safe and visible.
          catch (failure) { committed.current = true; setDirty(false); setSavedOnly(failure); return }
        }
      }
      committed.current = true; setDirty(false); navigate(formation ? '/lobby/me?tab=formation' : '/lobby/me?tab=cards', { replace: true })
    } catch (failure) { setError(failure) } finally { lock.current = false; setBusy(false) }
  }
  return <><div className={styles.pageHeading}><div><h1>{formation ? t("申请筹建招募") : kind === 'PERSON' ? prior ? t("编辑我的求队卡") : t("发布我的求队") : t("队伍招募")}</h1><p>{formation ? t("一个负责人即可开始；首次核对后，由你确认并发布。") : t("只公开预览中的资料，不展示私人联系方式。")}</p></div><Link to="/lobby/me">{t("返回我的组队")}</Link></div>
    {blocker.state === 'blocked' && <div role="alert" className={styles.notice}>{t("有未提交的内容。")}<button onClick={() => blocker.reset()}>{t("继续编辑")}</button><button onClick={() => blocker.proceed()}>{t("放弃并离开")}</button></div>}
    <ErrorNotice error={error} ref={alertRef} />{(error?.data?.outcomeUnknown || error?.name === 'TypeError') && <p><Link to="/lobby/me">{t("先查看本人记录，确认是否保存成功")}</Link></p>}
    {savedOnly && <p ref={savedRef} tabIndex={-1} role="alert" className={styles.error}>{t("资料已保存，但重新发布没有完成：{0}", [accountFailure(savedOnly)])} <Link to="/lobby/me?tab=cards">{t("到我的组队重新发布")}</Link></p>}
    {republishable && <p className={styles.notice}>{prior.state === 'EXPIRED' ? t("这张卡片已于 {0} 到期，目前不在大厅展示。核对预览后选择“保存并重新发布”，即可重新展示 14 天。", [lobbyDate(prior.expiresAt)]) : t("这张卡片已关闭，目前不在大厅展示。核对预览后选择“保存并重新发布”，即可重新展示 14 天。")}</p>}
    <form onSubmit={submit} className={styles.editorGrid}>
      <div className={`${styles.formPanel} ${styles.stack}`}>
        {kind === 'TEAM' && !formation && <label>{t("代表队伍")}<select value={source} onChange={event => updateSource(event.target.value)} disabled={busy || Boolean(cardId)}>{sources.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>}
        {(kind === 'PERSON' || formation) && <label>{formation ? t("筹建队名") : t("公开显示名称")}<input required maxLength={60} {...field('title')} /></label>}
        <fieldset><legend>{kind === 'PERSON' ? t("可胜任岗位") : t("所需岗位与人数")}</legend>{LOBBY_ROLES.map(item => <div className={styles.roleInput} key={item.value}><label><input type="checkbox" name="roles" value={item.value} checked={form.roles.includes(item.value)} onChange={event => { setForm(current => ({ ...current, roles: event.target.checked ? [...current.roles, item.value] : current.roles.filter(value => value !== item.value) })); setDirty(true) }} disabled={busy} />{t(item.label)}</label>{kind === 'TEAM' && form.roles.includes(item.value) && <label>{t("人数")}<input type="number" min={1} max={7} required value={form.counts[item.value] || 1} onChange={event => { setForm(current => ({ ...current, counts: { ...current.counts, [item.value]: event.target.value } })); setDirty(true) }} disabled={busy} /></label>}</div>)}</fieldset>
        <label>{copy.availability}<input required maxLength={200} placeholder={t("例如：周三、周五 20:00—23:00")} {...field('availability')} /></label>
        <label>{t("组队目标")}<input required maxLength={120} placeholder={t("例如：稳定训练，准备参加周赛")} {...field('goal')} /></label>
        <label>{formation ? t("筹建介绍") : copy.bio}<textarea required rows={5} maxLength={1000} placeholder={formation ? undefined : copy.bioPlaceholder} {...field('bio')} /><small>{formation ? t("请勿填写 QQ、邮箱或其他私人联系方式。") : copy.bioHint}</small></label>
        {!formation && <><label>{copy.level}<input maxLength={80} placeholder={copy.levelPlaceholder} {...field('level')} /></label><label>{copy.heroes}<input maxLength={200} placeholder={copy.heroesPlaceholder} {...field('heroes')} /></label></>}
        <div className={styles.actions}><button className={styles.primary} value={republishable ? 'republish' : 'save'} disabled={busy || Boolean(savedOnly) || error?.data?.outcomeUnknown || error?.name === 'TypeError'}>{busy ? t("正在保存…") : !preview ? t("核对预览") : formation ? t("提交首次核对") : republishable ? t("保存并重新发布") : prior ? t("确认保存资料") : t("确认发布")}</button>
          {preview && republishable && <button value="save" disabled={busy || Boolean(savedOnly)}>{t("仅保存资料")}</button>}{preview && <button type="button" onClick={() => setPreview(false)}>{t("继续修改")}</button>}</div>
        {prior && !formation && !republishable && <p>{t("普通编辑不会续期或顶置。需求完成后请关闭卡片。")}</p>}
      </div>
      <aside className={styles.preview} aria-label={t("公开预览")}><span className={styles.eyebrow}>{formation ? t("待核对资料预览 · 尚不公开") : source.startsWith('team:') && kind === 'TEAM' ? t("公开预览 · 组队中") : t("公开预览")}</span><h2>{kind === 'TEAM' && !formation ? sources.find(item => item.value === source)?.name : form.title || t("你的公开名称")}</h2><p>{form.roles.map(roleLabel).join(' / ') || t("选择可胜任或所需岗位")}</p><dl><div><dt>{t("时间")}</dt><dd>{form.availability || t("填写可赛时间")}</dd></div><div><dt>{t("目标")}</dt><dd>{form.goal || t("填写组队目标")}</dd></div>
        {kind === 'TEAM' && form.roles.length > 0 && <div><dt>{t("招募需求")}</dt><dd>{needsLabel(form.roles.map(role => ({ role, count: Number(form.counts[role] || 1) })))}</dd></div>}
        {!formation && form.level && <div><dt>{copy.levelLabel}</dt><dd>{form.level}{copy.levelNote}</dd></div>}
        {!formation && form.heroes && <div><dt>{copy.heroesLabel}</dt><dd>{form.heroes}</dd></div>}</dl><p className={styles.bodyCopy}>{form.bio || t("介绍你或你的队伍。")}</p><p>{formation ? t("首次核对不等于参赛审核，不自动生成正式队伍。") : t("新发布及明确续期默认有效 14 天。")}</p></aside>
    </form>
  </>
}
