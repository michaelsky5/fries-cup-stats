import { useEffect, useState } from 'react'
import { readPublishedNewspaper, readNewspaperArchive } from './weeklyNewspaperApi.js'

export default function usePublishedNewspaper({ seasonId, cycleId, weekId, locale }, archive = false) {
  const key = JSON.stringify([seasonId, cycleId, weekId, locale, archive])
  const [state, setState] = useState({ key: '', loading: true, issue: null, issues: [], error: null })
  useEffect(() => {
    if (!seasonId || !cycleId || (!archive && !weekId)) return undefined
    const controller = new AbortController()
    const read = archive ? readNewspaperArchive : readPublishedNewspaper
    read({ seasonId, cycleId, weekId, locale }, { signal: controller.signal })
      .then(result => {
        if (!controller.signal.aborted) setState({ key, loading: false, issue: result.issue || null, issues: result.issues || [], error: null })
      })
      .catch(error => {
        if (!controller.signal.aborted) setState({ key, loading: false, issue: null, issues: [], error: error.status === 404 ? null : error })
      })
    return () => controller.abort()
  }, [seasonId, cycleId, weekId, locale, archive, key])
  const enabled = Boolean(seasonId && cycleId && (archive || weekId))
  return state.key === key ? state : { loading: enabled, issue: null, issues: [], error: null }
}
