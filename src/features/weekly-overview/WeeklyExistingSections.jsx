import { Link } from 'react-router-dom'
import { useId, useState } from 'react'
import { pickUiLocale } from '../../lib/uiText.js'
import { formatOwMapName, formatOwMapMode } from '../../lib/heroes.js'
import { getMapImage } from '../../lib/reviewAssets.js'
import { participationWeekNumber, weeklyParticipationPath } from './weeklyInteractionNavigation.js'
import { showsInlineTimeZone } from './weeklyPresentation.js'
import styles from './SignalWeeklyOverview.module.css'

const dateFormatter = (locale, options) => new Intl.DateTimeFormat(String(locale).startsWith('en') ? 'en-GB' : 'zh-CN', { timeZone: 'Asia/Shanghai', ...options })
export function weeklyCycleDateRange(cycle, locale) {
  if (!cycle?.starts_at || !cycle?.ends_at) return ''
  const formatter = dateFormatter(locale, { year: 'numeric', month: '2-digit', day: '2-digit' })
  return `${formatter.format(new Date(cycle.starts_at))} — ${formatter.format(new Date(cycle.ends_at))}`
}

export function WeeklyRegistrationBand({ registration, locale, withSeason }) {
  if (!registration) return null
  const confirmationWeek = participationWeekNumber(registration.week_number)
  const weekText = confirmationWeek
    ? pickUiLocale(locale, `第 ${confirmationWeek} 周`, `Week ${confirmationWeek}`, `${confirmationWeek}주차`, `第 ${confirmationWeek} 週`)
    : null
  const confirmationTitle = weekText
    ? pickUiLocale(locale, `${weekText}参赛确认`, `Confirm ${weekText}`, `${weekText} 참가 확인`, `${weekText}參賽確認`)
    : pickUiLocale(locale, '每周参赛确认', 'Weekly confirmation', '주간 참가 확인', '每週參賽確認')
  const deadline = registration.closes_at && dateFormatter(locale, { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(registration.closes_at))
  return <section className={styles.registrationBand} data-weekly-registration="true" aria-label={pickUiLocale(locale, '报名与参赛', 'Registration & participation', '등록 및 참가', '報名與參賽')}>
    <div className={styles.registrationInfo}>
      <strong>{pickUiLocale(locale, '参赛办理', 'Participation', '참가 절차', '參賽辦理')}{registration.status === 'CONFIRMATION_OPEN' && <span> {pickUiLocale(locale, '确认中', 'Confirmation open', '확인 진행 중', '確認中')}</span>}</strong>
      {deadline && <small>{pickUiLocale(locale, '截止：', 'Closes: ', '마감: ', '截止：')}{deadline}{showsInlineTimeZone(locale) ? ' UTC+8' : ''}</small>}
    </div>
    <Link className={styles.confirmationLink} to={withSeason(weeklyParticipationPath(registration))}><strong>{confirmationTitle}</strong><span aria-hidden="true">→</span></Link>
    <Link className={styles.registrationLink} to={withSeason('/participate/FCW26')}><strong>{pickUiLocale(locale, '首次报名 / 继续报名', 'Register / continue', '신규 / 계속 등록', '首次報名 / 繼續報名')}</strong><span aria-hidden="true">→</span></Link>
  </section>
}

export function WeeklyPublishedMapPool({ cycle, locale }) {
  const panelId = useId()
  const [selectedType, setSelectedType] = useState('')
  const groups = cycle?.map_pool?.types || []
  const activeType = groups.find(group => group.type === selectedType)?.type || groups[0]?.type
  if (!groups.length) return null
  const count = groups.reduce((total, group) => total + (group.maps || []).length, 0)
  return <details className={styles.publishedMapPool} data-weekly-map-pool="true">
    <summary>
      <span className={styles.poolSummaryTitle}><strong>{pickUiLocale(locale, '当前赛段地图池', 'Current cycle map pool', '현재 주기 전장 목록', '當前賽段地圖池')}</strong><small>{pickUiLocale(locale, `${count} 张地图 · ${groups.length} 类`, `${count} maps · ${groups.length} modes`, `전장 ${count}개 · 유형 ${groups.length}개`, `${count} 張地圖 · ${groups.length} 類`)}</small></span>
      <span className={styles.poolToggle}><span className={styles.poolExpand}>{pickUiLocale(locale, '查看地图', 'View maps', '전장 보기', '查看地圖')}</span><span className={styles.poolCollapse}>{pickUiLocale(locale, '收起地图', 'Hide maps', '접기', '收起地圖')}</span><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg></span>
    </summary>
    <nav className={styles.poolModePicker} aria-label={pickUiLocale(locale, '地图类型', 'Map modes', '전장 유형', '地圖類型')}>
      {groups.map(group => <button type="button" key={group.type} data-weekly-map-mode={group.type} aria-pressed={group.type === activeType} aria-controls={`${panelId}-${group.type}`} onClick={() => setSelectedType(group.type)}><span>{formatOwMapMode(group.type, locale)}</span><small>{(group.maps || []).length}</small></button>)}
    </nav>
    <div className={styles.poolGroups}>{groups.map(group => <section id={`${panelId}-${group.type}`} key={group.type} data-mode-active={group.type === activeType} aria-label={formatOwMapMode(group.type, locale)}><h3>{formatOwMapMode(group.type, locale)}<small>{(group.maps || []).length}</small></h3><ul className={styles.poolMaps}>{(group.maps || []).map(name => <li key={name}><img src={getMapImage(group.type, name)} alt="" loading="lazy" width="88" height="56" /><strong>{formatOwMapName(name, locale)}</strong></li>)}</ul></section>)}</div>
  </details>
}
