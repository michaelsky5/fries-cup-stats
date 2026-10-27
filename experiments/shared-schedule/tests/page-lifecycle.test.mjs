import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { Script } from 'node:vm'
import React from 'react'
import { renderToString } from 'react-dom/server'
import { decodePublicOptions,publicPageKind,centerEntryUrl } from '../src/shared/centerPaths.js'

const require = createRequire(import.meta.url)
const { transformSync } = require('@babel/core')

function loadPage(pageKind='center') {
  let onLoad, requestCalls = 0, selectedParams
  const taro = {
    __esModule: true,
    default: { stopPullDownRefresh() {} },
    // This is the actual problematic framework state observed on the phone.
    useRouter: () => null,
    useLoad: callback => { onLoad = callback },
    useDidShow() {},
    usePullDownRefresh() {},
    useShareAppMessage() {}
  }
  const mockRequire = name => {
    if (name === '@tarojs/taro') return taro
    if (name === '../../shared/nativeLocales') return { subscribeLocale: () => () => undefined, getActiveLocale: () => 'zh-CN', activateLocale: () => 'zh-CN' }
    if (name === '../../shared/nativeCopy') return { protectPublicIdentities() {} }
    if (name === '../../shared/SharedCenter') return { __esModule: true, default: props => React.createElement('p', null, props.loading ? 'loading' : 'ready') }
    if (name === '../../shared/ScheduleRuntimeBoundary') return { __esModule: true, default: props => props.children }
    if (name === '../../platform') return {
      readPublicSchedule: async () => { requestCalls += 1; return { data: { matches: [] }, stale: false } },
      checkPublicConnection: async () => 'connected', finishPullDownRefresh() {}, storedSeasonId: () => 'FCR26'
    }
    if (name === '../../shared/model') return { initialSelection: (_data, params) => { selectedParams = params; return {} } }
    if (name === '../../shared/centerModel') return { routeView: () => 'matches' }
    if (name === '../../shared/followingStore') return { emptyFollowing: () => ({ teams: [], players: [] }), readFollowing: () => ({ data: { teams: [], players: [] }, error: '' }) }
    if (name === '../../shared/publicSeasons') return { getSeasonById: id => ({ id: id || 'FCW26', competitionFormat: 'WEEKLY' }), isWeeklySeason: () => true }
    if (name === '../../shared/browseState') return { createBrowseState: () => ({}), updateBrowseState: state => state }
    if (name === '../../shared/centerRoutes') return { centerShare: () => ({ title: '薯条杯赛事助手', path: '/pages/schedule/index' }) }
    if (name === '../../shared/centerPaths') return { decodePublicOptions,publicPageKind,centerEntryUrl }
    if (name === '../../shared/publicScheduleReader') return { formatRequestDiagnostic: () => '' }
    return require(name)
  }
  const source = readFileSync(new URL('../src/center/pages/PublicPage.jsx', import.meta.url), 'utf8')
  const { code } = transformSync(source, {
    filename: 'schedule.jsx', babelrc: false, configFile: false,
    presets: [['@babel/preset-react', { runtime: 'automatic' }]],
    plugins: ['@babel/plugin-transform-modules-commonjs']
  })
  const module = { exports: {} }
  new Script(`(function(require,module,exports){${code}\n})`).runInThisContext()(mockRequire, module, module.exports)
  return {
    Page: () => React.createElement(module.exports.default,{pageKind,Render:props=>React.createElement('p',null,props.loading?'loading':'ready')}),
    get onLoad() { return onLoad },
    get requestCalls() { return requestCalls },
    get selectedParams() { return selectedParams }
  }
}

test('first render does not dereference a null router or read before the native onLoad event', () => {
  const page = loadPage()
  assert.match(renderToString(React.createElement(page.Page)), /loading/)
  assert.equal(page.requestCalls, 0)
  assert.equal(typeof page.onLoad, 'function')
})

test('first request uses onLoad query options even when the framework global router is null', async () => {
  const page = loadPage('match')
  renderToString(React.createElement(page.Page))
  const params = { id: 'FCW26-SWISS-R1-M04', cycle: 'cycle-1', week: 'week-2' }
  await page.onLoad(params)
  assert.equal(page.requestCalls, 1)
  assert.deepEqual(page.selectedParams, { ...params, season: 'FCW26' })
})
