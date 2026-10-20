export function partnerActivationTarget({ hash = '', search = '', base = import.meta.env?.VITE_SYSTEM_APP_URL || 'https://admin.fries-cup.com' } = {}) {
  try {
    const origin = new URL(base)
    if (!['http:', 'https:'].includes(origin.protocol) || origin.username || origin.password) return ''
    const target = new URL('/activate-partner', origin)
    const fragment = new URLSearchParams(hash.replace(/^#/, ''))
    const query = new URLSearchParams(search)
    const values = fragment.has('token') ? fragment.getAll('token') : query.getAll('token')
    if (values.length === 1 && values[0].length <= 512) target.hash = new URLSearchParams({ token: values[0] }).toString()
    return target.href
  } catch { return '' }
}
