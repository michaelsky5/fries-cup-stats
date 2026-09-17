import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { useRef, useState } from 'react'
import { liveRoomWrite } from './liveRoomApi.js'
import { formatOwHeroName, formatOwMapName, formatOwMapMode, getOwHero, getOwMap } from '../../lib/heroes.js'
import { getHeroImage, getMapImage } from '../../lib/reviewAssets.js'
import styles from './OpeningSelectionPanel.module.css'
import OpeningMoveIcon from './OpeningMoveIcon.jsx'
import surfaces from './RoomSurfaces.module.css'
import OpeningMethodControl from './OpeningMethodControl.jsx'

const hands = [['ROCK', '石头'], ['SCISSORS', '剪刀'], ['PAPER', '布']]
const handName = value => hands.find(item => item[0] === value)?.[1] || '待出手'
const teamName = team => team?.shortName || team?.name || '队伍待定'
const mapTypeName = type => ({ Control: '占领要点', Hybrid: '攻击/护送', Escort: '运载目标', Push: '机动推进', Flashpoint: '闪点作战' }[type] || formatOwMapMode(type))
const phases = { NOT_STARTED: '开局对决', PLAYING: '双方出手', DRAW: '平局重赛', CHOOSING: '胜方选图', BANNING: '依次 Ban', COMPLETE: '选禁已锁定' }
const loadDraft = key => { try { return JSON.parse(sessionStorage.getItem(key)) || {} } catch { return {} } }

function OpeningForm({ data, disabled, mutate }) {
  const uiLocale = useUiLocale()
  const opening = data.opening, access = opening.access, round = opening.rounds.at(-1)
  const team = side => side === 'A' ? data.match.teamA : data.match.teamB
  const later = opening.mapOrder > 1, retained = opening.rightsSource === 'DRAW_RETAINED_CHOOSER'
  const firstPickMode = opening.firstPick?.mode || 'RPS'
  const rightsLabel = retained ? '平局 · 保留选择方' : later ? '上一图败方选择' : firstPickMode === 'HIGH_SEED' ? '高种子优先' : firstPickMode === 'MANUAL' ? '赛管已确认' : '对决获胜'
  const key = `friescup:opening:${opening.mapOrder}:${data.actor.id}:${data.match.id}:${round?.id || 'start'}:${opening.phase}:${opening.nextSide || ''}`
  const [draft, setDraft] = useState(() => loadDraft(key)), [role, setRole] = useState('ALL'), [storageError, setStorageError] = useState('')
  const persist = next => { setDraft(next); try { sessionStorage.setItem(key, JSON.stringify(next)) } catch { setStorageError('浏览器未能保留选择，请保持此页面打开。') } }
  const edit = patch => persist({ ...draft, ...patch, pending: null })
  const ownTeamId = access.playTeams.includes(draft.teamId) ? draft.teamId : access.playTeams[0]
  const winnerTeam = team(opening.winner), nextTeam = team(opening.nextSide)
  const mapType = opening.typeCycle?.types.some(item => item.type === draft.mapType && !item.used && item.remaining) ? draft.mapType : opening.typeCycle?.types.find(item => !item.used && item.remaining)?.type
  const chosenMap = opening.rules.maps.find(item => item.name === draft.mapName && !item.reason)
  const chosenHero = opening.heroes.find(item => item.name === draft.hero && !item.reason)
  const lockedOwnMove = round?.sides.find(item => item.move && !round.revealedAt)
  const seedOrder = opening.firstPick?.seedOrder
  const representative = selectedTeam => data.representatives?.sides.find(item => item.teamId === selectedTeam?.id)
  const representativeName = selectedTeam => representative(selectedTeam)?.active ? representative(selectedTeam).name : '待指定代表'
  const actingTeam = opening.phase === 'CHOOSING' ? winnerTeam : opening.phase === 'BANNING' ? nextTeam : null
  const responsibility = !data.representatives?.ready ? '请双方先指定操作代表' : actingTeam ? `${representativeName(actingTeam)} · ${teamName(actingTeam)}` : opening.phase === 'PLAYING' ? access.playTeams.length ? '轮到你提交本队出手' : '双方操作代表提交后揭晓' : opening.phase === 'DRAW' ? '双方代表可开启下一轮' : '由本场赛管确认开启'
  async function send(action, extra = {}) {
    if (disabled) return
    const payload = draft.pending || { action, ...extra, expectedRevision: opening.revision, clientKey: crypto.randomUUID() }
    persist({ ...draft, pending: payload })
    const result = await mutate(async () => {
      try { return await liveRoomWrite(data.match.id, '/opening', payload) }
      catch (error) { if (error.status && error.status < 500) persist({ ...draft, pending: null }); throw error }
    }, '')
    if (result) { setDraft({}); try { sessionStorage.removeItem(key) } catch { /* Acknowledged state remains on the server. */ } }
    return result
  }
  const step = opening.phase === 'COMPLETE' ? 3 : opening.phase === 'BANNING' ? 2 : opening.phase === 'CHOOSING' ? 1 : 0
  return <section className={`${styles.opening} ${surfaces.paper}`} aria-label={uiText("开局与选禁", uiLocale)} data-phase={opening.phase}>
    <header><div><small>MAP {String(opening.mapOrder).padStart(2, '0')} / {later ? 'SELECTION' : 'OPENING'}</small><h1>{opening.phase === 'CHOOSING' ? uiText("选择地图与 Ban 顺序", uiLocale) : opening.phase === 'BANNING' ? uiText("选择本图禁用英雄", uiLocale) : opening.phase === 'PLAYING' && access.playTeams.length ? uiText("提交本队出手", uiLocale) : opening.phase === 'NOT_STARTED' && firstPickMode !== 'RPS' ? uiText("确认首图选择权", uiLocale) : phases[opening.phase]}</h1></div><div className={styles.responsibility} data-own={Boolean(access.playTeams.length || access.canChoose || access.canBan)}><strong>{responsibility}</strong><span>{later ? rightsLabel : round ? uiText("第 {0} 轮", uiLocale, [round.number]) : uiText("首图", uiLocale)}{opening.phase === 'PLAYING' ? uiText(" · {0}/2 已提交", uiLocale, [round.sides.filter(s => s.submitted).length]) : ''}</span></div></header>
    <ol className={styles.steps} aria-label={uiText("开局进度", uiLocale)}>{[later ? '上一图赛果' : firstPickMode === 'RPS' ? '先手对决' : '选择权确认', '地图与顺序', '双方 Ban', '核对准备'].map((label, index) => <li key={label} aria-current={index === step ? 'step' : undefined} data-done={index < step}><b>{index < step ? '✓' : `0${index + 1}`}</b>{label}</li>)}</ol>
    {!data.representatives?.ready && <div className={styles.representativeLinks}>{uiText("双方代表就绪后，赛管可开启流程。", uiLocale)}{data.representatives?.sides.filter(side => !side.active).map(side => <a key={side.teamId} href={`#room-team-${side.teamId}`}>{teamName([data.match.teamA, data.match.teamB].find(item => item.id === side.teamId))}{uiText(" · 指定代表 ↗", uiLocale)}</a>)}</div>}
    {!later && !['CHOOSING', 'BANNING'].includes(opening.phase) && <OpeningMethodControl key={opening.revision} opening={opening} disabled={disabled || !!draft.pending} send={send} />}
    {opening.blocked && <p className={styles.warning} role="status">{opening.blocked}</p>}
    {storageError && <p role="alert">{storageError}</p>}
    {firstPickMode === 'RPS' && ['NOT_STARTED', 'PLAYING', 'DRAW'].includes(opening.phase) && <>
      <p className={styles.rule}>{uiText("胜者获得 ", uiLocale)}<strong>{uiText("选图权", uiLocale)}</strong> ＋ <strong>{uiText("决定本队先 Ban / 后 Ban", uiLocale)}</strong>{uiText("。双方提交后同时揭晓，平局重赛。", uiLocale)}</p>
      {round && <div className={styles.duel}>{round.sides.map(side => <div key={side.side} data-winner={round.winner === side.side}><strong>{teamName(team(side.side))}</strong><span className={styles.hand} aria-hidden="true">{side.move ? <OpeningMoveIcon move={side.move} /> : side.submitted ? '✓' : '—'}</span><span>{side.move ? `${handName(side.move)}${round.winner === side.side ? ' · 获胜' : ''}` : side.submitted ? uiText("已锁定 · 等待揭晓", uiLocale) : uiText("{0} · 待提交", uiLocale, [representativeName(team(side.side))])}</span></div>)}</div>}
      {opening.phase === 'NOT_STARTED' && <div className={styles.start}><p>{uiText("先由赛管核对双方队伍与本场规则，再开启对决。", uiLocale)}</p>{access.canBegin ? <button className={styles.primary} disabled={disabled} onClick={() => send('BEGIN')}>{uiText("开启先手对决", uiLocale)}</button> : <small>{uiText("等待本场赛管开启", uiLocale)}</small>}</div>}
      {opening.phase === 'PLAYING' && <>{access.playTeams.length > 1 && <label>{uiText("代表队伍", uiLocale)}<select value={ownTeamId} onChange={e => edit({ teamId: e.target.value })}>{access.playTeams.map(id => <option value={id} key={id}>{teamName([data.match.teamA, data.match.teamB].find(t => t.id === id))}</option>)}</select></label>}
        {access.playTeams.length > 0 ? <><div className={styles.choices} role="group" aria-label={uiText("选择本队出手", uiLocale)}>{hands.map(([move, label]) => <button key={move} aria-pressed={draft.move === move} disabled={disabled || !!draft.pending} onClick={() => edit({ move })}><OpeningMoveIcon move={move} /><span>{label}</span><span className={styles.choiceMark} aria-hidden="true">{draft.move === move ? '✓' : ''}</span></button>)}</div><div className={styles.confirm}><small>{draft.move ? uiText("已选{0}，提交后锁定", uiLocale, [handName(draft.move)]) : uiText("选好后提交，对方无法提前看到", uiLocale)}</small><button className={styles.primary} disabled={disabled || !draft.move} onClick={() => send('PLAY', { teamId: ownTeamId, roundId: round.id, move: draft.move })}>{draft.pending ? uiText("重试锁定出手", uiLocale) : uiText("锁定{0}", uiLocale, [draft.move ? handName(draft.move) : '出手'])}</button></div></> : <p className={styles.waiting} role="status">{lockedOwnMove ? uiText("你的出手已保存，等待对方提交。刷新不会重选。", uiLocale) : uiText("由双方指定的操作代表出手；你可以查看进度和参与比赛沟通。", uiLocale)}</p>}
      </>}
      {opening.phase === 'DRAW' && <div className={styles.confirm}><p>{uiText("本轮平局，双方重新出手。", uiLocale)}</p>{access.canReplay && <button className={styles.primary} disabled={disabled} onClick={() => send('REPLAY', { roundId: round.id, teamId: data.access.representativeTeams[0] })}>{uiText("开启第 ", uiLocale)}{round.number + 1}{uiText(" 轮", uiLocale)}</button>}</div>}
    </>}
    {firstPickMode !== 'RPS' && opening.phase === 'NOT_STARTED' && <div className={styles.firstPick}>
      <p>{uiText("获得首图选择权的队伍，可以选择地图并决定本队先 Ban 或后 Ban。", uiLocale)}</p>
      {firstPickMode === 'HIGH_SEED' && <><div className={styles.seedOrder}>{['A', 'B'].map(side => <div key={side}><span>{teamName(team(side))}</span><strong>{seedOrder?.seeds.find(row => row.side === side)?.seed ? `#${seedOrder.seeds.find(row => row.side === side).seed}` : uiText("未记录", uiLocale)}</strong></div>)}</div><small>{uiText("依据本场已发布配对的种子快照，数字较小者优先。", uiLocale)}</small>{seedOrder?.ready && <strong>{uiText("确认后由 ", uiLocale)}{teamName(team(seedOrder.chooserSide))}{uiText(" 获得首图选择权", uiLocale)}</strong>}{access.canBegin ? <button className={styles.primary} disabled={disabled} onClick={() => send('BEGIN')}>{uiText("确认种子顺位，开始选图", uiLocale)}</button> : <small>{uiText("等待本场赛管核对并确认", uiLocale)}</small>}</>}
      {firstPickMode === 'MANUAL' && (access.canBegin ? <form onSubmit={event => { event.preventDefault(); send('BEGIN', { chooserSide: draft.chooserSide, reason: draft.decisionReason?.trim() }) }}><label>{uiText("获得选择权的队伍", uiLocale)}<select required disabled={disabled} value={draft.chooserSide || ''} onChange={event => edit({ chooserSide: event.target.value })}><option value="">{uiText("选择队伍", uiLocale)}</option><option value="A">{teamName(team('A'))}</option><option value="B">{teamName(team('B'))}</option></select></label><label>{uiText("决定依据 · 双方可见", uiLocale)}<input required minLength={2} maxLength={500} disabled={disabled} value={draft.decisionReason || ''} onChange={event => edit({ decisionReason: event.target.value })} placeholder={uiText("例如：线下抽签结果，或本场规则条款", uiLocale)} /></label><button type="submit" className={styles.primary} disabled={disabled || !draft.chooserSide || (draft.decisionReason?.trim().length || 0) < 2}>{uiText("确认首图选择权", uiLocale)}</button></form> : <p>{uiText("等待本场赛管记录采用的方式、结果与依据。", uiLocale)}</p>)}
    </div>}
    {opening.phase === 'CHOOSING' && <><p className={styles.rule}>{retained ? uiText("上一图平局，保留选择方 ", uiLocale) : later ? uiText("上一图败方 ", uiLocale) : ''}{teamName(winnerTeam)}{uiText(" 选择第 ", uiLocale)}{opening.mapOrder}{uiText(" 图，并决定本队先 Ban 还是后 Ban。", uiLocale)}</p>{access.canChoose ? <>
      <div className={styles.typeHeading}><strong>{uiText("地图类型 · 第 ", uiLocale)}{opening.typeCycle?.round || 1}{uiText(" 轮", uiLocale)}</strong><small>{opening.typeCycle?.usedCount || 0}{uiText(" / 5 已用 · 五种选完后重开", uiLocale)}</small></div>
      <div className={styles.types} role="group" aria-label={uiText("选择地图类型", uiLocale)}>{opening.typeCycle?.types.map(item => <button key={item.type} aria-pressed={mapType === item.type} disabled={disabled || !!draft.pending || item.used || !item.remaining} onClick={() => edit({ mapType: item.type, mapName: '' })}><strong>{mapTypeName(item.type)}</strong><small>{item.used ? uiText("本轮已用", uiLocale) : item.remaining ? uiText("{0} 张可选", uiLocale, [item.remaining]) : uiText("地图已用尽", uiLocale)}</small></button>)}</div>
      <div className={styles.mapPool} role="group" aria-label={uiText("选择第 {0} 图", uiLocale, [opening.mapOrder])}>{opening.rules.maps.filter(map => map.type === mapType).map(map => <button key={map.name} aria-pressed={draft.mapName === map.name} disabled={disabled || !!draft.pending || !!map.reason} title={map.reason || formatOwMapName(map.name)} onClick={() => edit({ mapName: map.name })} style={getOwMap(map.name) ? { backgroundImage: `linear-gradient(0deg,#181a17ed,#181a1710),url("${getMapImage(map.type, map.name)}")` } : undefined}>{draft.mapName === map.name && <span className={styles.mapSelected} aria-hidden="true">{uiText("✓ 已选", uiLocale)}</span>}<strong>{formatOwMapName(map.name)}</strong><small>{map.reason || mapTypeName(map.type)}</small></button>)}</div>
      {!mapType && <p className={styles.warning}>{uiText("本轮剩余类型没有可用地图，请赛管联系管理员补充地图池。", uiLocale)}</p>}
      <div className={styles.order} role="group" aria-label={uiText("决定本队 Ban 顺序", uiLocale)}>{[['FIRST', '本队先 Ban'], ['SECOND', '本队后 Ban']].map(([order, label]) => <button key={order} aria-pressed={draft.banOrder === order} disabled={disabled || !!draft.pending} onClick={() => edit({ banOrder: order })}>{label}<small>{order === 'FIRST' ? uiText("对方第二个禁用", uiLocale) : uiText("对方第一个禁用", uiLocale)}</small></button>)}</div>
      <div className={styles.confirm}><small>{chosenMap ? formatOwMapName(chosenMap.name) : uiText("请选择地图", uiLocale)} · {draft.banOrder ? draft.banOrder === 'FIRST' ? uiText("本队先 Ban", uiLocale) : uiText("本队后 Ban", uiLocale) : uiText("请选择顺序", uiLocale)}</small><button className={styles.primary} disabled={disabled || !chosenMap || !draft.banOrder} onClick={() => send('SELECT_SETUP', { teamId: winnerTeam.id, mapName: chosenMap.name, mapType: chosenMap.type, banOrder: draft.banOrder })}>{uiText("确认地图与顺序", uiLocale)}</button></div>
    </> : <div className={styles.result}><strong>{teamName(winnerTeam)} · {rightsLabel}</strong>{!later && <span>{round?.sides.map(side => `${teamName(team(side.side))} ${handName(side.move)}`).join(' / ')}</span>}<p>{uiText("等待 ", uiLocale)}{representativeName(winnerTeam)}{uiText(" 确认地图和 Ban 顺序，随后依次禁用。", uiLocale)}</p></div>}</>}
    {opening.phase === 'BANNING' && <><div className={styles.banSummary}><strong>{formatOwMapName(opening.setup?.name)}</strong><span>{teamName(team(opening.setup?.firstBanSide))}{uiText(" 先 Ban", uiLocale)}</span><span>{teamName(data.match.teamA)}：{formatOwHeroName(opening.setup?.banA) || uiText("待选择", uiLocale)}</span><span>{teamName(data.match.teamB)}：{formatOwHeroName(opening.setup?.banB) || uiText("待选择", uiLocale)}</span></div>
      {access.canBan ? <><div className={styles.filters} role="group" aria-label={uiText("筛选英雄职责", uiLocale)}>{[['ALL', '全部'], ['TANK', '重装'], ['DPS', '输出'], ['SUP', '支援']].map(([key, label]) => <button key={key} aria-pressed={role === key} onClick={() => setRole(key)}>{label}</button>)}<small>{opening.rules.differentRolesPerMap ? uiText("双方禁用不同职责", uiLocale) : uiText("双方各禁用 1 名英雄", uiLocale)}</small></div><div className={styles.heroes} role="group" aria-label={uiText("选择禁用英雄", uiLocale)}>{opening.heroes.filter(hero => role === 'ALL' || hero.role === role).map(hero => <button key={hero.name} title={hero.reason || formatOwHeroName(hero.name)} aria-pressed={draft.hero === hero.name} disabled={disabled || !!hero.reason || !!draft.pending} onClick={() => edit({ hero: hero.name })}>{getOwHero(hero.name) && <img src={getHeroImage(hero.name, hero.role)} alt="" onError={e => { e.currentTarget.hidden = true }} />}<span>{formatOwHeroName(hero.name)}</span>{hero.reason && <small>{hero.reason}</small>}</button>)}</div><div className={styles.confirm}><small>{chosenHero ? uiText("禁用 {0} · 确认后锁定", uiLocale, [formatOwHeroName(chosenHero.name)]) : opening.setup?.banA || opening.setup?.banB ? uiText("选择一名英雄，确认后进入准备核对", uiLocale) : uiText("选择一名英雄，确认后轮到对方", uiLocale)}</small><button className={styles.primary} disabled={disabled || !chosenHero} onClick={() => send('BAN', { teamId: nextTeam.id, hero: chosenHero.name, heroRole: chosenHero.role })}>{uiText("确认 Ban", uiLocale)}{chosenHero ? ` ${formatOwHeroName(chosenHero.name)}` : ''}</button></div></> : <p className={styles.waiting} role="status">{uiText("等待 ", uiLocale)}{representativeName(nextTeam)}{uiText(" 完成禁用。你可以继续查看名单和比赛沟通。", uiLocale)}</p>}
    </>}
  </section>
}

export default function OpeningSelectionPanel(props) {
  const opening = props.data.opening
  return <OpeningForm key={`${props.data.actor.id}:${props.data.match.id}:${opening.mapOrder}:${opening.phase}:${opening.rounds.at(-1)?.id}:${opening.nextSide}`} {...props} />
}

export function OpeningHistory({ data, disabled, mutate }) {
  const uiLocale = useUiLocale()
  const [reason, setReason] = useState(''), pending = useRef(null)
  if (!data.opening) return null
  const opening = data.opening, team = side => teamName(side === 'A' ? data.match.teamA : data.match.teamB)
  return <details className={styles.history}><summary>{uiText("选禁记录 · 第 ", uiLocale)}{opening.mapOrder}{uiText(" 图 ", uiLocale)}{opening.winner ? uiText("{0} 决定地图与 Ban 先后", uiLocale, [team(opening.winner)]) : uiText("首图选择权待确定", uiLocale)}</summary>
    {opening.firstPick && <p>{uiText("首图方式：", uiLocale)}{opening.firstPick.modeLabel} · {opening.firstPick.sourceLabel}{opening.firstPick.decision?.by ? uiText(" · {0} 确认", uiLocale, [opening.firstPick.decision.by]) : ''}{opening.firstPick.decision?.reason ? uiText(" · 依据：{0}", uiLocale, [opening.firstPick.decision.reason]) : ''}</p>}
    {opening.firstPick?.seedOrder?.seeds.length > 0 && <p>{uiText("配对种子快照：", uiLocale)}{opening.firstPick.seedOrder.seeds.map(row => `${team(row.side)} ${row.seed ? `#${row.seed}` : '未记录'}`).join(' / ')}{opening.firstPick.seedOrder.planVersion ? uiText(" · 配对版本 {0}", uiLocale, [opening.firstPick.seedOrder.planVersion]) : ''}</p>}
    {opening.rounds.map(round => <p key={round.id}>{uiText("第 ", uiLocale)}{round.number}{uiText(" 轮 · ", uiLocale)}{round.revealedAt ? `${round.sides.map(side => `${team(side.side)} ${handName(side.move)}`).join(' / ')} · ${round.winner ? `${team(round.winner)} 胜` : '平局'}` : uiText("双方提交后揭晓", uiLocale)}</p>)}
    {(opening.selections || []).map(item => <p key={item.mapOrder}>{uiText("第 ", uiLocale)}{item.mapOrder}{uiText(" 图 · ", uiLocale)}{formatOwMapName(item.mapName)} · {team(item.chooserSide)}{uiText(" 选图 / ", uiLocale)}{team(item.firstBanSide)}{uiText(" 先 Ban · ", uiLocale)}{formatOwHeroName(item.banA)} / {formatOwHeroName(item.banB)}</p>)}
    {opening.setup && <p>{formatOwMapName(opening.setup.name)} · {team(opening.setup.firstBanSide)}{uiText(" 先 Ban · ", uiLocale)}{team('A')}{uiText(" 禁用 ", uiLocale)}{formatOwHeroName(opening.setup.banA) || uiText("待定", uiLocale)} / {team('B')}{uiText(" 禁用 ", uiLocale)}{formatOwHeroName(opening.setup.banB) || uiText("待定", uiLocale)}</p>}
    {opening.corrections.map((item, index) => <p key={index}>{uiText("更正 · ", uiLocale)}{item.by}：{item.reason}</p>)}
    {(opening.access.canCorrect || opening.access.canAcceptPool) && <form onSubmit={async e => { e.preventDefault(); pending.current ||= { action: opening.access.canAcceptPool ? 'ACCEPT_MAP_POOL' : 'CORRECT', reason: reason.trim(), expectedRevision: opening.revision, clientKey: crypto.randomUUID() }; const result = await mutate(async () => { try { return await liveRoomWrite(data.match.id, '/opening', pending.current) } catch (error) { if (error.status && error.status < 500) pending.current = null; throw error } }, '已更正选禁安排，原有出手和胜者记录保留。'); if (result) { setReason(''); pending.current = null } }}><label>{uiText("赛管更正原因", uiLocale)}<input value={reason} onChange={e => { setReason(e.target.value); pending.current = null }} minLength={2} maxLength={500} required disabled={disabled} placeholder={uiText("保留先手结果，重新开放选禁", uiLocale)} /></label><button disabled={disabled || reason.trim().length < 2}>{opening.access.canAcceptPool ? uiText("核对并采用新增地图池", uiLocale) : uiText("记录原因并重新开放选禁", uiLocale)}</button></form>}
  </details>
}
