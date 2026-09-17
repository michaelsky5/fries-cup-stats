import { useEffect } from 'react'

// The stage is a layered image, not a 3D model. Pointer movement only adds
// a small amount of depth; scrolling, touch and keyboard never depend on it.
export default function useStagePointer(stageRef, reducedMotion) {
  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return undefined
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)')
    let frame = 0
    let x = 0
    let y = 0
    const draw = () => {
      frame = 0
      stage.style.setProperty('--pointer-x', x.toFixed(3))
      stage.style.setProperty('--pointer-y', y.toFixed(3))
    }
    const schedule = () => { if (!frame) frame = window.requestAnimationFrame(draw) }
    const reset = () => { x = 0; y = 0; schedule() }
    const move = event => {
      if (reducedMotion || !finePointer.matches || event.pointerType === 'touch') return
      const bounds = stage.getBoundingClientRect()
      x = Math.max(-1, Math.min(1, (event.clientX - bounds.left) / bounds.width * 2 - 1))
      y = Math.max(-1, Math.min(1, (event.clientY - bounds.top) / bounds.height * 2 - 1))
      schedule()
    }
    reset()
    if (!reducedMotion) {
      stage.addEventListener('pointermove', move, { passive: true })
      stage.addEventListener('pointerleave', reset)
      finePointer.addEventListener('change', reset)
    }
    return () => {
      window.cancelAnimationFrame(frame)
      stage.removeEventListener('pointermove', move)
      stage.removeEventListener('pointerleave', reset)
      finePointer.removeEventListener('change', reset)
    }
  }, [stageRef, reducedMotion])
}
