import { translateUiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { useState } from 'react'
import { liveRoomWrite } from './liveRoomApi.js'
import styles from './WeeklyLiveRoomPage.module.css'

export default function RoomRefereeAssignments({ data, disabled, mutate }) {
  const locale = useUiLocale()
  const t = value => translateUiText(value, locale)
  const [userId, setUserId] = useState('')
  const referees = data.referees || (data.staff || []).map(item => ({ ...item, displayName: item.name }))
  const overrides = data.refereeOverrides || []
  const candidates = data.refereeCandidates || []
  const update = (person, active, followSchedule = false) => mutate(() => liveRoomWrite(data.match.id, '/referees', {
    userId: person.id, active, followSchedule, expectedRevision: person.revision
  }, 'PUT'), followSchedule ? '已恢复跟随正式排班。' : active ? '已指派本场赛管。' : '已撤回本场赛管权限，重新发布排班不会自动恢复。')
  return <details className={styles.staffDetails}>
    <summary>{t("本场工作人员 · 赛管 ")}{referees.length}{t(" 人")}</summary>
    <p>{t("赛管从已发布排班带入。临时指派与撤回仅影响本场，优先于排班；本队成员不可兼任。")}</p>
    {referees.length ? <ul className={styles.casterList}>{referees.map(person => <li key={person.id}>
      <div><strong>{person.displayName}</strong><span>{person.source === 'BROADCAST_PLAN' ? t("已发布排班") : t("本场手动指派")}</span></div>
      {data.access.administrator && <button disabled={disabled} onClick={() => update(person, false)}>{t("撤回 ")}{person.displayName}{t(" 的本场赛管权限")}</button>}
    </li>)}</ul> : <p>{t("当前没有已授权赛管，双方操作代表按自助流程推进。")}</p>}
    {data.access.administrator && <>
      {!!overrides.length && <div className={styles.casterOverrides}><strong>{t("本场手动设置")}</strong><ul className={styles.casterList}>{overrides.map(person => <li key={person.id}>
        <div><strong>{person.displayName}</strong><span>{person.active ? t("手动指派 · 仍需有效账号准入") : t("已撤回 · 覆盖排班")}</span></div>
        <button disabled={disabled} onClick={() => update(person, false, true)}>{t("恢复 ")}{person.displayName}{t(" 跟随排班")}</button>
      </li>)}</ul></div>}
      <form onSubmit={async event => { event.preventDefault(); const person = candidates.find(item => item.id === userId); if (person && await update(person, true)) setUserId('') }}>
        <label>{t("临时指派本场赛管")}<select required value={userId} disabled={disabled} onChange={event => setUserId(event.target.value)}><option value="">{t("选择已获准入且无本队冲突的赛管")}</option>
          {candidates.filter(person => !referees.some(item => item.id === person.id)).map(person => <option key={person.id} value={person.id}>{person.displayName}</option>)}
        </select></label><button disabled={disabled || !userId}>{t("保存赛管指派")}</button>
      </form>
    </>}
  </details>
}
