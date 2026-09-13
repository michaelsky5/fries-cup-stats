import { useEffect, useMemo, useState } from 'react'
import { buildFollowingFeed } from './followingFeedModel.js'

export default function useFollowingFeed(db, favorites, season, locale, cycleId) {
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(timer)
  }, [])
  return useMemo(() => buildFollowingFeed(db, favorites, { season, locale, now, cycleId }), [db, favorites, season, locale, now, cycleId])
}
