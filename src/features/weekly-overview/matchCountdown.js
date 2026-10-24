import { pickUiLocale } from '../../lib/uiText.js'

// Countdowns only run for the coming week; further out the date itself is the information.
export const COUNTDOWN_WINDOW_MS = 7 * 24 * 60 * 60 * 1000

const pad = value => String(value).padStart(2, '0')

// Text for a scheduled start seen at `now`, or null when no countdown should show.
// Past the start the published data may lag behind the stream, so it says the time
// has come rather than claiming the match is live.
export function formatMatchCountdown(startsAt, now, locale = 'zh-CN') {
  const start = typeof startsAt === 'number' ? startsAt : Date.parse(startsAt || '')
  if (!Number.isFinite(start) || !Number.isFinite(now)) return null
  const remaining = start - now
  if (remaining > COUNTDOWN_WINDOW_MS) return null
  if (remaining <= 0) return { done: true, text: pickUiLocale(locale, '已到开赛时间', 'Start time reached', '시작 시간 도달', '已到開賽時間') }
  const seconds = Math.floor(remaining / 1000)
  const days = Math.floor(seconds / 86400)
  const clock = `${pad(Math.floor(seconds % 86400 / 3600))}:${pad(Math.floor(seconds % 3600 / 60))}:${pad(seconds % 60)}`
  const span = days > 0
    ? pickUiLocale(locale, `${days} 天 ${clock}`, `${days}d ${clock}`, `${days}일 ${clock}`, `${days} 天 ${clock}`)
    : clock
  return { done: false, text: pickUiLocale(locale, `距开赛 ${span}`, `Starts in ${span}`, `시작까지 ${span}`, `距開賽 ${span}`) }
}
