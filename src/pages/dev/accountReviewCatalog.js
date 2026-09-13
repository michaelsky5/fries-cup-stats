const space = '/me?season=FCR2026&lang=zh'
const team = `${space}&section=team&cycle=preview-cycle&entry=preview-entry&week=preview-week`
const match = `${space}&section=matches&weeklyMatch=`
const settings = '/account?season=FCR2026&lang=zh'
const item = (id, label, scenario, href, role, description, note = '') => ({ id, label, scenario, href, role, description, note })

export const ACCOUNT_REVIEW_GROUPS = [
  { id: 'entry', label: '进入与认领', items: [
    item('login', '登录与找回密码', 'guest', '/dev/account-review?surface=login', '游客', '受邀邮箱登录；可切换到忘记密码。'),
    item('activation', '邀请认领', 'activation', '/activate-weekly#token=account-review-invitation-token', '受邀队长', '核对队伍和身份，设置账号密码。'),
    item('activation-expired', '邀请失效', 'activation-expired', '/activate-weekly#token=account-review-expired-invitation', '受邀队长', '链接过期后的解释与恢复入口。'),
    item('activation-existing', '已有账号认领', 'activation-existing', '/activate-weekly#token=account-review-existing-invitation', '受邀队长', '使用原密码认领；忘记密码可直接申请找回。'),
    item('activation-used', '邀请已被认领', 'activation-used', '/activate-weekly#token=account-review-used-invitation', '已有账号', '使用过的邀请进入登录，不再重复绑定。'),
    item('activation-revoked', '邀请已撤销', 'activation-revoked', '/activate-weekly#token=account-review-revoked-invitation', '受邀账号', '说明撤销状态与新邀请的衔接。'),
    item('activation-missing', '缺少邀请链接', 'guest', '/activate-weekly', '游客', '解释完整链接的作用，保留已有账号入口。'),
    item('activation-unavailable', '邀请服务暂不可用', 'activation-unavailable', '/activate-weekly#token=account-review-unavailable-invitation', '受邀账号', '读取失败可以重试，不会误报为邀请过期或认领完成。'),
    item('unlinked', '尚未关联队伍', 'viewer', space, '普通账号', '你截图中的状态：个人空间入口和邀请引导。'),
    item('guest-following', '游客的我的关注', 'guest', `${space}&section=following`, '游客', '无需登录，关注先保存在当前浏览器。')
  ] },
  { id: 'recovery', label: '找回密码', items: [
    item('password-recovery', '申请重置邮件', 'guest', '/dev/account-review?surface=forgot', '账号持有人', '填写邮箱，查看申请回执，再返回登录。'),
    item('password-recovery-unavailable', '邮件服务未开放', 'recovery-unavailable', '/dev/account-review?surface=forgot', '账号持有人', '不能申请时说明原因，保留返回登录。'),
    item('password-reset', '设置新密码', 'guest', `${settings}&passwordResetToken=account-review-password-reset-token#overview`, '账号持有人', '从真实账号页打开重置弹窗，地址栏与后续导航不保留凭证。'),
    item('password-reset-invalid', '重置链接不完整', 'guest', '/dev/account-review?surface=reset&passwordResetToken=', '账号持有人', '缺少有效凭证时，直接重新申请邮件。'),
    item('password-reset-expired', '重置链接已过期', 'guest', '/dev/account-review?surface=recovery-expired', '结果样例', '过期结果组件与恢复入口。', '结果样式样例；正式流程依据重置接口返回的状态。'),
    item('password-reset-complete', '密码更新完成', 'guest', '/dev/account-review?surface=recovery-complete', '结果样例', '已完成状态与重新登录的下一步。', '结果样式样例；本页不会更改任何密码。')
  ] },
  { id: 'space', label: '我的空间', items: [
    item('overview', '空间首页', 'preparing', space, '队长 / 经理', '优先待办、下一场比赛与本周参赛进度。'),
    item('tasks', '全部待办', 'multiple', `${space}&section=tasks`, '多身份', '不同角色、队伍和周次的任务汇集与处理。'),
    item('sync-error', '同步失败与恢复', 'partial', space, '队长 / 经理', '保留已经同步的部分，并明确缺失的数据。')
  ] },
  { id: 'preparation', label: '队伍与每周准备', items: [
    item('core', '周期核心名单', 'core', `${team}&step=core`, '队长 / 经理', '选择周期核心，保存草稿并锁定。'),
    item('participation', '当周参赛确认', 'confirmation', `${team}&step=participation`, '队长 / 经理', '确认参加本周比赛，填写可赛时间。'),
    item('roster', '出赛名单草稿', 'preparing', `${team}&step=roster`, '队长 / 经理', '挑选当周队员，核对人数和核心要求后提交。'),
    item('roster-submitted', '名单等待锁定', 'submitted', `${team}&step=roster`, '队长 / 经理', '提交回执与等待赛管处理的状态。'),
    item('player', '选手查看本队', 'player', `${team}&step=roster`, '选手', '查看已保存的安排，明确谁有操作权限。'),
    item('cancelled', '当周已取消', 'cancelled', team, '队长 / 经理', '取消周次的历史记录与不可操作原因。')
  ] },
  { id: 'matches', label: '比赛与站内协作', items: [
    item('match-preparation', '本场安排与准备', 'locked', `${match}preview-weekly-next`, '队长 / 经理', '房间安排、双方准备状态和确认操作。'),
    item('support', '问题与赛管回复', 'support', `${match}preview-weekly-next`, '队长 / 经理', '新问题、处理中和已解决的完整记录。'),
    item('match-live', '比赛进行中', 'match-live', `${match}preview-weekly-next`, '队长 / 经理', '查看进行中的比赛，继续跟踪站内协助。'),
    item('result', '核对本场赛果', 'preparing', `${match}preview-weekly-result`, '队长 / 经理', '确认赛果或提交争议说明。'),
    item('result-disputed', '赛果争议处理中', 'match-disputed', `${match}preview-weekly-result`, '队长 / 经理', '查看已经提交的意见与等待处理状态。'),
    item('result-finalized', '赛果已结算', 'match-finalized', `${match}preview-weekly-result`, '队长 / 经理', '回看正式结算状态，不再出现可编辑操作。')
  ] },
  { id: 'following', label: '关注与消息', items: [
    item('following', '关注近况与对象', 'preparing', `${space}&section=following`, '已登录账号', '关注对象、最近赛果与继续浏览入口。', '公开档案使用本机 FCR2026 资料；可点“管理关注”选择对象。'),
    item('following-matches', '全部关联比赛', 'preparing', `${space}&section=following&followView=matches`, '已登录账号', '按关注对象与比赛状态筛选，保留返回位置。'),
    item('inbox', '赛事消息', 'preparing', `${space}&section=communications`, '已登录账号', '通知、公告和已读反馈。')
  ] },
  { id: 'settings', label: '账号设置', items: [
    item('account-overview', '账号概览', 'preparing', `${settings}#overview`, '已登录账号', '邮箱验证、有效登录与个人资料入口。'),
    item('profile', '个人资料', 'preparing', `${settings}#profile`, '已登录账号', '显示名称、地区、个人介绍和保存反馈。'),
    item('password', '修改密码', 'preparing', `${settings}#password`, '已登录账号', '旧密码校验、新密码及登录失效提示。'),
    item('email', '邮箱验证', 'preparing', `${settings}#email`, '已登录账号', '当前验证状态及发送后的反馈。', '样例不会发送邮件。'),
    item('devices', '登录设备', 'preparing', `${settings}#sessions`, '已登录账号', '当前设备、其他会话与退出确认。'),
    item('email-verified', '邮箱已验证', 'email-verified', `${settings}#email`, '已验证账号', '完成验证后的状态，以及与参赛身份的区别。'),
    item('account-partial', '账号概览 · 设备读取失败', 'devices-unavailable', `${settings}#overview`, '已登录账号', '设备服务不可用时，其他账号入口仍可使用。'),
    item('devices-unavailable', '登录设备 · 读取失败', 'devices-unavailable', `${settings}#sessions`, '已登录账号', '明确失败状态、刷新恢复与当前登录退出入口。'),
    item('profile-readonly', '个人资料 · 只读账号', 'profile-readonly', `${settings}#profile`, '受限账号', '只读资料与不可编辑的原因。')
  ] },
  { id: 'extended', label: '其他身份与补充页面', items: [
    item('caster', '解说工作台', 'caster', `${space}&section=caster`, '解说', '角色任务、比赛安排和相关资料入口。'),
    item('referee', '赛管身份空间', 'referee', `${space}&section=referee`, '赛管', '参赛侧的赛管身份空间，不是 System 运营后台。'),
    item('registration', '赛事报名', 'preparing', '/participate/FCR26', '队长 / 经理', '队伍报名、成员邀请与审核状态。', '这是通用赛事报名页；下周周赛采用邀请认领入口。'),
    item('room-stages', '比赛房分阶段界面', 'locked', '/dev/account-preview?embed=1&view=room', '队长', '选图、阵容、英雄禁用、游戏中和赛果等阶段。', '阶段组件样例；不表示下周周赛已启用全部阶段。')
  ] }
]
export const ACCOUNT_REVIEW_PAGES = ACCOUNT_REVIEW_GROUPS.flatMap(group => group.items.map(page => ({ ...page, group: group.label })))

export function accountReviewOpenHref(id, session, locale = 'zh') {
  return `/__account-review/open/${encodeURIComponent(id)}?${new URLSearchParams({ session, lang: locale })}`
}
