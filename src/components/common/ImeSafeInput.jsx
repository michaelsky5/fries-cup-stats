import { forwardRef, useEffect, useRef, useState } from 'react'

const ImeSafeInput = forwardRef(function ImeSafeInput({
  value = '',
  onValueChange,
  onCompositionStart,
  onCompositionEnd,
  ...props
}, forwardedRef) {
  const normalizedValue = String(value ?? '')
  const [draft, setDraft] = useState(normalizedValue)
  const composingRef = useRef(false)

  useEffect(() => {
    if (!composingRef.current) setDraft(normalizedValue)
  }, [normalizedValue])

  const handleChange = event => {
    const nextValue = event.target.value
    setDraft(nextValue)
    if (!composingRef.current && !event.nativeEvent.isComposing) {
      onValueChange?.(nextValue)
    }
  }

  const handleCompositionStart = event => {
    composingRef.current = true
    onCompositionStart?.(event)
  }

  const handleCompositionEnd = event => {
    composingRef.current = false
    const nextValue = event.currentTarget.value
    setDraft(nextValue)
    onValueChange?.(nextValue)
    onCompositionEnd?.(event)
  }

  return (
    <input
      {...props}
      ref={forwardedRef}
      value={draft}
      onChange={handleChange}
      onCompositionStart={handleCompositionStart}
      onCompositionEnd={handleCompositionEnd}
    />
  )
})

export default ImeSafeInput
