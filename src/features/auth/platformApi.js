const DEFAULT_PLATFORM_API_BASE_URL = '/api/platform'
export const PLATFORM_REQUEST_TIMEOUT_MS = 15000

function normalizeBaseUrl(url) {
  return String(url || DEFAULT_PLATFORM_API_BASE_URL).replace(/\/+$/, '')
}

function normalizePath(path) {
  return String(path || '').startsWith('/') ? path : `/${path}`
}

function getPlatformApiBaseUrl() {
  return normalizeBaseUrl(import.meta.env?.VITE_PLATFORM_API_BASE_URL)
}

function isRawRequestBody(body) {
  return (
    typeof body === 'string' ||
    (typeof FormData !== 'undefined' && body instanceof FormData) ||
    (typeof Blob !== 'undefined' && body instanceof Blob) ||
    (typeof ArrayBuffer !== 'undefined' && body instanceof ArrayBuffer) ||
    (typeof ArrayBuffer !== 'undefined' && ArrayBuffer.isView?.(body))
  )
}

function createHeaders(headers, body) {
  const nextHeaders = { ...(headers || {}) }

  const isFormDataBody = typeof FormData !== 'undefined' && body instanceof FormData
  if (body !== undefined && !isFormDataBody && !nextHeaders['Content-Type'] && !isRawRequestBody(body)) {
    nextHeaders['Content-Type'] = 'application/json'
  }

  return nextHeaders
}

async function readResponse(response) {
  if (response.status === 204) return null

  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('application/json')) return response.json()
  if (response.ok) throw new PlatformApiError('账号接口返回了无效响应，请稍后重试。', { status: 502, data: { error: 'INVALID_API_RESPONSE' } })

  return response.text()
}

export class PlatformApiError extends Error {
  constructor(message, { status, data } = {}) {
    super(message)
    this.name = 'PlatformApiError'
    this.status = status
    this.data = data
  }
}

export function getPlatformApiUrl(path) {
  return `${getPlatformApiBaseUrl()}${normalizePath(path)}`
}

export async function platformRequest(path, {
  body,
  headers,
  signal,
  timeoutMs = PLATFORM_REQUEST_TIMEOUT_MS,
  ...options
} = {}) {
  signal?.throwIfAborted()
  const controller = new AbortController()
  const cancel = () => controller.abort(signal.reason)
  signal?.addEventListener('abort', cancel, { once: true })
  const readOnly = ['GET', 'HEAD'].includes(String(options.method || 'GET').toUpperCase())
  const timeout = new PlatformApiError(readOnly
    ? '读取超时，请检查网络后重试。'
    : '请求超时，提交结果尚未确认。请先刷新相关状态，核对是否已生效后再决定是否重试。', {
    data: { error: 'REQUEST_TIMEOUT', outcomeUnknown: !readOnly }
  })
  const timer = setTimeout(() => controller.abort(timeout),
    Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : PLATFORM_REQUEST_TIMEOUT_MS)
  let rejectAbort
  const aborted = new Promise((_, reject) => { rejectAbort = () => reject(controller.signal.reason) })
  controller.signal.addEventListener('abort', rejectAbort, { once: true })

  try {
    // The deadline also covers a stalled response body. Never retry a write:
    // a disconnected client cannot infer whether the server committed it.
    const request = (async () => {
      const response = await fetch(getPlatformApiUrl(path), {
        ...options,
        signal: controller.signal,
        credentials: 'include',
        cache: 'no-store',
        headers: createHeaders(headers, body),
        body: isRawRequestBody(body) ? body : body === undefined ? undefined : JSON.stringify(body)
      })
      const data = await readResponse(response)
      if (!response.ok) {
        const message = typeof data === 'object' && data !== null
          ? data.message || data.error || `Request failed with status ${response.status}`
          : data || `Request failed with status ${response.status}`

        throw new PlatformApiError(message, { status: response.status, data })
      }
      return data
    })()
    return await Promise.race([request, aborted])
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', cancel)
    controller.signal.removeEventListener('abort', rejectAbort)
  }
}
