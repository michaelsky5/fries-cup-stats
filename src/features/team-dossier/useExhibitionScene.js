import { useCallback, useEffect, useRef, useState } from 'react'

const MOTION_KEY = 'fc-team-exhibition-motion'
const clamp = value => Math.max(0, Math.min(1, value))
const readMotion = () => {
  try { return localStorage.getItem(MOTION_KEY) !== 'off' } catch { return true }
}

export default function useExhibitionScene() {
  const rootRef = useRef(null)
  const stageRef = useRef(null)
  const identityRef = useRef(null)
  const peopleRef = useRef(null)
  const [motion, setMotion] = useState(readMotion)
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [wide, setWide] = useState(() => window.matchMedia('(min-width: 1100px) and (min-height: 760px)').matches)
  const [chapter, setChapter] = useState(0)
  const animated = motion && !reduced
  const pinned = animated && wide

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const viewport = window.matchMedia('(min-width: 1100px) and (min-height: 760px)')
    const updatePreference = () => setReduced(preference.matches)
    const updateViewport = () => setWide(viewport.matches)
    preference.addEventListener('change', updatePreference)
    viewport.addEventListener('change', updateViewport)
    return () => {
      preference.removeEventListener('change', updatePreference)
      viewport.removeEventListener('change', updateViewport)
    }
  }, [])

  useEffect(() => {
    const root = rootRef.current
    const stage = stageRef.current
    let frame = 0
    let currentChapter = -1
    const update = () => {
      frame = 0
      const top = parseFloat(getComputedStyle(stage).top) || 0
      const travel = root.offsetHeight - stage.offsetHeight
      const progress = pinned ? clamp((top - root.getBoundingClientRect().top) / Math.max(1, travel)) : 0
      root.style.setProperty('--scene-turn', clamp((progress - .12) / .7).toFixed(4))
      root.style.setProperty('--people-in', clamp((progress - .37) / .37).toFixed(4))
      root.style.setProperty('--scene-step-color', progress > .38 ? 'var(--fc-data-paper)' : 'var(--fc-data-ink)')
      const nextChapter = progress >= .71 ? 1 : 0
      if (currentChapter !== nextChapter) { currentChapter = nextChapter; setChapter(nextChapter) }
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update) }
    const observer = new ResizeObserver(schedule)
    observer.observe(root)
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    schedule()
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
    }
  }, [pinned])

  const moveTo = useCallback(target => {
    const root = rootRef.current
    const stage = stageRef.current
    const destination = target ? peopleRef.current : identityRef.current
    if (pinned) {
      const top = parseFloat(getComputedStyle(stage).top) || 0
      const offset = target ? (root.offsetHeight - stage.offsetHeight) * .84 : 0
      window.scrollTo({ top: window.scrollY + root.getBoundingClientRect().top - top + offset, behavior: 'instant' })
    } else {
      destination?.scrollIntoView({ block: 'start', behavior: 'instant' })
    }
    // Focus after the scroll state removes inert from the destination scene.
    requestAnimationFrame(() => requestAnimationFrame(() => destination?.focus({ preventScroll: true })))
  }, [pinned])

  const toggleMotion = () => {
    const next = !motion
    setMotion(next)
    try { localStorage.setItem(MOTION_KEY, next ? 'on' : 'off') } catch { /* The scene works without stored preferences. */ }
  }
  return { rootRef, stageRef, identityRef, peopleRef, animated, pinned, reduced, chapter, moveTo, toggleMotion }
}
