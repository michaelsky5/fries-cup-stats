import { pickUiLocale } from '../../lib/uiText.js'
import { weeklyTeamShort } from '../weekly-overview/weeklyPresentation.js'
import { formatMatchSchedule } from '../../lib/scheduleFormat.js'

const labels = {
  bracket: ['季后赛', 'Playoffs', '플레이오프', '季後賽'],
  bracketFocus: ['对阵与赛程。', 'Bracket and schedule.', '대진과 일정', '對陣與賽程。'],
  bracketIntro: ['从加赛到半决赛，再到决赛与季军赛。对阵、晋级去向和开赛时间放在一张图里。', 'Follow every matchup, advancement branch and start time from the qualifier to the medal matches.', '결정전부터 준결승과 순위 결정전까지 대진, 진출 경로, 시작 시간을 한눈에 확인하세요.', '從加賽到準決賽，再到決賽與季軍賽。對陣、晉級去向和開賽時間放在一張圖裡。'],
  all: ['全部对阵', 'All matchups', '전체 대진', '全部對陣'],
  teamDetail: ['按队伍查看晋级路线', 'Follow a team’s route', '팀별 진출 경로 보기', '按隊伍查看晉級路線'],
  medal: ['决赛 / 季军赛', 'Medal matches', '결승 / 3위 결정전', '決賽 / 季軍賽'],
  winnerLine: ['胜方晋级', 'Winners advance', '승자 진출', '勝方晉級'],
  loserLine: ['负方进入季军赛', 'Losers enter third place', '패자는 3위 결정전으로', '負方進入季軍賽'],
  swipe: ['左右滑动查看完整对阵图', 'Swipe to see the complete bracket', '좌우로 밀어 전체 대진표 보기', '左右滑動查看完整對陣圖'],
  choose: ['选一支队，', 'Choose a team.', '팀을 선택하고,', '選一支隊，'],
  follow: ['看它如何晋级。', 'Follow its route.', '진출 경로를 확인하세요.', '看它如何晉級。'],
  intro: ['沿加赛、半决赛和名次赛查看去向；选择队伍，读取每一步的对手、条件与比赛时间。', 'Choose a team to follow its opponents, conditions and start times through qualification and the medal matches.', '팀을 선택해 결정전부터 순위 결정전까지 상대, 진출 조건, 시작 시간을 확인하세요.', '沿加賽、準決賽和名次賽查看去向；選擇隊伍，讀取每一步的對手、條件與比賽時間。'],
  title: ['季后赛晋级路线', 'Playoff advancement route', '플레이오프 진출 경로', '季後賽晉級路線'],
  qualifier: ['晋级加赛', 'Tiebreak qualifier', '진출권 결정전', '晉級加賽'],
  semifinal: ['半决赛', 'Semifinal', '준결승', '準決賽'],
  final: ['决赛', 'Final', '결승', '決賽'],
  third: ['季军赛', 'Third-place match', '3위 결정전', '季軍賽'],
  timeZone: ['北京时间 · UTC+8', 'Beijing time · UTC+8', '베이징 시간 · UTC+8', '北京時間 · UTC+8'],
  approved: ['排期已确认 · 条件对阵', 'Confirmed schedule · Conditional matchups', '일정 확정 · 조건부 대진', '排期已確認 · 條件對陣'],
  planNote: ['按已确认排期展示。正式种子及完整对阵待加赛复核后公布；第二场半决赛为预计时间，后续场次随前场进度调整。', 'The confirmed schedule is shown. Official seeds and fixtures follow qualifier review. Semifinal 2 is estimated; later matches follow the preceding match.', '확정 일정을 표시합니다. 공식 시드와 대진은 결정전 검토 후 발표됩니다. 준결승 2경기는 예상 시간이며 이후 경기는 앞 경기 진행에 따라 조정됩니다.', '按已確認排期展示。正式種子及完整對陣待加賽複核後公布；第二場準決賽為預計時間，後續場次隨前場進度調整。'],
  official: ['沿用已发布对阵与赛果', 'Published fixtures and results', '공식 대진 및 결과', '沿用已發布對陣與賽果'],
  published: ['已发布对阵', 'Published fixture', '공식 대진', '已發布對陣'],
  pending: ['对阵待公布', 'Matchups pending', '대진 발표 대기', '對陣待公布'],
  full: ['完整季后赛签表', 'Complete playoff bracket', '전체 플레이오프 대진표', '完整季後賽籤表'],
  schedule: ['赛段赛程', 'Cycle schedule', '대회 일정', '賽段賽程'],
  entry: ['出发 / 晋级', 'ENTRY / ADVANCE', '시작 / 진출', '出發 / 晉級'],
  titleMatch: ['获胜争冠', 'WIN / TITLE MATCH', '승리 / 결승', '獲勝爭冠'],
  placement: ['失利争季军', 'LOSS / THIRD PLACE', '패배 / 3위 결정전', '失利爭季軍'],
  afterQualifier: ['若加赛获胜', 'If the qualifier is won', '결정전 승리 시', '若加賽獲勝'],
  afterWin: ['半决赛胜方路线', 'Semifinal winners’ route', '준결승 승자 경로', '準決賽勝方路線'],
  afterLoss: ['半决赛负方路线', 'Semifinal losers’ route', '준결승 패자 경로', '準決賽負方路線'],
  forkNote: ['决赛与季军赛是两条不同分支，实际去向由半决赛赛果决定。', 'The final and third-place match are alternative branches, decided by the semifinal result.', '결승과 3위 결정전은 서로 다른 경로이며 준결승 결과로 결정됩니다.', '決賽與季軍賽是兩條不同分支，實際去向由準決賽賽果決定。'],
  planned: ['已确认排期', 'Scheduled', '일정 확정', '已確認排期'],
  conditional: ['条件对阵 · 待正式确认', 'Conditional · Awaiting confirmation', '조건부 대진 · 공식 확정 대기', '條件對陣 · 待正式確認'],
  estimated: ['预计', 'Estimated', '예상', '預計'],
  tbd: ['时间待公布', 'Time to be announced', '시간 발표 예정', '時間待公布'],
  seed: ['{0} 号种子 · 待公布', 'Seed {0} · Pending', '{0}번 시드 · 발표 예정', '{0} 號種子 · 待公布'],
  qualifierWinner: ['{0} 加赛胜者', '{0} qualifier winner', '{0} 결정전 승자', '{0} 加賽勝者'],
  semifinalWinner: ['半决赛 {0} 胜者', 'Semifinal {0} winner', '준결승 {0} 승자', '準決賽 {0} 勝者'],
  semifinalLoser: ['半决赛 {0} 负方', 'Semifinal {0} loser', '준결승 {0} 패자', '準決賽 {0} 負方'],
  seedPublished: ['正式种子', 'Published seed', '공식 시드', '正式種子'],
  planSlot: ['排期席位 · 种子待公布', 'Scheduled slot · Seeds pending', '예정 자리 · 시드 발표 대기', '排期席位 · 種子待公布'],
  contender: ['加赛参赛队', 'Qualifier entrant', '결정전 참가 팀', '加賽參賽隊'],
  route: ['比赛路线', 'Match route', '경기 경로', '比賽路線'],
  steps: ['路线节点', 'Route stops', '경로 단계', '路線節點'],
  format: ['赛制', 'Format', '경기 방식', '賽制'],
  finalFormat: ['决赛赛制', 'Final format', '결승 경기 방식', '決賽賽制'],
  zone: ['时区', 'Time zone', '시간대', '時區'],
  selectHint: ['切换队伍，读取它的晋级条件与时间', 'Change teams to follow conditions and times', '팀을 바꿔 진출 조건과 시간 확인', '切換隊伍，讀取它的晉級條件與時間'],
  noTeam: ['参赛队伍待公布', 'Entrants to be announced', '참가 팀 발표 예정', '參賽隊伍待公布'],
  points: ['加赛与季后赛不增加赛段积分。', 'Qualifiers and playoffs do not add cycle points.', '결정전과 플레이오프는 대회 포인트에 합산되지 않습니다.', '加賽與季後賽不增加賽段積分。'],
  champion: ['赛段优胜者', 'Cycle winner', '사이클 우승 팀', '賽段優勝者'],
  bye: ['本轮轮空', 'Round bye', '이번 라운드 부전승', '本輪輪空'],
  byeNote: ['直接晋级，无需比赛', 'Advances without a match', '경기 없이 다음 라운드 진출', '直接晉級，無需比賽']
}
export const routeText = (key, locale, value) => pickUiLocale(locale, ...labels[key]).replace('{0}', value ?? '')
export const routeTitle = (node, locale) => `${routeText(({ QUALIFIER: 'qualifier', SEMIFINAL: 'semifinal', FINAL: 'final', THIRD_PLACE: 'third' })[node.kind], locale)}${node.kind === 'SEMIFINAL' ? ` ${node.index}` : ''}`
export function routeSourceLabel(source, route, locale) {
  if (!source) return routeText('pending', locale)
  if (source.kind === 'SEED') return routeText('seed', locale, source.number)
  if (source.stage === 'QUALIFIER') {
    const parent = route.nodes.find(node => node.key === source.key)
    return routeText('qualifierWinner', locale, [parent?.a, parent?.b].filter(Boolean).map(weeklyTeamShort).join(' / '))
  }
  return routeText(source.kind === 'LOSER' ? 'semifinalLoser' : 'semifinalWinner', locale, source.number)
}
export function routeTime(node, locale) {
  if (node.type === 'BYE') return routeText('byeNote', locale)
  if (/^\d{4}-\d{2}-\d{2}$/.test(node.scheduledAt || '') && !Number.isNaN(Date.parse(node.scheduledAt))) {
    return `${new Intl.DateTimeFormat(locale || 'zh-CN', { timeZone: 'Asia/Shanghai', month: '2-digit', day: '2-digit', weekday: 'short' }).format(new Date(node.scheduledAt))} · ${routeText('tbd', locale)}`
  }
  if (node.match && !node.plannedTime) {
    const schedule = formatMatchSchedule(node.match, { locale, includeWeekday: true })
    return schedule.hasSchedule ? schedule.label : routeText('tbd', locale)
  }
  if (!node.scheduledAt || Number.isNaN(Date.parse(node.scheduledAt))) return routeText('tbd', locale)
  const label = new Intl.DateTimeFormat(locale || 'zh-CN', { timeZone: 'Asia/Shanghai', month: '2-digit', day: '2-digit', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(node.scheduledAt))
  return `${label}${node.estimated ? ` · ${routeText('estimated', locale)}` : ''}${node.match && node.plannedTime ? ` · ${routeText('planned', locale)}` : ''}`
}
