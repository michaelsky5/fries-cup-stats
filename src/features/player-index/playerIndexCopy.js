import { pickUiLocale, translateUiText as formatUiText } from '../../lib/uiText.js'
import { rosterText } from '../roster-index/rosterCopy.js'

const labels = {
  '重装': 'Tank',
  '输出': 'Damage',
  '支援': 'Support',
  '灵活': 'Flex',
  '全部职责': 'All roles',
  '全部队伍': 'All teams',
  '全部英雄': 'All heroes',
  '全部选手': 'All players',
  '关注优先': 'Following first',
  '昵称': 'Name',
  '队伍': 'Team',
  '职责': 'Role'
}

export function playerIndexText(value, locale) {
  return formatUiText(locale === 'en-US' && labels[value] ? labels[value] : rosterText(value, locale), locale)
}

const previewLabels = {
  overview: ['选手概览', 'Player overview', '선수 개요', '選手概覽'],
  profile: ['查看完整档案', 'View full profile', '전체 프로필 보기', '查看完整檔案'],
  listTitle: ['选手名单', 'Player list', '선수 명단', '選手名單'],
  heroes: ['常用英雄', 'Most played heroes', '주로 플레이한 영웅', '常用英雄'],
  maps: ['出场图数', 'Maps played', '출전 전장', '出場圖數'],
  minutes: ['出场时长', 'Time played', '출전 시간', '出場時長'],
  minuteUnit: ['分钟', 'min', '분', '分鐘'],
  seasonData: ['本届数据', 'This season', '이번 시즌', '本屆資料'],
  roleData: ['{0}数据', '{0} data', '{0} 데이터', '{0}資料'],
  performance: ['比赛数据', 'Match statistics', '경기 통계', '比賽資料'],
  block: ['阻挡伤害', 'Mitigation', '막은 피해', '阻擋傷害'],
  dmg: ['伤害', 'Damage', '피해량', '傷害'],
  heal: ['治疗', 'Healing', '치유량', '治療'],
  elim: ['消灭', 'Eliminations', '처치', '消滅'],
  ast: ['助攻', 'Assists', '도움', '助攻'],
  per10: ['每 10 分钟', 'Per 10 min', '10분당', '每 10 分鐘'],
  recent: ['最近出场', 'Latest appearance', '최근 출전', '最近出場'],
  noRecent: ['暂无出场数据', 'No appearance data yet', '출전 데이터가 없습니다', '暫無出場資料'],
  noRecentDetails: ['暂无比赛明细', 'No match details yet', '경기 세부 기록이 없습니다', '暫無比賽明細'],
  noMetrics: ['暂无出场数据', 'No appearance data yet', '출전 데이터가 없습니다', '暫無出場資料'],
  noMetricDetails: ['暂无统计明细', 'No detailed statistics yet', '세부 통계가 없습니다', '暫無統計明細'],
  noPublishedAppearance: ['暂未收录本届出场记录', 'No appearances recorded this season yet', '이번 시즌 출전 기록이 아직 없습니다', '暫未收錄本屆出場紀錄'],
  noRoleAppearance: ['暂未收录本届{0}出场记录', 'No {0} appearances recorded this season yet', '이번 시즌 {0} 출전 기록이 아직 없습니다', '暫未收錄本屆{0}出場紀錄'],
  teamRoster: ['同队选手', 'Team roster', '같은 팀 선수', '同隊選手'],
  viewTeamRoster: ['查看全队名册', 'View team roster', '전체 팀 명단 보기', '查看全隊名冊'],
  win: ['胜', 'Win', '승', '勝'],
  loss: ['负', 'Loss', '패', '負'],
  draw: ['平', 'Draw', '무', '平'],
  complete: ['已结束', 'Final', '종료', '已結束'],
  ruling: ['判定结束', 'By ruling', '판정 종료', '判定結束'],
  review: ['结果待审核', 'Under review', '결과 검토 중', '結果待審核'],
  live: ['进行中', 'In progress', '진행 중', '進行中'],
  upcoming: ['待赛', 'Upcoming', '예정', '待賽'],
  cancelled: ['已取消', 'Cancelled', '취소됨', '已取消'],
  postponed: ['已延期', 'Postponed', '연기됨', '已延期'],
  unknown: ['状态待更新', 'Status pending', '상태 미정', '狀態待更新']
}

export function playerPreviewText(value, locale, params = []) {
  return previewLabels[value] ? formatUiText(pickUiLocale(locale, ...previewLabels[value]), locale, params) : playerIndexText(value, locale)
}
