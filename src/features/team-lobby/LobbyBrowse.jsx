import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { lobbyText as t } from './lobbyCopy.js'
import { LOBBY_ROLES, canPublishLobby, lobbyReadFailure } from './lobbyModel.js'
import { reconcileLobbyDraw, updateLobbyBrowseQuery, LOBBY_BROWSE_PAGE_SIZE } from './lobbyBrowseModel.js'
import * as api from './lobbyApi.js'
import LobbyCard from './LobbyCard.jsx'
import common from './Lobby.module.css'
import cards from './LobbyCard.module.css'
import styles from './LobbyBrowse.module.css'

const advancedKeys = ['level', 'time', 'qq', 'recent', 'teamState']
const filterKeys = ['q', ...advancedKeys, 'role']
const valueFrom = (query, key, allowed, fallback = 'all') => allowed.includes(query.get(key)) ? query.get(key) : fallback

function railStops(rail) {
  const maximum = Math.max(0, rail.scrollWidth - rail.clientWidth)
  const left = rail.getBoundingClientRect().left
  const stops = []
  for (const card of rail.children) {
    const stop = Math.min(maximum, Math.max(0, rail.scrollLeft + card.getBoundingClientRect().left - left))
    if (!stops.some(value => Math.abs(value - stop) < 1)) stops.push(stop)
  }
  return stops.length ? stops : [0]
}
const nearestStop = (stops, left) => stops.reduce((closest, stop, index) => Math.abs(stop - left) < Math.abs(stops[closest] - left) ? index : closest, 0)

export default function LobbyBrowse() {
  useUiLocale()
  const [query, setQuery] = useSearchParams()
  const type = query.get('type') === 'people' ? 'people' : 'teams'
  const role = valueFrom(query, 'role', LOBBY_ROLES.map(item => item.value))
  const mode = query.get('view') === 'explore' ? 'explore' : 'browse'
  const page = Math.max(1, Math.min(10000, Math.floor(Number(query.get('page')) || 1)))
  const search = query.get('q') || '', level = query.get('level') || '', availability = query.get('time') || ''
  const qqMode = valueFrom(query, 'qq', ['REQUEST', 'VERIFIED'])
  const recent = valueFrom(query, 'recent', ['day', 'three', 'week'])
  const teamState = type === 'teams' ? valueFrom(query, 'teamState', ['forming', 'established']) : 'all'
  const sort = valueFrom(query, 'sort', ['expiring'], 'recent')
  const scope = JSON.stringify({ type, role, page, pageSize: LOBBY_BROWSE_PAGE_SIZE, mode, q: search,
    level, time: availability, qq: qqMode, recent, teamState, sort })
  const [pool, setPool] = useState(null), [config, setConfig] = useState(null), [error, setError] = useState(null), [attempt, setAttempt] = useState(0)
  const data = pool?.scope === scope ? pool.value : null
  const [now, setNow] = useState(() => Date.now())
  const [deal, setDeal] = useState(0)
  const drawRef = useRef({ scope: null, cards: [], deal: 0 })
  const railRef = useRef(null)
  const [railState, setRailState] = useState({ position: 0, total: 1 })
  const readRailPosition = useCallback(() => {
    const rail = railRef.current
    if (!rail) return
    const stops = railStops(rail), position = nearestStop(stops, rail.scrollLeft)
    setRailState(previous => previous.position === position && previous.total === stops.length ? previous : { position, total: stops.length })
  }, [])
  const activeAdvanced = [level, availability, qqMode !== 'all', recent !== 'all', teamState !== 'all'].filter(Boolean).length
  const activeFilters = Boolean(search || role !== 'all' || activeAdvanced)
  useEffect(() => {
    const timer = setInterval(() => { setNow(Date.now()); setAttempt(value => value + 1) }, 60000)
    return () => clearInterval(timer)
  }, [])
  useEffect(() => {
    const controller = new AbortController()
    setError(null); setPool(previous => previous?.scope === scope ? previous : null)
    const args = JSON.parse(scope)
    const prior = drawRef.current.scope === scope ? drawRef.current.cards : []
    const replacing = drawRef.current.scope !== scope || drawRef.current.deal !== deal
    const timer = setTimeout(() => api.getLobbyConfig({ signal: controller.signal }).then(value => {
      if (controller.signal.aborted) return null
      setConfig(value)
      if (value.mode === 'OFF') return null
      return args.mode === 'explore'
        ? api.exploreLobbyCards({ ...args, [replacing ? 'exclude' : 'keep']: prior.map(card => card.publicId) }, { signal: controller.signal })
        : api.getLobbyCards(args, { signal: controller.signal })
    }).then(value => {
      if (controller.signal.aborted) return
      if (value && (!Array.isArray(value.cards) || !Number.isInteger(value.total) || value.total < 0)) throw new Error('INVALID_LOBBY_RESPONSE')
      if (value && args.mode === 'explore') {
        const cards = replacing ? value.cards : reconcileLobbyDraw(value.cards, prior)
        drawRef.current = { scope, cards, deal }
        value = { ...value, cards }
      }
      setPool(value ? { scope, value } : null); setNow(Date.now())
    }).catch(failure => { if (!controller.signal.aborted) setError(failure) }), 250)
    return () => { clearTimeout(timer); controller.abort() }
  }, [scope, attempt, deal])
  const shown = (data?.cards || []).filter(card => new Date(card.expiresAt).getTime() > now)
  const total = data?.total || 0
  const position = Math.min(railState.position, railState.total - 1)
  useEffect(() => {
    const rail = railRef.current
    if (mode !== 'explore' || !rail) return
    const observer = new ResizeObserver(readRailPosition)
    observer.observe(rail)
    return () => observer.disconnect()
  }, [mode, shown.length, readRailPosition])
  function stepRail(delta) {
    const rail = railRef.current
    if (!rail) return
    const stops = railStops(rail), target = stops[nearestStop(stops, rail.scrollLeft) + delta]
    if (target !== undefined) rail.scrollTo({ left: target, behavior: 'auto' })
  }
  function redeal() {
    setDeal(value => value + 1)
    setRailState(previous => ({ ...previous, position: 0 }))
    railRef.current?.scrollTo({ left: 0, behavior: 'instant' })
  }
  function filter(key, value) {
    setQuery(previous => updateLobbyBrowseQuery(previous, key, value), { replace: ['q', 'level', 'time'].includes(key), preventScrollReset: true })
  }
  function reset() { setQuery(previous => { const next = new URLSearchParams(previous); filterKeys.forEach(key => next.delete(key)); next.set('page', '1'); return next }, { preventScrollReset: true }) }
  const errorMessage = error ? lobbyReadFailure(error) : ''
  return <>
    <div className={`${common.pageHeading} ${styles.heading}`}><div><span className={cards.headingKicker}>{t('组队大厅 · TEAM LOBBY')}</span><h1>{t('找到下一位队友')}</h1><p>{t('发布求队名片，或为队伍找到合适的人。')}</p></div>
      {canPublishLobby(config, error) && <div className={`${common.actions} ${styles.publishActions}`}><Link data-relevant={type === 'people'} className={common.primary} to="/lobby/me/publish?type=person">{t('发布我的求队')}</Link><Link data-relevant={type === 'teams'} to="/lobby/me/publish?type=team">{t('队伍招募')}</Link></div>}
    </div>
    {config && config.mode !== 'OFF' && <section className={styles.controls} aria-label={t('筛选需求')}>
      <div className={styles.browseBar}>
        <div className={styles.typeTabs}><button type="button" aria-pressed={type === 'teams'} onClick={() => filter('type', 'teams')}>{t('队伍招人')}</button><button type="button" aria-pressed={type === 'people'} onClick={() => filter('type', 'people')}>{t('个人找队')}</button></div>
        <div className={styles.viewModes} aria-label={t('浏览方式')}><button type="button" aria-pressed={mode === 'browse'} onClick={() => filter('view', 'browse')}>{t('浏览全部')}</button><button type="button" aria-pressed={mode === 'explore'} onClick={() => filter('view', 'explore')}>{t('探索三张')} <span aria-hidden="true">↗</span></button></div>
      </div>
      <div className={styles.quickFilters}>
        <label className={styles.search}><span>{t('搜索需求')}</span><input type="search" value={search} maxLength={100} placeholder={t('名字、英雄或介绍')} onChange={event => filter('q', event.target.value)} /></label>
        <div className={styles.roleFilters} role="group" aria-label={t('岗位')}><span>{t('岗位')}</span><button type="button" aria-pressed={role === 'all'} onClick={() => filter('role', 'all')}>{t('全部岗位')}</button>{LOBBY_ROLES.map(item => <button key={item.value} type="button" aria-pressed={role === item.value} onClick={() => filter('role', item.value)}>{t(item.label)}</button>)}</div>
      </div>
      <details className={styles.advanced}><summary>{t('更多筛选')}{activeAdvanced > 0 && <span>{activeAdvanced}</span>}<span className={styles.expandMark} aria-hidden="true">+</span></summary>
        <div className={styles.advancedFields}>
          <label>{t('段位关键词')}<input value={level} maxLength={60} placeholder={t('例如：大师、钻石')} onChange={event => filter('level', event.target.value)} /></label>
          <label>{t('可赛时间关键词')}<input value={availability} maxLength={60} placeholder={t('例如：周六、晚上')} onChange={event => filter('time', event.target.value)} /></label>
          <label>{t('QQ 授权方式')}<select value={qqMode} onChange={event => filter('qq', event.target.value)}><option value="all">{t('不限授权方式')}</option><option value="VERIFIED">{t('已允许验证用户查看')}</option><option value="REQUEST">{t('需对方同意')}</option></select></label>
          <label>{t('最近确认')}<select value={recent} onChange={event => filter('recent', event.target.value)}><option value="all">{t('不限确认时间')}</option><option value="day">{t('24 小时内')}</option><option value="three">{t('3 天内')}</option><option value="week">{t('7 天内')}</option></select></label>
          {type === 'teams' && <label>{t('队伍状态')}<select value={teamState} onChange={event => filter('teamState', event.target.value)}><option value="all">{t('全部队伍')}</option><option value="established">{t('队伍招募')}</option><option value="forming">{t('组队中')}</option></select></label>}
        </div><p>{t('段位与时间按填写原文检索；段位由发布者自述。')}</p>
      </details>
    </section>}
    {error && <div role="alert" className={common.error}>{errorMessage} <button type="button" onClick={() => setAttempt(value => value + 1)}>{t('重新读取')}</button></div>}
    {config?.mode === 'OFF' ? <div className={common.empty}><h2>{t('组队大厅暂未开放')}</h2><p>{t('需求记录会保留，已有账号仍可按各自开放范围登录。')}</p></div> : !data && !error ? <p role="status">{t('正在读取需求…')}</p> : data && <>
      {config?.mode === 'READ_ONLY' && <p className={common.notice}>{t('大厅当前只读，可以浏览需求和管理已有联系。')}</p>}
      <div className={styles.resultBar}><span role="status">{t('{0} 条需求', [total])}{activeFilters && <button type="button" onClick={reset}>{t('清除筛选')}</button>}</span>
        {mode === 'browse' && <label>{t('排序')} <select value={sort} onChange={event => filter('sort', event.target.value)}><option value="recent">{t('最近确认优先')}</option><option value="expiring">{t('即将到期优先')}</option></select></label>}
      </div>
      {mode === 'explore' && <section className={styles.exploreBanner} aria-label={t('探索三张')}><span className={styles.exploreKicker}>FRIES CUP / DISCOVER</span><p>{t('从符合当前筛选的需求中，随机展示最多三张。')}</p></section>}
      {!total ? <div className={common.empty}><h2>{activeFilters ? t('没有符合当前筛选的需求') : t('暂时没有展示中的需求')}</h2><p>{t('试着放宽条件，或者换一个岗位看看。')}</p>{activeFilters && <button type="button" onClick={reset}>{t('清除筛选')}</button>}</div>
        : mode === 'browse' && !shown.length ? <div className={common.empty}><h2>{t('这一页已经没有需求了')}</h2><button type="button" onClick={() => filter('page', '1')}>{t('回到第一页')}</button></div>
          : <div ref={railRef} className={`${cards.cardGrid} ${mode === 'explore' ? styles.exploreGrid : ''}`} data-lobby-cards data-explore={mode === 'explore'} onScroll={mode === 'explore' ? readRailPosition : undefined} role={mode === 'explore' ? 'region' : undefined} aria-label={mode === 'explore' ? t('探索卡片') : undefined} tabIndex={mode === 'explore' ? 0 : undefined}>{shown.map(card => <LobbyCard key={card.publicId} card={card} returnTo={`/lobby?${query}`} />)}</div>}
      {mode === 'explore' && shown.length > 0 && <div className={styles.exploreTools}>
        <p className={styles.swipeHint}>{t('左右滑动，发现下一位队友')}</p>
        <div className={styles.railControls}><button type="button" aria-label={t('上一张')} disabled={position === 0} onClick={() => stepRail(-1)}>←</button><span aria-live="polite">{position + 1} / {railState.total}</span><button type="button" aria-label={t('下一张')} disabled={position >= railState.total - 1} onClick={() => stepRail(1)}>→</button></div>
        <button type="button" className={styles.redeal} onClick={redeal} disabled={total <= 3}>{t('再换三张')} <span aria-hidden="true">↻</span></button>
      </div>}
      {mode === 'explore' && total > 0 && total <= 3 && <p className={styles.smallPool}>{t('符合条件的需求不超过三条，已全部展示。')}</p>}
      {mode === 'browse' && total > 0 && <div className={common.pagination}><button disabled={page <= 1} onClick={() => filter('page', String(page - 1))}>{t('上一页')}</button><span>{t('第 {0} 页 · {1} 条需求', [page, total])}</span><button disabled={page * LOBBY_BROWSE_PAGE_SIZE >= total} onClick={() => filter('page', String(page + 1))}>{t('下一页')}</button></div>}
    </>}
  </>
}
