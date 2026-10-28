import { getStaffProfile } from '../../../../src/lib/staffProfiles.js'
import { prepareReviewDb, getReviewSeasonProfile } from '../../../../src/lib/reviewSeason.js'
import { buildTournamentStory, buildTeamStory, buildPlayerStory, buildStaffStory, buildPersonStory } from '../../../../src/lib/reviewStoryBuilders.js'
import { buildCinemaReviewScenes } from '../../../../src/lib/reviewCinema.js'
import { localizeReviewScenes } from '../../../../src/lib/reviewLocale.js'
import { decodeStaffKey } from '../../../../src/lib/reviewAssets.js'

export function buildPublicStory(raw, params) {
  const db = prepareReviewDb(raw)
  if (params.story === 'tournament') return buildTournamentStory(db)
  if (params.story === 'player') return buildPlayerStory(db, params.subject)
  if (params.story === 'team') return buildTeamStory(db, params.subject)
  if (params.story === 'person') return buildPersonStory(db, params.subject)
  if (params.story === 'staff-key' && ['admin', 'caster'].includes(params.role)) return buildStaffStory(db, params.role, params.subject)
  if (params.story === 'staff') {
    const staff = getStaffProfile(db, params.subject)
    if (staff?.team) return buildPersonStory(db, staff.identityKey)
    if (staff) return buildStaffStory(db, staff.role, staff.id.split(':').slice(2).join(':'))
  }
  return []
}
export function publicStoryScenes(raw, params, locale = 'zh-CN') {
  const profile = getReviewSeasonProfile(raw)
  return buildCinemaReviewScenes(localizeReviewScenes(buildPublicStory(raw, params), locale, profile), { locale, isRegular: profile.usesRegularTemplate, isPartner: profile.isPartner })
}
export function reviewRoute(path) {
  const match = String(path || '').match(/^\/review\/story\/(tournament|player|team|person|staff)(?:\/([^/?]+))?(?:\/([^/?]+))?/)
  if (!match) return null
  try {
    if (match[1] === 'staff') return { story: 'staff-key', role: match[2], subject: decodeStaffKey(match[3] || '') }
    return { story: match[1], ...(match[2] ? { subject: decodeURIComponent(match[2]) } : {}) }
  } catch (_) { return null }
}
export function storyText(value) {
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (Array.isArray(value)) return value.map(storyText).filter(Boolean).join(' · ')
  return ''
}
