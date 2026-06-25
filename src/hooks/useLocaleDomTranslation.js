import { useEffect } from 'react'
import { LEGACY_I18N_ATTRIBUTES, translateLegacyText } from '../lib/legacyI18n.js'

const SOURCE_TEXT_KEY = '__friesCupSourceText'
const SOURCE_ATTR_KEY = '__friesCupSourceAttrs'
const SKIP_SELECTOR = 'script, style, noscript, [data-i18n-ignore]'
const CHINESE_RE = /[\u4e00-\u9fff]/

function shouldSkipNode(node) {
  const element = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement
  return Boolean(element?.closest(SKIP_SELECTOR))
}

function translateTextNode(node, locale) {
  if (shouldSkipNode(node)) return

  const current = node.nodeValue || ''
  if (!current.trim()) return

  const source = node[SOURCE_TEXT_KEY]
  if (!source && !CHINESE_RE.test(current)) return

  const translatedSource = source ? translateLegacyText(source, locale) : null

  if (source && current === translatedSource) return
  if (source && locale === 'en-US' && !CHINESE_RE.test(current)) return

  const nextSource = source && locale !== 'en-US' && !CHINESE_RE.test(current) ? source : current
  const nextValue = translateLegacyText(nextSource, locale)

  node[SOURCE_TEXT_KEY] = nextSource
  if (current !== nextValue) node.nodeValue = nextValue
}

function getAttrSources(element) {
  if (!element[SOURCE_ATTR_KEY]) element[SOURCE_ATTR_KEY] = new Map()
  return element[SOURCE_ATTR_KEY]
}

function translateElementAttributes(element, locale) {
  if (shouldSkipNode(element)) return

  const sources = getAttrSources(element)

  LEGACY_I18N_ATTRIBUTES.forEach(attr => {
    if (!element.hasAttribute(attr)) return

    const current = element.getAttribute(attr) || ''
    if (!current.trim()) return

    const source = sources.get(attr)
    if (!source && !CHINESE_RE.test(current)) return

    const translatedSource = source ? translateLegacyText(source, locale) : null

    if (source && current === translatedSource) return
    if (source && locale === 'en-US' && !CHINESE_RE.test(current)) return

    const nextSource = source && locale !== 'en-US' && !CHINESE_RE.test(current) ? source : current
    const nextValue = translateLegacyText(nextSource, locale)

    sources.set(attr, nextSource)
    if (current !== nextValue) element.setAttribute(attr, nextValue)
  })
}

function translateTree(root, locale) {
  if (!root) return

  if (root.nodeType === Node.TEXT_NODE) {
    translateTextNode(root, locale)
    return
  }

  if (root.nodeType !== Node.ELEMENT_NODE) return

  translateElementAttributes(root, locale)

  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        return shouldSkipNode(node) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
      }
    }
  )

  let node = walker.nextNode()
  while (node) {
    if (node.nodeType === Node.TEXT_NODE) translateTextNode(node, locale)
    else translateElementAttributes(node, locale)
    node = walker.nextNode()
  }
}

export function useLocaleDomTranslation(locale, scopeRef) {
  useEffect(() => {
    if (typeof window === 'undefined' || typeof MutationObserver === 'undefined') return undefined
    const scope = scopeRef.current
    if (!scope) return undefined

    let isTranslating = false

    const runTranslation = root => {
      if (isTranslating) return
      isTranslating = true
      try {
        translateTree(root, locale)
      } finally {
        isTranslating = false
      }
    }

    runTranslation(scope)

    const observer = new MutationObserver(records => {
      if (isTranslating) return

      records.forEach(record => {
        if (record.type === 'characterData') {
          runTranslation(record.target)
          return
        }

        if (record.type === 'attributes') {
          runTranslation(record.target)
          return
        }

        record.addedNodes.forEach(node => runTranslation(node))
      })
    })

    observer.observe(scope, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: LEGACY_I18N_ATTRIBUTES
    })

    return () => observer.disconnect()
  }, [locale, scopeRef])
}
