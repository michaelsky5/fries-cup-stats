import { translateUiText as uiText } from '../../lib/uiText.js'
import { useMemo } from 'react'
import HeroArtwork from '../../components/media/HeroArtwork.jsx'
import MissingHeroPortrait from '../../components/media/MissingHeroPortrait.jsx'
import { getRosterRoleLabel } from '../../lib/rosterSelectors.js'
import { getDossierPlayerHero, getDossierPlayerKey, getDossierPlayerName } from './teamDossierScenes.js'
import { getMemberConnections } from './teamDossierResearch.js'
import { ArchiveCrest } from './TeamArchiveNavigation.jsx'
import useExhibitionScene from './useExhibitionScene.js'
import ExhibitionWordmark from './ExhibitionWordmark.jsx'
import styles from './TeamExhibitionPoster.module.css'

function Portrait({ player, member, locale, priority = false }) {
  const hero = member?.maps ? getDossierPlayerHero(player) : null
  return hero ? <HeroArtwork hero={hero} variant="spotlight" decorative priority={priority} locale={locale} /> : <MissingHeroPortrait locale={locale} />
}

export default function TeamExhibitionPoster({
  team, seasonId, locale, roster, cohort, appeared, dates, advanceState,
  members, selectedId, onSelect, onOpenMember, onCredits
}) {
  const en = locale === 'en-US'
  const { rootRef, stageRef, identityRef, peopleRef, animated, pinned, reduced, chapter, moveTo, toggleMotion } = useExhibitionScene()
  const memberById = useMemo(() => new Map(members.map(member => [member.playerId, member])), [members])
  const selected = roster.find(player => getDossierPlayerKey(player) === selectedId) || roster[0]
  const id = selected ? getDossierPlayerKey(selected) : ''
  const member = memberById.get(id)
  const connections = getMemberConnections(member, members).slice(0, 4)
  const supporting = connections.slice(0, 2).map(connection => roster.find(player => getDossierPlayerKey(player) === connection.playerId)).filter(Boolean)
  const year = seasonId.match(/20\d{2}/)?.[0] || (seasonId.match(/(\d{2})$/)?.[1] ? '20' + seasonId.slice(-2) : '')
  const ordinal = String(Math.max(0, roster.indexOf(selected)) + 1).padStart(2, '0')
  const tilt = event => {
    if (!animated || event.pointerType !== 'mouse') return
    const box = event.currentTarget.getBoundingClientRect()
    event.currentTarget.style.setProperty('--pointer-x', ((event.clientX - box.left) / box.width - .5).toFixed(3))
    event.currentTarget.style.setProperty('--pointer-y', ((event.clientY - box.top) / box.height - .5).toFixed(3))
  }
  const resetTilt = event => { event.currentTarget.style.setProperty('--pointer-x', 0); event.currentTarget.style.setProperty('--pointer-y', 0) }

  return <><section ref={rootRef} className={styles.exhibition} data-gallery-cover data-motion={animated} data-pinned={pinned} data-scene={chapter} aria-label={en ? 'Team exhibition' : uiText("队伍展厅", locale)}>
    <div ref={stageRef} className={styles.stage}>
      <div className={styles.sceneMast}>
        <span><i aria-hidden="true" /> {seasonId} <b>/</b> {en ? 'A TEAM, A SEASON.' : uiText("一支队伍，一段赛季。", locale)}</span>
        <button type="button" className={styles.motionControl} onClick={toggleMotion} disabled={reduced} aria-pressed={animated} title={reduced ? (en ? 'Following system reduced motion' : uiText("已遵循系统的减少动效设置", locale)) : undefined}>{en ? 'Motion' : uiText("动效", locale)} {animated ? 'ON' : 'OFF'} <span aria-hidden="true">{animated ? 'Ⅱ' : '▷'}</span></button>
      </div>

      <div className={styles.arrival} inert={pinned && chapter === 1 ? true : undefined}>
        <div className={styles.identity} ref={identityRef} tabIndex={-1}>
          <p className={styles.eyebrow}>FRIES CUP / {en ? 'SEASON COLLECTION' : uiText("队伍赛季珍藏", locale)}</p>
          <ExhibitionWordmark name={team.shortName} />
          <p className={styles.fullName}>{team.fullName || team.shortName}</p>
          <div className={styles.invitation}>
            <h2>{en ? <>A name.<br />A season of their own.</> : <>{uiText("让这些名字，", locale)}<br />{uiText("拥有自己的主场。", locale)}</>}</h2>
            <button type="button" className={styles.enter} onClick={() => moveTo(1)}>{en ? 'Meet the team' : uiText("走近这支队伍", locale)}<span aria-hidden="true">↘</span></button>
          </div>
        </div>
        <div className={styles.artifactStage} onPointerMove={tilt} onPointerLeave={resetTilt}>
          <span className={styles.orbit} aria-hidden="true" />
          <span className={styles.artifactShadow} aria-hidden="true" />
          <div className={styles.credential}>
            <span className={styles.credentialEdge} aria-hidden="true" />
            <div className={styles.credentialFace}>
              <div className={styles.credentialTop}><span>FRIES CUP</span><b>{seasonId}</b></div>
              <span className={styles.credentialRail} aria-hidden="true">THE NAMES THAT MAKE A TEAM</span>
              <div className={styles.crestPrint}><ArchiveCrest key={team.routeId} team={team} seasonId={seasonId} className={styles.largeCrest} /><span>{en ? 'TEAM EMBLEM' : uiText("队伍徽记", locale)}</span></div>
              <div className={styles.credentialName}><strong>{team.shortName}</strong><span>{team.fullName || team.shortName}</span></div>
              <div className={styles.credentialFoot}><span>{en ? 'SEASON EDITION' : uiText("赛季档案", locale)}</span><b>{year || seasonId}</b></div>
            </div>
            <div className={styles.resultSlip}><span>{advanceState.heading}</span><strong>{advanceState.label}</strong><i aria-hidden="true">↗</i></div>
          </div>
          <div className={styles.objectAnnotation}><span aria-hidden="true">└</span><p>{en ? 'Their badge. Their season.' : uiText("队徽之下，是一起走过的赛季。", locale)}<small>{dates.length ? dates.join(' — ') : en ? 'Registered roster' : uiText("注册名单已留档", locale)}</small></p></div>
        </div>
        <div className={styles.arrivalFoot}>
          <span><b>{String(roster.length).padStart(2, '0')}</b>{en ? 'names on the roster' : uiText("个名字，共同署名", locale)}</span>
          <p>{en ? 'Players, coaches and the people behind the team.' : uiText("队员、教练与经理，共同留下这一季。", locale)}</p>
          <button type="button" onClick={() => moveTo(1)}>{en ? 'UNFOLD THE ROSTER' : uiText("向下，展开人物", locale)} <span aria-hidden="true">↓</span></button>
        </div>
      </div>

      <div className={styles.people} inert={pinned && chapter === 0 ? true : undefined}>
        <div className={styles.peopleIntro}>
          <p className={styles.eyebrow}>THE PEOPLE / {String(roster.length).padStart(2, '0')}</p>
          <h2 ref={peopleRef} tabIndex={-1}>{en ? <>Together.<br />{' '}On the map.</> : <>{uiText("一起。", locale)}<br />{uiText("上场。", locale)}</>}</h2>
          <p className={styles.chooseHint}>{en ? 'Choose a name to change the scene.' : uiText("选择一个名字，展开他的这一季。", locale)}</p>
          <div className={styles.memberIndex} role="group" aria-label={en ? 'Exhibition members' : uiText("展厅人物选择", locale)}>
            {roster.map((player, index) => {
              const key = getDossierPlayerKey(player)
              return <button type="button" key={key} onClick={() => onSelect(key)} aria-pressed={id === key} aria-controls="exhibition-member"><small>{String(index + 1).padStart(2, '0')}</small><b>{getDossierPlayerName(player)}</b><span>{getRosterRoleLabel(player.role, locale)}</span><i aria-hidden="true">{id === key ? '●' : '+'}</i></button>
            })}
          </div>
        </div>
        <div className={styles.posterArrangement}>
          <span className={styles.peopleBackprint} aria-hidden="true">{team.shortName}</span>
          {supporting.map((player, index) => <div key={getDossierPlayerKey(player)} className={styles.companionPoster} data-side={index} aria-hidden="true"><span>{getDossierPlayerName(player)}</span><Portrait player={player} member={memberById.get(getDossierPlayerKey(player))} locale={locale} /><small>{getRosterRoleLabel(player.role, locale)}</small></div>)}
          <div className={styles.memberPoster} id="exhibition-member" data-empty={!member?.maps || undefined}>
            <div className={styles.memberPosterTop}><span>{getRosterRoleLabel(selected?.role, locale) || (en ? 'ROSTER' : uiText("注册名单", locale))}</span><b>{seasonId} / {ordinal}</b></div>
            <div className={styles.memberPortrait} key={id}><Portrait player={selected} member={member} locale={locale} priority /><span className={styles.posterPrint} aria-hidden="true">{team.shortName}</span></div>
            <div className={styles.memberPosterName}><h3>{selected ? getDossierPlayerName(selected) : en ? 'To be announced' : uiText("等待名单", locale)}</h3><span>{member?.maps ? (en ? member.maps + ' maps · ' + member.series + ' series' : member.maps + ' 图出场 · ' + member.series + ' 场比赛') : en ? 'No published appearances' : uiText("尚无已发布的出场记录", locale)}</span></div>
            <button type="button" className={styles.openMember} onClick={() => onOpenMember(id)} disabled={!selected} aria-haspopup="dialog">{en ? 'Explore player records' : uiText("查看这位成员的记录", locale)}<span aria-hidden="true">↗</span></button>
          </div>
          <aside className={styles.connections}>
            <span className={styles.connectionTitle}>{en ? 'ON THE SAME MAP' : uiText("并肩出场", locale)}</span>
            {connections.length ? <><p>{en ? 'Shared map records' : uiText("与这些队友同场", locale)}<span aria-hidden="true">↙</span></p><ul>{connections.map(connection => <li key={connection.playerId}><b>{getDossierPlayerName(roster.find(player => getDossierPlayerKey(player) === connection.playerId))}</b><span>{connection.maps}<small>{en ? 'maps' : uiText("图", locale)}</small></span></li>)}</ul></> : <p>{en ? 'Shared appearances will be shown when records are published.' : uiText("共同出场关系，将随比赛记录一同留下。", locale)}</p>}
          </aside>
        </div>
        <div className={styles.peopleFoot}><p>{cohort ? (en ? 'Team record — most recorded five-player group: ' + cohort.records.length + ' maps together.' : '全队记录：共同出场最多的五人组合，留下 ' + cohort.records.length + ' 图记录。') : (en ? appeared + ' members have recorded appearances.' : appeared + ' 位成员留下了出场记录。')}<small>{en ? 'Hero art represents the player; it is not a player photograph or an official starting lineup.' : uiText("英雄为成员代表形象；出场记录不代表官方首发。", locale)}</small></p><button type="button" onClick={onCredits}>{en ? 'Behind the team' : uiText("看看幕后署名", locale)} <span aria-hidden="true">↓</span></button></div>
      </div>
      <nav className={styles.sceneSteps} aria-label={en ? 'Exhibition scenes' : uiText("展厅场景", locale)}><button type="button" onClick={() => moveTo(0)} aria-current={chapter === 0 ? 'step' : undefined}><i />01 {en ? 'Identity' : uiText("队伍身份", locale)}</button><button type="button" onClick={() => moveTo(1)} aria-current={chapter === 1 ? 'step' : undefined}><i />02 {en ? 'People' : uiText("人物群像", locale)}</button></nav>
    </div>
  </section>
  </>
}
