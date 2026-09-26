import { formatOwHeroName } from '../../lib/heroes.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { translateUiText as uiText } from '../../lib/uiText.js'
import { useRoomTransport } from './RoomTransport.jsx'
import { getRoomOperatingSides } from './weeklyRoomFlow.js'
import RoomPreflightControl from './RoomPreflightControl.jsx'
import styles from './WeeklyLiveRoomPage.module.css'
import frame from './RoomMatchFrame.module.css'

export default function RoomStartControl({ data, disabled, command, mutate }) {
  const locale = useUiLocale()
  const { coordinationWrite } = useRoomTransport()
  const legacy = data.preflight?.required ?? !data.opening
  return <>
    <p>{uiText(legacy ? '核对房间与名单后，由本场授权操作人记录游戏开赛。' : '首发与禁用已完成。游戏实际开始后，记录本图开赛即可。', locale)}</p>
    <div className={`${styles.conditions} ${frame.readiness}`}>
      {data.preparation.sides.map(side => { const key = side.team.id === data.match.teamA.id ? 'A' : 'B'; const confirmed = data.map?.[`lineup${key}`]?.length === 5; return <span key={side.team.id} data-ready={confirmed}>
        <b>{side.team.shortName || side.team.name}</b>
        <span>{uiText(confirmed ? '首发已确认 · C C T N N' : '首发待确认', locale)}</span>
        <small>{uiText('禁用', locale)} · {formatOwHeroName(data.map?.[`ban${key}`], locale) || '—'}</small>
      </span> })}
    </div>
    {legacy && <><RoomPreflightControl data={data} disabled={disabled} command={command} />
      <div className={frame.taskActions}>{getRoomOperatingSides(data).map(side => <button key={side.team.id} disabled={disabled || !side.canConfirm} onClick={() => mutate(() => coordinationWrite('/readiness', { weekId: data.match.weekId, matchId: data.match.id, teamId: side.team.id, ready: !side.ready, fingerprint: side.fingerprint, expectedRevision: side.revision }, data.access.staff, 'PUT'), '准备状态已保存。')}>{side.ready ? uiText('撤回本队准备确认', locale) : uiText('确认本队已准备好', locale)}</button>)}</div>
    </>}
    {data.blockers.length > 0 && <ul aria-label={uiText('开赛待处理事项', locale)}>{data.blockers.map(item => <li key={item}>{item}</li>)}</ul>}
    <div className={frame.taskActions}>
      {(data.access.staff || (data.access.operatorMode === 'TEAM_CAPTAINS' && data.access.representativeTeams.length > 0)) ? <button type="button" className={styles.primary} disabled={disabled || !data.access.canStart} onClick={() => command('START')}>{uiText('记录本图开赛', locale)}</button> : <strong>{uiText('等待本场授权操作人记录开赛', locale)}</strong>}
    </div>
    <small>{uiText(data.access.operatorMode === 'REFEREE' ? '由本场赛管记录实际开赛。' : '由任一方操作代表记录实际开赛。', locale)}</small>
  </>
}
