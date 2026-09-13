import { randomUUID } from 'node:crypto'
import { Buffer } from 'node:buffer'
import process from 'node:process'
import { request as httpsRequest } from 'node:https'

const COOKIE_NAMES = new Set(['__Host-fries_session', 'fries_session'])
const METHODS = new Set(['GET', 'HEAD', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'])
const MAX_BODY_BYTES = 2 * 1024 * 1024

// A bounded HTTP/1.1 transport exposes the failed connection phase without logging account data.
function httpsFetch(url, options, phases) {
  return new Promise((resolve, reject) => {
    const req = httpsRequest(url, { method: options.method, headers: Object.fromEntries(options.headers),
      signal: options.signal, agent: false }, res => {
      phases.push('headers')
      const chunks = []
      let size = 0
      res.on('data', chunk => {
        size += chunk.length
        if (size > 4 * 1024 * 1024) req.destroy(new Error('ACCOUNT_PROXY_RESPONSE_TOO_LARGE'))
        else chunks.push(chunk)
      })
      res.on('error', reject)
      res.on('end', () => {
        const headers = new Headers()
        for (let i = 0; i < res.rawHeaders.length; i += 2) headers.append(res.rawHeaders[i], res.rawHeaders[i + 1])
        const bytes = Buffer.concat(chunks)
        resolve({ status: res.statusCode, headers, arrayBuffer: async () => bytes })
      })
    })
    req.on('socket', socket => {
      phases.push('socket')
      socket.once('lookup', (error, address, family) => phases.push(error ? 'dns_error' : {dns: address, family}))
      socket.once('connect', () => phases.push('tcp'))
      socket.once('secureConnect', () => phases.push('tls'))
    })
    req.on('error', reject)
    req.end(options.body)
  })
}

function sessionCookies(value = '') {
  return String(value).split(';').map(cookie => cookie.trim())
    .filter(cookie => COOKIE_NAMES.has(cookie.split('=', 1)[0])).join('; ')
}

function upstreamUrl(request, origin) {
  const base = new URL(origin)
  if (base.protocol !== 'https:' || base.username || base.password || base.pathname !== '/' || base.search || base.hash) {
    throw new Error('ACCOUNT_PROXY_CONFIGURATION')
  }
  const incoming = new URL(request.url, 'https://account.invalid')
  const paths = incoming.searchParams.getAll('accountPath')
  const path = paths.length === 1 ? paths[0] : ''
  if (!/^(auth|me)\/[a-zA-Z0-9_/-]+$/.test(path) || path.includes('//')) {
    throw new Error('ACCOUNT_PROXY_PATH')
  }
  incoming.searchParams.delete('accountPath')
  incoming.searchParams.delete('_vercel_share')
  incoming.searchParams.delete('x-vercel-protection-bypass')
  incoming.searchParams.delete('x-vercel-set-bypass-cookie')
  const target = new URL('/api/' + path, base)
  target.search = incoming.searchParams.toString()
  return target
}

async function requestBody(request) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return undefined
  let body
  if (request.body !== undefined) {
    body = Buffer.isBuffer(request.body) ? request.body
      : Buffer.from(typeof request.body === 'string' ? request.body : JSON.stringify(request.body))
  } else {
    const chunks = []
    let size = 0
    for await (const chunk of request) {
      const buffer = Buffer.from(chunk)
      size += buffer.length
      if (size > MAX_BODY_BYTES) throw new Error('ACCOUNT_PROXY_BODY_TOO_LARGE')
      chunks.push(buffer)
    }
    body = Buffer.concat(chunks)
  }
  if (body.length > MAX_BODY_BYTES) throw new Error('ACCOUNT_PROXY_BODY_TOO_LARGE')
  return body.length ? body : undefined
}

export function createAccountProxy({ origin, fetchImpl = httpsFetch, timeoutMs = 10000, log = console.info } = {}) {
  return async function accountProxy(request, response) {
    const requestId = randomUUID()
    const started = Date.now()
    const method = String(request.method || 'GET').toUpperCase()
    const write = !['GET', 'HEAD', 'OPTIONS'].includes(method)
    let target
    let status = 502
    let reason
    let dispatched = false
    const phases = []
    response.setHeader('Cache-Control', 'private, no-store, max-age=0')
    response.setHeader('CDN-Cache-Control', 'no-store')
    response.setHeader('Vercel-CDN-Cache-Control', 'no-store')
    response.setHeader('Vary', 'Cookie, Origin')
    response.setHeader('X-Account-Request-Id', requestId)
    try {
      if (!origin) throw new Error('ACCOUNT_PROXY_CONFIGURATION')
      if (!METHODS.has(method)) throw new Error('ACCOUNT_PROXY_METHOD')
      target = upstreamUrl(request, origin)
      const headers = new Headers({ Accept: 'application/json', 'X-Request-Id': requestId })
      for (const name of ['origin', 'content-type', 'user-agent', 'accept-language']) {
        const value = request.headers[name]
        if (typeof value === 'string') headers.set(name, value)
      }
      const cookie = sessionCookies(request.headers.cookie)
      if (cookie) headers.set('Cookie', cookie)
      const body = await requestBody(request)
      dispatched = true
      const upstream = await fetchImpl(target, {
        method, headers, body, redirect: 'manual', cache: 'no-store',
        signal: AbortSignal.timeout(timeoutMs)
      }, phases)
      if (upstream.status >= 300 && upstream.status < 400) throw new Error('ACCOUNT_PROXY_REDIRECT')
      const contentType = upstream.headers.get('content-type') || ''
      if (upstream.status !== 204 && method !== 'HEAD' && !contentType.includes('application/json')) {
        throw new Error('ACCOUNT_PROXY_INVALID_RESPONSE')
      }
      // Read the whole response before setting success headers; the fetch deadline also covers a stalled body.
      const bytes = Buffer.from(await upstream.arrayBuffer())
      status = upstream.status
      response.statusCode = status
      response.setHeader('Content-Type', contentType || 'application/json; charset=utf-8')
      const retryAfter = upstream.headers.get('retry-after')
      if (retryAfter) response.setHeader('Retry-After', retryAfter)
      const cookies = upstream.headers.getSetCookie().filter(value => COOKIE_NAMES.has(value.split('=', 1)[0]))
      if (cookies.length) response.setHeader('Set-Cookie', cookies)
      response.end(method === 'HEAD' ? undefined : bytes)
    } catch (error) {
      reason = error.name === 'TimeoutError' || error.name === 'AbortError' ? 'ACCOUNT_PROXY_TIMEOUT' : error.message
      status = reason === 'ACCOUNT_PROXY_PATH' ? 400 : reason === 'ACCOUNT_PROXY_METHOD' ? 405
        : reason === 'ACCOUNT_PROXY_BODY_TOO_LARGE' ? 413 : reason === 'ACCOUNT_PROXY_CONFIGURATION' ? 503
          : reason === 'ACCOUNT_PROXY_TIMEOUT' ? 504 : 502
      response.statusCode = status
      response.setHeader('Content-Type', 'application/json; charset=utf-8')
      response.end(JSON.stringify({
        error: reason?.startsWith('ACCOUNT_PROXY_') ? reason : 'ACCOUNT_PROXY_UNAVAILABLE',
        message: write && dispatched ? '提交结果尚未确认，请刷新相关状态后核对。' : '账号服务暂时无法连接，请稍后重试。',
        outcomeUnknown: write && dispatched, requestId
      }))
    } finally {
      log(JSON.stringify({event: 'account_proxy', requestId, method, path: target?.pathname || '/invalid',
        region: process.env.VERCEL_REGION || 'local', phases,
        status, elapsedMs: Date.now() - started, ...(reason ? {reason: reason?.startsWith('ACCOUNT_PROXY_') ? reason : 'UPSTREAM_ERROR'} : {})}))
    }
  }
}

export default createAccountProxy({ origin: process.env.ACCOUNT_API_ORIGIN })
