import { passwordPolicyHint } from './passwordPolicy.js'
import styles from './PasswordRequirements.module.css'

export default function PasswordRequirements({ locale, id, minLength = 8 }) {
  return <div className={styles.requirements} id={id} data-i18n-ignore>
    <p>{passwordPolicyHint(locale, minLength)}</p>
  </div>
}
