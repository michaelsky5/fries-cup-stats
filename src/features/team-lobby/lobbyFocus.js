// Browsers accept spaces for required fields, and the server trims them before
// rejecting the post. Report the field in our own words, where the person is.
export function reportInvalidField(element, message) {
  if (!element?.setCustomValidity) return false
  element.setCustomValidity(message)
  element.reportValidity()
  const clear = () => element.setCustomValidity('')
  element.addEventListener('input', clear, { once: true })
  element.addEventListener('change', clear, { once: true })
  return true
}

// After a failed submit the alert sits above the form; on a phone that is far
// off-screen. Bring it into view below the sticky header and move focus to it.
export function revealAlert(element) {
  if (!element) return
  const box = element.getBoundingClientRect()
  if (box.top < 72 || box.bottom > window.innerHeight) element.scrollIntoView({ block: 'center' })
  element.focus({ preventScroll: true })
}
