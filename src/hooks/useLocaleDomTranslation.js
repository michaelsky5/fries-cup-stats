import { useEffect } from 'react'
import { LEGACY_I18N_ATTRIBUTES } from '../lib/legacyI18n.js'
import { translateLegacyValue } from '../lib/legacyTranslationState.js'

const SOURCE_TEXT_KEY = '__friesCupSourceText'
const SOURCE_ATTR_KEY = '__friesCupSourceAttrs'
const SKIP_SELECTOR = 'script, style, noscript, [contenteditable="true"], [data-i18n-ignore]'

function shouldSkipNode(node) {
  const element = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement
  return Boolean(element?.closest(SKIP_SELECTOR))
}

function translateTextNode(node, locale, translate) {
  if (shouldSkipNode(node)) return
  if (node.parentElement?.matches('textarea, input')) return

  const current = node.nodeValue || ''
  if (!current.trim()) return

  const previous = node[SOURCE_TEXT_KEY]
  const next = translateLegacyValue(current, previous, locale, translate)
  node[SOURCE_TEXT_KEY] = next
  if (current !== next.rendered) node.nodeValue = next.rendered
}

function getAttrSources(element) {
  if (!element[SOURCE_ATTR_KEY]) element[SOURCE_ATTR_KEY] = new Map()
  return element[SOURCE_ATTR_KEY]
}

function translateElementAttributes(element, locale, translate) {
  if (shouldSkipNode(element)) return

  const sources = getAttrSources(element)

  LEGACY_I18N_ATTRIBUTES.forEach(attr => {
    if (!element.hasAttribute(attr)) return

    const current = element.getAttribute(attr) || ''
    if (!current.trim()) return

    const previous = sources.get(attr)
    const next = translateLegacyValue(current, previous, locale, translate)
    sources.set(attr, next)
    if (current !== next.rendered) element.setAttribute(attr, next.rendered)
  })
}

function translateTree(root, locale, translate) {
  if (!root) return

  if (root.nodeType === Node.TEXT_NODE) {
    translateTextNode(root, locale, translate)
    return
  }

  if (root.nodeType !== Node.ELEMENT_NODE) return

  translateElementAttributes(root, locale, translate)

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
    if (node.nodeType === Node.TEXT_NODE) translateTextNode(node, locale, translate)
    else translateElementAttributes(node, locale, translate)
    node = walker.nextNode()
  }
}

export function useLocaleDomTranslation(locale, scopeRef, translate) {
  useEffect(() => {
    if (typeof window === 'undefined' || typeof MutationObserver === 'undefined') return undefined
    const scope = scopeRef.current
    if (!scope) return undefined

    let isTranslating = false

    const runTranslation = root => {
      if (isTranslating) return
      isTranslating = true
      try {
        translateTree(root, locale, translate)
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
  }, [locale, scopeRef, translate])
}
