import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { useState } from 'react'
import { getStaffAvatar } from '../../lib/reviewAssets.js'
import { getTeamLogoCandidates, getDefaultTeamLogoCandidates } from '../../lib/teamLogoResolver.js'
import RosterDirectory, { DirectoryHeading, DirectoryControls, DirectoryLink as CreditLink } from '../roster-directory/RosterDirectory.jsx'
import directoryStyles from '../roster-directory/RosterDirectory.module.css'
import { staffCreditsText, staffRoleLabel } from './staffCreditsCopy.js'
import styles from './StaffCredits.module.css'

export function StaffCreditsHeading({ staffGroup, seasonCode, count, total, locale }) {
  const en = locale === 'en-US'
  const team = staffGroup === 'team'
  return <DirectoryHeading seasonCode={seasonCode} count={count} total={total}
    kicker={team ? en ? 'TEAM STAFF' : uiText("本届战队职员", locale) : en ? 'EVENT STAFF' : uiText("本届赛事职员", locale)}
    title={team ? en ? <>Behind<br className={directoryStyles.englishBreak} /> every team.</> : <>{uiText("队伍身后，", locale)}<span>{uiText("并肩同行。", locale)}</span></> : en ? <>Behind<br className={directoryStyles.englishBreak} /> every match.</> : <>{uiText("比赛背后，", locale)}<span>{uiText("也有他们。", locale)}</span></>}
    description={team ? en ? 'Meet each team’s managers and coaches, and explore their team rosters.' : uiText("认识各队经理与教练，查看所属队伍。", locale) : en ? 'Find officials and casters, and explore the matches on their records.' : uiText("查找赛管与解说，回看参与过的比赛。", locale)}
    unit={team ? en ? 'staff records' : uiText("份职员档案", locale) : en ? 'credit records' : uiText("份署名档案", locale)} />
}

export function StaffCreditsControls({ staffGroup, roleTabs, fields, ...props }) {
  const uiLocale = useUiLocale()
  const en = props.locale === 'en-US'
  return <DirectoryControls {...props} tabs={roleTabs} searchLabel={en ? 'Find a name' : uiText('查找职员', uiLocale)} searchPlaceholder={staffGroup === 'team' ? en ? 'Name, BattleTag or team…' : uiText('昵称、BattleTag 或队伍…', uiLocale) : en ? 'Name or BattleTag…' : uiText('昵称或 BattleTag…', uiLocale)} translate={staffCreditsText} fields={fields.filter(field => field.name === 'sort').map(field => ({ ...field, label: 'SORT' }))} advancedFields={fields.filter(field => field.name !== 'sort').map(field => ({ ...field, label: 'TEAM' }))} />
}

function CreditVisual({ staff, seasonId, locale }) {
  const defaults = staff.team ? getDefaultTeamLogoCandidates(seasonId, staff.team) : []
  const avatar = getStaffAvatar(staff.name, { knownOnly: Boolean(staff.team) })
  const teamImages = staff.team ? getTeamLogoCandidates(staff.team, seasonId).filter(src => !defaults.includes(src)) : []
  const candidates = [...(avatar ? [{ src: avatar, kind: 'avatar' }] : []), ...teamImages.map(src => ({ src, kind: 'team' }))]
  const [imageIndex, setImageIndex] = useState(0)
  const image = candidates[imageIndex]
  const kind = image?.kind || 'type'
  const en = locale === 'en-US'
  return <figure className={styles.visual} data-kind={kind}>
    {image ? <img src={image.src} alt={kind === 'team' ? staff.team.shortName + ' logo' : staff.name + (en ? ' public avatar' : uiText(" 的公开头像", locale))} onError={() => setImageIndex(index => index + 1)} /> : <span className={styles.initial} aria-hidden="true">{Array.from(staff.name).slice(0, 2).join('')}</span>}
    <figcaption>{kind === 'team' ? en ? 'TEAM IDENTITY' : uiText("所属队伍", locale) : kind === 'avatar' ? en ? 'PUBLIC AVATAR' : uiText("公开头像", locale) : en ? 'NAME ON RECORD' : uiText("姓名署名", locale)}</figcaption>
  </figure>
}

function CreditFolio({ staff, seasonId, seasonCode, withSeason, locale, reviewAvailable }) {
  const en = locale === 'en-US'
  const weightedLength = Array.from(staff.name).reduce((length, char) => length + (/\p{Script=Han}/u.test(char) ? 1 : .56), 0)
  const target = staff.team ? '/teams/' + staff.team.routeId : reviewAvailable ? staff.storyPath : ''
  return <article className={styles.folio} data-staff-folio={staff.id} aria-label={(en ? 'Selected staff ' : uiText("当前职员 ", locale)) + staff.name}>
    <header className={styles.folioTop}><span>{seasonCode} <i /> {en ? 'STAFF ARCHIVE' : uiText("职员档案", locale)}</span><b>{staff.team ? en ? 'Team staff' : uiText("战队职员", locale) : en ? 'Match credits' : uiText("赛事署名", locale)}</b></header>
    <div className={styles.scene}>
      <span className={styles.backprint} aria-hidden="true">{staff.team?.shortName || 'STAFF'}</span>
      <div className={styles.identity}><span>{en ? 'A NAME BEHIND THE MATCH' : uiText("每一份参与，都有署名", locale)}</span><h2 data-name-length={weightedLength > 9 ? 'long' : weightedLength > 5.5 ? 'medium' : 'short'}>{staff.name}</h2>{staff.battleTag && staff.battleTag !== staff.name ? <p>{staff.battleTag}</p> : null}<strong className={styles.role}>{staffRoleLabel(staff, locale)}</strong></div>
      <CreditVisual key={seasonId + ':' + staff.id} staff={staff} seasonId={seasonId} locale={locale} />
    </div>
    {staff.team ? <div className={styles.teamRecord}><div><span>{en ? 'Published team roster' : uiText("队伍报名记录", locale)}</span><strong>{staff.team.shortName}</strong><p>{staff.team.fullName}</p></div><div><span>{en ? 'Players across the season' : uiText("全季收录选手", locale)}</span><b>{staff.team.rosterSize}</b></div></div> : <div className={styles.recordNumbers}><div><span>{en ? 'Credited matches' : uiText("比赛署名", locale)}</span><b>{staff.matchCount}</b></div><div><span>{en ? 'Stages' : uiText("赛事阶段", locale)}</span><b>{staff.stageCount}</b></div><div><span>{en ? 'Teams seen' : uiText("涉及队伍", locale)}</span><b>{staff.teamCount}</b></div></div>}
    {staff.stages?.length ? <div className={styles.stages}><span>{en ? 'WHERE THE NAME APPEARS' : uiText("署名所在阶段", locale)}</span><ul>{staff.stages.map(stage => <li key={stage.value}><span>{staffCreditsText(stage.title, locale)}</span><b>{stage.count}<small>{en ? stage.count === 1 ? ' match' : ' matches' : uiText(" 场", locale)}</small></b></li>)}</ul></div> : null}
    <p className={styles.source}>{staff.team ? en ? 'Source · Published team roster' : uiText("来自已发布的队伍报名名单", locale) : staff.role === 'caster' ? en ? 'Source · Published caster credits' : uiText("来自已发布比赛的解说署名", locale) : en ? 'Source · Published official credits' : uiText("来自已发布比赛的赛管署名", locale)}</p>
    <footer className={styles.folioFooter}>{target ? <CreditLink to={withSeason(target)}>{staff.team ? en ? 'Explore team archive' : uiText("走进队伍档案", locale) : en ? 'Open season story' : uiText("查看这份赛季回顾", locale)} <span aria-hidden="true">↗</span></CreditLink> : <span className={styles.unavailable}>{en ? 'Season story not published' : uiText("本届赛季回顾尚未发布", locale)}</span>}</footer>
  </article>
}

export default function StaffCredits({ staffGroup, items, focusedStaff, onFocus, mobileExpanded, startIndex, resultCount, directoryRef, controls, pagination, emptyState, ...folioProps }) {
  const uiLocale = useUiLocale()
  const en = folioProps.locale === 'en-US'
  return <RosterDirectory kind="staff" label={staffGroup === 'team' ? en ? 'Team staff directory' : uiText("战队职员目录", uiLocale) : en ? 'Event staff credits directory' : uiText("赛事职员署名目录", uiLocale)} listTitle={staffGroup === 'team' ? en ? 'TEAM STAFF LIST' : uiText("战队职员索引", uiLocale) : en ? 'EVENT CREDIT LIST' : uiText("赛事职员索引", uiLocale)}
    directoryRef={directoryRef} items={items} focusedKey={focusedStaff?.id} getKey={staff => staff.id} getName={staff => staff.name}
    renderIdentity={staff => <span className={directoryStyles.rowIdentity}><strong>{staff.name}</strong><small>{staff.team?.shortName || (en ? staff.matchCount + ' credited matches' : staff.matchCount + ' 场署名')} <i /> {staffRoleLabel(staff, folioProps.locale)}</small></span>}
    getHref={staff => staff.team ? folioProps.withSeason('/teams/' + staff.team.routeId) : folioProps.reviewAvailable && staff.storyPath ? folioProps.withSeason(staff.storyPath) : ''} previewLabel={en ? 'Preview staff' : uiText("预览职员", uiLocale)} archiveLabel={staff => staff.team ? en ? 'Open team archive for' : uiText("打开所属队伍档案", uiLocale) : en ? 'Open season story for' : uiText("查看赛季回顾", uiLocale)} getArchiveText={staff => staff.team ? en ? 'Team' : uiText("队伍", uiLocale) : en ? 'Story' : uiText("回顾", uiLocale)}
    onFocus={onFocus} mobileExpanded={mobileExpanded} startIndex={startIndex} resultCount={resultCount} controls={controls} pagination={pagination} emptyState={emptyState} locale={folioProps.locale}
    preview={focusedStaff ? <CreditFolio key={focusedStaff.id} staff={focusedStaff} {...folioProps} /> : null}
    emptyPreview={{ kicker: en ? 'STAFF ARCHIVE' : uiText("职员档案", uiLocale), title: en ? 'Every name has a place.' : uiText("每一个名字，都值得被看见。", uiLocale), description: en ? 'Adjust the filters to find another record.' : uiText("调整筛选，继续查找这届比赛的署名。", uiLocale) }}
  />
}
