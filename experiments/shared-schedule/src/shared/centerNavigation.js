import { centerUrl } from './centerRoutes.js'
import {publicPageKind} from './centerPaths.js'

const VIEWS = ['overview', 'matches', 'database', 'space', 'roster', 'advance', 'maps', 'heroes', 'staff', 'review', 'history']
const isRoot = page => ['pages/schedule/index', ...['center','archive','directory','ranking','following','evidence','advance','review'].map(kind=>kind+'/pages/index')].includes(String(page?.route || page?.path || '').split('?')[0].replace(/^\/+/, '')) &&
  !['id', 'team', 'player', 'map', 'hero', 'staff', 'story'].some(key => page.options?.[key])

export function createCenterNavigation({ getPages, navigateBack, reLaunch }) {
  let pendingVisit = null
  let switching = null
  function takeVisit() {
    const pages = getPages()
    if (!pendingVisit || pages.length !== pendingVisit.rootIndex + 1 || !isRoot(pages[pages.length - 1])) return null
    const visit = { view: pendingVisit.view }
    pendingVisit = null
    return visit
  }
  function switchTo(view, context = {}) {
    if (switching) return switching
    const destination = VIEWS.includes(view) ? view : 'overview'
    const run = async () => {
      pendingVisit = null
      const pages = getPages()
      for (let index = pages.length - 2; index >= 0; index -= 1) {
        if (!isRoot(pages[index]) || (pages[index].options?.season || 'FCW26') !== (context.seasonId || 'FCW26')) continue
        const actualRoute=String(pages[index].route||pages[index].path||'').replace(/^\/+/, '')
        const actualKind=actualRoute==='pages/schedule/index'?'center':actualRoute.split('/')[0]
        const targetKind=publicPageKind({view:destination,season:context.seasonId})
        if(actualKind!==targetKind)continue
        // Keep the existing controller, including its private search state and
        // "all weeks" selection. Only the requested public section crosses pages.
        pendingVisit = { rootIndex: index, view: destination }
        try { return await navigateBack({ delta: pages.length - index - 1 }) }
        catch (_) { pendingVisit = null; break }
      }
      // A shared detail can be the first page: there is no list to restore.
      return reLaunch({ url: centerUrl({ view: destination }, context) })
    }
    const own = run().finally(() => { if (switching === own) switching = null })
    switching = own
    return own
  }
  return { switchTo, takeVisit }
}
