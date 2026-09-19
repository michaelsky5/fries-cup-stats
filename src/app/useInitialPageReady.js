import { useEffect } from 'react'

// Keep entrance animations paused until the initial route and its styles mount.
// Slow images/fonts have a bounded wait; API loading remains the page's own UI.
export default function useInitialPageReady(router) {
  useEffect(() => {
    let cancelled = false
    let started = false
    let frame = 0
    let timer = 0
    const prepare = state => {
      if (!state.initialized || started) return
      started = true
      window.dispatchEvent(new Event('fc:app-preparing'))
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(async () => {
          const images = [...document.querySelectorAll('#root img')].filter(image => {
            const bounds = image.getBoundingClientRect()
            return image.loading !== 'lazy' && bounds.width > 0 && bounds.top < innerHeight && bounds.bottom > 0
          })
          await Promise.race([
            Promise.allSettled([document.fonts?.ready, ...images.map(image => image.decode())]),
            new Promise(resolve => { timer = setTimeout(resolve, 1200) })
          ])
          clearTimeout(timer)
          if (!cancelled) {
            window.dispatchEvent(new Event('fc:app-ready'))
            // Also recover when the tiny standalone boot script failed to load.
            document.documentElement.removeAttribute('data-booting')
            document.getElementById('root')?.removeAttribute('inert')
            document.getElementById('app-boot')?.remove()
          }
        })
      })
    }
    const unsubscribe = router.subscribe(prepare)
    prepare(router.state)
    return () => {
      cancelled = true
      unsubscribe()
      cancelAnimationFrame(frame)
      clearTimeout(timer)
    }
  }, [router])
}
