import { useEffect, useRef, useState } from 'react'
import Taro, { useDidShow } from '@tarojs/taro'
import { View, Text, Picker } from '@tarojs/components'
import Button from './NativeAccountButton.jsx'
import { nativeAccount } from './nativeAccountRuntime.js'
import { storedSeasonId, openCenter } from '../platform.js'
import { SEASONS, getSeasonName } from '../shared/publicSeasons.js'

export default function NativeParticipation() {
  const [seasonId, setSeasonId] = useState(storedSeasonId), [data, setData] = useState(null)
  const [loading, setLoading] = useState(false), [error, setError] = useState('')
  const generation = useRef(0), active = useRef(false)
  const selected = SEASONS.findIndex(item => item.id === seasonId)
  async function load(id) {
    const version = ++generation.current
    setData(null)
    setLoading(true)
    setError('')
    try {
      const value = await nativeAccount.read('/participation?seasonId=' + encodeURIComponent(id), { season: id, force: true })
      if (value.contract !== 'MINI_PARTICIPATION_V1' || value.season?.id !== id || !Array.isArray(value.teams) || !Array.isArray(value.tasks)) throw new Error('参赛记录响应不完整，请重新读取。')
      if (active.current && version === generation.current) setData(value)
    } catch (failure) {
      if (active.current && version === generation.current && failure.code !== 'STALE_REQUEST') setError(failure.message || '参赛记录暂时无法读取。')
    } finally { if (active.current && version === generation.current) setLoading(false) }
  }
  useEffect(() => { active.current = true; load(seasonId); return () => { active.current = false; generation.current++ } }, [seasonId])
  useDidShow(() => { if (active.current) load(seasonId) })
  const copyTasksLink = () => Taro.setClipboardData({ data: 'https://stats.fries-cup.com/me?season=' + encodeURIComponent(seasonId) + '&section=tasks' })
  return <View className='native-participation'>
    <View className='native-participation-heading'><Text>我的参赛记录</Text><Picker range={SEASONS.map(item => getSeasonName(item, 'zh-CN'))} value={Math.max(0, selected)} onChange={event => setSeasonId(SEASONS[Number(event.detail.value)].id)}><View className='native-participation-picker'>{getSeasonName(SEASONS[selected], 'zh-CN')} ↓</View></Picker></View>
    {loading ? <Text className='native-account-detail'>正在读取当前账号的参赛记录…</Text> : error ? <View className='native-account-notice'><Text>{error}</Text><Button className='native-account-secondary' onClick={() => load(seasonId)}>重新读取</Button></View> : data ? <>
      <Text className='native-account-label'>我的队伍 · {data.teams.length}</Text>
      {data.teams.length ? data.teams.map(item => <View className='native-participation-team' key={item.team.id}>
        <Text className='native-participation-name'>{item.team.name}</Text><Text className='native-account-detail'>{item.roleLabels.join(' · ')}</Text>
        {item.nextMatch ? <Text className='native-account-detail'>下一场：{item.nextMatch.teamA?.name} / {item.nextMatch.teamB?.name}</Text> : null}
        <Button className='native-account-secondary' onClick={() => openCenter({ season: seasonId, view: 'roster', team: item.team.id })}>查看队伍公开资料</Button>
      </View>) : <Text className='native-account-detail'>当前赛事暂无已关联的队伍。</Text>}
      <View className='native-participation-tasks'><Text className='native-account-label'>待办 · {data.openTaskCount}</Text>
        {data.tasks.length ? <>{data.tasks.map(task => <View className='native-participation-task' key={task.id}><Text>{task.title}</Text><Text className='native-account-detail'>在 Stats 网页中处理</Text></View>)}<Button className='native-account-secondary' onClick={copyTasksLink}>复制网页待办入口</Button></>
          : <Text className='native-account-detail'>当前账号暂无待处理事项。</Text>}
      </View>
      <Button className='native-account-secondary' onClick={() => load(seasonId)}>刷新参赛记录</Button>
    </> : null}
  </View>
}
