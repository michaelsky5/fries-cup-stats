import styles from './SignalSwitch.module.css'

export default function SignalSwitch({ checked, onChange, children, className = '', ...props }) {
  return <button {...props} type="button" role="switch" aria-checked={checked} className={`${styles.control} ${className}`} onClick={() => onChange(!checked)}>
    <span>{children}</span><span className={styles.track} aria-hidden="true" />
  </button>
}
