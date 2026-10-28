import { getPrimaryNavigation as canonicalNavigation } from '../generated/mobile/publicNavigation.js'
export { getWeeklyNavigationPath,getNavLabel,getPersonalNavItem,getEventNavigation,PRIMARY_NAV } from '../generated/mobile/publicNavigation.js'
export function getPrimaryNavigation(isAuthenticated=false) {
  return [...canonicalNavigation(isAuthenticated).filter(item=>item.group!=='play'),
    ...[['maps','/maps','地图图谱','MAP ATLAS','맵 도감'],['heroes','/heroes','英雄档案','HEROES','영웅 기록'],['staff','/staff','工作人员','EVENT STAFF','운영진'],['review','/review','赛事回顾','SEASON REVIEW','시즌 회고'],['history','/history','历史赛事','PAST EVENTS','지난 대회']].map(([group,to,cn,en,ko])=>({group,to,cn,en,ko}))]
}
