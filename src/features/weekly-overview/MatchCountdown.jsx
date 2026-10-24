import { useEffect, useState } from 'react'
import { formatMatchCountdown } from './matchCountdown.js'

// Ticks once a second while the start is ahead; stops once the start time is reached.
export default function MatchCountdown({ startsAt, locale, className }) {
  const [now, setNow] = useState(() => Date.now())
  const countdown = formatMatchCountdown(startsAt, now, locale)
  const running = countdown && !countdown.done
  useEffect(() => {
    if (!running) return undefined
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [running])
  if (!countdown) return null
  return <span className={className} data-match-countdown={countdown.done ? 'due' : 'running'} role="timer" aria-live="off">{countdown.text}</span>
}
