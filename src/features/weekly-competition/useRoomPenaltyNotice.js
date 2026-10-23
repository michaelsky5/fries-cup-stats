import { useEffect, useRef, useState } from 'react'
import { observeRoomPenalties, roomPenaltySnapshot } from './roomPenaltyNotice.js'

export default function useRoomPenaltyNotice(data, { stale, blocked, panel, setPanel }) {
  const tracked = useRef({ observation: null, queue: [], active: null, panel: '' })
  const [notice, setNotice] = useState(null)
  const scope = roomPenaltySnapshot(data)?.scope
  useEffect(() => {
    const current = tracked.current
    if (!stale || current.observation?.scope !== scope) {
      const observation = observeRoomPenalties(current.observation, roomPenaltySnapshot(data))
      current.observation = observation
      if (observation.reset) { current.queue = []; current.active = null; setNotice(null) }
      current.queue.push(...observation.added)
    }
    if (current.active && current.panel === 'timeout' && panel !== 'timeout') {
      current.active = null; setNotice(null)
    }
    current.panel = panel
    if (!stale && !blocked && !panel && !current.active && current.queue.length && !document.querySelector('dialog[open]')) {
      current.active = { ...current.queue.shift(), scope: current.observation.scope }
      setNotice(current.active)
      setPanel('timeout')
    } else if (panel === 'timeout' && !current.active) {
      // Clear an already dismissed Forward entry in place. Going Back from an
      // effect can run more than once before navigation completes and leave the room.
      setPanel('', { replace: true })
    }
  }, [data, scope, stale, blocked, panel, setPanel])
  return notice?.scope === scope ? notice : null
}
