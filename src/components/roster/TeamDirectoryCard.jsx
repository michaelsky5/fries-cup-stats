import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { Link } from 'react-router-dom'
import TeamLogo from '../matches/TeamLogo.jsx'
import { formatStaffPerson, normalizeStaffIdentity } from '../../lib/rosterSelectors.js'
import styles from './RosterComponents.module.css'

function StaffBlock({ label, person }) {
  if (!person) return null

  const identity = normalizeStaffIdentity(person)
  const name = formatStaffPerson(person)

  return (
    <div className={styles.staffBlock}>
      <span className={styles.metaLabel}>{label}</span>
      <strong title={name}>{name}</strong>
      {identity.battleTag && identity.battleTag !== name ? (
        <em title={identity.battleTag}>{identity.battleTag}</em>
      ) : null}
    </div>
  )
}

function TeamRosterSplit({ team }) {
  const uiLocale = useUiLocale()
  const counts = team.roleCounts || {}
  const roles = [
    { key: 'TANK', className: styles.roleTank, label: uiText("重装", uiLocale) },
    { key: 'DPS', className: styles.roleDps, label: uiText("输出", uiLocale) },
    { key: 'SUP', className: styles.roleSupport, label: uiText("支援", uiLocale) },
    ...(counts.FLEX ? [{ key: 'FLEX', className: styles.roleFlex, label: uiText("灵活", uiLocale) }] : [])
  ]

  return (
    <div className={styles.rosterSplit} aria-label={uiText("选手 {0}", uiLocale, [team.rosterSize])}>
      <span className={styles.rosterSplitLabel}>{uiText("选手", uiLocale)}</span>
      <span className={styles.rosterTotal}>{team.rosterSize}</span>
      <span className={styles.roleSplitRow} style={{ '--role-split-count': roles.length }}>
        {roles.map(role => (
          <b className={role.className} title={role.label} key={role.key}>{counts[role.key] || 0}</b>
        ))}
      </span>
    </div>
  )
}

export default function TeamDirectoryCard({
  team,
  index = 1,
  presentation = 'default',
  seasonId,
  withSeason = path => path,
  onToggleFavorite,
  favoriteDisabled = false
}) {
  const uiLocale = useUiLocale()
  const teamPath = withSeason(`/teams/${team.routeId}`)
  const favoriteLabel = team.isFavorite ? '取消关注' : favoriteDisabled ? '关注已满' : '关注'
  const manager = team.staff?.managers?.[0]
  const coach = team.staff?.coaches?.[0]

  return (
    <article className={`${styles.teamCard} ${presentation === 'signal' ? styles.teamCardSignal : ''} ${team.isFavorite ? styles.teamCardFavorite : ''}`}>
      <Link to={teamPath} className={styles.cardLinkOverlay} aria-label={uiText("查看战队 {0}", uiLocale, [team.shortName])} />

      <div className={styles.teamBrandArea} data-team-code={team.shortName}>
        {presentation === 'signal' ? <span className={styles.teamFileIndex}>{String(index).padStart(2, '0')}</span> : null}
        {team.isFavorite ? <span className={styles.favoriteBadge}>FOLLOWING</span> : null}
        <button
          type="button"
          className={`${styles.favoriteButton} ${team.isFavorite ? styles.favoriteButtonActive : ''}`}
          onClick={event => {
            event.preventDefault()
            event.stopPropagation()
            onToggleFavorite?.(team)
          }}
          disabled={favoriteDisabled}
          aria-label={favoriteLabel}
        >
          {team.isFavorite ? uiText("已关注", uiLocale) : uiText("关注", uiLocale)}
        </button>
        <TeamLogo team={team} seasonId={seasonId} className={styles.teamLogo} large />
      </div>

      <div className={styles.teamBody}>
        <div className={styles.teamIdentityRow}>
          <div className={styles.teamNameBlock}>
            <div className={styles.teamShortName}>{team.shortName}</div>
            <div className={styles.teamFullName}>{team.fullName}</div>
          </div>
          <TeamRosterSplit team={team} />
        </div>

        <div className={styles.teamStaffGrid}>
          <StaffBlock label={uiText("经理", uiLocale)} person={manager} />
          <StaffBlock label={uiText("教练", uiLocale)} person={coach} />
        </div>

        <span className={styles.cardTextLink}>{uiText("查看战队 →", uiLocale)}</span>
      </div>
    </article>
  )
}
