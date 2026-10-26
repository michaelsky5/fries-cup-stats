// 票 2.50: the published plan, for readers who have not opened the PDFs. Every figure here comes
// from 个人赞助计划 V2.0 and 赛事方案书 V1.9 (2026-10-17); reviewed money comes only from the API.
// Copy is [zh-CN, en, ko, zh-TW].
export const PLAN_DATE = '2026-10-17'

export const SUPPORT_TIERS = [
  { id: 'A', yuan: 10, name: ['小份薯条', 'Small Fries', '스몰 프라이즈', '小份薯條'],
    body: ['每场赛前、赛后，直播画面滚动条展示你的显示名。', 'Your display name in the on-screen ticker before and after every broadcast.', '매 중계 전후 화면 하단 자막에 표시 이름이 나옵니다.', '每場賽前、賽後，直播畫面滾動條展示你的顯示名。'] },
  { id: 'B', yuan: 50, name: ['中份薯条', 'Medium Fries', '미디엄 프라이즈', '中份薯條'],
    body: ['含 A 档；另加底部感谢贴片，每场赛前、赛后各展示一轮。', 'Everything in A, plus a thank-you banner before and after every broadcast.', 'A 등급 포함, 매 중계 전후 하단 감사 배너가 한 번씩 나옵니다.', '含 A 檔；另加底部感謝貼片，每場賽前、賽後各展示一輪。'] },
  { id: 'C', yuan: 100, name: ['大份薯条', 'Large Fries', '라지 프라이즈', '大份薯條'],
    body: ['含 B 档；每场赛前、赛后各一次逐名口播感谢，11 场共 22 次。', 'Everything in B, plus a spoken thank-you by name before and after every broadcast: 22 in all.', 'B 등급 포함, 매 중계 전후 이름을 불러 감사 인사를 합니다(총 22회).', '含 B 檔；每場賽前、賽後各一次逐名口播感謝，11 場共 22 次。'] },
  { id: 'D', yuan: 200, name: ['薯条双重奏', 'Fries Duet', '프라이즈 듀엣', '薯條雙重奏'],
    body: ['含 C 档；一张电子感谢海报（7 日内交付），另加周赛网页滚动感谢（到账确认后 48 小时内上线）。', 'Everything in C, plus a digital thank-you poster (within 7 days) and a scrolling thank-you on the weekly site (live within 48 hours of payment confirmation).', 'C 등급 포함, 디지털 감사 포스터(7일 이내)와 주간 대회 웹사이트 감사 문구(입금 확인 후 48시간 이내)가 더해집니다.', '含 C 檔；一張電子感謝海報（7 日內交付），另加週賽網頁滾動感謝（到帳確認後 48 小時內上線）。'] }
]
export const CUSTOM_TIER = { id: 'E', name: ['薯条狂想曲', 'Fries Rhapsody', '프라이즈 랩소디', '薯條狂想曲'],
  price: ['200 元以上', 'Over ¥200', '200위안 초과', '200 元以上'],
  body: ['按支持目标单独确认赛事范围与感谢内容，是否包含 D 档权益写入确认单，确认后再付款。', 'Scope and thanks are agreed one to one around what you want to support; whether D-tier benefits are included goes into the confirmation, and you pay only after confirming.', '후원 목표에 맞춰 범위와 감사 내용을 따로 정하고, D 등급 혜택 포함 여부를 확인서에 적은 뒤 결제합니다.', '按支持目標單獨確認賽事範圍與感謝內容，是否包含 D 檔權益寫入確認單，確認後再付款。'] }
export const TIER_NAMES = Object.fromEntries([...SUPPORT_TIERS, CUSTOM_TIER].map(tier => [tier.id, tier.name]))

// Of general support, after refunds and the unreleased refund reserve.
export const FUND_SPLIT = [
  { purpose: 'PLAYOFFS', percent: 20, name: ['本赛段季后赛', 'This segment’s playoffs', '이번 구간 플레이오프', '本賽段季後賽'] },
  { purpose: 'FINALS', percent: 30, name: ['首届巅峰赛', 'The first Finals', '첫 파이널', '首屆巔峰賽'] },
  { purpose: 'OPERATIONS', percent: 50, name: ['人员与必要运营', 'Staff and essential operations', '인력 및 필수 운영', '人員與必要營運'] }
]

export const PLAYOFF_AWARD_YUAN = 100
export const FINALS_MINIMUM_YUAN = 300
// The plan's worked example for a 600-yuan pool (6:4:1:1).
export const FINALS_EXAMPLE = [['champion', 300], ['runnerUp', 200], ['third', 50], ['fourth', 50]]

export const BROADCAST_PLAN = { total: 11, regular: 8, playoffs: 3, regularWeeks: 4, perWeek: 2 }

export const UPGRADE_PRIORITIES = [
  { title: ['保障既定赛事安排', 'Secure what is already scheduled', '확정된 일정 보장', '保障既定賽事安排'],
    body: ['依照已确认安排，落实第二赛段 11 场计划直播，保障奖金、工作人员补贴与必要运营。', 'Deliver the 11 planned broadcasts of the second segment and cover prizes, staff allowances and essential operations.', '두 번째 구간의 계획된 11경기 중계와 상금, 스태프 수당, 필수 운영을 우선 보장합니다.', '依照已確認安排，落實第二賽段 11 場計畫直播，保障獎金、工作人員補貼與必要營運。'] },
  { title: ['优先增加双解说', 'Add a second caster first', '2인 해설 우선 도입', '優先增加雙解說'],
    body: ['在保障既定安排的前提下，用可用运营资金优先增加双解说场次。', 'Once that is secured, available operating funds go first to more double-cast broadcasts.', '기본 일정을 보장한 뒤, 가용 운영 자금은 2인 해설 경기를 늘리는 데 먼저 씁니다.', '在保障既定安排的前提下，用可用營運資金優先增加雙解說場次。'] },
  { title: ['让更多对阵进入直播', 'Put more matches on air', '더 많은 경기를 중계', '讓更多對陣進入直播'],
    body: ['随后争取直播更多已有对阵；资金、人手与场次落实后统一公告。', 'Then more of the scheduled matches go on air; each step is announced once funds, staff and slots are confirmed.', '이후 더 많은 경기를 중계하며, 자금·인력·경기가 확정되면 공지합니다.', '隨後爭取直播更多已有對陣；資金、人手與場次落實後統一公告。'] }
]

export const SUPPORT_STEPS = [
  { title: ['确认本赛段范围', 'Agree the scope', '이번 구간 범위 확인', '確認本賽段範圍'],
    body: ['联系南宫，选择档位，确认 11 场直播清单、观赛入口和显示名的公开方式。', 'Contact Nangong to choose a tier and confirm the 11 broadcasts, the viewing link and how your name is shown.', 'Nangong에게 연락해 등급을 고르고 11경기 중계 목록, 시청 링크, 이름 공개 방식을 확인합니다.', '聯絡南宮，選擇檔位，確認 11 場直播清單、觀賽入口和顯示名的公開方式。'] },
  { title: ['核对电子确认单', 'Check the confirmation', '전자 확인서 확인', '核對電子確認單'],
    body: ['核对金额、权益、退款条款与公开选择；E 档另附约定。', 'Check the amount, benefits, refund terms and what may be made public; tier E has its own agreement.', '금액, 혜택, 환불 조건, 공개 범위를 확인합니다. E 등급은 별도 약정이 있습니다.', '核對金額、權益、退款條款與公開選擇；E 檔另附約定。'] },
  { title: ['核验收款信息后付款', 'Pay to the verified account', '수납 정보 확인 후 결제', '核驗收款資訊後付款'],
    body: ['南宫是授权收款人。核对赛事方授权与实际账户后再付款，到账后 24 小时内确认。', 'Nangong is the authorised collector. Pay after checking the organiser’s authorisation and the account; receipt is confirmed within 24 hours.', 'Nangong이 공식 수납 담당입니다. 주최 측 위임과 계좌를 확인한 뒤 결제하면 24시간 이내에 입금을 확인합니다.', '南宮是授權收款人。核對賽事方授權與實際帳戶後再付款，到帳後 24 小時內確認。'] },
  { title: ['查询感谢与资金使用', 'Follow your thanks', '감사 내역과 자금 사용 확인', '查詢感謝與資金使用'],
    body: ['向南宫查询自己的感谢记录；经复核的收支与直播升级进度在本页公开。', 'Ask Nangong for your own thanks record; reviewed spending and broadcast upgrades are published on this page.', '내 감사 기록은 Nangong에게 확인하고, 검토된 수지와 중계 개선 현황은 이 페이지에서 공개합니다.', '向南宮查詢自己的感謝記錄；經複核的收支與直播升級進度在本頁公開。'] }
]

export const DELIVERY_PROMISES = [
  { title: ['感谢遗漏，按场退款', 'A missed thank-you is refunded', '감사 누락 시 경기별 환불', '感謝遺漏，按場退款'],
    body: ['任一约定的赛前或赛后感谢没有完成，即退还该场直播感谢份额。', 'If any agreed pre- or post-broadcast thank-you is missed, that broadcast’s share is refunded.', '약정한 경기 전후 감사가 하나라도 빠지면 해당 경기 몫을 환불합니다.', '任一約定的賽前或賽後感謝沒有完成，即退還該場直播感謝份額。'] },
  { title: ['海报与网页，按约核算', 'Poster and web thanks are accounted for', '포스터·웹 감사도 약정대로 정산', '海報與網頁，按約核算'],
    body: ['D 档海报未按时交付按 50 元核算；网页感谢漏名 48 小时内补足，补不足的部分按比例退款。', 'A late D-tier poster is valued at ¥50; a missing web credit is restored within 48 hours, and any shortfall is refunded pro rata.', 'D 등급 포스터 지연은 50위안으로 정산하고, 웹 감사 누락은 48시간 이내 보완하며 부족분은 비율대로 환불합니다.', 'D 檔海報未按時交付按 50 元核算；網頁感謝漏名 48 小時內補足，補不足的部分按比例退款。'] },
  { title: ['赛段结束 7 日内交代', 'A full account within 7 days', '구간 종료 7일 이내 보고', '賽段結束 7 日內交代'],
    body: ['提供感谢完成情况与经复核的收支汇总；未用余额 7 日内清算、15 日内退回。', 'You receive the thanks record and the reviewed spending summary; unused balances are settled within 7 days and returned within 15.', '감사 이행 내역과 검토된 수지 요약을 제공하며, 미사용 잔액은 7일 이내 정산, 15일 이내 반환합니다.', '提供感謝完成情況與經複核的收支彙總；未用餘額 7 日內清算、15 日內退回。'] }
]

export const SUPPORT_CONTACT = { name: ['南宫', 'Nangong', 'Nangong', '南宮'], wechat: 'nangyd2333', email: '2557456349@qq.com' }
export const SUPPORT_DOCUMENTS = [
  { href: '/documents/fcw2026-sponsorship-v2.0.pdf', label: ['个人赞助计划 V2.0', 'Personal support plan V2.0', '개인 후원 계획 V2.0', '個人贊助計畫 V2.0'] },
  { href: '/documents/fcw2026-event-plan-v1.9.pdf', label: ['赛事方案书 V1.9', 'Event proposal V1.9', '대회 제안서 V1.9', '賽事方案書 V1.9'] }
]
