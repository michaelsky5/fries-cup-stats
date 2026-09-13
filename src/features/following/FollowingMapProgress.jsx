import { translateUiText as uiText } from '../../lib/uiText.js'
import FollowingLink from './FollowingLink.jsx'
import { followingMatchPath } from './followingMatchPresentation.js'
import styles from './FollowingMapProgress.module.css'

export default function FollowingMapProgress({ item, locale, withSeason, compact = false }) {
  const presentation = item.presentation
  if (!presentation?.rr5 || !presentation.slots.length) return null
  const en = locale === 'en-US'
  const slots = presentation.slots
  const recorded = slots.filter(slot => slot.record).length
  return <div className={styles.progress} data-compact={compact} aria-label={en ? 'Five-map progress' : uiText("五局进程", locale)}>
    <div className={styles.heading}><b>RR5 <span>{en ? 'All five maps' : uiText("打满五局", locale)}</span></b><span>{en ? `${recorded} / 5 recorded` : uiText("{0} / 5 局已记录", locale, [recorded])}</span></div>
    <ol>{slots.map(slot => {
      const content = <><small>{String(slot.order).padStart(2, '0')}</small>{!compact && <strong>{slot.name}</strong>}<span>{slot.label}</span></>
      return <li key={slot.order} data-map-state={slot.state}>
        {!compact && slot.record ? <FollowingLink to={withSeason(followingMatchPath(item, slot.order))} aria-label={`${slot.order} · ${slot.name} · ${slot.label}`}>{content}</FollowingLink> : <div>{content}</div>}
      </li>
    })}</ol>
  </div>
}
