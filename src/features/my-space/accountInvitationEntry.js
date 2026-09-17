import { readWeeklyInvitationLocation } from '../auth/weeklyInvitationModel.js'

// Resolve the invitation on this site; never navigate to a pasted external host.
export function resolvePastedInvitation(value, origin) {
  try {
    const url = new URL(String(value || '').trim(), origin)
    if (!['http:', 'https:'].includes(url.protocol) || url.pathname !== '/activate-weekly' || url.username || url.password) return ''
    const { token } = readWeeklyInvitationLocation(url)
    return token ? `/activate-weekly#${new URLSearchParams({ token })}` : ''
  } catch { return '' }
}
