import { useCallback, useEffect, useRef, useState } from 'react'
import Taro, { useDidShow } from '@tarojs/taro'
import { Button, Checkbox, CheckboxGroup, Label, Picker, Text, Textarea, View } from '@tarojs/components'
import { nativeAccount, accountPreviewLabel } from './nativeAccountRuntime.js'
import { storedSeasonId } from '../platform.js'
import { SEASONS, getSeasonName } from '../shared/publicSeasons.js'
import { weeklyConfirmationWindow } from '../../../../src/features/weekly-competition/weeklyPreparationModel.js'
import { getWeeklyRosterCheck, getWeeklyRosterContext } from '../../../../src/features/account-ui/participationJourneyModel.js'

const statusLabel = value => ({ PENDING: '尚未确认', CONFIRMED: '已确认参赛', DECLINED: '本周不参加', WITHDRAWN: '已退出本周', DRAFT: '名单草稿', SUBMITTED: '名单已提交', LOCKED: '名单已锁定' }[value] || value)
const scopeOf = value => value?.user ? value.user.id + ':' + value.user.effectiveMode : ''
const recordsOf = workspace => (workspace?.cycles || []).flatMap(cycle => (cycle.entries || []).flatMap(entry => (entry.weeks || []).map(record => ({
  key: entry.id + ':' + record.week.id, cycle, entry, record,
  label: (entry.team?.shortName || entry.team?.name || '') + ' / ' + cycle.name + ' / ' + record.week.label
})))).sort((a, b) => Number(weeklyConfirmationWindow(b.record.week) === 'open') - Number(weeklyConfirmationWindow(a.record.week) === 'open'))

function WeeklyForm({ item, capabilities, disabled, mutate, onDirty }) {
  const { entry, cycle, record } = item, participation = record.participation
  const roster = (participation.rosters || []).find(value => value.status !== 'SUPERSEDED') || null
  const [ids, setIds] = useState(() => (roster?.members || []).map(value => value.playerId))
  const [availability, setAvailability] = useState(() => participation.availability || { status: 'UNSET', slotIds: [], timeZone: 'Asia/Shanghai' })
  const [note, setNote] = useState(participation.availabilityNote || '')
  const { checkRules, rules } = getWeeklyRosterContext(cycle, record)
  const core = (entry.coreSelections || []).find(value => value.status === 'LOCKED')
  const check = getWeeklyRosterCheck(ids, new Set((core?.members || []).map(value => value.playerId)), checkRules, entry.players || [])
  const savedIds = (roster?.members || []).map(value => value.playerId)
  const rosterDirty = [...ids].sort().join('|') !== [...savedIds].sort().join('|')
  const dirty = rosterDirty
    || JSON.stringify(availability) !== JSON.stringify(participation.availability || { status: 'UNSET', slotIds: [], timeZone: 'Asia/Shanghai' })
    || note !== (participation.availabilityNote || '')
  useEffect(() => { onDirty(dirty); return () => onDirty(false) }, [dirty, onDirty])
  const open = weeklyConfirmationWindow(record.week) === 'open'
  const writable = !disabled && open && entry.accessMode === 'WRITE'
  const canRespond = writable && capabilities.weeklyConfirmation
  const canRoster = writable && capabilities.lineup && participation.status === 'CONFIRMED' && roster?.status !== 'LOCKED'
  const slots = record.week.availabilitySlots || []
  const selectedSlots = availability.status === 'ALL' ? slots.map(value => value.id) : availability.slotIds
  const response = async status => {
    if (['DECLINED', 'WITHDRAWN'].includes(status)) {
      const confirmation = await Taro.showModal({ title: status === 'WITHDRAWN' ? '退出本周参赛' : '本周不参加', content: '请确认已与队伍成员沟通。本次操作会更新本周参赛状态。', confirmText: '确认更新' })
      if (!confirmation.confirm) return
    }
    return mutate('/weekly/weeks/' + record.week.id + '/participation', {
      entryId: entry.id, status, revision: participation.revision, availability, availabilityNote: note.trim() || null
    })
  }
  const saveRoster = status => mutate('/weekly/participations/' + participation.id + '/roster', {
    revision: roster?.revision || 0, status,
    members: ids.map(playerId => {
      const previous = roster?.members.find(value => value.playerId === playerId)
      return { playerId, plannedStarter: previous?.plannedStarter || false, note: previous?.note || null }
    }),
    availabilityUpdate: { revision: participation.revision, availability, availabilityNote: note.trim() || null }
  })
  return <View>
    <View className='native-weekly-summary'><Text className='native-account-label'>{entry.team?.name}</Text><Text className='native-account-detail'>{cycle.name} · {record.week.label} · {statusLabel(participation.status)}</Text>
      <Text className='native-account-detail'>{record.week.confirmationDeadlineAt ? '确认截止：' + new Date(record.week.confirmationDeadlineAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) + '（北京时间）' : '本周未设置确认截止时间。'}</Text>
      {!open ? <Text className='native-account-detail'>当前确认窗口未开放，此处仅可查看。</Text> : null}
      {entry.accessMode !== 'WRITE' ? <Text className='native-account-detail'>当前身份可查看名单；参赛确认由队长或经理处理。</Text> : null}
      {!capabilities.weeklyConfirmation || !capabilities.lineup ? <Text className='native-account-detail'>小程序提交内测尚未开启，可先在 Stats 网页中处理。</Text> : null}
    </View>
    <View className='native-weekly-block'><Text className='native-account-label'>01 / 本周可比赛时间</Text><Text className='native-account-detail'>北京时间 UTC+8。用于排期参考；未选择不会视为全部可赛。</Text>
      <View className='native-weekly-actions'>{[['ALL', '以上时段均可'], ['NONE', '以上时段均不可'], ['UNSET', '尚未确定']].map(([value, label]) => <Button key={value} className='native-account-secondary' disabled={!canRespond && !canRoster} onClick={() => setAvailability({ status: value, slotIds: value === 'ALL' ? slots.map(slot => slot.id) : [], timeZone: 'Asia/Shanghai' })}>{availability.status === value ? '已选 · ' : ''}{label}</Button>)}</View>
      <CheckboxGroup onChange={event => setAvailability({ status: event.detail.value.length ? event.detail.value.length === slots.length ? 'ALL' : 'SELECTED' : 'NONE', slotIds: event.detail.value, timeZone: 'Asia/Shanghai' })}>
        {slots.map(slot => <Label className='native-weekly-choice' key={slot.id}><View className='native-weekly-choice-row'><Checkbox color='#a58416' value={slot.id} checked={selectedSlots.includes(slot.id)} disabled={!canRespond && !canRoster}/><Text>{slot.label}</Text></View></Label>)}
      </CheckboxGroup>
      <Textarea className='native-weekly-note' value={note} maxlength={1000} placeholder='补充可赛时间说明（选填）' disabled={!canRespond && !canRoster} onInput={event => setNote(event.detail.value)} aria-label='可赛时间说明'/>
      {rosterDirty ? <Text className='native-account-detail'>名单有未保存的调整，请先保存草稿或刷新，再更新参赛状态。</Text> : null}
      <View className='native-weekly-actions'><Button className='native-account-primary' disabled={!canRespond || rosterDirty} onClick={() => response('CONFIRMED')}>{participation.status === 'CONFIRMED' ? '更新可赛时间' : '确认本周参赛'}</Button><Button className='native-account-secondary' disabled={!canRespond || rosterDirty} onClick={() => response(participation.status === 'CONFIRMED' ? 'WITHDRAWN' : 'DECLINED')}>{participation.status === 'CONFIRMED' ? '退出本周' : '本周不参加'}</Button></View>
    </View>
    <View className='native-weekly-block'><Text className='native-account-label'>02 / 本周名单</Text><Text className='native-account-detail'>{roster ? statusLabel(roster.status) : '尚未保存名单'} · 已选 {ids.length} 人 · 本周要求 {rules.rosterMin}–{rules.rosterMax} 人</Text>
      <CheckboxGroup onChange={event => setIds(event.detail.value)}>{(entry.players || []).map(player => <Label className='native-weekly-choice' key={player.id}><View className='native-weekly-choice-row'><Checkbox color='#a58416' value={player.id} checked={ids.includes(player.id)} disabled={!canRoster}/><View className='native-weekly-choice-copy'><Text className='native-weekly-player'>{player.displayName || player.battleTag}</Text><Text className='native-account-detail'>{player.battleTag}</Text></View></View></Label>)}</CheckboxGroup>
      {check.errors.map(message => <Text className='native-account-detail' key={message}>{message}</Text>)}
      <Text className='native-account-detail'>{dirty ? '有尚未提交的编辑。' : '当前显示已同步记录。'}</Text>
      <View className='native-weekly-actions'><Button className='native-account-secondary' disabled={!canRoster || !dirty} onClick={() => saveRoster('DRAFT')}>保存草稿与可赛时间</Button><Button className='native-account-primary' disabled={!canRoster || !check.canSubmit} onClick={() => saveRoster('SUBMITTED')}>提交名单与可赛时间</Button></View>
    </View>
  </View>
}

export default function NativeWeeklyPanel({ onBack }) {
  const [account, setAccount] = useState(nativeAccount.snapshot), [seasonId, setSeasonId] = useState(storedSeasonId)
  const [payload, setPayload] = useState(null), [capabilities, setCapabilities] = useState({})
  const [selected, setSelected] = useState(''), [notice, setNotice] = useState(''), [loading, setLoading] = useState(false), [busy, setBusy] = useState(false)
  const [uncertain, setUncertain] = useState(false), [dirty, setDirty] = useState(false)
  const version = useRef(0), alive = useRef(true), lock = useRef(false), scope = scopeOf(account)
  useEffect(() => nativeAccount.subscribe(setAccount), [])
  useEffect(() => { alive.current = true; return () => { alive.current = false; version.current++ } }, [])
  const load = useCallback(async () => {
    const current = ++version.current, expected = scopeOf(nativeAccount.snapshot())
    if (!expected) return
    setLoading(true)
    setNotice('')
    try {
      const caps = await nativeAccount.capabilities()
      const value = await nativeAccount.read('/weekly/workspace?seasonId=' + encodeURIComponent(seasonId), { season: seasonId, force: true })
      if (value.userId !== nativeAccount.snapshot().user?.id || value.season?.id !== seasonId || !Array.isArray(value.cycles)) throw new Error('参赛资料响应不完整，请重新读取。')
      if (!alive.current || current !== version.current || expected !== scopeOf(nativeAccount.snapshot())) return
      setCapabilities(caps.capabilities || {})
      setPayload({ value, scope: expected, generation: current })
      setUncertain(false)
      setDirty(false)
      return true
    } catch (error) { if (alive.current && current === version.current && error.code !== 'STALE_REQUEST') { setNotice(error.message); setUncertain(true) } }
    finally { if (alive.current && current === version.current) setLoading(false) }
  }, [seasonId])
  useEffect(() => { setPayload(null); load() }, [load, scope])
  useDidShow(() => { if (alive.current) load() })
  async function discard() { return !dirty || (await Taro.showModal({ title: '编辑尚未提交', content: '继续后将放弃本页尚未提交的编辑。', confirmText: '放弃编辑' })).confirm }
  const mutate = async (path, body) => {
    if (lock.current || uncertain) return
    lock.current = true
    setBusy(true)
    setNotice('')
    try { await nativeAccount.write(path, body); const refreshed = await load(); if (alive.current && refreshed) setNotice('操作已提交，请核对最新参赛状态。') }
    catch (error) { if (alive.current && error.code !== 'STALE_REQUEST') { setNotice(error.message + ' 请刷新状态核对后再操作。'); setUncertain(true) } }
    finally { lock.current = false; if (alive.current) setBusy(false) }
  }
  const workspace = payload?.scope === scope ? payload.value : null
  const records = recordsOf(workspace), item = records.find(value => value.key === selected) || records[0]
  const selectionIndex = Math.max(0, records.indexOf(item)), seasonIndex = Math.max(0, SEASONS.findIndex(value => value.id === seasonId))
  return <View className='native-account'>
    {accountPreviewLabel ? <View className='native-account-notice'><Text>{accountPreviewLabel}</Text></View> : null}
    <View className='native-account-top'><Button className='native-account-back' disabled={busy} onClick={async () => { if (await discard()) onBack() }}>返回我的账号</Button><Text className='native-account-wordmark'>WEEKLY / PREPARATION</Text></View>
    <View className='native-account-title'><Text className='native-account-heading'>本周参赛准备</Text></View>
    <Picker range={SEASONS.map(value => getSeasonName(value, 'zh-CN'))} value={seasonIndex} disabled={busy} onChange={async event => { if (await discard()) setSeasonId(SEASONS[Number(event.detail.value)].id) }}><View className='native-participation-picker'>{getSeasonName(SEASONS[seasonIndex], 'zh-CN')} ↓</View></Picker>
    {notice ? <View className='native-account-notice' role='status'><Text>{notice}</Text></View> : null}
    <Button className='native-account-secondary' disabled={busy || loading} onClick={async () => { if (await discard()) load() }}>{loading ? '正在读取…' : '刷新状态'}</Button>
    {account.status !== 'AUTHENTICATED' ? <Text className='native-account-detail'>登录已失效，请返回我的账号重新微信登录。</Text> : workspace && records.length ? <>
      <Picker range={records.map(value => value.label)} value={selectionIndex} disabled={busy} onChange={async event => { if (await discard()) setSelected(records[Number(event.detail.value)].key) }}><View className='native-weekly-selection'>{item.label} ↓</View></Picker>
      <WeeklyForm key={item.key + ':' + payload.generation} item={item} capabilities={capabilities} disabled={busy || loading || uncertain || workspace.accessMode !== 'WRITE'} mutate={mutate} onDirty={setDirty}/>
    </> : !loading ? <Text className='native-account-detail'>{workspace ? '当前账号暂无可查看的周赛队伍与周次。' : '资料尚未同步，请重新读取。'}</Text> : null}
  </View>
}
