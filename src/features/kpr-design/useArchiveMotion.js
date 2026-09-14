import { useCallback, useEffect, useState } from 'react'

const clamp = value => Math.min(1, Math.max(0, value))

export default function useArchiveMotion(rootRef, chapterIdsKey, reducedMotion) {
  const [activeChapter, setActiveChapter] = useState(() => chapterIdsKey.split('|').find(Boolean) || '')

  useEffect(() => {
    const root = rootRef.current
    const chapterIds = chapterIdsKey.split('|').filter(Boolean)
    const sections = chapterIds.map(id => document.getElementById(id)).filter(Boolean)
    if (!root || !sections.length) return undefined

    let frame = 0
    const revealObserver = reducedMotion ? null : new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) entry.target.dataset.revealed = 'true'
      })
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 })

    const update = () => {
      frame = 0
      const documentTravel = Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
      root.style.setProperty('--archive-progress', clamp(window.scrollY / documentTravel).toFixed(4))

      const focusLine = Math.min(window.innerHeight * 0.42, window.innerHeight - 120)
      let closest = sections[0]
      let closestDistance = Number.POSITIVE_INFINITY

      sections.forEach(section => {
        const rect = section.getBoundingClientRect()
        const progress = clamp((window.innerHeight - rect.top) / Math.max(1, rect.height + window.innerHeight))
        section.style.setProperty('--section-progress', progress.toFixed(4))
        section.style.setProperty('--section-shift', `${((progress - 0.5) * 84).toFixed(2)}px`)

        if (reducedMotion || (rect.top < window.innerHeight * 0.92 && rect.bottom > window.innerHeight * 0.08)) {
          section.dataset.revealed = 'true'
        }

        const distance = rect.top <= focusLine && rect.bottom >= focusLine
          ? 0
          : Math.min(Math.abs(rect.top - focusLine), Math.abs(rect.bottom - focusLine))
        if (distance < closestDistance) {
          closest = section
          closestDistance = distance
        }
      })

      setActiveChapter(current => current === closest.id ? current : closest.id)
    }

    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update)
    }

    sections.forEach(section => revealObserver?.observe(section))
    update()
    root.dataset.motionReady = reducedMotion ? 'reduced' : 'true'

    const resizeObserver = new ResizeObserver(schedule)
    sections.forEach(section => resizeObserver.observe(section))
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)

    return () => {
      revealObserver?.disconnect()
      resizeObserver.disconnect()
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      window.cancelAnimationFrame(frame)
    }
  }, [chapterIdsKey, reducedMotion, rootRef])

  const scrollToChapter = useCallback((id, { focus = false } = {}) => {
    const section = document.getElementById(id)
    if (focus && section) {
      const heading = section.querySelector('h1, h2') || section
      heading.setAttribute('tabindex', '-1')
      heading.focus({ preventScroll: true })
    }
    section?.scrollIntoView({
      behavior: reducedMotion ? 'auto' : 'smooth',
      block: 'start'
    })
  }, [reducedMotion])

  return { activeChapter, scrollToChapter }
}
