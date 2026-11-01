import { pickUiLocale } from '../../lib/uiText.js'

const copy = {
  representatives: ['双方先指定本场操作代表；提前开始须由双方分别确认准备。', 'First assign both match operators. Each team must confirm readiness for an early start.', '먼저 양 팀 경기 담당자를 지정하세요. 조기 시작에는 각 팀의 준비 확인이 필요합니다.', '雙方先指定本場操作代表；提前開始須由雙方分別確認準備。'],
  ready: ['确认本队准备', 'Confirm team readiness', '팀 준비 확인', '確認本隊準備'],
  withdraw: ['撤回准备确认', 'Withdraw readiness', '준비 확인 철회', '撤回準備確認'],
  begin: ['开始赛前流程', 'Start pre-match setup', '경기 준비 시작', '開始賽前流程'],
  beginTitle: ['确认开始赛前流程', 'Confirm pre-match start', '경기 준비 시작 확인', '確認開始賽前流程'],
  confirmed: ['已确认', 'Confirmed', '확인 완료', '已確認'],
  pending: ['待确认', 'Pending', '확인 대기', '待確認'],
  arrived: ['到场 {0}/5', 'Present {0}/5', '참석 {0}/5', '到場 {0}/5'],
  before: ['提前开始需双方确认；{0} 后，可由本场授权操作人启动。到场以游戏内实际情况为准，网页签到不拦截开赛。', 'Both teams must agree to start early. After {0}, an authorized match operator may start. In-game attendance is authoritative; website check-ins do not block the start.', '조기 시작에는 양 팀 동의가 필요합니다. {0} 이후 권한이 있는 경기 담당자가 시작할 수 있습니다. 실제 게임 내 참석을 기준으로 하며 웹 체크인 기록은 시작을 막지 않습니다.', '提前開始需雙方確認；{0} 後，可由本場授權操作人啟動。到場以遊戲內實際情況為準，網頁簽到不攔截開賽。'],
  arrival: ['请先在名单与签到中确认双方各五名合法首发到场。', 'First record five eligible starters present for each team in Roster & check-in.', '먼저 명단 · 체크인에서 양 팀의 적격 선발 5명 참석을 확인하세요.', '請先在名單與簽到中確認雙方各五名合法首發到場。'],
  overdue: ['到场截止已过，请保存到场记录并联系赛事组处理；不会自动判负。', 'The arrival deadline has passed. Keep the attendance record and contact the organizers. No loss is assigned automatically.', '참석 기한이 지났습니다. 참석 기록을 보관하고 운영진에게 문의하세요. 자동 패배 처리는 없습니다.', '到場截止已過，請儲存到場紀錄並聯絡賽事組處理；不會自動判負。'],
  schedulePending: ['比赛时间待定，请联系赛事组确认。', 'The match time is not set. Contact the organizers.', '경기 시간이 미정입니다. 운영진에게 확인하세요.', '比賽時間待定，請聯絡賽事組確認。'],
  rosterPending: ['双方本周参赛资格或五人锁定名单尚未就绪，请联系赛事组核对。', 'Weekly eligibility or a locked five-player roster is not ready. Contact the organizers.', '주간 참가 자격이나 확정된 5인 명단이 준비되지 않았습니다. 운영진에게 확인하세요.', '雙方本週參賽資格或五人鎖定名單尚未就緒，請聯絡賽事組核對。'],
  training: ['演练房间按本场操作权限启动。', 'Training rooms use their assigned operator permissions.', '연습 경기방은 배정된 담당자 권한으로 시작합니다.', '演練房間按本場操作權限啟動。'],
  bothReady: ['双方已确认，可以开始赛前流程。', 'Both teams have confirmed. Pre-match setup can begin.', '양 팀이 확인했습니다. 경기 준비를 시작할 수 있습니다.', '雙方已確認，可以開始賽前流程。'],
  unilateral: ['已到单方启动时间，本场授权操作人可以开始赛前流程。到场以游戏内实际情况为准，网页签到不构成拦截。', 'The unilateral-start time has passed. An authorized match operator may start pre-match setup. In-game attendance is authoritative; website check-ins do not block the start.', '단독 시작 가능 시간이 지났습니다. 권한이 있는 경기 담당자가 경기 준비를 시작할 수 있습니다. 실제 게임 내 참석을 기준으로 하며 웹 체크인 기록은 시작을 막지 않습니다.', '已到單方啟動時間，本場授權操作人可以開始賽前流程。到場以遊戲內實際情況為準，網頁簽到不構成攔截。'],
  roster: ['名单与签到', 'Roster & check-in', '명단 · 체크인', '名單與簽到'],
  support: ['联系赛事组', 'Contact organizers', '운영진 문의', '聯絡賽事組'],
  readyBody: ['确认本队已具备正常参赛条件，同意现在开始先手判定与选禁。双方都确认后才可提前开始；具体首发仍在选图后确认，本次操作不代填选手签到。', 'Confirm that your team is ready to compete and agrees to begin first-pick and map setup now. Both teams must confirm an early start. The actual lineup is still confirmed after map selection; this does not fill in player attendance.', '팀이 정상적으로 참가할 준비가 되었고 지금 선공권 및 맵 선택 절차를 시작하는 데 동의하는지 확인하세요. 조기 시작에는 양 팀 동의가 필요합니다. 실제 선발은 맵 선택 후 확인하며 선수 체크인은 자동 입력하지 않습니다.', '確認本隊已具備正常參賽條件，同意現在開始先手判定與選禁。雙方都確認後才可提前開始；具體首發仍在選圖後確認，本次操作不代填選手簽到。'],
  beginBody: ['确认后立即启动赛前流程，不会等待计划比赛时间。首图选择权确定后，开始 {0} 秒选图倒计时，超时按现有规则处理。', 'Confirmation starts pre-match setup immediately, without waiting for the scheduled match time. Once first-map choice is decided, the {0}-second map-selection timer begins. Existing timeout rules apply.', '확인하면 예정 경기 시간을 기다리지 않고 경기 준비가 즉시 시작됩니다. 첫 맵 선택권이 정해지면 {0}초 맵 선택 타이머가 시작되며 기존 시간 초과 규칙이 적용됩니다.', '確認後立即啟動賽前流程，不會等待計劃比賽時間。首圖選擇權確定後，開始 {0} 秒選圖倒數，超時按現有規則處理。'],
  scheduled: ['计划比赛时间', 'Scheduled match time', '예정 경기 시간', '計劃比賽時間'],
  due: ['到场截止', 'Arrival deadline', '참석 마감', '到場截止'],
  cancel: ['暂不开始', 'Not now', '아직 시작하지 않기', '暫不開始'],
  confirm: ['确认开始', 'Confirm start', '시작 확인', '確認開始'],
  changed: ['房间状态已变化，请关闭弹窗，核对后重新确认。', 'The room state has changed. Close this dialog, review it and confirm again.', '경기방 상태가 바뀌었습니다. 창을 닫고 확인한 뒤 다시 동의하세요.', '房間狀態已變化，請關閉彈窗，核對後重新確認。'],
  failed: ['本次操作未完成，请关闭弹窗查看房间提示后重试。', 'This action did not complete. Close the dialog, review the room message and retry.', '작업이 완료되지 않았습니다. 창을 닫고 경기방 안내를 확인한 뒤 다시 시도하세요.', '本次操作未完成，請關閉彈窗查看房間提示後重試。']
}

export function openingStartText(locale, key, values = []) {
  return pickUiLocale(locale, ...copy[key]).replace(/\{(\d+)\}/g, (_, index) => String(values[index] ?? ''))
}

export function openingStartTime(value, locale) {
  const date = new Date(value)
  if (!value || !Number.isFinite(date.getTime())) return '—'
  return new Intl.DateTimeFormat(locale || 'zh-CN', { timeZone: 'Asia/Shanghai', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(date) + ' (UTC+8)'
}

export function openingStartRequest(data, readyTeam) {
  const consent = data.opening.startConsent
  if (readyTeam) return { action: 'SET_START_READY', extra: { teamId: readyTeam.teamId, ready: true, startContext: readyTeam.context } }
  return { action: 'BEGIN', extra: consent ? { startContext: consent.context } : {} }
}

export function isOpeningStartRequestCurrent(data, request) {
  if (!request) return false
  const consent = data.opening.startConsent
  if (request.action === 'SET_START_READY') {
    const own = consent?.sides.find(side => side.teamId === request.extra.teamId)
    return Boolean(own?.canConfirm && own.rosterReady && own.context === request.extra.startContext)
  }
  return Boolean(data.opening.access.canBegin && (!consent || consent.context === request.extra.startContext))
}

export function openingStartReason(consent) {
  if (consent.training) return 'training'
  if (consent.reason === 'SCHEDULE_PENDING') return 'schedulePending'
  if (consent.reason === 'ARRIVAL_OVERDUE') return 'overdue'
  if (consent.reason === 'ARRIVAL_PENDING') return 'arrival'
  if (consent.reason === 'ROSTER_PENDING') return 'rosterPending'
  return consent.canBegin ? consent.bothConfirmed ? 'bothReady' : 'unilateral' : 'before'
}
