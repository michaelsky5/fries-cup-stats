import { weeklyTeamName } from '../weekly-competition/weeklyMatchRoomModel.js'
import { normalizeLocale } from '../../lib/locales.js'

// 票 2.45: the one thing a signed-in participant should do right now, picked from the same data
// as the account badge. Order: a match of theirs today, this week's confirmation, entering a cycle,
// finishing a draft registration, then registering. Everything else stays in the task count.
const OPEN_ROOMS = new Set(['PENDING', 'SCHEDULED', 'READY', 'IN_PROGRESS'])
const CLOSED = new Set(['CANCELLED', 'CLOSED'])
const UTC8_DAY = ms => Math.floor((ms + 8 * 3600000) / 86400000)
const ROOM_GRACE_MS = 6 * 3600000

function todaysRoom(rooms, now) {
  return (rooms || [])
    .filter(room => room?.myTeams?.length && OPEN_ROOMS.has(room.status) && !CLOSED.has(room.week?.status) && !CLOSED.has(room.cycle?.status))
    .map(room => ({ room, at: Date.parse(room.scheduledAt) }))
    .filter(({ room, at }) => room.status === 'IN_PROGRESS' || (Number.isFinite(at) && UTC8_DAY(at) === UTC8_DAY(now) && at + ROOM_GRACE_MS > now))
    .sort((a, b) => Number(b.room.status === 'IN_PROGRESS') - Number(a.room.status === 'IN_PROGRESS') || a.at - b.at)[0]?.room || null
}

const openTask = (tasks, test) => (tasks || []).find(task => String(task?.status || '').toUpperCase() === 'OPEN' && test(task)) || null

export function pickAccountNextAction({ rooms = [], tasks = [], hasTeam = false, registration = null, now = Date.now() } = {}) {
  const room = todaysRoom(rooms, now)
  if (room) return { kind: 'room', to: `/me/matches/${encodeURIComponent(room.id)}/room`, at: room.scheduledAt || null,
    live: room.status === 'IN_PROGRESS', teams: [weeklyTeamName(room.teamA), weeklyTeamName(room.teamB)] }
  const confirm = openTask(tasks, task => task.taskType === 'WEEKLY_PREPARATION_PARTICIPATION')
  if (confirm?.actionUrl) return { kind: 'confirm', to: confirm.actionUrl, at: confirm.dueAt || null }
  const enroll = openTask(tasks, task => task.taskType === 'WEEKLY_CYCLE_ENROLLMENT')
  if (enroll?.actionUrl) return { kind: 'enroll', to: enroll.actionUrl, at: null }
  const submit = openTask(tasks, task => task.sourceType === 'TEAM_REGISTRATION_SUBMIT')
  if (submit?.actionUrl) return { kind: 'submit', to: submit.actionUrl, at: submit.dueAt || null }
  if (registration?.open && !hasTeam) return { kind: 'register', to: registration.path, at: registration.closesAt || null }
  return null
}

const COPY = {
  room: ['进入比赛房', 'Enter the match room', '경기실 입장', '進入比賽房'],
  live: ['比赛进行中', 'Live now', '경기 중', '比賽進行中'],
  confirm: ['本周确认', 'Confirm this week', '이번 주 참가 확인', '本週確認'],
  enroll: ['登记参赛赛段', 'Enter the cycle', '사이클 참가 등록', '登記參賽賽段'],
  submit: ['完成报名', 'Finish registration', '등록 완료하기', '完成報名'],
  register: ['去报名', 'Register', '등록하기', '去報名'],
  closes: ['{0} 截止', 'Closes {0}', '{0} 마감', '{0} 截止'],
  anytime: ['随时可以报名', 'Open any time', '언제든지 등록 가능', '隨時可以報名']
}
const LOCALES = ['zh-CN', 'en-US', 'ko-KR', 'zh-TW']
const say = (key, locale, value = '') => COPY[key][Math.max(0, LOCALES.indexOf(normalizeLocale(locale)))].replace('{0}', value)

function shortTime(value, locale, withDate) {
  const time = Date.parse(value)
  if (!Number.isFinite(time)) return ''
  return new Intl.DateTimeFormat(normalizeLocale(locale) === 'en-US' ? 'en-GB' : normalizeLocale(locale), {
    timeZone: 'Asia/Shanghai', hour12: false, hour: '2-digit', minute: '2-digit', ...(withDate ? { month: 'numeric', day: 'numeric' } : {})
  }).format(new Date(time))
}

// One label for the button and one plain line of detail; no counting down to the second.
export function describeAccountNextAction(action, locale = 'zh-CN') {
  if (!action) return null
  if (action.kind === 'room') {
    const pairing = action.teams.filter(Boolean).join(' vs ')
    return { ...action, label: say('room', locale), detail: [pairing, action.live ? say('live', locale) : shortTime(action.at, locale, false)].filter(Boolean).join(' · ') }
  }
  const closes = action.at ? say('closes', locale, shortTime(action.at, locale, true)) : action.kind === 'register' ? say('anytime', locale) : ''
  return { ...action, label: say(action.kind, locale), detail: closes }
}
