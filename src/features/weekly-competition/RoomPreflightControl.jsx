import { useState } from 'react'
import styles from './WeeklyRoomWorkspace.module.css'

export default function RoomPreflightControl({ data, disabled, command }) {
  const [checked, setChecked] = useState({})
  const fields = [['roomConfirmed', '游戏房间、地图与设置码已核对'], ['rosterVerified', '双方游戏内按 C C T N N 排列'], ['networkTestCompleted', '双方网络与进房情况已核对']]
  if (!data.preflight?.canConfirm || fields.every(([key]) => data.preflight[key])) return null
  return <section className={styles.preflight} aria-label="游戏开赛前核对"><strong>最终操作人员核对</strong><div>{fields.map(([key, label]) => <label key={key}><input type="checkbox" checked={!!checked[key]} onChange={event => setChecked(current => ({ ...current, [key]: event.target.checked }))} disabled={disabled} />{label}</label>)}</div><button type="button" disabled={disabled || !fields.every(([key]) => checked[key])} onClick={() => command('VERIFY_PREFLIGHT', checked)}>保存游戏设置核对</button></section>
}
