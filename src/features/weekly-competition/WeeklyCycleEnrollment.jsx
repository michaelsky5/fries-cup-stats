import { useRef, useState } from 'react'
import { enrollMyWeeklyCycle } from './weeklyCompetitionApi.js'
import styles from '../account-ui/SignalWeeklyTeam.module.css'
import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'

export default function WeeklyCycleEnrollment({ cycles, disabled, onEnrolled, onBeforeEnroll }) {
  const uiLocale = useUiLocale()
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const lock = useRef(false)
  async function enroll(cycle, team) {
    if (lock.current || disabled) return
    lock.current = true; setBusy(cycle.id + team.id); setError('')
    let saved = false
    try {
      if (onBeforeEnroll && !await onBeforeEnroll()) return
      const entry = await enrollMyWeeklyCycle(cycle.id, team.id)
      saved = true
      await onEnrolled(cycle.id, entry.id)
    } catch (failure) {
      setError(saved ? '周期登记已保存，但最新资料读取失败。请刷新资料后继续。' : failure?.data?.message || failure.message || '暂时无法确认登记结果，请刷新资料核对后再试。')
    } finally { setBusy(''); lock.current = false }
  }
  const available = cycles.filter(cycle => cycle.enrollmentOpen && cycle.eligibleTeams?.length)
  if (!available.length) return null
  return <section className={styles.enrollment} aria-labelledby="weekly-enrollment-title"><header><span>JOIN A CYCLE</span><h3 id="weekly-enrollment-title">{uiText("登记参赛周期", uiLocale)}</h3><p>{uiText("队伍资格已通过。登记周期后，每周可自行选择是否参赛；登记本身不会确认出场。", uiLocale)}</p></header>
    {error && <p role="alert">{uiText(error, uiLocale)}</p>}
    <div className={styles.enrollmentOptions}>{available.flatMap(cycle => cycle.eligibleTeams.map(team => <article key={cycle.id + team.id}><div><strong>{cycle.name}</strong><span>{team.name}</span><small>{uiText(cycle.status === 'REGISTRATION' ? '周期报名开放' : '本周接受新队伍登记', uiLocale)}</small></div><button className={styles.primaryButton} disabled={disabled || Boolean(busy)} onClick={() => enroll(cycle, team)}>{uiText(busy === cycle.id + team.id ? '正在登记…' : '登记并继续 →', uiLocale)}</button></article>))}</div>
  </section>
}
