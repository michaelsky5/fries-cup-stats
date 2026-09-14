import { useState } from 'react'
import { Link } from 'react-router-dom'
import TeamLogo from '../../components/matches/TeamLogo.jsx'
import { SignalHeroPortrait } from '../../components/matches/detail/SignalPlayerData.jsx'
import useCompactMatchLayout from '../../components/matches/detail/useCompactMatchLayout.js'
import { formatOwHeroName, formatOwMapName } from '../../lib/heroes.js'
import { archiveCopy, archiveRole, archiveStage, archiveDate, archiveScore, archiveResult } from './PlayerArchiveSections.jsx'
import { getPlayerSignatureMatch, getPlayerPersonalReadout } from './playerPersonalStory.js'
import { getRecordedPlayerHeroes, playerMapKey } from './playerDossierPresentation.js'
import styles from './PlayerPersonalStory.module.css'

export function signatureReason(signature, locale) {
  const text = (zh, en) => archiveCopy(locale, zh, en)
  if (signature.reason === 'best') return signature.tiedCount > 1 ? text('并列本季最高全场评分', 'Joint highest match rating this season') : text('本季最高全场评分', 'Highest match rating this season')
  if (signature.reason === 'onlyRated') return text('从这场已评分的出场开始', 'Start with this rated appearance')
  if (signature.reason === 'firstWin') return text('首次收录的胜利', 'First recorded win')
  if (signature.reason === 'win') return text('留下一场胜利', 'A win to revisit')
  return text('属于你的出场记录', 'An appearance of your own')
}

export function PlayerSignatureMatch({ appearances, roleEntries, defaultRole, locale, seasonId, analysisLink, onShare }) {
  const [chosenRole, setChosenRole] = useState(defaultRole)
  const [expandedMatch, setExpandedMatch] = useState(null)
  const compact = useCompactMatchLayout()
  const roles = roleEntries.filter(entry => appearances.some(match => match.role === entry.role))
  const role = roles.find(entry => entry.role === chosenRole)?.role || roles[0]?.role
  const signature = getPlayerSignatureMatch(appearances, role)
  if (!signature) return null
  const { match } = signature
  const mapsExpanded = !compact || expandedMatch === match.key
  const playedHeroes = getRecordedPlayerHeroes([match])
  const text = (zh, en) => archiveCopy(locale, zh, en)
  const openMatch = analysisLink({ role, pview: 'matches', popen: match.key, phero: '', pmap: '', presult: '', pshow: '' })
  return <section className={styles.signature} id="player-signature-match" aria-labelledby="player-signature-title">
    <header className={styles.heading}><div><p>A MATCH TO KEEP</p><h2 id="player-signature-title">{text('这一战，值得留下。', 'A match worth keeping.')}</h2></div><div className={styles.roles} aria-label={text('代表一战职责', 'Role for featured match')}>{roles.map(item => <button type="button" key={item.role} aria-pressed={role === item.role} onClick={() => setChosenRole(item.role)}>{archiveRole(item.role, locale)}</button>)}</div></header>
    <div className={styles.signatureBody}>
      <div className={styles.matchCopy}>
        <p className={styles.reason}>{signatureReason(signature, locale)}</p>
        <p className={styles.context}><time dateTime={match.date || undefined}>{archiveDate(match)}</time><span>{archiveStage(match.stage, locale)}</span></p>
        <div className={styles.matchup}><div><TeamLogo team={match.opponent} seasonId={seasonId} className={styles.logo} /><span><small>{text('对阵', 'VERSUS')}</small><strong>{match.opponent.short}</strong></span></div><span className={styles.score}><b>{archiveScore(match)}</b><small>{text('本队在前', 'Our team first')} · {archiveResult(match.result, locale)}</small></span></div>
        {compact && playedHeroes.length > 0 && <p className={styles.playedHeroes}>{text('本场英雄', 'Heroes played')} · {playedHeroes.slice(0, 3).map(hero => formatOwHeroName(hero.hero, locale)).join(' / ')}{playedHeroes.length > 3 && ` +${playedHeroes.length - 3}`}</p>}
        <div className={styles.actions}><Link {...openMatch}>{text('回看这一战', 'Revisit this match')} ↗</Link><button type="button" onClick={() => onShare({ kind: 'match', role, matchKey: match.key })}>{text('分享这一战', 'Share this match')} ↗</button></div>
      </div>
      <aside className={styles.matchEvidence}><span>{archiveRole(role, locale)} · {text('全场评分', 'MATCH RATING')}</span><strong>{Number.isFinite(match.rating) ? match.rating.toFixed(1) : '—'}{Number.isFinite(match.rating) && <small> / 10</small>}</strong><p>{match.maps.length} {text('图实际出场', 'maps played')}</p><p className={styles.scope}>{signature.reason === 'best' ? text(`从本职责 ${signature.ratedCount} 场已公布评分的比赛中选出${signature.tiedCount > 1 ? `，${signature.tiedCount} 场并列` : ''}。`, `Selected from ${signature.ratedCount} rated matches in this role${signature.tiedCount > 1 ? `; ${signature.tiedCount} matches share the highest rating` : ''}.`) : signature.reason === 'onlyRated' ? text('本职责目前仅这一场有全场评分。', 'This is the only rated match in this role so far.') : text('按已收录的个人出场呈现，缺失评分保留为 —。', 'Based on recorded appearances. Missing ratings remain —.')}</p></aside>
    </div>
    {compact && <button type="button" className={styles.mapToggle} aria-expanded={mapsExpanded} aria-controls={`signature-maps-${role}`} onClick={() => setExpandedMatch(mapsExpanded ? null : match.key)}><span>{mapsExpanded ? text('收起逐图记录', 'Hide map records') : text('查看逐图记录', 'View map records')} · {match.maps.length} {text('图', 'maps')}</span><span aria-hidden="true">{mapsExpanded ? '−' : '+'}</span></button>}
    <div id={`signature-maps-${role}`} className={styles.matchMaps} hidden={!mapsExpanded} aria-label={text('本场个人出场地图', 'Personal map appearances in this match')}>{match.maps.map(map => <Link key={map.order} {...analysisLink({ role, pview: 'matches', popen: match.key, pmap: playerMapKey(map.name), phero: '', presult: '', pshow: '' })} className={styles.matchMap}><span>{String(map.order).padStart(2, '0')}</span><div><strong>{formatOwMapName(map.name, locale)}</strong><span>{map.heroes.slice(0, 3).map(hero => <SignalHeroPortrait key={hero} hero={hero} description={formatOwHeroName(hero, locale)} />)}<small>{archiveResult(map.result, locale)}</small></span></div><b>{Number.isFinite(map.rating) ? map.rating.toFixed(1) : '—'}<small>{text('单图 / 10', 'MAP / 10')}</small></b></Link>)}</div>
  </section>
}

export function PlayerPersonalReadout({ active, appearances, locale, onHero, onMatches }) {
  const readout = getPlayerPersonalReadout(active, appearances)
  const text = (zh, en) => archiveCopy(locale, zh, en)
  const metricNames = { elim: 'Eliminations', ast: 'Assists', dth: 'Deaths', dmg: 'Damage', heal: 'Healing', block: 'Mitigation' }
  const metric = readout.metric
  const metricName = metric && text(metric.label, metricNames[metric.id])
  return <section className={styles.readout} aria-label={text('读懂这份表现', 'Reading this performance')}>
    <div className={styles.readoutItem}><p>{metric ? text('数据中较突出的一项', 'A standout in the numbers') : text('这一季，已经留下', 'This season, on record')}</p><h2>{metric ? `${metricName}${text(metric.direction === 'negative' ? '低于同职责均值' : '高于同职责均值', metric.direction === 'negative' ? ' below the role average' : ' above the role average')}` : text(`${readout.matches.length} 场比赛，${readout.maps} 图出场`, `${readout.matches.length} matches, ${readout.maps} maps played`)}</h2><p>{metric ? text(`每 10 分钟 ${metric.valueLabel}，同职责均值 ${metric.averageLabel}。比较本赛事有出场时长的同职责记录。`, `Per 10 minutes: ${metric.valueLabel}; role average: ${metric.averageLabel}. Compared with timed records in this role and event.`) : text('每一场都能回到具体地图，查看当时的英雄与表现。', 'Revisit the maps, heroes and performance behind each appearance.')}</p>{!metric && <button type="button" onClick={onMatches}>{text('回到比赛', 'Explore matches')} ↗</button>}</div>
    {readout.hero && <div className={styles.readoutItem}><p>{readout.heroTies > 1 ? text('并列最多出场的英雄之一', 'One of the most recorded heroes') : text('最常带上场的选择', 'Most often in the lineup')}</p><h2>{formatOwHeroName(readout.hero.hero, locale)}<span>{readout.hero.maps} {text('图', 'maps')}</span></h2><p>{text(`在本职责 ${readout.maps} 张出场地图中有记录，涉及 ${readout.hero.matches} 场比赛；图数不代表使用时长或熟练度。`, `Recorded on ${readout.hero.maps} of ${readout.maps} maps in this role, across ${readout.hero.matches} matches. Counts do not measure playtime or proficiency.`)}</p><button type="button" onClick={() => onHero(readout.hero.key)}>{text('看看这些出场', 'Explore these appearances')} ↗</button></div>}
  </section>
}
