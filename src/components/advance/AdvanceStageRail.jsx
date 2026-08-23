import { Link } from 'react-router-dom'
import styles from '../../pages/advance/AdvancePage.module.css'

function getStatusText(item, t) {
  if (item.isActualCurrent) return t('advance.status.current', '当前')
  if (item.status === 'completed') return t('advance.status.completed', '已完成')
  if (item.status === 'pending') return t('advance.status.pendingConfirm', '待确认')
  return t('advance.status.upcoming', '未开始')
}

export default function AdvanceStageRail({ items, t, getHref }) {
  return (
    <nav
      className={styles.stageRail}
      aria-label={t('advance.stageRail', '晋级阶段')}
      style={{ '--advance-phase-count': items.length }}
    >
      {items.map(item => (
        <Link
          key={item.phase}
          to={getHref(item.phase)}
          className={[
            styles.stageNode,
            styles[`stage_${item.status}`],
            item.selected ? styles.stageSelected : ''
          ].filter(Boolean).join(' ')}
          aria-current={item.selected ? 'page' : undefined}
        >
          <span>{String(item.index).padStart(2, '0')}</span>
          <strong>{t(`advance.phase.${item.phase}`, item.phase)}</strong>
          <em>{getStatusText(item, t)}</em>
        </Link>
      ))}
    </nav>
  )
}
