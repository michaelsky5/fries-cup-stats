import { Link } from 'react-router-dom'
import TeamLogo from '../../components/matches/TeamLogo.jsx'
import { pickUiLocale } from '../../lib/uiText.js'
import { getWatchLink } from '../../lib/watchLink.js'
import MatchCountdown from './MatchCountdown.jsx'
import { weeklyParticipationPath, participationWeekNumber } from './weeklyInteractionNavigation.js'
import { weeklyScore } from './weeklyOverviewModel.js'
import { keepWeeklyPhaseRow, weeklyAccountStep } from './weeklyPhase.js'
import { weeklyCycleTitle, weeklyMatchContextLabel, weeklyPeriodPath, weeklyTeamShort } from './weeklyPresentation.js'
import styles from './WeeklyPhaseCard.module.css'

const idOf = team => String(team?.id || team?.team_id || '')
const isEnglish = locale => String(locale).startsWith('en')
const parts = (value, locale, options) => Object.fromEntries(new Intl.DateTimeFormat(isEnglish(locale) ? 'en-GB' : 'zh-CN', { timeZone: 'Asia/Shanghai', ...options })
  .formatToParts(new Date(value)).map(part => [part.type, part.value]))
const dayText = (value, locale) => {
  const date = parts(value, locale, { month: 'numeric', day: 'numeric' })
  return isEnglish(locale) ? `${date.day}/${date.month}` : `${date.month}/${date.day}`
}
const timeText = (value, locale) => {
  const date = parts(value, locale, { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
  return `${isEnglish(locale) ? `${date.day}/${date.month}` : `${date.month}/${date.day}`} ${date.hour}:${date.minute}`
}
const WEEKDAYS = {
  zh: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'], en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  ko: ['일', '월', '화', '수', '목', '금', '토'], tw: ['週日', '週一', '週二', '週三', '週四', '週五', '週六']
}
const weekly = (slot, locale) => slot ? `${pickUiLocale(locale, WEEKDAYS.zh[slot.weekday], WEEKDAYS.en[slot.weekday], WEEKDAYS.ko[slot.weekday], WEEKDAYS.tw[slot.weekday])} ${slot.time}` : ''
const plannedMark = locale => pickUiLocale(locale, '（计划）', ' (planned)', ' (계획)', '（計畫）')
const plannedCycleName = (plan, locale) => pickUiLocale(locale, plan.name, plan.nameEn, plan.nameKo, plan.nameTw)

// 票 2.66: a published cycle *opens* on its start date; its first matches are week 1's match window. Only the
// event plan (not yet published) still speaks of the cycle starting, marked as planned.
function nextCycleText(next, locale, now) {
  if (!next?.startsAt) return ''
  const name = next.planned ? plannedCycleName(next.plan, locale) : weeklyCycleTitle(next.cycle, locale)
  const day = dayText(next.startsAt, locale)
  if (next.planned) return `${pickUiLocale(locale, `${name} ${day} 开赛`, `${name} starts ${day}`, `${name} ${day} 시작`, `${name} ${day} 開賽`)}${plannedMark(locale)}`
  const opened = next.startsAt <= now
    ? pickUiLocale(locale, `${name}已开放`, `${name} is open`, `${name} 진행 중`, `${name}已開放`)
    : pickUiLocale(locale, `${name} ${day} 开放`, `${name} opens ${day}`, `${name} ${day} 오픈`, `${name} ${day} 開放`)
  const first = next.firstMatchAt ? pickUiLocale(locale, `首周比赛 ${timeText(next.firstMatchAt, locale)}`, `first matches ${timeText(next.firstMatchAt, locale)}`, `첫 주 경기 ${timeText(next.firstMatchAt, locale)}`, `首週比賽 ${timeText(next.firstMatchAt, locale)}`) : ''
  return [opened, first].filter(Boolean).join(' · ')
}

// The championship line reads from the winner's side: 决赛 3 : 0 BBB.
function finalLine(phase, locale) {
  const match = phase.final
  const champion = phase.placements[0].team
  if (!match) return ''
  const championIsA = idOf(match.team_a) === idOf(champion)
  const own = weeklyScore(championIsA ? match.team_a?.score : match.team_b?.score)
  const other = weeklyScore(championIsA ? match.team_b?.score : match.team_a?.score)
  const opponent = weeklyTeamShort(championIsA ? match.team_b : match.team_a)
  return pickUiLocale(locale, `决赛 ${own} : ${other} ${opponent}`, `Final ${own}–${other} vs ${opponent}`, `결승 ${own} : ${other} ${opponent}`, `決賽 ${own} : ${other} ${opponent}`)
}

// 票 2.66: the confirmation card offers what this reader can do. Signed out, or nothing known about the account yet:
// confirm (captains) and first registration. Signed in: the account's own step (weeklyAccountStep) — this week's
// confirmation, a draft registration to finish, or registering a team; others with a team see the captains' button.
const continueDraft = (step, t) => step?.kind === 'submit'
  ? { to: step.to, label: t('继续填写报名', 'Continue registration', '등록 계속하기', '繼續填寫報名'), primary: true } : null
function confirmationActions(registration, account, { t, withSeason }) {
  const confirm = { to: withSeason(weeklyParticipationPath(registration)), label: t('确认参赛（队长）', 'Confirm (captains)', '참가 확인 (주장)', '確認參賽（隊長）'), primary: true }
  const register = { to: withSeason('/participate/FCW26'), label: t('首次报名', 'Register a team', '신규 등록', '首次報名') }
  const step = weeklyAccountStep(account)
  if (step?.kind === 'confirm') return [{ ...confirm, to: step.to, label: t('确认本队参赛', 'Confirm your team', '우리 팀 참가 확인', '確認本隊參賽') }]
  if (step?.kind === 'submit') return [continueDraft(step, t)]
  if (step?.kind === 'register') return [{ ...register, primary: true }]
  if (step) return [confirm]
  return [confirm, register]
}

function describe(phase, { locale, withSeason, plan, now, seasonId, account }) {
  const t = (zh, en, ko, tw) => pickUiLocale(locale, zh, en, ko, tw)
  if (phase.kind === 'cycleClosed') {
    const cycle = weeklyCycleTitle(phase.cycle, locale)
    const champion = phase.placements[0].team
    return {
      eyebrow: `${cycle} · ${t('已结束', 'Closed', '종료', '已結束')}`,
      title: <><TeamLogo team={champion} seasonId={seasonId} className={styles.titleLogo} /><span>{t(`${cycle}优胜者`, `${cycle} winner`, `${cycle} 우승`, `${cycle}優勝者`)} <b>{weeklyTeamShort(champion)}</b></span></>,
      line: `${cycle}${t('优胜者', ' winner', ' 우승', '優勝者')} ${weeklyTeamShort(champion)}`,
      facts: [finalLine(phase, locale), nextCycleText(phase.next, locale, now)].filter(Boolean),
      actions: [{ to: withSeason(weeklyPeriodPath('/advance', phase.cycle)), label: t('查看晋级形势', 'See advancement', '진출 현황 보기', '查看晉級形勢'), primary: true }]
    }
  }
  if (phase.kind === 'registration') {
    const closes = phase.closesAt ? t(`${timeText(phase.closesAt, locale)} 截止`, `Closes ${timeText(phase.closesAt, locale)}`, `${timeText(phase.closesAt, locale)} 마감`, `${timeText(phase.closesAt, locale)} 截止`) : t('随时可以报名', 'Open any time', '언제든 등록 가능', '隨時可以報名')
    return {
      eyebrow: t('队伍报名', 'Team registration', '팀 등록', '隊伍報名'),
      title: t('队伍报名开放中', 'Team registration is open', '팀 등록 진행 중', '隊伍報名開放中'),
      line: `${t('队伍报名开放中', 'Team registration open', '팀 등록 진행 중', '隊伍報名開放中')} · ${closes}`,
      facts: [closes],
      // 票 2.66: someone with a draft continues it rather than starting another.
      actions: [continueDraft(weeklyAccountStep(account), t) || { to: withSeason('/participate/FCW26'), label: t('去报名', 'Register', '등록하기', '去報名'), primary: true }]
    }
  }
  if (phase.kind === 'confirmation') {
    const registration = phase.registration
    const week = participationWeekNumber(registration.week_number)
    const label = [registration.cycle_name ? weeklyCycleTitle({ name: registration.cycle_name }, locale) : '', week ? t(`第 ${week} 周`, `Week ${week}`, `${week}주차`, `第 ${week} 週`) : ''].filter(Boolean).join(' · ')
    const pairing = plan?.weekly?.pairingPublished
    return {
      eyebrow: label || t('每周参赛确认', 'Weekly confirmation', '주간 참가 확인', '每週參賽確認'),
      title: t('本周参赛确认', 'Confirm this week', '이번 주 참가 확인', '本週參賽確認'),
      line: `${t('本周参赛确认', 'Weekly confirmation', '주간 참가 확인', '本週參賽確認')}${phase.closesAt ? ` · ${t(`${timeText(phase.closesAt, locale)} 截止`, `closes ${timeText(phase.closesAt, locale)}`, `${timeText(phase.closesAt, locale)} 마감`, `${timeText(phase.closesAt, locale)} 截止`)}` : ''}`,
      facts: [
        phase.closesAt ? t(`${timeText(phase.closesAt, locale)} 截止`, `Closes ${timeText(phase.closesAt, locale)}`, `${timeText(phase.closesAt, locale)} 마감`, `${timeText(phase.closesAt, locale)} 截止`) : '',
        pairing ? `${t('对阵', 'Pairings', '대진', '對陣')} ${weekly(pairing, locale)} ${t('公布', 'published', '공개', '公布')}${plannedMark(locale)}` : '',
        phase.matchWindowStartsAt ? t(`比赛 ${timeText(phase.matchWindowStartsAt, locale)} 开始`, `Matches from ${timeText(phase.matchWindowStartsAt, locale)}`, `${timeText(phase.matchWindowStartsAt, locale)} 경기 시작`, `比賽 ${timeText(phase.matchWindowStartsAt, locale)} 開始`) : ''
      ].filter(Boolean),
      // 票 2.46: the deadline counts down for everyone, signed in or not.
      countdown: phase.closesAt,
      countdownKind: 'deadline',
      actions: confirmationActions(registration, account, { t, withSeason })
    }
  }
  if (phase.kind === 'weekAhead') {
    const registration = phase.registration
    const week = participationWeekNumber(registration.week_number)
    const label = [registration.cycle_name ? weeklyCycleTitle({ name: registration.cycle_name }, locale) : '', week ? t(`第 ${week} 周`, `Week ${week}`, `${week}주차`, `第 ${week} 週`) : ''].filter(Boolean).join(' · ')
    const weekName = week ? t(`第 ${week} 周`, `Week ${week}`, `${week}주차`, `第 ${week} 週`) : t('本周', 'This week', '이번 주', '本週')
    const pairing = plan?.weekly?.pairingPublished
    const schedule = { to: withSeason(weeklyPeriodPath('/matches', { id: registration.cycle_id })), label: t('查看赛程', 'Schedule', '일정 보기', '查看賽程'), primary: true }
    const ends = phase.endsAt ? t(`${timeText(phase.endsAt, locale)} 结束`, `ends ${timeText(phase.endsAt, locale)}`, `${timeText(phase.endsAt, locale)} 종료`, `${timeText(phase.endsAt, locale)} 結束`) : ''
    if (phase.started) return {
      eyebrow: label || weekName,
      title: t(`${weekName}比赛进行中`, `${weekName} matches are on`, `${weekName} 경기 진행 중`, `${weekName}比賽進行中`),
      line: [t(`${weekName}比赛进行中`, `${weekName} matches are on`, `${weekName} 경기 진행 중`, `${weekName}比賽進行中`), ends].filter(Boolean).join(' · '),
      facts: [ends].filter(Boolean),
      actions: [schedule]
    }
    const starts = timeText(phase.startsAt, locale)
    return {
      eyebrow: label || weekName,
      title: t(`${weekName}比赛 ${starts} 开始`, `${weekName} matches start ${starts}`, `${weekName} 경기 ${starts} 시작`, `${weekName}比賽 ${starts} 開始`),
      line: t(`${weekName}比赛 ${starts} 开始`, `${weekName} matches start ${starts}`, `${weekName} 경기 ${starts} 시작`, `${weekName}比賽 ${starts} 開始`),
      facts: [
        t(`参赛确认已于 ${timeText(phase.closesAt, locale)} 截止`, `Confirmation closed ${timeText(phase.closesAt, locale)}`, `참가 확인 ${timeText(phase.closesAt, locale)} 마감`, `參賽確認已於 ${timeText(phase.closesAt, locale)} 截止`),
        pairing ? `${t('对阵', 'Pairings', '대진', '對陣')} ${weekly(pairing, locale)} ${t('公布', 'published', '공개', '公布')}${plannedMark(locale)}` : '',
        ends ? t(`比赛至 ${timeText(phase.endsAt, locale)}`, `matches until ${timeText(phase.endsAt, locale)}`, `${timeText(phase.endsAt, locale)}까지 경기`, `比賽至 ${timeText(phase.endsAt, locale)}`) : ''
      ].filter(Boolean),
      countdown: phase.startsAt,
      countdownKind: 'start',
      actions: [schedule]
    }
  }
  if (phase.kind === 'matchweek' || phase.kind === 'live') {
    const match = phase.match
    const live = phase.kind === 'live'
    const watch = getWatchLink(match, match.state, now)
    const teams = <span className={styles.duel}><TeamLogo team={match.team_a} seasonId={seasonId} className={styles.titleLogo} /><b>{weeklyTeamShort(match.team_a)}</b><strong>{live ? `${weeklyScore(match.team_a?.score)} : ${weeklyScore(match.team_b?.score)}` : 'VS'}</strong><b>{weeklyTeamShort(match.team_b)}</b><TeamLogo team={match.team_b} seasonId={seasonId} className={styles.titleLogo} /></span>
    return {
      eyebrow: live ? t('比赛进行中', 'Live now', '경기 진행 중', '比賽進行中') : `${weeklyMatchContextLabel(match, locale)} · ${t('下一场', 'Next match', '다음 경기', '下一場')}`,
      title: teams,
      line: `${live ? t('比赛进行中', 'Live', '진행 중', '比賽進行中') : t('下一场', 'Next match', '다음 경기', '下一場')} · ${weeklyTeamShort(match.team_a)} ${live ? `${weeklyScore(match.team_a?.score)} : ${weeklyScore(match.team_b?.score)}` : 'VS'} ${weeklyTeamShort(match.team_b)}`,
      facts: live ? [weeklyMatchContextLabel(match, locale)] : [timeText(phase.startsAt, locale)],
      countdown: live ? null : phase.startsAt,
      actions: [
        ...(watch ? [{ href: watch.url, label: watch.kind === 'live' ? t('看直播', 'Watch live', '생중계', '看直播') : t('看录像', 'Replays', '다시보기', '看錄像'), primary: live, external: true }] : []),
        { to: withSeason(`/matches/${encodeURIComponent(match.id)}`), label: t('比赛详情', 'Match details', '경기 상세', '比賽詳情'), primary: !live && !watch }
      ]
    }
  }
  if (phase.kind === 'cycleUpcoming') {
    const cycle = weeklyCycleTitle(phase.cycle, locale)
    const closes = plan?.weekly?.confirmationCloses
    return {
      eyebrow: t('下一赛段', 'Next cycle', '다음 주기', '下一賽段'),
      title: t(`${cycle} ${dayText(phase.startsAt, locale)} 开赛`, `${cycle} starts ${dayText(phase.startsAt, locale)}`, `${cycle} ${dayText(phase.startsAt, locale)} 시작`, `${cycle} ${dayText(phase.startsAt, locale)} 開賽`),
      line: t(`${cycle} ${dayText(phase.startsAt, locale)} 开赛`, `${cycle} starts ${dayText(phase.startsAt, locale)}`, `${cycle} ${dayText(phase.startsAt, locale)} 시작`, `${cycle} ${dayText(phase.startsAt, locale)} 開賽`),
      facts: closes ? [`${t('每周', 'Each week', '매주', '每週')} ${weekly(closes, locale)} ${t('前确认参赛', 'confirmation deadline', '전 참가 확인', '前確認參賽')}${plannedMark(locale)}`] : [],
      actions: [{ to: withSeason(weeklyPeriodPath('/matches', phase.cycle)), label: t('查看赛程', 'Schedule', '일정 보기', '查看賽程'), primary: true }]
    }
  }
  return null
}

// The phase card leads the weekly home (票 2.16): the most urgent phase as the main card,
// other phases that also hold right now as one line each below it.
// 票 2.41: the team lobby is a standing way in, so it joins as the last line instead of a band
// above the page title.
export default function WeeklyPhaseCard({ phases, plan, locale, withSeason, now, seasonId, lobbyPath = null, onPhaseExpired, account = null }) {
  const described = phases.map(phase => ({ phase, view: describe(phase, { locale, withSeason, plan, now, seasonId, account }) })).filter(item => item.view)
  if (!described.length) return null
  const [{ phase, view }, ...others] = described
  const phaseRows = others.filter(({ phase: item }) => keepWeeklyPhaseRow(phase, item, account))
  const lobbyRow = lobbyPath ? [{ phase: { kind: 'lobby' }, view: {
    line: pickUiLocale(locale, '组队大厅 · 找队友、招队员', 'Team lobby · Find teammates or players', '팀 찾기 · 팀원과 선수 찾기', '組隊大廳 · 找隊友、招隊員'),
    actions: [{ to: lobbyPath, label: pickUiLocale(locale, '去组队大厅', 'Open the lobby', '팀 찾기로 이동', '前往組隊大廳') }]
  } }] : []
  const rest = [...phaseRows, ...lobbyRow]
  const actionNode = (action, index) => action.href
    ? <a key={index} className={action.primary ? styles.primary : styles.secondary} href={action.href} target="_blank" rel="noreferrer">{action.label} <span aria-hidden="true">↗</span></a>
    : <Link key={index} className={action.primary ? styles.primary : styles.secondary} to={action.to}>{action.label} <span aria-hidden="true">→</span></Link>
  // 票 2.31: on wide screens the phases that also hold right now sit beside the main card, not under it.
  return <section className={rest.length ? `${styles.phase} ${styles.withRows}` : styles.phase} data-weekly-phase={phase.kind} aria-label={pickUiLocale(locale, '赛事现在', 'Right now', '지금 대회', '賽事現在')}>
    <div className={styles.main}>
      <p className={styles.eyebrow}>{view.eyebrow}</p>
      <h2 className={styles.title}>{view.title}</h2>
      {(view.facts.length > 0 || view.countdown) && <p className={styles.facts}><span>{view.facts.join(' · ')}</span>{view.countdown && <MatchCountdown startsAt={view.countdown} locale={locale} className={styles.countdown} kind={view.countdownKind} onDone={view.countdownKind === 'deadline' || phase.kind === 'weekAhead' ? onPhaseExpired : undefined} />}</p>}
      <div className={styles.actions}>{view.actions.map(actionNode)}</div>
    </div>
    {rest.length > 0 && <ul className={styles.rows}>{rest.map(({ phase: item, view: row }) => <li key={item.kind} data-weekly-phase-row={item.kind}>
      <span>{row.line}</span>{row.actions[0] && (row.actions[0].href
        ? <a href={row.actions[0].href} target="_blank" rel="noreferrer">{row.actions[0].label} <span aria-hidden="true">↗</span></a>
        : <Link to={row.actions[0].to}>{row.actions[0].label} <span aria-hidden="true">→</span></Link>)}
    </li>)}</ul>}
  </section>
}
