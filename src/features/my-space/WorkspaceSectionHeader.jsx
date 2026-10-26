import styles from './WorkspaceSectionHeader.module.css'

export default function WorkspaceSectionHeader({
  title,
  description,
  badge = '',
  children = null
}) {
  return (
    <header className={styles.header}>
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {children ? <div className={styles.actions}>{children}</div> : badge ? <em>{badge}</em> : null}
    </header>
  )
}
