import { useEffect, useState } from 'react'
import { formatMatchCountdown } from './matchCountdown.js'

// Ticks once a second while the start is ahead; stops once the start time is reached.
// 票 2.46: kind 'deadline' counts down to a closing time; onDone runs once it has passed (also when
// the countdown first appears already past), so the page can drop what has just closed.
export default function MatchCountdown({ startsAt, locale, className, kind = 'start', onDone }) {
  const [now, setNow] = useState(() => Date.now())
  const countdown = formatMatchCountdown(startsAt, now, locale, kind)
  const running = countdown && !countdown.done
  const done = Boolean(countdown?.done)
  useEffect(() => {
    if (!running) return undefined
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [running])
  useEffect(() => {
    if (done && onDone) onDone()
  }, [done, onDone])
  if (!countdown) return null
  return <span className={className} data-match-countdown={countdown.done ? 'due' : 'running'} role="timer" aria-live="off">{countdown.text}</span>
}
