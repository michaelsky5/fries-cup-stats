import { translateUiText as uiText } from '../../lib/uiText.js'
import { useId, useMemo, useRef, useState } from 'react'
import TeamLogo from '../../components/matches/TeamLogo.jsx'
import { getPlayerBattleTag, getPlayerDisplayName, getPlayerFavoriteId, getTeamFavoriteId, getTeamFullName, getTeamShortName, sanitizeFavoritesForSeason } from '../favorites/favoritesSelectors.js'
import { FAVORITE_LIMITS } from '../favorites/favoritesConstants.js'
import FollowingLink from './FollowingLink.jsx'
import FollowingPlayerPortrait from './FollowingPlayerPortrait.jsx'
import styles from './FollowingExperience.module.css'

export default function FollowingDiscovery({ db, favorites, excludedFavorites, seasonId, locale, withSeason, onSave, onInteract, onClose, hasFavorites }) {
  const en = locale === 'en-US'
  const [type, setType] = useState('team')
  const [query, setQuery] = useState('')
  const [limit, setLimit] = useState(6)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const lock = useRef(false)
  const searchId = useId()
  const clean = sanitizeFavoritesForSeason(favorites, db)
  const field = type === 'team' ? 'favoriteTeamIds' : 'favoritePlayerIds'
  const items = useMemo(() => {
    const source = type === 'team' ? db?.teams || [] : db?.players || []
    return source.map(item => type === 'team' ? { id: getTeamFavoriteId(item), name: getTeamShortName(item), detail: getTeamFullName(item), route: '/teams/' + encodeURIComponent(item.team_id || item.id || getTeamFavoriteId(item)), item }
      : { id: getPlayerFavoriteId(item), name: getPlayerDisplayName(item), detail: [item.team_short_name || item.team_name, getPlayerBattleTag(item)].filter(Boolean).join(' · '), route: '/players/' + encodeURIComponent(getPlayerFavoriteId(item)), item })
      .filter(item => item.id && !excludedFavorites?.[field]?.includes(item.id))
      .sort((a, b) => a.name.localeCompare(b.name))
      .filter(item => (item.name + ' ' + item.detail).toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
  }, [db, type, query, excludedFavorites, field])
  const toggle = async id => {
    if (lock.current || typeof onSave !== 'function') return
    const existing = clean[field].includes(id)
    if (!existing && clean[field].length >= FAVORITE_LIMITS[type === 'team' ? 'teams' : 'players']) return
    lock.current = true; setBusy(id); setError(''); onInteract()
    try { await onSave(sanitizeFavoritesForSeason({ ...clean, [field]: existing ? clean[field].filter(value => value !== id) : [...clean[field], id] }, db)) }
    catch { setError(en ? 'Following could not be saved. Your saved list is unchanged; try again.' : uiText("关注未能保存，已保存的列表保持不变，请重试。", locale)) }
    finally { lock.current = false; setBusy('') }
  }
  return <section className={styles.discovery} aria-label={en ? 'Discover teams and players' : uiText("发现队伍与选手", locale)}>
    <header><div><span>FIND YOUR FOLLOWING</span><h2>{en ? 'Start with someone you care about' : uiText("从你关心的队伍或选手开始", locale)}</h2><p>{en ? 'Follow here to bring their schedule, results and profiles into one place.' : uiText("直接关注，相关赛程、赛果和档案会汇集到这里。", locale)}</p></div>{hasFavorites && <button type="button" onClick={onClose}>{en ? 'Done' : uiText("完成选择", locale)} ✓</button>}</header>
    <div className={styles.discoveryTools}><div role="group" aria-label={en ? 'Following type' : uiText("关注类型", locale)}>{['team', 'player'].map(kind => <button key={kind} type="button" aria-pressed={type === kind} onClick={() => { setType(kind); setQuery(''); setLimit(6) }}>{kind === 'team' ? en ? 'Teams' : uiText("队伍", locale) : en ? 'Players' : uiText("选手", locale)}</button>)}</div><label htmlFor={searchId}><span>{en ? 'Find by name or team' : uiText("查找名字或队伍", locale)}</span><input id={searchId} type="search" value={query} onChange={event => { setQuery(event.target.value); setLimit(6) }} placeholder={en ? 'Name, team or BattleTag' : uiText("名字、队伍或战网 ID", locale)} /></label><span role="status">{items.length} {en ? items.length === 1 ? 'result' : 'results' : uiText("个结果", locale)}</span></div>
    {error && <p className={styles.error} role="alert">{error}</p>}
    <div className={styles.discoveryList}>{items.slice(0, limit).map(item => {
      const followed = clean[field].includes(item.id)
      const full = !followed && clean[field].length >= FAVORITE_LIMITS[type === 'team' ? 'teams' : 'players']
      return <article key={item.id}>{type === 'team' ? <TeamLogo team={item.item} seasonId={seasonId} className={styles.logo} /> : <FollowingPlayerPortrait player={item.item} db={db} locale={locale} className={styles.initial} />}<FollowingLink to={withSeason(item.route)}><strong>{item.name}</strong><span>{item.detail}</span><small>{en ? 'View profile' : uiText("查看档案", locale)} ↗</small></FollowingLink><button type="button" aria-pressed={followed} aria-label={(followed ? en ? 'Unfollow ' : uiText("取消关注 ", locale) : en ? 'Follow ' : uiText("关注 ", locale)) + item.name} disabled={Boolean(busy) || full} onClick={() => toggle(item.id)}>{busy === item.id ? en ? 'Saving…' : uiText("保存中…", locale) : followed ? en ? 'Following ✓' : uiText("已关注 ✓", locale) : full ? en ? 'Limit reached' : uiText("关注已满", locale) : en ? 'Follow +' : uiText("关注 +", locale)}</button></article>
    })}</div>
    {!items.length && <p>{en ? 'No matching names. Try another search or switch teams and players.' : uiText("没有匹配结果，试试其他名字，或切换队伍与选手。", locale)}</p>}
    {items.length > limit && <button className={styles.more} type="button" onClick={() => setLimit(value => value + 12)}>{en ? 'Show more' : uiText("查看更多", locale)} · {Math.min(limit, items.length)} / {items.length}</button>}
  </section>
}
