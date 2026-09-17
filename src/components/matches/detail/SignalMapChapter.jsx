import { translateUiText as uiText } from '../../../lib/uiText.js'
import { useUiLocale } from '../../../hooks/useUiLocale.js'
import { useMemo, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import TeamLogo from '../TeamLogo.jsx'
import DualTeamStatsTable from './DualTeamStatsTable.jsx'
import { getHeroAvatarSrc, getRoleEnLabel, getRoleLabel } from '../../../lib/leaderboardSelectors.js'
import { getMapImage } from '../../../lib/reviewAssets.js'
import { getMatchReviewPlayers, getReviewBanOrder } from '../../../lib/matchReviewSelectors.js'
import styles from './SignalMapChapter.module.css'

export function MapImage({ map, eager = false }) {
  const [failedSrc, setFailedSrc] = useState('')
  const src = map.rawName && map.rawType ? getMapImage(map.rawType, map.rawName) : ''
  return src && failedSrc !== src
    ? <img src={src} alt="" loading={eager ? 'eager' : 'lazy'} onError={() => setFailedSrc(src)} />
    : <span className={styles.imageFallback} aria-hidden="true">{map.orderLabel}</span>
}

function HeroPortrait({ hero, role, name }) {
  const [failedSrc, setFailedSrc] = useState('')
  const src = hero ? getHeroAvatarSrc(hero, role) : ''
  return src && failedSrc !== src
    ? <img src={src} alt="" loading="lazy" onError={() => setFailedSrc(src)} />
    : <span aria-hidden="true">{name?.slice(0, 1) || '—'}</span>
}

function MapCode({ code, name, en }) {
  const uiLocale = useUiLocale()
  const [message, setMessage] = useState('')
  if (!code || code === '-') return null
  const copy = async () => {
    try { await navigator.clipboard.writeText(code); setMessage(en ? 'Copied' : uiText("已复制", uiLocale)) }
    catch { setMessage(en ? 'Select code to copy' : uiText("可选中代码复制", uiLocale)) }
  }
  return <div className={styles.code}>
    <span>{en ? 'MATCH CODE' : uiText("比赛代码", uiLocale)}</span><code>{code}</code>
    <button type="button" onClick={copy} aria-label={en ? `Copy ${name} match code` : uiText("复制{0}比赛代码", uiLocale, [name])}>{en ? 'Copy' : uiText("复制", uiLocale)}</button>
    <small role="status">{message}</small>
  </div>
}

function Lineup({ side, map, dossier, rows, seasonId, en, withSeason, returnState, onNavigate }) {
  const uiLocale = useUiLocale()
  const team = dossier[`team${side}`]
  const ban = map[`team${side}Ban`]
  const banOrder = getReviewBanOrder(map, side)
  return <section className={styles.lineup} aria-label={`${team.short} ${en ? 'map lineup and ban' : uiText("本图阵容与禁用", uiLocale)}`}>
    <header>
      <TeamLogo team={dossier.match[`team_${side.toLowerCase()}`]} seasonId={seasonId} teamShortName={team.short} teamName={team.full} className={styles.teamLogo} />
      <strong>{team.short}</strong>
      <div className={styles.ban} data-ban-order={banOrder || undefined}><span>{banOrder ? (en ? `${banOrder === 1 ? '1st' : '2nd'} BAN` : `${banOrder === 1 ? uiText('先', uiLocale) : uiText('后', uiLocale)} BAN`) : (en ? 'BAN' : uiText("禁用", uiLocale))}</span>{ban && ban !== '—' && ban !== '-' ? <><i><HeroPortrait hero={ban} role={map[`team${side}BanRole`]} /></i><b>{ban}</b></> : <b>—</b>}</div>
    </header>
    <div className={styles.players}>
      {rows.map(row => {
        const description = `${row.displayName} · ${en ? getRoleEnLabel(row.role) : uiText(getRoleLabel(row.role), uiLocale)} · ${row.heroes.join(' / ') || '—'}`
        const content = <><span className={styles.portrait}><HeroPortrait hero={row.heroes[0]} role={row.role} name={row.displayName} />{row.heroes.length > 1 ? <em>+{row.heroes.length - 1}</em> : null}</span><strong>{row.displayName}</strong></>
        return row.playerId
          ? <Link key={row.key} to={withSeason(`/players/${encodeURIComponent(row.playerId)}?role=${encodeURIComponent(row.role)}`)} state={returnState} onClick={onNavigate} title={description} aria-label={description}>{content}</Link>
          : <div key={row.key} title={description}>{content}</div>
      })}
    </div>
    {!rows.length ? <p className={styles.unpublished}>{en ? 'Lineup not published' : uiText("出场阵容尚未发布", uiLocale)}</p> : null}
  </section>
}

export default function SignalMapChapter({ map, dossier, seasonId, locale, t, withSeason, returnState, onNavigate, setMapRef, video, previousMap, nextMap, onSelectMap, activeMatch = false }) {
  const en = locale === 'en-US'
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const collapsedMaps = (searchParams.get('collapsed') || '').split(',').filter(Boolean)
  const collapsed = collapsedMaps.includes(String(map.order))
  const toggleCollapsed = () => {
    const orders = new Set(collapsedMaps)
    if (collapsed) orders.delete(String(map.order))
    else orders.add(String(map.order))
    const next = new URLSearchParams(searchParams)
    if (orders.size) next.set('collapsed', [...orders].join(','))
    else next.delete('collapsed')
    setSearchParams(next, { replace: true, state: { ...location.state, restoreScrollY: undefined } })
  }
  const players = useMemo(() => getMatchReviewPlayers(dossier, map.order), [dossier, map.order])
  const hasLineupDetail = players.length > 0 || [map.teamABan, map.teamBBan].some(ban => ban && ban !== '—' && ban !== '-')
  const administrative = map.raw?.is_administrative === true
  const rulingOnly = administrative && !map.hasStats
  const outcome = !map.hasResult ? (en ? 'AWAITING PLAY' : uiText("待赛", locale)) : map.winnerTeam ? `${map.winnerTeam.short} ${administrative ? (en ? 'AWARDED WIN' : uiText("判胜", locale)) : (en ? 'WIN' : uiText("获胜", locale))}` : map.winnerSide === 'DRAW' ? (en ? 'DRAW' : uiText("平局", locale)) : (en ? 'RESULT PENDING' : uiText("胜负待确认", locale))
  const hasCode = Boolean(map.lobbyCode && map.lobbyCode !== '-')
  return <article id={`map-${map.order}`} ref={node => setMapRef(map.order, node)} className={styles.chapter} aria-labelledby={`map-${map.order}-title`} data-map-order={map.order} data-deciding={map.deciding || undefined}>
    <header className={styles.header}>
      <div className={styles.scene}>
        <MapImage map={map} eager={map.order === dossier.mapRecords[0]?.order} />
        <div className={styles.sceneTop}><span>{map.type}</span>{map.deciding || map.tied ? <strong>{map.deciding ? (en ? 'DECIDER' : uiText("决胜图", locale)) : (en ? 'SERIES TIED' : uiText("追平", locale))}</strong> : null}</div>
        <div className={styles.mapName}><span aria-hidden="true">{map.orderLabel}</span><div><small>{map.rawName}</small><h3 id={`map-${map.order}-title`}>{map.name}</h3></div></div>
      </div>
      <div className={styles.result}>
        <div className={styles.resultLabel}><strong>{outcome}</strong>{map.hasStats ? <button type="button" onClick={toggleCollapsed} aria-expanded={!collapsed} aria-controls={`map-${map.order}-statistics`} aria-label={`${collapsed ? (en ? 'Show' : uiText("展开", locale)) : (en ? 'Hide' : uiText("收起", locale))}${en ? ' ' : ''}${map.name}${en ? ' statistics' : uiText("数据", locale)}`}>{collapsed ? (en ? 'Show stats +' : uiText("展开数据 +", locale)) : (en ? 'Hide stats −' : uiText("收起数据 −", locale))}</button> : null}</div>
        <div className={styles.score} aria-label={`${dossier.teamA.short} ${map.scoreA} : ${map.scoreB} ${dossier.teamB.short}`}>
          <div data-winner={map.winnerSide === 'A'}><span>{dossier.teamA.short}</span><strong>{map.scoreA}</strong></div><i>:</i><div data-winner={map.winnerSide === 'B'}><span>{dossier.teamB.short}</span><strong>{map.scoreB}</strong></div>
        </div>
        <dl><div><dt>{rulingOnly ? (en ? 'Result type' : uiText("结果类型", locale)) : (en ? 'Map time' : uiText("局内时长", locale))}</dt><dd>{rulingOnly ? (en ? 'Ruling' : uiText("裁决", locale)) : map.matchTime || '—'}</dd></div><div><dt>{en ? 'Series after map' : uiText("本图后大比分", locale)}</dt><dd>{map.cumulative}</dd></div></dl>
      </div>
    </header>
    {!rulingOnly && (!map.hasStats || collapsed) && (!activeMatch || hasLineupDetail) ? <div className={styles.lineups}>{['A', 'B'].map(side => <Lineup key={side} side={side} map={map} dossier={dossier} rows={players.filter(row => row.side === side)} seasonId={seasonId} en={en} withSeason={withSeason} returnState={returnState} onNavigate={onNavigate} />)}</div> : null}
    {rulingOnly ? <div className={styles.ruling} data-map-ruling><strong>{en ? 'Map ruling' : uiText("单局裁决", locale)}</strong><p>{map.notes || (en ? 'This map was decided by an official ruling.' : uiText("本图胜负由赛事裁决确定。", locale))}</p></div> : <>
      <div id={`map-${map.order}-statistics`} hidden={collapsed}>
        {map.hasStats ? <DualTeamStatsTable signal map={map} dossier={dossier} seasonId={seasonId} locale={locale} t={t} withSeason={withSeason} returnState={returnState} onPlayerNavigate={onNavigate} /> : <p className={styles.unpublished}>{map.hasResult ? (en ? 'Map result published; player statistics are not yet available.' : uiText("本图赛果已发布，选手统计尚未提供。", locale)) : (en ? 'Player statistics will follow after play begins.' : uiText("本图选手统计将在比赛开始后更新。", locale))}</p>}
      </div>
      {map.notes ? <p className={styles.notes}>{map.notes}</p> : null}
    </>}
    <footer className={styles.footer}>
      <div className={styles.footerResources}>
        {hasCode ? <MapCode code={map.lobbyCode} name={map.name} en={en} /> : <span className={styles.noCode}>{rulingOnly ? (en ? 'No replay code for this ruling' : uiText("裁决图无回放代码", locale)) : (en ? 'Match code not published' : uiText("比赛代码尚未发布", locale))}</span>}
        {video ? <a href={video.url} target="_blank" rel="noreferrer" title={video.kind === 'archive' ? (en ? 'Find this match by opponent and date' : uiText("按对阵与日期查找本场录像", locale)) : undefined}>{video.kind === 'archive' ? (en ? 'Video archive' : uiText("赛事录像库", locale)) : (en ? 'Match replay' : uiText("本场录像", locale))} ↗</a> : null}
      </div>
      {previousMap || nextMap ? <nav className={styles.chapterNav} aria-label={en ? `Continue from map ${map.order}` : uiText("第 {0} 图阅读导航", locale, [map.order])}>
        {previousMap ? <button type="button" onClick={() => onSelectMap(previousMap.order)}><i aria-hidden="true">←</i><span><small>{en ? 'Previous map' : uiText("上一图", locale)}</small><strong>{previousMap.name}</strong></span></button> : <span />}
        {nextMap ? <button type="button" onClick={() => onSelectMap(nextMap.order)}><span><small>{en ? 'Next map' : uiText("下一图", locale)}</small><strong>{nextMap.name}</strong></span><i aria-hidden="true">→</i></button> : <span />}
      </nav> : null}
    </footer>
  </article>
}
