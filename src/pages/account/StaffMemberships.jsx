import { translateUiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { platformRequest } from '../../features/auth/platformApi.js'
import { withAccountCompetition } from '../../features/my-space/accountCompetitionModel.js'
import styles from './AccountSettingsPage.module.css'
import staffStyles from './StaffMemberships.module.css'

const roles = { REFEREE: '赛管', CASTER: '解说' }
const statuses = { ACTIVE: '本届已认证', REVOKED: '本届已撤销', SUSPENDED: '本届已暂停', PENDING: '待确认' }
export default function StaffMemberships() {
  const locale = useUiLocale()
  const t = value => translateUiText(value, locale)
  const [data, setData] = useState(null)
  const [applications, setApplications] = useState([])
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    setError('')
    platformRequest('/me/staff-memberships', { signal: controller.signal })
      .then(result => { if (!controller.signal.aborted) { setData(result.memberships); setApplications(result.applications || []) } })
      .catch(failure => { if (!controller.signal.aborted) setError(failure.message) })
    return () => controller.abort()
  }, [attempt])
  const events = [...(data || []).reduce((groups, item) => {
    if (!groups.has(item.seasonId)) groups.set(item.seasonId, { id: item.seasonId, name: item.season.name, roles: [] })
    groups.get(item.seasonId).roles.push(item)
    return groups
  }, new Map()).values()]
  return <section className={staffStyles.panel} aria-label={t("工作人员身份")}>
    <h3>{t("工作人员身份")}</h3>
    {error ? <><p role="alert">{t(error)}</p><button className={styles.secondary} onClick={() => setAttempt(value => value + 1)}>{t("重新读取身份")}</button></> : !data ? <p role="status">{t("正在读取本届工作人员关系…")}</p> : !data.length ? <p>{t('可通过管理员邀请或共用入口申请工作人员身份。已有选手使用原账号。')}</p> : <ul className={staffStyles.events}>{events.map(event => <li key={event.id}>
      <strong data-i18n-ignore>{event.name}</strong>
      <div className={staffStyles.roles}>{event.roles.map(item => <span key={item.id} data-active={item.status === 'ACTIVE'}>{t(roles[item.role])} · {t(statuses[item.status] || item.status)}</span>)}</div>
      {event.roles.some(item => item.roomEligible) ? <Link className={styles.secondary} to={withAccountCompetition('/me?section=matches', event.id)}>{t("查看本届比赛安排 →")}</Link> : event.roles.some(item => item.status === 'ACTIVE') && <p>{t("房间准入未开放，或工作人员身份已停用，请联系本届管理员核对。")}</p>}
    </li>)}</ul>}
    {!!data?.length && <p>{t("身份可以兼有。进房按本场职责授权；本队比赛保留队伍权限，未排班时等待管理员安排。")}</p>}
    {!!applications.length && <><h3>{t('工作人员申请记录')}</h3><button className={styles.secondary} onClick={() => setAttempt(value => value + 1)}>{t('刷新申请状态')}</button><ul className={staffStyles.events}>{applications.map(item => <li key={item.id}>
      <strong data-i18n-ignore>{item.season.name}</strong><div className={staffStyles.roles}><span>{item.roles.map(role => t(roles[role])).join(' / ')}</span><span>{t(item.status === 'PENDING_REVIEW' ? '等待管理员审核' : item.status === 'APPROVED' ? '申请已审核通过' : '申请未通过')}</span></div>
      {item.reviewNote && <p data-i18n-ignore>{item.reviewNote}</p>}
      {item.status === 'APPROVED' && <p>{t('批准职责：')}{item.approvedRoles.map(role => t(roles[role])).join(' / ')}</p>}
      {item.status === 'REJECTED' && <Link className={styles.secondary} to={'/auth/staff/apply?competition=' + encodeURIComponent(item.seasonId)}>{t('重新申请 →')}</Link>}
    </li>)}</ul></>}
  </section>
}
