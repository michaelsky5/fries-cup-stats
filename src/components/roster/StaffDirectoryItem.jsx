import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getStaffAvatarCandidates } from '../../lib/reviewAssets.js'
import { getStaffProfilePath } from '../../lib/staffProfiles.js'
import { getTeamDisplayIdentity } from '../../lib/teamDisplayIdentity.js'
import styles from './RosterComponents.module.css'

function StaffPortrait({ staff }) {
  const [failedSources, setFailedSources] = useState([])
  const [loadedSource, setLoadedSource] = useState('')
  const src = getStaffAvatarCandidates(staff).find(source => !failedSources.includes(source))
  const loading = Boolean(src && loadedSource !== src)

  return (
    <div className={styles.staffSignalPortrait}>
      {!src || loading ? (
        <b>{String(staff.name || 'FC').trim().slice(0, 2).toUpperCase()}</b>
      ) : null}
      {src ? <img src={src} alt={staff.name} loading="lazy" data-loading={loading || undefined} onLoad={() => setLoadedSource(src)} onError={() => setFailedSources(sources => [...sources, src])} /> : null}
    </div>
  )
}

export default function StaffDirectoryItem({
  staff,
  index = 1,
  presentation = 'default',
  withSeason = path => path
}) {
  const uiLocale = useUiLocale()
  const navigate = useNavigate()
  const isEventStaff = Boolean(staff.storyPath)
  const affiliation = getTeamDisplayIdentity(staff.team?.shortName, staff.team?.fullName)
  const targetPath = withSeason(getStaffProfilePath(staff))
  const actionLabel = uiLocale === 'en-US' ? 'Open staff profile' : uiText('查看职员档案', uiLocale)
  const roleCode = staff.role === 'caster'
    ? 'CASTER'
    : staff.role === 'admin'
      ? 'OPS'
      : staff.role === 'coach'
        ? 'COACH'
        : 'MANAGER'

  const stop = event => {
    event.stopPropagation()
  }

  if (presentation === 'signal') {
    return (
      <article className={styles.staffItemSignal} data-staff-name={staff.name} data-staff-role={staff.role}>
        <Link to={targetPath} className={styles.cardLinkOverlay} aria-label={`${actionLabel} ${staff.name}`} />

        <div className={styles.staffSignalVisual} data-staff-name={staff.name}>
          <span className={styles.staffFileIndex}>{String(index).padStart(2, '0')}<i>/ CREDIT FILE</i></span>
          <span className={styles.staffSignalRole}>{staff.roleLabel}<i>{roleCode}</i></span>
          <StaffPortrait staff={staff} />
        </div>

        <div className={styles.staffSignalBody}>
          <div className={styles.staffSignalScope}>
            <b>{isEventStaff ? 'MATCH CREDIT' : 'TEAM STAFF'}</b>
            <span>{isEventStaff ? uiText("赛事公开记录", uiLocale) : affiliation.primary}</span>
          </div>
          <div className={styles.staffSignalIdentity}>
            <strong>{staff.name}</strong>
            {staff.battleTag && staff.battleTag !== staff.name ? <span title={staff.battleTag}>{staff.battleTag}</span> : null}
          </div>
          <div className={styles.staffSignalStats}>
            {isEventStaff ? (
              <>
                <div><strong>{staff.matchCount}</strong><span>{uiText("场次", uiLocale)}<em>MATCHES</em></span></div>
                <div><strong>{staff.stageCount}</strong><span>{uiText("阶段", uiLocale)}<em>STAGES</em></span></div>
                <div><strong>{staff.teamCount}</strong><span>{uiText("队伍", uiLocale)}<em>TEAMS</em></span></div>
              </>
            ) : (
              <>
                <div className={styles.staffSignalWideStat}><strong>{affiliation.primary}</strong><span>{uiText("所属队伍", uiLocale)}{affiliation.secondary ? <em>{affiliation.secondary}</em> : null}</span></div>
                <div><strong>{staff.roles?.length || 1}</strong><span>{uiText("职务", uiLocale)}<em>DUTIES</em></span></div>
              </>
            )}
          </div>
          <Link to={targetPath} className={styles.staffSignalLink} onClick={stop}>{actionLabel}<span aria-hidden="true">→</span></Link>
        </div>
      </article>
    )
  }

  return (
    <article
      className={styles.staffItem}
      tabIndex={0}
      role="link"
      onClick={() => navigate(targetPath)}
      onKeyDown={event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          navigate(targetPath)
        }
      }}
    >
      <Link to={targetPath} className={styles.cardLinkOverlay} aria-label={`${actionLabel} ${staff.name}`} />

      <div className={styles.staffName}>
        <span className={styles.staffPrimary}>{staff.name}</span>
        {staff.battleTag && staff.battleTag !== staff.name ? (
          <span className={styles.staffSecondary} title={staff.battleTag}>{staff.battleTag}</span>
        ) : null}
      </div>

      <div className={styles.staffMetaGrid}>
        <div className={styles.staffMetaBlock}>
          <span className={styles.staffMetaLabel}>{isEventStaff ? uiText("公开记录", uiLocale) : uiText("所属队伍", uiLocale)}</span>
          <strong>{isEventStaff ? uiText("{0} 场比赛", uiLocale, [staff.matchCount]) : affiliation.primary}</strong>
          {isEventStaff || affiliation.secondary ? <em>{isEventStaff ? uiText("{0} 个阶段 · {1} 支队伍", uiLocale, [staff.stageCount, staff.teamCount]) : affiliation.secondary}</em> : null}
        </div>
        <div className={styles.staffMetaBlock}>
          <span className={styles.staffMetaLabel}>{uiText("身份", uiLocale)}</span>
          <strong>{staff.roleLabel}</strong>
        </div>
      </div>

      <Link to={targetPath} className={styles.staffTeamLink} onClick={stop}>
        {actionLabel} →
      </Link>
    </article>
  )
}
