import { useSyncExternalStore } from 'react'
import { Link } from 'react-router-dom'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { translateUiText as uiText } from '../../lib/uiText.js'
import RoomLobbyTools from './RoomLobbyTools.jsx'
import styles from './RoomMobile.module.css'

// Narrow desktops share the compact layout so the operation area stays usable.
const query = '(max-width: 1179px)'
const subscribe = callback => {
  const media = window.matchMedia(query)
  media.addEventListener('change', callback)
  return () => media.removeEventListener('change', callback)
}
const snapshot = () => window.matchMedia(query).matches
export const useMobileRoom = () => useSyncExternalStore(subscribe, snapshot, () => false)

export function RoomMobileIcon({ kind }) {
  const paths = {
    back: 'm14 6-6 6 6 6',
    operation: 'M4 5h16v14H4z M8 9h8 M8 13h5',
    teams: 'M8 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6 M2 20v-2a6 6 0 0 1 12 0v2 M16 6a3 3 0 0 1 0 6 M17 15a5 5 0 0 1 5 5',
    communication: 'M4 4h16v12H9l-5 4z M8 8h8 M8 12h5',
    more: 'M5 12h.01 M12 12h.01 M19 12h.01',
    refresh: 'M20 10a8 8 0 1 0-2 8 M20 4v6h-6',
  }
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={kind === 'more' ? 4 : 1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[kind]} /></svg>
}

export function RoomMobileHeader({ data, returnPath, busy, error, refresh, onInfo }) {
  const locale = useUiLocale(), t = text => uiText(text, locale)
  const completed = data.maps.some(map => map.status === 'COMPLETE')
  const score = data.result?.official ? data.result : completed ? data.series : null
  const hasScore = Number.isFinite(score?.scoreA) && Number.isFinite(score?.scoreB)
  return <header className={styles.header} data-room-slot="mobile-header">
    <div className={styles.topline}>
      <Link to={returnPath} aria-label={t('离开比赛房')}><RoomMobileIcon kind="back" /></Link>
      <div><strong>FRIES CUP</strong><small>{uiText('第 {0} 图', locale, [data.map?.order || 1])} · {data.match.format}</small></div>
      <button type="button" className={styles.sync} disabled={busy} data-error={!!error} onClick={() => refresh({ force: true })} aria-label={t('重新同步')}><RoomMobileIcon kind="refresh" /></button>
      <button type="button" onClick={onInfo} aria-label={t('查看房间信息')}>{t('房间信息')}</button>
    </div>
    <div className={styles.score} aria-label={t('本场对阵')}><strong title={data.match.teamA.name}>{data.match.teamA.shortName || data.match.teamA.name}</strong><b>{hasScore ? score.scoreA + ' : ' + score.scoreB : 'VS'}</b><strong title={data.match.teamB.name}>{data.match.teamB.shortName || data.match.teamB.name}</strong></div>
  </header>
}

export function RoomMobileNav({ auxiliary, navigate, assistance, staff = false }) {
  const locale = useUiLocale()
  const active = ['teams', 'communication'].includes(auxiliary) ? auxiliary : auxiliary ? 'more' : 'operation'
  return <nav className={styles.nav} aria-label={uiText('比赛房导航', locale)}>
    {[['operation', '当前操作'], ['teams', '双方名单'], ['communication', '比赛沟通'], ['more', staff ? '赛管工具' : '更多操作']].map(([key, label]) => <button type="button" key={key} aria-current={active === key ? 'page' : undefined} onClick={() => navigate(key)}><span><RoomMobileIcon kind={key} />{key === 'communication' && assistance && <i aria-label={uiText('有待处理协助', locale)} />}</span><span>{uiText(label, locale)}</span></button>)}
  </nav>
}

export function RoomMobileInfo({ data, accountControl, disabled, mutate, children }) {
  const locale = useUiLocale(), t = text => uiText(text, locale)
  const facts = [
    ['游戏房间', data.preparation.brief?.roomName || t('等待赛管发布')],
    ['比赛房间设置码', data.preparation.brief?.roomCode || t('未设置')],
    ['本场赛管', data.staff.map(item => item.name).join(' / ') || t('等待指派')],
  ]
  return <div className={styles.info}>
    <p>{data.match.seasonName} · {data.match.weekLabel}</p>
    <h3>{data.match.teamA.name} <small>vs</small> {data.match.teamB.name}</h3>
    <dl>{facts.map(([label, value]) => <div key={label}><dt>{t(label)}</dt><dd>{value}</dd></div>)}</dl>
    <RoomLobbyTools data={data} disabled={disabled} mutate={mutate} />
    {children}
    <div className={styles.account}><strong>{data.actor.label}</strong>{accountControl}</div>
  </div>
}
