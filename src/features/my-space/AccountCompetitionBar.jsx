import { translateUiText as uiText } from '../../lib/uiText.js'
import { Link, useLocation } from 'react-router-dom'
import { competitionSwitchSearch } from './accountCompetitionModel.js'
import styles from './AccountCompetitionBar.module.css'
import AccountCompetitionEntry from './AccountCompetitionEntry.jsx'

const roles = { MANAGER: ['队伍负责人', 'Team manager'], PLAYER: ['选手', 'Player'] }
const statusLabel = (status, en) => status === 'ARCHIVED' ? en ? 'Archived · Read only' : '已归档 · 只读'
  : status === 'DRAFT' ? en ? 'In preparation' : '筹备中' : en ? 'Active' : '进行中'

export default function AccountCompetitionBar({ competition, locale = 'zh-CN', withSeason, entry = false }) {
  const { search } = useLocation()
  const en = locale === 'en-US'
  const { selected, competitions } = competition
  const href = id => `/me?${competitionSwitchSearch(search, id)}`
  if (entry) return <AccountCompetitionEntry competition={competition} locale={locale} withSeason={withSeason} />
  if (!selected) return null
  return <section className={styles.bar} aria-label={en ? 'Participation event' : uiText("参赛赛事", locale)} data-i18n-ignore>
    <div className={styles.context}>
      <div className={styles.current}><strong>{selected.name}</strong><span className={styles.status}>{statusLabel(selected.status, en)}</span></div>
      {selected.teams.length ? <div className={styles.memberships}>{selected.teams.map((team, index) => <div className={styles.membership} key={team.id || index}><strong>{team.shortName || team.name}</strong><small>{[...new Set(team.roles || [])].map(role => roles[role]?.[en ? 1 : 0] || role).join(' · ')}</small></div>)}</div> : null}
    </div>
    {competitions.length > 1 ? <details key={search} className={styles.switcher} onKeyDown={event => { if (event.key === 'Escape') { event.currentTarget.removeAttribute('open'); event.currentTarget.querySelector('summary')?.focus() } }}><summary>{en ? 'Switch event' : uiText("切换赛事", locale)} <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="m4 6 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg></summary><nav aria-label={en ? 'Switch participation event' : uiText("切换参赛赛事", locale)}>{competitions.map(item => <Link key={item.id} to={href(item.id)} aria-current={item.id === selected.id ? 'true' : undefined}><strong>{item.name}</strong><small>{statusLabel(item.status, en)}</small></Link>)}</nav></details> : null}
  </section>
}
