import assert from 'node:assert/strict'
import { test } from 'node:test'
import { browserLocale, regionLocale, initialLocale, initializeVisitorLocale } from '../src/lib/visitorLocale.js'
import { LOCALE_STORAGE_KEY, LEGACY_REVIEW_LOCALE_STORAGE_KEY, getStoredLocale } from '../src/lib/locales.js'
import localeResponse from '../edge-functions/api/locale.js'
import edgeRequest from '../edge-functions/api/[[path]].js'

test('explicit link and existing preference override browser and region hints', () => {
  assert.equal(initialLocale({ queryLocale: 'ko', savedLocale: 'en-US', languages: ['zh-CN'], countryCode: 'CN' }), 'ko-KR')
  assert.equal(initialLocale({ savedLocale: 'zh-TW', languages: ['en-US'], countryCode: 'SG' }), 'zh-TW')
  assert.equal(initialLocale({ queryLocale: 'invalid', savedLocale: 'en-US', countryCode: 'CN' }), 'en-US')
  assert.equal(initialLocale({ languages: ['fr-FR', 'zh-Hant', 'en-US'], countryCode: 'SG' }), 'zh-TW')
  assert.equal(initialLocale({ languages: ['en-GB'], countryCode: 'CN' }), 'en-US')
})

test('region fallback covers supported languages and defaults other regions to English', () => {
  for (const countryCode of ['HK', 'MO', 'TW']) assert.equal(regionLocale(countryCode), 'zh-TW')
  assert.equal(regionLocale('cn'), 'zh-CN')
  assert.equal(regionLocale('KR'), 'ko-KR')
  for (const countryCode of ['SG', 'JP', 'US', 'MY']) assert.equal(regionLocale(countryCode), 'en-US')
  assert.equal(regionLocale(null), null)
  assert.equal(regionLocale('Singapore'), null)
  assert.equal(browserLocale(['de-DE', 'ko-KR']), 'ko-KR')
  assert.equal(initialLocale({ languages: ['fr-FR'] }), 'en-US')
})

function browser({ lang = '', languages = ['en-US'], saved, legacy, blocked = false } = {}) {
  const stored = new Map([[LOCALE_STORAGE_KEY, saved], [LEGACY_REVIEW_LOCALE_STORAGE_KEY, legacy]])
  const url = new URL(`https://test.invalid/participate/FCW26?season=FCW2026${lang ? `&lang=${lang}` : ''}#join=test-only`)
  return { stored, window: {
    location: { href: url.href, pathname: url.pathname, search: url.search, hash: url.hash },
    navigator: { languages },
    history: { state: { test: true }, replaceState(state, unused, path) { const next = new URL(path, url); this.state = state; Object.assign(this.owner.location, { href: next.href, search: next.search, hash: next.hash }); } },
    localStorage: { getItem: key => { if (blocked) throw Error('blocked'); return stored.get(key) }, setItem: (key, value) => { if (blocked) throw Error('blocked'); stored.set(key, value) } }
  } }
}

async function withBrowser(options, action) {
  const original = globalThis.window
  const fixture = browser(options)
  fixture.window.history.owner = fixture.window
  globalThis.window = fixture.window
  try { await action(fixture) } finally { if (original === undefined) delete globalThis.window; else globalThis.window = original }
}

test('startup skips network for a link, saved/legacy preference or supported browser language', async () => {
  const cases = [
    [{ lang: 'ko', saved: 'en-US' }, 'ko-KR'],
    [{ saved: 'zh-TW' }, 'zh-TW'],
    [{ legacy: 'zh-CN', languages: ['ko-KR'] }, 'zh-CN'],
    [{ languages: ['zh-Hant-HK'] }, 'zh-TW'],
    [{ languages: ['ko-KR'] }, 'ko-KR']
  ]
  for (const [options, expected] of cases) await withBrowser(options, async fixture => {
    let requests = 0
    assert.equal(await initializeVisitorLocale({ fetchImpl: async () => { requests++; throw Error('unexpected network') } }), expected)
    assert.equal(requests, 0)
    assert.equal(fixture.stored.get(LOCALE_STORAGE_KEY), expected)
  })
})

test('unsupported browser uses same-origin region hint without credentials', async () => {
  await withBrowser({ languages: ['ja-JP'] }, async () => {
    assert.equal(await initializeVisitorLocale({ fetchImpl: async (url, options) => {
      assert.equal(url, '/api/locale')
      assert.equal(options.credentials, 'omit')
      assert.equal(options.cache, 'no-store')
      return Response.json({ countryCode: 'KR' })
    } }), 'ko-KR')
    assert.equal(getStoredLocale(), 'ko-KR')
  })
})

test('failed, SPA HTML and hung region lookups cannot block startup', async () => {
  for (const fetchImpl of [async () => { throw Error('offline') }, async () => new Response('<html></html>'), async () => Response.json({}, { status: 503 })]) {
    await withBrowser({ languages: ['fr-FR'] }, async () => assert.equal(await initializeVisitorLocale({ fetchImpl }), 'en-US'))
  }
  await withBrowser({ languages: [] }, async () => {
    let signal
    const locale = await initializeVisitorLocale({ timeoutMs: 20, fetchImpl: async (url, options) => { signal = options.signal; return new Promise(() => {}) } })
    assert.equal(locale, 'en-US')
    assert.equal(signal.aborted, true)
  })
})

test('blocked storage retains detected language in memory and invalid URL keeps season/hash', async () => {
  await withBrowser({ blocked: true, languages: ['ko-KR'] }, async () => {
    assert.equal(await initializeVisitorLocale(), 'ko-KR')
    assert.equal(getStoredLocale(), 'ko-KR')
  })
  await withBrowser({ lang: 'invalid', languages: ['en-US'] }, async fixture => {
    assert.equal(await initializeVisitorLocale(), 'en-US')
    const url = new URL(fixture.window.location.href)
    assert.equal(url.searchParams.get('lang'), 'en')
    assert.equal(url.searchParams.get('season'), 'FCW2026')
    assert.equal(url.hash, '#join=test-only')
  })
})

test('country endpoint returns only a private hint and ignores user-supplied country headers', async () => {
  const request = new Request('https://test.invalid/api/locale', { headers: { 'x-country': 'US', cookie: 'secret=test-only' } })
  Object.defineProperty(request, 'eo', { value: { geo: { countryCodeAlpha2: 'KR', cityName: 'private', latitude: 1, longitude: 2 }, clientIp: '192.0.2.1' } })
  const response = localeResponse({ request })
  assert.deepEqual(await response.json(), { countryCode: 'KR' })
  assert.match(response.headers.get('cache-control'), /private, no-store/)
  assert.equal(response.headers.get('cdn-cache-control'), 'no-store')
  assert.deepEqual(await localeResponse({ request: new Request(request.url, { headers: { 'x-country': 'US' } }) }).json(), { countryCode: null })
  assert.equal((await localeResponse({ request: new Request(request.url, { method: 'HEAD' }) }).text()), '')
  assert.equal(localeResponse({ request: new Request(request.url, { method: 'POST' }) }).status, 405)
  assert.deepEqual(await (await edgeRequest({ request })).json(), { countryCode: 'KR' })
})
