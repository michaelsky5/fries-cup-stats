import { formatOwNamesInText } from './heroes.js'

const REVIEW_LOCALE_STORAGE_KEY = 'fries_cup_review_locale'

export const REVIEW_LOCALES = [
  { id: 'zh-CN', param: 'zh', label: '中' },
  { id: 'en-US', param: 'en', label: 'EN' },
  { id: 'ko-KR', param: 'ko', label: '한' }
]

const UI_COPY = {
  'zh-CN': {
    heroTitle: '这一次，不只是看数据。',
    heroBody: '选择你的身份，找到你的名字。薯条杯会把你的比赛、队伍、解说、赛管记录，或作为见证者看见的整届赛事，整理成一段可以一页页看完的赛季故事。',
    selectIdentity: '选择身份', swipe: '左右滑动', clear: '清空', openReview: '开启回顾',
    resultsHint: '先从推荐名单开始，也可以直接搜索', matchedHint: '根据关键词匹配你的赛季档案',
    noReview: '当前赛季暂无回顾数据', noReviewBody: '当前赛季还没有发布回顾内容。',
    chooseRole: '先选择你的身份', viewerStart: '开启赛事见证回顾', searchPrefix: '搜索你的', featuredSuffix: '推荐回顾',
    emptyChoose: '请选择身份', emptyChooseBody: '选择身份后，可开启对应的赛季回顾。',
    emptySearch: '没有找到结果', emptySearchBody: '可以试试战网 ID、队伍简称、中文名，或输入更短的关键词。',
    emptyFeatured: '暂无推荐结果', emptyFeaturedBody: '当前身份下暂无推荐回顾，可以输入关键词搜索。',
    loading: '正在打开赛季回顾...', back: '返回回顾中心', exit: '退出',
    desktopHint: '点击右侧继续 · 点击左侧返回 · 支持键盘 ← →', prev: '上一幕', next: '下一幕', ticket: '生成纪念票',
    finalPrompt: '把这一段赛季，带回你的记忆里',
    posterTitle: '生成你的薯条杯官方纪念票', viewerPosterTitle: '生成你的赛事见证票', close: '关闭',
    keepsakes: '领取机票 / 电影纪念物', keepsakeTitle: '领取你的赛季首映纪念物',
    ticketFormat: '横版赛季机票', filmPosterFormat: '竖版电影海报', movieTicketFormat: '横版首映电影票',
    generateTicketPng: '生成赛季机票 PNG', generateFilmPosterPng: '生成电影海报 PNG', generateMovieTicketPng: '生成首映电影票 PNG',
    downloadTicketPng: '下载赛季机票', downloadFilmPosterPng: '下载电影海报', downloadMovieTicketPng: '下载首映电影票',
    previewEmptyTicket: '生成后将显示完整横版赛季机票', previewEmptyFilmPoster: '生成后将显示完整竖版电影海报', previewEmptyMovieTicket: '生成后将显示完整横版首映电影票',
    keepsakeTip: '可切换生成赛季机票、电影海报或首映电影票。电脑端可直接下载，手机端可分享或打开图片后长按保存。',
    viewerId: '观众战网 ID / 昵称', viewerIdPlaceholder: '例如：你的战网ID#1234，也可以只填昵称',
    viewerIdHelp: '这个 ID 会写入赛事见证票；不填写时会生成一张通用见证票。',
    generating: '生成中...', generatePng: '生成 PNG', download: '下载纪念票', openImage: '打开图片', sharing: '分享中...', share: '手机分享 / 保存',
    previewEmpty: '生成后将显示完整横版纪念票', imageAlt: '生成后的纪念票',
    posterTip: '当前纪念票为横版 PNG。电脑端可直接下载；手机端可使用“手机分享 / 保存”，或打开图片后长按保存。',
    viewerPosterTip: '观众票是签发给见证者的赛事证明。填写 ID 后，票面会带上你的观众标记。',
    errorGenerate: '生成失败，请稍后再试。', errorOpen: '浏览器阻止了打开图片。可以长按下方预览图保存。',
    errorShare: '当前浏览器不支持直接分享。请打开图片后长按保存。'
  },
  'en-US': {
    heroTitle: 'This time, it is more than data.',
    heroBody: 'Choose the role that was yours and find your name. Fries Cup will turn the matches, teams, voices, operations, and moments you witnessed into a season story you can walk through one page at a time.',
    selectIdentity: 'Choose your role', swipe: 'Swipe to explore', clear: 'Clear', openReview: 'Open review',
    resultsHint: 'Start with the featured archives, or search directly', matchedHint: 'Season archives matched to your search',
    noReview: 'No review data for this season', noReviewBody: 'The season review will appear here once it is published.',
    chooseRole: 'Choose your role first', viewerStart: 'Open the witness review', searchPrefix: 'Search your ', featuredSuffix: ' featured reviews',
    emptyChoose: 'Choose a role', emptyChooseBody: 'Choose the part you played to open the matching season review.',
    emptySearch: 'No results found', emptySearchBody: 'Try a BattleTag, team name, team abbreviation, or a shorter keyword.',
    emptyFeatured: 'No featured reviews yet', emptyFeaturedBody: 'There are no featured archives for this role yet. Try searching by name.',
    loading: 'Opening the season review...', back: 'Back to review center', exit: 'Exit',
    desktopHint: 'Right side to continue · left side to go back · keyboard ← →', prev: 'Previous', next: 'Next', ticket: 'Create keepsake ticket',
    finalPrompt: 'Take this part of the season home with you',
    posterTitle: 'Create your official Fries Cup keepsake ticket', viewerPosterTitle: 'Create your season witness ticket', close: 'Close',
    keepsakes: 'Claim flight / film keepsakes', keepsakeTitle: 'Claim your season premiere keepsake',
    ticketFormat: 'Landscape season boarding pass', filmPosterFormat: 'Portrait film poster', movieTicketFormat: 'Landscape premiere movie ticket',
    generateTicketPng: 'Generate season boarding pass', generateFilmPosterPng: 'Generate film poster', generateMovieTicketPng: 'Generate premiere movie ticket',
    downloadTicketPng: 'Download boarding pass', downloadFilmPosterPng: 'Download film poster', downloadMovieTicketPng: 'Download movie ticket',
    previewEmptyTicket: 'Your complete landscape season boarding pass will appear here', previewEmptyFilmPoster: 'Your complete portrait film poster will appear here', previewEmptyMovieTicket: 'Your complete landscape premiere movie ticket will appear here',
    keepsakeTip: 'Choose a season boarding pass, film poster, or premiere movie ticket. Download on desktop, or share and save on mobile.',
    viewerId: 'Viewer BattleTag / nickname', viewerIdPlaceholder: 'For example: BattleTag#1234, or just a nickname',
    viewerIdHelp: 'This ID will appear on the witness ticket. Leave it blank to create a general witness ticket.',
    generating: 'Generating...', generatePng: 'Generate PNG', download: 'Download ticket', openImage: 'Open image', sharing: 'Sharing...', share: 'Share / save on mobile',
    previewEmpty: 'The complete landscape ticket will appear here after generation', imageAlt: 'Generated keepsake ticket',
    posterTip: 'This is a landscape PNG. Download it on desktop, or use Share / save on mobile and long-press the opened image.',
    viewerPosterTip: 'The witness ticket is proof that you were here. Add an ID to place your own viewer mark on it.',
    errorGenerate: 'We could not create the ticket. Please try again in a moment.', errorOpen: 'The browser blocked the image. Long-press the preview below to save it.',
    errorShare: 'This browser cannot share the image directly. Open the image and long-press to save it.'
  },
  'ko-KR': {
    heroTitle: '이번에는, 데이터 그 이상을 돌아봅니다.',
    heroBody: '당신의 역할을 고르고 이름을 찾아보세요. 프라이즈 컵이 경기와 팀, 중계와 운영, 그리고 당신이 바라본 순간을 한 장씩 넘겨보는 시즌 이야기로 담았습니다.',
    selectIdentity: '역할 선택', swipe: '좌우로 넘겨보세요', clear: '지우기', openReview: '리뷰 열기',
    resultsHint: '추천 아카이브부터 보거나 바로 검색하세요', matchedHint: '검색어와 일치하는 시즌 아카이브',
    noReview: '이 시즌의 리뷰 데이터가 아직 없습니다', noReviewBody: '시즌 리뷰가 공개되면 이곳에 표시됩니다.',
    chooseRole: '먼저 역할을 골라주세요', viewerStart: '목격자 리뷰 열기', searchPrefix: '', featuredSuffix: ' 추천 리뷰',
    emptyChoose: '역할을 선택해 주세요', emptyChooseBody: '당신의 역할을 고르면 해당 시즌 리뷰를 열 수 있습니다.',
    emptySearch: '검색 결과가 없습니다', emptySearchBody: '배틀태그, 팀명, 팀 약칭 또는 더 짧은 검색어를 시도해 보세요.',
    emptyFeatured: '아직 추천 리뷰가 없습니다', emptyFeaturedBody: '이 역할의 추천 아카이브가 아직 없습니다. 이름으로 검색해 보세요.',
    loading: '시즌 리뷰를 여는 중...', back: '리뷰 센터로 돌아가기', exit: '나가기',
    desktopHint: '오른쪽을 누르면 계속 · 왼쪽을 누르면 이전 · 키보드 ← →', prev: '이전', next: '다음', ticket: '기념 티켓 만들기',
    finalPrompt: '이 시즌의 한 조각을 당신의 기억으로 가져가세요',
    posterTitle: '프라이즈 컵 공식 기념 티켓 만들기', viewerPosterTitle: '시즌 목격자 티켓 만들기', close: '닫기',
    keepsakes: '탑승권 / 영화 기념품', keepsakeTitle: '시즌 프리미어 기념품 받기',
    ticketFormat: '가로형 시즌 탑승권', filmPosterFormat: '세로형 영화 포스터', movieTicketFormat: '가로형 프리미어 영화 티켓',
    generateTicketPng: '시즌 탑승권 생성', generateFilmPosterPng: '영화 포스터 생성', generateMovieTicketPng: '프리미어 영화 티켓 생성',
    downloadTicketPng: '탑승권 다운로드', downloadFilmPosterPng: '영화 포스터 다운로드', downloadMovieTicketPng: '영화 티켓 다운로드',
    previewEmptyTicket: '완성된 가로형 시즌 탑승권이 여기에 표시됩니다', previewEmptyFilmPoster: '완성된 세로형 영화 포스터가 여기에 표시됩니다', previewEmptyMovieTicket: '완성된 가로형 프리미어 영화 티켓이 여기에 표시됩니다',
    keepsakeTip: '시즌 탑승권, 영화 포스터, 프리미어 영화 티켓 중에서 선택할 수 있습니다. PC에서는 다운로드하고 모바일에서는 공유하거나 길게 눌러 저장하세요.',
    viewerId: '관람객 배틀태그 / 닉네임', viewerIdPlaceholder: '예: BattleTag#1234 또는 닉네임',
    viewerIdHelp: '입력한 ID가 목격자 티켓에 표시됩니다. 비워 두면 기본 목격자 티켓이 생성됩니다.',
    generating: '생성 중...', generatePng: 'PNG 생성', download: '티켓 다운로드', openImage: '이미지 열기', sharing: '공유 중...', share: '모바일 공유 / 저장',
    previewEmpty: '생성하면 완성된 가로형 티켓이 여기에 표시됩니다', imageAlt: '생성된 기념 티켓',
    posterTip: '가로형 PNG 티켓입니다. PC에서는 다운로드하고, 모바일에서는 공유 / 저장 또는 길게 누르기를 이용하세요.',
    viewerPosterTip: '목격자 티켓은 당신이 이 시즌을 함께 봤다는 증명입니다. ID를 넣어 나만의 표식을 남겨보세요.',
    errorGenerate: '티켓을 생성하지 못했습니다. 잠시 후 다시 시도해 주세요.', errorOpen: '브라우저가 이미지를 열지 못했습니다. 아래 미리보기를 길게 눌러 저장하세요.',
    errorShare: '이 브라우저는 직접 공유를 지원하지 않습니다. 이미지를 열고 길게 눌러 저장하세요.'
  }
}

const IDENTITY_COPY = {
  'zh-CN': [
    ['player', '01', '我是选手', '选手', 'PLAYER', '回看你的英雄、地图、数据与赛季轨迹。', '英雄池、出场地图、代表瞬间'],
    ['teamStaff', '02', '我是经理 / 教练', '经理 / 教练', 'MANAGER / COACH', '打开你带过的队伍，回看它怎么走完这个赛季。', '队伍旅程、阶段战绩、最终排名'],
    ['admin', '03', '我是赛管', '赛管', 'STAFF', '回看你参与过的比赛、阶段、队伍与协作记录。', '幕后场次、参与阶段、协作记录'],
    ['caster', '04', '我是解说', '解说', 'CASTER', '回看你解说过的比赛、阶段、队伍与搭档。', '解说场次、见证队伍、搭档回顾'],
    ['viewer', '05', '我是观众', '观众', 'WITNESS', '作为见证者，回看这届赛事如何被所有人共同完成。', '赛事见证、冠军之路、共同记忆']
  ],
  'en-US': [
    ['player', '01', 'I was a player', 'player', 'PLAYER', 'Revisit your heroes, maps, numbers, and the path you took through the season.', 'Hero pool, maps played, defining moments'],
    ['teamStaff', '02', 'I led a team', 'manager / coach', 'MANAGER / COACH', 'Open the team you guided and see how it made its way through the season.', 'Team journey, stage record, final placing'],
    ['admin', '03', 'I ran the matches', 'staff', 'STAFF', 'Revisit the matches, stages, teams, and people you supported behind the scenes.', 'Matches operated, stages, collaborators'],
    ['caster', '04', 'I was a caster', 'caster', 'CASTER', 'Revisit the matches you called, the teams you saw, and the voices beside you.', 'Matches called, teams witnessed, partners'],
    ['viewer', '05', 'I was watching', 'witness', 'WITNESS', 'Look back as a witness at the season everyone helped bring to life.', 'The event, the champion road, our shared memory']
  ],
  'ko-KR': [
    ['player', '01', '선수로 함께했어요', '선수', 'PLAYER', '내 영웅과 전장, 기록과 시즌의 길을 돌아봅니다.', '영웅 폭, 출전 전장, 기억에 남은 순간'],
    ['teamStaff', '02', '팀을 이끌었어요', '매니저 / 코치', 'MANAGER / COACH', '함께한 팀이 이 시즌을 어떻게 걸어왔는지 돌아봅니다.', '팀의 여정, 단계별 기록, 최종 순위'],
    ['admin', '03', '경기를 운영했어요', '운영 스태프', 'STAFF', '뒤에서 함께한 경기와 단계, 팀과 동료를 돌아봅니다.', '운영 경기, 참여 단계, 협업 기록'],
    ['caster', '04', '중계로 함께했어요', '중계진', 'CASTER', '내가 중계한 경기와 팀, 함께한 목소리를 돌아봅니다.', '중계 경기, 바라본 팀, 중계 파트너'],
    ['viewer', '05', '관람객으로 봤어요', '목격자', 'WITNESS', '모두가 함께 완성한 시즌을 목격자의 시선으로 돌아봅니다.', '대회, 우승의 길, 우리의 기억']
  ]
}

export function normalizeReviewLocale(value, fallback = 'zh-CN') {
  const raw = String(value || '').toLowerCase()
  if (raw === 'en' || raw.startsWith('en-')) return 'en-US'
  if (raw === 'ko' || raw.startsWith('ko-')) return 'ko-KR'
  if (raw === 'zh' || raw.startsWith('zh-')) return 'zh-CN'
  return normalizeReviewLocale(fallback, 'zh-CN')
}

export function getReviewLocaleParam(locale) {
  return REVIEW_LOCALES.find(item => item.id === normalizeReviewLocale(locale))?.param || 'zh'
}

export function getStoredReviewLocale(fallback = 'zh-CN') {
  if (typeof window === 'undefined') return normalizeReviewLocale(fallback)
  return normalizeReviewLocale(window.localStorage.getItem(REVIEW_LOCALE_STORAGE_KEY), fallback)
}

export function setStoredReviewLocale(locale) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(REVIEW_LOCALE_STORAGE_KEY, normalizeReviewLocale(locale))
}

export function withReviewLocale(path, locale) {
  const [pathname, hash = ''] = String(path || '').split('#')
  const [base, query = ''] = pathname.split('?')
  const params = new URLSearchParams(query)
  params.set('lang', getReviewLocaleParam(locale))
  return `${base}?${params.toString()}${hash ? `#${hash}` : ''}`
}

export function reviewText(locale, key) {
  const normalized = normalizeReviewLocale(locale)
  return UI_COPY[normalized]?.[key] ?? UI_COPY['zh-CN'][key] ?? key
}

export function getReviewIdentities(locale, eventNoun = '赛事') {
  const normalized = normalizeReviewLocale(locale)
  return IDENTITY_COPY[normalized].map(([id, no, title, shortTitle, en, desc, hint]) => ({
    id, no, title, shortTitle, en,
    desc: normalized === 'zh-CN' && id === 'viewer'
      ? `作为见证者，回看这届${eventNoun}如何被所有人共同完成。`
      : desc,
    hint
  }))
}

export function getReviewPlaceholder(locale, identity) {
  const ko = normalizeReviewLocale(locale) === 'ko-KR'
  const en = normalizeReviewLocale(locale) === 'en-US'
  const copy = {
    player: en ? 'Player name / BattleTag / team' : ko ? '선수명 / 배틀태그 / 팀명' : '输入选手昵称 / 战网 ID / 队伍简称',
    teamStaff: en ? 'Manager / coach / team name' : ko ? '매니저 / 코치 / 팀명' : '输入经理 / 教练 / 队伍名 / 队伍简称',
    admin: en ? 'Staff name' : ko ? '운영 스태프 이름' : '输入赛管名字',
    caster: en ? 'Caster name' : ko ? '중계진 이름' : '输入解说名字',
    viewer: en ? 'No search needed — open the witness review' : ko ? '검색 없이 바로 목격자 리뷰를 열어보세요' : '观众回顾不需要搜索，直接开启赛事见证回顾'
  }
  return copy[identity] || (en ? 'Choose a role first' : ko ? '먼저 역할을 골라주세요' : '先选择身份')
}

const TOKEN_COPY = {
  'en-US': {
    '比赛场次': 'Matches', '出场时间': 'Time played', '队伍': 'Team', '胜场': 'Wins', '负场': 'Losses', '地图': 'Maps',
    '地图胜场': 'Map wins', '地图负场': 'Map losses', '队员人数': 'Players', '阶段': 'Stage', '回合': 'Round', '比分': 'Score',
    '最终成绩': 'Final result', '第一场': 'First match', '关键战': 'Key match', '最后一战': 'Final match', '最后一场比赛': 'Final match',
    '队伍数量': 'Teams', '地图记录': 'Maps recorded', '解说人数': 'Casters', '赛管人数': 'Staff', '解说出场': 'Casters', '赛管出场': 'Staff',
    '公开预选赛': 'Open Qualifier', '瑞士轮': 'Swiss Round', '突围赛': 'LCQ', '季后淘汰赛': 'Playoffs', '季后赛': 'Playoffs', '总决赛': 'Grand Final', '决赛': 'Final',
    '常规赛阶段': 'Regular Season', '赛事总回顾': 'Event review', '第一批对阵': 'Opening matchups', '季后门票': 'Playoff berth',
    '运载目标': 'Escort', '机动推进': 'Push', '闪点作战': 'Flashpoint', '控制图': 'Control', '混合图': 'Hybrid', '同场': 'Together for', '赛季': 'Season',
    '薯条杯常规赛': 'Fries Cup Regular Season',
    '周一': 'Mon', '周二': 'Tue', '周三': 'Wed', '周四': 'Thu', '周五': 'Fri', '周六': 'Sat', '周日': 'Sun',
    '对手最终拿到了冠军': 'Opponent eventually won the championship', '对手最终走到了决赛': 'Opponent eventually reached the final',
    '对手最终站上了前三': 'Opponent eventually finished in the top three', '对手最终进入了四强': 'Opponent eventually reached the final four',
    '对手最终进入了季后淘汰赛': 'Opponent eventually reached the playoffs', '对手最终停在常规赛阶段': 'Opponent finished in the regular season',
    '这支队伍最终拿到了冠军': 'This team eventually won the championship', '这支队伍最终走到了决赛': 'This team eventually reached the final',
    '这支队伍最终站上了前三': 'This team eventually finished in the top three', '这支队伍最终进入了四强': 'This team eventually reached the final four',
    '这支队伍最终进入了季后淘汰赛': 'This team eventually reached the playoffs', '这支队伍最终停在常规赛阶段': 'This team finished in the regular season',
    '前八队伍': 'Top eight teams', '季后淘汰赛归档': 'Playoff archive', '名字被留下': 'Name remembered', '故事由你来讲': 'Your story is yours to tell',
    '冠军': 'Champion', '亚军': 'Runner-up', '季军': 'Third place', '殿军': 'Fourth place', '重装': 'Tank', '坦克': 'Tank', '输出': 'Damage', '支援': 'Support', '辅助': 'Support',
    '胜利': 'Win', '失利': 'Loss', '分钟': 'min', '阵容中的一员': 'Rostered player', '赛季位置': 'Season role', '共同抵达': 'Team result',
    '选手回顾': 'Player review', '队伍回顾': 'Team review', '多重身份回顾': 'Multi-role review', '跨队伍回顾': 'Multi-team review', '多重身份': 'Multiple roles', '跨队伍': 'Across teams',
    '坦克选手': 'Tank player', '输出选手': 'Damage player', '辅助选手': 'Support player', '选手': 'Player', '身份': 'Role', '经理视角': 'Manager view', '教练视角': 'Coach view', '经理 & 教练': 'Manager & coach',
    '赛管回顾': 'Staff review', '解说回顾': 'Caster review', '最终成绩已归档': 'Final result archived', '参与': 'Worked on', '场比赛': ' matches',
    '涉及阶段': 'Stages covered', '见证队伍': 'Teams covered', '协作搭档': 'Recorded collaborators',
    '公开记录里并肩最多': 'Most shared maps in the public record', '最常使用：': 'Most played: ', '阵容成员': 'Roster member',
    '并肩': 'Together for ', '同阵': 'Same lineup ', '双重身份': 'Dual role', '阵容选择': 'Lineup choices', '复盘': 'Review',
    '组织': 'Organization', '准备': 'Preparation', '调整': 'Adjustment', '对手：': 'Opponent: ', '最后一战：': 'Final match: ',
    '相遇次数': 'Meetings', '代表比赛': 'Representative match', '对手成绩': 'Opponent result', '次相遇': ' meetings', '次使用': ' uses',
    '解说搭档': 'Caster partners', '协作赛管': 'Operations partners', '协作解说': 'Caster partners', '赛管': 'Staff', '解说': 'Caster',
    '阵容留名': 'Named on the roster', '季后赛引入': 'Playoff introduction', '季后赛阵容变更': 'Playoff roster change',
    '个人记录截至常规阶段': 'Personal record ends with the regular stage', '记录阶段': 'Recorded stage', '加入阶段': 'Joined at', '阵容变更': 'Roster change', '出场地图': 'Maps played', '队伍成绩': 'Team result',
    '常规阶段': 'Regular stage', '季后赛前': 'Before playoffs', '教练': 'Coach', '这几张地图属于你': 'These maps belong to you', '谢谢你来过': 'Thank you for being here',
    '谢谢你把时间留在这里': 'Thank you for leaving your time here', '公开比赛数据': 'Public match data', '最终名单': 'Final roster',
    '公开赛程与赛果': 'Published schedule & results', '最终排名': 'Final standings', '解说与赛管记录': 'Broadcast & operations records',
    '主办方寄语': 'Organizer note', '前述赛季记录': 'Prior season records'
  },
  'ko-KR': {
    '比赛场次': '경기', '出场时间': '플레이 시간', '队伍': '팀', '胜场': '승', '负场': '패', '地图': '전장',
    '地图胜场': '전장 승', '地图负场': '전장 패', '队员人数': '선수', '阶段': '단계', '回合': '라운드', '比分': '스코어',
    '最终成绩': '최종 결과', '第一场': '첫 경기', '关键战': '주요 경기', '最后一战': '마지막 경기', '最后一场比赛': '마지막 경기',
    '队伍数量': '팀', '地图记录': '전장 기록', '解说人数': '중계진', '赛管人数': '운영 스태프', '解说出场': '중계진', '赛管出场': '운영 스태프',
    '公开预选赛': '공개 예선', '瑞士轮': '스위스 라운드', '突围赛': '최종 선발전', '季后淘汰赛': '플레이오프', '季后赛': '플레이오프', '总决赛': '그랜드 파이널', '决赛': '결승',
    '常规赛阶段': '정규 시즌', '赛事总回顾': '대회 전체 리뷰', '第一批对阵': '첫 대진', '季后门票': '플레이오프 진출권',
    '运载目标': '호위', '机动推进': '밀기', '闪点作战': '플래시포인트', '控制图': '쟁탈', '混合图': '혼합', '同场': '함께', '赛季': '시즌',
    '薯条杯常规赛': '프라이즈 컵 정규 시즌',
    '周一': '월', '周二': '화', '周三': '수', '周四': '목', '周五': '금', '周六': '토', '周日': '일',
    '对手最终拿到了冠军': '상대는 결국 우승을 차지했습니다', '对手最终走到了决赛': '상대는 결국 결승에 진출했습니다',
    '对手最终站上了前三': '상대는 결국 3위 안에 들었습니다', '对手最终进入了四强': '상대는 결국 4강에 진출했습니다',
    '对手最终进入了季后淘汰赛': '상대는 결국 플레이오프에 진출했습니다', '对手最终停在常规赛阶段': '상대는 정규 시즌에서 여정을 마쳤습니다',
    '这支队伍最终拿到了冠军': '이 팀은 결국 우승을 차지했습니다', '这支队伍最终走到了决赛': '이 팀은 결국 결승에 진출했습니다',
    '这支队伍最终站上了前三': '이 팀은 결국 3위 안에 들었습니다', '这支队伍最终进入了四强': '이 팀은 결국 4강에 진출했습니다',
    '这支队伍最终进入了季后淘汰赛': '이 팀은 결국 플레이오프에 진출했습니다', '这支队伍最终停在常规赛阶段': '이 팀은 정규 시즌에서 여정을 마쳤습니다',
    '前八队伍': '8강 팀', '季后淘汰赛归档': '플레이오프 아카이브', '名字被留下': '이름이 남았습니다', '故事由你来讲': '이야기는 당신의 몫입니다',
    '冠军': '우승', '亚军': '준우승', '季军': '3위', '殿军': '4위', '重装': '돌격', '坦克': '돌격', '输出': '공격', '支援': '지원', '辅助': '지원',
    '胜利': '승리', '失利': '패배', '分钟': '분', '阵容中的一员': '로스터 선수', '赛季位置': '시즌 역할', '共同抵达': '팀 결과',
    '选手回顾': '선수 리뷰', '队伍回顾': '팀 리뷰', '多重身份回顾': '다중 역할 리뷰', '跨队伍回顾': '여러 팀 리뷰', '多重身份': '다중 역할', '跨队伍': '여러 팀',
    '坦克选手': '돌격 선수', '输出选手': '공격 선수', '辅助选手': '지원 선수', '选手': '선수', '身份': '역할', '经理视角': '매니저 시점', '教练视角': '코치 시점', '经理 & 教练': '매니저 & 코치',
    '赛管回顾': '운영 스태프 리뷰', '解说回顾': '중계진 리뷰', '最终成绩已归档': '최종 결과 보관 완료', '参与': '참여', '场比赛': '경기',
    '涉及阶段': '참여 단계', '见证队伍': '기록된 팀', '协作搭档': '기록된 협업자',
    '公开记录里并肩最多': '공개 기록에서 가장 많이 함께함', '最常使用：': '가장 많이 사용: ', '阵容成员': '로스터 멤버',
    '并肩': '함께 ', '同阵': '같은 로스터 ', '双重身份': '듀얼 역할', '阵容选择': '로스터 선택', '复盘': '리뷰',
    '组织': '운영', '准备': '준비', '调整': '조정', '对手：': '상대: ', '最后一战：': '마지막 경기: ',
    '相遇次数': '맞대결', '代表比赛': '대표 경기', '对手成绩': '상대 결과', '次相遇': '회 맞대결', '次使用': '회 사용',
    '解说搭档': '중계 파트너', '协作赛管': '운영 파트너', '协作解说': '중계 파트너', '赛管': '운영 스태프', '解说': '중계진',
    '阵容留名': '로스터에 남은 이름', '季后赛引入': '플레이오프 합류', '季后赛阵容变更': '플레이오프 로스터 변경',
    '个人记录截至常规阶段': '개인 기록은 정규 단계까지', '记录阶段': '기록 단계', '加入阶段': '합류 단계', '阵容变更': '로스터 변경', '出场地图': '출전 전장', '队伍成绩': '팀 결과',
    '常规阶段': '정규 단계', '季后赛前': '플레이오프 전', '教练': '코치', '这几张地图属于你': '이 전장들은 당신의 것입니다', '谢谢你来过': '함께해 주어 고맙습니다',
    '谢谢你把时间留在这里': '이곳에 시간을 남겨 주어 고맙습니다', '公开比赛数据': '공개 경기 데이터', '最终名单': '최종 로스터',
    '公开赛程与赛果': '공개 일정 및 결과', '最终排名': '최종 순위', '解说与赛管记录': '중계 및 운영 기록',
    '主办方寄语': '주최자 메시지', '前述赛季记录': '앞선 시즌 기록'
  }
}

function translateToken(value, locale) {
  const normalized = normalizeReviewLocale(locale)
  if (normalized === 'zh-CN' || typeof value !== 'string') return value
  let text = formatOwNamesInText(value, normalized)
  const replacements = TOKEN_COPY[normalized]
  Object.entries(replacements).sort((a, b) => b[0].length - a[0].length).forEach(([source, target]) => {
    text = text.split(source).join(target)
  })
  if (normalized === 'en-US') {
    text = text.replace(/第\s*(\d+)\s*名/g, '#$1').replace(/第\s*(\d+)\s*轮/g, 'Round $1').replace(/(\d+)\s*张Maps?/g, '$1 maps').replace(/(\d+)\s*场Matches?/g, '$1 matches').replace(/(\d+)\s*场/g, '$1 matches').replace(/(\d+)\s*次/g, '$1 times')
  } else {
    text = text.replace(/第\s*(\d+)\s*名/g, '$1위').replace(/第\s*(\d+)\s*轮/g, '$1라운드').replace(/(\d+)\s*张전장/g, '$1개 전장').replace(/(\d+)\s*场경기/g, '$1경기').replace(/(\d+)\s*场/g, '$1경기').replace(/(\d+)\s*次/g, '$1회')
  }
  return text
}

function getReviewRankTier(value) {
  const text = String(value || '').replace(/\s+/g, '')
  if (!text) return 'unranked'
  if (text.includes('冠军') && !text.includes('亚军')) return 'champion'
  if (text.includes('亚军')) return 'runnerUp'
  if (text.includes('季军')) return 'third'
  if (text.includes('殿军')) return 'fourth'

  const number = Number(text.match(/(\d+)/)?.[1] || 0)
  if (number === 1) return 'champion'
  if (number === 2) return 'runnerUp'
  if (number === 3) return 'third'
  if (number === 4) return 'fourth'
  if (number >= 5 && number <= 8) return 'top8'
  return number > 0 ? 'placed' : 'unranked'
}

function getSceneContext(scenes, profile = {}) {
  const cover = scenes[0] || {}
  const ending = [...scenes].reverse().find(scene => scene.kind === 'ending') || {}
  const companionScene = scenes.find(scene => /THE NAMES BESIDE YOU|NAMES ON THE SAME ROSTER/.test(scene.eyebrow || '')) || {}
  const partnerScene = scenes.find(scene => /PARTNERS/.test(scene.eyebrow || '')) || {}
  const staffMetricScene = scenes.find(scene => scene.eyebrow === 'YOU WERE THERE') || {}
  const signatureScene = scenes.find(scene => /SIGNATURE HERO|ONE CLEAR FRAME/.test(scene.eyebrow || '')) || {}
  const staffStats = staffMetricScene.statLines || []
  const partnerCard = partnerScene.partnerCards?.[0] || partnerScene.partnerGroups?.[0]?.cards?.[0] || {}
  const rawRank = ending.metric || cover.routeTo || cover.route_to || ''
  const subject = cover.callsign || cover.displayName || cover.watermark || cover.issuedTo || profile.mark || 'FRIES CUP'
  const team = cover.teamShortName || cover.team_short_name || cover.chips?.[0] || ''
  const coverage = scenes.some(scene => scene.eyebrow === 'BEYOND THE NUMBERS')
    ? 'roster'
    : scenes.some(scene => scene.eyebrow === 'A SHORT TRACE')
      ? 'brief'
      : 'full'
  return {
    subject,
    team,
    rawRank,
    rank: translateToken(rawRank, profile.locale),
    rankTier: getReviewRankTier(rawRank),
    coverage,
    companion: companionScene.rosterCards?.[0]?.title || '',
    partner: partnerCard.title || '',
    partnerCount: Number(String(partnerCard.value || '').match(/\d+/)?.[0] || 0),
    matchCount: Number(staffMetricScene.metric || 0),
    stageCount: Number(staffStats.find(line => line.label === '涉及阶段')?.value || 0),
    teamCount: Number(staffStats.find(line => line.label === '见证队伍')?.value || 0),
    topHero: signatureScene.images?.[0]?.title || '',
    perspective: cover.identityClass || cover.identity_class || '',
    event: profile.eventTitle || 'Fries Cup 2026',
    eventNoun: profile.eventNoun || 'Fries Cup',
    isRegular: Boolean(profile.isRegular),
    organizerDate: profile.organizerDate || '',
    isCaster: String(cover.eyebrow || '').includes('CASTER') || cover.cardKind === 'caster'
  }
}

function getOrganizerCopy(locale, ctx) {
  const isRegular = Boolean(ctx.isRegular)

  if (locale === 'ko-KR') {
    return isRegular
      ? [
          '아카이브를 닫기 전에',
          '경기는 끝나고,\n순위는 결국 아카이브에 남습니다.\n\n예전에는 프라이즈 컵이\n혼자서도 끝낼 수 있는 작은 대회라고 생각했습니다.\n하지만 점점 더 많은 사람이 함께했고,\n그제야 알았습니다.\n이건 더 이상 한 번의 대회만이 아니라,\n평범한 사람들이 힘을 모아\n혼자서는 못 했을 일을 완성해 가는 시간이었습니다.\n\n이 페이지에 도착했을 때,\n순위보다 더 많은 것을 기억해 주세요.\n한 전장, 한 번의 한타, 곁에서 함께 싸운 이름,\n혹은 “와서 다행이었다”고\n생각했던 한 순간을요.\n\n2026 프라이즈 컵 정규 시즌에\n함께해 주셔서 고맙습니다.\n\nmichaelsky5\n2026년 8월 17일'
        ]
      : [
          '아카이브를 닫기 전에',
          '경기는 끝나고,\n일정은 결국 아카이브에 남습니다.\n\n하지만 이 페이지에 도착했을 때,\n한 전장과 한 번의 한타,\n한 동료와 한 번의 아쉬움,\n혹은 “와서 다행이었다”고\n생각했던 순간을 기억해 주세요.\n\n2026 프라이즈 컵 아카데미 대회에\n함께해 주셔서 고맙습니다.\n여러분이 있었기에\n프라이즈 컵은 프라이즈 컵이 되었습니다.\n경기 그 이상, 함께한 열정이었습니다.\n\nmichaelsky5\n2026년 5월 18일'
        ]
  }

  return isRegular
    ? [
        'Before the archive closes',
        'Matches always end,\nand rankings are eventually archived.\n\nI used to think Fries Cup was a small tournament\none person could somehow finish alone.\nThen more people stepped in, and I understood:\nit had become more than a competition.\nIt was ordinary people, together,\nmaking possible what none of us could do alone.\n\nWhen you reach this page,\nI hope you remember more than a rank:\na map, a team fight, a name beside yours,\nor one moment that made you think,\n“I’m glad I was here.”\n\nThank you for being part of\nthe 2026 Fries Cup Regular Season.\n\nmichaelsky5\n17 August 2026'
      ]
    : [
        'Before the archive closes',
        'Matches always end,\nand schedules are eventually archived.\n\nBut when you reach this page,\nI hope you remember a map, a team fight,\na teammate, a regret,\nor one moment that made you think,\n“I’m glad I was here.”\n\nThank you for being part of\nthe 2026 Fries Cup Academy Series.\nYour presence is what made Fries Cup itself.\nMore than matches, it was shared passion.\n\nmichaelsky5\n18 May 2026'
      ]
}

function getPlayerCopyEn(scene, ctx) {
  const hero = translateToken(ctx.topHero, 'en-US')
  const team = ctx.team || 'your team'
  const rank = ctx.rank || 'the final archive'

  if (scene.eyebrow === '2026 FRIES CUP') {
    if (ctx.coverage === 'roster') return [
      ctx.subject + ', we kept a page for you too',
      'Not every kind of participation is fully lit by maps and numbers. The public record has a blank here, but the roster still carries your name—and your own memory knows what the data could not keep.'
    ]
    if (ctx.coverage === 'brief') return [
      ctx.subject + ', these few maps belong to you too',
      'The public archive kept only a short stretch of your season. We will not turn it into a legend; we only want to return those real minutes to you with the care they deserve.'
    ]
    return [
      ctx.subject + ', this season belongs to you too',
      'The season is over. What once happened live is now an archive, but the maps, teammates, and time you gave it still make up a real piece of your life.'
    ]
  }

  if (scene.eyebrow === 'SIGNATURE HERO' && hero) return [
    hero + ' became one of the clearest silhouettes of your season',
    'A most-played hero is not a definition. It is simply the face that appeared most often while you were making decisions, taking pressure, and finding a way into the next fight.'
  ]

  if (scene.eyebrow === 'ONE CLEAR FRAME' && hero) return [
    hero + ' kept one clear frame of you',
    'A brief appearance does not need to be enlarged. This hero, these minutes, and this one visible frame are already enough to say: you were here.'
  ]

  if (scene.eyebrow === 'A QUIET FRAME') {
    if (ctx.coverage === 'roster') return [
      'The roster itself is enough to keep this place for you',
      'It confirms your name, role, and team. The archive does not invent what happened off camera; it leaves that part with the person who lived it.'
    ]
    if (ctx.coverage === 'brief') return [
      'One of those few maps may return before the score does',
      'The archive can point back to the maps and teammate names that were actually recorded. Their meaning belongs to the person who was there.'
    ]
    if (ctx.companion) return [
      'What returns first may be the name ' + ctx.companion,
      'Shared-map records do not define a relationship. They simply prove that, on this part of the road, your names appeared in the same place.'
    ]
  }

  if (scene.eyebrow === 'FRIES CUP ARCHIVE') {
    if (ctx.coverage === 'roster') {
      if (ctx.rankTier === 'champion') return [
        team + ' became champions, and this page still keeps your name',
        'The public archive has no map statistic beside it. We will not invent one. The honest memory is enough: your name belonged to the roster that reached the final page and won.'
      ]
      return [
        team + ' reached ' + rank + ', and this page still keeps your name',
        'The blank in the data is not a judgment on your season. It is only a boundary in the archive. What happened around it still belongs to you.'
      ]
    }
    if (ctx.coverage === 'brief') return [
      'These few maps reached ' + rank + ' with ' + team,
      'They do not need to represent your whole season. They only need to be remembered honestly—as minutes when your name lit up, your team was beside you, and the match was real.'
    ]
    if (ctx.rankTier === 'champion') return [
      'You and ' + team + ' reached the last page—and won it',
      'The final result says champion. Your recorded maps, minutes, and teammate names show the part of that road that also belongs to your own season.'
    ]
    if (ctx.rankTier === 'runnerUp') return [
      'You and ' + team + ' made it all the way to the final stage',
      'Runner-up is not another word for failure. It means the answer stayed within reach until almost everyone else had already gone home.'
    ]
    if (['third', 'fourth', 'top8'].includes(ctx.rankTier)) return [
      'You and ' + team + ' carried the season into its hardest pages',
      rank + ' closes the team record. Your maps, minutes, and shared lineups turn that placing back into a route that can be traced.'
    ]
    return [
      rank + ' closed the team record, not your story',
      'A placing summarizes the team. The recorded maps, minutes, heroes, and teammate names preserve the part that was specifically yours.'
    ]
  }

  return null
}

function getKoreanTeamLabel(team) {
  return team ? team + ' 팀' : '이 팀'
}

function getPlayerCopyKo(scene, ctx) {
  const hero = translateToken(ctx.topHero, 'ko-KR')
  const team = ctx.team || '팀'
  const teamLabel = getKoreanTeamLabel(ctx.team)
  const rank = ctx.rank || '시즌 아카이브'

  if (scene.eyebrow === '2026 FRIES CUP') {
    if (ctx.coverage === 'roster') return [
      ctx.subject + ', 이 페이지에도 당신의 자리를 남겼습니다',
      '모든 참여가 전장과 숫자로 환하게 기록되는 것은 아닙니다. 공개 기록에는 빈칸이 있지만 로스터에는 이름이 남아 있고, 데이터가 담지 못한 시간은 당신의 기억 속에 있습니다.'
    ]
    if (ctx.coverage === 'brief') return [
      ctx.subject + ', 이 몇 개의 전장도 당신의 시즌입니다',
      '공개 아카이브가 남긴 구간은 짧습니다. 그것을 전설처럼 부풀리지 않고, 실제로 있었던 시간을 그만큼의 온도로 돌려드리고 싶었습니다.'
    ]
    return [
      ctx.subject + ', 이 시즌은 당신의 것이기도 합니다',
      '시즌은 끝났습니다. 실시간으로 흐르던 순간은 아카이브가 되었지만, 전장과 동료, 당신이 남긴 시간은 여전히 삶의 진짜 한 조각입니다.'
    ]
  }

  if (scene.eyebrow === 'SIGNATURE HERO' && hero) return [
    hero + ', 이 시즌의 당신을 가장 선명하게 닮은 실루엣',
    '가장 많이 플레이한 영웅이 당신을 정의하지는 않습니다. 다만 판단하고, 압박을 견디고, 다음 한타로 들어가던 순간에 가장 자주 곁에 있던 얼굴입니다.'
  ]

  if (scene.eyebrow === 'ONE CLEAR FRAME' && hero) return [
    hero + '가 남긴 선명한 한 장면',
    '짧은 출전을 크게 부풀릴 필요는 없습니다. 이 영웅과 이 시간, 눈에 보이는 한 장면만으로도 충분합니다. 당신은 그곳에 있었습니다.'
  ]

  if (scene.eyebrow === 'A QUIET FRAME') {
    if (ctx.coverage === 'roster') return [
      '로스터 기록만으로도 이 자리를 남기기에 충분합니다',
      '이름과 역할, 팀은 최종 로스터가 확인합니다. 아카이브는 화면 밖의 일을 지어내지 않고, 그 부분을 실제로 겪은 사람에게 남겨 둡니다.'
    ]
    if (ctx.coverage === 'brief') return [
      '스코어보다 먼저, 그 몇 개의 전장 중 하나가 돌아올지도 모릅니다',
      '아카이브는 실제로 기록된 전장과 동료의 이름을 다시 가리킬 수 있습니다. 그 의미는 그곳에 있었던 당신의 것입니다.'
    ]
    if (ctx.companion) return [
      ctx.companion + '이라는 이름이 먼저 돌아올지도 모릅니다',
      '같은 전장에 등장한 기록이 관계를 정의하지는 않습니다. 다만 이 구간에서 두 이름이 같은 자리에 있었다는 사실은 분명히 남깁니다.'
    ]
  }

  if (scene.eyebrow === 'FRIES CUP ARCHIVE') {
    if (ctx.coverage === 'roster') {
      if (ctx.rankTier === 'champion') return [
        team + '의 우승 페이지에 당신의 이름도 남아 있습니다',
        '공개 아카이브에는 이름 옆에 전장 기록이 없습니다. 없는 숫자를 만들지는 않겠습니다. 마지막 페이지에 도착해 우승한 로스터에 당신의 이름이 있었다는 사실이면 충분합니다.'
      ]
      return [
        teamLabel + '이 ' + rank + '에 도착했고, 이 페이지에는 당신의 이름도 남아 있습니다',
        '데이터의 빈칸은 당신의 시즌에 대한 평가가 아니라 아카이브의 경계일 뿐입니다. 그 주변에서 실제로 있었던 시간은 여전히 당신의 것입니다.'
      ]
    }
    if (ctx.coverage === 'brief') return [
      '이 몇 개의 전장도 ' + teamLabel + '과 함께 ' + rank + '에 도착했습니다',
      '시즌 전체를 대표할 필요는 없습니다. 이름이 화면에 떠 있었고, 동료가 곁에 있었으며, 경기가 실제로 진행된 시간으로 솔직하게 기억되면 충분합니다.'
    ]
    if (ctx.rankTier === 'champion') return [
      teamLabel + '과 함께 마지막 페이지에 도착해, 우승했습니다',
      '최종 결과에는 우승이라고 적혀 있습니다. 기록된 전장과 시간, 동료의 이름은 그 길 가운데 당신의 시즌에 속한 부분을 보여 줍니다.'
    ]
    if (ctx.rankTier === 'runnerUp') return [
      teamLabel + '과 함께 마지막 무대까지 걸었습니다',
      '준우승은 실패의 다른 이름이 아닙니다. 거의 모든 팀이 집으로 돌아간 뒤에도 답이 손에 닿을 만큼 가까이 있었다는 뜻입니다.'
    ]
    if (['third', 'fourth', 'top8'].includes(ctx.rankTier)) return [
      teamLabel + '과 함께 시즌의 가장 힘든 페이지까지 걸었습니다',
      rank + '가 팀 기록을 마칩니다. 전장과 출전 시간, 함께한 로스터는 그 순위를 다시 따라갈 수 있는 여정으로 바꿉니다.'
    ]
    return [
      rank + '가 팀 기록을 닫았지만, 당신의 이야기를 닫지는 못합니다',
      '순위는 팀을 요약합니다. 기록된 전장과 시간, 영웅과 동료의 이름은 그중 당신에게 속한 부분을 보존합니다.'
    ]
  }

  return null
}

function sceneCopyEn(scene, ctx) {
  const personalized = getPlayerCopyEn(scene, ctx)
  if (personalized) return personalized
  const count = scene.metric || scene.statLines?.[0]?.value || ''
  const lead = translateToken(scene.chips?.[0] || scene.mapCards?.[0]?.title || '', 'en-US')
  const opponent = scene.matchCard?.right || scene.matchCard?.left || ''
  const isPlayoffWithdrawal = scene.chips?.some(chip => String(chip || '').includes('阵容变更'))
  const common = {
    'IDENTITY ARCHIVE': [`${ctx.subject}, your season lived in more than one place`, 'The final roster keeps more than one role or team beside the same BattleTag. These are not duplicate people; they are separate chapters of one season that truly belonged to you.'],
    'MORE THAN ONE PLACE': ['The same name left more than one coordinate in the season', 'The archive separates teams and roles so the facts stay clear. This review brings them back together as one person’s journey.'],
    'IDENTITY CHAPTER': ['One identity, one clear chapter', 'The team, role, stage, and recorded maps show where this part of the season happened. A different entry does not replace it; together they make the record complete.'],
    'ONE PERSON, ONE SEASON': [`${ctx.subject}, these identities make up your 2026`, 'The archive may list each responsibility separately, but memory does not need to split one person apart. Thank you for leaving your name here in more than one way.'],
    'FIRST RECORDED MOMENT': ['This is where the archive first remembers you', 'No one knew how the season would end. A room opened, a map loaded, and your name appeared. That was enough for the story to begin.'],
    'YOU WERE THERE': [`You were there for ${count || 'these'} recorded moments`, 'The count is not a judgment. It is a precise trace of the matches and maps in which your name appeared.'],
    'A SHORT TRACE': [`The archive kept ${count || 'a few'} maps with your name on them`, 'It may be a short record, but short does not mean weightless. These moments happened, and they belong to your season.'],
    'BEYOND THE NUMBERS': ['The final roster still confirms your place', 'It does not tell us what happened off camera, so this archive will not invent it. It confirms only what the source can prove: your name, role, and team.'],
    'POSTSEASON ROSTER': isPlayoffWithdrawal
      ? ['Your personal record stops before the playoffs', 'The roster changed before the playoff stage. The matches and maps recorded before that point remain yours; the team result that came later belongs to the road the roster continued after you left.']
      : ['Your season begins in the playoff chapter', 'The team had already completed the regular stage when your name entered the playoff roster. Your road started later than most, but the archive still gives that different beginning its own place.'],
    'THE NAMES BESIDE YOU': ['These names appeared beside yours most often', 'Shared-map data does not define a relationship. It proves something simpler and still meaningful: your names repeatedly appeared in the same matches and maps.'],
    'NAMES ON THE SAME ROSTER': ['At least this roster still remembers you together', 'The public record cannot replay every moment, but it can remember that these names once belonged to the same team.'],
    'SIGNATURE HERO': [lead ? `${lead} became one of the shapes of your season` : 'No single hero can define your season', 'A most-played hero is not a verdict. It is simply the silhouette that appeared most often while you were making your way through this season.'],
    'ONE CLEAR FRAME': [lead ? `${lead} kept one clear frame of your season` : 'The archive kept one clear frame of you', 'We will not stretch a brief appearance into a legend. We only want to keep the part we can honestly say was yours.'],
    'ROLE MEMORY': ['Your role was more than a column of numbers', 'Pressure, space, timing, damage, healing, survival—each role carries work that a scoreboard can only partly explain.'],
    'ONE MAP REMEMBERS': ['One map still remembers a peak moment', 'This is not a season average. It is one concrete moment when the map, the hero, and the match aligned and left something behind.'],
    'SEASON TAG': ['If this season had a small note beside your name', 'It would not be a final judgment. It would be a reminder of how you kept showing up, one map at a time.'],
    'MAP MEMORY': [lead ? `${lead} appears again and again in your archive` : 'Every map keeps a small piece of the season', 'Map appearances, minutes, and hero records turn a season total back into specific places you can trace.'],
    'REGRET / KEY MATCH': ['Some matches stay because they almost turned', 'Not every important memory is a win. Sometimes the match we remember is the one that left us wishing for one more fight.'],
    'KEY MATCH MEMORY': ['One match holds a clear piece of this season', `Against ${opponent || 'an opponent'}, the result became part of the record—but the feeling of being there was always larger than the score.`],
    'A QUIET FRAME': ['What returns first may not be the score', 'The archive cannot choose what matters most to you. It can return the exact maps and names that were there, and leave their meaning with you.'],
    'FRIES CUP ARCHIVE': ['This season is now part of the archive', 'A final placing summarizes the team. Your recorded maps, minutes, heroes, and teammate names preserve the part that belongs specifically to you.'],
    'FINAL ARCHIVE': ['Thank you for leaving part of your time here', 'Matches end and schedules are filed away. What remains is the proof that people cared enough to play, prepare, tell the story, keep it running, and watch.']
  }

  if (scene.eyebrow === '2026 FRIES CUP') return [`${ctx.subject}, this season belongs to you too`, 'The season is over. What was once happening live is now an archive—but the maps, teammates, and time you gave it still make up a real piece of your life.']
  return common[scene.eyebrow]
}

function sceneCopyKo(scene, ctx) {
  const personalized = getPlayerCopyKo(scene, ctx)
  if (personalized) return personalized
  const count = scene.metric || scene.statLines?.[0]?.value || ''
  const lead = translateToken(scene.chips?.[0] || scene.mapCards?.[0]?.title || '', 'ko-KR')
  const isPlayoffWithdrawal = scene.chips?.some(chip => String(chip || '').includes('阵容变更'))
  const common = {
    'IDENTITY ARCHIVE': [`${ctx.subject}, 당신의 시즌은 한 곳에서만 일어나지 않았습니다`, '최종 로스터에는 같은 배틀태그 옆에 여러 역할 또는 팀이 남아 있습니다. 중복된 사람이 아니라, 분명히 당신에게 속했던 한 시즌의 서로 다른 챕터입니다.'],
    'MORE THAN ONE PLACE': ['같은 이름이 시즌에 여러 개의 좌표를 남겼습니다', '아카이브는 사실을 분명히 하기 위해 팀과 역할을 나눠 기록합니다. 이 리뷰는 그것들을 한 사람의 여정으로 다시 모읍니다.'],
    'IDENTITY CHAPTER': ['하나의 역할, 하나의 분명한 챕터', '팀과 역할, 단계와 출전 기록이 이 시즌의 한 부분이 어디에서 일어났는지 보여 줍니다. 다른 기록이 이를 대신하지 않으며, 모두 함께 있어야 완전해집니다.'],
    'ONE PERSON, ONE SEASON': [`${ctx.subject}, 이 역할들이 당신의 2026을 만듭니다`, '아카이브는 책임을 따로 기록하지만 기억까지 한 사람을 나눌 필요는 없습니다. 여러 방식으로 이곳에 이름을 남겨 주어 고맙습니다.'],
    'FIRST RECORDED MOMENT': ['아카이브가 당신을 처음 기억한 순간', '시즌이 어떻게 끝날지 아무도 몰랐습니다. 방이 열리고, 전장이 로딩되고, 당신의 이름이 떠오르며 이야기가 시작됐습니다.'],
    'YOU WERE THERE': [`${count || '이 기록의'} 순간에 당신은 그곳에 있었습니다`, '이 숫자는 평가가 아니라, 당신의 이름이 실제로 등장한 경기와 전장을 정확히 가리키는 흔적입니다.'],
    'A SHORT TRACE': [`아카이브에 ${count || '몇'}개의 전장이 남았습니다`, '길지 않은 기록이어도 가벼운 것은 아닙니다. 그 순간은 실제로 있었고, 당신의 시즌에 속합니다.'],
    'BEYOND THE NUMBERS': ['최종 로스터가 당신의 자리를 확인합니다', '화면 밖에서 무엇이 있었는지는 알려 주지 않기에 아카이브도 지어내지 않습니다. 출처가 증명하는 이름과 역할, 팀만 분명히 남깁니다.'],
    'POSTSEASON ROSTER': isPlayoffWithdrawal
      ? ['당신의 개인 기록은 플레이오프 전에 멈춥니다', '플레이오프 전에 로스터가 바뀌었습니다. 그전까지 기록된 경기와 전장은 여전히 당신의 것이며, 이후의 팀 성적은 당신이 떠난 뒤 로스터가 계속 걸어간 길에 속합니다.']
      : ['당신의 시즌은 플레이오프 챕터에서 시작됩니다', '팀이 정규 단계를 마친 뒤 당신의 이름이 플레이오프 로스터에 들어왔습니다. 대부분보다 늦게 시작했지만, 아카이브는 그 다른 시작에도 분명한 자리를 남깁니다.'],
    'THE NAMES BESIDE YOU': ['당신의 이름 옆에 가장 자주 등장한 이름들', '같은 전장 기록이 관계를 정의하지는 않습니다. 다만 여러분의 이름이 같은 경기와 전장에 반복해서 등장했다는 사실은 분명히 증명합니다.'],
    'NAMES ON THE SAME ROSTER': ['이 로스터는 여전히 여러분을 함께 기억합니다', '모든 순간을 다시 보여줄 수는 없지만, 이 이름들이 한때 같은 팀이었다는 것은 남아 있습니다.'],
    'SIGNATURE HERO': [lead ? `${lead}, 당신의 시즌을 닮은 한 모습` : '하나의 영웅이 당신의 시즌 전체를 정의할 수는 없습니다', '가장 많이 플레이한 영웅은 평가가 아니라, 당신이 이 시즌을 걸을 때 가장 자주 반복된 실루엣입니다.'],
    'ONE CLEAR FRAME': [lead ? `${lead}가 남긴 선명한 한 장면` : '아카이브가 남긴 선명한 한 장면', '짧은 출전을 전설처럼 부풀리지 않습니다. 확실히 당신의 것이었던 순간만 솔직하게 남겨 둡니다.'],
    'ROLE MEMORY': ['당신의 역할은 숫자 한 줄보다 크습니다', '압박과 공간, 타이밍, 공격과 치유, 생존. 전체 스코어보드가 다 설명하지 못하는 일을 각 역할이 해내고 있습니다.'],
    'ONE MAP REMEMBERS': ['하나의 전장이 기억하는 정점의 순간', '시즌 평균이 아닙니다. 전장과 영웅, 경기가 맞물려 하나의 흔적을 남긴 구체적인 순간입니다.'],
    'SEASON TAG': ['이 시즌에 당신의 이름 옆에 짧은 문장을 남긴다면', '최종 평가가 아닙니다. 전장 하나씩, 당신이 계속 그곳에 있었다는 기억입니다.'],
    'MAP MEMORY': [lead ? `${lead}, 아카이브에 여러 번 남은 전장` : '모든 전장은 시즌의 조각을 간직합니다', '전장 출전과 시간, 영웅 기록은 시즌 합계를 다시 따라갈 수 있는 구체적인 장소로 바꿉니다.'],
    'REGRET / KEY MATCH': ['끝까지 바뀔 수 있을 것 같았던 경기', '중요한 기억이 항상 승리인 것은 아닙니다. 때로는 한 번의 한타를 더 바랐던 경기가 오래 남습니다.'],
    'KEY MATCH MEMORY': ['한 경기에 이 시즌의 선명한 조각이 남아 있습니다', '결과는 기록이 되었지만, 그곳에 있었던 감정은 언제나 스코어보다 큰 것이었습니다.'],
    'A QUIET FRAME': ['나중에 먼저 떠오르는 것은 스코어가 아닐지도 모릅니다', '아카이브가 무엇이 가장 중요한지 대신 정할 수는 없습니다. 실제로 있었던 전장과 이름을 돌려주고, 그 의미를 당신에게 남깁니다.'],
    'FRIES CUP ARCHIVE': ['이 시즌은 이제 아카이브의 일부입니다', '최종 순위는 팀을 요약합니다. 기록된 전장과 시간, 영웅과 동료의 이름은 그중 당신에게 속한 부분을 보존합니다.'],
    'FINAL ARCHIVE': ['이곳에 당신의 시간을 남겨주어 고맙습니다', '경기는 끝나고 일정은 보관됩니다. 그래도 사람들이 함께 플레이하고, 준비하고, 이야기하고, 운영하고, 바라봤다는 사실은 남습니다.']
  }
  if (scene.eyebrow === '2026 FRIES CUP') return [`${ctx.subject}, 이 시즌은 당신의 것이기도 합니다`, '시즌은 끝났습니다. 실시간으로 흐르던 순간은 아카이브가 되었지만, 전장과 동료, 당신이 남긴 시간은 여전히 진짜 삶의 한 조각입니다.']
  return common[scene.eyebrow]
}

function getTeamCopy(scene, locale, ctx) {
  const isKo = locale === 'ko-KR'
  const team = ctx.team || (isKo ? '이 팀' : 'this team')
  const teamLabel = getKoreanTeamLabel(ctx.team)
  const subject = ctx.subject || team
  const rank = ctx.rank || (isKo ? '시즌의 끝' : 'the end of the season')
  const perspective = String(ctx.perspective || '')
  const isDual = /经理.*教练|manager.*coach/i.test(perspective)
  const isCoach = !isDual && /教练|coach/i.test(perspective)
  const isManager = !isDual && /经理|manager/i.test(perspective)
  const stageRows = scene.timeline || []
  const lineupCount = Number(String(scene.title || scene.chips?.[0] || '').match(/\d+/)?.[0] || 0)
  const rosterCount = scene.rosterCards?.length || 0
  const mapCount = Number(scene.metric || 0)
  const topMap = translateToken(scene.mapCards?.[0]?.title || scene.chips?.[0] || '', locale)
  const score = translateToken(scene.statLines?.find(line => line.label === '比分')?.value || scene.matchCard?.result || '', locale)
  const stage = translateToken(scene.statLines?.find(line => line.label === '阶段')?.value || scene.matchCard?.stage || '', locale)
  const opponent = scene.matchCard?.right || scene.matchCard?.left || ''

  if (scene.eyebrow === 'POSTSEASON ROSTER') {
    return isKo
      ? [
          subject + '의 코치 기록은 플레이오프에서 시작됩니다',
          '팀의 정규 단계는 당신이 합류하기 전에 완성됐습니다. 그 이전 경기는 팀이 이곳에 도착한 길이고, 플레이오프 로스터에 이름이 기록된 순간부터가 당신의 코치 기록입니다.'
        ]
      : [
          subject + ', your coaching record begins in the playoffs',
          'The team completed its regular stage before you joined. Those earlier matches explain how the team arrived here; your coaching record begins when your name entered the playoff roster.'
        ]
  }

  if (scene.eyebrow === 'TEAM SEASON REVIEW') {
    if (!isDual && !isCoach && !isManager) return null
    if (isKo) {
      if (isDual) return [
        subject + ', 한 시즌에 두 역할로 이름을 남겼습니다',
        '최종 로스터는 매니저와 코치 두 역할을 같은 이름 옆에 기록했고, 공개 일정은 팀이 실제로 치른 경기를 보존합니다. 이 리뷰는 두 기록을 한 사람의 여정으로 다시 모읍니다.'
      ]
      if (isCoach) return [
        subject + ', ' + teamLabel + '의 코치로 기록되었습니다',
        '스코어는 팀의 승패를, 최종 로스터는 당신의 역할을 기록합니다. 공개되지 않은 과정은 지어내지 않고, 확인 가능한 경기와 명단, 최종 결과를 당신의 이름 옆에 놓습니다.'
      ]
      return [
        subject + ', ' + teamLabel + '의 매니저로 기록되었습니다',
        '최종 로스터는 매니저 역할을, 공개 일정은 팀의 경기를 기록합니다. 모든 과정을 복원할 수는 없지만, 당신의 이름이 등록표 한 줄에만 머물지 않도록 두 기록을 함께 남깁니다.'
      ]
    }

    if (isDual) return [
      subject + ', your name carried two roles in one season',
      'The final roster records manager and coach beside the same name; the public schedule records the matches the team actually played. This review brings both records back into one person’s journey.'
    ]
    if (isCoach) return [
      subject + ', you are recorded as a coach of ' + team,
      'The score records the team’s results; the final roster records your role. We do not invent the private process—only return the confirmed matches, roster, and final result to your name.'
    ]
    return [
      subject + ', you are recorded as a manager of ' + team,
      'The final roster records your role and the public schedule records the team’s matches. The archive cannot reconstruct every unseen task, but it can keep your name from remaining only one line in a form.'
    ]
  }

  if (scene.eyebrow === 'A QUIET FRAME') {
    if (!isDual && !isCoach && !isManager) return null
    if (isKo) {
      if (isDual) return [
        '두 역할은 같은 팀 기록 안에 남았습니다',
        '최종 로스터는 두 역할을 따로 적고, 경기 기록은 하나의 시즌을 보여 줍니다. 어느 한쪽도 합치거나 생략하지 않습니다.'
      ]
      if (isCoach) return [
        '스코어 밖에도 코치의 이름이 남았습니다',
        '공개 기록은 팀의 경기와 최종 로스터의 코치 역할을 함께 확인합니다. 과정은 지어내지 않지만, 당신이 이 시즌에 속했다는 사실은 분명히 남깁니다.'
      ]
      return [
        '완료된 경기마다 매니저의 이름도 같은 시즌에 남습니다',
        '최종 로스터는 역할을, 일정은 실제 경기를 확인합니다. 모든 조율을 복원하지는 못해도, 이 팀과 함께한 자리는 확인할 수 있습니다.'
      ]
    }

    if (isDual) return [
      'Both roles remain inside the same team record',
      'The final roster lists them separately while the match archive shows one season. Neither role is merged away or omitted.'
    ]
    if (isCoach) return [
      'A coach’s name remains outside the scoreline too',
      'The public record confirms both the team’s matches and your coaching role on the final roster. It does not invent the process, but it clearly keeps your place in the season.'
    ]
    return [
      'Every completed match also sits beside the manager’s name',
      'The final roster confirms the role and the schedule confirms the matches. It cannot reconstruct every coordination task, but it can preserve your place with this team.'
    ]
  }

  if (scene.eyebrow === 'THE FIRST STEP') {
    return isKo
      ? ['공개 일정에서 확인되는 팀의 첫 경기', '시간순으로 정리한 일정에서 이 경기 카드가 팀 기록의 첫 줄입니다. 대진과 단계, 스코어가 시즌이 시작된 정확한 좌표를 남깁니다.']
      : ['The team’s first match in the published schedule', 'Ordered by the published timeline, this match card is the first line of the team record. Its matchup, stage, and score give the season an exact starting point.']
  }

  if (scene.eyebrow === 'STAGE BY STAGE') {
    const summary = stageRows.map(row => translateToken(row.label, locale) + ' ' + translateToken(row.value, locale)).join(isKo ? ', ' : ' · ')
    return isKo
      ? ['공개 일정이 팀의 길을 ' + stageRows.length + '개 단계로 나눕니다', (summary || '단계별 기록이 공개 일정에 남아 있습니다.') + (scene.body?.includes('季后赛才开始') ? ' 최종 로스터가 확인하는 당신의 코치 기록은 플레이오프부터 시작됩니다.' : ' 각 수치는 공개된 경기 결과에서 왔습니다.')]
      : ['The published schedule divides the team’s road into ' + stageRows.length + ' stages', (summary || 'The stage-by-stage record remains in the published schedule.') + (scene.body?.includes('季后赛才开始') ? ' The final roster shows that your coaching record begins only in the playoffs.' : ' Every figure comes from published match results.')]
  }

  if (scene.eyebrow === 'ADJUSTMENT') {
    return isKo
      ? [lineupCount ? lineupCount + '회, 공개 기록에서 가장 자주 등장한 5인 조합' : '공개 기록은 하나의 고정 5인 조합을 만들지 못했습니다', lineupCount ? '공개 출전 데이터에서 이 다섯 이름이 ' + lineupCount + '회 함께 등장합니다. 이것이 특정 코치 선택이나 전략을 직접 증명하지는 않으며, 확인 가능한 기록에서 가장 자주 반복됐다는 뜻입니다.' : '팀 경기 기록은 남아 있지만 하나의 명확한 최고 빈도 조합을 확인하기에는 부족합니다. 이 페이지는 코치의 과정을 대신 써 넣지 않습니다.']
      : [lineupCount ? lineupCount + ' times: the most frequent five-player lineup in the public record' : 'The public record does not form one stable five-player lineup', lineupCount ? 'Published appearance data places these five names together ' + lineupCount + ' times. That does not directly prove a coaching choice or strategy; it only marks the most frequent combination in the verifiable record.' : 'The team’s match record remains, but it is not enough to identify one clear most-used five-player lineup. This page does not invent the coaching process.']
  }

  if (scene.eyebrow === 'MANAGER / COACH') {
    return isKo
      ? ['최종 로스터의 두 역할과 공개 기록의 한 팀', lineupCount ? '최종 로스터는 매니저와 코치 두 역할을 확인하고, 출전 데이터는 이 다섯 이름이 ' + lineupCount + '회 함께 등장했다고 기록합니다. 각 데이터의 범위를 섞지 않고 그대로 보존합니다.' : '최종 로스터는 매니저와 코치 두 역할을 확인하고, 공개 일정은 팀의 경기 기록을 보존합니다. 과정이 공개되지 않은 부분은 비워 둡니다.']
      : ['Two final-roster roles beside one published team record', lineupCount ? 'The final roster confirms both manager and coach, while appearance data records these five names together ' + lineupCount + ' times. This review preserves each fact without merging their scopes.' : 'The final roster confirms both manager and coach, while the public schedule preserves the team’s matches. Anything outside the published record remains unwritten.']
  }

  if (scene.eyebrow === 'PLAYOFFS') {
    return isKo
      ? [rank + '가 이 팀의 플레이오프 위치를 확인합니다', '최종 순위와 단계별 경기 결과가 팀이 플레이오프 후반까지 도달한 경로를 확인합니다. 이 페이지는 그 공개된 결과의 의미만 설명합니다.']
      : [rank + ' confirms where this team reached in the playoffs', 'The final standing and stage results confirm that the team reached the later rounds of the playoffs. This page explains only the meaning supported by those published results.']
  }

  if (scene.eyebrow === 'MAPS REMEMBER') {
    return isKo
      ? [mapCount + '개의 전장이 팀의 시즌을 더 구체적으로 만듭니다', topMap ? topMap + '이 가장 자주 기록된 전장입니다. 총 전장 수와 승패, 출전 시간은 최종 순위를 실제 경기 단위로 다시 펼쳐 보여 줍니다.' : '각 전장에는 확인 가능한 상대와 결과, 출전 시간이 남아 있습니다.']
      : [mapCount + ' maps make the team’s season more specific', topMap ? topMap + ' is the team’s most frequently recorded map. Map count, wins, losses, and time played unfold the final standing back into real match units.' : 'Each map preserves a verifiable opponent, result, and duration.']
  }

  if (scene.eyebrow === 'KEY MATCH') {
    return isKo
      ? ['공개 일정에서 고른 시즌의 한 단면', (stage ? stage + '의 ' : '') + (opponent ? opponent + '와의 경기' : '이 경기') + (score ? ', 스코어 ' + score : '') + '가 대표 기록으로 남았습니다. 단계와 경기 위치에 따라 선택했으며, 존재하지 않는 감정이나 뒷이야기는 덧붙이지 않습니다.']
      : ['One cross-section selected from the published schedule', (stage ? 'In ' + stage + ', ' : '') + (opponent ? 'the match against ' + opponent : 'this match') + (score ? ' finished ' + score : '') + '. It is selected by stage and schedule position, without adding emotions or off-record stories.']
  }

  if (scene.eyebrow === 'SEASON OPPONENT') {
    const meetings = Number(scene.statLines?.find(line => line.label === '相遇次数')?.value || 0)
    const opponentRank = translateToken(scene.statLines?.find(line => line.label === '对手成绩')?.value || '', locale)
    return isKo
      ? [meetings + '번의 맞대결이 이 상대를 시즌 기록에 남겼습니다', '공개 일정은 반복된 맞대결을, 최종 순위는 상대의 ' + (opponentRank || '최종 결과') + '를 확인합니다. 이 두 데이터가 이 대진의 시즌 좌표를 만듭니다.']
      : [meetings + ' meetings place this opponent inside the season record', 'The published schedule confirms the repeated matchup, and the final standing records the opponent’s ' + (opponentRank || 'result') + '. Together, those facts give this rivalry an exact season coordinate.']
  }

  if (scene.eyebrow === 'NOT ALONE') {
    return isKo
      ? [rosterCount + '명의 이름이 같은 최종 로스터와 출전 기록에 남아 있습니다', '최종 로스터와 공개 출전 데이터가 선수, 역할, 전장 기록을 같은 팀 페이지에 연결합니다. 코치나 매니저가 실제로 어떻게 배치했는지는 추측하지 않습니다.']
      : [rosterCount + ' names remain on the same final roster and appearance record', 'The final roster and published appearance data connect the players, roles, and map records on one team page. This archive does not guess how a coach or manager arranged them.']
  }

  if (scene.eyebrow === 'LAST MATCH') {
    return isKo
      ? ['공개 시간순 기록의 마지막 팀 경기', '이 경기 뒤에는 같은 시즌의 다음 일정이 없습니다. 대진과 단계, 스코어가 팀 기록의 정확한 끝점을 남깁니다.']
      : ['The team’s final match in the published timeline', 'No later fixture remains in the same season after this match. Its matchup, stage, and score mark the exact endpoint of the team record.']
  }

  if (scene.eyebrow === 'FINAL RESULT') {
    if (!isDual && !isCoach && !isManager) return null
    if (isKo) {
      if (ctx.rankTier === 'champion') return [
        teamLabel + '은 우승으로 시즌을 마쳤고, 최종 로스터는 ' + subject + '의 역할을 남겼습니다',
        '최종 결과는 우승이고, 최종 로스터에는 당신의 역할이 남아 있습니다. 팀의 결과와 개인의 역할을 함께 기록하되, 둘의 범위도 분명히 구분합니다.'
      ]
      if (ctx.rankTier === 'runnerUp') return [
        teamLabel + '은 준우승으로 시즌을 마쳤고, 최종 로스터는 ' + subject + '의 역할을 남겼습니다',
        '준우승은 팀의 최종 결과이고, 최종 로스터는 당신의 역할을 확인합니다. 두 기록을 같은 페이지에 놓되 서로의 범위를 대신하지 않습니다.'
      ]
      return [
        rank + '가 팀의 기록을 마쳤고, 최종 로스터는 당신의 역할을 남겼습니다',
        teamLabel + '의 2026 시즌에 이름을 남겨 주어 고맙습니다. 팀의 결과와 당신의 역할이 같은 아카이브에 정확히 보존됩니다.'
      ]
    }

    if (ctx.rankTier === 'champion') return [
      team + ' finished as champion, and the final roster keeps ' + subject + '’s role',
      'The final result says champion, and the final roster keeps your role. This review places the team result and your identity together while keeping their scopes clear.'
    ]
    if (ctx.rankTier === 'runnerUp') return [
      team + ' finished as runner-up, and the final roster keeps ' + subject + '’s role',
      'Runner-up is the team’s final result, while the final roster confirms your role. This review places both records together without letting either stand in for the other.'
    ]
    return [
      rank + ' closed the team record; the final roster kept your role',
      'Thank you for leaving your name in ' + team + '’s 2026 season. The team result and your identity are now preserved accurately in the same archive.'
    ]
  }

  return null
}

function getStaffCopy(scene, locale, ctx) {
  const isKo = locale === 'ko-KR'
  const subject = ctx.subject || (isKo ? '당신' : 'you')
  const matchCount = ctx.matchCount || Number(scene.metric || 0)
  const stageCount = ctx.stageCount || 0
  const teamCount = ctx.teamCount || 0
  const topStage = translateToken(scene.dataBars?.[0]?.label || '', locale)
  const topStageCount = Number(scene.dataBars?.[0]?.value || 0)
  const topTeam = scene.teamCards?.[0]?.title || ''
  const topTeamCount = Number(String(scene.teamCards?.[0]?.value || '').match(/\d+/)?.[0] || 0)
  const partnerCount = ctx.partnerCount || 0

  if (scene.eyebrow === 'CASTER SEASON REVIEW') {
    return isKo
      ? [subject + ', 당신의 목소리도 이 시즌 기록에 남아 있습니다', '공개 기록은 ' + matchCount + '경기의 중계진 명단에 당신의 이름을 남겼습니다. ' + stageCount + '개 단계와 ' + teamCount + '개 팀에 걸친 이 숫자는 구체적인 멘트를 보존하지 못하지만, 그 경기들에 중계진으로 있었다는 사실을 확인합니다.']
      : [subject + ', your voice remains in this season record', 'The published archive places your name in the caster field for ' + matchCount + ' matches across ' + stageCount + ' stages and ' + teamCount + ' teams. It cannot preserve every line you spoke, but it confirms that you were there as a caster.']
  }

  if (scene.eyebrow === 'STAFF SEASON REVIEW') {
    return isKo
      ? [subject + ', 이 시즌의 운영 기록에도 당신의 이름이 있습니다', '공개 기록은 ' + matchCount + '경기의 운영 명단에 당신의 이름을 남겼습니다. ' + stageCount + '개 단계와 ' + teamCount + '개 팀에 걸친 이 숫자는 보이지 않는 과정을 추측하지 않고, 경기 운영에 참여했다는 사실만 정확히 확인합니다.']
      : [subject + ', your name is part of this season’s operations record', 'The published archive places your name in the staff field for ' + matchCount + ' matches across ' + stageCount + ' stages and ' + teamCount + ' teams. It does not guess at off-camera details; it simply confirms your recorded participation.']
  }

  if (scene.eyebrow === 'FIRST CAST' || scene.eyebrow === 'FIRST STAFF RECORD') {
    return isKo
      ? [ctx.isCaster ? '공개 기록에서 확인되는 첫 중계 경기' : '공개 기록에서 확인되는 첫 운영 경기', '공개 일정의 시간순으로 정리했을 때 이 경기가 첫 줄입니다. 경기 카드의 대진, 단계, 결과가 당신의 기록이 시작된 정확한 좌표를 남깁니다.']
      : [ctx.isCaster ? 'Your first caster record in the published archive' : 'Your first staff record in the published archive', 'Ordered by the published schedule, this match is the first line. Its matchup, stage, and result give your season record an exact starting point.']
  }

  if (scene.eyebrow === 'YOU WERE THERE') {
    return isKo
      ? [matchCount + '경기가 당신의 이름을 기억합니다', '이 기록은 ' + stageCount + '개 단계와 ' + teamCount + '개 팀에 걸쳐 있습니다. 구체적인 말이나 업무를 대신 써 넣지 않고, 공개 명단이 확인하는 참여만 그대로 남깁니다.']
      : [matchCount + ' matches remember your name', 'The record spans ' + stageCount + ' stages and ' + teamCount + ' teams. It does not invent specific words or duties; it preserves only the participation confirmed by the published archive.']
  }

  if (scene.eyebrow === 'STAGE MEMORY') {
    return isKo
      ? [topStage ? topStage + '에 가장 많은 기록이 남았습니다' : '기록은 여러 단계를 지나갑니다', topStage ? '전체 ' + matchCount + '경기 중 ' + topStageCount + '경기가 이 단계에 있습니다. 이것은 난이도에 대한 평가가 아니라, 이름이 가장 자주 등장한 구간이라는 뜻입니다.' : '공개된 경기 기록이 확인하는 단계별 분포만 보존했습니다.']
      : [topStage ? 'Most of your records came from ' + topStage : 'Your record crosses several stages', topStage ? topStageCount + ' of your ' + matchCount + ' recorded matches came from this stage. That is not a judgment of difficulty; it simply marks where your name appeared most often.' : 'This archive preserves only the stage distribution confirmed by the published match records.']
  }

  if (scene.eyebrow === 'TEAMS SEEN') {
    return isKo
      ? [topTeam ? topTeam + ' 경기에 가장 자주 이름이 함께 남았습니다' : '여러 팀의 경기 옆에 당신의 이름이 있습니다', topTeam ? topTeam + '이 등장한 경기에서 당신도 ' + topTeamCount + '회 기록됐습니다. 소속을 뜻하지 않고, 공개 아카이브에서 가장 자주 만난 팀이라는 뜻입니다.' : '소속이나 관계를 추측하지 않고, 같은 경기 기록에 등장했다는 사실만 남깁니다.']
      : [topTeam ? 'Your name appeared most often beside ' + topTeam : 'Your name appears beside many teams', topTeam ? 'You were recorded in ' + topTeamCount + ' matches involving ' + topTeam + '. This does not imply team membership; it only marks the team you met most often in the public archive.' : 'This does not guess at affiliation or relationship; it preserves only that you appeared in the same match records.']
  }

  if (scene.eyebrow === 'CASTER PARTNERS' || scene.eyebrow === 'STAFF PARTNERS') {
    if (ctx.partner) return isKo
      ? [ctx.partner + '와 가장 자주 같은 기록에 등장했습니다', '공개 협업 기록에서 두 이름은 ' + partnerCount + '경기에 함께 등장합니다. 데이터는 구체적인 대화나 분업을 설명하지 않지만, 이 반복된 동시 기록은 정확히 남깁니다.']
      : ['You appeared most often beside ' + ctx.partner, 'The published collaboration record places both names in ' + partnerCount + ' matches. It does not describe private conversations or division of work; it preserves the repeated co-appearance exactly.']
    return isKo
      ? ['고정된 파트너 기록은 없지만, 이름은 남아 있습니다', matchCount + '경기의 공개 명단이 당신의 참여를 각각 확인합니다.']
      : ['There is no fixed partner in the record, but your name remains', 'The published credits for ' + matchCount + ' matches confirm your participation one line at a time.']
  }

  if (scene.eyebrow === 'BIGGEST STAGE' || scene.eyebrow === 'KEY STAFF MATCH') {
    return isKo
      ? [ctx.isCaster ? '가장 마지막 단계에 가까운 중계 기록' : '가장 마지막 단계에 가까운 운영 기록', '공개 일정의 단계 순서로 보았을 때 이 경기가 당신의 기록 중 시즌 결말에 가장 가깝습니다. 그래서 이 페이지에 따로 남겼습니다.']
      : [ctx.isCaster ? 'Your caster record closest to the final stage' : 'Your staff record closest to the final stage', 'By the published stage order, this match sits closest to the end of the season among your records. That is why it has its own page here.']
  }

  if (scene.eyebrow === 'LAST RECORD') {
    return isKo
      ? ['공개 시간순 기록의 마지막 경기', '이 경기 뒤에는 같은 역할로 남은 다음 줄이 없습니다. 기록은 여기서 끝나지만, 당신이 이 시즌에 있었다는 사실도 여기서 분명해집니다.']
      : ['The final match in your published timeline', 'No later line remains under the same role after this match. The record ends here, and confirms just as clearly that you were part of this season.']
  }

  if (scene.eyebrow === 'A QUIET FRAME') {
    if (ctx.partner) return isKo
      ? [matchCount + '경기 중 어디에서든 기억을 다시 시작할 수 있습니다', ctx.partner + '와 같은 기록에 ' + partnerCount + '회 등장했다는 숫자가 하나의 입구가 됩니다. 데이터는 그때의 내용을 보존하지 못했지만, 함께 이름이 남았다는 사실은 보존했습니다.']
      : ['You can begin remembering from any of these ' + matchCount + ' matches', 'The ' + partnerCount + ' shared records with ' + ctx.partner + ' offer one doorway back. The data did not keep what happened between you; it kept the fact that both names were there.']
    return isKo
      ? [matchCount + '경기 중 어디에서든 기억을 다시 시작할 수 있습니다', '공개 데이터는 구체적인 말이나 과정을 저장하지 못했습니다. 대신 당신의 이름이 남은 경기들을 정확히 보존했습니다.']
      : ['You can begin remembering from any of these ' + matchCount + ' matches', 'The public data could not keep specific words or processes. It preserved the matches where your name appeared.']
  }

  if (scene.eyebrow === 'FRIES CUP ARCHIVE') {
    if (isKo) return ctx.isCaster
      ? [subject + ', ' + matchCount + '경기의 중계 기록에 이름을 남겨 주어 고맙습니다', '공개 데이터는 목소리를 저장하지 못하지만 경기와 이름은 저장합니다. 그래서 이 리뷰는 당신의 이름을 그 경기들 옆에 다시 놓았습니다.']
      : [subject + ', ' + matchCount + '경기의 운영 기록에 이름을 남겨 주어 고맙습니다', '공개 데이터는 보이지 않는 과정을 설명하지 못하지만 경기와 이름은 저장합니다. 그래서 이 리뷰는 당신의 이름을 그 경기들 옆에 다시 놓았습니다.']
    return ctx.isCaster
      ? [subject + ', thank you for leaving your name in ' + matchCount + ' caster records', 'Public data cannot store a voice, but it can store matches and names. This review therefore places your name back beside those matches.']
      : [subject + ', thank you for leaving your name in ' + matchCount + ' staff records', 'Public data cannot explain off-camera processes, but it can store matches and names. This review therefore places your name back beside those matches.']
  }

  return null
}

const TEAM_SCENES = {
  'TEAM SEASON REVIEW': ['You helped this team become a season', 'Every schedule, reminder, review, adjustment, and moment of waiting helped turn a list of names into a team that could enter the server together.'],
  'THE FIRST STEP': ['The first match made the season real', 'Before it was a record, it was a date everyone had to reach. The room opened, the opponent arrived, and the team took its first step.'],
  'THE ROAD': ['This was not just a row of fixtures', 'Each match held preparation, changes, and the need to face the next one. Walking through all of them is what made the road complete.'],
  'STAGE BY STAGE': ['You did not arrive here all at once', 'Every stage asked a different question of the team. Together, those stages became the shape of a full season.'],
  'MANAGER / COACH': ['You carried two kinds of responsibility', 'You helped the team reach the server, and also helped it search for an answer once the match began. Much of that work never enters the score.'],
  ADJUSTMENT: ['The hardest question was always how to play the next one', 'Review was never about proving the past. It was about giving the next match a different answer.'],
  PLAYOFFS: ['The season reached its sharpest chapter', 'From here, every match could end the road. Reaching this stage meant the team had already walked farther than most.'],
  'MAPS REMEMBER': ['The maps remember the route the team actually took', 'Scores are summarized and standings are compressed, but each map still holds the fights, waits, and resets that made the season real.'],
  'KEY MATCH': ['One match became a clear cross-section of the season', 'A key match is more than a result. It shows how a team met pressure together on one particular day.'],
  'SEASON OPPONENT': ['Some opponents become part of the season’s shape', 'An opponent is not only a name across the bracket. Meeting them can change the preparation, the pressure, and what remains in memory.'],
  'NOT ALONE': ['These are the names you kept bringing into the server', 'A roster is not just a list. It is a group of people you reminded, waited for, prepared with, and trusted to stand together.'],
  'LAST MATCH': ['The schedule reached its final match', 'It cannot summarize the whole team, but it became the last competitive point of this season—and the place where remembering slowly began.'],
  'A QUIET FRAME': ['What remains may be the moment everyone was finally ready', 'Schedules do not remember the waiting. But when every name lit up and the room could finally begin, the invisible work became a real match.'],
  'FINAL RESULT': ['The result closed the record; you remembered the people', 'Thank you for walking this season with the team. May a name, a voice, or the relief of hearing “everyone is here” return before the numbers do.']
}

const TEAM_SCENES_KO = {
  'TEAM SEASON REVIEW': ['당신은 이 팀이 하나의 시즌이 되도록 함께했습니다', '일정과 확인, 리뷰와 조정, 기다림의 순간이 이름의 목록을 함께 서버에 들어가는 팀으로 만들었습니다.'],
  'THE FIRST STEP': ['첫 경기가 시즌을 현실로 만들었습니다', '기록이 되기 전, 모두가 함께 도착해야 할 하나의 날짜였습니다. 방이 열리고 상대가 도착하며 팀이 첫걸음을 떼었습니다.'],
  'THE ROAD': ['일정표의 연속된 칸만은 아니었습니다', '각 경기에는 준비와 변화, 그리고 다음 경기를 마주해야 하는 마음이 있었습니다. 그 모든 곳을 함께 걸었기에 길이 완성됐습니다.'],
  'STAGE BY STAGE': ['한번에 이곳에 도착한 것이 아닙니다', '각 단계는 팀에게 다른 질문을 던졌고, 그 단계들이 모여 하나의 완전한 시즌이 됐습니다.'],
  'MANAGER / COACH': ['당신은 두 가지 책임을 함께 안았습니다', '팀을 서버까지 데려왔고, 경기가 시작된 후에는 다음 답을 함께 찾았습니다. 그 대부분은 스코어에 남지 않습니다.'],
  ADJUSTMENT: ['가장 어려운 질문은 항상 “다음 경기를 어떻게 할까”였습니다', '리뷰는 지난 경기를 증명하기 위한 것이 아니라, 다음 경기에 다른 답을 내기 위한 것이었습니다.'],
  PLAYOFFS: ['시즌은 가장 날카로운 챕터에 도착했습니다', '여기서부터 모든 경기가 길의 끝이 될 수 있었습니다. 이 무대에 올랐다는 것만으로도 팀은 이미 대부분보다 멀리 걸었습니다.'],
  'MAPS REMEMBER': ['전장은 팀이 진짜로 걸어온 길을 기억합니다', '스코어와 순위는 줄어들지만, 각 전장에는 한타와 기다림, 다시 시작한 순간이 남아 있습니다.'],
  'KEY MATCH': ['한 경기가 시즌의 선명한 단면이 되었습니다', '중요한 경기는 결과만이 아닙니다. 특정한 하루, 팀이 압박을 어떻게 함께 마주했는지를 보여줍니다.'],
  'SEASON OPPONENT': ['어떤 상대는 시즌의 모양을 만듭니다', '상대는 대진표 반대쪽의 이름만이 아닙니다. 그들을 만나며 준비와 압박, 기억의 모양도 달라집니다.'],
  'NOT ALONE': ['당신이 서버로 데려온 이름들', '로스터는 목록이 아닙니다. 확인하고, 기다리고, 함께 준비하고, 같은 자리에 서기를 믿은 사람들입니다.'],
  'LAST MATCH': ['일정은 마지막 경기에 도착했습니다', '이 경기가 팀 전체를 요약할 수는 없지만, 이 시즌의 마지막 경쟁 지점이자 기억이 시작된 곳이 됐습니다.'],
  'A QUIET FRAME': ['모두가 드디어 준비됐던 그 순간이 남을지도 모릅니다', '일정표는 기다림을 기억하지 못합니다. 하지만 모든 이름이 밝혀지고 방이 시작될 수 있었을 때, 보이지 않던 일은 진짜 경기가 되었습니다.'],
  'FINAL RESULT': ['결과가 기록을 닫았고, 당신은 사람을 기억했습니다', '팀과 함께 이 시즌을 걸어주어 고맙습니다. 숫자보다 이름과 목소리, “모두 왔어”라는 안도감이 먼저 돌아오기를 바랍니다.']
}

const STAFF_SCENES = {
  'CASTER SEASON REVIEW': ['Your voice belongs to this season too', 'You were not inside the map, but your voice walked with the fights, pauses, comebacks, and endings—helping people on the other side of the screen feel closer to the match.'],
  'STAFF SEASON REVIEW': ['Part of this season stood because you held it up', 'Checks, waits, changes, and problems solved off camera rarely enter the score. A match beginning, ending, and reaching the archive is itself a trace of your work.'],
  'FIRST CAST': ['This is where your voice first enters the archive', 'The match has ended, but this record remembers that you were there to tell people what was happening.'],
  'FIRST STAFF RECORD': ['This is where your work first enters the archive', 'A room could begin because someone checked the details, waited through the delays, and kept the match moving.'],
  'YOU WERE THERE': ['These matches carry your presence', 'The count cannot explain every pause or last-minute change. It only proves that when the match needed a voice or a steady hand, you were there.'],
  'STAGE MEMORY': ['Your season passed through more than one stage', 'Each stage carried a different kind of pressure, and your work followed the competition as it moved closer to the end.'],
  'TEAMS SEEN': ['You watched many teams write their own seasons', 'You did not belong to one roster, but meeting these teams became part of your own record too.'],
  'CASTER PARTNERS': ['Some voices made the long broadcast feel shared', 'A partner catches the moment you leave open, the fight you both see at once, and the silence that needs room.'],
  'STAFF PARTNERS': ['No one keeps a season running alone', 'Some checks, delays, and unexpected changes are remembered only by the people who solved them together.'],
  'BIGGEST STAGE': ['Your voice reached one of the season’s biggest stages', 'As the competition drew closer to its ending, commentary became another way the event was being recorded.'],
  'KEY STAFF MATCH': ['You helped hold up one of the season’s key matches', 'The closer a match comes to the end of the road, the more it needs someone behind the scenes to keep every detail steady.'],
  'LAST RECORD': ['The archive reaches your final recorded match', 'The match ended, but your voice or your care behind it remains part of how that day was completed.'],
  'A QUIET FRAME': ['The smoothest matches often hide the people behind them', 'When preparation is held carefully, players and viewers only need to remember the match. That invisibility is not absence; it is the shape of the work.'],
  'FRIES CUP ARCHIVE': ['Thank you for helping these matches become memories', 'Broadcasts fade and rooms close. Still, a part of this season was seen, heard, and completed because you were there.']
}

const TOURNAMENT_SCENES = {
  'TOURNAMENT REVIEW': ['Now it is our turn to look back together', 'You do not need to appear on a scoreboard to own a memory of this season. From the first pairing to the final archive, everyone helped make this event real.'],
  'REGULAR SEASON': ['The regular season wrote the first lines of every road', 'The Swiss Round and LCQ turned registrations into real matches. Not every team reached the playoffs, but every team helped make the season complete.'],
  'OPEN QUALIFIER': ['Every story needed somewhere to begin', 'The open stage turned registrations into real matches. Not every team reached the playoffs, but every team helped the season become more than a list of names.'],
  'SWISS ROUND': ['For many teams, the Swiss Round was the first real page', 'Early experiments, new lineups, waits, wins, and losses all began here. A story does not need to reach the final to have truly started.'],
  LCQ: ['The last doorway to the playoffs carried its own pressure', 'Some teams moved on and some stopped at the door. Every attempt made the playoff field more real.'],
  PLAYOFFS: ['Eight teams carried their stories into the playoffs', 'Every match could now become goodbye. Reaching this stage meant walking into the most demanding part of the season.'],
  'CHAMPION ROAD': ['The champion’s road was written one match at a time', 'A champion is not made by one final. It is made by every map, opponent, setback, and teammate between the beginning and the last win.'],
  'GRAND FINAL': ['Every road met in one final match', 'The score became a result, but the match was larger than that: every earlier stage had been flowing toward this last room.'],
  'MAP MEMORY': ['The maps remember where the season happened', 'They were not backgrounds. They were where fights, pushes, mistakes, waits, and comebacks became real.'],
  'PLAYERS REMEMBERED': ['These names left different kinds of traces', 'This is not an award or a final definition. It is a set of small silhouettes kept by the data—players who once stood inside the map and made a real match happen.'],
  'VOICE AND STAFF': ['The matches were seen, told, and held together', 'A community event is not made by players alone. Voices told the story; staff kept the details steady enough for each match to begin and finish.'],
  'A QUIET FRAME': ['After the final match, some of us did not close the page right away', 'Some waited for the last screen, some watched the lobby empty, and some simply wanted the season to stay a little longer.'],
  'WITNESS MEMORY': ['This season includes the part that you saw', 'Maybe you watched many matches, or stayed for only one night. Viewers are not listed in the bracket, but caring, waiting, and remembering are part of what made this more than a set of results.'],
  'FINAL ARCHIVE': ['Thank you for looking back with us', 'When a match is over, choosing to remember it is another form of staying together.']
}

const TOURNAMENT_SCENES_KO = {
  'TOURNAMENT REVIEW': ['이제 우리가 함께 뒤를 돌아볼 차례입니다', '스코어보드에 이름이 없어도 이 시즌의 기억을 가질 수 있습니다. 첫 대진부터 마지막 아카이브까지, 모두가 이 대회를 현실로 만들었습니다.'],
  'REGULAR SEASON': ['정규 시즌이 모든 여정의 첫 줄을 썼습니다', '스위스 라운드와 최종 선발전이 참가 신청을 진짜 경기로 바꿨습니다. 모든 팀이 플레이오프에 오르지는 못했지만, 모든 팀이 시즌을 완성하는 데 함께했습니다.'],
  'OPEN QUALIFIER': ['모든 이야기에는 시작할 곳이 필요했습니다', '공개 예선은 신청서를 진짜 경기로 바꿔 놓았습니다. 모든 팀이 플레이오프에 가지는 못했지만, 모든 팀이 이 시즌을 이름의 목록 그 이상으로 만들었습니다.'],
  'SWISS ROUND': ['많은 팀에게 스위스 라운드는 첫 진짜 페이지였습니다', '첫 실험과 새 조합, 기다림과 첫 승패가 여기서 시작됐습니다. 결승에 닿지 않은 이야기도 분명히 시작된 이야기입니다.'],
  LCQ: ['플레이오프로 가는 마지막 문에는 그만의 압박이 있었습니다', '누군가는 나아갔고 누군가는 문 앞에 멈춰 섰습니다. 그 모든 도전이 플레이오프의 자리를 더 선명하게 만들었습니다.'],
  PLAYOFFS: ['여덟 팀이 자신의 이야기를 플레이오프까지 이어갔습니다', '이제 모든 경기가 작별이 될 수 있었습니다. 이 무대에 올랐다는 것은 시즌의 가장 가혹한 부분으로 걸어 들어갔다는 뜻입니다.'],
  'CHAMPION ROAD': ['우승의 길은 한 경기씩 쓰였습니다', '우승은 한 번의 결승으로 만들어지지 않습니다. 시작과 마지막 승리 사이의 모든 전장과 상대, 좌절과 동료가 함께 만듭니다.'],
  'GRAND FINAL': ['모든 길이 하나의 마지막 경기에서 만났습니다', '스코어는 결과가 되었지만, 그 경기는 그보다 큰 것이었습니다. 이전의 모든 단계가 이 마지막 방으로 흐르고 있었습니다.'],
  'MAP MEMORY': ['전장은 시즌이 일어난 곳을 기억합니다', '전장은 배경이 아니었습니다. 한타와 밀기, 실수와 기다림, 역전이 실제로 일어난 곳이었습니다.'],
  'PLAYERS REMEMBERED': ['이 이름들은 각자 다른 흔적을 남겼습니다', '상이나 최종 평가가 아닙니다. 데이터가 보관한 작은 실루엣입니다. 이들은 전장 안에 서서 진짜 경기를 만들었습니다.'],
  'VOICE AND STAFF': ['경기는 보였고, 이야기되었고, 안정적으로 지탱됐습니다', '커뮤니티 대회는 선수만으로 만들어지지 않습니다. 목소리가 이야기를 전했고, 스태프가 각 경기가 시작하고 끝날 수 있도록 받쳐 주었습니다.'],
  'A QUIET FRAME': ['마지막 경기 후에도 누군가는 페이지를 바로 닫지 않았습니다', '마지막 화면을 기다리거나, 로비가 비어 가는 것을 보거나, 그저 시즌이 조금 더 머물기를 바랐습니다.'],
  'WITNESS MEMORY': ['이 시즌에는 당신이 본 부분도 있습니다', '많은 경기를 봤거나 한 밤만 머물렀을 수 있습니다. 관람객은 대진표에 없지만, 승패를 중요하게 여기고 기다리며 기억한 마음이 이 대회를 결과 목록 그 이상으로 만들었습니다.'],
  'FINAL ARCHIVE': ['우리와 함께 돌아봐 주어 고맙습니다', '경기가 끝난 후에도 기억하는 것은 또 하나의 동행입니다.']
}

function getSceneCopy(scene, locale, ctx) {
  const normalized = normalizeReviewLocale(locale)
  if (normalized === 'zh-CN') return null
  if (scene.kind === 'organizer') return getOrganizerCopy(normalized, ctx)
  if (scene.storyType === 'team') {
    return getTeamCopy(scene, normalized, ctx)
      || (normalized === 'ko-KR' ? TEAM_SCENES_KO : TEAM_SCENES)[scene.eyebrow]
      || (normalized === 'ko-KR' ? sceneCopyKo(scene, ctx) : sceneCopyEn(scene, ctx))
  }
  if (scene.storyType === 'staff') {
    const source = STAFF_SCENES[scene.eyebrow]
    if (normalized === 'en-US') return getStaffCopy(scene, normalized, ctx) || source || sceneCopyEn(scene, ctx)
    const caster = ctx.isCaster
    const ko = {
      'CASTER SEASON REVIEW': ['당신의 목소리도 이 시즌에 속합니다', '전장 안에 있지는 않았지만, 당신의 목소리는 한타와 일시정지, 역전과 결말을 함께 걸었습니다.'],
      'STAFF SEASON REVIEW': ['당신이 받쳐 준 부분이 있었기에 시즌이 설 수 있었습니다', '확인과 기다림, 변화와 문제 해결은 스코어에 남지 않습니다. 경기가 시작하고 끝나 아카이브에 도착한 것 자체가 당신의 흔적입니다.'],
      'FIRST CAST': ['당신의 목소리가 아카이브에 처음 들어온 순간', '경기는 끝났지만, 그때 무슨 일이 일어나고 있었는지 당신이 전했다는 것을 기억합니다.'],
      'FIRST STAFF RECORD': ['당신의 일이 아카이브에 처음 들어온 순간', '누군가가 세부 사항을 확인하고, 지연을 기다리고, 경기가 움직이도록 지켰기에 방이 시작될 수 있었습니다.'],
      'YOU WERE THERE': ['이 경기들에는 당신의 존재가 남아 있습니다', '숫자는 모든 중단과 직전의 변화를 설명하지 못합니다. 다만 경기에 목소리나 든든한 손이 필요했을 때, 당신이 있었다는 것은 증명합니다.'],
      'STAGE MEMORY': ['당신의 시즌은 여러 단계를 지났습니다', '각 단계에는 다른 압박이 있었고, 대회가 결말에 가까워질수록 당신의 일도 함께 이어졌습니다.'],
      'TEAMS SEEN': ['여러 팀이 자신만의 시즌을 쓰는 것을 보았습니다', '특정 로스터에 속하지는 않았지만, 이 팀들과의 만남도 당신의 기록의 일부가 됐습니다.'],
      'CASTER PARTNERS': ['함께한 목소리가 긴 중계를 나누어 지탱했습니다', '파트너는 내가 비운 순간을 받고, 동시에 본 한타를 함께 말하며, 침묵이 필요한 자리를 남겨 줍니다.'],
      'STAFF PARTNERS': ['혼자서 시즌을 움직이게 할 수는 없습니다', '어떤 확인과 지연, 예상치 못한 변화는 함께 해결한 사람들만 기억합니다.'],
      'BIGGEST STAGE': ['당신의 목소리가 시즌의 가장 큰 무대 중 하나에 닿았습니다', '대회가 결말에 가까워질수록, 중계는 이 시즌을 기록하는 또 하나의 방식이 됐습니다.'],
      'KEY STAFF MATCH': ['시즌의 주요 경기 하나를 당신이 받쳐 주었습니다', '경기가 길의 끝에 가까워질수록, 모든 세부 사항을 안정적으로 유지해 줄 사람이 더 필요합니다.'],
      'LAST RECORD': ['아카이브가 마지막 기록 경기에 닿습니다', '경기는 끝났지만, 당신의 목소리 또는 뒤에서 보살핌 마음은 그날을 완성한 방식의 일부로 남았습니다.'],
      'A QUIET FRAME': ['가장 부드럽게 흐른 경기일수록 뒤의 사람은 잘 보이지 않습니다', '준비가 단단히 받쳐졌을 때, 선수와 관람객은 경기만 기억하면 됩니다. 보이지 않음은 부재가 아니라 이 일의 모양입니다.'],
      'FRIES CUP ARCHIVE': ['이 경기들이 기억이 되도록 함께해 주어 고맙습니다', '방송은 흐려지고 방은 닫힙니다. 그래도 당신이 있었기에 이 시즌의 일부가 보였고, 들렸고, 완성됐습니다.']
    }
    return getStaffCopy(scene, normalized, ctx)
      || ko[scene.eyebrow]
      || (normalized === 'ko-KR' ? sceneCopyKo(scene, ctx) : sceneCopyEn(scene, ctx))
      || (caster ? ko['CASTER SEASON REVIEW'] : ko['STAFF SEASON REVIEW'])
  }
  if (scene.storyType === 'tournament') {
    return (normalized === 'ko-KR' ? TOURNAMENT_SCENES_KO : TOURNAMENT_SCENES)[scene.eyebrow]
      || (normalized === 'ko-KR' ? sceneCopyKo(scene, ctx) : sceneCopyEn(scene, ctx))
  }
  return normalized === 'ko-KR' ? sceneCopyKo(scene, ctx) : sceneCopyEn(scene, ctx)
}

function localizeCard(card, locale, options = {}) {
  if (!card || typeof card !== 'object') return card
  const normalized = normalizeReviewLocale(locale)
  const hasChineseSentence = value => /[\u4e00-\u9fff]/.test(String(value || '')) && String(value || '').length > 12
  const genericNote = normalized === 'ko-KR' ? '이 시즌 아카이브에 남은 하나의 기록입니다.' : 'One record kept in this season archive.'
  return {
    ...card,
    title: options.match && /[\u4e00-\u9fff]/.test(String(card.title || ''))
      ? (normalized === 'ko-KR' ? '경기의 기억' : 'Match memory')
      : translateToken(card.title, normalized),
    value: translateToken(card.value, normalized),
    displayValue: translateToken(card.displayValue, normalized),
    label: translateToken(card.label, normalized),
    meta: translateToken(card.meta, normalized),
    sub: translateToken(card.sub, normalized),
    role: translateToken(card.role, normalized),
    hero: translateToken(card.hero, normalized),
    heroes: card.heroes?.map(hero => translateToken(hero, normalized)),
    stage: translateToken(card.stage, normalized),
    round: translateToken(card.round, normalized),
    stageLabel: translateToken(card.stageLabel, normalized),
    ticketType: translateToken(card.ticketType, normalized),
    result: translateToken(card.result, normalized),
    left: translateToken(card.left, normalized),
    right: translateToken(card.right, normalized),
    note: hasChineseSentence(card.note) ? genericNote : translateToken(card.note, normalized),
    opponentMemory: hasChineseSentence(card.opponentMemory) ? genericNote : translateToken(card.opponentMemory, normalized)
  }
}

function localizeGroup(group, locale) {
  return {
    ...group,
    title: translateToken(group.title, locale),
    cards: group.cards?.map(card => localizeCard(card, locale))
  }
}

function getLocalizedStoryQuote(scene, locale, ctx) {
  const normalized = normalizeReviewLocale(locale)
  const isEnding = scene.kind === 'ending' || scene.eyebrow === 'FINAL ARCHIVE'
  const isTogether = /NAMES|PARTNERS|NOT ALONE|VOICE AND STAFF/.test(scene.eyebrow || '')
  const isMetric = scene.kind === 'metric' || /MAP|ROAD|YOU WERE THERE/.test(scene.eyebrow || '')

  if (scene.kind === 'organizer') {
    return normalized === 'ko-KR'
      ? {
          title: '완벽한 시즌은 아니었습니다',
          body: '하지만 우리가 함께 완성한 시즌이었습니다.'
        }
      : {
          title: 'This was not a perfect season',
          body: 'But it was a season we completed together.'
        }
  }

  if (normalized === 'ko-KR') {
    if (scene.storyType === 'staff' && /CASTER SEASON REVIEW|STAFF SEASON REVIEW/.test(scene.eyebrow || '')) return {
      title: ctx.isCaster ? '스코어 옆에는 그 경기를 말한 사람의 이름도 남습니다' : '대진표 옆에는 운영 기록에 남은 이름도 있습니다',
      body: (ctx.matchCount || 0) + '경기의 공개 명단이 당신의 ' + (ctx.isCaster ? '중계' : '운영') + ' 참여를 확인합니다.'
    }
    if (scene.storyType === 'player' && isEnding) {
      if (ctx.coverage === 'roster') return {
        title: '데이터의 빈칸에도 이름은 남습니다',
        body: '기록되지 않은 부분을 대신 정의하지 않겠습니다. 이 로스터에 당신의 이름이 있었다는 사실과 당신만이 가진 기억을 그대로 남겨 둡니다.'
      }
      if (ctx.coverage === 'brief') return {
        title: '짧았다는 것은, 없었다는 뜻이 아닙니다',
        body: '이 몇 개의 전장이 언젠가 그때의 자신을 다시 알아보는 작은 입구가 되기를 바랍니다.'
      }
      if (ctx.rankTier === 'champion') return {
        title: '우승은 팀의 것이고, 이 기억은 당신의 것이기도 합니다',
        body: '가장 높은 순위 뒤에도 하나의 전장, 한 명의 동료, 한 번 더 해보자는 마음이 있었습니다.'
      }
    }
    if (scene.storyType === 'team' && isEnding) return {
      title: '최종 순위는 팀을, 최종 로스터는 당신의 역할을 보존합니다',
      body: getKoreanTeamLabel(ctx.team) + '의 결과는 ' + (ctx.rank || '최종 기록') + '이며, 당신의 ' + translateToken(ctx.perspective || '身份', 'ko-KR') + '도 같은 아카이브에 별도로 남아 있습니다.'
    }
    if (scene.storyType === 'staff' && isEnding) return {
      title: (ctx.matchCount || 0) + '개의 ' + (ctx.isCaster ? '중계' : '운영') + ' 기록이 당신이 이곳에 있었다는 것을 확인합니다',
      body: (ctx.stageCount || 0) + '개 단계와 ' + (ctx.teamCount || 0) + '개 팀에 걸친 모든 수치는 공개된 대회 기록에서 왔습니다.'
    }
    if (scene.storyType === 'staff' && isMetric) return {
      title: '숫자는 평가가 아니라, 기록으로 돌아가는 입구입니다',
      body: (ctx.matchCount || 0) + '경기와 그 옆의 이름이 이 시즌에서 실제로 확인되는 부분입니다.'
    }
    if (isEnding) return {
      title: '숫자는 보관되지만, 경험은 남습니다',
      body: '이곳에 시간과 마음을 남겨 주어 고맙습니다. 시즌은 끝났지만, 그 안에서 함께했던 사람들의 기억은 계속됩니다.'
    }
    if (isTogether) return {
      title: '기록이 다 말하지 못해도, 함께였다는 사실은 남습니다',
      body: ctx.companion
        ? ctx.companion + ' 같은 이름들이 같은 길 위에 있었다는 것은 기억할 수 있습니다.'
        : '모든 대화와 기다림을 셀 수는 없지만, 같은 길 위에 서로의 이름이 있었다는 것은 기억할 수 있습니다.'
    }
    if (isMetric) return {
      title: '숫자는 결론이 아니라, 기억으로 돌아가는 입구입니다',
      body: '이 기록은 누구를 평가하기 위한 것이 아니라 실제로 있었던 시간을 다시 바라보기 위한 것입니다.'
    }
    return {
      title: '이것은 평가가 아니라, 한 번의 다시 보기입니다',
      body: '결과 하나로 시즌을 정의하지 않고, 분명히 있었던 순간을 따뜻하게 돌려드리고 싶었습니다.'
    }
  }

  if (scene.storyType === 'player' && isEnding) {
    if (ctx.coverage === 'roster') return {
      title: 'Even the blank in the data still has a name',
      body: 'We will not define what the record missed. We will simply keep the fact that your name was on this roster, beside the memories only you can tell.'
    }
    if (ctx.coverage === 'brief') return {
      title: 'Short does not mean absent',
      body: 'May these few maps become a small doorway back to the person you were when they happened.'
    }
    if (ctx.rankTier === 'champion') return {
      title: 'The title belongs to the team; this memory belongs to you too',
      body: 'Behind the highest placing were still one map, one teammate, and the choice to believe in one more fight.'
    }
  }
  if (scene.storyType === 'staff' && /CASTER SEASON REVIEW|STAFF SEASON REVIEW/.test(scene.eyebrow || '')) return {
    title: ctx.isCaster ? 'The score has a result; the caster credit keeps who told it' : 'The fixture has a result; the staff credit keeps who was recorded there',
    body: 'The published credits for ' + (ctx.matchCount || 0) + ' matches confirm your participation as ' + (ctx.isCaster ? 'a caster.' : 'staff.')
  }
  if (scene.storyType === 'team' && isEnding) return {
    title: 'The final standing preserves the team; the final roster preserves your role',
    body: (ctx.team || 'The team') + ' finished at ' + (ctx.rank || 'the final record') + ', while your ' + translateToken(ctx.perspective || '身份', 'en-US') + ' remains separately recorded in the same archive.'
  }
  if (scene.storyType === 'staff' && isEnding) return {
    title: (ctx.matchCount || 0) + ' ' + (ctx.isCaster ? 'caster' : 'staff') + ' records confirm that you were here',
    body: 'Every number spans ' + (ctx.stageCount || 0) + ' stages and ' + (ctx.teamCount || 0) + ' teams, all taken from the published event archive.'
  }
  if (scene.storyType === 'staff' && isMetric) return {
    title: 'The number is not a verdict; it is a doorway back into the record',
    body: (ctx.matchCount || 0) + ' matches and the names beside them are the part this season can verify exactly.'
  }
  if (isEnding) return {
    title: 'Numbers are archived; experience stays',
    body: 'Thank you for leaving your time and care here. The season is over, but the people inside its memories remain.'
  }
  if (isTogether) return {
    title: 'The record cannot say everything, but it remembers you were together',
    body: ctx.companion
      ? 'It cannot count every call or wait. It can still keep ' + ctx.companion + ' and the other names that once stood on the same road.'
      : 'It cannot count every call or every wait. It can still keep the names that once stood on the same road.'
  }
  if (isMetric) return {
    title: 'A number is not a conclusion; it is a way back into the memory',
    body: 'This archive is not here to judge anyone. It is here to return the time that truly happened.'
  }
  return {
    title: 'This is a replay, not a verdict',
    body: 'We do not want one result to define a season. We only want to return the moments that were truly yours.'
  }
}

export function localizeReviewScenes(scenes, locale, profile = {}) {
  const normalized = normalizeReviewLocale(locale)
  if (normalized === 'zh-CN') return scenes
  const ctx = getSceneContext(scenes, { ...profile, locale: normalized })

  return scenes.map(scene => {
    const copy = getSceneCopy(scene, normalized, ctx)
    const localized = {
      ...scene,
      title: copy?.[0] || translateToken(scene.title, normalized),
      body: copy?.[1] || translateToken(scene.body, normalized),
      subTitle: translateToken(scene.subTitle, normalized),
      identityClass: translateToken(scene.identityClass, normalized),
      identity_class: translateToken(scene.identity_class, normalized),
      seasonRecordText: translateToken(scene.seasonRecordText, normalized),
      season_record_text: translateToken(scene.season_record_text, normalized),
      firstMatchLabel: translateToken(scene.firstMatchLabel, normalized),
      first_match_label: translateToken(scene.first_match_label, normalized),
      lastMatchLabel: translateToken(scene.lastMatchLabel, normalized),
      last_match_label: translateToken(scene.last_match_label, normalized),
      routeFrom: translateToken(scene.routeFrom, normalized),
      routeTo: translateToken(scene.routeTo, normalized),
      metric: translateToken(scene.metric, normalized),
      metricLabel: translateToken(scene.metricLabel, normalized),
      evidenceTags: scene.evidenceTags?.map(tag => translateToken(tag, normalized)),
      rosterTitle: translateToken(scene.rosterTitle, normalized),
      chips: scene.chips?.map(chip => translateToken(chip, normalized)),
      images: scene.images?.map(item => localizeCard(item, normalized)),
      statLines: scene.statLines?.map(line => localizeCard(line, normalized)),
      timeline: scene.timeline?.map(item => localizeCard(item, normalized)),
      dataBars: scene.dataBars?.map(item => localizeCard(item, normalized)),
      mapCards: scene.mapCards?.map(item => localizeCard(item, normalized)),
      teamCards: scene.teamCards?.map(item => localizeCard(item, normalized)),
      playerCards: scene.playerCards?.map(item => localizeCard(item, normalized)),
      rosterCards: scene.rosterCards?.map(item => localizeCard(item, normalized)),
      partnerCards: scene.partnerCards?.map(item => localizeCard(item, normalized)),
      crossPartnerCards: scene.crossPartnerCards?.map(item => localizeCard(item, normalized)),
      partnerGroups: scene.partnerGroups?.map(group => localizeGroup(group, normalized)),
      matchCard: localizeCard(scene.matchCard, normalized, { match: true }),
      storyQuote: scene.storyQuote ? {
        ...scene.storyQuote,
        ...getLocalizedStoryQuote(scene, normalized, ctx)
      } : null
    }
    return localized
  })
}

export function localizeReviewSearchResult(item, locale) {
  const normalized = normalizeReviewLocale(locale)
  if (normalized === 'zh-CN') return item

  let subtitle = translateToken(item.subtitle, normalized)
  if (normalized === 'ko-KR') {
    subtitle = subtitle
      .replace(/\bTANK\b/g, '돌격')
      .replace(/\bDPS\b/g, '공격')
      .replace(/\bSUP(?:PORT)?\b/g, '지원')
      .replace(/\bFLEX\b/g, '플렉스')
      .replace(/解说\s*(\d+)\s*경기/g, '중계 $1경기')
      .replace(/｜赛管\s*\/\s*裁判\s*\/\s*导播合并统计/g, '｜운영 역할 통합 기록')
      .replace(/｜经理\s*\/\s*教练视角/g, '｜매니저 / 코치 시점')
  } else {
    subtitle = subtitle
      .replace(/解说\s*(\d+)\s*matches/g, 'Cast $1 matches')
      .replace(/｜赛管\s*\/\s*裁判\s*\/\s*导播合并统计/g, '｜combined operations roles')
      .replace(/｜经理\s*\/\s*教练视角/g, '｜manager / coach view')
  }

  return {
    ...item,
    label: translateToken(item.label, normalized),
    subtitle
  }
}

export function getReviewPosterMeta(kind, locale) {
  const normalized = normalizeReviewLocale(locale)
  const labels = {
    player: ['选手纪念票', 'Player keepsake ticket', '선수 기념 티켓'],
    team: ['队伍纪念票', 'Team keepsake ticket', '팀 기념 티켓'],
    manager: ['经理纪念票', 'Manager keepsake ticket', '매니저 기념 티켓'],
    coach: ['教练纪念票', 'Coach keepsake ticket', '코치 기념 티켓'],
    managerCoach: ['经理 / 教练纪念票', 'Manager / coach ticket', '매니저 / 코치 티켓'],
    staff: ['赛管纪念票', 'Operations keepsake ticket', '운영 스태프 티켓'],
    caster: ['解说纪念票', 'Caster keepsake ticket', '중계진 기념 티켓'],
    tournament: ['赛事见证票', 'Season witness ticket', '시즌 목격자 티켓']
  }
  const index = normalized === 'en-US' ? 1 : normalized === 'ko-KR' ? 2 : 0
  return {
    label: (labels[kind] || ['官方纪念票', 'Official keepsake ticket', '공식 기념 티켓'])[index],
    output: normalized === 'zh-CN' ? '横版 1920×1080' : normalized === 'ko-KR' ? '가로형 1920×1080' : 'Landscape 1920×1080'
  }
}
