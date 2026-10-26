// X5 / 票 2.15: horizontal scrollers marked data-scroll-fades fade the side that still has
// content (24px, see index.css) instead of cutting an item in half at the screen edge.
const tracked = new Set()
let resizeObserver = null

function update(element) {
  const hidden = element.scrollWidth - element.clientWidth
  element.toggleAttribute('data-fade-start', hidden > 1 && element.scrollLeft > 1)
  element.toggleAttribute('data-fade-end', hidden > 1 && hidden - element.scrollLeft > 1)
}

function attach(element) {
  if (tracked.has(element)) return
  tracked.add(element)
  element.addEventListener('scroll', () => update(element), { passive: true })
  resizeObserver.observe(element)
  update(element)
}

export function installScrollFades(doc = typeof document === 'undefined' ? null : document) {
  if (!doc?.body || resizeObserver || typeof ResizeObserver === 'undefined') return
  resizeObserver = new ResizeObserver(entries => entries.forEach(entry => update(entry.target)))
  let queued = false
  const sweep = () => {
    queued = false
    for (const element of tracked) {
      if (element.isConnected) update(element)
      else { tracked.delete(element); resizeObserver.unobserve(element) }
    }
    doc.querySelectorAll('[data-scroll-fades]').forEach(attach)
  }
  new MutationObserver(() => {
    if (queued) return
    queued = true
    requestAnimationFrame(sweep)
  }).observe(doc.body, { childList: true, subtree: true })
  sweep()
}

// Keeps the selected item clear of the fades when revealing it inside a scroller.
export const SCROLL_FADE_SIZE = 24
