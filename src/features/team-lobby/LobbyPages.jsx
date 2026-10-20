import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams, useBlocker } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider.jsx'
import * as api from './lobbyApi.js'
import { LOBBY_ROLES, roleLabel, statusLabel, lobbyDate, accountFailure } from './lobbyModel.js'
import styles from './Lobby.module.css'

function ErrorNotice({ error }) { return error ? <p role="alert" className={styles.error}>{accountFailure(error)}</p> : null }
function useMine() {
  const { user } = useAuth()
  const userId = user?.id
  const [data, setData] = useState(null), [error, setError] = useState(null), [attempt, setAttempt] = useState(0)
  useEffect(() => {
    setData(null); setError(null)
    if (!userId) return undefined
    const controller = new AbortController()
    api.getMyLobby({ signal: controller.signal }).then(value => { if (!controller.signal.aborted) setData(value) }).catch(failure => { if (!controller.signal.aborted) setError(failure) })
    return () => controller.abort()
  }, [userId, attempt])
  const refresh = useCallback(() => setAttempt(value => value + 1), [])
  return { data, error, refresh }
}
function Access({ children, write = false, data }) {
  const { user, isBootstrapping } = useAuth()
  const location = useLocation()
  if (isBootstrapping) return <p role="status">正在读取账号…</p>
  if (!user) return <section className={styles.empty}><h1>登录后管理我的组队</h1><p>新人可以自行注册，无需先入队或报名。</p><Link className={styles.primary} to={`/account/login?returnTo=${encodeURIComponent(location.pathname + location.search)}`}>登录／注册</Link></section>
  if (write && !user.emailVerifiedAt) return <section className={styles.empty}><h1>先验证邮箱</h1><Link className={styles.primary} to={`/account/verify-email?returnTo=${encodeURIComponent(location.pathname + location.search)}`}>前往验证邮箱</Link></section>
  if (write && data && !data.canWrite) return <section className={styles.empty}><h1>暂时不能发布或修改</h1><p>{data.restriction || '大厅当前为只读或尚未开放。'}</p><Link to="/lobby/me">返回本人记录</Link></section>
  return children
}
function CardSummary({ card, returnTo }) {
  return <article className={styles.card}>
    <div className={styles.cardTop}><span className={styles.eyebrow}>{card.kind === 'PERSON' ? '个人找队' : card.forming ? '组队中' : '队伍招募'}</span><span>{card.roles.map(roleLabel).join(' / ')}</span></div>
    <h2><Link to={`/lobby/cards/${card.publicId}`} state={{ returnTo }}>{card.title}</Link></h2>
    {card.needs && <p>{card.needs.map(item => `${roleLabel(item.role)} ${item.count} 人`).join(' · ')}</p>}
    <dl><div><dt>可赛时间</dt><dd>{card.availability}</dd></div><div><dt>组队目标</dt><dd>{card.goal}</dd></div></dl>
    <p className={styles.excerpt}>{card.bio}</p><footer>需求确认于 {lobbyDate(card.confirmedAt)}<Link to={`/lobby/cards/${card.publicId}`} state={{ returnTo }}>查看详情 →</Link></footer>
  </article>
}
export function LobbyIndex() {
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
    <div className={styles.pageHeading}><div><span className={styles.eyebrow}>TEAM LOBBY</span><h1>找到下一位队友</h1><p>发布求队名片，或为队伍找到合适的人。</p></div><div className={styles.actions}><Link className={styles.primary} to="/lobby/me/publish?type=person">发布我的求队</Link><Link to="/lobby/me/publish?type=team">队伍招募</Link></div></div>
    <div className={styles.filters}><div className={styles.tabs}><button aria-pressed={type === 'teams'} onClick={() => filter('type', 'teams')}>队伍招人</button><button aria-pressed={type === 'people'} onClick={() => filter('type', 'people')}>个人找队</button></div><label>岗位 <select value={role} onChange={event => filter('role', event.target.value)}><option value="all">全部岗位</option>{LOBBY_ROLES.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label></div>
    <ErrorNotice error={error} />{error && <button onClick={() => setAttempt(value => value + 1)}>重新读取</button>}
    {config?.mode === 'OFF' ? <div className={styles.empty}><h2>组队大厅暂未开放</h2><p>需求记录会保留，已有账号仍可按各自开放范围登录。</p></div> : !data && !error ? <p role="status">正在读取需求…</p> : data && <>
      {config?.mode === 'READ_ONLY' && <p className={styles.notice}>大厅当前只读，可以浏览需求和管理已有联系。</p>}
      {data.cards.length ? <div className={styles.cards}>{data.cards.map(card => <CardSummary key={card.publicId} card={card} returnTo={`/lobby?${query}`} />)}</div> : <div className={styles.empty}><h2>{role === 'all' ? '暂时没有展示中的需求' : '没有符合这个岗位的需求'}</h2><p>这里仅展示仍有效的真实需求。</p>{role !== 'all' && <button onClick={() => filter('role', 'all')}>清除岗位筛选</button>}</div>}
      <div className={styles.pagination}><button disabled={page <= 1} onClick={() => setQuery(current => { current.set('page', String(page - 1)); return current })}>上一页</button><span>第 {page} 页 · {data.total} 条需求</span><button disabled={page * data.pageSize >= data.total} onClick={() => setQuery(current => { current.set('page', String(page + 1)); return current })}>下一页</button></div>
    </>}
  </>
}
export function LobbyDetail() {
  const { publicId } = useParams(), location = useLocation()
  const [card, setCard] = useState(null), [error, setError] = useState(null)
  const returnTo = location.state?.returnTo?.startsWith('/lobby?') ? location.state.returnTo : '/lobby'
  useEffect(() => { const controller = new AbortController(); setCard(null); setError(null); api.getLobbyCard(publicId, { signal: controller.signal }).then(value => { if (!controller.signal.aborted) setCard(value.card) }).catch(failure => { if (!controller.signal.aborted) setError(failure) }); return () => controller.abort() }, [publicId])
  return <><Link to={returnTo}>← 返回需求列表</Link><ErrorNotice error={error} />{!card && !error && <p role="status">正在读取卡片…</p>}{card && <div className={styles.detailGrid}><article className={styles.detail}><span className={styles.eyebrow}>{card.kind === 'PERSON' ? '个人找队' : card.forming ? '组队中' : '队伍招募'}</span><h1>{card.title}</h1><div className={styles.tags}>{card.roles.map(role => <span key={role}>{roleLabel(role)}</span>)}</div><dl><div><dt>可赛时间</dt><dd>{card.availability}</dd></div><div><dt>组队目标</dt><dd>{card.goal}</dd></div>{card.needs && <div><dt>招募需求</dt><dd>{card.needs.map(item => `${roleLabel(item.role)} ${item.count} 人`).join(' · ')}</dd></div>}{card.level && <div><dt>自报水平</dt><dd>{card.level}（非官方认证）</dd></div>}{card.heroes && <div><dt>英雄偏好</dt><dd>{card.heroes}</dd></div>}</dl><h2>介绍</h2><p className={styles.bodyCopy}>{card.bio}</p><p>需求有效至 {lobbyDate(card.expiresAt)}</p></article><aside className={styles.actionPanel}><h2>先找到合适的人</h2><p>当前阶段提供求队与招募资料。申请联系和双方 QQ 授权将在下一阶段开放。</p><p>公开卡片不展示私人联系方式。</p><Link to="/lobby/me">管理我的需求 →</Link></aside></div>}</>
}
export function MyLobby() {
  const { data, error, refresh } = useMine()
  const [failure, setFailure] = useState(null), [busy, setBusy] = useState(false)
  const lock = useRef(false)
  async function act(action) {
    if (lock.current) return
    lock.current = true; setBusy(true); setFailure(null)
    try { await action(); refresh() } catch (problem) { setFailure(problem); if (problem.status === 409 || problem.data?.outcomeUnknown) refresh() }
    finally { lock.current = false; setBusy(false) }
  }
  return <Access><div className={styles.pageHeading}><div><span className={styles.eyebrow}>MY LOBBY</span><h1>我的组队</h1><p>卡片和筹建进度，集中在这里处理。</p></div><Link className={styles.primary} to="/lobby/me/publish?type=person">发布／编辑需求</Link></div><ErrorNotice error={error || failure} />{error && <button onClick={refresh}>重新读取</button>}{!data && !error && <p role="status">正在读取本人记录…</p>}{data && <>
    {!data.canWrite && <p className={styles.notice}>{data.restriction || '当前账号未验证邮箱或大厅尚不可操作。已有记录保留。'} <Link to="/account/verify-email?returnTo=%2Flobby%2Fme">查看邮箱验证</Link></p>}
    <div className={styles.sectionHeading}><h2>我的需求卡</h2><Link to="/lobby/me/publish?type=team">管理队伍招募 →</Link></div>
    {!data.cards.length && <p className={styles.empty}>还没有发布需求。可以先发布个人求队卡，或申请筹建招募。</p>}
    <div className={styles.cards}>{data.cards.map(card => <article className={styles.card} key={card.id}><div className={styles.cardTop}><span>{card.kind === 'PERSON' ? '个人求队' : '队伍招募'}</span><strong>{statusLabel(card.state)}</strong></div><h2>{card.title}</h2><p>有效至 {lobbyDate(card.expiresAt)}</p>{card.moderationReason && <p className={styles.error}>{card.moderationReason}</p>}<div className={styles.actions}><Link to={`/lobby/me/cards/${card.id}/edit`}>编辑资料</Link>{card.state !== 'HIDDEN' && <button disabled={busy || !data.canWrite} onClick={() => act(() => api.changeCard(card.id, { action: 'RENEW', revision: card.revision, operationId: crypto.randomUUID() }))}>确认仍有需求，续期 14 天</button>}{card.state !== 'CLOSED' && <button disabled={busy} onClick={() => act(() => api.changeCard(card.id, { action: 'CLOSE', reason: '暂停需求', revision: card.revision, operationId: crypto.randomUUID() }))}>关闭需求</button>}</div></article>)}</div>
    <div className={styles.sectionHeading}><h2>筹建招募进度</h2><Link to="/lobby/me/formation">申请筹建招募 →</Link></div>
    {!data.formations.length && <p>一个负责人即可申请，无需先有五名队员或报名记录。</p>}
    {data.formations.map(item => <article className={styles.progress} key={item.id}><div><h3>{item.name}</h3><p>{statusLabel(item.status)} · {lobbyDate(item.updatedAt)}</p>{item.reviewNote && <p>{item.reviewNote}</p>}</div><div className={styles.actions}>{item.status === 'RETURNED' && <Link to={`/lobby/me/formation?id=${item.id}`}>修改并重提</Link>}{item.status === 'APPROVED' && <Link to={`/lobby/me/publish?type=team&team=${item.teamId}`}>核对并发布招募</Link>}{['PENDING', 'RETURNED', 'APPROVED'].includes(item.status) && <button disabled={busy} onClick={() => act(() => api.withdrawFormation(item))}>撤回筹建</button>}</div></article>)}
    <div className={styles.sectionHeading}><h2>大厅消息 {data.unreadCount ? `· ${data.unreadCount} 条未读` : ''}</h2></div>
    {data.notices.map(item => <article className={styles.progress} key={item.id}><div><h3>{item.title}</h3><p>{item.body}</p><small>{lobbyDate(item.createdAt)}</small></div>{!item.readAt && <button disabled={busy} onClick={() => act(() => api.readNotice(item.id))}>标为已读</button>}</article>)}
    <p className={styles.notice}>联系请求、QQ 授权与收到／发出列表将在下一阶段接入；核对通过不等于正式报名通过。</p>
  </>}</Access>
}
const blank = { title: '', roles: [], availability: '', goal: '', bio: '', level: '', heroes: '', counts: { TANK: 1, DPS: 1, SUP: 1 } }
export function LobbyEditor() {
  const { cardId } = useParams(), [query] = useSearchParams(), location = useLocation()
  const formation = location.pathname.endsWith('/formation')
  const { data, error } = useMine()
  return <Access write data={data}><ErrorNotice error={error} />{data ? <Editor key={`${cardId || query.get('id') || ''}:${formation}:${query.get('type')}`} data={data} cardId={cardId} formation={formation} query={query} /> : !error && <p role="status">正在读取可管理需求…</p>}</Access>
}
function Editor({ data, cardId, formation, query }) {
  const navigate = useNavigate()
  const existing = cardId ? data.cards.find(item => item.id === cardId) : !formation && query.get('type') !== 'team' ? data.cards.find(item => item.kind === 'PERSON') : null
  const application = formation && query.get('id') ? data.formations.find(item => item.id === query.get('id')) : null
  const kind = formation || existing?.kind === 'TEAM' || query.get('type') === 'team' ? 'TEAM' : 'PERSON'
  const sources = [...data.organizations.map(item => ({ value: `organization:${item.id}`, name: item.name, label: item.name })), ...data.teams.filter(item => !item.organizationId).map(item => ({ value: `team:${item.id}`, name: item.name, label: `${item.name}（组队中）` }))]
  const requestedTeam = data.teams.find(item => item.id === query.get('team'))
  const [source, setSource] = useState(existing?.organizationId ? `organization:${existing.organizationId}` : existing?.teamId ? `team:${existing.teamId}` : requestedTeam?.organizationId ? `organization:${requestedTeam.organizationId}` : requestedTeam ? `team:${requestedTeam.id}` : sources[0]?.value || '')
  const sourceTeamId = source.startsWith('organization:') ? data.teams.find(item => item.organizationId === source.slice(13))?.id : source.slice(5)
  const sourceCard = kind === 'TEAM' && !formation ? data.cards.find(item => item.teamId === sourceTeamId) : null
  const prior = existing || sourceCard || application
  const seed = prior || (kind === 'TEAM' && !formation ? data.formations.find(item => item.status === 'APPROVED' && item.teamId === sourceTeamId) : null)
  const initial = seed ? { ...blank, ...seed, title: seed.title || seed.name, counts: Object.fromEntries((seed.needs || []).map(item => [item.role, item.count])) } : blank
  const [form, setForm] = useState(initial), [preview, setPreview] = useState(false), [error, setError] = useState(null), [busy, setBusy] = useState(false), [dirty, setDirty] = useState(false)
  const lock = useRef(false), operation = useRef(crypto.randomUUID()), committed = useRef(false)
  const blocker = useBlocker(() => dirty && !committed.current)
  useEffect(() => { if (!dirty) return undefined; const warn = event => { event.preventDefault(); event.returnValue = '' }; window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn) }, [dirty])
  const field = key => ({ value: form[key], onChange: event => { setForm(current => ({ ...current, [key]: event.target.value })); setDirty(true) }, disabled: busy })
  if (cardId && !existing) return <p role="alert">没有找到本人可管理的卡片。<Link to="/lobby/me">返回本人记录</Link></p>
  if (formation && query.get('id') && (!application || application.status !== 'RETURNED')) return <p role="alert">这份申请当前不能重提，请查看实际进度。<Link to="/lobby/me">返回</Link></p>
  if (prior?.state === 'HIDDEN') return <p role="alert">卡片已被管理隐藏：{prior.moderationReason}<Link to="/lobby/me">返回记录</Link></p>
  if (kind === 'TEAM' && !formation && !sources.length) return <section className={styles.empty}><h1>从一个负责人开始组队</h1><p>暂无可管理队伍。申请筹建招募，经首次核对后即可招人。</p><Link className={styles.primary} to="/lobby/me/formation">申请筹建招募</Link></section>
  function updateSource(value) {
    setSource(value)
    const teamId = value.startsWith('organization:') ? data.teams.find(item => item.organizationId === value.slice(13))?.id : value.slice(5)
    const selected = data.cards.find(item => item.teamId === teamId)
    setForm(selected ? { ...blank, ...selected, counts: Object.fromEntries((selected.needs || []).map(item => [item.role, item.count])) } : blank)
    operation.current = crypto.randomUUID(); setDirty(false); setError(null); setPreview(false)
  }
  async function submit(event) {
    event.preventDefault()
    if (lock.current || !form.roles.length) { if (!form.roles.length) setError(new Error('请至少选择一个岗位。')); return }
    if (!preview) { setPreview(true); return }
    lock.current = true; setBusy(true); setError(null)
    const payload = { roles: form.roles, availability: form.availability, goal: form.goal, bio: form.bio, operationId: operation.current, ...(prior ? { revision: prior.revision } : {}) }
    if (kind === 'TEAM') payload.needs = form.roles.map(role => ({ role, count: Number(form.counts[role] || 1) }))
    try {
      if (formation) await api.saveFormation({ ...payload, name: form.title }, application?.id)
      else await api.saveCard({ ...payload, kind, title: kind === 'TEAM' ? sources.find(item => item.value === source)?.name || '队伍招募' : form.title,
        level: form.level, heroes: form.heroes, ...(kind === 'TEAM' ? source.startsWith('organization:') ? { organizationId: source.slice(13) } : { teamId: source.slice(5) } : {}) })
      committed.current = true; setDirty(false); navigate('/lobby/me', { replace: true })
    } catch (failure) { setError(failure) } finally { lock.current = false; setBusy(false) }
  }
  return <><div className={styles.pageHeading}><div><span className={styles.eyebrow}>{formation ? 'FORM A TEAM' : 'PUBLISH'}</span><h1>{formation ? '申请筹建招募' : kind === 'PERSON' ? prior ? '编辑我的求队卡' : '发布我的求队' : '队伍招募'}</h1><p>{formation ? '一个负责人即可开始；首次核对后，由你确认并发布。' : '只公开预览中的资料，不展示私人联系方式。'}</p></div><Link to="/lobby/me">返回我的组队</Link></div>
    {blocker.state === 'blocked' && <div role="alert" className={styles.notice}>有未提交的内容。<button onClick={() => blocker.reset()}>继续编辑</button><button onClick={() => blocker.proceed()}>放弃并离开</button></div>}
    <ErrorNotice error={error} />{(error?.data?.outcomeUnknown || error?.name === 'TypeError') && <p><Link to="/lobby/me">先查看本人记录，确认是否保存成功</Link></p>}
    <form onSubmit={submit} className={styles.editorGrid}>
      <div className={`${styles.formPanel} ${styles.stack}`}>
        {kind === 'TEAM' && !formation && <label>代表队伍<select value={source} onChange={event => updateSource(event.target.value)} disabled={busy || Boolean(cardId)}>{sources.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>}
        {(kind === 'PERSON' || formation) && <label>{formation ? '筹建队名' : '公开显示名称'}<input required maxLength={60} {...field('title')} /></label>}
        <fieldset><legend>{kind === 'PERSON' ? '可胜任岗位' : '所需岗位与人数'}</legend>{LOBBY_ROLES.map(item => <div className={styles.roleInput} key={item.value}><label><input type="checkbox" checked={form.roles.includes(item.value)} onChange={event => { setForm(current => ({ ...current, roles: event.target.checked ? [...current.roles, item.value] : current.roles.filter(value => value !== item.value) })); setDirty(true) }} disabled={busy} />{item.label}</label>{kind === 'TEAM' && form.roles.includes(item.value) && <label>人数<input type="number" min={1} max={7} required value={form.counts[item.value] || 1} onChange={event => { setForm(current => ({ ...current, counts: { ...current.counts, [item.value]: event.target.value } })); setDirty(true) }} disabled={busy} /></label>}</div>)}</fieldset>
        <label>可赛／训练时间<input required maxLength={200} placeholder="例如：周三、周五 20:00—23:00" {...field('availability')} /></label>
        <label>组队目标<input required maxLength={120} placeholder="例如：稳定训练，准备参加周赛" {...field('goal')} /></label>
        <label>{formation ? '筹建介绍' : '公开介绍'}<textarea required rows={5} maxLength={1000} {...field('bio')} /><small>请勿填写 QQ、邮箱或其他私人联系方式。</small></label>
        {!formation && <><label>自报水平（可选）<input maxLength={80} {...field('level')} /></label><label>英雄偏好（可选）<input maxLength={200} {...field('heroes')} /></label></>}
        <div className={styles.actions}><button className={styles.primary} disabled={busy || error?.data?.outcomeUnknown || error?.name === 'TypeError'}>{busy ? '正在保存…' : !preview ? '核对预览' : formation ? '提交首次核对' : prior ? '确认保存资料' : '确认发布'}</button>{preview && <button type="button" onClick={() => setPreview(false)}>继续修改</button>}</div>
        {prior && !formation && <p>普通编辑不会续期或顶置。需求完成后请关闭卡片。</p>}
      </div>
      <aside className={styles.preview} aria-label="公开预览"><span className={styles.eyebrow}>{formation ? '待核对资料预览 · 尚不公开' : source.startsWith('team:') && kind === 'TEAM' ? '公开预览 · 组队中' : '公开预览'}</span><h2>{kind === 'TEAM' && !formation ? sources.find(item => item.value === source)?.name : form.title || '你的公开名称'}</h2><p>{form.roles.map(roleLabel).join(' / ') || '选择可胜任或所需岗位'}</p><dl><div><dt>时间</dt><dd>{form.availability || '填写可赛时间'}</dd></div><div><dt>目标</dt><dd>{form.goal || '填写组队目标'}</dd></div></dl><p className={styles.bodyCopy}>{form.bio || '介绍你或你的队伍。'}</p>{form.level && <p>自报水平：{form.level}</p>}{form.heroes && <p>英雄偏好：{form.heroes}</p>}<p>{formation ? '首次核对不等于参赛审核，不自动生成正式队伍。' : '新发布及明确续期默认有效 14 天。'}</p></aside>
    </form>
  </>
}
