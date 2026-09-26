import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { useState } from 'react'
import { useRoomTransport } from './RoomTransport.jsx'
import styles from './WeeklyLiveRoomPage.module.css'

export default function RoomCasterAssignments({ data, disabled, mutate }) {
  const { liveRoomWrite } = useRoomTransport()
  const uiLocale = useUiLocale()
  const [casterId, setCasterId] = useState('')
  const overrides = data.casterOverrides || []
  const update = (caster, active, followSchedule = false) => mutate(() => liveRoomWrite(data.match.id, '/casters', {
    userId: caster.id, active, followSchedule, expectedRevision: caster.revision
  }, 'PUT'), followSchedule ? '已恢复跟随已发布排班；当前是否可进入取决于排班与账号准入。' : active ? '已保存本场手动指派。' : '已手动撤回本场解说权限；重新发布排班不会自动恢复。')
  return <details className={styles.staffDetails}>
    <summary>{uiText("本场工作人员 · 解说 ", uiLocale)}{data.casters.length}{uiText(" 人", uiLocale)}</summary>
    <p>{uiText("已发布排班自动带入解说。本场手动指派或撤回会优先于排班，仅影响这场比赛。", uiLocale)}</p>
    {data.casters.length ? <ul className={styles.casterList}>{data.casters.map(caster => <li key={caster.id}>
      <div><strong>{caster.displayName}</strong><span>{caster.source === 'BROADCAST_PLAN' ? uiText("已发布排班", uiLocale) : uiText("本场手动指派", uiLocale)}</span></div>
      {data.access.administrator && <button type="button" disabled={disabled} onClick={() => update(caster, false)}>{uiText("撤回 ", uiLocale)}{caster.displayName}{uiText(" 的本场权限", uiLocale)}</button>}
    </li>)}</ul> : <p>{uiText("当前没有可进入本场的解说。", uiLocale)}</p>}
    {data.access.administrator && <>
      {!!overrides.length && <div className={styles.casterOverrides}><strong>{uiText("本场手动设置", uiLocale)}</strong><p>{uiText("恢复跟随排班后，手动设置失效；未排入本场的账号会失去解说权限。", uiLocale)}</p><ul className={styles.casterList}>{overrides.map(caster => <li key={caster.id}>
        <div><strong>{caster.displayName}</strong><span>{caster.active ? uiText("手动指派 · 仍需有效账号准入", uiLocale) : uiText("已手动撤回 · 覆盖排班", uiLocale)}</span></div>
        <button type="button" disabled={disabled} onClick={() => update(caster, false, true)}>{uiText("恢复 ", uiLocale)}{caster.displayName}{uiText(" 跟随排班", uiLocale)}</button>
      </li>)}</ul></div>}
      <form onSubmit={async event => {
        event.preventDefault()
        const caster = data.casterCandidates.find(item => item.id === casterId)
        if (caster && await update(caster, true)) setCasterId('')
      }}>
        <label>{uiText("本场手动指派解说", uiLocale)}<select value={casterId} onChange={event => setCasterId(event.target.value)} required disabled={disabled}>
          <option value="">{uiText("选择已获本届准入的解说账号", uiLocale)}</option>
          {data.casterCandidates.filter(user => !data.casters.some(item => item.id === user.id)).map(user => <option value={user.id} key={user.id}>{user.displayName}</option>)}
        </select></label><button disabled={disabled || !casterId}>{uiText("保存指派", uiLocale)}</button>
      </form>
    </>}
  </details>
}
