import { useSyncExternalStore } from 'react'

const QUERY = '(max-width: 760px)'

function subscribe(onChange) {
  const media = window.matchMedia(QUERY)
  media.addEventListener('change', onChange)
  return () => media.removeEventListener('change', onChange)
}

const getSnapshot = () => window.matchMedia(QUERY).matches
const getServerSnapshot = () => false

export default function useCompactMatchLayout() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
