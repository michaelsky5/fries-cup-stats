// Only validated public snapshots use these files. Account sessions, request
// headers and device identifiers never enter this cache or its key names.
export const PUBLIC_CACHE_MAX_BYTES = 2 * 1024 * 1024
const EVENTS = new Set(['FCW26', 'FCR26', 'FCA26', 'QGCS4'])

function byteLength(text) {
  let bytes = 0
  for (let index = 0; index < text.length; index++) {
    const code = text.charCodeAt(index)
    if (code <= 0x7f) bytes += 1
    else if (code <= 0x7ff) bytes += 2
    else if (code >= 0xd800 && code <= 0xdbff && text.charCodeAt(index + 1) >= 0xdc00 && text.charCodeAt(index + 1) <= 0xdfff) { bytes += 4; index++ }
    else bytes += 3
    if (bytes > PUBLIC_CACHE_MAX_BYTES) break
  }
  return bytes
}

export function createPublicSnapshotFileStore({ fileSystem, root, seasonId }) {
  if (!EVENTS.has(seasonId)) throw new Error('Unknown public cache event')
  if (!fileSystem || !root) return undefined
  const filePath = root + '/friescup-public-' + seasonId + '-v1.json'
  const call = (method, options) => new Promise((resolve, reject) => fileSystem[method]({ ...options, success: resolve, fail: reject }))
  return {
    async read() {
      const info = await call('stat', { path: filePath })
      if (info.stats.size > PUBLIC_CACHE_MAX_BYTES) return null
      const value = await call('readFile', { filePath, encoding: 'utf8' })
      return JSON.parse(value.data)
    },
    async write(record) {
      const data = JSON.stringify(record)
      if (byteLength(data) > PUBLIC_CACHE_MAX_BYTES) return
      await call('writeFile', { filePath, data, encoding: 'utf8' })
    }
  }
}
