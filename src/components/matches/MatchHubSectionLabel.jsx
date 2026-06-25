import styles from './MatchHub.module.css'

export default function MatchHubSectionLabel({ code, title }) {
  return (
    <div className={styles.sectionLabel}>
      <span>{code}</span>
      <strong>{title}</strong>
    </div>
  )
}
