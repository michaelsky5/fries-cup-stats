import { useEffect, useState } from 'react'

// 票 2.78: the sticky page row names the team only once the name on the page has scrolled away —
// the 展厅 cover's name (or a later scene of the pinned cover), otherwise the title row — so the
// first screen shows the team name once.
export default function useCondensedIdentity(articleRef, view) {
  const [condensed, setCondensed] = useState(false)
  useEffect(() => {
    const article = articleRef.current
    if (!article) return undefined
    let frame = 0
    const check = () => {
      frame = 0
      const nav = article.querySelector('[data-archive-tabs]')
      const holder = article.querySelector('[data-cover-name]') || article.querySelector('[data-team-title-row]')
      if (!nav || !holder) return
      const scene = article.querySelector('[data-gallery-cover]')?.getAttribute('data-scene')
      setCondensed(Boolean(scene && scene !== '0') || holder.getBoundingClientRect().bottom <= nav.getBoundingClientRect().bottom)
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(check) }
    const scenes = new MutationObserver(schedule)
    scenes.observe(article, { subtree: true, attributes: true, attributeFilter: ['data-scene'] })
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    schedule()
    return () => {
      if (frame) cancelAnimationFrame(frame)
      scenes.disconnect()
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
    }
  }, [articleRef, view])
  return condensed
}
