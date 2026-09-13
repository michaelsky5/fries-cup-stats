import { translateUiText as uiText } from '../../../lib/uiText.js'
import { useUiLocale } from '../../../hooks/useUiLocale.js'
import { Link } from 'react-router-dom'
import { weeklyCycleTitle, weeklyWeekTitle } from '../../../features/weekly-overview/weeklyPresentation.js'
import styles from './SignalMatchPhase.module.css'

const staffRoles = { CASTER: ['解说', 'Casters'], REFEREE: ['赛管', 'Officials'], VOICE_REFEREE: ['语音赛管', 'Voice officials'], DIRECTOR: ['导播', 'Director'], OB: ['OB', 'Observers'] }

export function SignalMatchPhaseProgress({ phase, onSelectMap, en }) {
  const uiLocale = useUiLocale()
  if (!phase.slots.length) return null
  return <div className={styles.progress} data-match-phase-progress>
    <div className={styles.progressHeading}><strong>{phase.rr5 ? (en ? 'Five-map series' : uiText("五局进程", uiLocale)) : (en ? 'Map schedule' : uiText("地图安排", uiLocale))}</strong><span>{['live', 'review'].includes(phase.key) ? (en ? 'Series score after each map' : uiText("各局结束后的大比分", uiLocale)) : phase.rr5 ? (en ? 'RR5 · All five maps are played' : uiText("RR5 · 无论比分，都打满五局", uiLocale)) : (en ? 'Published map order' : uiText("按已公布顺序", uiLocale))}{['live', 'review'].includes(phase.key) ? <b>{en ? 'Recorded' : uiText("已记录", uiLocale)} {phase.recordedCount} / {phase.slots.length}</b> : null}</span></div>
    <ol className={styles.slots} style={{ '--phase-map-count': phase.slots.length }}>
      {phase.slots.map(slot => {
        const content = <><span className={styles.slotTop}><small>{String(slot.order).padStart(2, '0')}</small><strong>{slot.name}</strong></span><span className={styles.slotResult}>{slot.record ? <b>{slot.record.cumulative.replace(':', ' : ')}</b> : <i aria-hidden="true">{slot.state === 'live' ? '●' : '—'}</i>}<span>{slot.label}</span></span></>
        return <li key={slot.order} data-map-state={slot.state}>{slot.record ? <button type="button" onClick={() => onSelectMap(slot.order)} aria-label={`${en ? 'Review map' : uiText("查看第", uiLocale)} ${slot.order}${en ? '' : uiText(" 图", uiLocale)} · ${slot.name} · ${slot.label}`}>{content}<span className={styles.slotArrow} aria-hidden="true">↘</span></button> : <div>{content}</div>}</li>
      })}
    </ol>
  </div>
}

export function SignalMatchPreparation({ dossier, phase, weeklyPeriod, locale, withSeason, roomPath, roster, hasRoster }) {
  const en = String(locale).startsWith('en')
  const t = (zh, english) => en ? english : zh
  const groups = dossier.broadcast?.staffGroups || []
  const primaryStream = phase.liveStreams[0]
  const cycleQuery = weeklyPeriod ? `cycle=${encodeURIComponent(weeklyPeriod.cycle.id)}&week=${encodeURIComponent(weeklyPeriod.week.id)}` : ''
  const isClosed = phase.key === 'cancelled'
  return <section className={styles.preparation} id="match-resources" data-match-section="resources" data-match-preparation aria-labelledby="match-resources-title">
    <header className={styles.heading}><h2 id="match-resources-title">{t(uiText("比赛安排", locale), 'Match information')}</h2><span>{weeklyPeriod ? `${weeklyCycleTitle(weeklyPeriod.cycle, locale)} · ${weeklyWeekTitle(weeklyPeriod.week, locale)}` : t(uiText("以赛事公布内容为准", locale), 'Published match information')}</span></header>
    {dossier.statusNote ? <p className={styles.note}>{dossier.statusNote}</p> : null}
    <div className={styles.grid}>
      <div className={styles.publicInfo}>
        <div className={styles.broadcast}>
          <div><span className={styles.eyebrow}>BROADCAST</span><h3>{isClosed ? t(uiText("本场已取消", locale), 'Match cancelled') : primaryStream ? t(uiText("跟着直播，看完这一场。", locale), 'Follow the match live.') : t(uiText("直播信息待公布", locale), 'Broadcast information pending')}</h3>{!primaryStream && !isClosed ? <p>{t(uiText("有已公布的直播地址时，会在这里提供入口。", locale), 'A broadcast link will appear here when published.')}</p> : null}</div>
          {primaryStream ? <a className={styles.watch} href={primaryStream.url} target="_blank" rel="noreferrer">{phase.key === 'live' ? t(uiText("观看直播", locale), 'Watch live') : t(uiText("打开直播间", locale), 'Open stream')} <span aria-hidden="true">↗</span></a> : null}
        </div>
        {phase.liveStreams.length > 1 ? <div className={styles.extraStreams}>{phase.liveStreams.slice(1).map((link, index) => <a key={link.url} href={link.url} target="_blank" rel="noreferrer">{link.staff?.name || t(uiText("直播间 {0}", locale, [index + 2]), `Stream ${index + 2}`)} ↗</a>)}</div> : null}
        <div className={styles.staff}>{groups.length ? groups.map(group => <div key={group.role}><span>{staffRoles[group.role]?.[en ? 1 : 0] || group.role}</span><p>{group.people.map(person => <b key={`${person.name}:${person.battleTag}`}>{person.name}</b>)}</p></div>) : <p className={styles.staffEmpty}>{t(uiText("赛管、解说等工作人员信息尚未提供。", locale), 'Officials, casters and other staff have not been listed yet.')}</p>}</div>
      </div>
      <aside className={styles.participants}>
        <span className={styles.eyebrow}>PARTICIPANTS</span><h3>{t(uiText("选手与工作人员", locale), 'Players & match staff')}</h3><p>{t(uiText("从比赛房间查看本场参赛与执行安排。", locale), 'Open the match room for participation and match operations.')}</p>
        <Link className={styles.room} to={roomPath}>{t(uiText("进入比赛房间", locale), 'Open match room')} <span aria-hidden="true">↗</span></Link>
        {weeklyPeriod ? <div className={styles.periodLinks}><Link to={withSeason(`/matches?${cycleQuery}`)}>{t(uiText("本周赛程", locale), 'This week’s fixtures')} ↗</Link><Link to={withSeason(`/advance?${cycleQuery}`)}>{t(uiText("周期积分", locale), 'Cycle standings')} ↗</Link></div> : null}
      </aside>
    </div>
    {hasRoster ? <details className={styles.roster}><summary><strong>{t(uiText("双方登记名单", locale), 'Registered team rosters')}</strong><span>{t(uiText("实际出场以比赛记录为准", locale), 'Match records confirm who played')}</span><i aria-hidden="true">＋</i></summary>{roster}</details> : null}
  </section>
}
