import { useEffect, useRef } from 'react'

export default function ExhibitionWordmark({ name }) {
  const wordmarkRef = useRef(null)
  const long = name.length > 7
  useEffect(() => {
    if (long) return undefined
    const title = wordmarkRef.current
    const container = title.parentElement
    let frame = 0
    let active = true
    let previousWidth = -1
    const measure = () => {
      frame = 0
      if (!active) return
      const available = container.clientWidth
      const maximum = window.innerWidth <= 700 ? 230 : window.innerHeight <= 900 ? 310 : 400
      title.style.setProperty('--wordmark-size', maximum + 'px')
      const naturalWidth = title.getBoundingClientRect().width
      title.style.setProperty('--wordmark-size', Math.min(maximum, maximum * available / Math.max(1, naturalWidth)).toFixed(2) + 'px')
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(measure) }
    const observer = new ResizeObserver(() => {
      if (container.clientWidth !== previousWidth) { previousWidth = container.clientWidth; schedule() }
    })
    observer.observe(container)
    window.addEventListener('resize', schedule)
    document.fonts.ready.then(() => { if (active) schedule() })
    schedule()
    return () => { active = false; cancelAnimationFrame(frame); observer.disconnect(); window.removeEventListener('resize', schedule) }
  }, [name, long])
  return <h1 ref={wordmarkRef} data-long={long || undefined}>{name}{!long && <span aria-hidden="true">.</span>}</h1>
}
