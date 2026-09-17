import { Buffer } from 'node:buffer'
import process from 'node:process'
import { proxyRequest } from '../edge-functions/api/[[path]].js'
import { createHttpsTransport } from './account.js'

const ORIGIN = 'https://admin.fries-cup.com'
const BODY_LIMIT = 3 * 1024 * 1024

export function createProductionFetch({ transport = createHttpsTransport(), log = console.info } = {}) {
  return async (url, options) => {
    const phases = []
    const started = Date.now()
    let diagnosticEgress
    try {
      const upstream = await transport(url, {
        ...options, body: options.body ? Buffer.from(options.body) : undefined
      }, phases)
      const bytes = await upstream.arrayBuffer()
      return new Response(options.method === 'HEAD' || upstream.status === 204 ? null : bytes,
        { status: upstream.status, headers: upstream.headers })
    } catch (error) {
      if (process.env.VERCEL_ENV === 'preview' && error.message === 'ACCOUNT_PROXY_CONNECT_TIMEOUT') {
        try {
          const probe = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(1500), redirect: 'error' })
          const address = (await probe.json()).ip
          if (/^(\d{1,3}\.){3}\d{1,3}$/.test(address || '')) diagnosticEgress = address
        } catch { diagnosticEgress = 'unavailable' }
      }
      throw error
    } finally {
      // Connection phases only. Never include a URL, identity, headers or body.
      log(JSON.stringify({ event: 'platform_connection', phases, elapsedMs: Date.now() - started,
        ...(diagnosticEgress ? { diagnosticEgress } : {}) }))
    }
  }
}

const productionFetch = createProductionFetch()

// Share the accepted proxy's permission, upload and cache policy. Published
// snapshots retain Vercel's native external rewrite for large archived payloads.
export function createPlatformHandler({ fetchImpl = productionFetch } = {}) {
  return async function handler(req, res) {
    res.setHeader('Cache-Control', 'private, no-store')
    res.setHeader('CDN-Cache-Control', 'no-store')
    res.setHeader('Vercel-CDN-Cache-Control', 'no-store')
    try {
      const input = new URL(req.url, `https://${req.headers.host}`)
      const paths = input.searchParams.getAll('platformPath')
      if (paths.length !== 1 || !/^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_.-]+)*$/.test(paths[0])
        || paths[0].split('/').some(part => part === '.' || part === '..')) {
        res.statusCode = 400
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        return res.end(JSON.stringify({ error: 'INVALID_API_PATH' }))
      }
      input.pathname = `/api/platform/${paths[0]}`
      input.searchParams.delete('platformPath')
      // Vercel also appends the :path* capture as a query value. It is routing
      // metadata, not an API filter; strict season queries must not receive it.
      input.searchParams.delete('path')
      for (const key of ['_vercel_share', 'x-vercel-protection-bypass', 'x-vercel-set-bypass-cookie']) input.searchParams.delete(key)
      const headers = new Headers()
      for (const [key, value] of Object.entries(req.headers)) if (typeof value === 'string') headers.set(key, value)
      let body
      if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        if (Number(headers.get('content-length')) > BODY_LIMIT) throw new Error('REQUEST_TOO_LARGE')
        if (req.body !== undefined) {
          body = Buffer.isBuffer(req.body) ? req.body : Buffer.from(typeof req.body === 'string' ? req.body : JSON.stringify(req.body))
        } else {
          const chunks = []
          let size = 0
          for await (const chunk of req) {
            const bytes = Buffer.from(chunk)
            size += bytes.length
            if (size > BODY_LIMIT) throw new Error('REQUEST_TOO_LARGE')
            chunks.push(bytes)
          }
          body = Buffer.concat(chunks)
        }
        if (body.length > BODY_LIMIT) throw new Error('REQUEST_TOO_LARGE')
      }
      const request = new Request(input, { method: req.method, headers, ...(body?.length ? { body } : {}) })
      const response = await proxyRequest(request, {
        platformOrigin: ORIGIN, publicOrigin: ORIGIN, rehearsal: false, environment: 'production',
        fetchImpl: (url, options) => fetchImpl(url, { ...options, signal: AbortSignal.timeout(12000) })
      })
      // Read before committing status: body failures cannot look like success.
      // Submitted writes are never automatically replayed.
      const bytes = Buffer.from(await response.arrayBuffer())
      res.statusCode = response.status
      for (const [key, value] of response.headers) if (key !== 'set-cookie') res.setHeader(key, value)
      const cookies = response.headers.getSetCookie()
      if (cookies.length) res.setHeader('Set-Cookie', cookies)
      if (response.ok && /\bpublic\b/.test(response.headers.get('cache-control') || '')) {
        res.removeHeader('CDN-Cache-Control')
        res.removeHeader('Vercel-CDN-Cache-Control')
      }
      res.end(req.method === 'HEAD' ? undefined : bytes)
    } catch (error) {
      const tooLarge = error.message === 'REQUEST_TOO_LARGE'
      res.statusCode = tooLarge ? 413 : 502
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.end(JSON.stringify({ error: tooLarge ? 'REQUEST_TOO_LARGE' : 'UPSTREAM_UNAVAILABLE',
        message: tooLarge ? '请求内容过大，请缩小后重试。' : '连接暂时不可用，请刷新状态后核对。',
        outcomeUnknown: !tooLarge && !['GET', 'HEAD', 'OPTIONS'].includes(req.method) }))
    }
  }
}

export default createPlatformHandler()
