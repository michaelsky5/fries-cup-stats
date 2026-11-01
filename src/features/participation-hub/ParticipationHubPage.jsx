import { useEffect, useState } from 'react'
import { Link, useLocation, useOutletContext } from 'react-router-dom'
import { DEFAULT_SEASON_ID, getSeasonById, getSeasonName, withSeason as seasonLink } from '../../config/seasons.js'
import { pickUiLocale } from '../../lib/uiText.js'
import { withLocale } from '../../lib/locales.js'
import { getLobbyConfig } from '../team-lobby/lobbyApi.js'
import WeeklyConfirmationStatus from './WeeklyConfirmationStatus.jsx'
import styles from './ParticipationHubPage.module.css'

const OPEN_LOBBY_MODES = new Set(['READ_ONLY', 'WRITE'])
const ABOUT_WEEKLY_URL = 'https://fries-cup.com/events/weekly/'
const RULES_URL = 'https://fries-cup.com/rules/'

function EntryArrow({ external = false }) {
  return <svg className={styles.entryArrow} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
    <path d={external ? 'M7 17 17 7M7 7h10v10' : 'M4 12h16m-6-6 6 6-6 6'} />
  </svg>
}

function EntryLink({ to, href, title, note, tag }) {
  const content = <><span className={styles.entryCopy}>{tag ? <small className={styles.entryTag}>{tag}</small> : null}<strong>{title}</strong><span>{note}</span></span><EntryArrow external={Boolean(href)} /></>
  return href
    ? <a className={styles.entryLink} href={href} target="_blank" rel="noreferrer">{content}</a>
    : <Link className={styles.entryLink} to={to}>{content}</Link>
}

function HubSection({ id, number, title, description, children }) {
  return <section className={styles.hubSection} aria-labelledby={id}>
    <header className={styles.sectionHeading}><span className={styles.sectionNumber} aria-hidden="true">{number}</span><h2 id={id}>{title}</h2><p>{description}</p></header>
    <div className={styles.sectionContent}>{children}</div>
  </section>
}

// One directory for participation. Existing destinations retain their own access checks.
export default function ParticipationHubPage() {
  const { db, season, seasonId, withSeason, locale, isAuthenticated, accountNextAction } = useOutletContext()
  const location = useLocation()
  const t = (...copy) => pickUiLocale(locale, ...copy)
  const [lobby, setLobby] = useState({ status: 'loading', mode: null })
  const [lobbyAttempt, setLobbyAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    setLobby({ status: 'loading', mode: null })
    getLobbyConfig({ signal: controller.signal }).then(config => {
      if (!controller.signal.aborted) setLobby({ status: 'ready', mode: config?.mode || 'OFF' })
    }).catch(() => {
      if (!controller.signal.aborted) setLobby({ status: 'error', mode: null })
    })
    return () => controller.abort()
  }, [lobbyAttempt])
  const lobbyOpen = OPEN_LOBBY_MODES.has(lobby.mode)
  // Publishing links only while the lobby accepts new cards; READ_ONLY keeps browsing.
  const lobbyWritable = lobby.mode === 'WRITE'
  const lobbyPath = path => withLocale(path, locale)

  const title = t('参赛中心', 'Participation center', '참가 센터', '參賽中心')
  const signIn = () => window.dispatchEvent(new Event('fries-cup:open-account'))
  if (season?.lifecycle === 'ARCHIVED' || season?.partnerTrial) {
    const current = getSeasonById(DEFAULT_SEASON_ID)
    return <div className={styles.page} data-participation-hub>
      <header className={styles.hero}><div><h1>{title}</h1>
        <p>{t('报名、每周确认和比赛房只对正在进行的赛事开放。', 'Registration, weekly confirmation and match rooms are open for the current event only.', '등록, 주간 확인, 경기 방은 진행 중인 대회에서만 열립니다.', '報名、每週確認和比賽房只對正在進行的賽事開放。')}</p></div>
        <Link className={styles.primary} to={seasonLink('/play', current.id, location.search)}>{t('去当前赛事', 'Go to the current event', '현재 대회로 이동', '前往目前賽事')} · {getSeasonName(current, locale)} <span aria-hidden="true">→</span></Link>
      </header>
    </div>
  }

  const registrationPath = withSeason(`/participate/${encodeURIComponent(seasonId)}`)
  const confirmationPath = withSeason(`/me?section=team&competition=${encodeURIComponent(seasonId)}`)
  const matchesPath = withSeason(`/me?section=matches&competition=${encodeURIComponent(seasonId)}`)
  const tasksPath = withSeason(`/me?section=tasks&competition=${encodeURIComponent(seasonId)}`)
  const spacePath = withSeason(`/me?section=overview&competition=${encodeURIComponent(seasonId)}`)
  const steps = [
    {
      who: t('队长', 'Captain', '주장', '隊長'),
      title: t('报名', 'Register the team', '팀 등록', '報名'),
      // 票 2.53 (owner, 10/25): captains start their own team; the organizer reviews the submitted registration.
      body: t('登录或注册参赛账号并验证邮箱，在报名页创建队伍。队员到齐并各自确认后提交，赛事方审核通过即完成报名，不需要先领邀请链接。',
        'Sign in or create a player account and verify your email, then create the team on the registration page. Submit once your players have joined and confirmed; the registration is complete when the organizers approve it. No invitation link is needed.',
        '참가 계정에 로그인하거나 가입해 이메일을 인증한 뒤, 등록 페이지에서 팀을 만드세요. 팀원이 모두 합류해 확인하면 제출하고, 주최 측이 승인하면 등록이 완료됩니다. 초대 링크는 필요 없습니다.',
        '登入或註冊參賽帳號並驗證郵箱，在報名頁建立隊伍。隊員到齊並各自確認後提交，賽事方審核通過即完成報名，不需要先領邀請連結。'),
      link: { to: registrationPath, label: t('去报名页', 'Open registration', '등록 페이지', '前往報名頁') }
    },
    {
      who: t('队员', 'Players', '팀원', '隊員'),
      title: t('入队', 'Join the team', '팀 합류', '入隊'),
      body: t('队长在报名页复制「队伍邀请链接」发到队伍群；队员各自打开链接填写，审核通过后进入报名名单。',
        'The captain copies the team invitation link on the registration page and shares it with the team. Each player opens it and fills it in; approved players join the registered roster.',
        '주장이 등록 페이지에서 팀 초대 링크를 복사해 팀 채팅에 공유합니다. 팀원은 각자 링크를 열어 작성하고, 승인되면 등록 명단에 들어갑니다.',
        '隊長在報名頁複製「隊伍邀請連結」發到隊伍群；隊員各自打開連結填寫，審核通過後進入報名名單。'),
      // 票 2.39 (owner, 10/25): finding a team or players belongs to this step, not to the link list.
      ...(lobbyOpen ? {
        note: t('还没有队伍，或队伍还缺人？先去组队大厅找。', 'No team yet, or short of players? Start in the team lobby.', '아직 팀이 없거나 인원이 부족하다면 팀 찾기에서 먼저 찾아보세요.', '還沒有隊伍，或隊伍還缺人？先去組隊大廳找。'),
        link: { to: lobbyPath('/lobby'), label: t('去组队大厅', 'Open the team lobby', '팀 찾기로 이동', '前往組隊大廳') }
      } : {})
    },
    {
      who: t('队长或经理', 'Captain or manager', '주장 또는 매니저', '隊長或經理'),
      title: t('每周确认', 'Confirm every week', '매주 확인', '每週確認'),
      body: t('报名通过后，每个比赛周都要在「我的空间 · 队伍」确认当周参赛并提交出赛名单。确认窗口与截止时间以确认页为准。',
        'Once registered, confirm each match week and submit the lineup under My Space · Team. The confirmation page shows the window and deadline.',
        '등록이 승인되면 매 경기 주마다 내 공간 · 팀에서 참가를 확인하고 출전 명단을 제출하세요. 확인 기간과 마감은 확인 페이지를 따릅니다.',
        '報名通過後，每個比賽週都要在「我的空間 · 隊伍」確認當週參賽並提交出賽名單。確認窗口與截止時間以確認頁為準。'),
      link: { to: confirmationPath, label: t('本周参赛确认', 'This week’s confirmation', '이번 주 참가 확인', '本週參賽確認') }
    }
  ]
  const helpEntries = [
    { href: RULES_URL, title: t('规则中心', 'Rulebook', '대회 규정', '規則中心'), note: t('赛制、参赛资格与完整条款', 'Format, eligibility and full rules', '대회 방식, 참가 자격 및 전체 규정', '賽制、參賽資格與完整條款') },
    { href: ABOUT_WEEKLY_URL, title: t('了解周赛', 'About the weekly', '주간 대회 소개', '了解週賽'), note: t('赛事介绍、参赛方式与时间安排', 'Event introduction, participation and schedule', '대회 소개, 참가 방법 및 일정', '賽事介紹、參賽方式與時間安排') },
    { to: withSeason('/guides/weekly-room'), title: t('比赛房指南', 'Match room guide', '경기 방 안내', '比賽房指南'), note: t('签到、选图、首发与赛果处理', 'Check-in, map picks, lineups and results', '체크인, 맵 선택, 선발 및 결과 처리', '簽到、選圖、首發與賽果處理') },
    { to: withSeason('/guides/weekly-room/simulate'), title: t('模拟比赛房', 'Practice room', '모의 경기 방', '模擬比賽房'), note: t('第一次参赛？先熟悉比赛房操作', 'First event? Practise the match room flow', '첫 참가라면 경기 방 진행을 연습하세요', '第一次參賽？先熟悉比賽房操作') }
  ]

  return <div className={styles.page} data-participation-hub>
    <header className={styles.hero}>
      <div><span className={styles.kicker}>FRIES CUP / PARTICIPATION</span><h1>{title}</h1>
        <p>{t('从找到队友到正式上场，参赛需要的入口都在这里。', 'From finding teammates to match day, your participation starts here.', '팀원 찾기부터 경기 당일까지, 참가에 필요한 모든 입구를 모았습니다.', '從找到隊友到正式上場，參賽需要的入口都在這裡。')}</p>
      </div>
      <div className={styles.heroAccount}>
        {isAuthenticated ? <Link className={styles.secondary} to={spacePath}>{t('管理我的参赛', 'Manage my participation', '내 참가 관리', '管理我的參賽')}<EntryArrow /></Link> : <>
          <button type="button" className={styles.signIn} onClick={signIn}>{t('登录 / 注册', 'Sign in / register', '로그인 / 가입', '登入 / 註冊')}<EntryArrow /></button>
          <small>{t('查看规则与参赛说明无需登录', 'Read rules and participation information without signing in', '규정과 참가 안내는 로그인 없이 볼 수 있습니다', '查看規則與參賽說明無需登入')}</small>
        </>}
      </div>
    </header>
    {isAuthenticated && accountNextAction?.to ? <Link className={styles.nextAction} to={accountNextAction.to} data-account-next-action={accountNextAction.kind}>
        <span>{t('现在要做', 'Next for you', '지금 할 일', '現在要做')}</span>
        <strong>{accountNextAction.label}</strong>
        {accountNextAction.detail ? <small>{accountNextAction.detail}</small> : null}
        <EntryArrow />
      </Link> : null}

    <nav className={styles.jumpLinks} aria-label={t('参赛中心分区', 'Participation center sections', '참가 센터 메뉴', '參賽中心分區')}>
      <a href="#play-start">{t('组队与报名', 'Team up & register', '팀 찾기 및 등록', '組隊與報名')}</a>
      <a href="#play-mine">{t('我的参赛', 'My participation', '내 참가', '我的參賽')}</a>
      <a href="#play-help">{t('规则与帮助', 'Rules & help', '규정 및 도움말', '規則與幫助')}</a>
    </nav>

    <HubSection id="play-start" number="01" title={t('组队与报名', 'Team up & register', '팀 찾기 및 등록', '組隊與報名')} description={t('找到队友，准备好队伍，再一起报名。', 'Find teammates, build your team and enter the event.', '팀원을 찾고 팀을 준비한 뒤 함께 등록하세요.', '找到隊友，準備好隊伍，再一起報名。')}>
      <ul className={styles.startEntries}>
        <li className={styles.lobbyEntry} data-participation-lobby data-lobby-state={lobby.mode || lobby.status}>
          {lobbyOpen ? <>
            <EntryLink to={lobbyPath('/lobby')} title={t('组队大厅', 'Team lobby', '팀 찾기', '組隊大廳')} note={t('找队伍、找队员，为薯条杯组建阵容', 'Find a team or recruit players for Fries Cup', '프라이즈 컵에 함께할 팀과 팀원을 찾으세요', '找隊伍、找隊員，為薯條杯組建陣容')} tag={lobbyWritable ? t('参赛前准备', 'Before registration', '등록 전 준비', '參賽前準備') : t('目前仅开放浏览', 'Browsing only', '현재 열람만 가능', '目前僅開放瀏覽')} />
            {lobbyWritable ? <div className={styles.entryExtras}><Link to={lobbyPath('/lobby/me/publish?type=person')}>{t('发布求队卡', 'Post a player card', '팀 찾기 카드 게시', '發布求隊卡')}<EntryArrow /></Link><Link to={lobbyPath('/lobby/me/publish?type=team')}>{t('发布队伍招募', 'Post team recruitment', '팀원 모집 게시', '發布隊伍招募')}<EntryArrow /></Link></div> : null}
          </> : <div className={styles.unavailable} role={lobby.status === 'loading' ? 'status' : undefined}>
            <strong>{t('组队大厅', 'Team lobby', '팀 찾기', '組隊大廳')}</strong>
            <p>{lobby.status === 'loading' ? t('正在读取开放状态…', 'Checking availability…', '운영 상태 확인 중…', '正在讀取開放狀態…') : lobby.status === 'error' ? t('暂时无法读取开放状态，请稍后再试。', 'Availability could not be loaded. Please try again later.', '운영 상태를 불러오지 못했습니다. 나중에 다시 확인하세요.', '暫時無法讀取開放狀態，請稍後再試。') : t('组队大厅暂未开放，请留意赛事公告。', 'The team lobby is closed. Check event announcements for updates.', '팀 찾기는 현재 닫혀 있습니다. 대회 공지를 확인하세요.', '組隊大廳暫未開放，請留意賽事公告。')}</p>
            {lobby.status === 'error' && <button type="button" className={styles.retry} onClick={() => setLobbyAttempt(value => value + 1)}>{t('重新读取', 'Try again', '다시 불러오기', '重新讀取')}</button>}
          </div>}
        </li>
        <li><EntryLink to={registrationPath} title={t('赛事报名', 'Event registration', '대회 등록', '賽事報名')} note={t('队长创建报名、邀请队员，或继续完善资料', 'Captains create an entry, invite players or continue a registration', '주장이 등록을 만들고 팀원을 초대하거나 작성을 이어갑니다', '隊長建立報名、邀請隊員，或繼續完善資料')} tag={t('队长发起 · 队员确认', 'Captain starts · players confirm', '주장 신청 · 팀원 확인', '隊長發起 · 隊員確認')} />
          <p className={styles.entryHint}>{t('已有队伍邀请？打开队长提供的完整链接加入报名。', 'Have an invitation? Open your captain’s complete link to join the entry.', '초대를 받았다면 주장이 보낸 전체 링크를 열어 참가하세요.', '已有隊伍邀請？打開隊長提供的完整連結加入報名。')}</p>
        </li>
      </ul>
      <p className={styles.sectionNote}>{t('在大厅达成联系意愿后，仍需通过报名流程确认入队。', 'After connecting in the lobby, confirm membership through registration.', '팀 찾기에서 연락한 뒤에도 등록 절차로 팀 합류를 확인해야 합니다.', '在大廳達成聯絡意願後，仍需透過報名流程確認入隊。')}</p>
    </HubSection>

    <HubSection id="play-mine" number="02" title={t('我的参赛', 'My participation', '내 참가', '我的參賽')} description={t('报名、名单和比赛，按你的身份继续办理。', 'Continue your registration, roster and matches with your assigned role.', '본인 역할에 따라 등록, 명단과 경기를 관리하세요.', '報名、名單和比賽，按你的身分繼續辦理。')}>
      <ul className={styles.manageEntries} data-participation-mine>
        <li><EntryLink to={confirmationPath} title={t('队伍与名单', 'Team & roster', '팀 및 명단', '隊伍與名單')} note={t('队伍资料、成员名单与本周参赛确认', 'Team details, roster and weekly confirmation', '팀 정보, 선수 명단 및 주간 참가 확인', '隊伍資料、成員名單與本週參賽確認')} tag={t('队长 / 经理', 'Captain / manager', '주장 / 매니저', '隊長 / 經理')} /></li>
        <li><EntryLink to={matchesPath} title={t('我的比赛', 'My matches', '내 경기', '我的比賽')} note={t('查看本场安排，进入比赛房与核对赛果', 'Find your match, open the room and check results', '경기 일정을 확인하고 경기 방에 입장해 결과를 확인하세요', '查看本場安排，進入比賽房與核對賽果')} tag={t('参赛队员 / 工作人员', 'Players / event staff', '선수 / 대회 스태프', '參賽隊員 / 工作人員')} /></li>
        <li><EntryLink to={tasksPath} title={t('参赛待办', 'Participation tasks', '참가 할 일', '參賽待辦')} note={t('查看需要你回应和提交的参赛事项', 'Review participation items that need your response', '응답하거나 제출해야 할 참가 업무를 확인하세요', '查看需要你回應和提交的參賽事項')} tag={t('本人事项', 'Your actions', '내 업무', '本人事項')} /></li>
      </ul>
      <WeeklyConfirmationStatus db={db} locale={locale} className={styles.stepStatus} countdownClassName={styles.stepCountdown} />
      <div className={styles.personalLinks}><span>{isAuthenticated ? t('管理名片、联系记录和个人参赛事务', 'Manage cards, contacts and your participation', '카드, 연락 기록 및 개인 참가 업무 관리', '管理名片、聯絡記錄和個人參賽事務') : t('登录后查看个人参赛进度；具体操作按队伍权限开放。', 'Sign in to view your progress. Team permissions determine available actions.', '로그인하면 진행 상황을 볼 수 있으며 업무는 팀 권한에 따라 열립니다.', '登入後查看個人參賽進度；具體操作按隊伍權限開放。')}</span><Link to={lobbyPath('/lobby/me')}>{t('我的组队', 'My team search', '내 팀 찾기', '我的組隊')}<EntryArrow /></Link><Link to={spacePath}>{t('我的空间', 'My Space', '내 공간', '我的空間')}<EntryArrow /></Link><Link to={withSeason('/account')}>{t('账号设置', 'Account settings', '계정 설정', '帳號設定')}<EntryArrow /></Link></div>
    </HubSection>

    <HubSection id="play-help" number="03" title={t('规则与帮助', 'Rules & help', '규정 및 도움말', '規則與幫助')} description={t('了解参赛要求，提前熟悉比赛流程。', 'Understand the requirements and prepare for match day.', '참가 요건과 경기 진행을 미리 확인하세요.', '了解參賽要求，提前熟悉比賽流程。')}>
      <ul className={styles.helpEntries}>{helpEntries.map(entry => <li key={entry.title}><EntryLink {...entry} /></li>)}</ul>
    </HubSection>

    <details className={styles.flow}>
      <summary><span>{t('首次参赛流程', 'First-time participation', '첫 참가 절차', '首次參賽流程')}</span><span>{t('展开说明', 'Read the steps', '절차 보기', '展開說明')}<EntryArrow /></span></summary>
      <ol className={styles.steps}>
        {steps.map((step, index) => <li key={step.title}>
          <b aria-hidden="true">{String(index + 1).padStart(2, '0')}</b>
          <div>
            <h3>{step.title}<small>{step.who}</small></h3>
            <p>{step.body}</p>
            {step.note ? <p className={styles.stepNote}>{step.note}</p> : null}
            {step.link ? <Link to={step.link.to}>{step.link.label} <span aria-hidden="true">→</span></Link> : null}
          </div>
        </li>)}
      </ol>
    </details>
  </div>
}
