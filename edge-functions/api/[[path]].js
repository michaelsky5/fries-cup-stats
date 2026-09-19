// Production defaults to the live account API. Preview deployments can set
// FRIES_PLATFORM_ORIGIN to the isolated staging backend.
const PLATFORM_ORIGIN = globalThis.process?.env?.FRIES_PLATFORM_ORIGIN || 'https://admin.fries-cup.com'
const PUBLIC_ORIGIN = 'https://admin.fries-cup.com'
const MAX_BODY_BYTES = 1024 * 1024
const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])
const METHODS = new Set([...READ_METHODS, 'POST', 'PUT', 'PATCH', 'DELETE'])
const FORWARD_HEADERS = ['accept', 'accept-language', 'content-type', 'origin', 'referer', 'sec-fetch-site']

function problem(status, error, message, outcomeUnknown = false) {
  return new Response(JSON.stringify({ error, message, ...(outcomeUnknown ? { outcomeUnknown: true } : {}) }), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'private, no-store',
      'X-Robots-Tag': 'noindex, nofollow, noarchive, nosnippet',
      'X-Content-Type-Options': 'nosniff'
    }
  })
}

function resolveRoute(url, { platformOrigin, publicOrigin, rehearsal }) {
  // Refuse encoded separators and nested escapes before any upstream URL parsing.
  if (/%(?:2f|5c|25|00)/i.test(url.pathname)) return null
  let pathname
  try { pathname = decodeURIComponent(url.pathname) } catch { return null }
  if (pathname.split('/').some(part => part === '.' || part === '..') || pathname.includes('\\')) return null
  if (/^\/api\/admin-public\/seasons\/[A-Za-z0-9_-]+\/publish\/latest\/(data|report)$/.test(pathname)) {
    const snapshotOrigin = rehearsal && pathname.startsWith('/api/admin-public/seasons/WEBWEEK20260914/') ? platformOrigin : publicOrigin
    return { public: true, url: `${snapshotOrigin}${pathname.replace('/api/admin-public/', '/api/public/')}${url.search}` }
  }
  if (/^\/api\/platform\/media\/avatars\/[a-f0-9]{24}\/[a-f0-9]{32}-(256|96)\.webp$/.test(pathname)) {
    return { public: true, media: true, url: `${platformOrigin}${pathname.replace('/api/platform/', '/api/')}` }
  }
  if (/^\/api\/platform\/media\/team-logos\/[a-f0-9]{24}\/[a-f0-9]{32}\.webp$/.test(pathname)) {
    return { public: true, media: true, url: `${platformOrigin}${pathname.replace('/api/platform/', '/api/')}` }
  }
  if (/^\/api\/platform\/[^/].*$/.test(pathname)) {
    return { public: false, url: `${platformOrigin}${url.pathname.replace('/api/platform/', '/api/')}${url.search}` }
  }
  return null
}

export async function proxyRequest(request, {
  fetchImpl = fetch, cache, waitUntil,
  platformOrigin = PLATFORM_ORIGIN, publicOrigin = PUBLIC_ORIGIN, rehearsal = false,
  environment = 'production'
} = {}) {
  const url = new URL(request.url)
  const route = resolveRoute(url, { platformOrigin, publicOrigin, rehearsal })
  if (!route) return problem(404, 'API_ROUTE_NOT_FOUND', 'Unknown API route.')
  if (!METHODS.has(request.method) || (route.public && !['GET', 'HEAD'].includes(request.method))) {
    return problem(405, 'METHOD_NOT_ALLOWED', 'This API route does not accept that method.')
  }
  if (!READ_METHODS.has(request.method)) {
    // Preserve Origin downstream too: the backend must explicitly allow the preview domain.
    if (request.headers.get('origin') !== url.origin || request.headers.get('sec-fetch-site') === 'cross-site') {
      return problem(403, 'ORIGIN_NOT_ALLOWED', 'Open this action from the same website.')
    }
  }

  // Key the published representation by its upstream URL, independently of the
  // preview hostname and the Pages route that executed this function.
  const cacheKey = new Request(route.url)
  const canReadCache = route.public && request.method === 'GET' && cache
  if (canReadCache) {
    try {
      const hit = await cache.match(cacheKey)
      if (hit?.ok) {
        const headers = new Headers(hit.headers)
        headers.set('X-Fries-Public-Cache', 'HIT')
        return new Response(hit.body, { status: hit.status, headers })
      }
    } catch { /* Expired or unavailable node cache: use the published origin. */ }
  }

  const headers = new Headers()
  for (const name of FORWARD_HEADERS) {
    if (request.headers.has(name)) headers.set(name, request.headers.get(name))
  }
  if (route.public) {
    // Published snapshots are identical for everyone; never send user credentials.
    headers.delete('origin')
    headers.delete('referer')
  } else {
    for (const name of ['cookie', 'authorization']) {
      if (request.headers.has(name)) headers.set(name, request.headers.get(name))
    }
    headers.set('Cache-Control', 'no-store')
  }
  headers.set('accept-encoding', 'identity')

  const registrationImage = (request.method === 'POST' && /^\/api\/platform\/seasons\/[^/]+\/registration\/drafts$/.test(url.pathname))
    || (request.method === 'PATCH' && /^\/api\/platform\/seasons\/[^/]+\/registration\/drafts\/[^/]+$/.test(url.pathname))
  const bodyLimit = registrationImage || (request.method === 'PATCH' && url.pathname === '/api/platform/me/profile') ? 3 * MAX_BODY_BYTES : MAX_BODY_BYTES
  let body
  if (!READ_METHODS.has(request.method)) {
    if (Number(request.headers.get('content-length')) > bodyLimit) {
      return problem(413, 'REQUEST_TOO_LARGE', 'Request exceeds the size limit.')
    }
    body = await request.arrayBuffer()
    if (body.byteLength > bodyLimit) return problem(413, 'REQUEST_TOO_LARGE', 'Request exceeds the size limit.')
  }

  let upstream
  try {
    upstream = await fetchImpl(route.url, {
      method: request.method, headers, body, redirect: 'manual',
      eo: { timeoutSetting: { connectTimeout: 15000, readTimeout: 15000, writeTimeout: 15000 } }
    })
  } catch (error) {
    const timedOut = /timeout|timed out/i.test(`${error?.name} ${error?.message} ${error?.cause?.code} ${error?.cause?.message}`)
    const outcomeUnknown = !READ_METHODS.has(request.method)
    return problem(timedOut ? 504 : 502, timedOut ? 'UPSTREAM_TIMEOUT' : 'UPSTREAM_UNAVAILABLE',
      outcomeUnknown ? '提交结果尚未确认，请先刷新相关状态后核对。' : '账号服务暂时无法连接，请稍后重试。', outcomeUnknown)
  }

  // API redirects are unexpected. Never follow them with session credentials.
  if (upstream.status >= 300 && upstream.status < 400) {
    return problem(502, 'UPSTREAM_REDIRECT', '账号服务返回异常，请先刷新相关状态后核对。', !READ_METHODS.has(request.method))
  }
  if (request.method !== 'HEAD' && upstream.status !== 204 && /text\/html/i.test(upstream.headers.get('content-type') || '')) {
    return problem(502, 'UPSTREAM_INVALID_RESPONSE', '账号服务返回异常，请先刷新相关状态后核对。', !READ_METHODS.has(request.method))
  }
  // Clone Headers directly so separate Set-Cookie values stay separate.
  const responseHeaders = new Headers(upstream.headers)
  for (const name of ['connection', 'keep-alive', 'transfer-encoding', 'content-length', 'content-encoding', 'server', 'access-control-allow-origin', 'access-control-allow-credentials']) {
    responseHeaders.delete(name)
  }
  responseHeaders.set('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet')
  responseHeaders.set('X-Content-Type-Options', 'nosniff')
  responseHeaders.set('X-Fries-Backend', route.media ? `${environment}-media` : route.public ? 'published-snapshots' : environment)
  if (!route.public || !upstream.ok) responseHeaders.set('Cache-Control', 'private, no-store')
  if (route.public) {
    responseHeaders.delete('set-cookie')
    // Both variants were normalized upstream: no Origin, identity encoding.
    const vary = (responseHeaders.get('vary') || '').split(',').map(value => value.trim())
      .filter(value => value && !/^(origin|accept-encoding)$/i.test(value))
    if (vary.length) responseHeaders.set('vary', vary.join(', '))
    else responseHeaders.delete('vary')
  }
  responseHeaders.set('X-Fries-Public-Cache', route.public ? (cache ? 'MISS' : 'UNAVAILABLE') : 'BYPASS')
  const response = new Response(request.method === 'HEAD' || upstream.status === 204 ? null : upstream.body, {
    status: upstream.status, statusText: upstream.statusText, headers: responseHeaders
  })
  const cacheControl = responseHeaders.get('cache-control') || ''
  if (canReadCache && upstream.status === 200 && /\bpublic\b/i.test(cacheControl)
    && !/private|no-store|no-cache/i.test(cacheControl) && !upstream.headers.has('set-cookie')
    && (route.media ? /^image\/webp$/i : /application\/json/i).test(responseHeaders.get('content-type') || '')) {
    const report = url.pathname.endsWith('/report')
    const task = cache.put(cacheKey, response.clone()).then(() => {
      if (report) response.headers.set('X-Fries-Cache-Write', 'completed')
    }).catch(error => {
      if (report) response.headers.set('X-Fries-Cache-Write', `failed-${String(error?.message || '').match(/\b[45]\d\d\b/)?.[0] || 'runtime'}`)
      // Operational diagnostics only; never log credentials, request headers or URLs.
      console.warn('PUBLIC_SNAPSHOT_CACHE_WRITE_FAILED', {
        path: url.pathname,
        name: error?.name,
        message: String(error?.message || '').replace(/https?:\/\/\S+/g, '[url]').slice(0, 200)
      })
    })
    if (report) await task
    else if (waitUntil) waitUntil(task)
    else await task
  }
  return response
}

export default function onRequest(context) {
  return proxyRequest(context.request, {
    cache: globalThis.caches?.default,
    waitUntil: context.waitUntil ? task => context.waitUntil(task) : undefined
  })
}
