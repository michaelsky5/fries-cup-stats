import styles from '../../pages/advance/AdvancePage.module.css'

export default function AdvanceEmptyState({ eyebrow, title, description, action }) {
  return (
    <div className={styles.emptyState}>
      {eyebrow ? <span>{eyebrow}</span> : null}
      <strong>{title}</strong>
      {description ? <p>{description}</p> : null}
      {action || null}
    </div>
  )
}
