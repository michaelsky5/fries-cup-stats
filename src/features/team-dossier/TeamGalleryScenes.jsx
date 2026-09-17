import { translateUiText as uiText } from '../../lib/uiText.js'
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

export default function TeamGalleryScenes({ team, seasonId, locale, roster, rows, advanceState, research, memberId, onMemberChange, journeyHref, analysisHref, withSeason, returnState, viewState, onLeave, favorited, favoriteDisabled, onToggleFavorite }) {
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
    {recordPlayer ? <TeamMemberRecordDrawer player={recordPlayer} member={members.find(member => member.playerId === recordMemberId)} team={team} locale={locale} journeyHref={journeyHref} withSeason={withSeason} returnState={returnState} viewState={viewState} onLeave={onLeave} onClose={() => setRecordMemberId(null)} /> : null}
    <section className={styles.credits} id="team-credits" tabIndex={-1} aria-label={en ? 'Behind the team' : uiText("幕后署名", locale)}>
      <div><span>BEHIND THE TEAM</span><h2>{en ? <>A team takes<br />more than five.</> : <>{uiText("场上五人。", locale)}<br />{uiText("身后，还有他们。", locale)}</>}</h2></div>
      <dl><div><dt>{en ? 'COACH' : uiText("教练", locale)}</dt><StaffCredit people={team.staff?.coaches} en={en} /></div><div><dt>{en ? 'MANAGER' : uiText("经理", locale)}</dt><StaffCredit people={team.staff?.managers} en={en} /></div></dl>
      <button type="button" aria-pressed={favorited} disabled={favoriteDisabled} onClick={onToggleFavorite}>{favorited ? (en ? 'Following' : uiText("已关注队伍", locale)) : (en ? 'Follow team' : uiText("关注这支队伍", locale))}<span aria-hidden="true">{favorited ? '✓' : '+'}</span></button>
    </section>
    <nav className={styles.next} aria-label={en ? 'Continue exploring the team' : uiText("继续了解这支队伍", locale)}>
      <Link to={journeyHref} state={viewState}><span>02 / {en ? 'SEASON JOURNEY' : uiText("赛季征程", locale)}</span><b>{en ? 'Follow the turning points.' : uiText("沿着转折，回到这一季。", locale)}</b><i aria-hidden="true">↗</i></Link>
      <Link to={analysisHref} state={viewState}><span>03 / {en ? 'COMPETITIVE ANALYSIS' : uiText("竞技分析", locale)}</span><b>{en ? 'Understand their performance.' : uiText("看表现，也看长板与短板。", locale)}</b><i aria-hidden="true">↗</i></Link>
    </nav>
  </>
}
