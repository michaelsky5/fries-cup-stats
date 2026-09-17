import { Link } from 'react-router-dom'
import { translateUiText as uiText } from '../../lib/uiText.js'
import { formatOwHeroName } from '../../lib/heroes.js'
import { getRoleLabel, getRoleEnLabel } from '../../lib/leaderboardSelectors.js'
import { SignalHeroPortrait } from '../../components/matches/detail/SignalPlayerData.jsx'
import TeamLogo from '../../components/matches/TeamLogo.jsx'
import { formatPlayerMatchStage } from './playerDossierPresentation.js'
import styles from './PlayerArchive.module.css'

export const archiveCopy = (locale, zh, en) => uiText(locale === 'en-US' ? en : zh, locale)
export const archiveRole = (role, locale) => uiText(locale === 'en-US' ? getRoleEnLabel(role) : getRoleLabel(role), locale)
export const archiveStage = (value, locale) => uiText(formatPlayerMatchStage(value, locale === 'en-US'), locale)
export const archiveDate = match => Number.isFinite(Date.parse(match?.date)) ? match?.dateLabel?.split(' ')[0]?.replaceAll('/', '.') || '—' : '—'
export const archiveScore = match => match.scoreFor != null && match.scoreAgainst != null ? `${match.scoreFor} : ${match.scoreAgainst}` : '—'
export const archiveResult = (value, locale) => archiveCopy(locale, ({ win: '胜', loss: '负', draw: '平', pending: '进行中' })[value] || '赛果未定', ({ win: 'W', loss: 'L', draw: 'D', pending: 'LIVE' })[value] || 'Unknown')
export const archiveReason = (reason, locale) => ({ first: archiveCopy(locale, '首次收录出场', 'First recorded appearance'), latest: archiveCopy(locale, '最近一次出场', 'Latest appearance'), maps: archiveCopy(locale, '单场出场图数最多', 'Most maps in a match'), phase: archiveCopy(locale, '进入新的阶段', 'A new stage'), record: archiveCopy(locale, '已收录出场', 'Recorded appearance') })[reason]

export function ArchiveHeading({ number, title, english, detail, locale }) {
  return <header className={styles.sectionHeading}><div><p>{number} / {english}</p><h2>{title}</h2></div>{detail && <p>{uiText(detail, locale)}</p>}</header>
}

export function PlayerCompanions({ companions, locale, linkProps, teamLink }) {
  const text = (zh, en) => archiveCopy(locale, zh, en)
  return <section id="player-companions" className={styles.companions} aria-labelledby="player-companions-title">
    <header className={styles.sectionHeading}><div><p>02 / SIDE BY SIDE</p><h2 id="player-companions-title">{text('和谁，一起上场。', 'Who shared the stage.')}</h2></div><Link {...teamLink}>{text('回到队伍展厅', 'Meet the team')} ↗</Link></header>
    {companions.length ? <><div className={styles.companionList}>{companions.slice(0, 5).map((peer, index) => {
      const content = <><span className={styles.peerIndex}>{String(index + 1).padStart(2, '0')}</span>{peer.hero ? <SignalHeroPortrait hero={peer.hero} role={peer.roles[0]} description={formatOwHeroName(peer.hero, locale)} /> : <span className={styles.peerFallback} aria-hidden="true">{peer.name.slice(0, 2)}</span>}<div className={styles.peerIdentity}><strong>{peer.name}</strong><span>{peer.roles.map(role => archiveRole(role, locale)).join(' / ')}</span></div><div className={styles.peerCount}><strong>{peer.maps}</strong><span>{text('图同场', 'maps together')}</span></div>{peer.playerId && <span aria-hidden="true">↗</span>}</>
      return peer.playerId ? <Link key={peer.key} {...linkProps(`/players/${encodeURIComponent(peer.playerId)}`)} className={styles.peer}>{content}</Link> : <div key={peer.key} className={styles.peer}>{content}</div>
    })}</div><p className={styles.note}>{text('按同队、同一张地图的已发布出场记录计数。英雄为这些记录中的代表形象。', 'Shared maps on the same team, from published appearances. Artwork represents a hero recorded in those maps.')}</p>{companions.length > 5 && <details className={styles.morePeers}><summary>{text('其余并肩队友', 'More teammates')} · {companions.length - 5}</summary>{companions.slice(5).map(peer => <div key={peer.key}>{peer.playerId ? <Link {...linkProps(`/players/${encodeURIComponent(peer.playerId)}`)}>{peer.name} ↗</Link> : <strong>{peer.name}</strong>}<span>{peer.maps} {text('图同场', 'shared maps')} · {peer.matches} {text('场比赛', 'matches')}</span></div>)}</details>}</> : <div className={styles.empty}><h3>{text('并肩的记录，等待收录。', 'Shared appearances are not available yet.')}</h3><p>{text('有可确认的同队单图记录后，这里会呈现一起上场的队友。', 'Teammates will appear here when shared map records can be confirmed.')}</p></div>}
  </section>
}

export function PlayerArchiveMoments({ archive, locale, seasonId, journeyLink }) {
  const text = (zh, en) => archiveCopy(locale, zh, en)
  if (!archive.highlights.length) return null
  return <section id="player-season-moments" className={styles.moments}>
    <ArchiveHeading number="03" english="A SEASON TO REVISIT" title={text('从这几场，走进这一季。', 'A few places to begin.')} detail={text('每个节点，都有一场实际出场。', 'Every starting point leads to a recorded appearance.')} locale={locale} />
    <div className={styles.momentGrid}>{archive.highlights.map(({ match, reasons }) => <Link key={match.matchId} {...journeyLink({ jmatch: match.matchId, pstage: '' })} className={styles.moment}>
      <div className={styles.momentTop}><span>{reasons.map(reason => archiveReason(reason, locale)).join(' · ')}</span><time dateTime={match.date || undefined}>{archiveDate(match)}</time></div><p>{archiveStage(match.stage, locale)}</p><div className={styles.momentOpponent}><TeamLogo team={match.opponent} seasonId={seasonId} className={styles.logo} /><strong><small>{text('对阵', 'VERSUS')}</small>{match.opponent.short}</strong><div className={styles.momentScore}><b>{archiveScore(match)}</b><small>{text('本队在前', 'Our team first')}</small></div></div><div className={styles.momentBottom}><span>{match.maps.length} {text('图出场', match.maps.length === 1 ? 'map played' : 'maps played')} · {archiveResult(match.result, locale)}</span><span>{text('回到这场', 'Revisit')} ↗</span></div>
    </Link>)}</div>
  </section>
}

export function PlayerArchiveNext({ journeyLink, analysisLink, profileLink, locale }) {
  const text = (zh, en) => archiveCopy(locale, zh, en)
  return <nav className={styles.next} aria-label={text('继续了解这位选手', 'Continue exploring this player')}>
    <Link {...(journeyLink || profileLink)}><small>{journeyLink ? '02 / SEASON JOURNEY' : '01 / PLAYER PROFILE'}</small><strong>{journeyLink ? text('沿着比赛，读他的这一季。', 'Follow a season in appearances.') : text('回到名字，认识这位选手。', 'Meet the person behind the record.')}</strong><span aria-hidden="true">↗</span></Link>
    <Link {...analysisLink}><small>03 / PERFORMANCE</small><strong>{text('把表现，放回数据中看。', 'Look closer at the performance.')}</strong><span aria-hidden="true">↗</span></Link>
  </nav>
}
