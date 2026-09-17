import { useId } from 'react'
import { translateUiText as uiText } from '../../lib/uiText.js'
import styles from './AdvanceSignal.module.css'

export default function AdvanceTeamPicker({ teams, value, onChange, locale, allLabel }) {
  const id = useId()
  return <div className={styles.mobileTeamPicker}>
    <label htmlFor={id}>{locale === 'en-US' ? 'Follow a team' : uiText('查看队伍', locale)}</label>
    <div>
      <select id={id} value={value} onChange={event => onChange(event.target.value)}>
        {allLabel && <option value="">{allLabel}</option>}
        {teams.map(team => <option key={team.id} value={team.id}>{team.label}</option>)}
      </select>
      <span aria-hidden="true">⌄</span>
    </div>
  </div>
}
