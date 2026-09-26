import { useUiLocale } from '../../hooks/useUiLocale.js'
import { translateUiText } from '../../lib/uiText.js'
import { guideContextForRoom, roomGuideUrl } from './roomGuideModel.js'
import styles from './WeeklyRoomGuidePage.module.css'

// A separate tab leaves live-room and registration drafts in place.
export default function RoomGuideLink({ data, role, step, scenario, season, match, mode, label = '比赛房操作指南', className = '' }) {
  const locale = useUiLocale()
  const context = data ? guideContextForRoom(data) : {}
  for (const [key, value] of Object.entries({ role, step, scenario, season, match, mode })) if (value) context[key] = value
  return <a className={`${styles.guideLink} ${className}`} href={roomGuideUrl(context, locale)} target="_blank" rel="noopener noreferrer">{translateUiText(label, locale)} <span aria-hidden="true">↗</span></a>
}
