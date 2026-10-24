import { BROADCAST_REPLAY_ARCHIVE_URL, getBroadcastRecord } from './broadcastSelectors.js'
import { getMatchScheduleValue } from './scheduleFormat.js'

// How early before the scheduled start the live room is offered.
export const WATCH_LIVE_LEAD_MS = 60 * 60 * 1000

const PLAYED = new Set(['complete', 'ruling', 'review'])
const isWebUrl = value => { try { return ['http:', 'https:'].includes(new URL(value).protocol) } catch { return false } }

// The one watch action a match row or card offers, or null. Only matches with a live room get one:
// - live room: from an hour before the start until the match is played
// - recording: after the match is played; the match's own replay when System has one,
//   otherwise the 薯条杯 B站 space (per-match replay links are not maintained)
// Matches without a room (no broadcast, or only referees / casters assigned), cancelled or
// postponed matches get nothing; there is no season-wide fallback room.
export function getWatchLink(match, state, now = Date.now()) {
  if (!match) return null
  const { rooms, replayUrl } = getBroadcastRecord(match)
  const room = rooms.find(link => isWebUrl(link.url))
  if (PLAYED.has(state)) {
    if (replayUrl) return { kind: 'replay', url: replayUrl }
    return room ? { kind: 'replay', url: BROADCAST_REPLAY_ARCHIVE_URL } : null
  }
  if (!room || (state !== 'live' && state !== 'upcoming')) return null
  if (state === 'upcoming') {
    const start = Date.parse(getMatchScheduleValue(match) || '')
    if (!Number.isFinite(start) || start - now > WATCH_LIVE_LEAD_MS) return null
  }
  return { kind: 'live', url: room.url }
}
