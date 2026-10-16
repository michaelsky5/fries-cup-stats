import { useEffect, useState } from 'react'
import { getSeasonById } from '../../../config/seasons.js'
import { readPublicRoomProgress, startRoomProgressPolling } from './publicRoomProgress.js'

export default function usePublicRoomProgress(dossier, seasonId, isPreview, reader = readPublicRoomProgress) {
  const rawSeasonId = getSeasonById(seasonId)?.id || seasonId
  const matchId = dossier.match.raw_match_id || dossier.internalId
  const identity = `${rawSeasonId}:${matchId}`
  const enabled = dossier.state.isWeekly && !isPreview && (dossier.state.isUpcoming || dossier.state.isLive || dossier.state.isReview)
    && !dossier.state.isComplete && !dossier.state.isForfeit && !dossier.state.isRuling && !dossier.state.isCancelled && !dossier.state.isPostponed
  const [snapshot, setSnapshot] = useState(null)
  useEffect(() => {
    if (!enabled) return
    return startRoomProgressPolling({ read: options => reader(rawSeasonId, matchId, options), onChange: result => setSnapshot({ ...result, identity }) })
  }, [identity, rawSeasonId, matchId, enabled, reader])
  return enabled && snapshot?.identity === identity ? snapshot : { progress: null, status: enabled ? 'connecting' : 'disabled' }
}
