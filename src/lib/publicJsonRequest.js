const inFlight = new Map()
const REQUEST_TIMEOUT_MS = 20_000

function conditionalEtag(url, cached, origin) {
  if (!cached?.data || cached.sourceUrl !== url) return ''
  const base = origin || 'https://public-snapshot.invalid'
  if (new URL(url, base).origin !== base) return ''
  // GET If-None-Match uses weak comparison. Sending the opaque tag also
  // works with public proxies that weaken ETags when applying compression.
  return String(cached.etag || '').trim().match(/^(?:W\/)?("[\x21\x23-\x7e\x80-\xff]*")$/)?.[1] || ''
}

// Only pending requests are shared. The caller owns the validated snapshot,
// its source URL and validator; a failed request never replaces that snapshot.
export function requestPublicJson(url, errorCode, {
  cached,
  timeoutMs = REQUEST_TIMEOUT_MS,
  origin = globalThis.location?.origin
} = {}) {
  const etag = conditionalEtag(url, cached, origin)
  const key = JSON.stringify([url, errorCode, etag, timeoutMs])
  if (inFlight.has(key)) return inFlight.get(key)

  const controller = new AbortController()
  const timeout = globalThis.setTimeout(() => controller.abort(), timeoutMs)
  const request = (async () => {
    try {
      const res = await fetch(url, {
        // Manual revalidation must reach the server; other requests can use
        // the browser's HTTP cache without adding cross-origin CORS headers.
        cache: etag ? 'no-store' : 'no-cache',
        ...(etag ? { headers: { 'If-None-Match': etag } } : {}),
        signal: controller.signal
      })
      if (res.status === 304) {
        if (!etag) throw new Error(`${errorCode}: 304_WITHOUT_SNAPSHOT`)
        return { data: cached.data, etag: res.headers?.get?.('etag') || cached.etag }
      }
      if (!res.ok) throw new Error(`${errorCode}: ${res.status}`)
      return { data: await res.json(), etag: res.headers?.get?.('etag') || '' }
    } catch (error) {
      if (controller.signal.aborted) throw new Error(`${errorCode}: REQUEST_TIMEOUT`)
      throw error
    } finally {
      globalThis.clearTimeout(timeout)
    }
  })().finally(() => { inFlight.delete(key) })
  inFlight.set(key, request)
  return request
}
