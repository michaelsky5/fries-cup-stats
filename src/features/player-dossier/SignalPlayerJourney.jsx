import { useEffect } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import TeamLogo from '../../components/matches/TeamLogo.jsx'
import { SignalHeroPortrait } from '../../components/matches/detail/SignalPlayerData.jsx'
import { formatOwHeroName, formatOwMapName } from '../../lib/heroes.js'

import { PlayerArchiveNext, archiveCopy, archiveDate, archiveReason, archiveResult, archiveRole, archiveScore, archiveStage } from './PlayerArchiveSections.jsx'
import styles from './PlayerArchive.module.css'

function AppearanceDetail({ match, locale, linkProps, analysisLink }) {
  const text = (zh, en) => archiveCopy(locale, zh, en)
  return <div id={`player-map-records-${match.matchId}`} className={styles.mapDetail}>
    <div className={styles.mapDetailHeading}><strong>{text('这场比赛，如何上场。', 'Inside this appearance.')}</strong><span>{match.maps.length} {text('图个人出场', 'maps played')} · {text('评分为各职责的单图评分 / 10', 'Map ratings by role / 10')}</span></div>
    <div className={styles.mapGrid}>{match.maps.map(map => <article className={styles.mapCard} key={map.order}>
      <header><span>{String(map.order).padStart(2, '0')}</span><h4>{formatOwMapName(map.name, locale)}</h4><span>{archiveResult(map.result, locale)}</span></header>
      {map.roleRecords.map(record => <div className={styles.mapRole} key={record.role}><span>{archiveRole(record.role, locale)}</span><div>{record.heroes.map(hero => <span key={hero} title={formatOwHeroName(hero, locale)}><SignalHeroPortrait hero={hero} role={record.role} description={formatOwHeroName(hero, locale)} /></span>)}</div><strong>{Number.isFinite(record.rating) ? record.rating.toFixed(1) : '—'}</strong></div>)}
      <Link {...linkProps(`/matches/${encodeURIComponent(match.matchId)}?map=${map.order}`)}>{text('查看本图战报', 'View map report')} ↗</Link>
    </article>)}</div>
    <div className={styles.recordActions}><Link {...linkProps(`/matches/${encodeURIComponent(match.matchId)}`)}>{text('完整比赛详情', 'Full match report')} ↗</Link><Link {...analysisLink({ pview: 'matches', role: match.role, popen: match.key, phero: '', pmap: '', presult: '' })}>{text('查看个人比赛数据', 'Player match statistics')} ↗</Link></div>
  </div>
}

export default function SignalPlayerJourney({ dossier, archive, season, seasonId, locale, linkProps, analysisLink, profileLink }) {
  const text = (zh, en) => archiveCopy(locale, zh, en)
  const location = useLocation()
  const [params, setParams] = useSearchParams()
  const phaseKey = archive.phases.some(phase => phase.key === params.get('pstage')) ? params.get('pstage') : null
  const requested = archive.matches.find(match => match.matchId === params.get('jmatch'))
  const expanded = requested && (!phaseKey || requested.stage.split(' · ')[0] === phaseKey) ? requested.matchId : ''
  const phases = phaseKey ? archive.phases.filter(phase => phase.key === phaseKey) : archive.phases
  const change = values => {
    const next = new URLSearchParams(params)
    Object.entries(values).forEach(([key, value]) => value ? next.set(key, value) : next.delete(key))
    setParams(next, { replace: true, state: location.state, preventScrollReset: true })
  }
  useEffect(() => {
    if (!expanded) return
    let secondFrame
    const frame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => document.getElementById(`player-appearance-${expanded}`)?.scrollIntoView({ block: 'start', behavior: 'instant' }))
    })
    return () => { cancelAnimationFrame(frame); if (secondFrame) cancelAnimationFrame(secondFrame) }
  }, [expanded])

  return <section className={styles.archive} data-player-journey>
    <header className={styles.journeyCover}><div><p>02 / SEASON JOURNEY · {season?.publicCode || seasonId}</p><h1>{dossier.identity.displayName}<span>{text('在这一季。', 'Through the season.')}</span></h1><p>{text('沿着已收录的出场，回到他亲历的比赛。', 'Follow the published record of the matches this player took part in.')}</p></div><div className={styles.journeySummary}><span>{archive.first ? `${archiveDate(archive.first)}${archive.latest !== archive.first ? ` — ${archiveDate(archive.latest)}` : ''}` : text('出场日期待收录', 'Dates not available')}</span><dl><div><dd>{archive.matches.length}</dd><dt>{text('场比赛出场', 'match appearances')}</dt></div><div><dd>{archive.mapCount}</dd><dt>{text('图实际记录', 'maps recorded')}</dt></div></dl><p>{archive.wins} {text('胜', 'W')} · {archive.losses} {text('负', 'L')}{archive.draws ? ` · ${archive.draws} ${text('平', 'D')}` : ''}<span>{text('出场比赛的队伍赛果', 'Team results in these appearances')}</span></p></div></header>

    {archive.matches.length ? <>
      {archive.markers.length > 0 && <nav className={styles.milestones} aria-label={text('赛季节点', 'Season milestones')}>{archive.markers.map(({ match, reasons }, index) => <button type="button" key={match.matchId} aria-pressed={expanded === match.matchId} onClick={() => change({ jmatch: match.matchId, pstage: '' })}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{reasons.map(reason => archiveReason(reason, locale)).join(' · ')}</strong><small>{archiveDate(match)} · {match.opponent.short}</small></div><b aria-hidden="true">↘</b></button>)}</nav>}
      <div className={styles.chronicleHeading}><div><p>APPEARANCE CHRONICLE</p><h2>{text('一场一场，留下记录。', 'The season, appearance by appearance.')}</h2></div><nav aria-label={text('筛选征程阶段', 'Filter journey stages')}><button type="button" aria-pressed={!phaseKey} onClick={() => change({ pstage: '', jmatch: '' })}>{text('全部阶段', 'All stages')}</button>{archive.phases.map(phase => <button type="button" key={phase.key} aria-pressed={phaseKey === phase.key} onClick={() => change({ pstage: phase.key, jmatch: '' })}>{archiveStage(phase.key, locale) || text('未标注阶段', 'Unspecified stage')}</button>)}</nav></div>
      <p className={styles.chronicleNote}>{text('按比赛先后记录，比分为本队在前。点开一场，查看实际出场地图与职责。', 'Appearances in date order, with this player’s team first in scores. Open a match to see maps and roles played.')}</p>
      <div className={styles.chronicle}>{phases.map(phase => <section className={styles.phase} key={phase.key} aria-label={archiveStage(phase.key, locale) || text('未标注阶段', 'Unspecified stage')}>
        <header className={styles.phaseHeading}><div><span>{String(archive.phases.indexOf(phase) + 1).padStart(2, '0')}</span><div><h2>{archiveStage(phase.key, locale) || text('未标注阶段', 'Unspecified stage')}</h2><p>{phase.matches.length} {text('场出场比赛', 'appearances')} · {phase.mapCount} {text('图', 'maps')}</p></div></div><div className={styles.phaseHeroes}><span>{text('本阶段出场最多 · 可查看全季分析', 'Stage leaders · open season analysis')}</span>{phase.heroes.slice(0, 3).map(hero => <Link key={hero.key} {...analysisLink({ pview: 'heroes', role: hero.roles[0], hfocus: hero.key, phero: '', pmap: '', presult: '', popen: '' })}><SignalHeroPortrait hero={hero.hero} role={hero.roles[0]} description={formatOwHeroName(hero.hero, locale)} /><span>{formatOwHeroName(hero.hero, locale)} <b>{hero.maps} {text('图', 'maps')}</b></span></Link>)}</div></header>
        <div className={styles.appearances}>{phase.matches.map(match => <article id={`player-appearance-${match.matchId}`} className={styles.appearance} key={match.matchId} data-open={expanded === match.matchId}>
          <button type="button" className={styles.appearanceButton} aria-expanded={expanded === match.matchId} aria-controls={expanded === match.matchId ? `player-map-records-${match.matchId}` : undefined} onClick={() => change({ jmatch: expanded === match.matchId ? '' : match.matchId })}>
            <time dateTime={match.date || undefined}>{archiveDate(match)}</time><TeamLogo team={match.opponent} seasonId={seasonId} className={styles.logo} /><div className={styles.appearanceIdentity}><strong><small>vs</small> {match.opponent.short}</strong><span>{archiveStage(match.stage, locale)}</span></div><div className={styles.appearanceSample}><strong>{match.maps.length} {text('图出场', 'maps played')}</strong><span>{match.roles.map(role => archiveRole(role, locale)).join(' / ')}</span></div><b className={styles.score}>{archiveScore(match)}</b><span className={styles.outcome} data-result={match.result}>{archiveResult(match.result, locale)}</span><span className={styles.expand} aria-hidden="true">{expanded === match.matchId ? '−' : '+'}</span>
          </button>
          {expanded === match.matchId && <AppearanceDetail match={match} locale={locale} linkProps={linkProps} analysisLink={analysisLink} />}
        </article>)}</div>
      </section>)}</div>
      <p className={styles.sourceNote}>{text('这里仅计入可确认的个人出场；队伍的轮空、判罚或未出场比赛不自动计入。未知比分与缺失评分保留为 —。', 'Only confirmed personal appearances are included. Team byes, administrative results and matches without this player are not added as appearances. Missing scores and ratings remain —.')}</p>
    </> : <div className={styles.empty}><h2>{text('这一季的出场，尚待收录。', 'The appearance record is still to come.')}</h2><p>{text('已登记的队伍与职责保留在选手档案中。这里会在个人出场记录公开后展开。', 'The registered team and role remain in the profile. This journey will unfold when personal appearances are published.')}</p><Link {...profileLink}>{text('返回选手档案', 'Back to the player profile')} ↗</Link></div>}
    <PlayerArchiveNext profileLink={profileLink} analysisLink={analysisLink()} locale={locale} />
  </section>
}
