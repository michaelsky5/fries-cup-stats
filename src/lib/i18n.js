export const LOCALE_STORAGE_KEY = 'fries_cup_stats_locale'
export const DEFAULT_LOCALE = 'zh-CN'

export const LOCALES = [
  { id: 'zh-CN', label: '中文' },
  { id: 'en-US', label: 'English' }
]

const dictionary = {
  'layout.brand.kicker': {
    'zh-CN': 'FriesCup 薯条杯',
    'en-US': 'FriesCup'
  },
  'layout.brand.title': {
    'zh-CN': '数据中心',
    'en-US': 'Data Center'
  },
  'layout.nav.public': {
    'zh-CN': '公共视图',
    'en-US': 'Public'
  },
  'layout.nav.group.event': {
    'zh-CN': '赛事动态',
    'en-US': 'Event'
  },
  'layout.nav.group.library': {
    'zh-CN': '数据档案',
    'en-US': 'Library'
  },
  'layout.nav.group.content': {
    'zh-CN': '扩展内容',
    'en-US': 'Season Extras'
  },
  'layout.nav.home': {
    'zh-CN': '最新动态',
    'en-US': 'Home'
  },
  'layout.nav.schedule': {
    'zh-CN': '\u8d5b\u4e8b\u65e5\u7a0b',
    'en-US': 'Schedule'
  },
  'layout.nav.matches': {
    'zh-CN': '对局档案',
    'en-US': 'Matches'
  },
  'layout.nav.leaderboard': {
    'zh-CN': '数据排行',
    'en-US': 'Leaderboard'
  },
  'layout.nav.players': {
    'zh-CN': '选手名录',
    'en-US': 'Players'
  },
  'layout.nav.teams': {
    'zh-CN': '战队档案',
    'en-US': 'Teams'
  },
  'layout.nav.heroes': {
    'zh-CN': '英雄情报',
    'en-US': 'Heroes'
  },
  'layout.nav.maps': {
    'zh-CN': '地图数据',
    'en-US': 'Maps'
  },
  'layout.nav.standings': {
    'zh-CN': '战队排名',
    'en-US': 'Standings'
  },
  'layout.nav.review': {
    'zh-CN': '赛季回顾',
    'en-US': 'Season Review'
  },
  'layout.nav.manager': {
    'zh-CN': '幻想玩法',
    'en-US': 'Fantasy Mode'
  },
  'layout.controls.season': {
    'zh-CN': '当前赛季',
    'en-US': 'Season'
  },
  'layout.controls.language': {
    'zh-CN': '语言',
    'en-US': 'Language'
  },
  'layout.meta.updated': {
    'zh-CN': '最后同步',
    'en-US': 'Last Sync'
  },
  'layout.meta.loading': {
    'zh-CN': '正在同步',
    'en-US': 'Syncing'
  },
  'layout.meta.empty': {
    'zh-CN': '暂无数据',
    'en-US': 'No Data'
  },
  'layout.state.loading': {
    'zh-CN': '正在同步最新赛事数据',
    'en-US': 'Syncing the latest event data'
  },
  'layout.state.loadingDesc': {
    'zh-CN': '正在核对最新发布版本、赛程、赛果与晋级状态，请稍候。',
    'en-US': 'Checking the latest published version, schedule, results, and advancement status.'
  },
  'layout.state.loadingProgress': {
    'zh-CN': '赛事数据同步进度',
    'en-US': 'Event data sync progress'
  },
  'layout.state.fallbackKicker': {
    'zh-CN': 'LIVE DATA SYNC',
    'en-US': 'LIVE DATA SYNC'
  },
  'layout.state.fallbackTitle': {
    'zh-CN': '正在同步最新发布数据',
    'en-US': 'Syncing the latest published data'
  },
  'layout.state.fallbackDesc': {
    'zh-CN': '当前暂时显示上次可用快照；同步完成后页面会自动更新。',
    'en-US': 'The last available snapshot is shown temporarily and will update automatically when syncing finishes.'
  },
  'layout.state.error': {
    'zh-CN': '数据加载异常',
    'en-US': 'Data Error'
  },
  'layout.state.errorDesc': {
    'zh-CN': '赛事数据暂时无法载入，请稍后刷新重试。',
    'en-US': 'Match data is temporarily unavailable. Please refresh and try again.'
  },
  'summary.teams': {
    'zh-CN': '参赛队伍',
    'en-US': 'Teams'
  },
  'summary.players': {
    'zh-CN': '选手名录',
    'en-US': 'Players'
  },
  'summary.matches': {
    'zh-CN': '总场次',
    'en-US': 'Matches'
  },
  'summary.maps': {
    'zh-CN': '地图总数',
    'en-US': 'Maps'
  },
  'summary.completed': {
    'zh-CN': '已完结',
    'en-US': 'Completed'
  },
  'summary.live': {
    'zh-CN': '进行中',
    'en-US': 'Live'
  },
  'summary.pending': {
    'zh-CN': '未开始',
    'en-US': 'Pending'
  },
  'schedule.title': {
    'zh-CN': '\u8d5b\u4e8b\u65e5\u7a0b',
    'en-US': 'Event Schedule'
  },
  'schedule.overview': {
    'zh-CN': '总览',
    'en-US': 'Overview'
  },
  'schedule.roundSchedule': {
    'zh-CN': '分轮赛程',
    'en-US': 'Round Schedule'
  },
  'schedule.kicker': {
    'zh-CN': '\u516c\u5f00\u65e5\u7a0b',
    'en-US': 'Public Timeline'
  },
  'schedule.desc': {
    'zh-CN': '\u6309\u9636\u6bb5\u67e5\u770b\u516c\u5f00\u8d5b\u7a0b\u3001\u5f85\u516c\u5e03\u63d0\u9192\u4e0e\u5df2\u5b8c\u6210\u8d5b\u679c\uff0c\u9009\u624b\u548c\u6559\u7ec3\u90fd\u80fd\u5728\u8fd9\u91cc\u76f4\u63a5\u8ddf\u8fdb\u6bcf\u5468\u6bd4\u8d5b\u5b89\u6392\u3002',
    'en-US': 'Follow release timing, upcoming matches, and completed results across every stage.'
  },
  'schedule.releaseNotice': {
    'zh-CN': '\u516c\u5e03\u63d0\u9192',
    'en-US': 'Release Notice'
  },
  'schedule.thisRound': {
    'zh-CN': '\u672c\u8f6e\u8d5b\u7a0b',
    'en-US': 'This Round'
  },
  'schedule.pendingReleaseTitle': {
    'zh-CN': '\u8d5b\u7a0b\u5f85\u516c\u5e03',
    'en-US': 'Schedule Pending'
  },
  'schedule.pendingReleaseDesc': {
    'zh-CN': '\u8fd9\u4e00\u8f6e\u5bf9\u9635\u4f1a\u5728\u6307\u5b9a\u516c\u5f00\u65f6\u95f4\u81ea\u52a8\u653e\u51fa\u3002',
    'en-US': 'This round will be published at the scheduled release time.'
  },
  'schedule.matchesUnit': {
    'zh-CN': '\u573a\u6bd4\u8d5b',
    'en-US': 'Matches'
  },
  'schedule.openQualifier': {
    'zh-CN': '公开预选赛',
    'en-US': 'Open Qualifier'
  },
  'schedule.swiss': {
    'zh-CN': '瑞士轮',
    'en-US': 'Swiss'
  },
  'schedule.lcq': {
    'zh-CN': '突围赛',
    'en-US': 'LCQ'
  },
  'schedule.playoffs': {
    'zh-CN': '季后淘汰赛',
    'en-US': 'Playoffs'
  },
  'schedule.grandFinal': {
    'zh-CN': '总决赛',
    'en-US': 'Grand Final'
  },
  'schedule.noMatches': {
    'zh-CN': '暂无比赛记录',
    'en-US': 'No matches yet'
  },
  'schedule.viewDetails': {
    'zh-CN': '查看详情',
    'en-US': 'Details'
  },
  'schedule.completed': {
    'zh-CN': '已完成',
    'en-US': 'Completed'
  },
  'schedule.pending': {
    'zh-CN': '未开始',
    'en-US': 'Pending'
  },
  'schedule.live': {
    'zh-CN': '进行中',
    'en-US': 'Live'
  },
  'matchDetail.title': {
    'zh-CN': '\u6bd4\u8d5b\u6863\u6848',
    'en-US': 'Match Dossier'
  },
  'matchDetail.kicker': {
    'zh-CN': '\u6bd4\u8d5b\u6863\u6848',
    'en-US': 'Match Dossier'
  },
  'matchDetail.back': {
    'zh-CN': '\u8fd4\u56de\u8d5b\u7a0b\u8d5b\u679c',
    'en-US': 'Back to Matches'
  },
  'matchDetail.overview': {
    'zh-CN': '\u6bd4\u8d5b\u603b\u89c8',
    'en-US': 'Match Overview'
  },
  'matchDetail.seriesPath': {
    'zh-CN': '\u7cfb\u5217\u8d5b\u8def\u5f84',
    'en-US': 'Series Path'
  },
  'matchDetail.analysis': {
    'zh-CN': '\u6bd4\u8d5b\u5206\u6790',
    'en-US': 'Match Analysis'
  },
  'matchDetail.factDurationCode': {
    'zh-CN': 'DURATION',
    'en-US': 'DURATION'
  },
  'matchDetail.factDuration': {
    'zh-CN': '\u7cfb\u5217\u8d5b\u603b\u65f6\u957f',
    'en-US': 'Series Duration'
  },
  'matchDetail.factMapsCode': {
    'zh-CN': 'MAPS',
    'en-US': 'MAPS'
  },
  'matchDetail.factMaps': {
    'zh-CN': '\u603b\u5730\u56fe\u6570',
    'en-US': 'Total Maps'
  },
  'matchDetail.factLongestCode': {
    'zh-CN': 'LONGEST',
    'en-US': 'LONGEST'
  },
  'matchDetail.factLongest': {
    'zh-CN': '\u6700\u957f\u5730\u56fe',
    'en-US': 'Longest Map'
  },
  'matchDetail.factClosestCode': {
    'zh-CN': 'CLOSEST',
    'en-US': 'CLOSEST'
  },
  'matchDetail.factClosest': {
    'zh-CN': '\u6700\u63a5\u8fd1\u6bd4\u5206',
    'en-US': 'Closest Score'
  },
  'matchDetail.factTopDamageCode': {
    'zh-CN': 'TOP DAMAGE',
    'en-US': 'TOP DAMAGE'
  },
  'matchDetail.factTopDamage': {
    'zh-CN': '\u6700\u9ad8\u4f24\u5bb3',
    'en-US': 'Top Damage'
  },
  'matchDetail.factTopHealingCode': {
    'zh-CN': 'TOP HEALING',
    'en-US': 'TOP HEALING'
  },
  'matchDetail.factTopHealing': {
    'zh-CN': '\u6700\u9ad8\u6cbb\u7597',
    'en-US': 'Top Healing'
  },
  'matchDetail.factTopMitigationCode': {
    'zh-CN': 'TOP MITIGATION',
    'en-US': 'TOP MITIGATION'
  },
  'matchDetail.factTopMitigation': {
    'zh-CN': '\u6700\u9ad8\u963b\u6321',
    'en-US': 'Top Mitigation'
  },
  'matchDetail.mapRecords': {
    'zh-CN': '\u5730\u56fe\u8bb0\u5f55',
    'en-US': 'Map Records'
  },
  'matchDetail.playerStats': {
    'zh-CN': '\u9009\u624b\u6570\u636e',
    'en-US': 'Player Stats'
  },
  'matchDetail.dataPerformance': {
    'zh-CN': '\u8868\u73b0\u8bc4\u5206',
    'en-US': 'Performance Rating'
  },
  'matchDetail.performanceKicker': {
    'zh-CN': '\u8868\u73b0\u8bc4\u5206',
    'en-US': 'Performance Rating'
  },
  'matchDetail.topRatedPlayer': {
    'zh-CN': '\u672c\u573a\u6700\u9ad8\u8bc4\u5206\u9009\u624b',
    'en-US': 'Top Rated Player'
  },
  'matchDetail.roleLeaders': {
    'zh-CN': '\u804c\u8d23\u9886\u8dd1\u8005',
    'en-US': 'Role Leaders'
  },
  'matchDetail.viewPlayer': {
    'zh-CN': '\u67e5\u770b\u9009\u624b\u6863\u6848',
    'en-US': 'View Player'
  },
  'matchDetail.mapImpact': {
    'zh-CN': '\u5355\u56fe\u6570\u636e\u8868\u73b0',
    'en-US': 'Map Impact'
  },
  'matchDetail.mapImpactStar': {
    'zh-CN': '\u5355\u56fe\u8868\u73b0\u4e4b\u661f',
    'en-US': 'Map Performance Star'
  },
  'matchDetail.mapImpactNote': {
    'zh-CN': '\u7edf\u8ba1\u8bc4\u5206\u4ec5\u4f9b\u53c2\u8003\uff0c\u975e\u5b98\u65b9 MVP \u8bc4\u9009\u3002',
    'en-US': 'Reference rating, not official MVP voting.'
  },
  'matchDetail.ratingNote': {
    'zh-CN': '\u8bc4\u5206\u6839\u636e\u516c\u5f00\u6bd4\u8d5b\u7edf\u8ba1\u751f\u6210\uff0c\u4ec5\u4f9b\u53c2\u8003\u3002',
    'en-US': 'Ratings are generated from match stats for reference.'
  },
  'matchDetail.seriesComparison': {
    'zh-CN': '\u6574\u573a\u961f\u4f0d\u6570\u636e\u5bf9\u6bd4',
    'en-US': 'Series Team Comparison'
  },
  'matchDetail.mapSummary': {
    'zh-CN': '\u5730\u56fe\u7ed3\u679c\u6458\u8981',
    'en-US': 'Map Result Summary'
  },
  'matchDetail.expandAll': {
    'zh-CN': '\u5c55\u5f00\u5168\u90e8\u5730\u56fe',
    'en-US': 'Expand All Maps'
  },
  'matchDetail.collapseAll': {
    'zh-CN': '\u6536\u8d77\u5168\u90e8\u5730\u56fe',
    'en-US': 'Collapse All Maps'
  },
  'matchDetail.matchCode': {
    'zh-CN': '\u6bd4\u8d5b\u4ee3\u7801',
    'en-US': 'Match Code'
  },
  'matchDetail.copyCode': {
    'zh-CN': '\u590d\u5236\u4ee3\u7801',
    'en-US': 'Copy Code'
  },
  'matchDetail.noCode': {
    'zh-CN': '\u6682\u65e0\u6bd4\u8d5b\u4ee3\u7801',
    'en-US': 'No match code yet'
  },
  'matchDetail.codeCopied': {
    'zh-CN': '\u6bd4\u8d5b\u4ee3\u7801\u5df2\u590d\u5236',
    'en-US': 'Match code copied'
  },
  'matchDetail.codeCopyFailed': {
    'zh-CN': '\u590d\u5236\u5931\u8d25\uff0c\u8bf7\u624b\u52a8\u590d\u5236',
    'en-US': 'Copy failed. Please copy it manually.'
  },
  'matchDetail.winner': {
    'zh-CN': '\u80dc\u8005',
    'en-US': 'Winner'
  },
  'matchDetail.duration': {
    'zh-CN': '\u65f6\u957f',
    'en-US': 'Duration'
  },
  'matchDetail.status': {
    'zh-CN': '\u72b6\u6001',
    'en-US': 'Status'
  },
  'matchDetail.previous': {
    'zh-CN': '\u4e0a\u4e00\u573a\u6bd4\u8d5b',
    'en-US': 'Previous Match'
  },
  'matchDetail.next': {
    'zh-CN': '\u4e0b\u4e00\u573a\u6bd4\u8d5b',
    'en-US': 'Next Match'
  },
  'matchDetail.timelineOverview': {
    'zh-CN': '\u6bd4\u8d5b\u603b\u89c8',
    'en-US': 'Overview'
  },
  'matchDetail.noMapData': {
    'zh-CN': '\u6682\u65e0\u53ef\u5c55\u793a\u7684\u5730\u56fe\u4e0e\u6570\u636e\u8bb0\u5f55\u3002',
    'en-US': 'No map or stat records are available yet.'
  },
  'matchDetail.noRating': {
    'zh-CN': '\u5f53\u524d\u7edf\u8ba1\u4e0d\u8db3\u4ee5\u751f\u6210\u53ef\u9760\u6570\u636e\u8bc4\u5206\u3002',
    'en-US': 'Current stats are not sufficient for reliable data ratings.'
  },
  'matchDetail.pendingNotice': {
    'zh-CN': '\u8be5\u6bd4\u8d5b\u5c1a\u672a\u5f00\u59cb\uff0c\u8fd9\u91cc\u4ec5\u5c55\u793a\u5df2\u516c\u5f00\u7684\u5bf9\u9635\u3001\u8d5b\u7a0b\u548c\u9635\u5bb9\u4fe1\u606f\u3002',
    'en-US': 'This match has not started; only published matchup, schedule, and roster information is shown.'
  },
  'matchDetail.unavailableNotice': {
    'zh-CN': '\u8be5\u6bd4\u8d5b\u5f53\u524d\u4e0d\u751f\u6210\u5730\u56fe\u548c\u6570\u636e\u8bb0\u5f55\u3002',
    'en-US': 'This match currently does not generate map or stat records.'
  },
  'matchDetail.teamPickA': {
    'zh-CN': '\u961f\u4f0d A \u9009\u62e9',
    'en-US': 'Team A Pick'
  },
  'matchDetail.teamPickB': {
    'zh-CN': '\u961f\u4f0d B \u9009\u62e9',
    'en-US': 'Team B Pick'
  },
  'matchDetail.teamBanA': {
    'zh-CN': '\u961f\u4f0d A \u7981\u7528',
    'en-US': 'Team A Ban'
  },
  'matchDetail.teamBanB': {
    'zh-CN': '\u961f\u4f0d B \u7981\u7528',
    'en-US': 'Team B Ban'
  },
  'matchDetail.teamBan': {
    'zh-CN': '\u7981\u7528',
    'en-US': 'Ban'
  },
  'matchDetail.mapType': {
    'zh-CN': '\u5730\u56fe\u7c7b\u578b',
    'en-US': 'Map Type'
  },
  'matchDetail.player': {
    'zh-CN': '\u9009\u624b',
    'en-US': 'Player'
  },
  'matchDetail.mapRating': {
    'zh-CN': '\u672c\u56fe\u8bc4\u5206',
    'en-US': 'Match Rating'
  },
  'matchDetail.ratingShort': {
    'zh-CN': '\u8bc4\u5206',
    'en-US': 'Rating'
  },
  'matchDetail.highlightShort': {
    'zh-CN': '\u4eae\u70b9',
    'en-US': 'Highlight'
  },
  'matchDetail.mapRatingUnavailable': {
    'zh-CN': '\u672c\u56fe\u8bc4\u5206\u6682\u4e0d\u53ef\u7528',
    'en-US': 'Match Rating unavailable'
  },
  'matchDetail.rawImpactScore': {
    'zh-CN': '\u57fa\u7840\u8bc4\u5206',
    'en-US': 'Base Rating Score'
  },
  'matchDetail.teamMapMvpShort': {
    'zh-CN': 'MVP',
    'en-US': 'MVP'
  },
  'matchDetail.teamMapMvpNote': {
    'zh-CN': '\u961f\u5185\u672c\u56fe\u6700\u9ad8\u8bc4\u5206\uff0c\u4ec5\u4f9b\u8868\u73b0\u53c2\u8003\u3002',
    'en-US': 'Highest team rating on this map, for performance reference.'
  },
  'matchDetail.awardTopEliminations': {
    'zh-CN': '\u6700\u9ad8\u51fb\u6740',
    'en-US': 'TOP ELIM'
  },
  'matchDetail.awardTopAssists': {
    'zh-CN': '\u6700\u9ad8\u52a9\u653b',
    'en-US': 'TOP AST'
  },
  'matchDetail.awardTopDamage': {
    'zh-CN': '\u6700\u9ad8\u4f24\u5bb3',
    'en-US': 'TOP DMG'
  },
  'matchDetail.awardTopHealing': {
    'zh-CN': '\u6700\u9ad8\u6cbb\u7597',
    'en-US': 'TOP HEAL'
  },
  'matchDetail.awardTopMitigation': {
    'zh-CN': '\u6700\u9ad8\u963b\u6321',
    'en-US': 'TOP MIT'
  },
  'matchDetail.awardTopRating': {
    'zh-CN': '\u6700\u9ad8\u8bc4\u5206',
    'en-US': 'TOP RATE'
  },
  'matchDetail.ratingMappedFromImpact': {
    'zh-CN': '\u8bc4\u5206\u7531\u672c\u56fe\u9009\u624b\u8868\u73b0\u6307\u6807\u751f\u6210\u3002',
    'en-US': 'Rating is generated from player performance metrics on this map.'
  },
  'matchDetail.role': {
    'zh-CN': '\u804c\u8d23',
    'en-US': 'Role'
  },
  'matchDetail.eliminations': {
    'zh-CN': '\u6d88\u706d',
    'en-US': 'Eliminations'
  },
  'matchDetail.assists': {
    'zh-CN': '\u52a9\u653b',
    'en-US': 'Assists'
  },
  'matchDetail.deaths': {
    'zh-CN': '\u9635\u4ea1',
    'en-US': 'Deaths'
  },
  'matchDetail.damage': {
    'zh-CN': '\u4f24\u5bb3',
    'en-US': 'Damage'
  },
  'matchDetail.healing': {
    'zh-CN': '\u6cbb\u7597',
    'en-US': 'Healing'
  },
  'matchDetail.mitigation': {
    'zh-CN': '\u963b\u6321',
    'en-US': 'Mitigation'
  },
  'standings.status.playoffs': {
    'zh-CN': '直通季后赛',
    'en-US': 'Playoffs'
  },
  'standings.status.lcq': {
    'zh-CN': '突围区间',
    'en-US': 'LCQ'
  },
  'standings.status.eliminated': {
    'zh-CN': '已淘汰',
    'en-US': 'Eliminated'
  },
  'standings.status.active': {
    'zh-CN': '进行中',
    'en-US': 'Active'
  },
  'standings.kicker': {
    'zh-CN': '积分榜总览',
    'en-US': 'Standings Overview'
  },
  'standings.title': {
    'zh-CN': '瑞士轮积分榜',
    'en-US': 'Swiss Standings'
  },
  'standings.desc': {
    'zh-CN': '瑞士轮排名会依次比较战绩、Buchholz、直接交手、对手胜率和地图净胜。',
    'en-US': 'Swiss ranking compares record, Buchholz, head-to-head, opponent win rate, then map differential.'
  },
  'standings.table': {
    'zh-CN': '排名明细',
    'en-US': 'Ranking Table'
  },
  'standings.playoffs': {
    'zh-CN': '直通季后赛',
    'en-US': 'Playoffs'
  },
  'standings.lcq': {
    'zh-CN': 'LCQ 区间',
    'en-US': 'LCQ'
  },
  'standings.eliminated': {
    'zh-CN': '已淘汰',
    'en-US': 'Eliminated'
  },
  'standings.active': {
    'zh-CN': '进行中',
    'en-US': 'Active'
  },
  'advance.title': {
    'zh-CN': '晋级形势',
    'en-US': 'Advance Hub'
  },
  'advance.header.currentDesc': {
    'zh-CN': '查看公开预选赛、瑞士轮积分、突围赛对阵与季后赛晋级路径。',
    'en-US': 'Track the open qualifier, Swiss standings, breakthrough bracket, and playoff path.'
  },
  'advance.header.groupDesc': {
    'zh-CN': '查看四组单循环积分、同分判定、八强单败对阵与最终晋级路径。',
    'en-US': 'Track four round-robin groups, tiebreak status, the top-eight single-elimination bracket, and final results.'
  },
  'advance.header.archiveDesc': {
    'zh-CN': '查看最终排名、完整季后赛路径与冠军晋级历程。',
    'en-US': 'Review final ranking, playoff bracket, and the champion path.'
  },
  'advance.phase.swiss': {
    'zh-CN': '瑞士轮',
    'en-US': 'Swiss'
  },
  'advance.phase.groups': {
    'zh-CN': '小组赛',
    'en-US': 'Groups'
  },
  'advance.phase.breakthrough': {
    'zh-CN': '突围赛',
    'en-US': 'Breakthrough'
  },
  'advance.phase.playoffs': {
    'zh-CN': '季后赛',
    'en-US': 'Playoffs'
  },
  'advance.phase.final': {
    'zh-CN': '最终结果',
    'en-US': 'Final'
  },
  'advance.stageRail': {
    'zh-CN': '晋级阶段',
    'en-US': 'Advance stages'
  },
  'advance.status.pendingConfirm': {
    'zh-CN': '待确认',
    'en-US': 'Pending'
  },
  'advance.status.current': {
    'zh-CN': '当前',
    'en-US': 'Current'
  },
  'advance.status.completed': {
    'zh-CN': '已完成',
    'en-US': 'Completed'
  },
  'advance.status.upcoming': {
    'zh-CN': '未开始',
    'en-US': 'Scheduled'
  },
  'advance.summary.currentPhase': {
    'zh-CN': '当前阶段',
    'en-US': 'Current Phase'
  },
  'advance.summary.currentRound': {
    'zh-CN': '当前轮次',
    'en-US': 'Current Round'
  },
  'advance.summary.currentMatchDay': {
    'zh-CN': '当前比赛日',
    'en-US': 'Current Match Day'
  },
  'advance.summary.roundProgress': {
    'zh-CN': '本轮进度',
    'en-US': 'Round Progress'
  },
  'advance.summary.matchDayProgress': {
    'zh-CN': '本比赛日进度',
    'en-US': 'Match Day Progress'
  },
  'advance.summary.nextPhase': {
    'zh-CN': '下一阶段',
    'en-US': 'Next Phase'
  },
  'advance.summary.eventStatus': {
    'zh-CN': '赛事状态',
    'en-US': 'Event Status'
  },
  'advance.summary.finished': {
    'zh-CN': '赛季已结束',
    'en-US': 'Season Finished'
  },
  'advance.summary.champion': {
    'zh-CN': '冠军',
    'en-US': 'Champion'
  },
  'advance.summary.grandFinal': {
    'zh-CN': '总决赛',
    'en-US': 'Grand Final'
  },
  'advance.swiss.roundPrefix': {
    'zh-CN': '瑞士轮第',
    'en-US': 'Swiss Round'
  },
  'advance.swiss.notStartedTitle': {
    'zh-CN': '瑞士轮尚未开始',
    'en-US': 'Swiss Stage Not Started'
  },
  'advance.swiss.notStartedDesc': {
    'zh-CN': '比赛开始后将展示完整积分榜、晋级区、突围区、竞争区、危险区、已出局队伍与同分规则。',
    'en-US': 'Once matches begin, the full standings, zones, eliminated teams, and tiebreakers will be shown.'
  },
  'advance.swiss.teams': {
    'zh-CN': '参赛队伍',
    'en-US': 'Teams'
  },
  'advance.swiss.rounds': {
    'zh-CN': '瑞士轮轮次',
    'en-US': 'Swiss Rounds'
  },
  'advance.swiss.directCondition': {
    'zh-CN': '直通条件',
    'en-US': 'Direct Condition'
  },
  'advance.swiss.breakthroughCondition': {
    'zh-CN': '突围资格',
    'en-US': 'Breakthrough Line'
  },
  'advance.swiss.totalSlots': {
    'zh-CN': '最终晋级',
    'en-US': 'Final Slots'
  },
  'advance.swiss.viewRoundSchedule': {
    'zh-CN': '查看本轮赛程',
    'en-US': 'View Round Schedule'
  },
  'advance.swiss.currentRound': {
    'zh-CN': '当前轮次',
    'en-US': 'Current Round'
  },
  'advance.swiss.roundProgress': {
    'zh-CN': '本轮进度',
    'en-US': 'Round Progress'
  },
  'advance.swiss.completedMatches': {
    'zh-CN': '已完成比赛',
    'en-US': 'Completed Matches'
  },
  'advance.swiss.nextStart': {
    'zh-CN': '下一开赛',
    'en-US': 'Next Start'
  },
  'advance.swiss.zoneSummary': {
    'zh-CN': '晋级区域统计',
    'en-US': 'Zone Summary'
  },
  'advance.swiss.archiveZoneSummary': {
    'zh-CN': '瑞士轮最终分层',
    'en-US': 'Final Swiss Tiers'
  },
  'advance.swiss.finalRounds': {
    'zh-CN': '瑞士轮轮次',
    'en-US': 'Swiss Rounds'
  },
  'advance.swiss.finalSchedule': {
    'zh-CN': '瑞士轮赛程',
    'en-US': 'Swiss Schedule'
  },
  'advance.swiss.fullStandings': {
    'zh-CN': '完整瑞士轮积分榜',
    'en-US': 'Full Swiss Standings'
  },
  'advance.swiss.keyMatches': {
    'zh-CN': '本轮关键比赛',
    'en-US': 'Key Matches'
  },
  'advance.swiss.afterStartTitle': {
    'zh-CN': '比赛开始后展示',
    'en-US': 'Available After Start'
  },
  'advance.swiss.afterStartStandings': {
    'zh-CN': '完整积分榜',
    'en-US': 'Full standings'
  },
  'advance.swiss.afterStartZones': {
    'zh-CN': '晋级区 / 突围区 / 竞争区 / 危险区 / 已出局队伍',
    'en-US': 'Direct, breakthrough, contending, danger, and eliminated zones'
  },
  'advance.swiss.afterStartTiebreakers': {
    'zh-CN': '同分规则与当前关键比赛',
    'en-US': 'Tiebreakers and key matches'
  },
  'advance.zone.direct': {
    'zh-CN': '已直通',
    'en-US': 'Direct'
  },
  'advance.zone.breakthrough': {
    'zh-CN': '突围区',
    'en-US': 'Breakthrough'
  },
  'advance.zone.contending': {
    'zh-CN': '竞争中',
    'en-US': 'Contending'
  },
  'advance.zone.danger': {
    'zh-CN': '危险区',
    'en-US': 'Danger'
  },
  'advance.zone.eliminated': {
    'zh-CN': '已出局',
    'en-US': 'Eliminated'
  },
  'advance.table.rank': {
    'zh-CN': '排名',
    'en-US': 'Rank'
  },
  'advance.table.team': {
    'zh-CN': '战队',
    'en-US': 'Team'
  },
  'advance.table.matchRecord': {
    'zh-CN': '胜负',
    'en-US': 'W-L'
  },
  'advance.table.buchholz': {
    'zh-CN': '对手分',
    'en-US': 'Buchholz'
  },
  'advance.table.mapRecord': {
    'zh-CN': '地图胜负',
    'en-US': 'Map W-L'
  },
  'advance.table.mapDiff': {
    'zh-CN': '地图净胜',
    'en-US': 'Map Diff'
  },
  'advance.table.omw': {
    'zh-CN': '对手胜率',
    'en-US': 'OMW%'
  },
  'advance.table.status': {
    'zh-CN': '当前状态',
    'en-US': 'Status'
  },
  'advance.tiebreakers.title': {
    'zh-CN': '同分规则',
    'en-US': 'Tiebreakers'
  },
  'advance.tiebreaker.match_wins': {
    'zh-CN': '比赛胜场',
    'en-US': 'Match Wins'
  },
  'advance.tiebreaker.buchholz': {
    'zh-CN': '对手分',
    'en-US': 'Buchholz'
  },
  'advance.tiebreaker.head_to_head': {
    'zh-CN': '胜负关系',
    'en-US': 'Head-to-head'
  },
  'advance.tiebreaker.opponent_win_rate': {
    'zh-CN': '对手胜率',
    'en-US': 'Opponent Win Rate'
  },
  'advance.tiebreaker.map_diff': {
    'zh-CN': '地图净胜',
    'en-US': 'Map Differential'
  },
  'advance.tiebreaker.tournament_ruling': {
    'zh-CN': '加赛或赛事方最终裁定',
    'en-US': 'Tiebreaker match or organizer ruling'
  },
  'advance.breakthrough.title': {
    'zh-CN': '突围赛晋级图',
    'en-US': 'Breakthrough Bracket'
  },
  'advance.breakthrough.pendingTitle': {
    'zh-CN': '突围赛规则待确认',
    'en-US': 'Breakthrough Rules Pending'
  },
  'advance.breakthrough.pendingDesc': {
    'zh-CN': '瑞士轮结束后，赛事组将根据最终晋级情况公布突围赛赛制与对阵。',
    'en-US': 'After the Swiss Stage, organizers will publish the breakthrough format and matchups.'
  },
  'advance.breakthrough.pendingFormat': {
    'zh-CN': '赛制',
    'en-US': 'Format'
  },
  'advance.breakthrough.pendingBracket': {
    'zh-CN': '对阵',
    'en-US': 'Bracket'
  },
  'advance.breakthrough.pendingSlots': {
    'zh-CN': '晋级名额',
    'en-US': 'Slots'
  },
  'advance.breakthrough.pendingSchedule': {
    'zh-CN': '比赛时间',
    'en-US': 'Schedule'
  },
  'advance.playoffs.title': {
    'zh-CN': '季后赛双败淘汰图',
    'en-US': 'Double-elimination Playoffs'
  },
  'advance.playoffs.singleElimTitle': {
    'zh-CN': '八强单败淘汰图',
    'en-US': 'Top-eight Single-elimination Bracket'
  },
  'advance.playoffs.groupEmptyTitle': {
    'zh-CN': '八强对阵待公布',
    'en-US': 'Quarterfinal Bracket Pending'
  },
  'advance.playoffs.groupEmptyDesc': {
    'zh-CN': '小组赛各组前二确认后，由 System 发布八强单败对阵。八强赛与半决赛 FT3，季军赛与总决赛 FT4。',
    'en-US': 'System publishes the single-elimination bracket after each group confirms its top two. Quarterfinals and semifinals are FT3; third place and the grand final are FT4.'
  },
  'advance.playoffs.fullBracket': {
    'zh-CN': '完整季后赛晋级图',
    'en-US': 'Full Playoff Bracket'
  },
  'advance.bracket.filter.all': {
    'zh-CN': '全部',
    'en-US': 'All'
  },
  'advance.bracket.filter.winners': {
    'zh-CN': '胜者组',
    'en-US': 'Winners'
  },
  'advance.bracket.filter.losers': {
    'zh-CN': '败者组',
    'en-US': 'Losers'
  },
  'advance.bracket.filter.final': {
    'zh-CN': '总决赛',
    'en-US': 'Final'
  },
  'advance.bracket.filterLabel': {
    'zh-CN': '季后赛筛选',
    'en-US': 'Bracket Filter'
  },
  'advance.bracket.scrollHint': {
    'zh-CN': '横向滚动查看完整晋级图',
    'en-US': 'Scroll horizontally to view the full bracket'
  },
  'advance.bracket.emptyTitle': {
    'zh-CN': '暂无晋级图',
    'en-US': 'No Bracket Yet'
  },
  'advance.bracket.emptyDesc': {
    'zh-CN': '该阶段对阵尚未公布。',
    'en-US': 'The bracket for this phase has not been announced yet.'
  },
  'advance.matchStatus.scheduled': {
    'zh-CN': '未开始',
    'en-US': 'Scheduled'
  },
  'advance.matchStatus.active': {
    'zh-CN': '进行中',
    'en-US': 'Live'
  },
  'advance.matchStatus.completed': {
    'zh-CN': '已完成',
    'en-US': 'Completed'
  },
  'advance.matchStatus.postponed': {
    'zh-CN': '延期',
    'en-US': 'Postponed'
  },
  'advance.matchStatus.cancelled': {
    'zh-CN': '取消',
    'en-US': 'Cancelled'
  },
  'advance.final.grandFinal': {
    'zh-CN': '总决赛',
    'en-US': 'Grand Final'
  },
  'advance.final.noGrandFinal': {
    'zh-CN': '暂无总决赛记录',
    'en-US': 'No Grand Final Record'
  },
  'advance.final.championPath': {
    'zh-CN': '冠军路径',
    'en-US': 'Champion Path'
  },
  'advance.final.opponent': {
    'zh-CN': '对手',
    'en-US': 'Opponent'
  },
  'advance.final.rankingTitle': {
    'zh-CN': '最终排名',
    'en-US': 'Final Ranking'
  },
  'advance.final.viewSwiss': {
    'zh-CN': '查看瑞士轮最终积分榜',
    'en-US': 'View Final Swiss Standings'
  },
  'advance.final.viewGroups': {
    'zh-CN': '查看小组赛最终积分榜',
    'en-US': 'View Final Group Standings'
  },
  'advance.common.tbd': {
    'zh-CN': 'TBD',
    'en-US': 'TBD'
  },
  'advance.common.none': {
    'zh-CN': '暂无',
    'en-US': 'None'
  },
  'advance.common.details': {
    'zh-CN': '详情',
    'en-US': 'Details'
  },
  'advance.common.noScore': {
    'zh-CN': '—',
    'en-US': '—'
  },
  'advance.common.allMatches': {
    'zh-CN': '完整比赛',
    'en-US': 'All Matches'
  },
  'advance.unit.teams': {
    'zh-CN': '支队伍',
    'en-US': 'teams'
  },
  'advance.unit.rounds': {
    'zh-CN': '轮',
    'en-US': 'rounds'
  },
  'advance.unit.wins': {
    'zh-CN': '胜',
    'en-US': 'W'
  },
  'advance.unit.slots': {
    'zh-CN': '席',
    'en-US': 'slots'
  },
  'playerShare.dialog.aria': {
    'zh-CN': '导出分享图',
    'en-US': 'Export share card'
  },
  'playerShare.dialog.title': {
    'zh-CN': '导出分享图',
    'en-US': 'Export Share Card'
  },
  'playerShare.dialog.close': {
    'zh-CN': '关闭',
    'en-US': 'Close'
  },
  'playerShare.dialog.role': {
    'zh-CN': '职责',
    'en-US': 'Role'
  },
  'playerShare.dialog.roleAria': {
    'zh-CN': '选择职责',
    'en-US': 'Choose role'
  },
  'playerShare.dialog.highlightAuto': {
    'zh-CN': '赛季高光：自动选择',
    'en-US': 'Highlight: Auto'
  },
  'playerShare.dialog.exportPng': {
    'zh-CN': '导出 PNG',
    'en-US': 'Export PNG'
  },
  'playerShare.dialog.generating': {
    'zh-CN': '正在生成',
    'en-US': 'Generating'
  },
  'playerShare.dialog.generatingStatus': {
    'zh-CN': '正在生成分享图…',
    'en-US': 'Generating share card…'
  },
  'playerShare.dialog.exported': {
    'zh-CN': '分享图已导出。',
    'en-US': 'Share card exported.'
  },
  'playerShare.dialog.failed': {
    'zh-CN': '导出失败，请稍后重试。',
    'en-US': 'Export failed. Please try again.'
  },
  'playerShare.dialog.empty': {
    'zh-CN': '当前职责暂无可导出的数据。',
    'en-US': 'No exportable data for this role.'
  },
  'playerShare.dialog.previewNote': {
    'zh-CN': '预览与导出使用同一卡面，导出尺寸固定为 1600 × 900。',
    'en-US': 'Preview and export use the same 1600 × 900 card component.'
  },
  'playerShare.card.playerCard': {
    'zh-CN': 'PLAYER CARD',
    'en-US': 'PLAYER CARD'
  },
  'playerShare.card.headerKicker': {
    'zh-CN': 'FRIES CUP STATS',
    'en-US': 'FRIES CUP STATS'
  },
  'playerShare.card.identityKicker': {
    'zh-CN': 'PLAYER PROFILE',
    'en-US': 'PLAYER PROFILE'
  },
  'playerShare.card.seasonOvr': {
    'zh-CN': '赛季能力值',
    'en-US': 'SEASON OVR'
  },
  'playerShare.card.unrated': {
    'zh-CN': '未定级',
    'en-US': 'Not Rated'
  },
  'playerShare.card.performanceFingerprint': {
    'zh-CN': '表现指纹',
    'en-US': 'Performance Fingerprint'
  },
  'playerShare.card.radarAria': {
    'zh-CN': '表现指纹雷达图',
    'en-US': 'Performance radar'
  },
  'playerShare.card.playerRadar': {
    'zh-CN': '选手职责表现',
    'en-US': 'Player'
  },
  'playerShare.card.roleMedian': {
    'zh-CN': '同职责中位',
    'en-US': 'Role Median'
  },
  'playerShare.card.radarInsufficient': {
    'zh-CN': '样本不足，暂不生成雷达图。',
    'en-US': 'Not enough eligible data for radar.'
  },
  'playerShare.card.played': {
    'zh-CN': '出场时间',
    'en-US': 'PLAYED'
  },
  'playerShare.card.maps': {
    'zh-CN': '地图数',
    'en-US': 'MAPS'
  },
  'playerShare.card.mainHero': {
    'zh-CN': '主力英雄',
    'en-US': 'MAIN HERO'
  },
  'playerShare.card.currentTeam': {
    'zh-CN': '当前队伍',
    'en-US': 'TEAM'
  },
  'playerShare.card.updated': {
    'zh-CN': '数据截止',
    'en-US': 'UPDATED'
  }
}

export function normalizeLocale(locale) {
  return LOCALES.some(item => item.id === locale) ? locale : DEFAULT_LOCALE
}

export function getStoredLocale() {
  if (typeof window === 'undefined') return DEFAULT_LOCALE
  return normalizeLocale(window.localStorage.getItem(LOCALE_STORAGE_KEY))
}

export function setStoredLocale(locale) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(LOCALE_STORAGE_KEY, normalizeLocale(locale))
}

export function createTranslator(locale = DEFAULT_LOCALE) {
  const safeLocale = normalizeLocale(locale)
  return (key, fallback = key) => {
    const entry = dictionary[key]
    return entry?.[safeLocale] || entry?.[DEFAULT_LOCALE] || fallback
  }
}
