import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { useState } from 'react'
import { getTeamLogoCandidates, getDefaultTeamLogoCandidates } from '../../lib/teamLogoResolver.js'
import { formatStaffPerson } from '../../lib/rosterSelectors.js'
import { getRosterChangeLabel } from '../../lib/rosterStage.js'
import { getArchiveStageHref } from '../team-dossier/teamArchiveContent.js'
import RosterDirectory, { DirectoryHeading, DirectoryControls, DirectoryLink as ArchiveLink } from '../roster-directory/RosterDirectory.jsx'
import directoryStyles from '../roster-directory/RosterDirectory.module.css'
import { teamIndexText, teamIndexRole } from './teamIndexCopy.js'
import styles from './TeamIndex.module.css'

function TeamEmblem({ team, seasonId, className = '' }) {
  const fallback = getDefaultTeamLogoCandidates(seasonId, team)
  const sources = getTeamLogoCandidates(team, seasonId).filter(src => !fallback.includes(src))
  const [index, setIndex] = useState(0)
  const src = sources[index]
  return <span className={styles.emblem + ' ' + className} data-has-logo={Boolean(src)}>
    {src ? <img src={src} alt={team.shortName + ' logo'} loading="lazy" onError={() => setIndex(value => value + 1)} /> : <b aria-hidden="true">{team.shortName}</b>}
  </span>
}

export function TeamIndexHeading({ seasonCode, count, total, locale, favoriteCount, withSeason }) {
  const en = locale === 'en-US'
  return <DirectoryHeading seasonCode={seasonCode} count={count} total={total} kicker={en ? 'THE TEAMS' : uiText("本届参赛队伍", locale)} title={en ? <>One team.<br className={directoryStyles.englishBreak} /> A shared season.</> : <>{uiText("一支队伍，", locale)}<span>{uiText("一起上场。", locale)}</span></>} description={en ? 'Explore full rosters, managers, coaches, schedules and results.' : uiText("查看完整阵容、经理与教练，以及本届赛程赛果。", locale)} unit={en ? 'teams' : uiText("支参赛队伍", locale)} action={<ArchiveLink to={withSeason('/me?section=following&manage=1')} label={en ? 'Manage followed teams' : uiText("管理关注的队伍", locale)}><span>{en ? favoriteCount + ' followed' : uiText("已关注 {0} 支", locale, [favoriteCount])}</span><span>{en ? 'Manage' : uiText("管理关注", locale)} ↗</span></ArchiveLink>} />
}

export function TeamIndexControls({ fields, ...props }) {
  const uiLocale = useUiLocale()
  const en = props.locale === 'en-US'
  const filter = fields.find(field => field.name === 'filter')
  const tabs = <div className={directoryStyles.roleTabs} role="group" aria-label={en ? 'Team filters' : uiText("按队伍范围筛选", uiLocale)}>{[{ value: 'all', label: en ? 'All teams' : uiText("全部队伍", uiLocale) }, { value: 'following', label: en ? 'Following' : uiText("我的关注", uiLocale) }].map(tab => <button key={tab.value} type="button" aria-pressed={filter.value === tab.value} onClick={() => filter.onChange(tab.value)}>{tab.label}</button>)}</div>
  return <DirectoryControls {...props} tabs={tabs} searchLabel={en ? 'Find a team' : uiText("查找队伍", uiLocale)} searchPlaceholder={en ? 'Team, manager or coach…' : uiText("队伍、经理或教练…", uiLocale)} translate={teamIndexText} fields={fields.filter(field => field.name === 'sort')} advancedFields={fields.filter(field => field.name !== 'sort')} />
}

function TeamShowcase({ team, preview, seasonId, seasonCode, locale, withSeason, onToggleFavorite, favoriteDisabled }) {
  const en = locale === 'en-US'
  const journeyHref = withSeason('/teams/' + team.routeId + '/journey')
  const staffNames = people => people?.map(formatStaffPerson).filter(Boolean).join(' / ') || (en ? 'Not registered' : uiText("未登记", locale))
  const weightedLength = Array.from(team.shortName).reduce((length, char) => length + (/\p{Script=Han}/u.test(char) ? 1 : .56), 0)
  return <article className={styles.showcase} data-team-showcase={team.routeId} aria-label={(en ? 'Selected team ' : uiText("当前队伍 ", locale)) + team.shortName}>
    <header className={styles.showcaseTop}><span>{seasonCode} <i /> {en ? 'TEAM ARCHIVE' : uiText("队伍档案", locale)}</span><b>{en ? 'On the roster' : uiText("本届参赛", locale)}</b></header>
    <div className={styles.scene}>
      <span className={styles.backprint} aria-hidden="true">{team.shortName}</span>
      <div className={styles.identity}><span>{en ? 'THE NAME WE PLAY UNDER' : uiText("以这个名字，并肩上场", locale)}</span><h2 data-name-length={weightedLength > 7 ? 'long' : weightedLength > 4 ? 'medium' : 'short'}>{team.shortName}</h2><p>{team.fullName}</p><div className={styles.standing}><span>{preview.standing.heading}</span><strong>{preview.standing.label}</strong><small>{preview.standing.zone}</small></div></div>
      <TeamEmblem key={seasonId + ':' + team.routeId} team={team} seasonId={seasonId} className={styles.portraitEmblem} />
    </div>
    <div className={styles.facts}><div><span>{en ? 'Manager' : uiText("经理", locale)}</span><b>{staffNames(team.staff?.managers)}</b></div><div><span>{en ? 'Coach' : uiText("教练", locale)}</span><b>{staffNames(team.staff?.coaches)}</b></div></div>
    <div className={styles.teamRecords}>
      <div className={styles.recordHeading}><span>{en ? 'SEASON PLAYER ARCHIVE' : uiText("全季选手名录", locale)}</span><b>{team.rosterSize}<small>{en ? ' across the season' : uiText(" 位累计收录", locale)}</small></b></div>
      {preview.roster.length ? <ul className={styles.roster}>{preview.roster.map(player => {
        const changeLabel = getRosterChangeLabel(player.rosterChange, locale)
        const content = <><strong>{player.identity.primary}</strong><span className={styles.memberMeta}>
          <span className={styles.memberRole}>{teamIndexRole(player.role, locale)}</span>
          {changeLabel ? <small className={styles.changeNote}>{changeLabel}</small> : null}
        </span></>
        return <li key={player.player_id || player.identity.primary} data-role={player.role} data-roster-change={player.rosterChange || undefined}>
          {player.player_id ? <ArchiveLink className={styles.rosterEntry} to={withSeason('/players/' + player.player_id)} label={(en ? 'Open player archive ' : uiText("打开选手档案 ", locale)) + player.identity.primary + (changeLabel ? ' · ' + changeLabel : '')}>{content}<i aria-hidden="true">↗</i></ArchiveLink> : <span className={styles.rosterEntry}>{content}</span>}
        </li>
      })}</ul> : <p className={styles.noRoster}>{en ? 'Player names have not been published.' : uiText("选手姓名尚未发布。", locale)}</p>}
      <div className={styles.recordHeading}><span>{en ? 'SEASON SCHEDULE' : uiText("这一季的赛程", locale)}</span><ArchiveLink to={journeyHref}>{preview.scheduleCount} {en ? 'entries · Journey' : uiText("条记录 · 赛季征程", locale)} ↗</ArchiveLink></div>
      {preview.stages.length ? <div className={styles.stages}>{preview.stages.map(stage => <ArchiveLink key={stage.value} to={getArchiveStageHref(journeyHref, stage.value)}><span>{teamIndexText(stage.title, locale)}</span><b>{stage.count}<small>{en ? stage.count === 1 ? ' entry' : ' entries' : uiText(" 条", locale)}</small></b></ArchiveLink>)}</div> : <p className={styles.noRoster}>{en ? 'No published schedule entries.' : uiText("暂无已发布赛程。", locale)}</p>}
      <p className={styles.recordNote}>{en ? 'Published schedule entries include byes and administrative results.' : uiText("赛程记录包含已发布的轮空及判罚结果。", locale)}</p>
    </div>
    <footer className={styles.teamActions}><button type="button" aria-pressed={Boolean(team.isFavorite)} disabled={favoriteDisabled} onClick={() => onToggleFavorite(team)} aria-label={team.isFavorite ? (en ? 'Unfollow team ' : uiText("取消关注队伍 ", locale)) + team.shortName : favoriteDisabled ? en ? 'Follow limit reached' : uiText("关注已满", locale) : (en ? 'Follow team ' : uiText("关注队伍 ", locale)) + team.shortName}>{team.isFavorite ? en ? '★ Following' : uiText("★ 已关注", locale) : favoriteDisabled ? en ? 'Limit reached' : uiText("关注已满", locale) : en ? '☆ Follow team' : uiText("☆ 关注队伍", locale)}</button><ArchiveLink to={withSeason('/teams/' + team.routeId)}>{en ? 'Enter team exhibition' : uiText("走进战队展馆", locale)} <span aria-hidden="true">↗</span></ArchiveLink></footer>
  </article>
}

export default function TeamIndex({ teams, focusedTeam, preview, onFocusTeam, directoryRef, startIndex, resultCount, mobileExpanded, controls, pagination, emptyState, ...showcaseProps }) {
  const uiLocale = useUiLocale()
  const en = showcaseProps.locale === 'en-US'
  return <RosterDirectory kind="teams" label={en ? 'Team directory' : uiText("参赛队伍目录", uiLocale)} listTitle={en ? 'THE TEAM LIST' : uiText("队伍索引", uiLocale)}
    directoryRef={directoryRef} items={teams} focusedKey={focusedTeam?.routeId} getKey={team => team.routeId} getName={team => team.shortName}
    renderIdentity={team => <><TeamEmblem key={showcaseProps.seasonId + ':' + team.routeId} team={team} seasonId={showcaseProps.seasonId} className={styles.rowEmblem} /><span className={directoryStyles.rowIdentity}><strong>{team.shortName}{team.isFavorite ? ' ★' : ''}</strong><small>{team.fullName}</small></span></>}
    getHref={team => showcaseProps.withSeason('/teams/' + team.routeId)} previewLabel={en ? 'Preview team' : uiText("预览队伍", uiLocale)} archiveLabel={en ? 'Open team exhibition' : uiText("打开战队展馆", uiLocale)}
    onFocus={onFocusTeam} mobileExpanded={mobileExpanded} startIndex={startIndex} resultCount={resultCount} controls={controls} pagination={pagination} emptyState={emptyState} locale={showcaseProps.locale}
    preview={focusedTeam && preview ? <TeamShowcase key={focusedTeam.routeId} team={focusedTeam} preview={preview} {...showcaseProps} /> : null}
    emptyPreview={{ kicker: en ? 'TEAM ARCHIVE' : uiText("队伍档案", uiLocale), title: en ? 'Find your team.' : uiText("下一支队伍，等你认识。", uiLocale), description: en ? 'Adjust the filters to explore this season’s teams.' : uiText("调整筛选，继续浏览本届参赛队伍。", uiLocale) }}
  />
}
