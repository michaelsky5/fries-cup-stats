import { translateUiText as uiText } from '../../lib/uiText.js'
import { Link, useLocation } from 'react-router-dom'
import { competitionSwitchSearch, teamWorkspaceSearch } from './accountCompetitionModel.js'
import styles from './AccountCompetitionBar.module.css'
import AccountCompetitionEntry from './AccountCompetitionEntry.jsx'

const roles = { LEADER: ['队长', 'Team captain'], MANAGER: ['队伍负责人', 'Team manager'], PLAYER: ['选手', 'Player'] }
const statusLabel = (status, en) => status === 'ARCHIVED' ? en ? 'Archived · Read only' : '已归档 · 只读'
  : status === 'DRAFT' ? en ? 'In preparation' : '筹备中' : en ? 'Active' : '进行中'

export default function AccountCompetitionBar({ competition, locale = 'zh-CN', withSeason, entry = false, compact = false, mobileHome = false }) {
  const { search } = useLocation()
  const en = locale === 'en-US'
  const { selected, competitions } = competition
  const href = id => `/me?${competitionSwitchSearch(search, id)}`
  const teamRole = team => [...new Set(team.roles || [])].map(role => uiText(roles[role]?.[en ? 1 : 0], locale) || role).join(' · ')
  if (entry) return <AccountCompetitionEntry competition={competition} locale={locale} withSeason={withSeason} mobileHome={mobileHome} />
  if (!selected) return null
  return <section className={styles.bar} data-compact={compact || undefined} aria-label={en ? 'Participation event' : uiText("参赛赛事", locale)} data-i18n-ignore>
    <div className={styles.context}>
      <div className={styles.current}><strong>{selected.name}</strong><span className={styles.status}>{uiText(statusLabel(selected.status, en), locale)}</span></div>
      {selected.teams.length > 1 ? <details key={`teams:${search}`} className={styles.switcher} data-team-switcher onKeyDown={event => { if (event.key === 'Escape') { event.currentTarget.removeAttribute('open'); event.currentTarget.querySelector('summary')?.focus() } }}>
        <summary>{uiText('切换队伍', locale)} <span>{selected.teams.length}</span><svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="m4 6 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg></summary>
        <nav aria-label={uiText('切换队伍', locale)}>{selected.teams.map(team => <Link key={team.id} to={`/me?${teamWorkspaceSearch(search, team.id)}`} aria-current={new URLSearchParams(search).get('team') === team.id ? 'true' : undefined}><strong>{team.shortName || team.name}{team.shortName && team.shortName !== team.name ? ` · ${team.name}` : ''}</strong><small>{teamRole(team)}</small></Link>)}</nav>
      </details> : selected.teams.length ? <div className={styles.memberships}><div className={styles.membership}><strong>{selected.teams[0].shortName || selected.teams[0].name}</strong><small>{teamRole(selected.teams[0])}</small></div></div> : null}
      {!!selected.staffRoles?.length && <div className={styles.memberships}><div className={styles.membership}><strong>{uiText('工作人员身份', locale)}</strong><small>{selected.staffRoles.map(role => uiText(role === 'REFEREE' ? '赛管' : '解说', locale)).join(' · ')}</small></div></div>}
    </div>
    {competitions.length > 1 ? <details key={search} className={styles.switcher} onKeyDown={event => { if (event.key === 'Escape') { event.currentTarget.removeAttribute('open'); event.currentTarget.querySelector('summary')?.focus() } }}><summary>{en ? 'Switch event' : uiText("切换赛事", locale)} <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="m4 6 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg></summary><nav aria-label={en ? 'Switch participation event' : uiText("切换参赛赛事", locale)}>{competitions.map(item => <Link key={item.id} to={href(item.id)} aria-current={item.id === selected.id ? 'true' : undefined}><strong>{item.name}</strong><small>{uiText(statusLabel(item.status, en), locale)}</small></Link>)}</nav></details> : null}
  </section>
}
