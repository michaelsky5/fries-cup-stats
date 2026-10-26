import test from 'node:test'
import assert from 'node:assert/strict'
import { createCenterNavigation } from '../src/shared/centerNavigation.js'

const root = (kind='center') => ({ route: kind+'/pages/index', options: { view: 'overview' } })
const detail = params => ({ route: 'pages/schedule/index', options: params })
function runtime(initialPages, failure) {
  let pages = initialPages
  const calls = []
  const navigation = createCenterNavigation({
    // H5 returns new objects on every call; identity must not be required.
    getPages: () => pages.map(page => ({ ...page })),
    navigateBack: async options => { calls.push(['back', options]); if (failure) throw failure; pages = pages.slice(0, -options.delta) },
    reLaunch: async options => { calls.push(['launch', options]); pages = [root()] }
  })
  return { navigation, calls, setPages: next => { pages = next } }
}

test('detail dock returns across multiple details to the existing root without resetting its query state', async () => {
  const list = root('ranking')
  list.queryState = { search: '突突', metric: 'avg_dmg', page: 2, weekId: 'all' }
  const originalState = list.queryState
  const app = runtime([list, detail({ player: 'P' }), detail({ team: 'A' })])
  await app.navigation.switchTo('database', { cycleId: 'C', weekId: 'W2', query: 'private' })
  assert.deepEqual(app.calls, [['back', { delta: 2 }]])
  assert.equal(list.queryState, originalState)
  assert.deepEqual(app.navigation.takeVisit(), { view: 'database' })
  assert.equal(app.navigation.takeVisit(), null)
})

test('a pending root visit cannot be consumed by an intermediate detail page', async () => {
  let pages = [root('following'), detail({ player: 'P' }), detail({ team: 'A' })], finish
  const nav = createCenterNavigation({ getPages: () => pages, navigateBack: () => new Promise(resolve => { finish = resolve }), reLaunch: () => assert.fail('unexpected launch') })
  const switching = nav.switchTo('space')
  assert.equal(nav.takeVisit(), null)
  pages = pages.slice(0, 2)
  assert.equal(nav.takeVisit(), null)
  pages = pages.slice(0, 1)
  assert.deepEqual(nav.takeVisit(), { view: 'space' })
  finish()
  await switching
})

test('cold shared details and detail-only stacks open the requested public list with safe context', async () => {
  for (const stack of [[detail({ player: 'P' })], [detail({ team: 'A' }), detail({ player: 'P' })]]) {
    const app = runtime(stack)
    await app.navigation.switchTo('roster', { cycleId: 'C', weekId: 'all', query: 'private', token: 'secret' })
    assert.deepEqual(app.calls, [['launch', { url: '/directory/pages/index?view=roster&cycle=C&week=all' }]])
    assert.equal(app.navigation.takeVisit(), null)
  }
})

test('a different app page is not reused as the event center; unknown sections use public overview', async () => {
  const app = runtime([{ route: 'pages/another/index', options: {} }, detail({ id: 'M' })])
  await app.navigation.switchTo('admin')
  assert.deepEqual(app.calls, [['launch', { url: '/center/pages/index?view=overview' }]])
})

test('failed native back navigation clears the pending visit before a safe list fallback', async () => {
  const app = runtime([root(), detail({ id: 'M' })], Error('back failed'))
  await app.navigation.switchTo('matches', { cycleId: 'C' })
  assert.deepEqual(app.calls, [['back', { delta: 1 }], ['launch', { url: '/center/pages/index?view=matches&cycle=C' }]])
  assert.equal(app.navigation.takeVisit(), null)
})

test('rapid dock taps share one transition instead of popping the page stack twice', async () => {
  let finish, backCalls = 0
  const nav = createCenterNavigation({ getPages: () => [root('ranking'), detail({ player: 'P' })], navigateBack: () => { backCalls += 1; return new Promise(resolve => { finish = resolve }) }, reLaunch: () => assert.fail('unexpected launch') })
  const first = nav.switchTo('database')
  const second = nav.switchTo('space')
  assert.equal(first, second)
  assert.equal(backCalls, 1)
  finish()
  await first
})
