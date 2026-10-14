import { pickUiLocale, translateUiText as formatUiText } from '../../lib/uiText.js'
import { rosterText } from '../roster-index/rosterCopy.js'
import { getMatchScore, getMatchStatusText, isFinishedMatch, isLiveMatch } from '../../lib/matchesSelectors.js'
import { weeklyMatchState } from '../weekly-overview/weeklyOverviewModel.js'

const labels = {
  '周赛': 'Weekly matches',
  '经理': 'Manager',
  '教练': 'Coach',
  '队伍': 'Team',
  '署名场数': 'Credited matches',
  '瑞士轮': 'Swiss stage',
  '小组赛': 'Group stage',
  '突围赛': 'Breakthrough',
  '季后赛': 'Playoffs'
}

export function staffCreditsText(value, locale) {
  if (value === '参与场数') return pickUiLocale(locale, '参与场数', 'Matches', '참여 경기 수', '參與場數')
  return formatUiText(locale === 'en-US' ? labels[value] || rosterText(value, locale) : rosterText(value, locale), locale)
}

export function getStaffMatchDisplay(match, locale) {
  const state = weeklyMatchState(match)
  const score = getMatchScore(match)
  const canShowScore = ['complete', 'ruling', 'live', 'review'].includes(state) ||
    (state === 'unknown' && (isFinishedMatch(match) || isLiveMatch(match)))
  if (canShowScore && score !== '- : -') return { label: score, isScore: true }

  const stateLabels = {
    upcoming: ['待赛', 'Upcoming', '예정', '待賽'],
    cancelled: ['已取消', 'Cancelled', '취소됨', '已取消'],
    postponed: ['已延期', 'Postponed', '연기됨', '已延期'],
    review: ['结果待审核', 'Under review', '결과 검토 중', '結果待審核'],
    live: ['进行中', 'In progress', '진행 중', '進行中'],
    complete: ['已结束', 'Final', '종료', '已結束'],
    ruling: ['判定结束', 'By ruling', '판정 종료', '判定結束']
  }
  const statusText = getMatchStatusText(match)
  const label = stateLabels[state]
    ? pickUiLocale(locale, ...stateLabels[state])
    : statusText === '未开始'
      ? pickUiLocale(locale, '状态待更新', 'Status pending', '상태 미정', '狀態待更新')
      : formatUiText(statusText, locale)
  return { label, isScore: false }
}

export function staffRoleLabel(staff, locale) {
  if (staff.team) return formatUiText(staff.roles.map(role => staffCreditsText(role === 'coach' ? '教练' : '经理', locale)).join(' / '), locale)
  if (staff.role === 'admin' && staff.duties?.length) {
    const labels = {
  '周赛': 'Weekly matches',
      REFEREE: pickUiLocale(locale, '裁判', 'Referee', '심판', '裁判'),
      VOICE_REFEREE: pickUiLocale(locale, '语音裁判', 'Voice referee', '음성 심판', '語音裁判'),
      DIRECTOR: pickUiLocale(locale, '导播', 'Director', '방송 연출', '導播'),
      OB: pickUiLocale(locale, 'OB', 'Observer', '옵저버', 'OB')
    }
    const duties = staff.duties.map(role => labels[role]).filter(Boolean)
    if (duties.length) return `${pickUiLocale(locale, '赛管', 'Match staff', '대회 운영', '賽管')} · ${duties.join(' / ')}`
  }
  return staff.role === 'caster'
    ? pickUiLocale(locale, '解说', 'Caster', '중계', '解說')
    : pickUiLocale(locale, '赛管', 'Match staff', '대회 운영', '賽管')
}
