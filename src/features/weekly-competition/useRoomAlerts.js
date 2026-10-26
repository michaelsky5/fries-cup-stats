import { useEffect, useRef, useSyncExternalStore } from 'react'
import { translateUiText as uiText } from '../../lib/uiText.js'
import { nextRoomAlert, roomAlertState } from './roomAlerts.js'

// 票 2.64: sound and tab-title alerts for players who are in the game while the room changes.
// On by default; the choice is kept per browser. Storage can be blocked, so it falls back to memory.
const KEY = 'friescup:room-alerts'
const listeners = new Set()
let preference = null

function readPreference() {
  if (preference !== null) return preference
  try { preference = localStorage.getItem(KEY) !== 'off' } catch { preference = true }
  return preference
}
function subscribePreference(listener) {
  listeners.add(listener)
  const storage = event => { if (event.key === KEY) { preference = null; listener() } }
  window.addEventListener('storage', storage)
  return () => { listeners.delete(listener); window.removeEventListener('storage', storage) }
}
export function setRoomAlertsEnabled(value) {
  preference = Boolean(value)
  try { localStorage.setItem(KEY, preference ? 'on' : 'off') } catch { /* Kept for this page only. */ }
  listeners.forEach(listener => listener())
}
export function useRoomAlertsEnabled() {
  return useSyncExternalStore(subscribePreference, readPreference, () => true)
}

// Browsers only let a page make sound after someone has clicked or typed on it, so the first interaction
// with the room unlocks the audio. Tones are synthesised: nothing to download.
let audio = null
export function unlockRoomAlertSound() {
  try {
    const Context = window.AudioContext || window.webkitAudioContext
    if (!Context) return
    audio ||= new Context()
    if (audio.state === 'suspended') audio.resume().catch(() => {})
  } catch { /* No sound on this browser; the title still changes. */ }
}
export function playRoomAlertSound(kind) {
  if (!audio) return false
  try {
    if (audio.state === 'suspended') audio.resume().catch(() => {})
    // Your turn: two quick rising pairs. New stage: one soft rising pair.
    const notes = kind === 'turn' ? [[880, 0], [1320, .15], [880, .38], [1320, .53]] : [[660, 0], [880, .17]]
    const start = audio.currentTime + .02, peak = kind === 'turn' ? .3 : .18
    for (const [frequency, offset] of notes) {
      const tone = audio.createOscillator(), level = audio.createGain(), at = start + offset
      tone.type = kind === 'turn' ? 'triangle' : 'sine'
      tone.frequency.value = frequency
      level.gain.setValueAtTime(.0001, at)
      level.gain.exponentialRampToValueAtTime(peak, at + .015)
      level.gain.exponentialRampToValueAtTime(.0001, at + .14)
      tone.connect(level).connect(audio.destination)
      tone.start(at); tone.stop(at + .16)
    }
    return true
  } catch { return false }
}

// The tab title alternates with the alert until the room is looked at again (visible on the taskbar while in game).
let originalTitle = null, titleTimer = null
function flashTitle(text) {
  if (originalTitle === null) originalTitle = document.title
  clearInterval(titleTimer)
  let on = true
  document.title = `● ${text}`
  titleTimer = setInterval(() => { on = !on; document.title = on ? `● ${text}` : originalTitle }, 1000)
}
export function stopRoomAlertTitle() {
  clearInterval(titleTimer); titleTimer = null
  if (originalTitle !== null) document.title = originalTitle
  originalTitle = null
}

const lookingAtRoom = () => document.visibilityState === 'visible' && document.hasFocus()

export function roomAlertText(alert, locale) {
  const name = uiText(alert.name, locale)
  if (alert.kind === 'turn') return uiText('轮到你：{0}', locale, [name])
  return alert.order ? `${uiText('第 {0} 图', locale, [alert.order])} · ${name}` : name
}

export default function useRoomAlerts(data, enabled, locale) {
  const previous = useRef(null)
  useEffect(() => {
    if (!enabled) return
    const unlock = () => unlockRoomAlertSound()
    document.addEventListener('pointerdown', unlock, { once: true, capture: true })
    document.addEventListener('keydown', unlock, { once: true, capture: true })
    return () => { document.removeEventListener('pointerdown', unlock, { capture: true }); document.removeEventListener('keydown', unlock, { capture: true }) }
  }, [enabled])
  useEffect(() => {
    const current = roomAlertState(data)
    const alert = nextRoomAlert(previous.current, current)
    previous.current = current
    if (!alert || !enabled || lookingAtRoom()) return
    playRoomAlertSound(alert.kind)
    flashTitle(roomAlertText(alert, locale))
  }, [data, enabled, locale])
  useEffect(() => {
    const back = () => { if (lookingAtRoom()) stopRoomAlertTitle() }
    window.addEventListener('focus', back)
    document.addEventListener('visibilitychange', back)
    return () => { window.removeEventListener('focus', back); document.removeEventListener('visibilitychange', back); stopRoomAlertTitle() }
  }, [])
  useEffect(() => { if (!enabled) stopRoomAlertTitle() }, [enabled])
}
