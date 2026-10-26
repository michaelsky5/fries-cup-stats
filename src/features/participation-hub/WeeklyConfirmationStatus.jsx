import { useCallback, useState } from 'react'
import { pickUiLocale } from '../../lib/uiText.js'
import MatchCountdown from '../weekly-overview/MatchCountdown.jsx'
import { participationWeekNumber } from '../weekly-overview/weeklyInteractionNavigation.js'
import { openWeeklyConfirmation } from '../weekly-overview/weeklyPhase.js'
import { weeklyCycleTitle } from '../weekly-overview/weeklyPresentation.js'

const isEnglish = locale => String(locale).startsWith('en')

function deadlineText(value, locale) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat(isEnglish(locale) ? 'en-GB' : 'zh-CN', {
    timeZone: 'Asia/Shanghai', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false
  }).formatToParts(new Date(value)).map(part => [part.type, part.value]))
  const day = isEnglish(locale) ? `${parts.day}/${parts.month}` : `${parts.month}/${parts.day}`
  return `${day} ${parts.hour}:${parts.minute}`
}

// 票 2.46: the published confirmation window is public, so the guide shows it signed in or not:
// while this week's confirmation is open, its deadline and a countdown; nothing once it has closed.
export default function WeeklyConfirmationStatus({ db, locale, className, countdownClassName }) {
  const [now, setNow] = useState(() => Date.now())
  const refresh = useCallback(() => setNow(Date.now()), [])
  const open = openWeeklyConfirmation(db, now)
  if (!open) return null
  const t = (...copy) => pickUiLocale(locale, ...copy)
  const { registration, closesAt } = open
  const week = participationWeekNumber(registration.week_number)
  const period = [
    registration.cycle_name ? weeklyCycleTitle({ name: registration.cycle_name }, locale) : '',
    week ? t(`第 ${week} 周`, `Week ${week}`, `${week}주차`, `第 ${week} 週`) : ''
  ].filter(Boolean).join(' · ')
  const deadline = closesAt ? deadlineText(closesAt, locale) : ''
  return <p className={className} data-weekly-confirmation="open">
    <strong>{t('本周确认开放中', 'This week’s confirmation is open', '이번 주 참가 확인 진행 중', '本週確認開放中')}</strong>
    {period ? <span>{period}</span> : null}
    {deadline ? <span>{t(`${deadline} 截止`, `Closes ${deadline}`, `${deadline} 마감`, `${deadline} 截止`)}</span> : null}
    {closesAt ? <MatchCountdown startsAt={closesAt} kind="deadline" locale={locale} className={countdownClassName} onDone={refresh} /> : null}
  </p>
}
