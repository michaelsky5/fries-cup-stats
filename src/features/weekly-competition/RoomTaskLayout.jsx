import { createContext, useContext, useState } from 'react'
import { createPortal } from 'react-dom'
import styles from './RoomTaskLayout.module.css'

const ActionTarget = createContext(null)

export default function RoomTaskLayout({ as: element = 'div', enabled = true, header, children, className, ...props }) {
  const Element = element
  const [target, setTarget] = useState(null)
  return <Element {...props} className={[className, enabled && styles.layout].filter(Boolean).join(' ')} data-room-task-layout={enabled || undefined}>
    {header}
    {enabled ? <ActionTarget.Provider value={target}>
      <div className={styles.body} data-room-task-body>{children}</div>
      <div className={styles.actions} data-room-primary-actions ref={setTarget} />
    </ActionTarget.Provider> : children}
  </Element>
}

// Keep one instance of each control: only its visual placement changes.
export function RoomTaskActions({ children }) {
  const target = useContext(ActionTarget)
  const group = <div className={styles.group} data-room-primary-group>{children}</div>
  return target ? createPortal(group, target) : group
}
