import { translateUiText } from '../../lib/uiText.js'

// Only generated UI copy is translated. Names and manually authored task titles
// stay intact, even when a name happens to match an interface dictionary entry.
export function taskTitle(task, locale) {
  if (!task?.titleCopy) return task?.title || ''
  const { prefix, key, values = [] } = task.titleCopy
  const label = translateUiText(key, locale, values)
  return prefix ? `${prefix} · ${label}` : label
}

export function taskBody(task, locale) {
  if (!task?.bodyCopy) return task?.body || ''
  const { prefix, key, values = [] } = task.bodyCopy
  const label = translateUiText(key, locale, values)
  const context = Array.isArray(prefix)
    ? prefix.map(part => typeof part === 'string' ? part : translateUiText(part.key, locale, part.values || [])).filter(Boolean).join(' · ')
    : prefix
  return context ? `${context} · ${label}` : label
}
