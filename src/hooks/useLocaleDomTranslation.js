import { useEffect } from 'react'
import { LEGACY_I18N_ATTRIBUTES, resolveTrackedLegacyTranslation } from '../lib/legacyI18n.js'

const SOURCE_TEXT_KEY = '__friesCupSourceText'
const RENDERED_TEXT_KEY = '__friesCupRenderedText'
const SOURCE_ATTR_KEY = '__friesCupSourceAttrs'
const RENDERED_ATTR_KEY = '__friesCupRenderedAttrs'
const SKIP_SELECTOR = 'script, style, noscript, [data-i18n-ignore]'

function shouldSkipNode(node) {
  const element = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement
  return Boolean(element?.closest(SKIP_SELECTOR))
}

function translateTextNode(node, locale) {
  if (shouldSkipNode(node)) return

  const current = node.nodeValue || ''
  if (!current.trim()) return

  const translation = resolveTrackedLegacyTranslation({
    current,
    source: node[SOURCE_TEXT_KEY],
    rendered: node[RENDERED_TEXT_KEY],
    locale
  })
  if (!translation) return

  node[SOURCE_TEXT_KEY] = translation.source
  node[RENDERED_TEXT_KEY] = translation.rendered
  if (current !== translation.value) node.nodeValue = translation.value
}

function getAttrSources(element) {
  if (!element[SOURCE_ATTR_KEY]) element[SOURCE_ATTR_KEY] = new Map()
  return element[SOURCE_ATTR_KEY]
}

function getAttrRenderedValues(element) {
  if (!element[RENDERED_ATTR_KEY]) element[RENDERED_ATTR_KEY] = new Map()
  return element[RENDERED_ATTR_KEY]
}

function translateElementAttributes(element, locale) {
  if (shouldSkipNode(element)) return

  const sources = getAttrSources(element)
  const renderedValues = getAttrRenderedValues(element)

  LEGACY_I18N_ATTRIBUTES.forEach(attr => {
    if (!element.hasAttribute(attr)) return

    const current = element.getAttribute(attr) || ''
    if (!current.trim()) return

    const translation = resolveTrackedLegacyTranslation({
      current,
      source: sources.get(attr),
      rendered: renderedValues.get(attr),
      locale
    })
    if (!translation) return

    sources.set(attr, translation.source)
    renderedValues.set(attr, translation.rendered)
    if (current !== translation.value) element.setAttribute(attr, translation.value)
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
