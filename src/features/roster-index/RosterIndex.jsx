import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { useEffect } from 'react'
import { Link, useLocation, useNavigationType } from 'react-router-dom'
import TeamLogo from '../../components/matches/TeamLogo.jsx'
import HeroArtwork from '../../components/media/HeroArtwork.jsx'
import { formatStaffPerson, getRosterRoleLabel } from '../../lib/rosterSelectors.js'
import { formatOwHeroName } from '../../lib/heroes.js'
import { getLocationPath, getRestoreScrollY, getSavedReturnScroll, getReturnState, restoreWindowScroll, saveReturnScroll } from '../../lib/navigationState.js'
import { rosterText } from './rosterCopy.js'
import styles from './RosterIndex.module.css'

const teamKey = team => team?.routeId || team?.team_id || team?.shortName || ''
const playerKey = player => player?.identity?.playerId || player?.player_id || player?.identity?.primary || ''

export function RosterIndexHeading({ title, description, count, unit, code, children }) {
  const location = useLocation()
  const navigationType = useNavigationType()
  useEffect(() => {
    if (navigationType === 'REPLACE') return
    const scroll = getRestoreScrollY(location.state) ?? (navigationType === 'POP' ? getSavedReturnScroll(getLocationPath(location)) : null)
    if (scroll !== null) restoreWindowScroll(scroll)
  }, [location, navigationType])
  return <header className={styles.heading}>
    <div><span className={styles.eyebrow}>{code}</span><h1>{title}</h1><p>{description}</p></div>
    <div className={styles.headingMeta}><span><b>{count}</b> {unit}</span>{children}</div>
  </header>
}

function ArchiveLink({ to, children, className = '', label }) {
  const location = useLocation()
  return <Link to={to} state={getReturnState(location)} onClick={() => saveReturnScroll(location)} className={className} aria-label={label}>{children}<span aria-hidden="true">↗</span></Link>
}

function FollowButton({ subject, onToggle, disabled, en }) {
  const uiLocale = useUiLocale()
  return <button type="button" className={styles.follow} onClick={() => onToggle?.(subject)} disabled={disabled} aria-pressed={Boolean(subject.isFavorite)}>
    {subject.isFavorite ? (en ? 'Following' : uiText("已关注", uiLocale)) : disabled ? (en ? 'Limit reached' : uiText("关注已满", uiLocale)) : (en ? '+ Follow' : uiText("＋ 关注", uiLocale))}
  </button>
}

function TeamPreview({ team, seasonId, withSeason, onToggleFavorite, favoriteDisabled, en }) {
  const uiLocale = useUiLocale()
  const names = list => list?.map(formatStaffPerson).filter(Boolean).join(' / ') || (en ? 'Not registered' : uiText("未登记", uiLocale))
  return <article className={`${styles.preview} ${styles.teamPreview}`} aria-label={en ? 'Selected team' : uiText("当前队伍", uiLocale)}>
    <div className={styles.previewKicker}>{en ? 'SELECTED TEAM' : uiText("当前队伍", uiLocale)}<span>{team.isFavorite ? '★' : 'FRIES CUP'}</span></div>
    <TeamLogo team={team} seasonId={seasonId} className={styles.teamHeroLogo} large />
    <div className={styles.previewIdentity}><h2>{team.shortName}</h2><p>{team.fullName}</p></div>
    <dl className={styles.facts}>
      <div><dt>{en ? 'Registered players' : uiText("注册选手", uiLocale)}</dt><dd>{team.rosterSize}</dd></div>
      <div><dt>{en ? 'Manager' : uiText("经理", uiLocale)}</dt><dd>{names(team.staff?.managers)}</dd></div>
      <div><dt>{en ? 'Coach' : uiText("教练", uiLocale)}</dt><dd>{names(team.staff?.coaches)}</dd></div>
    </dl>
    <footer className={styles.previewActions}><FollowButton subject={team} onToggle={onToggleFavorite} disabled={favoriteDisabled} en={en} /><ArchiveLink to={withSeason(`/teams/${teamKey(team)}`)}>{en ? 'Team archive' : uiText("进入队伍档案", uiLocale)}</ArchiveLink></footer>
  </article>
}

export function TeamAtlasExplorer({ directoryRef, teams, focusedTeam, onFocusTeam, seasonId, withSeason, onToggleFavorite, favoriteDisabled, locale, mobileExpanded }) {
  if (!focusedTeam) return null
  const en = locale === 'en-US'
  const preview = <TeamPreview team={focusedTeam} {...{ seasonId, withSeason, onToggleFavorite, favoriteDisabled, en }} />
  return <section ref={directoryRef} className={styles.explorer} aria-label={en ? 'Team directory' : uiText("战队目录", locale)}>
    <div className={styles.results}>
      <div className={styles.listHeading}><span>{en ? 'Team / registered roster' : uiText("队伍 / 注册名单", locale)}</span><span>{en ? 'Preview or open archive' : uiText("预览或进入档案", locale)}</span></div>
      <ul className={styles.teamGrid}>{teams.map(team => {
        const key = teamKey(team)
        const selected = key === teamKey(focusedTeam)
        return <li key={key} data-selected={selected}>
          <div className={styles.teamEntry}>
            <button type="button" className={styles.teamSelect} onClick={() => onFocusTeam(key)} aria-pressed={selected} aria-label={`${en ? 'Preview team' : uiText("预览队伍", locale)} ${team.shortName}`}>
              <TeamLogo team={team} seasonId={seasonId} className={styles.teamLogo} />
              <span><strong>{team.shortName}{team.isFavorite ? <i aria-label={en ? 'Following' : uiText("已关注", locale)}>★</i> : null}</strong><small>{team.fullName}</small><em>{team.rosterSize} {en ? 'registered players' : uiText("位注册选手", locale)}</em></span>
            </button>
            <ArchiveLink to={withSeason(`/teams/${key}`)} className={styles.entryLink} label={`${en ? 'Open team archive' : uiText("打开队伍档案", locale)} ${team.shortName}`} />
          </div>
          {selected && mobileExpanded ? <div className={styles.mobilePreview}>{preview}</div> : null}
        </li>
      })}</ul>
    </div>
    <aside className={styles.desktopPreview}>{preview}</aside>
  </section>
}

function PlayerPreview({ player, withSeason, onToggleFavorite, favoriteDisabled, locale }) {
  const en = locale === 'en-US'
  const heroes = player.hasStats ? (player.heroNames?.length ? player.heroNames : [player.avatar?.heroName].filter(Boolean)) : []
  return <article className={`${styles.preview} ${styles.playerPreview}`} aria-label={en ? 'Selected player' : uiText("当前选手", locale)}>
    <div className={styles.previewKicker}>{en ? 'SELECTED PLAYER' : uiText("当前选手", locale)}<span>{rosterText(getRosterRoleLabel(player.role), locale)}</span></div>
    <div className={styles.playerCover}>
      {heroes.length ? <HeroArtwork hero={heroes[0]} variant="spotlight" decorative className={styles.playerArt} locale={locale} /> : <div className={styles.noArtwork}><b>FC</b><span>{en ? 'No recorded hero data' : uiText("暂无英雄出场记录", locale)}</span></div>}
      <div className={styles.previewIdentity}><span>{player.teamShortName}</span><h2>{player.identity.primary}</h2><p>{player.identity.secondary}</p></div>
    </div>
    <dl className={styles.facts}>
      <div><dt>{en ? 'Recorded heroes' : uiText("已记录英雄", locale)}</dt><dd>{heroes.length ? heroes.slice(0, 3).map(hero => formatOwHeroName(hero, locale)).join(' / ') : '—'}</dd></div>
      <div><dt>{en ? 'Recorded maps' : uiText("出场地图", locale)}</dt><dd>{Number(player.maps_played) > 0 ? player.maps_played : '—'}</dd></div>
      <div><dt>{en ? 'Recorded minutes' : uiText("出场分钟", locale)}</dt><dd>{Number(player.raw_time_mins) > 0 ? Math.round(player.raw_time_mins) : '—'}</dd></div>
    </dl>
    <footer className={styles.previewActions}><FollowButton subject={player} onToggle={onToggleFavorite} disabled={favoriteDisabled} en={en} /><ArchiveLink to={withSeason(`/players/${playerKey(player)}`)}>{en ? 'Player archive' : uiText("进入选手档案", locale)}</ArchiveLink></footer>
  </article>
}

export function PlayerArchiveExplorer({ directoryRef, players, focusedPlayer, onFocusPlayer, startIndex, withSeason, onToggleFavorite, favoriteDisabled, locale, mobileExpanded }) {
  if (!focusedPlayer) return null
  const en = locale === 'en-US'
  const preview = <PlayerPreview player={focusedPlayer} {...{ withSeason, onToggleFavorite, favoriteDisabled, locale }} />
  return <section ref={directoryRef} className={styles.explorer} aria-label={en ? 'Player directory' : uiText("选手目录", locale)}>
    <div className={styles.results}>
      <div className={styles.listHeading}><span>{en ? 'Player / BattleTag' : uiText("选手 / BattleTag", locale)}</span><span>{en ? 'Team · role' : uiText("队伍 · 职责", locale)}</span></div>
      <ul className={styles.peopleList}>{players.map((player, index) => {
        const key = playerKey(player)
        const selected = key === playerKey(focusedPlayer)
        return <li key={key} data-selected={selected}>
          <div className={styles.personEntry}>
            <button type="button" className={styles.personSelect} onClick={() => onFocusPlayer(key)} aria-pressed={selected} aria-label={`${en ? 'Preview player' : uiText("预览选手", locale)} ${player.identity.primary}`}>
              <span className={styles.serial}>{String(startIndex + index).padStart(2, '0')}</span>
              <span className={styles.personName}><strong>{player.identity.primary}{player.isFavorite ? ' ★' : ''}</strong><small>{player.identity.secondary || '—'}</small></span>
              <span className={styles.personMeta}><b>{player.teamShortName}</b><small>{rosterText(getRosterRoleLabel(player.role), locale)}</small></span>
            </button>
            <ArchiveLink to={withSeason(`/players/${key}`)} className={styles.entryLink} label={`${en ? 'Open player archive' : uiText("打开选手档案", locale)} ${player.identity.primary}`} />
          </div>
          {selected && mobileExpanded ? <div className={styles.mobilePreview}>{preview}</div> : null}
        </li>
      })}</ul>
    </div>
    <aside className={styles.desktopPreview}>{preview}</aside>
  </section>
}

function StaffPreview({ staff, withSeason, en, locale }) {
  const event = Boolean(staff.storyPath)
  const to = withSeason(staff.storyPath || `/teams/${staff.team?.routeId || ''}`)
  return <article className={`${styles.preview} ${styles.staffPreview}`} aria-label={en ? 'Selected staff member' : uiText("当前职员", locale)}>
    <div className={styles.previewKicker}>{en ? 'EVENT CREDIT' : uiText("赛事署名", locale)}<span>{rosterText(staff.roleLabel, locale)}</span></div>
    <div className={styles.staffMonogram} aria-hidden="true">{String(staff.name).slice(0, 2)}</div>
    <div className={styles.previewIdentity}><h2>{staff.name}</h2><p>{staff.battleTag && staff.battleTag !== staff.name ? staff.battleTag : rosterText(staff.roleLabel, locale)}</p></div>
    <dl className={styles.facts}>{event ? <>
      <div><dt>{en ? 'Credited matches' : uiText("署名场次", locale)}</dt><dd>{staff.matchCount}</dd></div>
      <div><dt>{en ? 'Stages covered' : uiText("覆盖阶段", locale)}</dt><dd>{staff.stageCount}</dd></div>
    </> : <>
      <div><dt>{en ? 'Team' : uiText("所属队伍", locale)}</dt><dd>{staff.team?.shortName || '—'}</dd></div>
      <div><dt>{en ? 'Public roles' : uiText("公开职务", locale)}</dt><dd>{rosterText(staff.roleLabel, locale)}</dd></div>
    </>}</dl>
    <footer className={styles.previewActions}><ArchiveLink to={to}>{event ? (en ? 'Season review' : uiText("查看赛季回顾", locale)) : (en ? 'Team archive' : uiText("查看队伍档案", locale))}</ArchiveLink></footer>
  </article>
}

export function StaffSignalDirectory({ items, startIndex, focusedStaff, onFocus, withSeason, locale, seasonId, mobileExpanded }) {
  if (!focusedStaff) return null
  const en = locale === 'en-US'
  const preview = <StaffPreview staff={focusedStaff} {...{ withSeason, en, locale }} />
  return <div className={styles.explorer}>
    <div className={styles.results}>
      <div className={styles.listHeading}><span>{en ? 'Name / public role' : uiText("姓名 / 公开职务", locale)}</span><span>{en ? 'Team or event' : uiText("所属队伍或赛事", locale)}</span></div>
      <ul className={styles.peopleList}>{items.map((row, index) => {
        const selected = row.id === focusedStaff.id
        const scope = row.storyPath ? seasonId : row.team?.shortName || '—'
        return <li key={row.id} data-selected={selected}>
          <div className={styles.personEntry}>
            <button type="button" className={styles.personSelect} onClick={() => onFocus(row.id)} aria-pressed={selected} aria-label={`${en ? 'Preview staff member' : uiText("预览职员", locale)} ${row.name}`}>
              <span className={styles.serial}>{String(startIndex + index).padStart(2, '0')}</span><span className={styles.personName}><strong>{row.name}</strong><small>{rosterText(row.roleLabel, locale)}</small></span><span className={styles.personMeta}><b>{scope}</b></span>
            </button>
            <ArchiveLink to={withSeason(row.storyPath || `/teams/${row.team?.routeId || ''}`)} className={styles.entryLink} label={`${en ? 'Open record' : uiText("打开相关档案", locale)} ${row.name}`} />
          </div>
          {selected && mobileExpanded ? <div className={styles.mobilePreview}>{preview}</div> : null}
        </li>
      })}</ul>
    </div>
    <aside className={styles.desktopPreview}>{preview}</aside>
  </div>
}
