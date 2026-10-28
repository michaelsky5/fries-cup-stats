import { useEffect, useRef, useState } from 'react'
import Taro, { useDidShow, useDidHide } from '@tarojs/taro'
import { Button, Text, View } from '@tarojs/components'
import { nativeAccount, accountPreviewLabel } from '../../nativeAccountRuntime.js'
import { normalizeNativeRoom, nativeRoomClock, roomMutation, roomUrl, validNativeMatchId, roomStageDurations,
  roomPenaltySnapshot, observeRoomPenalties } from '../../nativeRoomModel.js'
import { NativeOpeningControls, NativeMatchControls, NativeRoomRosters, NativeRoomPreparation, RoomButton, RoomField, teamName } from '../../NativeRoomControls.jsx'
import { formatOwMapName, formatOwHeroName } from '../../../../../../src/lib/heroes.js'
import './index.css'

const messageOf = error => error?.code === 'STALE_REQUEST' ? '' : error?.message || '暂时无法同步，请重新读取。'
const tabs = [['operation', '当前操作'], ['rosters', '双方名单'], ['records', '规则与记录'], ['messages', '沟通']]
export default function NativeRoomPage() {
  const parameters = Taro.getCurrentInstance()?.router?.params || {}
  const season = /^[A-Za-z0-9_-]{1,40}$/.test(parameters.season || '') ? parameters.season : 'FCW26'
  const matchId = parameters.match || ''
  const [account, setAccount] = useState(nativeAccount.snapshot), [data, setData] = useState(null), [rooms, setRooms] = useState(null)
  const [error, setError] = useState(''), [notice, setNotice] = useState(''), [tab, setTab] = useState('operation')
  const [busy, setBusy] = useState(false), [loading, setLoading] = useState(false), [now, setNow] = useState(Date.now()), [message, setMessage] = useState('')
  const [readFailed, setReadFailed] = useState(false)
  const [penaltyTick, setPenaltyTick] = useState(0), [penaltyOpen, setPenaltyOpen] = useState(false)
  const visible = useRef(false), generation = useRef(0), lock = useRef(false), reader = useRef(false)
  const timer = useRef(null), penalties = useRef(null), warned = useRef(new Set()), loadRef = useRef(null)
  const penaltyQueue = useRef([]), penaltyDialog = useRef(false)
  useEffect(() => nativeAccount.subscribe(setAccount), [])
  useEffect(() => { const tick = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(tick) }, [])
  async function load() {
    if (!visible.current || nativeAccount.snapshot().status !== 'AUTHENTICATED' || reader.current || lock.current) return false
    const version = generation.current, actor = nativeAccount.snapshot().user?.id
    reader.current = true; setLoading(true)
    try {
      const startedAt = Date.now()
      if (matchId && !validNativeMatchId(matchId)) throw new Error('比赛房链接无效，请返回我的比赛。')
      const value = await nativeAccount.read(matchId ? '/weekly-live-rooms/' + matchId : '/rooms?seasonId=' + encodeURIComponent(season), { season, force: true })
      if (!visible.current || version !== generation.current || nativeAccount.snapshot().user?.id !== actor) return false
      if (matchId) setData(normalizeNativeRoom(value, matchId, startedAt, Date.now()))
      else { if (value.contract !== 'MINI_ROOMS_V1' || value.seasonId !== season || !Array.isArray(value.rooms)) throw new Error('比赛列表响应不完整，请重新读取。'); setRooms(value.rooms) }
      setError(''); setReadFailed(false); return true
    } catch (failure) {
      if (visible.current && version === generation.current && failure.code !== 'STALE_REQUEST') {
        setError(messageOf(failure)); setReadFailed(true)
        if ([401, 403, 404].includes(failure.status)) { setData(null); setRooms(null) }
      }
      return false
    } finally { reader.current = false; if (visible.current && version === generation.current) setLoading(false) }
  }
  loadRef.current = load
  useDidShow(() => {
    visible.current = true; generation.current++
    Taro.hideShareMenu({ menus: ['shareAppMessage', 'shareTimeline'] }).catch(() => {})
    nativeAccount.restore().then(() => loadRef.current()).catch(failure => { if (visible.current) setError(messageOf(failure)) })
    const poll = async () => { if (!visible.current) return; await loadRef.current(); if (visible.current) timer.current = setTimeout(poll, 5000) }
    timer.current = setTimeout(poll, 5000)
  })
  const stop = () => { visible.current = false; generation.current++; clearTimeout(timer.current); setData(null); setRooms(null); setMessage('') }
  useDidHide(stop)
  useEffect(() => () => { visible.current = false; generation.current++; clearTimeout(timer.current) }, [])
  useEffect(() => {
    if (account.status === 'AUTHENTICATED') { loadRef.current?.() }
    else { generation.current++; setData(null); setRooms(null); penalties.current = null; setMessage('') }
  }, [account.status, account.user?.id])
  const clock = data ? nativeRoomClock(data, now) : null
  const stale = readFailed || data && now - data.receivedAt > 15000
  const disabled = busy || loading || penaltyOpen || stale || !data?.nativeWritesEnabled || !data?.access.canWrite || data?.archived
  useEffect(() => {
    if (!data || stale || !visible.current || !data.phaseClock?.stage) return
    const threshold = clock.critical ? 5 : clock.urgent ? 10 : null
    if (!threshold) return
    const key = [data.match.id, data.phaseClock.stage.key, data.phaseClock.deadlineAt, threshold].join(':')
    if (!warned.current.has(key)) { warned.current.add(key); Taro.vibrateShort({ type: threshold === 5 ? 'medium' : 'light' }).catch(() => {}) }
  }, [data, clock?.urgent, clock?.critical, stale])
  useEffect(() => {
    if (!data || stale || !visible.current) return
    const observation = observeRoomPenalties(penalties.current, roomPenaltySnapshot(data)); penalties.current = observation
    if (observation.reset) penaltyQueue.current = []
    if (observation.added.length) { penaltyQueue.current.push(...observation.added); setPenaltyTick(value => value + 1) }
  }, [data, stale])
  useEffect(() => {
    if (!visible.current || stale || busy || penaltyDialog.current || !penaltyQueue.current.length) return
    const event = penaltyQueue.current.shift(); penaltyDialog.current = true; setPenaltyOpen(true)
    Taro.showModal({ title: '本队超时处理', content: event.outcome === 'RANDOM_MAP' ? '本图禁用权已取消，系统已随机选图。请按最新地图重新确认首发。'
      : event.kind === 'BAN' ? '本轮禁用已超时，系统已记录放弃本轮禁用权，不得补禁用。'
      : event.kind === 'MAP' ? event.outcome === 'WARNING' ? '本次为超时警告。已追加60秒；本次补时不再追加补交宽限。' : '本图禁用权已取消，已追加60秒；本次补时不再追加补交宽限。'
      : event.outcome === 'WARNING' ? '本次为超时警告，请尽快完成当前环节。' : '本图禁用权已取消，请尽快完成当前环节。首发仍须由队伍确认。',
    confirmText: '继续操作', cancelText: '规则与记录' }).then(result => { if (visible.current && result.cancel) setTab('records') }).catch(() => {})
      .finally(() => { penaltyDialog.current = false; setPenaltyOpen(false); if (visible.current) setPenaltyTick(value => value + 1) })
  }, [penaltyTick, stale, busy])
  async function send(operation, values, confirmation) {
    if (lock.current || !data || disabled || reader.current) return false
    const snapshot = data, version = generation.current, actor = account.user?.id
    lock.current = true; setBusy(true); setNotice('')
    try {
      if (confirmation && !(await Taro.showModal({ title: '核对后提交', content: confirmation, confirmText: '确认提交' })).confirm) return false
      if (!visible.current || version !== generation.current || nativeAccount.snapshot().user?.id !== actor) return false
      const result = await nativeAccount.roomWrite(matchId, operation, roomMutation(snapshot, operation, values))
      if (result?.mapExpired || result?.banExpired) { if (visible.current && version === generation.current) setNotice('操作时限已到，系统已按现有规则处理；正在同步最新记录。'); return false }
      if (visible.current && version === generation.current) setNotice('已保存，正在核对最新比赛状态。')
      return true
    } catch (failure) {
      if (visible.current && version === generation.current) { setReadFailed(true); setNotice(failure.outcomeUnknown ? '提交结果尚不确定，请先同步核对；系统不会自动重复提交。' : messageOf(failure)) }
      return false
    } finally {
      lock.current = false
      if (visible.current && version === generation.current) { setBusy(false); await loadRef.current() }
    }
  }
  const openAccount = () => Taro.redirectTo({ url: '/account/pages/index' + (matchId ? '?room=' + encodeURIComponent(matchId) + '&season=' + encodeURIComponent(season) : '') })
  const openWeb = () => Taro.setClipboardData({ data: matchId ? 'https://stats.fries-cup.com/me/matches/' + encodeURIComponent(matchId) + '/room?season=' + encodeURIComponent(season) : 'https://stats.fries-cup.com/me?season=' + encodeURIComponent(season) + '&section=matches' })
  const openMatch = id => Taro.navigateTo({ url: roomUrl(id, season) })
  const roomKey = data ? [data.match.id, data.actor.id, data.map?.order, data.map?.lineupContext, data.opening?.phase, data.opening?.nextSide, data.opening?.rounds[data.opening.rounds.length - 1]?.id].join(':') : ''
  return <View className='nr-page'>
    {accountPreviewLabel && <Text className='nr-notice'>{accountPreviewLabel}</Text>}
    <View className='nr-header'><Button className='nr-back' onClick={() => matchId ? Taro.redirectTo({ url: roomUrl('', season) }) : openAccount()}>← {matchId ? '我的比赛' : '我的账号'}</Button><Text>薯条杯 · 比赛房</Text></View>
    {account.status !== 'AUTHENTICATED' ? <View className='nr-section'><Text className='nr-title'>先关联已有赛事账号</Text><Text className='nr-note'>微信身份绑定后，继续使用原有队伍、报名和本场权限。</Text><RoomButton primary onClick={openAccount}>进入账号绑定</RoomButton></View> : <>
      {error && <View className='nr-notice'><Text>{error}</Text><RoomButton disabled={loading || busy} onClick={load}>重新同步</RoomButton></View>}
      {notice && <Text className='nr-notice'>{notice}</Text>}
      {!matchId ? <View className='nr-list'><Text className='nr-title'>我的比赛房</Text>{loading && rooms === null && <Text className='nr-note'>正在读取本场权限…</Text>}
        {rooms?.length === 0 && <Text className='nr-note'>当前赛事暂无可进入的比赛房。比赛公布后会出现在这里。</Text>}
        {rooms?.map(room => <View className='nr-section' key={room.id}><Text className='nr-title'>{teamName(room.teamA)} / {teamName(room.teamB)}</Text><Text className='nr-note'>{room.name}</Text><Text className='nr-note'>{room.roleLabel}{room.archived ? ' · 历史只读' : ''}</Text><RoomButton primary onClick={() => openMatch(room.id)}>进入比赛房</RoomButton></View>)}
        <RoomButton onClick={openWeb}>复制网页我的比赛入口</RoomButton></View> : data ? <>
        <View className={'nr-status ' + (clock.critical ? 'nr-critical' : clock.urgent ? 'nr-urgent' : '')}>
          <View className='nr-row'><View className='nr-grow'><Text className='nr-title'>{teamName(data.match.teamA)} / {teamName(data.match.teamB)}</Text><Text className='nr-note'>{data.match.matchCode || data.match.name} · {data.actor.label}</Text></View>
            {data.phaseClock?.enabled && <View className='nr-clock'><Text>{clock.text}</Text><Text className='nr-note'>{clock.inSubmissionGrace ? '补交宽限' : clock.label}</Text></View>}</View>
          <Text className='nr-note'>{data.map ? '第' + data.map.order + '图 · ' + (data.map.name ? formatOwMapName(data.map.name, 'zh-CN') : '待选图') : '赛前准备'}{data.series ? ' · 大比分 ' + data.series.scoreA + ':' + data.series.scoreB : ''}</Text>
          <Text className='nr-note'>{stale ? '同步中断，暂时停止提交' : loading ? '正在同步…' : '已与服务器同步'}{!data.nativeWritesEnabled ? ' · 当前为只读验收' : ''}</Text>
          {clock.urgent && !stale && <Text className='nr-alert'>{clock.inSubmissionGrace ? '补交宽限即将结束' : '当前环节即将到时，请及时确认'}</Text>}
        </View>
        <View className='nr-tabs'>{tabs.map(([value, label]) => <Button key={value} className={'nr-tab ' + (tab === value ? 'nr-tab-active' : '')} onClick={() => setTab(value)}>{label}</Button>)}</View>
        {tab === 'operation' && <><NativeOpeningControls key={roomKey} data={data} disabled={disabled || data.phaseClock?.enabled && ['MAP', 'BAN'].includes(data.phaseClock.stage?.kind) && data.phaseClock.status !== 'WAITING' && clock.seconds === 0} send={send} />
          <NativeMatchControls key={roomKey + ':match'} data={data} disabled={disabled} send={send} openWeb={openWeb} />
          <NativeRoomPreparation key={data.match.id} data={data} disabled={disabled} send={send} /></>}
        {tab === 'rosters' && <NativeRoomRosters data={data} disabled={disabled} send={send} />}
        {tab === 'records' && <View className='nr-section'><Text className='nr-title'>本场规则与记录{data.rulebook?.version ? ' · V' + data.rulebook.version : ''}</Text>
          <Text className='nr-note'>使用本场绑定版本。后续规则更新不会替换历史比赛引用。</Text>
          <Text className='nr-subtitle'>环节时长</Text>{roomStageDurations(data.phaseClock).map(item => <Text className='nr-note' key={item.kind}>{item.label} · {item.seconds}秒</Text>)}
          <Text className='nr-note'>正常地图选择和每轮禁用有一次15秒补交宽限。地图选择、首发与禁用顺序按本队整场累计流程超时：首次警告；第二次取消本图禁用权；第三次取消本图禁用权并随机选图。前两次选图处罚各补时60秒，不再追加宽限。英雄禁用到时放弃本轮禁用权，不得补禁用。具体处置以服务器记录为准。</Text>
          <Text className='nr-subtitle'>当前地图池</Text>{(data.opening?.rules.maps || []).map(map => <Text className='nr-note' key={map.name}>{formatOwMapName(map.name, 'zh-CN')}</Text>)}
          <Text className='nr-subtitle'>逐图记录</Text>{data.maps.map(map => <Text className='nr-note' key={map.order}>第{map.order}图 · {formatOwMapName(map.name, 'zh-CN')} · {map.scoreA ?? '—'}:{map.scoreB ?? '—'}{map.isAdministrative ? ' · 裁定地图' : ''}{map.banA ? ' · A禁' + formatOwHeroName(map.banA, 'zh-CN') : ''}{map.banB ? ' · B禁' + formatOwHeroName(map.banB, 'zh-CN') : ''}</Text>)}
          <RoomButton onClick={openWeb}>复制网页入口，查看完整记录与处理特殊情况</RoomButton></View>}
        {tab === 'messages' && <View className='nr-section'><Text className='nr-title'>本场沟通</Text>{data.messages.map(item => <View className='nr-message' key={item.id}><Text className='nr-note'>{item.authorName || item.author?.name} · {item.roleLabel}</Text><Text>{item.body}</Text></View>)}
          <RoomField label='向本场人员发送消息' value={message} onChange={setMessage} multiline maxLength={2000} />
          <RoomButton primary disabled={disabled || !message.trim()} onClick={async () => { if (await send('messages', { body: message.trim() })) setMessage('') }}>发送本场消息</RoomButton></View>}
        <View className='nr-footer'><RoomButton disabled={busy || loading} onClick={load}>重新同步比赛状态</RoomButton><Text className='nr-note'>改时间、弃权及正式申诉请在网页处理；断线后先同步核对，再决定是否重新提交。</Text><RoomButton onClick={openWeb}>复制网页比赛房入口</RoomButton></View>
      </> : loading ? <Text className='nr-note'>正在读取比赛房…</Text> : null}
    </>}
  </View>
}
