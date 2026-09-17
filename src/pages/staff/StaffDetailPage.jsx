import { useEffect, useMemo } from 'react'
import { Link, useLocation, useNavigationType, useOutletContext, useParams, useSearchParams } from 'react-router-dom'
import RosterSubnav from '../../components/roster/RosterSubnav.jsx'
import TeamLogo from '../../components/matches/TeamLogo.jsx'
import { CreditVisual } from '../../features/staff-credits/StaffCredits.jsx'
import { staffRoleLabel, staffCreditsText } from '../../features/staff-credits/staffCreditsCopy.js'
import { getStaffProfile, getStaffProfilePath } from '../../lib/staffProfiles.js'
import { getPlayerDisplayIdentity, getRosterRoleLabel } from '../../lib/rosterSelectors.js'
import { getMatchScore, getMatchStatusText, getMatchTimeLabel, getTeamLabel } from '../../lib/matchesSelectors.js'
import { getLocationPath, getReturnState, saveReturnScroll, getSavedReturnScroll, getRestoreScrollState, getRestoreScrollY, readReturnState, restoreWindowScroll } from '../../lib/navigationState.js'
import { pickUiLocale, translateUiText } from '../../lib/uiText.js'
import styles from './StaffDetailPage.module.css'

const COPY = {
  profile: ['职员档案', 'Staff profile', '스태프 기록', '職員檔案'],
  back: ['返回职员目录', 'Back to staff directory', '스태프 목록으로', '返回職員目錄'],
  backProfile: ['返回职员档案', 'Back to staff profile', '스태프 기록으로', '返回職員檔案'],
  backOverview: ['返回阵容总览', 'Back to roster overview', '명단 개요로', '返回陣容總覽'],
  missing: ['本届没有这份职员档案', 'This staff record is not in this event', '이 대회에 해당 스태프 기록이 없습니다', '本屆沒有這份職員檔案'],
  missingNote: ['可返回本届目录，查找已发布的职员记录。', 'Return to this event’s directory to find a published record.', '대회 목록에서 공개된 기록을 찾아보세요.', '可返回本屆目錄，查找已發布的職員記錄。'],
  matches: ['署名比赛', 'Credited matches', '참여 경기', '署名比賽'],
  stages: ['赛事阶段', 'Stages', '대회 단계', '賽事階段'],
  teams: ['涉及队伍', 'Teams covered', '관련 팀', '涉及隊伍'],
  roster: ['一起参赛的选手', 'Players on the team', '함께한 선수', '一起參賽的選手'],
  rosterNote: ['按本届队伍名册展示，包含全季登记的成员与阵容变更。', 'Published team roster, including registrations and changes across the season.', '시즌 중 등록 및 변경된 선수를 포함한 공개 팀 명단입니다.', '按本屆隊伍名冊展示，包含全季登記的成員與陣容變更。'],
  unpublished: ['位登记成员尚无公开选手档案。', 'registered players do not yet have public profiles.', '명의 등록 선수는 아직 공개 프로필이 없습니다.', '位登記成員尚無公開選手檔案。'],
  recordNote: ['按比赛时间从近到远排列；点击一场，查看对阵、赛果与完整署名。', 'Latest matches first. Open a match for results and its full credits.', '최근 경기 순입니다. 경기를 열어 결과와 참여 기록을 확인하세요.', '按比賽時間從近到遠排列；點擊一場，查看對陣、賽果與完整署名。'],
  all: ['全部阶段', 'All stages', '모든 단계', '全部階段'],
  more: ['查看更多比赛', 'More matches', '경기 더 보기', '查看更多比賽'],
  empty: ['暂无可展示的公开记录。', 'No public records to show yet.', '표시할 공개 기록이 없습니다.', '暫無可展示的公開記錄。'],
  alongside: ['同场搭档', 'Alongside them', '함께한 동료', '同場搭檔'],
  colleagues: ['队伍里的同行者', 'Other team staff', '다른 팀 스태프', '隊伍裡的同行者'],
  shared: ['场共同署名', 'shared credits', '공동 참여 경기', '場共同署名'],
  source: ['这份档案从哪里来', 'About this record', '기록 출처', '這份檔案從哪裡來'],
  eventSource: ['来自本届已发布比赛的职员署名。按当前职责分别记录，同一人兼任不同职责时，各自保留档案。', 'Based on staff credits in this event’s published matches. Each role has its own record, including when one person holds multiple roles.', '공개된 경기의 스태프 기록을 사용합니다. 한 사람이 여러 역할을 맡아도 역할별 기록은 구분합니다.', '來自本屆已發布比賽的職員署名。按當前職責分別記錄，同一人兼任不同職責時，各自保留檔案。'],
  archiveSource: ['署名来自本届已归档的赛程记录，并按比赛编号与当前比赛关联。各项职责分别记录。', 'Credits come from the archived schedule, linked to current matches by match ID. Each role is recorded separately.', '보관된 일정의 참여 기록을 경기 ID로 현재 경기와 연결합니다. 역할별로 구분합니다.', '署名來自本屆已歸檔的賽程記錄，並按比賽編號與當前比賽關聯。各項職責分別記錄。'],
  teamSource: ['来自本届队伍报名名单。这里记录所属队伍与登记职务，队伍战绩不计作个人执教或管理成绩。', 'Based on this event’s team registrations. Team results are not attributed to an individual manager or coach.', '팀 등록 명단의 소속 및 역할 기록입니다. 팀 성적을 개인 코칭이나 운영 성적으로 간주하지 않습니다.', '來自本屆隊伍報名名單。這裡記錄所屬隊伍與登記職務，隊伍戰績不計作個人執教或管理成績。'],
  teamArchive: ['走进队伍档案', 'Explore team archive', '팀 기록 보기', '走進隊伍檔案'],
  story: ['继续阅读赛季回顾', 'Continue to season story', '시즌 리뷰 보기', '繼續閱讀賽季回顧'],
  registration: ['本届队伍登记', 'Team registration', '대회 팀 등록', '本屆隊伍登記'],
  players: ['全季收录选手', 'Players across the season', '시즌 등록 선수', '全季收錄選手'],
  roles: ['登记职务', 'Registered roles', '등록 역할', '登記職務'],
  stageFilter: ['按赛事阶段筛选', 'Filter by stage', '대회 단계 필터', '按賽事階段篩選']
}

function DirectoryLink({ to, className, children }) {
  const location = useLocation()
  const parent = readReturnState(location.state, { allowedPrefixes: ['/staff', '/roster'] })
  const state = { ...getReturnState(location), ...(parent.returnTo ? { parentReturnTo: parent.returnTo, parentReturnScrollY: parent.returnScrollY } : {}) }
  return <Link to={to} className={className} state={state} onClick={() => saveReturnScroll(location)}>{children}</Link>
}

export default function StaffDetailPage() {
  const { db, season, seasonId, locale = 'zh-CN', withSeason, reviewAvailable, isKprHybridDesign } = useOutletContext()
  const { staffId } = useParams()
  const location = useLocation()
  const navigationType = useNavigationType()
  const [params, setParams] = useSearchParams()
  const staff = useMemo(() => getStaffProfile(db, staffId), [db, staffId])
  const text = key => pickUiLocale(locale, ...COPY[key])
  const group = staff ? staff.team ? 'team' : 'event' : params.get('group') === 'team' ? 'team' : 'event'
  const sourceReturn = readReturnState(location.state, { allowedPrefixes: ['/staff', '/roster'] })
  const returnTo = sourceReturn.returnTo || withSeason(`/staff?group=${group}`)
  const parentReturn = readReturnState({ returnTo: location.state?.parentReturnTo, returnScrollY: location.state?.parentReturnScrollY }, { allowedPrefixes: ['/staff', '/roster'] })
  const backState = { ...getRestoreScrollState(sourceReturn.returnScrollY), ...(parentReturn.returnTo ? parentReturn : {}) }
  const requestedStage = params.get('stage') || 'ALL'
  const stage = staff?.stages?.some(item => item.value === requestedStage) ? requestedStage : 'ALL'
  const matches = (staff?.matches || []).filter(match => stage === 'ALL' || String(match.stage || '').toUpperCase() === stage)
  const shown = Math.max(12, Math.min(matches.length, Number(params.get('limit')) || 12))

  useEffect(() => {
    if (navigationType === 'REPLACE') return
    const saved = getRestoreScrollY(location.state) ?? (navigationType === 'POP' ? getSavedReturnScroll(getLocationPath(location)) : null)
    if (saved !== null) restoreWindowScroll(saved)
  }, [location, navigationType])

  function setStage(value) {
    const next = new URLSearchParams(params)
    if (value === 'ALL') next.delete('stage')
    else next.set('stage', value)
    next.delete('limit')
    setParams(next, { replace: true, preventScrollReset: true, state: location.state })
  }

  return <div className={styles.page} data-staff-detail data-i18n-ignore>
    <RosterSubnav presentation={isKprHybridDesign ? 'index' : 'default'} staffGroupOverride={group} />
    <div className={styles.breadcrumb}><Link to={returnTo} state={backState}>← {text(returnTo.startsWith('/staff/') ? 'backProfile' : returnTo.startsWith('/roster') ? 'backOverview' : 'back')}</Link><span>{season.publicCode} / {text('profile')}</span></div>
    {!staff ? <section className={styles.empty}><h1>{text('missing')}</h1><p>{text('missingNote')}</p></section> : <>
      <header className={styles.cover}>
        <div className={styles.identity}>
          <CreditVisual key={`${seasonId}:${staff.id}`} staff={staff} seasonId={seasonId} locale={locale} />
          <div><span className={styles.eyebrow}>{staff.team ? 'TEAM STAFF' : 'BEHIND THE MATCH'}</span><h1>{staff.name}</h1>{staff.battleTag && staff.battleTag !== staff.name ? <p>{staff.battleTag}</p> : null}<strong>{staffRoleLabel(staff, locale)}</strong></div>
        </div>
        <dl className={styles.numbers}>
          {staff.team ? <><div><dt>{text('registration')}</dt><dd className={styles.teamName}>{staff.team.shortName}</dd></div><div><dt>{text('players')}</dt><dd>{staff.rosterCount}</dd></div><div><dt>{text('roles')}</dt><dd>{staff.roles.length}</dd></div></> : <><div><dt>{text('matches')}</dt><dd>{staff.matchCount}</dd></div><div><dt>{text('stages')}</dt><dd>{staff.stageCount}</dd></div><div><dt>{text('teams')}</dt><dd>{staff.teamCount}</dd></div></>}
        </dl>
        <a className={styles.jump} href={staff.team ? '#staff-roster' : '#staff-matches'}>{text(staff.team ? 'roster' : 'matches')} <span aria-hidden="true">↓</span></a>
      </header>
      <div className={styles.body}>
        <section id={staff.team ? 'staff-roster' : 'staff-matches'} className={styles.records}>
          <header className={styles.sectionHead}><span>{staff.team ? 'ON THE SAME TEAM' : 'MATCH LOG'}</span><h2>{text(staff.team ? 'roster' : 'matches')} <small>{staff.team ? staff.players.length : matches.length}</small></h2><p>{text(staff.team ? 'rosterNote' : 'recordNote')}</p></header>
          {staff.team ? <>
            <DirectoryLink to={withSeason(`/teams/${encodeURIComponent(staff.team.routeId)}`)} className={styles.teamLink}><TeamLogo team={staff.team} seasonId={seasonId} /><span><strong>{staff.team.shortName}</strong><small>{staff.team.fullName}</small></span><span aria-hidden="true">↗</span></DirectoryLink>
            <div className={styles.roster}>{staff.players.map(player => {
              const identity = getPlayerDisplayIdentity(player)
              return <DirectoryLink key={identity.playerId} to={withSeason(`/players/${encodeURIComponent(identity.playerId)}`)} className={styles.player}><span>{getRosterRoleLabel(player.role, locale)}</span><strong>{identity.primary}</strong><span aria-hidden="true">↗</span></DirectoryLink>
            })}</div>
            {!staff.players.length ? <p className={styles.empty}>{text('empty')}</p> : null}
            {staff.unavailablePlayers > 0 ? <p className={styles.empty}>{staff.unavailablePlayers} {text('unpublished')}</p> : null}
          </> : <>
            <div className={styles.filters} role="group" aria-label={text('stageFilter')}><button type="button" aria-pressed={stage === 'ALL'} onClick={() => setStage('ALL')}>{text('all')} <b>{staff.matchCount}</b></button>{staff.stages.map(item => <button key={item.value} type="button" aria-pressed={stage === item.value} onClick={() => setStage(item.value)}>{staffCreditsText(item.title, locale)} <b>{item.count}</b></button>)}</div>
            <div className={styles.matchList}>{matches.slice(0, shown).map(match => <DirectoryLink key={match.match_id} to={withSeason(`/matches/${encodeURIComponent(match.match_id)}`)} className={styles.match}>
              <span className={styles.matchMeta}><time>{translateUiText(getMatchTimeLabel(match), locale)}</time><span>{staffCreditsText(staff.stages.find(item => item.value === String(match.stage || '').toUpperCase())?.title || match.stage, locale)} · {translateUiText(getMatchStatusText(match), locale)}</span></span>
              <span className={styles.duel}><span><TeamLogo team={match.team_a} seasonId={seasonId} /><strong>{getTeamLabel(match.team_a)}</strong></span><b>{getMatchScore(match)}</b><span><strong>{getTeamLabel(match.team_b)}</strong><TeamLogo team={match.team_b} seasonId={seasonId} /></span></span><span className={styles.arrow} aria-hidden="true">↗</span>
            </DirectoryLink>)}</div>
            {!matches.length ? <p className={styles.empty}>{text('empty')}</p> : null}
            {shown < matches.length ? <button className={styles.more} type="button" onClick={() => { const next = new URLSearchParams(params); next.set('limit', String(shown + 12)); setParams(next, { replace: true, preventScrollReset: true, state: location.state }) }}>{text('more')} <span>{Math.min(shown, matches.length)} / {matches.length} +</span></button> : null}
          </>}
        </section>
        <aside className={styles.aside}>
          {staff.colleagues.length ? <section><h2>{text(staff.team ? 'colleagues' : 'alongside')}</h2><div className={styles.colleagues}>{staff.colleagues.map(person => <DirectoryLink key={person.id} to={withSeason(getStaffProfilePath(person))}><strong>{person.name}</strong><small>{staff.team ? staffRoleLabel(person, locale) : `${person.sharedMatchCount} ${text('shared')}`}</small><span aria-hidden="true">↗</span></DirectoryLink>)}</div></section> : null}
          <section className={styles.source}><span className={styles.eyebrow}>ON THE RECORD</span><h2>{text('source')}</h2><p>{text(staff.team ? 'teamSource' : staff.creditSource === 'archive' ? 'archiveSource' : 'eventSource')}</p>{staff.team ? <DirectoryLink to={withSeason(`/teams/${encodeURIComponent(staff.team.routeId)}`)}>{text('teamArchive')} <span aria-hidden="true">↗</span></DirectoryLink> : reviewAvailable && staff.storyPath ? <DirectoryLink to={withSeason(staff.storyPath)}>{text('story')} <span aria-hidden="true">↗</span></DirectoryLink> : null}</section>
        </aside>
      </div>
    </>}
  </div>
}
