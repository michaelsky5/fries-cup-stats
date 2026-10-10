import { roomBanLabel } from './roomBans.js'
import { MapSelectionWorkbench, HeroBanWorkbench } from './RoomSelectionWorkbench.jsx'
import { RoomCountdownHint } from './RoomPhaseClock.jsx'
import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { useRef, useState } from 'react'
import { useRoomTransport } from './RoomTransport.jsx'
import { formatOwMapName } from '../../lib/heroes.js'
import styles from './OpeningSelectionPanel.module.css'
import OpeningMoveIcon from './OpeningMoveIcon.jsx'
import surfaces from './RoomSurfaces.module.css'
import OpeningMethodControl from './OpeningMethodControl.jsx'
import FirstPickConfirmation from './FirstPickConfirmation.jsx'

const hands = [['ROCK', '石头'], ['SCISSORS', '剪刀'], ['PAPER', '布']]
const handName = value => hands.find(item => item[0] === value)?.[1] || '待出手'
const teamName = team => team?.shortName || team?.name || '队伍待定'
const phases = { NOT_STARTED: '开局对决', ONE_V_ONE_SETUP: '实际 1V1 · 指定选手', ONE_V_ONE_LIVE: '实际 1V1 进行中', PLAYING: '双方出手', DRAW: '平局重赛', CONFIRMING_FIRST_PICK: '确认首图选择权', CHOOSING: '胜方选图', BANNING: '依次 Ban', COMPLETE: '选禁已锁定' }
const loadDraft = key => { try { return JSON.parse(sessionStorage.getItem(key)) || {} } catch { return {} } }

function OpeningForm({ data, disabled, mutate }) {
  const { liveRoomWrite } = useRoomTransport()
  const uiLocale = useUiLocale()
  const opening = data.opening, access = opening.access, round = opening.rounds.at(-1)
  const team = side => side === 'A' ? data.match.teamA : side === 'B' ? data.match.teamB : null
  const later = opening.mapOrder > 1, retained = opening.rightsSource === 'DRAW_RETAINED_CHOOSER'
  const firstPickMode = opening.firstPick?.mode || 'RPS'
  const rightsLabel = retained ? '首图平局 · 沿用首图选择方' : opening.rightsSource === 'DRAW_TWO_MAPS_BACK' ? '平局 · 回溯前两图选择方' : later ? '上一图败方选择' : firstPickMode === 'HIGH_SEED' ? '高种子优先' : firstPickMode === 'MANUAL' ? opening.firstPick?.decision?.confirmation === 'BOTH_TEAMS' ? '双方已确认' : '赛管已确认' : '对决获胜'
  const key = `friescup:opening:${opening.mapOrder}:${data.actor.id}:${data.match.id}:${round?.id || 'start'}:${opening.phase}:${opening.nextSide || ''}`
  const [draft, setDraft] = useState(() => data.simulation ? {} : loadDraft(key)), [selectedRole, setRole] = useState(''), [storageError, setStorageError] = useState('')
  const [oneVOnePlayerA, setOneVOnePlayerA] = useState(opening.oneVOne?.playerAId || ''), [oneVOnePlayerB, setOneVOnePlayerB] = useState(opening.oneVOne?.playerBId || '')
  const persist = next => { setDraft(next); try { if (!data.simulation) sessionStorage.setItem(key, JSON.stringify(next)) } catch { setStorageError('浏览器未能保留选择，请保持此页面打开。') } }
  const edit = patch => persist({ ...draft, ...patch, pending: null })
  const ownTeamId = access.playTeams.includes(draft.teamId) ? draft.teamId : access.playTeams[0]
  const winnerTeam = team(opening.winner), nextTeam = team(opening.nextSide)
  const mapType = later && opening.typeCycle?.types.some(item => item.type === draft.mapType && !item.used && item.remaining) ? draft.mapType : later ? opening.typeCycle?.types.find(item => !item.used && item.remaining)?.type : 'Control'
  const chosenMap = opening.rules.maps.find(item => item.name === draft.mapName && !item.reason)
  const choosingBanOrder = opening.phase === 'BANNING' && !opening.setup?.firstBanSide
  const chosenHero = opening.heroes.find(item => item.name === draft.hero && !item.reason)
  const role = selectedRole || ['TANK', 'DPS', 'SUP'].find(value => opening.heroes.some(hero => hero.role === value && !hero.reason)) || 'TANK'
  const lockedOwnMove = round?.sides.find(item => item.move && !round.revealedAt)
  const seedOrder = opening.firstPick?.seedOrder
  const representative = selectedTeam => data.representatives?.sides.find(item => item.teamId === selectedTeam?.id)
  const representativeName = selectedTeam => representative(selectedTeam)?.active ? representative(selectedTeam).name : '待指定代表'
  const playersFor = side => (data.rosters?.find(roster => roster.teamId === data.match[`team${side}`]?.id)?.members || [])
  const actingTeam = opening.phase === 'CHOOSING' || choosingBanOrder ? winnerTeam : opening.phase === 'BANNING' ? nextTeam : null
  const operatorLabel = data.access.operatorMode === 'TEAM_CAPTAINS' ? '本场操作代表' : '本场赛管'
  const responsibility = !data.representatives?.ready ? '请双方先指定操作代表' : actingTeam ? `${representativeName(actingTeam)} · ${teamName(actingTeam)}` : firstPickMode === 'MANUAL' ? uiText('赛管确认 / 双方代表确认', uiLocale) : opening.phase === 'PLAYING' ? access.playTeams.length ? '轮到你提交本队出手' : '双方操作代表提交后揭晓' : opening.phase === 'DRAW' ? '双方代表可开启下一轮' : `由${operatorLabel}确认开启`
  async function send(action, extra = {}) {
    if (disabled) return
    const samePending = draft.pending?.action === action && Object.entries(extra).every(([key, value]) => JSON.stringify(draft.pending[key]) === JSON.stringify(value))
    const payload = samePending ? draft.pending : { action, ...extra, expectedRevision: opening.revision, clientKey: crypto.randomUUID() }
    persist({ ...draft, pending: payload })
    const result = await mutate(async () => {
      try { return await liveRoomWrite(data.match.id, '/opening', payload) }
      catch (error) { if (error.status && error.status < 500) persist({ ...draft, pending: null }); throw error }
    }, '')
    if (result) { setDraft({}); try { if (!data.simulation) sessionStorage.removeItem(key) } catch { /* Acknowledged state remains on the server. */ } }
    return result
  }
  return <section className={`${styles.opening} ${surfaces.paper}`} aria-label={uiText("开局与选禁", uiLocale)} data-room-slot="opening" data-phase={opening.phase}>
    <header><div><small>MAP {String(opening.mapOrder).padStart(2, '0')} / {later ? 'SELECTION' : 'OPENING'}</small><h1>{opening.phase === 'CHOOSING' ? uiText("选择本图地图", uiLocale) : opening.phase === 'BANNING' ? choosingBanOrder ? uiText("选择本图 Ban 顺序", uiLocale) : uiText("选择本图禁用英雄", uiLocale) : opening.phase === 'PLAYING' && access.playTeams.length ? uiText("提交本队出手", uiLocale) : opening.phase === 'NOT_STARTED' && firstPickMode !== 'RPS' ? uiText("确认首图选择权", uiLocale) : uiText(phases[opening.phase], uiLocale)}</h1></div><div className={styles.responsibility} data-own={Boolean(access.playTeams.length || access.canChoose || access.canChooseBanOrder || access.canBan)}><strong>{responsibility}</strong><span>{later ? uiText(rightsLabel, uiLocale) : round ? uiText("第 {0} 轮", uiLocale, [round.number]) : uiText("首图", uiLocale)}{opening.phase === 'PLAYING' ? uiText(" · {0}/2 已提交", uiLocale, [round.sides.filter(s => s.submitted).length]) : ''}</span></div></header>
    {!data.representatives?.ready && <div className={styles.representativeLinks}>{uiText(data.access.operatorMode === 'TEAM_CAPTAINS' ? '双方先指定本场操作代表；到操作开放时间后，任一代表可开启流程。' : '双方代表就绪后，赛管可开启流程。', uiLocale)}{data.representatives?.sides.filter(side => !side.active).map(side => <a key={side.teamId} href={`#room-team-${side.teamId}`}>{teamName([data.match.teamA, data.match.teamB].find(item => item.id === side.teamId))}{uiText(" · 指定代表 ↗", uiLocale)}</a>)}</div>}
    {!later && !['CHOOSING', 'BANNING', 'CONFIRMING_FIRST_PICK'].includes(opening.phase) && <OpeningMethodControl key={opening.revision} opening={opening} disabled={disabled} send={send} />}
    {opening.blocked && <p className={styles.warning} role="status">{opening.blocked}</p>}
    {storageError && <p role="alert">{storageError}</p>}
    {firstPickMode === 'REAL_1V1' && ['ONE_V_ONE_SETUP', 'ONE_V_ONE_LIVE'].includes(opening.phase) && <section className={styles.firstPick}>
      <p>{uiText("双方各指定一名已锁定名单选手进行实际游戏 1V1。漓江塔设置码 M94Y1（30分 10个头）。完成后由本场授权操作人记录实际获胜方。", uiLocale)}</p>
      {opening.phase === 'ONE_V_ONE_SETUP' && access.canSetOneVOne ? <><div className={styles.fields}><label>{uiText("TEAM A 1V1 选手", uiLocale)}<select value={oneVOnePlayerA} onChange={event => setOneVOnePlayerA(event.target.value)}><option value="">{uiText("选择已锁定选手", uiLocale)}</option>{playersFor('A').map(player => <option value={player.id} key={player.id}>{player.name}</option>)}</select></label><label>{uiText("TEAM B 1V1 选手", uiLocale)}<select value={oneVOnePlayerB} onChange={event => setOneVOnePlayerB(event.target.value)}><option value="">{uiText("选择已锁定选手", uiLocale)}</option>{playersFor('B').map(player => <option value={player.id} key={player.id}>{player.name}</option>)}</select></label></div><button className={styles.primary} disabled={disabled || !oneVOnePlayerA || !oneVOnePlayerB || oneVOnePlayerA === oneVOnePlayerB} onClick={() => send('SET_1V1_PLAYERS', { playerAId: oneVOnePlayerA, playerBId: oneVOnePlayerB })}>{uiText("确认 1V1 选手并开始", uiLocale)}</button></> : opening.phase === 'ONE_V_ONE_SETUP' ? <p className={styles.waiting} role="status">{uiText("等待本场授权操作人指定双方 1V1 选手。", uiLocale)}</p> : <><p><strong>{opening.oneVOne?.playerAName}</strong>（TEAM A） vs <strong>{opening.oneVOne?.playerBName}</strong>（TEAM B）</p>{access.canReportOneVOne ? <div className={styles.order}><button className={styles.primary} disabled={disabled} onClick={() => send('REPORT_1V1_RESULT', { winnerSide: 'A' })}>{uiText("记录 TEAM A 获胜", uiLocale)}</button><button className={styles.primary} disabled={disabled} onClick={() => send('REPORT_1V1_RESULT', { winnerSide: 'B' })}>{uiText("记录 TEAM B 获胜", uiLocale)}</button></div> : <p className={styles.waiting} role="status">{uiText("实际游戏 1V1 进行中，等待记录实际结果。", uiLocale)}</p>}</>}
    </section>}
    {firstPickMode === 'RPS' && ['NOT_STARTED', 'PLAYING', 'DRAW'].includes(opening.phase) && <>
      <p className={styles.rule}>{uiText("胜者获得 ", uiLocale)}<strong>{uiText("选图权", uiLocale)}</strong> ＋ <strong>{uiText("决定本队先 Ban / 后 Ban", uiLocale)}</strong>{uiText("。双方提交后同时揭晓，平局重赛。", uiLocale)}</p>
      {round && <div className={styles.duel}>{round.sides.map(side => <div key={side.side} data-winner={round.winner === side.side}><strong>{teamName(team(side.side))}</strong><span className={styles.hand} aria-hidden="true">{side.move ? <OpeningMoveIcon move={side.move} /> : side.submitted ? '✓' : '—'}</span><span>{side.move ? `${handName(side.move)}${round.winner === side.side ? ' · 获胜' : ''}` : side.submitted ? uiText("已锁定 · 等待揭晓", uiLocale) : uiText("{0} · 待提交", uiLocale, [representativeName(team(side.side))])}</span></div>)}</div>}
      {opening.phase === 'NOT_STARTED' && <div className={styles.start}><p>{uiText(data.access.operatorMode === 'TEAM_CAPTAINS' ? '双方核对本场队伍与规则后，由任一当前操作代表开启对决。' : '先由赛管核对双方队伍与本场规则，再开启对决。', uiLocale)}</p>{access.canBegin ? <button className={styles.primary} disabled={disabled} onClick={() => send('BEGIN')}>{uiText("开启先手对决", uiLocale)}</button> : <small>{uiText(data.access.operatorMode === 'TEAM_CAPTAINS' ? !data.representatives?.ready ? '等待双方指定操作代表' : '等待操作开放或当前代表开启' : '等待本场赛管开启', uiLocale)}</small>}</div>}
      {opening.phase === 'PLAYING' && <>{access.playTeams.length > 1 && <label>{uiText("代表队伍", uiLocale)}<select value={ownTeamId} onChange={e => edit({ teamId: e.target.value })}>{access.playTeams.map(id => <option value={id} key={id}>{teamName([data.match.teamA, data.match.teamB].find(t => t.id === id))}</option>)}</select></label>}
        {access.playTeams.length > 0 ? <><div className={styles.choices} role="group" aria-label={uiText("选择本队出手", uiLocale)}>{hands.map(([move, label]) => <button key={move} aria-pressed={draft.move === move} disabled={disabled} onClick={() => edit({ move })}><OpeningMoveIcon move={move} /><span>{label}</span><span className={styles.choiceMark} aria-hidden="true">{draft.move === move ? '✓' : ''}</span></button>)}</div><div className={styles.confirm}><small>{draft.move ? uiText("已选{0}，提交后锁定", uiLocale, [handName(draft.move)]) : uiText("选好后提交，对方无法提前看到", uiLocale)}</small><button className={styles.primary} disabled={disabled || !draft.move} onClick={() => send('PLAY', { teamId: ownTeamId, roundId: round.id, move: draft.move })}>{draft.pending ? uiText("重试锁定出手", uiLocale) : uiText("锁定{0}", uiLocale, [draft.move ? handName(draft.move) : '出手'])}</button></div></> : <p className={styles.waiting} role="status">{lockedOwnMove ? uiText("你的出手已保存，等待对方提交。刷新不会重选。", uiLocale) : uiText("由双方指定的操作代表出手；你可以查看进度和参与比赛沟通。", uiLocale)}</p>}
      </>}
      {opening.phase === 'DRAW' && <div className={styles.confirm}><p>{uiText("本轮平局，双方重新出手。", uiLocale)}</p>{access.canReplay && <button className={styles.primary} disabled={disabled} onClick={() => send('REPLAY', { roundId: round.id, teamId: data.access.representativeTeams[0] })}>{uiText("开启第 ", uiLocale)}{round.number + 1}{uiText(" 轮", uiLocale)}</button>}</div>}
    </>}
    {!['RPS', 'MANUAL'].includes(firstPickMode) && opening.phase === 'NOT_STARTED' && <div className={styles.firstPick}>
      <p>{uiText("获得首图选择权的队伍，可以选择地图并决定本队先 Ban 或后 Ban。", uiLocale)}</p>
      {firstPickMode === 'REAL_1V1' && <>{access.canBegin ? <button className={styles.primary} disabled={disabled} onClick={() => send('BEGIN')}>{uiText("开启实际游戏 1V1", uiLocale)}</button> : <small>{uiText("等待本场授权操作人开启实际游戏 1V1", uiLocale)}</small>}</>}
      {firstPickMode === 'HIGH_SEED' && <><div className={styles.seedOrder}>{['A', 'B'].map(side => <div key={side}><span>{teamName(team(side))}</span><strong>{seedOrder?.seeds.find(row => row.side === side)?.seed ? `#${seedOrder.seeds.find(row => row.side === side).seed}` : uiText("未记录", uiLocale)}</strong></div>)}</div><small>{uiText("依据本场已发布配对的种子快照，数字较小者优先。", uiLocale)}</small>{seedOrder?.ready && <strong>{uiText("确认后由 ", uiLocale)}{teamName(team(seedOrder.chooserSide))}{uiText(" 获得首图选择权", uiLocale)}</strong>}{access.canBegin ? <button className={styles.primary} disabled={disabled} onClick={() => send('BEGIN')}>{uiText("确认种子顺位，开始选图", uiLocale)}</button> : <small>{uiText("等待本场赛管核对并确认", uiLocale)}</small>}</>}

    </div>}
    {firstPickMode === 'MANUAL' && ['NOT_STARTED', 'CONFIRMING_FIRST_PICK'].includes(opening.phase) && <FirstPickConfirmation data={data} disabled={disabled} send={send} mutate={mutate} />}
    {opening.phase === 'CHOOSING' && <MapSelectionWorkbench data={data} draft={draft} edit={edit} send={send} disabled={disabled} mapType={mapType} chosenMap={chosenMap} />}
    {choosingBanOrder && <>
      <p className={styles.rule}>{uiText("双方首发与职责已确认，由 {0} 决定本队先 Ban 或后 Ban。", uiLocale, [teamName(winnerTeam)])}</p>
      {access.canChooseBanOrder ? <><div className={styles.banOrderChoice}><strong>{formatOwMapName(opening.setup?.name, uiLocale)}</strong><div className={styles.order} role="group" aria-label={uiText("决定本队 Ban 顺序", uiLocale)}>{[['FIRST', '本队先 Ban'], ['SECOND', '本队后 Ban']].map(([order, label]) => <button key={order} aria-pressed={draft.banOrder === order} disabled={disabled} onClick={() => edit({ banOrder: order })}>{uiText(label, uiLocale)}<small>{order === 'FIRST' ? uiText("对方第二个禁用", uiLocale) : uiText("对方第一个禁用", uiLocale)}</small></button>)}</div></div>
      <div className={styles.confirm}><small>{uiText("确认顺序后，先手方开始禁用英雄。", uiLocale)}</small><button className={styles.primary} disabled={disabled || !draft.banOrder} onClick={() => send('SELECT_BAN_ORDER', { teamId: winnerTeam.id, banOrder: draft.banOrder })}>{uiText("确认 Ban 顺序", uiLocale)}</button></div></> : <p className={styles.waiting} role="status">{uiText("等待 {0} 确认 Ban 顺序。", uiLocale, [representativeName(winnerTeam)])}</p>}
    </>}
    {opening.phase === 'BANNING' && !choosingBanOrder && <HeroBanWorkbench data={data} draft={draft} edit={edit} send={send} disabled={disabled} role={role} setRole={setRole} chosenHero={chosenHero} />}
    {opening.phase !== 'CHOOSING' && (opening.phase !== 'BANNING' || choosingBanOrder || !access.canBan) && <RoomCountdownHint data={data} action={opening.phase === 'BANNING' ? choosingBanOrder ? 'SELECT_BAN_ORDER' : 'BAN' : opening.phase === 'ONE_V_ONE_LIVE' ? 'REPORT_1V1_RESULT' : opening.phase === 'PLAYING' ? 'PLAY' : 'CONFIRM_FIRST_PICK'} />}
  </section>
}

export default function OpeningSelectionPanel(props) {
  const opening = props.data.opening
  return <OpeningForm key={`${props.data.actor.id}:${props.data.match.id}:${opening.mapOrder}:${opening.phase}:${opening.rounds.at(-1)?.id}:${opening.nextSide}`} {...props} />
}

export function OpeningHistory({ data, disabled, mutate }) {
  const { liveRoomWrite } = useRoomTransport()
  const uiLocale = useUiLocale()
  const [reason, setReason] = useState(''), pending = useRef(null)
  if (!data.opening) return null
  const opening = data.opening, team = side => side === 'A' ? teamName(data.match.teamA) : side === 'B' ? teamName(data.match.teamB) : uiText('待定', uiLocale)
  return <details className={styles.history}><summary>{uiText("选禁记录 · 第 ", uiLocale)}{opening.mapOrder}{uiText(" 图 ", uiLocale)}{opening.winner ? uiText("{0} 决定地图与 Ban 先后", uiLocale, [team(opening.winner)]) : uiText("首图选择权待确定", uiLocale)}</summary>
    {opening.firstPick && <p>{uiText("首图方式：", uiLocale)}{opening.firstPick.modeLabel} · {opening.firstPick.sourceLabel}{opening.firstPick.decision?.by ? uiText(" · {0} 确认", uiLocale, [opening.firstPick.decision.by]) : ''}{opening.firstPick.decision?.reason ? uiText(" · 依据：{0}", uiLocale, [opening.firstPick.decision.reason]) : ''}</p>}
    {opening.firstPick?.seedOrder?.seeds.length > 0 && <p>{uiText("配对种子快照：", uiLocale)}{opening.firstPick.seedOrder.seeds.map(row => `${team(row.side)} ${row.seed ? `#${row.seed}` : '未记录'}`).join(' / ')}{opening.firstPick.seedOrder.planVersion ? uiText(" · 配对版本 {0}", uiLocale, [opening.firstPick.seedOrder.planVersion]) : ''}</p>}
    {opening.rounds.map(round => <p key={round.id}>{uiText("第 ", uiLocale)}{round.number}{uiText(" 轮 · ", uiLocale)}{round.revealedAt ? `${round.sides.map(side => `${team(side.side)} ${handName(side.move)}`).join(' / ')} · ${round.winner ? `${team(round.winner)} 胜` : '平局'}` : uiText("双方提交后揭晓", uiLocale)}</p>)}
    {(opening.selections || []).map(item => <p key={item.mapOrder}>{uiText("第 ", uiLocale)}{item.mapOrder}{uiText(" 图 · ", uiLocale)}{formatOwMapName(item.mapName, uiLocale)} · {team(item.chooserSide)}{uiText(" 选图 / ", uiLocale)}{team(item.firstBanSide)}{uiText(" 先 Ban · ", uiLocale)}{roomBanLabel(item, 'A', uiLocale)} / {roomBanLabel(item, 'B', uiLocale)}</p>)}
    {opening.setup && <p>{formatOwMapName(opening.setup.name, uiLocale)} · {team(opening.setup.firstBanSide)}{uiText(" 先 Ban · ", uiLocale)}{team('A')}{uiText(" 禁用 ", uiLocale)}{roomBanLabel(opening.setup, 'A', uiLocale) || uiText("待定", uiLocale)} / {team('B')}{uiText(" 禁用 ", uiLocale)}{roomBanLabel(opening.setup, 'B', uiLocale) || uiText("待定", uiLocale)}</p>}
    {opening.corrections.map((item, index) => <p key={index}>{uiText("更正 · ", uiLocale)}{item.by}：{item.reason}</p>)}
    {(opening.access.canCorrect || opening.access.canAcceptPool) && <form onSubmit={async e => { e.preventDefault(); pending.current ||= { action: opening.access.canAcceptPool ? 'ACCEPT_MAP_POOL' : 'CORRECT', reason: reason.trim(), expectedRevision: opening.revision, clientKey: crypto.randomUUID() }; const result = await mutate(async () => { try { return await liveRoomWrite(data.match.id, '/opening', pending.current) } catch (error) { if (error.status && error.status < 500) pending.current = null; throw error } }, '已更正选禁安排，原有出手和胜者记录保留。'); if (result) { setReason(''); pending.current = null } }}><label>{uiText("赛管更正原因", uiLocale)}<input value={reason} onChange={e => { setReason(e.target.value); pending.current = null }} minLength={2} maxLength={500} required disabled={disabled} placeholder={uiText("保留先手结果，重新开放选禁", uiLocale)} /></label><button disabled={disabled || reason.trim().length < 2}>{opening.access.canAcceptPool ? uiText("核对并采用新增地图池", uiLocale) : uiText("记录原因并重新开放选禁", uiLocale)}</button></form>}
  </details>
}
