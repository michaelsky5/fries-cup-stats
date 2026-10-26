import { pickUiLocale, translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { normalizeStaffIdentity } from '../../lib/rosterSelectors.js'
import { getDossierPlayerKey } from './teamDossierScenes.js'
import TeamExhibitionPoster from './TeamExhibitionPoster.jsx'
import TeamMemberRecordDrawer from './TeamMemberRecordDrawer.jsx'
import styles from './TeamGalleryScenes.module.css'

function StaffCredit({ people, en }) {
  const uiLocale = useUiLocale()
  const identities = (people || []).map(normalizeStaffIdentity).filter(person => person.name || person.battleTag)
  return <dd>{identities.length ? identities.map((person, index) => <span className={styles.staffIdentity} key={`${person.battleTag || person.name}-${index}`}>
    {person.name || person.battleTag}{person.battleTag && person.battleTag !== person.name ? <small>{person.battleTag}</small> : null}
  </span>) : (en ? 'Unlisted' : uiText("未登记", uiLocale))}</dd>
}

// 票 2.42: the 展厅 tells the team's story — cover, people, 这一季 (children), staff — and hands
// results and analysis to the 数据 page.
export default function TeamGalleryScenes({ team, seasonId, locale, roster, rows, advanceState, research, memberId, onMemberChange, analysisHref, ledgerHref, withSeason, returnState, viewState, onLeave, children }) {
  const en = locale === 'en-US'
  const [recordMemberId, setRecordMemberId] = useState(null)
  const selected = roster.find(player => getDossierPlayerKey(player) === memberId) || roster[0]
  const selectedId = selected ? getDossierPlayerKey(selected) : ''
  const { members, cohort } = research.appearances
  const recordPlayer = roster.find(player => getDossierPlayerKey(player) === recordMemberId)
  const actualRows = rows.filter(row => row.decided && !row.bye && !row.administrative)
  const dates = actualRows.length ? [actualRows[0], actualRows.at(-1)].map(row => row.timeLabel.split(' ')[0]) : []
  const openRecord = id => { onMemberChange(id); setRecordMemberId(id) }

  return <>
    <TeamExhibitionPoster key={team.routeId + seasonId} team={team} seasonId={seasonId} locale={locale} roster={roster} cohort={cohort} appeared={members.filter(member => member.maps > 0).length} dates={dates} advanceState={advanceState} members={members} selectedId={selectedId} onSelect={onMemberChange} onOpenMember={openRecord} onCredits={() => { const target = document.getElementById('team-credits'); target?.focus({ preventScroll: true }); target?.scrollIntoView({ block: 'start', behavior: 'instant' }) }} />
    {recordPlayer ? <TeamMemberRecordDrawer player={recordPlayer} member={members.find(member => member.playerId === recordMemberId)} team={team} locale={locale} withSeason={withSeason} returnState={returnState} onLeave={onLeave} onClose={() => setRecordMemberId(null)} /> : null}
    {children}
    <section className={styles.credits} id="team-credits" tabIndex={-1} aria-label={en ? 'Behind the team' : uiText("幕后署名", locale)}>
      <div><span data-deco-en>BEHIND THE TEAM</span><h2>{en ? 'Managers and coaches' : uiText("经理与教练", locale)}</h2></div>
      <dl><div><dt>{en ? 'COACH' : uiText("教练", locale)}</dt><StaffCredit people={team.staff?.coaches} en={en} /></div><div><dt>{en ? 'MANAGER' : uiText("经理", locale)}</dt><StaffCredit people={team.staff?.managers} en={en} /></div></dl>
    </section>
    <nav className={styles.next} aria-label={pickUiLocale(locale, '前往队伍数据', 'Go to team data', '팀 데이터로 이동', '前往隊伍數據')}>
      <Link to={ledgerHref} state={viewState}><span>{pickUiLocale(locale, '队伍数据 · 赛程赛果', 'Team data · Results', '팀 데이터 · 일정과 결과', '隊伍數據 · 賽程賽果')}</span><b>{pickUiLocale(locale, '查看全部比赛记录', 'View every match', '모든 경기 기록 보기', '查看全部比賽記錄')}</b><i aria-hidden="true">↗</i></Link>
      <Link to={analysisHref} state={viewState}><span>{pickUiLocale(locale, '队伍数据 · 竞技分析', 'Team data · Analysis', '팀 데이터 · 경기력 분석', '隊伍數據 · 競技分析')}</span><b>{pickUiLocale(locale, '查看数据分析', 'View performance analysis', '데이터 분석 보기', '查看數據分析')}</b><i aria-hidden="true">↗</i></Link>
    </nav>
  </>
}
