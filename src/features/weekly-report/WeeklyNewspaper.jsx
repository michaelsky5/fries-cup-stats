import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { translateUiText, pickUiLocale } from '../../lib/uiText.js'
import { formatOwMapName, formatOwHeroName } from '../../lib/heroes.js'
import { getMapImage, getHeroImage } from '../../lib/reviewAssets.js'
import TeamLogo from '../../components/matches/TeamLogo.jsx'
import { weeklyPeriodPath } from '../weekly-overview/weeklyPresentation.js'
import { formatReportTime } from './weeklyReportPresentation.js'
import { buildWeeklyNewspaper, newspaperTeamName, resolveWeeklyHeroRole } from './weeklyNewsroom.js'
import { formatUpcomingMatch, formatWeeklyMatchScope, buildMatchBrief, buildLeadPrintNote } from './weeklyEditorial.js'
import { WEEKLY_POSITIONS, WEEKLY_POSITION_ROLES } from './weeklyPositions.js'
import { buildWeeklyNewspaperResultsUrl, buildWeeklyNewspaperQr } from './weeklyNewspaperShare.js'
import styles from './WeeklyNewspaper.module.css'

const PAPER_SIZE = { width: 900, height: 1273 }

function SaveActions({ busy, savePdf, savePng, t, placement }) {
  return <div className={styles.pageActions} data-paper-actions={placement}>
    <button type="button" className={styles.pdfButton} disabled={busy} onClick={savePdf}>{t('保存报纸 PDF','Save newspaper PDF')} ↓</button>
    <button type="button" disabled={busy} onClick={savePng}>{t('保存报纸 PNG','Save newspaper PNG')} ↓</button>
  </div>
}

function ResultsQr({ report, seasonId, locale, t }) {
  const url=useMemo(()=>buildWeeklyNewspaperResultsUrl(report,seasonId,locale),[report,seasonId,locale])
  const qr=useMemo(()=>buildWeeklyNewspaperQr(url),[url])
  if (!qr) return null
  return <a className={styles.resultsQr} href={url} data-paper-results-qr>
    <span><b>{t('扫码看本周赛果','SCAN FOR THIS WEEK’S RESULTS')}</b><small>stats.fries-cup.com</small></span>
    <svg width="65" height="65" viewBox={`0 0 ${qr.size} ${qr.size}`} aria-hidden="true" shapeRendering="crispEdges"><rect width={qr.size} height={qr.size} fill="#fff"/><path d={qr.path} fill="#2a2a2a"/></svg>
  </a>
}

function NewspaperSheet({ children, busy, savePdf, savePng, status, error, scale, t, report, seasonId, newspaper, date, sheetsRef, locale }) {
  return <div className={styles.pageBlock}>
    <div className={styles.pageTools}>
      <span>{newspaper.edition}</span>
      <SaveActions busy={busy} savePdf={savePdf} savePng={savePng} t={t} placement="top"/>
    </div>
    <div className={styles.feedback} role="status" aria-live="polite" aria-atomic="true">{status}</div>
    {error&&<strong className={styles.exportError} role="alert">{error}</strong>}
    <div className={styles.sheetFrame} style={{ height:PAPER_SIZE.height*scale }}>
      <section className={styles.sheet} id="newspaper-page-1" lang={locale} data-newspaper-sheet data-paper-page="1" data-paper-layout={newspaper.layout} data-has-intro={Boolean(newspaper.lead?.intro)} data-brief-count={newspaper.briefs.length} data-has-roundup={newspaper.otherResults.length>0} data-has-updates={newspaper.updates.length>0} aria-label={t('本期报纸','This issue')} ref={node=>{if(node)sheetsRef.current.set(0,node);else sheetsRef.current.delete(0)}} style={{ transform:`scale(${scale})` }}>
        <header className={styles.masthead}>
          <div className={styles.mastheadTop}><span>FRIES CUP / WEEKLY NEWSPAPER</span><span>{t('赛果 · 阵容 · 数据','RESULTS · LINEUPS · DATA')}</span></div>
          <div className={styles.nameplate}><div className={styles.brandSignature}><img src="/logos/fries-cup-mark-ink.svg" alt=""/><span>FRIES CUP<small>THE WEEK, IN PRINT.</small></span></div><h1>{t('薯条周报','THE WEEKLY')}</h1><span className={styles.issueStamp}>{report.number}<small>{t('周','WEEK')}</small></span></div>
          <div className={styles.editionLine} data-edition-line><span>{seasonId} / {newspaper.edition}</span><span>{t('数据截至','Data as of')} {date}</span></div>
        </header>
        <div className={styles.paperBody} data-paper-body>{children}</div>
        <footer className={styles.folio} data-paper-folio><div className={styles.folioIdentity}><img src="/logos/fries-cup-mark-ink.svg" alt=""/><span><b>FRIES CUP / {t('薯条周报','THE WEEKLY')}</b><small>{newspaper.edition}</small></span></div><ResultsQr report={report} seasonId={seasonId} locale={locale} t={t}/></footer>
      </section>
    </div>
  </div>
}

function SourceLink({ article, t, withSeason }) {
  return <Link className={styles.sourceLink} data-paper-web-only to={withSeason(article.path)}>{t('比赛记录','Match records')} →</Link>
}

function NewspaperTeamLogo({team,className,...props}) {
  return <TeamLogo team={team} teamShortName={newspaperTeamName(team)} fallbackSrc="/logos/OW.svg" className={className} {...props}/>
}

function formatPersonMapContext(context,locale) {
  const parts=String(context||'').split(' · ')
  const order=parts.length===2?parts[1].match(/(\d+)\D*$/u)?.[1]:null
  if(!order)return context
  const map=formatOwMapName(parts[0],locale)
  const label=pickUiLocale(locale,'第 {0} 图','Map {0}','{0}번째 맵','第 {0} 圖').replace('{0}',order)
  return `${map} · ${label}`
}

function keepPersonMapTogether(summary,context,locale) {
  const text=String(summary||'')
  const parts=String(context||'').split(' · ')
  if(parts.length!==2)return text
  const map=[formatOwMapName(parts[0],locale),parts[0]].find(name=>name&&text.includes(name))
  if(!map)return text
  const index=text.indexOf(map)
  return <>{text.slice(0,index)}<span className={styles.personMap} data-person-map>{map}</span>{text.slice(index+map.length)}</>
}

function PeopleNotes({people,editorial,compact,locale,seasonId,withSeason}) {
  return <div className={styles.rolePairs} data-person-note-count={people.length}>
    {people.map(person=>{
      const roleLabels={
        '坦克':pickUiLocale(locale,'坦克','tank','돌격','肉盾'),
        '输出':pickUiLocale(locale,'输出','damage','공격','攻擊'),
        '辅助':pickUiLocale(locale,'辅助','support','지원','輔助'),
      }
      const roles=String(person.summary||'').split(' / ').map(role=>roleLabels[role]||translateUiText(role,locale)).join(' / ')
      const summary=person.kind==='cross-role'&&!editorial
        ? pickUiLocale(locale,'本周跨 {0} 出场','Played {0} this week','이번 주 {0} 출전','本週跨 {0} 出場').replace('{0}',roles)
        : editorial?(person.detail||person.summary):person.summary
      return <Link to={withSeason(`/players/${encodeURIComponent(person.id)}`)} key={person.id} title={person.context} data-person-note={person.kind}>
        <NewspaperTeamLogo team={person.team} seasonId={seasonId} className={styles.personEmblem}/>
        <span className={styles.personCopy}>
          <b className={styles.personIdentity}>{person.name}{person.team&&<small>{newspaperTeamName(person.team)}</small>}{!editorial&&!compact&&person.kind==='map-note'&&person.context&&<small className={styles.personContext}>{formatPersonMapContext(person.context,locale)}</small>}</b>
          <span className={styles.personSummary}>{editorial?keepPersonMapTogether(summary,person.context,locale):String(summary||'').split(/(\d[\d,]*(?:\.\d+)?)/u).map((part,index)=>index%2?<strong key={index}>{part}</strong>:part)}</span>
        </span>
      </Link>
    })}
  </div>
}

function RoleSymbol({role,label}) {
  const icon={TANK:'tank',DPS:'damage',SUP:'support'}[role]
  return <span aria-hidden={label?undefined:true} aria-label={label} role={label?'img':undefined} title={label} className={styles.roleSymbol} data-role-icon={role} style={{'--role-icon':`url("/role/${icon}.png")`}}/>
}

function MapTimeline({article,locale,t,compact=false}) {
  if (article.state==='ruling') return <small className={styles.rulingLabel} data-ruling-result>{t('赛事判定','Official ruling')}</small>
  if (!article.sequence.length) return <small className={styles.sequencePending}>{t('逐图胜方记录待补齐','Map-winner records pending')}</small>
  return <ol className={compact ? styles.miniSequence : styles.mapTimeline} aria-label={t(`逐图赛果；比分顺序 ${article.scoreOrder.join(' / ')}`,`Map results; score order ${article.scoreOrder.join(' / ')}`)}>
    {article.sequence.map(map=><li key={map.order} data-winner-side={map.winnerSide} data-deciding={article.decisive?.order===map.order} data-map-score={map.mapScore?.join(':')||''} data-series-score={map.runningScore.join(':')}>
      {!compact&&<div className={styles.timelineArt}><img src={getMapImage(map.map_type,map.map_name)} alt=""/><span>{String(map.order).padStart(2,'0')}</span><b>{formatOwMapName(map.map_name,locale)}</b></div>}
      {compact ? <span title={`${formatOwMapName(map.map_name,locale)} · ${map.winnerName}`}>{map.winnerName}</span> : <><div className={styles.mapScore}><strong>{map.mapScore?map.mapScore.join(' : '):'—'}</strong></div><small>{map.winnerName} {t('胜','wins')}</small></>}
    </li>)}
  </ol>
}

function MatchBrief({article,seasonId,locale,t,withSeason}) {
  const [left,right]=article.displayTeams
  return <article className={styles.brief} aria-label={article.shortTitle}>
    <Link className={styles.briefMatchup} to={withSeason(article.path)}><div><NewspaperTeamLogo team={left} seasonId={seasonId} className={styles.briefEmblem}/><b>{newspaperTeamName(left)}</b></div><strong>{article.displayScores[0]??'—'}<i>:</i>{article.displayScores[1]??'—'}</strong><div><NewspaperTeamLogo team={right} seasonId={seasonId} className={styles.briefEmblem}/><b>{newspaperTeamName(right)}</b></div></Link>
    <MapTimeline article={article} locale={locale} t={t} compact/>
    <p data-match-brief={article.id}>{article.brief}</p><SourceLink article={article} t={t} withSeason={withSeason}/>
  </article>
}

function ResultRoundup({newspaper,t,withSeason}) {
  if(!newspaper.otherResults.length)return null
  return <div className={styles.resultRoundup} data-result-roundup aria-label={t('其他赛果','Other results')}><b>{t('其他赛果','OTHER RESULTS')}</b>{newspaper.otherResults.map(article=><Link key={article.id} data-other-result={article.id} to={withSeason(article.path)} title={article.shortTitle}>{article.result}{article.state==='ruling'&&<small className={styles.rulingLabel} data-ruling-result>{t('赛事判定','Official ruling')}</small>}</Link>)}{newspaper.otherResultCount>newspaper.otherResults.length&&<small>{t(`另 ${newspaper.otherResultCount-newspaper.otherResults.length} 场`,`+${newspaper.otherResultCount-newspaper.otherResults.length} more`)}</small>}</div>
}

function DataStoryCard({story,locale,withSeason}) {
  const primary=story.stats[0]
  const conciseRecord=story.editorialHook==='number-echo'&&story.kind==='record'&&story.stats.length===1&&primary.metric==='assists'&&primary.unit==='single-map-total'
  const headline=conciseRecord
    ? primary.tiedCount>1
      ? pickUiLocale(locale,'单图助攻并列最高','JOINT MAP ASSISTS HIGH','단일 맵 도움 공동 최다','單圖助攻並列最高')
      : pickUiLocale(locale,'单图助攻最高','MAP ASSISTS HIGH','단일 맵 도움 최다','單圖助攻最高')
    : story.headline
  return <article className={styles.storyCard} data-player-story={story.id} data-story-kind={story.kind} data-story-hook={story.editorialHook||undefined}>
    <div className={styles.storyIdentity}><div><span>{headline}</span><div><Link to={withSeason(`/players/${encodeURIComponent(story.id)}`)}>{story.name}</Link>{story.team&&<small>{newspaperTeamName(story.team)}</small>}</div></div>{story.hero&&<img src={getHeroImage(story.hero,story.role)} alt={formatOwHeroName(story.hero,locale)}/>}</div>
    <dl className={styles.storyValues} data-count={story.stats.length}>{story.stats.map(item=><div key={item.metric}><dt>{item.label}</dt><dd><Link data-story-metric={item.metric} data-story-unit={item.unit} to={withSeason(`/matches/${encodeURIComponent(item.matchId)}`)} title={`${formatOwMapName(item.map,locale)} · ${item.order}`}>{item.value.toLocaleString('en-US')}</Link></dd></div>)}</dl>
    <p className={styles.storyCaption}>{story.caption}</p>
  </article>
}

function DataCuriosities({facts,stories,locale,t,withSeason}) {
  return <section className={styles.curiosities} aria-label={t('数据趣闻','Data curiosities')}>
    <div className={styles.sectionHeading}><h3 className={styles.columnLabel}>{t('数据趣闻','DATA CURIOSITIES')}</h3>{stories.cards.length>0&&<span data-stat-scope="single-map">{t('单图数据','SINGLE-MAP TOTALS')}</span>}</div>
    <div className={styles.factGrid} data-story-count={stories.cards.length||1}>{stories.cards.map(story=><DataStoryCard key={story.id} story={story} locale={locale} withSeason={withSeason}/>)}{!stories.cards.length&&<article className={styles.comebackCard}><span>{t('首图失利后获胜','WINS AFTER LOSING MAP ONE')}</span><strong>{facts.comeback.total ? facts.comeback.count : '—'}<i>{t('场',facts.comeback.count===1?'match':'matches')}</i></strong><small className={styles.comebackScope}>{facts.comeback.total?t(`本周 ${facts.comeback.total} 场完整五图赛果中`,`Of ${facts.comeback.total} complete five-map results`):t('本期个人数据待补齐','Player records pending')}</small>{facts.comeback.sample&&<Link to={withSeason(facts.comeback.sample.path)}>{facts.comeback.sample.result} →</Link>}</article>}</div>
  </section>
}

const heroRoleLabel=(role,locale)=>({
  TANK:pickUiLocale(locale,'坦克','Tank','돌격','肉盾'),
  DPS:pickUiLocale(locale,'输出','Damage','공격','攻擊'),
  SUP:pickUiLocale(locale,'辅助','Support','지원','輔助'),
})[role]

function HeroTrendList({heroes,kind,locale,t,report}) {
  return <ol className={styles.heroTrendList} data-hero-trend={kind} data-count={heroes.length} aria-label={kind==='usage'?t('本周英雄出场排行','Weekly hero appearance leaders'):t('本周英雄 Ban 前三','Weekly top three hero bans')}>
    {heroes.map(hero=>{const role=resolveWeeklyHeroRole(hero,report);return <li key={hero.name} data-hero={hero.name} data-count={hero.count} data-rank={hero.rank} data-hero-role={role||undefined}>
      <span className={styles.trendRank} data-hero-rank={hero.rank} aria-label={t(`第 ${hero.rank} 名`,`No. ${hero.rank}`)}>{String(hero.rank).padStart(2,'0')}</span>
      <img src={getHeroImage(hero.name)} alt=""/>
      <b className={styles.heroTrendName}>{role&&<RoleSymbol role={role} label={heroRoleLabel(role,locale)}/>}<span>{formatOwHeroName(hero.name,locale)}</span></b>
      <strong>{hero.count}<small>{t('次',kind==='usage'?'plays':'bans')}</small></strong>
    </li>})}
    {!heroes.length&&<li className={styles.trendPending}>{t('记录待补齐','Records pending')}</li>}
  </ol>
}

function WeeklyTrends({newspaper,report,locale,t}) {
  const {mapNews,heroNews,banNews}=newspaper
  return <section className={styles.weeklyTrends} data-weekly-trends aria-label={t('本周地图与英雄排行','This week’s map and hero rankings')}>
    <article><div className={styles.trendHeading}><h3>{t('本周常见地图','MOST PLAYED MAP')}</h3>{mapNews.tieCount>1&&<span>{t(`${mapNews.tieCount} 张并列`,`${mapNews.tieCount} tied`)}</span>}</div><div className={styles.mapHighlights} data-count={mapNews.highlights.length}>{mapNews.highlights.map(map=><figure key={map.name}><img src={getMapImage(map.type,map.name)} alt=""/><figcaption><b>{formatOwMapName(map.name,locale)}</b><strong>{map.count}<small>{t('次','plays')}</small></strong></figcaption></figure>)}{!mapNews.highlights.length&&<span className={styles.trendPending}>{t('记录待补齐','Records pending')}</span>}</div><small className={styles.trendNote}>{t(`本周 ${report.maps.length} 图赛果${mapNews.tieCount>3?` · 另 ${mapNews.tieCount-3} 张并列`:''}`,`${report.maps.length} map results this week${mapNews.tieCount>3?` · ${mapNews.tieCount-3} more tied`:''}`)}</small></article>
    <article><div className={styles.trendHeading}><h3>{t('本周英雄出场','MOST PLAYED HEROES')}</h3>{heroNews.tieCount>1&&<span>{t(`${heroNews.tieCount} 名并列榜首`,`${heroNews.tieCount} tied`)}</span>}</div><HeroTrendList heroes={heroNews.highlights} kind="usage" locale={locale} t={t} report={report}/><small className={styles.trendNote}>{t('同一英雄，每位选手每图计 1 次','Each hero counts once per player per map.')}{heroNews.omittedTies>0&&t(` · 另 ${heroNews.omittedTies} 名并列`,` · ${heroNews.omittedTies} more tied`)}</small></article>
    <article><div className={styles.trendHeading}><h3>{t('Ban 榜观察','MOST BANNED HEROES')}</h3><span>{banNews.tieCount>1?t(`${banNews.tieCount} 名并列榜首`,`${banNews.tieCount} tied`):'TOP 3'}</span></div><HeroTrendList heroes={banNews.highlights} kind="ban" locale={locale} t={t} report={report}/><small className={styles.trendNote}>{t(`本周记录 ${report.namedBans} 次英雄 Ban${banNews.omittedTies>0?` · 另 ${banNews.omittedTies} 名并列`:''}`,`${report.namedBans} hero bans recorded this week${banNews.omittedTies>0?` · ${banNews.omittedTies} more tied`:''}`)}</small></article>
  </section>
}

function WeeklyNewsDesk({newspaper,locale,t,withSeason}) {
  if (!newspaper.lead?.intro) return null
  const featured=new Set([newspaper.lead.id,...newspaper.briefs.map(article=>article.id)])
  const remainder=newspaper.articles.filter(article=>!featured.has(article.id)).sort((a,b)=>Number(a.state==='ruling')-Number(b.state==='ruling')||a.id.localeCompare(b.id))
  const ordered=[newspaper.lead,...newspaper.briefs,...remainder]
  return <section className={styles.newsDesk} data-weekly-news-desk data-paper-web-only aria-label={t('赛后回顾','Match reports')}>
    <header><h2>{t('赛后回顾','Match reports')}</h2><p>{t('本期赛果、此前交手与选手侧写。','This issue’s results, previous meetings and player notes.')}</p></header>
    <div className={styles.newsGrid}>{ordered.map(article=><article key={article.id} data-news-match={article.id}>
      <h3><Link to={withSeason(article.path)}>{article.title}</Link></h3>
      <p>{article.intro || article.brief}</p>
      {article.recap&&article.recap!==article.brief&&!article.intro?.includes(article.recap)&&<p>{article.recap}</p>}
      {article.background&&!(article.intro||article.brief).includes(article.background.text)&&(article.intro||article.brief!==buildMatchBrief(article,locale))&&<p className={styles.matchBackground} data-match-background={article.background.kind}>{article.background.text}</p>}
      {article.background&&<div className={styles.backgroundSources}>{article.background.sources.map(source=><Link key={source.matchId} to={withSeason(`/matches/${encodeURIComponent(source.matchId)}`)}>{t(`第 ${source.weekNumber} 周比赛记录`,`Week ${source.weekNumber} match records`)} →</Link>)}</div>}
      <SourceLink article={article} t={t} withSeason={withSeason}/>
    </article>)}</div>
    {newspaper.peopleNews.people.length>0&&<section className={styles.readingPeople}><h3>{t('赛场侧写','Player notes')}</h3>{newspaper.peopleNews.people.map(person=><p key={person.id} data-person-description={person.id}><Link to={withSeason(`/players/${encodeURIComponent(person.id)}`)}>{person.name}</Link>{person.team&&<small>{newspaperTeamName(person.team)}</small>}<span>{person.description}</span></p>)}</section>}
    {newspaper.nextWeek&&<section className={styles.nextWeek} data-next-week={newspaper.nextWeek.id}><h3>{t('下周赛程','Next week’s schedule')}</h3><p>{t('以下对阵在本期数据截至时已公布。','These fixtures were published by this issue’s data cutoff.')}</p><ul>{newspaper.nextWeek.matches.map(match=><li key={match.id}><Link to={withSeason(`/matches/${encodeURIComponent(match.id)}`)}>{formatUpcomingMatch(match,locale)}</Link></li>)}</ul></section>}
  </section>
}

function UpdatesDesk({updates,t}) {
  if (!updates.length) return null
  return <section className={styles.updatesDesk} data-updates-desk aria-label={t('更新速递','Update desk')}><div><b>{t('更新速递','UPDATE DESK')}</b><small>{t('赛事中心 × 游戏版本','FRIES CUP × GAME')}</small></div>{updates.map(item=><article key={item.id||item.title}><span>{item.category==='game'?t('游戏版本','GAME UPDATE'):t('赛事中心','FRIES CUP UPDATE')}</span><strong>{item.title}</strong></article>)}<svg viewBox="0 0 42 42" aria-hidden="true"><path d="M7 4h21l7 7v27H7Z M27 4v9h8 M13 18h15 M13 24h15 M13 30h10" fill="none" stroke="currentColor" strokeWidth="2"/></svg></section>
}

function AwardTeam({player,seasonId}) {
  return <span className={styles.awardTeam}>{player.teams.map(team=><span key={team.id}><NewspaperTeamLogo team={team} seasonId={seasonId} className={styles.awardEmblem}/>{newspaperTeamName(team)}</span>)}</span>
}

const positionLabel=(position,t)=>({TANK:t('坦克','Tank'),DPS:t('输出','Damage'),SUP:t('辅助','Support')})[WEEKLY_POSITION_ROLES[position]]||t('待归类','Unassigned')

function KeyPerformance({player,t,mvp=false}) {
  const metrics=player.position==='TANK'?[['blocked',t('阻挡伤害','Mitigated')],['elims',t('消灭','Elims')]]:player.role==='SUP'?[['healing',t('治疗','Healing')],['assists',t('助攻','Assists')]]:[['damage',t('伤害','Damage')],['elims',t('消灭','Elims')]]
  const compact=value=>value>=1000?`${(value/1000).toFixed(1)}k`:value.toFixed(1)
  return <dl className={`${styles.keyStats} ${mvp?styles.mvpMetrics:''}`} data-key-metrics aria-label={t('主要职责每 10 分钟数据','Primary-role statistics per 10 minutes')}>{metrics.map(([metric,label])=><div key={metric} title={t(`${label} / 每 10 分钟：${player.per10[metric].toFixed(1)}`,`${label} per 10 minutes: ${player.per10[metric].toFixed(1)}`)}><dt>{label}</dt><dd data-key-metric={metric}>{compact(player.per10[metric])}</dd></div>)}</dl>
}

function WeeklyHonours({awards,t,locale,seasonId,withSeason}) {
  const slots=awards?.bestFive||WEEKLY_POSITIONS.map(position=>({position,role:WEEKLY_POSITION_ROLES[position],status:'insufficient-data'}))
  const mvps=awards?.mvp||[]
  const mvp=mvps.length===1?mvps[0]:null
  const rateLabel=pickUiLocale(locale,'每 10 分钟','PER 10 MIN','10분당','每 10 分鐘')
  return <section className={styles.honours} aria-label={t('本周荣誉','Weekly honours')}>
    <div className={styles.honoursHeading}><div data-honour-heading="mvp"><h3 className={styles.mvpLabel}>{t('本周 MVP','WEEKLY MVP')}</h3><span data-stat-scope="per-10">{rateLabel}</span></div><div data-honour-heading="best-five"><h3>{t('本周最佳阵容','TEAM OF THE WEEK')}</h3><span data-stat-scope="per-10">{rateLabel}</span></div></div>
    <div className={styles.mvp} data-weekly-mvp={mvps.map(player=>player.id).join(',')}>
      <div className={styles.mvpIdentity}>
        <div className={styles.mvpPortrait}>{mvp?<img src={getHeroImage(mvp.hero,mvp.role)} alt={formatOwHeroName(mvp.hero,locale)}/>:<img src="/logos/fries-cup-mark-ink.svg" alt=""/>}</div>
        <div className={styles.mvpCopy}>{mvp?<><Link className={styles.mvpName} to={withSeason(`/players/${encodeURIComponent(mvp.id)}`)}>{mvp.name}</Link><div className={styles.mvpMeta} data-mvp-identity><AwardTeam player={mvp} seasonId={seasonId}/><span className={styles.mvpRole}><RoleSymbol role={mvp.role}/>{positionLabel(mvp.position,t)}</span></div></>:mvps.length?<><strong className={styles.sharedMvp}>{t('并列 MVP','JOINT MVP')}</strong>{mvps.map(player=><Link key={`${player.id}-${player.position}`} to={withSeason(`/players/${encodeURIComponent(player.id)}`)}>{player.name} · {positionLabel(player.position,t)}</Link>)}</>:<><strong>{t('暂缺结果','No result yet')}</strong><small>{t('数据不足','Insufficient data')}</small></>}</div>
      </div>
      {mvp&&<div className={styles.mvpPerformance} data-mvp-performance><KeyPerformance player={mvp} t={t} mvp/></div>}
    </div>
    <div className={styles.bestFive}><div className={styles.fiveSlots}>{slots.map((slot,i)=><div key={i} data-award-role={slot.role} data-award-position={slot.position} data-award-player={slot.player?.id||''} data-award-status={slot.status}>
      <div className={styles.fiveRole}><RoleSymbol role={slot.role}/><span>{positionLabel(slot.position,t)}</span></div>{slot.player?<><Link className={styles.fivePlayer} to={withSeason(`/players/${encodeURIComponent(slot.player.id)}`)}><img src={getHeroImage(slot.player.hero,slot.role)} alt={formatOwHeroName(slot.player.hero,locale)}/><b>{slot.player.name}</b></Link><AwardTeam player={slot.player} seasonId={seasonId}/><KeyPerformance player={slot.player} t={t}/></>:<div className={styles.pendingSlot}><b>{slot.status==='tie'?t('并列待确认','Tie pending'):slot.status==='lineup-limit'?t('席位待定','Slot pending'):t('暂缺结果','No result yet')}</b>{slot.status==='insufficient-data'&&<small>{t('数据不足','Insufficient data')}</small>}</div>}
    </div>)}</div></div>
  </section>
}


function awardEligibilityText(maps,locale) {
  return pickUiLocale(locale,'至少 {0} 图有效数据 · 按岗位综合评分评选','Minimum {0} valid maps · selected by role-adjusted overall scores','유효 맵 최소 {0}개 · 역할별 종합 점수로 선정','至少 {0} 圖有效數據 · 按崗位綜合評分評選').replace('{0}',maps)
}

function WeeklyAwardNotes({awards,locale}) {
  if(!Number.isInteger(awards?.minimumMaps))return null
  return <section className={styles.awardNotes} id="weekly-award-notes" data-weekly-award-notes data-paper-web-only><h3>{pickUiLocale(locale,'荣誉评选说明','How honours are selected','주간 수상 선정 기준','榮譽評選說明')}</h3><p>{awardEligibilityText(awards.minimumMaps,locale)}</p><p>{pickUiLocale(locale,'MVP 从达到有效地图门槛的选手中按岗位综合评分评选。最佳阵容设一名坦克、两名输出和两名辅助。展示的每 10 分钟数据按有效比赛时间折算；两项展示数据仅为阅读摘要。','MVP is selected by role-adjusted overall scores among eligible players. The team of the week has one tank, two damage players and two supports. Displayed rates use valid playing time and show a two-stat summary.','MVP는 유효 맵 기준을 충족한 선수의 역할별 종합 점수로 선정합니다. 주간 베스트는 탱커 1명, 공격 2명, 지원 2명입니다. 10분당 수치는 유효 플레이 시간을 기준으로 하며 두 지표는 요약입니다.','MVP 從達到有效地圖門檻的選手中按崗位綜合評分評選。最佳陣容設一名坦克、兩名輸出和兩名輔助。展示的每 10 分鐘數據按有效比賽時間折算；兩項展示數據僅為閱讀摘要。')}</p></section>
}

export default function WeeklyNewspaper({ report, locale, seasonId, withSeason, home, archive, newspaperOverride, embedded=false }) {
  const newspaper=useMemo(()=>newspaperOverride||buildWeeklyNewspaper(report,locale),[report,locale,newspaperOverride])
  const t=(zh,en)=>String(locale).startsWith('en') ? en : translateUiText(zh,locale)
  const pagesRef=useRef(null), sheetsRef=useRef(new Map())
  const [scale,setScale]=useState(1), [busy,setBusy]=useState(false), [status,setStatus]=useState(''), [error,setError]=useState('')
  useEffect(()=>{
    const observer=new ResizeObserver(entries=>setScale(Math.min(1,entries[0].contentRect.width/PAPER_SIZE.width)))
    if(pagesRef.current) observer.observe(pagesRef.current)
    return()=>observer.disconnect()
  },[])
  const date=formatReportTime(report.sourceAt,locale)
  async function savePdf() {
    setBusy(true); setError(''); setStatus(t('正在生成报纸 PDF…','Preparing newspaper PDF…'))
    try {
      const { editionFilename, exportNewspaperPdf, downloadNewspaper } = await import('./newspaperExport.js')
      const sheet=sheetsRef.current.get(0)
      if(!sheet) throw new Error(t('版面尚未加载完整，请稍后重试。','The issue is still loading. Please retry.'))
      const blob=await exportNewspaperPdf([sheet],newspaper,()=>{})
      downloadNewspaper(blob,editionFilename(report,'.pdf')); setStatus(t('一页 PDF 已生成。','Your one-page PDF is ready.'))
    } catch(e) {setError(e.message||t('导出失败，请重试。','Export failed. Please retry.'));setStatus('')}
    finally {setBusy(false)}
  }
  async function savePng() {
    setBusy(true);setError('');setStatus(t('正在生成报纸图片…','Preparing newspaper image…'))
    try {
      const { editionFilename, captureNewspaperSheet, downloadNewspaper } = await import('./newspaperExport.js')
      const canvas=await captureNewspaperSheet(sheetsRef.current.get(0))
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'))
      if(!blob) throw new Error(t('图片生成失败，请重试。','Image export failed. Please retry.'))
      downloadNewspaper(blob,editionFilename(report,'.png'));setStatus(t('报纸图片已生成，可以保存分享。','The newspaper image is ready to save and share.'))
    } catch(e) {setError(e.message||t('导出失败，请重试。','Export failed. Please retry.'));setStatus('')}
    finally {setBusy(false)}
  }
  const lead=newspaper.lead
  const leadTeams=lead?.displayTeams
  const leadPrintNote=lead?.intro ? buildLeadPrintNote(lead,newspaper.articles,locale) : lead?.visualNote
  return <div className={styles.root} data-weekly-report-page data-weekly-newspaper data-report-week={report.week.id} data-i18n-ignore>
    {!embedded&&<nav className={styles.breadcrumbs} aria-label={t('周报导航','Report navigation')}><Link to={home}>← {t(`第 ${report.week.week_number} 周赛事总览`,`Week ${report.week.week_number} overview`)}</Link><Link to={archive}>{t('周报归档','Report archive')} →</Link></nav>}
    <div className={styles.pages} ref={pagesRef}>
      <NewspaperSheet busy={busy} savePdf={savePdf} savePng={savePng} status={status} error={error} scale={scale} t={t} report={report} seasonId={seasonId} newspaper={newspaper} date={date} sheetsRef={sheetsRef} locale={locale}>
        <div className={styles.frontKicker}><span>{t('本周主新闻','THIS WEEK’S LEAD')}</span><span data-weekly-match-scope>{lead?.intro?formatWeeklyMatchScope(report,locale):<>{report.completed.length} {t('场对阵','matches')}</>} / {report.maps.length} {t('图赛果','map results')} / {report.playerCount} {t('名出场选手','players')}</span></div>
        <h2 className={styles.leadHeadline}>{lead?<Link to={withSeason(lead.path)}>{lead.title}</Link>:t('这一周，等待赛果确认。','This week awaits confirmed results.')}</h2>
        <div className={styles.frontColumns} data-front-layout={newspaper.layout}>
          <article className={styles.leadColumn}>
            {lead?.image&&<figure className={styles.leadPhoto}><div className={styles.photoWindow}><img className={styles.mapArt} src={getMapImage(lead.image.map_type,lead.image.map_name)} alt={formatOwMapName(lead.image.map_name,locale)} />{leadTeams&&<div className={styles.photoScore} data-photo-score-order={lead.scoreOrder.join(' / ')}><div><NewspaperTeamLogo team={leadTeams[0]} seasonId={seasonId} className={styles.teamEmblem}/><b>{newspaperTeamName(leadTeams[0])}</b></div><strong>{lead.displayScores[0]??'—'}<i>:</i>{lead.displayScores[1]??'—'}</strong><div><b>{newspaperTeamName(leadTeams[1])}</b><NewspaperTeamLogo team={leadTeams[1]} seasonId={seasonId} className={styles.teamEmblem}/></div></div>}{lead.editorialMark?<span className={styles.photoStamp} data-match-mark={lead.editorialMark.kind}>{lead.editorialMark.label}</span>:<span className={styles.photoTag}>{lead.decisive?t('决胜图','DECIDING MAP'):t('赛场记录','MATCH RECORD')}</span>}</div></figure>}
            {!lead&&<p>{t('本期尚无已确认赛果。新闻将在比赛记录确认后生成。','News will appear when this week’s results are confirmed.')}</p>}
          </article>
          <aside className={styles.frontSidebar}>
            <h3 className={styles.columnLabel}>{t('赛场短讯','MATCH BRIEFS')}</h3>
            {newspaper.briefs.map(article=><MatchBrief key={article.id} article={article} seasonId={seasonId} locale={locale} t={t} withSeason={withSeason}/>)}
            {!newspaper.briefs.length&&<p className={styles.emptyBrief}>{t('本期暂无其他赛果。','No other results this week.')}</p>}
            {newspaper.peopleNews.people.length>0&&<article className={styles.peopleNote}>
              <span className={styles.columnLabel}>{newspaper.peopleNews.title}</span>
              <PeopleNotes people={newspaper.peopleNews.people} editorial={Boolean(lead?.intro)} compact={newspaper.layout==='compact'} locale={locale} seasonId={seasonId} withSeason={withSeason}/>
            </article>}
          </aside>
          {lead&&<div className={styles.leadResults}><div className={styles.timelineHeading}><b>{t('逐图赛果','MAP RESULTS')}</b><span data-lead-print-note>{leadPrintNote}</span><SourceLink t={t} withSeason={withSeason} article={lead}/></div><MapTimeline article={lead} locale={locale} t={t}/></div>}
        </div>
        <div className={styles.recordsLine}><span>{t('黄色 / 左队胜 · 黑色 / 右队胜','Yellow / left-team win · black / right-team win')}</span><Link data-paper-web-only to={withSeason(weeklyPeriodPath('/matches',report.cycle,report.week))}>{t('本周全部比赛记录','All weekly match records')} →</Link></div>
        <ResultRoundup newspaper={newspaper} t={t} withSeason={withSeason}/>
        <DataCuriosities facts={newspaper.funFacts} stories={newspaper.dataStories} locale={locale} t={t} withSeason={withSeason}/>
        <WeeklyHonours awards={report.awards} t={t} locale={locale} seasonId={seasonId} withSeason={withSeason}/>
        <WeeklyTrends newspaper={newspaper} report={report} locale={locale} t={t}/>
        <UpdatesDesk updates={newspaper.updates} t={t}/>
        {!report.publication&&<p className={styles.editionNote}>{t('样报','SAMPLE')}</p>}
      </NewspaperSheet>
    </div>
    {!embedded&&<WeeklyNewsDesk newspaper={newspaper} locale={locale} t={t} withSeason={withSeason}/>}
    {!embedded&&<WeeklyAwardNotes awards={report.awards} locale={locale}/>}
    {!embedded&&<footer className={styles.readerFooter}>
      <div className={styles.readerLinks}><Link to={home}>← {t(`回到第 ${report.week.week_number} 周`,`Back to week ${report.week.week_number}`)}</Link><Link to={archive}>{t('周报归档','Report archive')} →</Link></div>
      <SaveActions busy={busy} savePdf={savePdf} savePng={savePng} t={t} placement="bottom"/>
      <div className={styles.footerFeedback}>{error||status}</div>
    </footer>}
  </div>
}
