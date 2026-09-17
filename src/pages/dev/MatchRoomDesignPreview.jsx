import { useState } from 'react'
import { LineupPanel, MatchRoomSurface, LobbyPanel, MapPickPanel, BanPanel, GameReturnPanel, MapResultPanel, FinalResultPanel } from '../matches/MatchRoomPage.jsx'
import { MATCH_ROOM_STEPS, MATCH_ROOM_STEP_KEYS } from '../../features/match-room/matchRoomModel.js'

const names = ['Sky', 'Mint', 'Kite', 'Lemon', 'Nova']
const slots = [['C1', 'DPS'], ['C2', 'DPS'], ['T', 'TANK'], ['N1', 'SUPPORT'], ['N2', 'SUPPORT']]
const team = (side, short, full) => ({ side, short, full, participants: names.map((name, i) => ({ key: `${side}-${i}`, name: side === 'A' ? name : `${name} B`, battleTag: `${name}#100${i}`, identityType: 'PLAYER', role: slots[i][1], isOnline: true, isCheckedIn: true, isCaptain: i === 0 })), onlineCount: 5, checkedInCount: 5, captain: { name: side === 'A' ? 'Sky' : 'Sky B' } })
const model = { matchId: 'DESIGN-PREVIEW', teamA: team('A', 'BANANA', 'Team Banana'), teamB: team('B', 'IH', 'IHAN'), format: 'FT3', statusLabel: '赛前准备', scheduleLabel: '示例比赛 · 今天 19:30', flowSteps: MATCH_ROOM_STEPS, heroBanEnabled: true, targetWins: 3, maps: [], match: {}, access: { side: 'A', label: '本队队长' } }
model.teamA.players = model.teamA.participants
model.teamB.players = model.teamB.participants
const initialLineup = Object.fromEntries(['A', 'B'].map(side => [side, slots.map(([slot, role], i) => ({ slot, role, playerKey: `${side}-${i}` }))]))

// Development-only route. All callbacks here update local component state.
export default function MatchRoomDesignPreview() {
  const [lineup, setLineup] = useState(initialLineup)
  const [locked, setLocked] = useState(false)
  const [notice, setNotice] = useState('')
  const [checkedIn, setCheckedIn] = useState(false)
  const [activeStep, setActiveStep] = useState(MATCH_ROOM_STEP_KEYS.LINEUP_LOCK)
  const [mapDraft, setMapDraft] = useState({ type: 'CONTROL', name: '伊利奥斯', pickerSide: 'A', attackSide: '' })
  const [bans, setBans] = useState({ A: [], B: [] })
  const [banFirstSide, setBanFirstSide] = useState('A')
  const [mapScore, setMapScore] = useState({ A: '2', B: '1' })
  const [finalResult, setFinalResult] = useState({ scoreA: '3', scoreB: '1', replayCode: '', notes: '' })
  const [previewNow] = useState(() => Date.now())
  const permission = { canManageFlow: true, canManageAll: false, captainSides: ['A'] }
  const map = { mapOrder: 1, status: activeStep, lineupLocks: { A: locked, B: false }, lineupA: lineup.A, lineupB: lineup.B, mapName: mapDraft.name, mapType: mapDraft.type, pickerSide: mapDraft.pickerSide, heroBans: { firstSide: banFirstSide, ...bans } }
  const remoteRoom = { room: { currentMapOrder: 1, maps: [map], status: 'PREPARING' } }
  const actionState = { status: 'idle', message: notice, isLoading: false }
  const common = { model, remoteRoom, remoteMap: map, roomPermission: permission, locale: 'zh-CN', actionState }
  const sampleAction = () => setNotice('示例操作已完成；本预览不提交正式比赛数据。')
  const moveTo = step => { setNotice(''); setActiveStep(step) }
  let panel
  if (activeStep === MATCH_ROOM_STEP_KEYS.WAITING) panel = <LobbyPanel {...common} now={previewNow} staff={{ people: [], refereeCount: 0 }} onStartMapPick={() => moveTo(MATCH_ROOM_STEP_KEYS.MAP_PICK)} />
  else if (activeStep === MATCH_ROOM_STEP_KEYS.MAP_PICK) panel = <MapPickPanel {...common} mapDraft={mapDraft} setMapDraft={setMapDraft} onLockMap={() => moveTo(MATCH_ROOM_STEP_KEYS.LINEUP_LOCK)} />
  else if (activeStep === MATCH_ROOM_STEP_KEYS.HERO_BAN) panel = <BanPanel {...common} bans={bans} setBans={setBans} banFirstSide={banFirstSide} setBanFirstSide={setBanFirstSide} onSubmitBans={sampleAction} />
  else if (activeStep === MATCH_ROOM_STEP_KEYS.MAP_RESULT_CONFIRM) panel = <MapResultPanel {...common} mapScore={mapScore} setMapScore={setMapScore} confirmState={actionState} mapProgression={{ score: { A: 0, B: 0 }, isLocked: false, nextMapOrder: 2 }} onConfirmSide={sampleAction} onResolveResult={sampleAction} onAdvanceNextMap={() => moveTo(MATCH_ROOM_STEP_KEYS.MAP_PICK)} onAdvanceFinal={() => moveTo(MATCH_ROOM_STEP_KEYS.MATCH_FINISHED)} />
  else if (activeStep === MATCH_ROOM_STEP_KEYS.MATCH_FINISHED) panel = <FinalResultPanel {...common} finalResult={finalResult} setFinalResult={setFinalResult} submitState={actionState} onSubmitFinal={sampleAction} />
  else if (activeStep === MATCH_ROOM_STEP_KEYS.IN_GAME) panel = <GameReturnPanel {...common} onMoveToMapResultConfirm={() => moveTo(MATCH_ROOM_STEP_KEYS.MAP_RESULT_CONFIRM)} />
  else panel = <LineupPanel {...common} lineup={lineup} setLineup={setLineup} onLockLineup={() => { setLocked(true); setNotice('示例：本队首发已锁定，等待对方确认。') }} />
  return <MatchRoomSurface model={model} withSeason={() => '/dev/account-preview?embed=1&identity=MULTI&scenario=matchday&view=overview'} onBack={() => window.history.back()} syncState={{ status: 'connected', label: checkedIn ? '预览 · 已签到' : '示例比赛房', isLoading: false }} onCheckIn={() => setCheckedIn(true)} activeStep={activeStep} roomLifecycle={{ isReadOnly: false }} onSelect={moveTo} staff={{ people: [], refereeCount: 0 }} remoteRoom={remoteRoom} locale="zh-CN" lineup={lineup} roomPermission={permission}>
    {panel}
  </MatchRoomSurface>
}
