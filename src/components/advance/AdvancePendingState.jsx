import styles from '../../pages/advance/AdvancePage.module.css'

export default function AdvancePendingState({ eyebrow, title, description, items = [] }) {
  return (
    <section className={styles.pendingState}>
      <div>
        {eyebrow ? <span className={styles.sectionLabel}>{eyebrow}</span> : null}
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      {items.length ? (
        <ul>
          {items.map(item => <li key={item}>{item}</li>)}
        </ul>
      ) : null}
    </section>
  )
}
