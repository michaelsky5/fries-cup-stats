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

// 票 2.18: one page that explains how to take part and links to every participation page.
// It only links; registration, confirmation and match rooms keep their own pages and rules.
export default function ParticipationHubPage() {
  const { db, season, seasonId, withSeason, locale, isAuthenticated, accountNextAction } = useOutletContext()
  const location = useLocation()
  const t = (...copy) => pickUiLocale(locale, ...copy)
  const [lobbyMode, setLobbyMode] = useState(null)
  useEffect(() => {
    let active = true
    // Same switch as the home lobby slot: show the lobby only while System has it open.
    getLobbyConfig().then(config => { if (active) setLobbyMode(OPEN_LOBBY_MODES.has(config?.mode) ? config.mode : null) }).catch(() => {})
    return () => { active = false }
  }, [])
  const lobbyOpen = Boolean(lobbyMode)
  // Publishing links only while the lobby accepts new cards; READ_ONLY keeps browsing.
  const lobbyWritable = lobbyMode === 'WRITE'
  const lobbyPath = path => withLocale(path, locale)

  const title = t('参赛指南', 'How to play', '참가 안내', '參賽指南')
  const signIn = () => window.dispatchEvent(new Event('fries-cup:open-account'))
  if (season?.lifecycle === 'ARCHIVED' || season?.partnerTrial) {
    const current = getSeasonById(DEFAULT_SEASON_ID)
    return <div className={styles.page} data-participation-hub>
      <header className={styles.hero}><h1>{title}</h1>
        <p>{t('报名、每周确认和比赛房只对正在进行的赛事开放。', 'Registration, weekly confirmation and match rooms are open for the current event only.', '등록, 주간 확인, 경기 방은 진행 중인 대회에서만 열립니다.', '報名、每週確認和比賽房只對正在進行的賽事開放。')}</p>
        <Link className={styles.primary} to={seasonLink('/play', current.id, location.search)}>{t('去当前赛事', 'Go to the current event', '현재 대회로 이동', '前往目前賽事')} · {getSeasonName(current, locale)} <span aria-hidden="true">→</span></Link>
      </header>
    </div>
  }

  const registrationPath = withSeason(`/participate/${encodeURIComponent(seasonId)}`)
  const confirmationPath = withSeason(`/me?section=team&competition=${encodeURIComponent(seasonId)}`)
  const matchesPath = withSeason('/me?section=matches')
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
      // 票 2.46: the open window and its deadline, from the public snapshot.
      status: <WeeklyConfirmationStatus db={db} locale={locale} className={styles.stepStatus} countdownClassName={styles.stepCountdown} />,
      link: { to: confirmationPath, label: t('本周参赛确认', 'This week’s confirmation', '이번 주 참가 확인', '本週參賽確認') }
    }
  ]
  const entries = [
    { to: registrationPath, label: t('报名页', 'Registration', '등록 페이지', '報名頁'), note: t('首次报名 / 继续报名', 'Start or continue a registration', '첫 등록 / 이어서 등록', '首次報名 / 繼續報名') },
    { to: '/guides/weekly-room', label: t('比赛房指南', 'Match room guide', '경기 방 안내', '比賽房指南'), note: t('免登录阅读，可分享给队伍', 'No sign-in needed; share it with your team', '로그인 없이 읽고 팀과 공유', '免登入閱讀，可分享給隊伍') },
    { href: ABOUT_WEEKLY_URL, label: t('了解周赛', 'About the weekly', '주간 대회 소개', '了解週賽'), note: t('赛制与参赛说明', 'Format and how to take part', '대회 방식과 참가 안내', '賽制與參賽說明') }
  ]

  return <div className={styles.page} data-participation-hub>
    <header className={styles.hero}>
      <h1>{title}</h1>
      <p>{t('报名、入队、每周确认和比赛夜进房间，都从这里开始。', 'Registration, joining a team, weekly confirmation and match-night rooms all start here.', '등록, 팀 합류, 주간 확인, 경기 날 입장까지 여기서 시작하세요.', '報名、入隊、每週確認和比賽夜進房間，都從這裡開始。')}</p>
      {!isAuthenticated ? <button type="button" className={styles.signIn} onClick={signIn}>{t('登录参赛账号', 'Sign in to your player account', '참가 계정 로그인', '登入參賽帳號')} <span aria-hidden="true">→</span></button> : null}
      {/* 票 2.45: signed in, the first screen leads with the one thing to do now; nothing shows without one. */}
      {isAuthenticated && accountNextAction?.to ? <Link className={styles.nextAction} to={accountNextAction.to} data-account-next-action={accountNextAction.kind}>
        <span>{t('现在要做', 'Next for you', '지금 할 일', '現在要做')}</span>
        <strong>{accountNextAction.label}</strong>
        {accountNextAction.detail ? <small>{accountNextAction.detail}</small> : null}
        <i aria-hidden="true">→</i>
      </Link> : null}
    </header>

    {isAuthenticated ? <nav className={styles.mine} aria-label={t('我的参赛', 'My participation', '내 참가', '我的參賽')} data-participation-mine>
      <Link className={styles.primary} to={matchesPath}><span><strong>{t('我的比赛', 'My matches', '내 경기', '我的比賽')}</strong><small>{t('比赛夜从这里进入比赛房', 'Enter match rooms from here on match night', '경기 날 여기서 경기 방에 들어갑니다', '比賽夜從這裡進入比賽房')}</small></span><span aria-hidden="true">→</span></Link>
      <Link className={styles.secondary} to={confirmationPath}><span><strong>{t('本周参赛确认', 'This week’s confirmation', '이번 주 참가 확인', '本週參賽確認')}</strong><small>{t('队长或经理确认当周参赛', 'Captains or managers confirm the week', '주장 또는 매니저가 이번 주 참가 확인', '隊長或經理確認當週參賽')}</small></span><span aria-hidden="true">→</span></Link>
    </nav> : null}

    <section className={styles.section} aria-labelledby="play-steps">
      <h2 id="play-steps">{t('三步参赛', 'Three steps to play', '참가 3단계', '三步參賽')}</h2>
      <ol className={styles.steps}>
        {steps.map((step, index) => <li key={step.title}>
          <b aria-hidden="true">{String(index + 1).padStart(2, '0')}</b>
          <div>
            <h3>{step.title}<small>{step.who}</small></h3>
            <p>{step.body}</p>
            {step.status || null}
            {step.note ? <p className={styles.stepNote}>{step.note}</p> : null}
            {step.link ? <Link to={step.link.to}>{step.link.label} <span aria-hidden="true">→</span></Link> : null}
          </div>
        </li>)}
      </ol>
    </section>

    {lobbyOpen ? <section className={`${styles.section} ${styles.lobby}`} aria-labelledby="play-lobby" data-participation-lobby>
      <div className={styles.lobbyCopy}>
        <h2 id="play-lobby">{t('组队大厅', 'Team lobby', '팀 찾기', '組隊大廳')}</h2>
        <p>{t('还没有队伍，就发布求队卡，让队伍找到你；队伍缺人，由队长或经理发布队伍招募。QQ 只在双方都愿意联系并授权后展示；谈好后，仍用队伍邀请链接正式入队。',
          'No team yet? Post a player card so teams can find you. Short of players? Captains or managers post a team recruitment. QQ is shown only after both sides agree to talk and allow it; players still join officially through the team invitation link.',
          '아직 팀이 없다면 팀 찾기 카드를 게시해 팀이 찾을 수 있게 하세요. 인원이 부족하면 주장이나 매니저가 팀원 모집을 게시합니다. QQ는 양쪽이 연락에 동의하고 각각 허용한 뒤에만 표시되며, 정식 합류는 팀 초대 링크로 진행합니다.',
          '還沒有隊伍，就發布求隊卡，讓隊伍找到你；隊伍缺人，由隊長或經理發布隊伍招募。QQ 只在雙方都願意聯絡並授權後顯示；談好後，仍用隊伍邀請連結正式入隊。')}</p>
      </div>
      <div className={styles.lobbyActions}>
        <Link className={styles.primary} to={lobbyPath('/lobby')}><span><strong>{t('浏览组队大厅', 'Browse the lobby', '팀 찾기 둘러보기', '瀏覽組隊大廳')}</strong><small>{t('看看正在招人的队伍和求队的选手', 'Teams recruiting and players looking for a team', '모집 중인 팀과 팀을 찾는 선수', '看看正在招人的隊伍和求隊的選手')}</small></span><span aria-hidden="true">→</span></Link>
        {lobbyWritable ? <>
          <Link className={styles.secondary} to={lobbyPath('/lobby/me/publish?type=person')}><span><strong>{t('发布求队卡', 'Post a player card', '팀 찾기 카드 게시', '發布求隊卡')}</strong><small>{t('还没有队伍的选手', 'For players without a team', '팀이 없는 선수', '還沒有隊伍的選手')}</small></span><span aria-hidden="true">→</span></Link>
          <Link className={styles.secondary} to={lobbyPath('/lobby/me/publish?type=team')}><span><strong>{t('队伍招募', 'Team recruitment', '팀원 모집', '隊伍招募')}</strong><small>{t('队长或经理为缺人的队伍发布', 'Captains or managers of teams short of players', '인원이 부족한 팀의 주장 또는 매니저', '隊長或經理為缺人的隊伍發布')}</small></span><span aria-hidden="true">→</span></Link>
        </> : null}
      </div>
    </section> : null}

    <section className={styles.section} aria-labelledby="play-night">
      <h2 id="play-night">{t('比赛夜', 'Match night', '경기 날', '比賽夜')}</h2>
      <p>{t('开赛前登录参赛账号，打开「我的空间 · 我的比赛」进入本场比赛房；签到、选图、首发和赛果核对都在房间里完成。第一次参赛，可以先在模拟比赛房练一遍。',
        'Before the start, sign in and open My Space · My matches to enter the match room. Check-in, map picks, lineups and result checks all happen there. First time? Practise in the simulated room.',
        '경기 전 참가 계정으로 로그인해 내 공간 · 내 경기에서 경기 방에 들어가세요. 체크인, 맵 선택, 선발, 결과 확인이 모두 방 안에서 진행됩니다. 처음이라면 모의 경기 방에서 먼저 연습해 보세요.',
        '開賽前登入參賽帳號，打開「我的空間 · 我的比賽」進入本場比賽房；簽到、選圖、首發和賽果核對都在房間裡完成。第一次參賽，可以先在模擬比賽房練一遍。')}</p>
      <div className={styles.inline}>
        <Link to={matchesPath}>{t('我的比赛', 'My matches', '내 경기', '我的比賽')} <span aria-hidden="true">→</span></Link>
        <Link to="/guides/weekly-room/simulate">{t('模拟比赛房', 'Practice room', '모의 경기 방', '模擬比賽房')} <span aria-hidden="true">→</span></Link>
      </div>
    </section>

    <section className={styles.section} aria-labelledby="play-links">
      <h2 id="play-links">{t('常用入口', 'Links', '바로가기', '常用入口')}</h2>
      <ul className={styles.entries}>
        {entries.map(entry => <li key={entry.label}>
          {entry.href
            ? <a href={entry.href} target="_blank" rel="noreferrer"><span><strong>{entry.label}</strong><small>{entry.note}</small></span><span aria-hidden="true">↗</span></a>
            : <Link to={entry.to}><span><strong>{entry.label}</strong><small>{entry.note}</small></span><span aria-hidden="true">→</span></Link>}
        </li>)}
      </ul>
    </section>
  </div>
}
