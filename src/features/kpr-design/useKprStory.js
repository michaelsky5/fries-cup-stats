import { useCallback, useEffect, useRef, useState } from 'react'

const clamp = value => Math.min(1, Math.max(0, value))

export default function useKprStory({ enabled = true } = {}) {
  const trackRef = useRef(null)
  const stageRef = useRef(null)
  const [act, setAct] = useState(0)
  const [motionPaused, setMotionPaused] = useState(false)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => (
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ))
  const reducedMotion = motionPaused || prefersReducedMotion

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = event => setPrefersReducedMotion(event.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    const track = trackRef.current
    const stage = stageRef.current
    if (!enabled || !track || !stage) return undefined
    let frame = 0
    const update = () => {
      frame = 0
      const top = parseFloat(getComputedStyle(stage).top) || 0
      const travel = Math.max(1, track.offsetHeight - stage.offsetHeight)
      const progress = clamp((top - track.getBoundingClientRect().top) / travel)
      const nextAct = progress >= .53 ? 1 : 0
      const mix = reducedMotion ? nextAct : clamp((progress - .16) / .66)
      track.style.setProperty('--story-progress', progress.toFixed(4))
      track.style.setProperty('--story-mix', mix.toFixed(4))
      setAct(current => current === nextAct ? current : nextAct)
    }
    const schedule = () => { if (!frame) frame = window.requestAnimationFrame(update) }
    const resizeObserver = new ResizeObserver(schedule)
    resizeObserver.observe(track)
    resizeObserver.observe(stage)
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    update()
    return () => {
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      resizeObserver.disconnect()
      window.cancelAnimationFrame(frame)
    }
  }, [reducedMotion, enabled])

  const goToAct = useCallback(nextAct => {
    const track = trackRef.current
    const stage = stageRef.current
    if (!track || !stage) return
    const top = parseFloat(getComputedStyle(stage).top) || 0
    const travel = Math.max(0, track.offsetHeight - stage.offsetHeight)
    window.scrollTo({
      top: window.scrollY + track.getBoundingClientRect().top - top + travel * nextAct,
      behavior: reducedMotion ? 'instant' : 'smooth'
    })
  }, [reducedMotion])

  return { trackRef, stageRef, act, goToAct, reducedMotion, motionPaused, setMotionPaused, prefersReducedMotion }
}
