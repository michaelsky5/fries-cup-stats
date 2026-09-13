export const DESIGN_QUERY_KEY = 'design'
// Build-time fallback for a visual rollback; explicit shared links stay valid.
export const DEFAULT_PUBLIC_DESIGN = import.meta.env?.VITE_DEFAULT_PUBLIC_DESIGN === 'original' ? 'original' : 'kpr5'

export function getDesignPreview(search = '', defaultDesign = DEFAULT_PUBLIC_DESIGN) {
  const value = new URLSearchParams(search).get(DESIGN_QUERY_KEY)
  return ['fd', 'kpr', 'kpr3', 'kpr4', 'kpr5', 'original'].includes(value) ? value : defaultDesign
}

export function shouldShowDesignPreview(search = '', isDevelopment = import.meta.env?.DEV === true) {
  return isDevelopment && new URLSearchParams(search).get('designPreview') === '1'
}

export function withDesignPreview(path, design) {
  if (!design || !path || /^[a-z][a-z0-9+.-]*:/i.test(path) || path.startsWith('//') || path.startsWith('#')) return path
  const [pathAndQuery, hash] = path.split('#')
  const [pathname, query = ''] = pathAndQuery.split('?')
  const params = new URLSearchParams(query)
  params.set(DESIGN_QUERY_KEY, design)
  return `${pathname}?${params}${hash ? `#${hash}` : ''}`
}

// Alternate rules are scoped to their data-design value. Explicit original
// links retain their existing cascade after the public default changes.
export function combineDesignStyles(original, preview) {
  return Object.fromEntries(
    [...new Set([...Object.keys(original), ...Object.keys(preview)])]
      .map(key => [key, [original[key], preview[key]].filter(Boolean).join(' ')])
  )
}
