import { Link } from 'react-router-dom'
import styles from '../../pages/advance/AdvancePage.module.css'

export default function AdvanceStageRail({ items, t, getHref }) {
  return (
    <nav className={styles.stageRail} aria-label={t('advance.stageRail', '晋级阶段')}>
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
          {item.status === 'pending' ? <em>{t('advance.status.pendingConfirm', '待确认')}</em> : null}
        </Link>
      ))}
    </nav>
  )
}
