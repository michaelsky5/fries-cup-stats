import { Link } from 'react-router-dom'
import { translateUiText as uiText } from '../../lib/uiText.js'
import styles from '../account-ui/SignalWeeklyTeam.module.css'

const roleLabels = { LEADER: '队长', MANAGER: '队伍负责人', PLAYER: '选手' }
const teamName = team => [team?.shortName, team?.name !== team?.shortName ? team?.name : ''].filter(Boolean).join(' · ')

export default function WeeklyTeamContext({ teams, selected, canManage, readOnly, busy, locale, onChange, management, managementPath }) {
  const t = value => uiText(value, locale)
  return <section className={styles.teamContext} aria-label={t('队伍切换与管理')}>
    <div className={styles.teamContextRow}>
      <label className={styles.teamChoice}><span>{t(teams.length > 1 ? '当前队伍 · 切换队伍' : '当前队伍')}</span>
        {teams.length > 1 ? <select value={selected?.team?.id || ''} disabled={busy} onChange={event => onChange(event.target.value)} aria-label={t('切换队伍')}>
          {teams.map(item => <option key={item.team.id} value={item.team.id}>{teamName(item.team)} · {t(roleLabels[item.role] || item.role)}</option>)}
        </select> : <strong>{teamName(selected?.team)}</strong>}
      </label>
      <div className={styles.teamPermission}><strong>{t(roleLabels[selected?.role] || selected?.role)}</strong><span>{t(canManage && !readOnly ? '可维护本队资料' : '本队资料仅可查看')}</span></div>
    </div>
    <nav className={styles.teamOperations} aria-label={t('队伍管理')}>
      <Link to={managementPath(null)} aria-current={!management ? 'page' : undefined}>{t('参赛准备')}</Link>
      {canManage && <>
        <Link to={managementPath('coaches')} aria-current={management === 'coaches' ? 'page' : undefined}>{t('教练管理')} →</Link>
        <Link to={managementPath('members')} aria-current={management === 'members' ? 'page' : undefined}>{t('队伍自主增员')} →</Link>
        <Link to={managementPath('ownership')} aria-current={management === 'ownership' ? 'page' : undefined}>{t('队伍所有权转让')} →</Link>
      </>}
    </nav>
    {!canManage && <p>{t('本队名单与教练资料由队长或经理维护。')}</p>}
  </section>
}
