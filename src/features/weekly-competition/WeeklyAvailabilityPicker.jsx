
import styles from './WeeklyCompetitionWorkspace.module.css'
export const EMPTY_AVAILABILITY = { status: 'UNSET', slotIds: [], timeZone: 'Asia/Shanghai' }
export default function WeeklyAvailabilityPicker({ week, value, onChange, disabled }) {
  const slots = week?.availabilitySlots || []
  const selected = value?.status === 'ALL' ? slots.map(slot => slot.id) : value?.slotIds || []
  const choose = status => onChange({ status, slotIds: status === 'ALL' ? slots.map(slot => slot.id) : [], timeZone: 'Asia/Shanghai' })
  return <fieldset className={styles.availabilityPicker} disabled={disabled}>
    <legend>本周可比赛时间 <small>北京时间 UTC+8</small></legend>
    <p>用于排期参考；最终时间以赛程为准。未选择不会视为全部可赛。</p>
    <div className={styles.availabilityActions}>
      <button type="button" aria-pressed={value?.status === 'ALL'} disabled={disabled || !slots.length} onClick={() => choose('ALL')}>以上时段均可</button>
      <button type="button" aria-pressed={value?.status === 'NONE'} onClick={() => choose('NONE')}>以上时段均不可</button>
      <button type="button" aria-pressed={!value || value.status === 'UNSET'} onClick={() => choose('UNSET')}>尚未确定</button>
    </div>
    <div className={styles.availabilitySlots}>{slots.map(slot => <label key={slot.id}><input type="checkbox" checked={selected.includes(slot.id)} onChange={event => {
      const ids = event.target.checked ? [...selected, slot.id] : selected.filter(id => id !== slot.id)
      onChange({ status: ids.length ? ids.length === slots.length ? 'ALL' : 'SELECTED' : 'NONE', slotIds: ids, timeZone: 'Asia/Shanghai' })
    }} />{slot.label}</label>)}</div>
    {!slots.length && <p>本周尚未配置比赛时段，请在说明中填写可赛时间。</p>}
  </fieldset>
}
