let adapter = { get: () => undefined, set: () => undefined, remove: () => undefined }
let seasonId = 'FCW26'
export function configureClassicStorage(storage, season) { adapter = storage; seasonId = season }
const keyOf = key => `friescup:classic:${seasonId}:${key}`
export const classicStorage = {
  getItem(key) {
    const value = adapter.get(keyOf(key))
    if (value === '' || value == null) return null
    // The Web engine would replace a broken career record on the next write.
    // Keep it recoverable in the native adapter and surface a read failure.
    if (key === 'fca_manager_career_v2') JSON.parse(String(value))
    return String(value)
  },
  setItem(key, value) { adapter.set(keyOf(key), String(value)) },
  removeItem(key) { adapter.remove(keyOf(key)) }
}
