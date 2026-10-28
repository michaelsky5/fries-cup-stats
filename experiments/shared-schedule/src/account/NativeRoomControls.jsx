import { useState } from 'react'
import { Button, Input, Picker, Text, Textarea, View } from '@tarojs/components'
import { formatOwHeroName, formatOwMapName, formatOwMapMode } from '../../../../src/lib/heroes.js'
import { canSubmitRoomLineup, sortRoomLineup, validRoomLineup } from './nativeRoomModel.js'

export const teamName = team => team?.shortName || team?.name || '队伍待定'
const roles = ['DPS', 'TANK', 'SUP'], roleLabels = ['输出', '重装', '支援']
export function RoomButton({ children, onClick, disabled, primary = false }) {
  return <Button className={(primary ? 'nr-button nr-primary' : 'nr-button') + (disabled ? ' nr-disabled' : '')} disabled={disabled} onClick={onClick}>{children}</Button>
}
export function RoomField({ label, value, onChange, maxLength = 500, numeric = false, multiline = false }) {
  return <View className='nr-field'><Text>{label}</Text>{multiline
    ? <Textarea className='nr-input nr-textarea' value={value} maxlength={maxLength} onInput={event => onChange(event.detail.value)} />
    : <Input className='nr-input' value={value} type={numeric ? 'number' : 'text'} maxlength={maxLength} onInput={event => onChange(event.detail.value)} />}</View>
}
export function RoomChoice({ values, selected, onChange, disabled, label = '请选择' }) {
  const index = values.findIndex(item => item.value === selected)
  return <Picker disabled={disabled} range={values.map(item => item.label)} value={Math.max(0, index)} onChange={event => onChange(values[Number(event.detail.value)].value)}>
    <View className={'nr-picker' + (disabled ? ' nr-disabled' : '')}>{index >= 0 ? values[index].label : label}<Text>⌄</Text></View>
  </Picker>
}

export function NativeRoomRosters({ data, disabled, send }) {
  const [note, setNote] = useState('')
  return <View>{data.rosters.map(roster => {
    const team = [data.match.teamA, data.match.teamB].find(item => item.id === roster.teamId)
    const representative = data.representatives?.sides.find(item => item.teamId === roster.teamId)
    const canCheck = data.access.staff || data.access.representativeTeams.includes(roster.teamId)
    return <View className='nr-section' key={roster.teamId}><Text className='nr-title'>{teamName(team)}</Text>
      <Text className='nr-note'>本场操作代表：{representative?.name || representative?.displayName || '尚未指定'}{representative?.isYou ? '（你）' : ''}</Text>
      {(representative?.canAssign || representative?.canClaim) && <>
        {representative.requiresReason && <RoomField label='更换代表的公开原因' value={note} onChange={setNote} />}
        {representative.candidates.map(person => <RoomButton key={person.userId} disabled={disabled || representative.requiresReason && note.trim().length < 2}
          onClick={() => send('representatives', { teamId: roster.teamId, userId: person.userId, expectedRevision: representative.revision, ...(representative.requiresReason ? { reason: note.trim() } : {}) }, '确认由' + (person.name || person.displayName) + '担任本场操作代表？')}>{person.name || person.displayName} · 设为代表</RoomButton>)}
      </>}
      {[...roster.members, ...(roster.staff || [])].map(member => {
        const present = data.checkIns[roster.teamId]?.[member.id]?.status === 'PRESENT'
        return <View className='nr-row' key={member.id}><View className='nr-grow'><Text>{member.name}</Text><Text className='nr-note'>{member.battleTag || roleLabels[roles.indexOf(member.role)] || member.role}</Text></View>
          {canCheck ? <RoomButton disabled={disabled || data.archived} onClick={() => send('check-ins', { teamId: roster.teamId, playerId: member.id, status: present ? 'ABSENT' : 'PRESENT' })}>{present ? '已到 ✓' : '签到'}</RoomButton> : <Text>{present ? '已到' : '未到'}</Text>}</View>
      })}
    </View>
  })}</View>
}

function Lineup({ data, side, disabled, send }) {
  const team = data.match['team' + side]
  const roster = data.rosters.find(item => item.teamId === team.id)
  const [selected, setSelected] = useState(() => (roster?.members || []).filter(member => member.plannedStarter).slice(0, 5).map(member => ({ playerId: member.id, role: member.role })))
  const toggle = member => setSelected(items => items.some(item => item.playerId === member.id) ? items.filter(item => item.playerId !== member.id)
    : items.length < 5 ? [...items, { playerId: member.id, role: member.role }] : items)
  const canEdit = !disabled && canSubmitRoomLineup(data.map, side)
  return <View className='nr-section'><Text className='nr-title'>{teamName(team)} · 本图首发</Text>
    <Text className='nr-note'>独立确认五人及职责；双方均提交才同时公开。顺序为 D D T S S。</Text>
    {(roster?.members || []).map(member => { const entry = selected.find(item => item.playerId === member.id); return <View className='nr-row' key={member.id}>
      <Button className={'nr-player ' + (entry ? 'nr-selected' : '') + (!canEdit || !entry && selected.length >= 5 ? ' nr-disabled' : '')} disabled={!canEdit || !entry && selected.length >= 5} onClick={() => toggle(member)}>{entry ? '✓ ' : '＋ '}{member.name}</Button>
      <RoomChoice values={roles.map((role, index) => ({ value: role, label: roleLabels[index] }))} selected={entry?.role} disabled={!canEdit || !entry}
        onChange={role => setSelected(items => items.map(item => item.playerId === member.id ? { ...item, role } : item))} label='职责' />
    </View> })}
    <Text className='nr-note'>已选 {selected.length}/5 · {roles.map((role, index) => selected.filter(item => item.role === role).length + roleLabels[index]).join('、')}</Text>
    <RoomButton primary disabled={!canEdit || !validRoomLineup(selected)} onClick={() => send('commands', { action: 'SET_LINEUP', teamId: team.id,
      lineup: sortRoomLineup(selected).map(({ playerId, role }) => ({ playerId, role })), ...(data.map.lineupContext ? { lineupContext: data.map.lineupContext } : {}) })}>确认五人到场、职责与顺序</RoomButton>
  </View>
}

export function NativeOpeningControls({ data, disabled, send }) {
  const opening = data.opening, access = opening?.access || {}
  const [draft, setDraft] = useState({}), edit = patch => setDraft(value => ({ ...value, ...patch }))
  if (!opening) return null
  const team = side => data.match['team' + side]
  const action = (name, values = {}, confirmation) => send('opening', { action: name, ...values }, confirmation)
  const round = opening.rounds[opening.rounds.length - 1]
  const later = opening.mapOrder > 1
  const type = later ? opening.typeCycle?.types.find(item => item.type === draft.mapType && !item.used && item.remaining)?.type
    || opening.typeCycle?.types.find(item => !item.used && item.remaining)?.type : 'Control'
  const map = opening.rules.maps.find(item => item.name === draft.mapName && item.type === type && !item.reason)
  const needsSide = ['Hybrid', 'Escort'].includes(map?.type)
  const ownId = access.playTeams.includes(draft.teamId) ? draft.teamId : access.playTeams[0]
  const mode = opening.firstPick?.mode || 'RPS'
  const lineupSides = ['A', 'B'].filter(side => canSubmitRoomLineup(data.map, side) && (data.access.staff || data.access.representativeTeams.includes(team(side).id)))
  const lineupsReady = data.map?.lineupLocks?.A && data.map?.lineupLocks?.B || data.map?.lineupA?.length === 5 && data.map?.lineupB?.length === 5
  const heroes = opening.heroes.filter(hero => (!draft.role || hero.role === draft.role) && (!draft.search || (hero.name + formatOwHeroName(hero.name, 'zh-CN')).toLowerCase().includes(draft.search.trim().toLowerCase())))
  const hero = opening.heroes.find(item => item.name === draft.hero && !item.reason)
  return <View className='nr-section'>
    {opening.blocked && <Text className='nr-notice'>{opening.blocked}</Text>}
    {opening.phase === 'NOT_STARTED' && mode !== 'MANUAL' && <><Text className='nr-title'>首图选择权</Text><Text className='nr-note'>{mode === 'RPS' ? '双方出手后同时揭晓，平局重新出手。' : mode === 'HIGH_SEED' ? '按本场已发布的种子顺位确认。' : '先进行真实游戏内1V1，再由本场授权操作人记录。'}</Text>
      {access.canBegin ? <RoomButton primary disabled={disabled} onClick={() => action('BEGIN')}>确认规则并开始</RoomButton> : <Text className='nr-note'>等待操作开放及双方指定代表。</Text>}</>}
    {mode === 'MANUAL' && ['NOT_STARTED', 'CONFIRMING_FIRST_PICK'].includes(opening.phase) && <><Text className='nr-title'>确认首图选择权</Text>
      <Text className='nr-note'>双方确认同一结果，或由本场赛管核对确认。存在争议时请联系赛事组。</Text>
      {(opening.firstPick?.confirmations || []).map(item => <Text className='nr-note' key={item.side}>{teamName(team(item.side))}：{item.chooserSide ? '已确认' + teamName(team(item.chooserSide)) : '未确认'}</Text>)}
      <RoomChoice values={['A', 'B'].map(side => ({ value: side, label: teamName(team(side)) }))} selected={draft.chooser} onChange={chooser => edit({ chooser })} disabled={disabled} label='获得首图选择权的队伍' />
      <RoomButton primary disabled={disabled || !draft.chooser || !(opening.phase === 'NOT_STARTED' ? access.canBegin : access.canConfirmFirstPick)}
        onClick={() => action(opening.phase === 'NOT_STARTED' ? 'BEGIN' : 'CONFIRM_FIRST_PICK', { chooserSide: draft.chooser, ...(access.firstPickConfirmationTeams[0] ? { teamId: access.firstPickConfirmationTeams[0] } : {}) })}>确认本队意见</RoomButton></>}
    {opening.phase === 'ONE_V_ONE_SETUP' && <><Text className='nr-title'>指定真实1V1选手</Text>{['A', 'B'].map(side => <RoomChoice key={side}
      values={(data.rosters.find(roster => roster.teamId === team(side).id)?.members || []).map(member => ({ value: member.id, label: member.name }))}
      selected={draft['player' + side]} onChange={value => edit({ ['player' + side]: value })} disabled={disabled || !access.canSetOneVOne} label={teamName(team(side)) + '选手'} />)}
      <RoomButton primary disabled={disabled || !access.canSetOneVOne || !draft.playerA || !draft.playerB} onClick={() => action('SET_1V1_PLAYERS', { playerAId: draft.playerA, playerBId: draft.playerB })}>确认双方1V1选手</RoomButton></>}
    {opening.phase === 'ONE_V_ONE_LIVE' && <><Text className='nr-title'>实际1V1进行中</Text><Text>{opening.oneVOne?.playerAName} / {opening.oneVOne?.playerBName}</Text>
      {access.canReportOneVOne && ['A', 'B'].map(side => <RoomButton key={side} disabled={disabled} onClick={() => action('REPORT_1V1_RESULT', { winnerSide: side }, '已在游戏中核对：' + teamName(team(side)) + '获胜？')}>记录{teamName(team(side))}获胜</RoomButton>)}</>}
    {opening.phase === 'PLAYING' && <><Text className='nr-title'>提交本队出手</Text>{round?.sides.map(item => <Text key={item.side} className='nr-note'>{teamName(team(item.side))} · {item.move ? ({ ROCK: '石头', SCISSORS: '剪刀', PAPER: '布' })[item.move] : item.submitted ? '已密封提交' : '待出手'}</Text>)}
      {access.playTeams.length > 1 && <RoomChoice values={access.playTeams.map(id => ({ value: id, label: teamName([team('A'), team('B')].find(item => item.id === id)) }))} selected={ownId} onChange={teamId => edit({ teamId })} disabled={disabled} />}
      {access.playTeams.length ? <><View className='nr-choices'>{[['ROCK', '石头'], ['SCISSORS', '剪刀'], ['PAPER', '布']].map(([value, label]) => <Button key={value} className={'nr-choice ' + (draft.move === value ? 'nr-selected' : '') + (disabled ? ' nr-disabled' : '')} disabled={disabled} onClick={() => edit({ move: value })}>{label}</Button>)}</View>
        <RoomButton primary disabled={disabled || !draft.move} onClick={() => action('PLAY', { roundId: round.id, teamId: ownId, move: draft.move })}>锁定本队出手</RoomButton></> : <Text className='nr-note'>等待双方代表，已提交内容不会因刷新重选。</Text>}</>}
    {opening.phase === 'DRAW' && <><Text>本轮平局，双方重新出手。</Text>{access.canReplay && <RoomButton primary disabled={disabled} onClick={() => action('REPLAY', { roundId: round.id, teamId: data.access.representativeTeams[0] })}>开启下一轮</RoomButton>}</>}
    {opening.phase === 'CHOOSING' && <><Text className='nr-title'>{teamName(team(opening.winner))}选择第{opening.mapOrder}图</Text>
      {access.canChoose ? <>{later && <RoomChoice values={(opening.typeCycle?.types || []).filter(item => !item.used && item.remaining).map(item => ({ value: item.type, label: formatOwMapMode(item.type, 'zh-CN') }))} selected={type} onChange={mapType => edit({ mapType, mapName: '', startSide: '' })} disabled={disabled} />}
        {opening.rules.maps.filter(item => item.type === type).map(item => <Button key={item.name} className={'nr-map-choice ' + (draft.mapName === item.name ? 'nr-selected' : '') + (disabled || item.reason ? ' nr-disabled' : '')} disabled={disabled || !!item.reason}
          onClick={() => edit({ mapName: item.name, startSide: '' })}>{formatOwMapName(item.name, 'zh-CN')}{item.reason ? ' · ' + item.reason : ''}</Button>)}
        {needsSide && <RoomChoice values={[{ value: 'ATTACK', label: '本队先攻' }, { value: 'DEFEND', label: '本队先防' }]} selected={draft.startSide} onChange={startSide => edit({ startSide })} disabled={disabled} label='本队攻防顺序' />}
        <RoomButton primary disabled={disabled || !map || needsSide && !draft.startSide} onClick={() => action('SELECT_SETUP', { teamId: team(opening.winner).id, mapName: map.name, mapType: map.type, ...(needsSide ? { startSide: draft.startSide } : {}) })}>确认地图，进入首发</RoomButton>
      </> : <Text className='nr-note'>等待有选图权的代表确认。</Text>}</>}
    {opening.phase === 'BANNING' && <>
      <Text className='nr-note'>{['A', 'B'].map(side => teamName(team(side)) + (data.map?.lineupLocks?.[side] ? '：已密封提交' : '：待确认首发')).join(' / ')}</Text>
      {!lineupsReady && lineupSides.map(side => <Lineup key={side + ':' + data.map?.lineupContext} data={data} side={side} disabled={disabled} send={send} />)}
      {!lineupsReady && !lineupSides.length && <Text className='nr-note'>等待另一方独立提交首发。</Text>}
      {lineupsReady && !opening.setup?.firstBanSide && <><Text className='nr-title'>由{teamName(team(opening.winner))}决定禁用顺序</Text>
        {access.canChooseBanOrder && <><RoomChoice values={[{ value: 'FIRST', label: '本队先禁' }, { value: 'SECOND', label: '本队后禁' }]} selected={draft.banOrder} onChange={banOrder => edit({ banOrder })} disabled={disabled} />
          <RoomButton primary disabled={disabled || !draft.banOrder} onClick={() => action('SELECT_BAN_ORDER', { teamId: team(opening.winner).id, banOrder: draft.banOrder })}>确认禁用顺序</RoomButton></>}</>}
      {lineupsReady && opening.setup?.firstBanSide && <><Text className='nr-title'>{teamName(team(opening.nextSide))}禁用英雄</Text>
        {access.canBan ? <><RoomChoice values={[{ value: '', label: '全部职责' }, ...roles.map((role, index) => ({ value: role, label: roleLabels[index] }))]} selected={draft.role || ''} onChange={role => edit({ role })} disabled={disabled} />
          <RoomField label='搜索英雄' value={draft.search || ''} onChange={search => edit({ search })} maxLength={80} />
          <View className='nr-heroes'>{heroes.map(item => <Button className={'nr-hero ' + (draft.hero === item.name ? 'nr-selected' : '') + (disabled || item.reason ? ' nr-disabled' : '')} key={item.name} disabled={disabled || !!item.reason} onClick={() => edit({ hero: item.name })}>{formatOwHeroName(item.name, 'zh-CN')}{item.reason ? ' · 不可选' : ''}</Button>)}</View>
          {hero && <Text className='nr-note'>确认后双方本图均不可使用{formatOwHeroName(hero.name, 'zh-CN')}。</Text>}
          <RoomButton primary disabled={disabled || !hero} onClick={() => action('BAN', { teamId: team(opening.nextSide).id, hero: hero.name, heroRole: hero.role })}>确认禁用{hero ? ' ' + formatOwHeroName(hero.name, 'zh-CN') : ''}</RoomButton>
        </> : <Text className='nr-note'>等待当前禁用方，结果会自动同步。</Text>}</>}
    </>}
    {opening.access.canNext && <RoomButton primary disabled={disabled} onClick={() => action('NEXT_MAP')}>进入下一图准备</RoomButton>}
  </View>
}

export function NativeMatchControls({ data, disabled, send, openWeb }) {
  const [scoreA, setScoreA] = useState(''), [scoreB, setScoreB] = useState(''), [note, setNote] = useState('')
  const own = data.access.representativeTeams[0]
  const resultAgreement = data.captainAgreements?.result
  const lineupAgreement = data.captainAgreements?.lineup
  const continuation = data.captainAgreements?.preparation
  const command = (action, extra = {}, confirmation) => send('commands', { action, ...extra }, confirmation)
  const agreement = (action, view, extra = {}) => command(action, { teamId: own, ...(view?.context ? { agreementContext: view.context } : {}), ...(view?.id ? { agreementId: view.id } : {}), ...extra })
  const validScore = /^\d{1,3}$/.test(scoreA) && /^\d{1,3}$/.test(scoreB) && Number(scoreA) <= 100 && Number(scoreB) <= 100
  return <View className='nr-section'>
    {data.phase === 'PREPARING' && data.opening?.complete && <><Text className='nr-title'>等待游戏实际开赛</Text>
      <Text className='nr-note'>已完成选禁。只有本场有权限的操作人可记录实际开赛。</Text>
      {data.access.canStart && <RoomButton primary disabled={disabled} onClick={() => command('START', {}, '确认游戏已经实际开始？记录后本图进入比赛中。')}>记录游戏已开赛</RoomButton>}</>}
    {data.timing?.preparationOverdue && continuation?.canConfirm && <RoomButton disabled={disabled} onClick={() => agreement('CONFIRM_PREPARATION_CONTINUE', continuation)}>本队同意按当前记录继续开赛</RoomButton>}
    {(lineupAgreement?.withdrawTeams || []).map(teamId => <RoomButton key={teamId} disabled={disabled} onClick={() => command('WITHDRAW_LINEUP', { teamId })}>撤回本队密封首发，原计时继续</RoomButton>)}
    {lineupAgreement?.canRespond && <><Text className='nr-note'>{lineupAgreement.reason}</Text>
      <RoomButton disabled={disabled} onClick={() => agreement('RESPOND_LINEUP_REOPEN', lineupAgreement, { ready: true })}>同意重新确认首发</RoomButton>
      <RoomButton disabled={disabled} onClick={() => agreement('RESPOND_LINEUP_REOPEN', lineupAgreement, { ready: false })}>保留原首发</RoomButton></>}
    {lineupAgreement?.canRequest && <><RoomField label='公开更正原因' value={note} onChange={setNote} />
      <RoomButton disabled={disabled || note.trim().length < 2} onClick={() => agreement('REQUEST_LINEUP_REOPEN', null, { note: note.trim() })}>申请双方重新确认首发</RoomButton></>}
    {data.access.canPause && <><RoomField label='公开暂停原因' value={note} onChange={setNote} />
      <RoomButton disabled={disabled || note.trim().length < 2} onClick={() => command('PAUSE', { note: note.trim(), pauseSide: own === data.match.teamA.id ? 'A' : own === data.match.teamB.id ? 'B' : 'PUBLIC' }, '确认实际游戏已经暂停？')}>记录游戏已暂停</RoomButton></>}
    {data.phase === 'PAUSED' && <><Text className='nr-title'>比赛已暂停</Text>
      {[data.match.teamA, data.match.teamB].filter(team => data.access.staff || data.access.representativeTeams.includes(team.id)).map(team => <RoomButton key={team.id} disabled={disabled} onClick={() => command('RECOVER', { teamId: team.id, ready: true, pauseStartedAt: data.pause.at, recoveryUpdatedAt: data.pause.recovered?.[team.id === data.match.teamA.id ? 'A' : 'B']?.at || null })}>{teamName(team)}已恢复，可继续</RoomButton>)}
      {data.access.canResume && <RoomButton primary disabled={disabled} onClick={() => command('RESUME', {}, '双方已恢复，确认实际游戏已继续？')}>记录游戏已恢复</RoomButton>}</>}
    {data.canRecordMapResult && <><Text className='nr-title'>记录本图比分</Text><RoomField label={teamName(data.match.teamA) + '比分'} numeric value={scoreA} onChange={setScoreA} maxLength={3} />
      <RoomField label={teamName(data.match.teamB) + '比分'} numeric value={scoreB} onChange={setScoreB} maxLength={3} />
      {data.mapResultTakeoverReasonRequired && <RoomField label='赛管接管记录原因' value={note} onChange={setNote} />}
      <RoomButton primary disabled={disabled || !validScore || data.mapResultTakeoverReasonRequired && note.trim().length < 2}
        onClick={() => command('RECORD_MAP_RESULT', { scoreA: Number(scoreA), scoreB: Number(scoreB), ...(note.trim() ? { note: note.trim() } : {}) }, '本图比分为 ' + scoreA + ':' + scoreB + '，确认已核对游戏计分板？')}>提交本图比分</RoomButton></>}
    {resultAgreement?.valid && ['PENDING', 'DISPUTED'].includes(resultAgreement.status) && <><Text className='nr-title'>核对本图比分：{resultAgreement.payload?.scoreA}:{resultAgreement.payload?.scoreB}</Text>
      <Text className='nr-note'>待确认比分尚未计入大比分，确认后才开放下一图。</Text>
      {resultAgreement.canConfirm && <RoomButton primary disabled={disabled} onClick={() => agreement('CONFIRM_MAP_RESULT', resultAgreement)}>确认对方录入的本图比分</RoomButton>}
      {resultAgreement.canWithdraw && <RoomButton disabled={disabled} onClick={() => agreement('WITHDRAW_MAP_RESULT', resultAgreement)}>撤回待确认比分</RoomButton>}
      {resultAgreement.canDispute && <><RoomField label='本图比分核对说明' value={note} onChange={setNote} multiline />
        <RoomButton disabled={disabled || note.trim().length < 2} onClick={() => agreement('DISPUTE_MAP_RESULT', resultAgreement, { note: note.trim() })}>提交本图比分异议</RoomButton></>}</>}
    {(data.series?.complete || data.result) && <><Text className='nr-title'>整场赛果</Text><Text>{data.result?.phase === 'SETTLED' ? '本场已结算' : data.result?.official ? '已审核，等待双方核对' : '等待网页战报提交与审核'}</Text>
      <Text className='nr-note'>逐图记录保留；正式战报复核与结算沿用网页流程。</Text>
      <RoomButton onClick={openWeb}>复制网页比赛房入口</RoomButton>
      {(data.result?.sides || []).filter(side => side.canRespond).map(side => <View key={side.team.id}><Text>{teamName(side.team)} · 核对正式赛果</Text>
        <RoomButton primary disabled={disabled} onClick={() => send('result-response', { teamId: side.team.id, status: 'CONFIRMED', note: '', confirmationUpdatedAt: new Date(side.updatedAt).toISOString() }, '确认已核对全部正式地图与大比分？')}>确认整场正式赛果</RoomButton>
        <RoomField label='正式赛果异议说明' value={note} onChange={setNote} multiline maxLength={2000} />
        <RoomButton disabled={disabled || note.trim().length < 2} onClick={() => send('result-response', { teamId: side.team.id, status: 'DISPUTED', note: note.trim(), confirmationUpdatedAt: new Date(side.updatedAt).toISOString() })}>提交正式赛果异议</RoomButton>
      </View>)}</>}
    {data.blockers.map((text, index) => <Text className='nr-note' key={index}>{text}</Text>)}
  </View>
}

export function NativeRoomPreparation({ data, disabled, send }) {
  const brief = data.preparation.brief
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(brief?.roomName || ''), [code, setCode] = useState(brief?.roomCode || '')
  const [instructions, setInstructions] = useState(brief?.instructions || '')
  return <View className='nr-section'><Text className='nr-title'>游戏房间与准备</Text>
    <Text>{brief?.roomName || '房间名称待核对'}</Text>{brief?.roomCode && <Text className='nr-note'>设置码：{brief.roomCode}</Text>}
    {brief?.instructions && <Text className='nr-note'>{brief.instructions}</Text>}
    {(data.preparation.sides || []).map(side => <View key={side.team.id}><Text className='nr-note'>{teamName(side.team)} · {side.ready ? '已核对准备' : side.reason || '等待准备核对'}</Text>
      {side.canConfirm && <RoomButton disabled={disabled} onClick={() => send('readiness', { teamId: side.team.id, ready: !side.ready, expectedRevision: side.revision, fingerprint: side.fingerprint })}>{side.ready ? '撤回本队准备确认' : '本队已核对房间与名单'}</RoomButton>}</View>)}
    {data.access.staff && data.preparation.canPublishBrief && data.match.status === 'PENDING' && <RoomButton disabled={disabled} onClick={() => { setName(brief?.roomName || ''); setCode(brief?.roomCode || ''); setInstructions(brief?.instructions || ''); setEditing(!editing) }}>{editing ? '取消编辑' : '填写游戏房间'}</RoomButton>}
    {editing && <><RoomField label='游戏房间名称' value={name} onChange={setName} maxLength={120} /><RoomField label='比赛房设置码' value={code} onChange={setCode} maxLength={120} />
      <RoomField label='双方可见的准备说明' value={instructions} onChange={setInstructions} multiline maxLength={2000} />
      <RoomButton primary disabled={disabled || !name.trim()} onClick={async () => { if (await send('brief', { expectedRevision: brief?.revision || 0, matchRevision: data.match.revision, roomName: name.trim(), roomCode: code.trim(), instructions })) setEditing(false) }}>保存游戏房间</RoomButton></>}
  </View>
}
