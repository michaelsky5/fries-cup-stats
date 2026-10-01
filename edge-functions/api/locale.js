// Country-level hint only; never return the visitor IP, city or coordinates.
// EdgeOne geo API: https://edgeone.ai/document/63633
export default function onRequest({ request }) {
  const method = request.method.toUpperCase()
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'private, no-store, max-age=0',
    'CDN-Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'X-Robots-Tag': 'noindex, nofollow, noarchive, nosnippet'
  }
  if (!['GET', 'HEAD'].includes(method)) return new Response(null, { status: 405, headers: { ...headers, Allow: 'GET, HEAD' } })
  const raw = String(request.eo?.geo?.countryCodeAlpha2 || '').trim().toUpperCase()
  const countryCode = /^[A-Z]{2}$/.test(raw) ? raw : null
  return new Response(method === 'HEAD' ? null : JSON.stringify({ countryCode }), { headers })
}
