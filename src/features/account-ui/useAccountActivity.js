import { accountRequestError } from '../auth/accountRequestError.js'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { fetchTaskCenter, completeManualTask } from '../tasks/taskNotificationApi.js'
import { fetchMyWeeklyMatchRooms } from '../weekly-competition/weeklyMatchRoomsApi.js'
import { fetchMyWeeklyCompetition, fetchMyOwnershipTransfers } from '../weekly-competition/weeklyCompetitionApi.js'
import { buildAccountActivity, isAccountActivitySource } from './accountActivityModel.js'
import { isManualTaskCompletion } from '../tasks/taskNotificationModel.js'

const SOURCE_LABELS = { tasks: '赛事待办', preparation: '参赛准备', rooms: '比赛与赛果', ownership: '队伍所有权转让' }

export default function useAccountActivity({ seasonId, userId, identityType, enabled = true, genericTasks = false, weeklyPreparation = false, weeklyRooms = false, ownershipTransfers = false, preparationReadOnly = true, roomsReadOnly = true, view }) {
  genericTasks = enabled && genericTasks
  weeklyPreparation = enabled && weeklyPreparation
  weeklyRooms = enabled && weeklyRooms
  ownershipTransfers = enabled && ownershipTransfers
  const [snapshot, setSnapshot] = useState(null)
  const [attempt, setAttempt] = useState(0)
  const [now, setNow] = useState(Date.now)
  const [workingId, setWorkingId] = useState('')
  const [actionError, setActionError] = useState('')
  const writeLock = useRef(false)
  const mounted = useRef(false)
  const identityScope = `${seasonId}:${userId}:${genericTasks}:${weeklyPreparation}:${weeklyRooms}:${ownershipTransfers}:${view}`
  const scope = `${identityScope}:${attempt}`
  const refresh = useCallback(() => {
    setActionError(''); setAttempt(value => value + 1)
    globalThis.dispatchEvent(new Event('fc:account-activity-changed'))
  }, [])
  useEffect(() => {
    mounted.current = true
    const timer = setInterval(() => setNow(Date.now()), 30_000)
    return () => { mounted.current = false; clearInterval(timer) }
  }, [])
  useEffect(() => {
    const syncOnReturn = () => { if (document.visibilityState === 'visible' && !writeLock.current) refresh() }
    window.addEventListener('focus', syncOnReturn)
    return () => window.removeEventListener('focus', syncOnReturn)
  }, [refresh])
  useEffect(() => {
    const controller = new AbortController()
    const sources = {}
    const requests = []
    if (genericTasks) requests.push(['tasks', options => fetchTaskCenter(seasonId, options)])
    if (weeklyPreparation) requests.push(['preparation', options => fetchMyWeeklyCompetition(seasonId, options)])
    if (weeklyRooms) requests.push(['rooms', options => fetchMyWeeklyMatchRooms(seasonId, options)])
    if (ownershipTransfers) requests.push(['ownership', options => fetchMyOwnershipTransfers(seasonId, options)])
    for (const [key] of requests) sources[key] = { status: 'loading' }
    setSnapshot(current => ({ scope, identityScope, sources: Object.fromEntries(Object.entries(sources).map(([key, source]) => [key, { ...source, ...(current?.identityScope === identityScope ? { data: current.sources[key]?.data, updatedAt: current.sources[key]?.updatedAt } : {}) }])) }))
    for (const [key, fetcher] of requests) {
      const requestController = new AbortController()
      const cancel = () => requestController.abort()
      controller.signal.addEventListener('abort', cancel, { once: true })
      const timeout = setTimeout(() => requestController.abort(new DOMException('同步超时', 'TimeoutError')), 15_000)
      fetcher({ signal: requestController.signal }).then(data => {
        if (!isAccountActivitySource(key, data, { seasonId, userId })) throw new Error('返回的账号资料不完整或与当前赛季不一致。')
        if (!controller.signal.aborted) setSnapshot(current => current?.scope === scope
          ? { ...current, sources: { ...current.sources, [key]: { status: 'ready', data, updatedAt: Date.now() } } } : current)
      }).catch(error => {
        if (!controller.signal.aborted) setSnapshot(current => current?.scope === scope
          ? { ...current, sources: { ...current.sources, [key]: { ...current.sources[key], status: 'error', message: accountRequestError(requestController.signal.reason?.name === 'TimeoutError' ? requestController.signal.reason : error, SOURCE_LABELS[key]) } } } : current)
      }).finally(() => {
        clearTimeout(timeout)
        controller.signal.removeEventListener('abort', cancel)
      })
    }
    return () => controller.abort()
  }, [genericTasks, identityScope, scope, seasonId, userId, weeklyPreparation, weeklyRooms, ownershipTransfers])
  const sources = useMemo(() => snapshot?.scope === scope ? snapshot.sources : Object.fromEntries([
    genericTasks && ['tasks', { status: 'loading' }], weeklyPreparation && ['preparation', { status: 'loading' }], weeklyRooms && ['rooms', { status: 'loading' }], ownershipTransfers && ['ownership', { status: 'loading' }]
  ].filter(Boolean)), [genericTasks, scope, snapshot, weeklyPreparation, weeklyRooms, ownershipTransfers])
  const { preparation, taskView, status } = useMemo(() => buildAccountActivity(sources,
    { seasonId, userId, identityType, preparationReadOnly, roomsReadOnly, now }), [sources, seasonId, userId, identityType, preparationReadOnly, roomsReadOnly, now])
  const records = Object.values(sources)
  const completeTask = async task => {
    if (writeLock.current || task.requiresSourceResolution !== false || sources.tasks?.status !== 'ready'
      || !sources.tasks.data.tasks.some(item => item.id === task.id && item.status === 'OPEN' && item.requiresSourceResolution === false)) return
    writeLock.current = true
    setWorkingId(task.id)
    setActionError('')
    try {
      const updated = await completeManualTask(task.id)
      if (!isManualTaskCompletion(task, updated)) throw new Error('任务结果未确认。')
      if (mounted.current) refresh()
    } catch {
      if (mounted.current) { setActionError('暂时无法确认提交结果，请先刷新任务，再核对处理状态。'); setAttempt(value => value + 1) }
    } finally {
      writeLock.current = false
      if (mounted.current) setWorkingId('')
    }
  }
  return { status, taskView, preparation, sources, refresh, completeTask, workingId, actionError, now,
    message: records.filter(source => source.status === 'error').map(source => source.message).join(' '),
    sourceLabels: SOURCE_LABELS }
}
