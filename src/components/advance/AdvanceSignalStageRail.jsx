import { translateUiText as uiText } from '../../lib/uiText.js'
import { Link } from 'react-router-dom'
import styles from './AdvanceSignal.module.css'

function copy(locale, zh, en) {
  return locale === 'en-US' ? en : zh
}

function statusText(item, locale) {
  if (item.isActualCurrent) return copy(locale, '当前', 'CURRENT')
  if (item.status === 'completed') return copy(locale, '完成', 'DONE')
  if (item.status === 'pending') return copy(locale, '待确认', 'PENDING')
  return copy(locale, '未开始', 'NEXT')
}

export default function AdvanceSignalStageRail({ items, locale = 'zh-CN', t, getHref }) {
  const currentItem = items.find(item => item.isActualCurrent)
  const completedCount = items.filter(item => item.status === 'completed').length
  const routePosition = currentItem?.index || completedCount

  return (
    <nav className={styles.phaseIndex} style={{ '--advance-phase-count': items.length }} aria-label={t('advance.stageRail', uiText("晋级阶段", locale))}>
      <span className={styles.phaseIndexLabel}><img src="/logos/fries-cup-symbol.png" alt="" /><b>FC / ROUTE</b></span>
      <div className={styles.phaseLinks}>
        {items.map(item => (
          <Link
            key={item.phase}
            to={getHref(item.phase)}
            data-status={item.isActualCurrent ? 'current' : item.status}
            aria-current={item.selected ? 'page' : undefined}
          >
            <span>{String(item.index).padStart(2, '0')} / {t(`advance.phase.${item.phase}`, item.phase)}</span>
            <small>{statusText(item, locale)}</small>
          </Link>
        ))}
      </div>
      <span className={styles.phaseStamp}><b>{String(routePosition).padStart(2, '0')}</b> / {String(items.length).padStart(2, '0')}</span>
    </nav>
  )
}
