import { getStaffDirectoryGroup } from './staffDirectoryGroups.js'
import { getDesignPreview } from '../features/fd-design/designPreview.js'
import { translateUiText } from './uiText.js'
import { normalizeLocale } from './locales.js'

const TITLE_SUFFIX = '薯条杯'
const DEFAULT_PAGE_LABEL = '赛事中心'

function normalizePathname(pathname = '/') {
  const path = String(pathname || '/').split('?')[0].replace(/\/+$/g, '')
  return path || '/'
}

function isFollowingMatchView(search = '') {
  const params = new URLSearchParams(String(search || '').replace(/^\?/, ''))
  const tab = String(params.get('tab') || '').toLowerCase()
  return params.get('following') === '1' || tab === 'following'
}

export function buildFriesCupTitle(pageLabel = DEFAULT_PAGE_LABEL, locale = 'zh-CN') {
  const label = String(pageLabel || '').trim() || DEFAULT_PAGE_LABEL
  const language = normalizeLocale(locale)
  const suffix = language === 'zh-CN' ? TITLE_SUFFIX : language === 'zh-TW' ? '薯條杯' : 'Fries Cup'
  return `${translateUiText(label, language)} | ${suffix}`
}

export function getDataCenterPageLabel(pathname = '/', search = '') {
  const path = normalizePathname(pathname)

  if (path === '/') return DEFAULT_PAGE_LABEL
  if (path === '/schedule') return '赛程赛果'
  if (path === '/matches') return isFollowingMatchView(search) ? '我的关注' : '赛程赛果'
  if (/^\/matches\/[^/]+\/room$/.test(path)) return '比赛房间'
  if (/^\/matches\/[^/]+$/.test(path)) return '比赛详情'
  if (path === '/me') return '我的空间'
  if (path === '/following') return '我的关注'
  if (path === '/advance') return '晋级形势'
  if (path === '/standings') return '积分排名'
  if (path === '/leaderboard') return '数据排行'
  if (path === '/players') return '参赛选手'
  if (/^\/players\/[^/]+\/analysis$/.test(path)) return getDesignPreview(search) === 'original' ? '选手数据分析' : '竞技分析'
  if (/^\/players\/[^/]+\/journey$/.test(path)) return '赛季征程'
  if (/^\/players\/[^/]+$/.test(path)) return '选手详情'
  if (path === '/roster') return '参赛阵容'
  if (path === '/teams') return '参赛战队'
  if (/^\/teams\/[^/]+\/journey$/.test(path)) return '赛季征程'
  if (/^\/teams\/[^/]+\/analysis$/.test(path)) return '竞技分析'
  if (/^\/teams\/[^/]+$/.test(path)) return '战队详情'
  if (/^\/staff\/[^/]+$/.test(path)) return '职员档案'
  if (path === '/staff') {
    const params = new URLSearchParams(search)
    const design = getDesignPreview(search)
    if (design === 'original') return '赛事人员'
    return design === 'kpr5' || params.has('group')
      ? getStaffDirectoryGroup(params) === 'team' ? '战队职员' : '赛事职员'
      : '赛事人员'
  }
  if (path === '/heroes') return '英雄数据'
  if (path === '/maps') return '地图数据'
  if (/^\/maps\/[^/]+$/.test(path)) return '地图详情'
  if (path === '/review') return '赛季回顾'
  if (path === '/fantasy' || path === '/fantasy-classic' || path === '/fantasy-next') return '梦幻经理'
  if (path === '/fantasy/battle') return '梦幻对战'
  if (path === '/shop') return '经理商店'
  if (path === '/champion') return '冠军殿堂'
  if (path === '/career') return '经理生涯'

  return DEFAULT_PAGE_LABEL
}

export function getReviewStoryPageLabel(storyType = '') {
  if (storyType === 'person') return '个人赛季回顾'
  if (storyType === 'player') return '选手回顾'
  if (storyType === 'team') return '战队回顾'
  if (storyType === 'staff') return '赛事人员回顾'
  if (storyType === 'tournament') return '赛事回顾'
  return '赛季回顾'
}
