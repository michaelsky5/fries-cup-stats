import { translateUiText as uiText } from '../../lib/uiText.js'
import TeamLogo from '../../components/matches/TeamLogo.jsx'
import FollowingLink from './FollowingLink.jsx'
import { getFollowingBriefing } from './followingBriefingModel.js'
import { followingMatchPath, followingScore } from './followingMatchPresentation.js'
import FollowingMapProgress from './FollowingMapProgress.jsx'
import styles from './FollowingExperience.module.css'

const changes = { zh: { added: '新增关联记录', status: '状态变化', schedule: '比赛时间变化', score: '比分记录变化' }, en: { added: 'New linked record', status: 'Status changed', schedule: 'Time changed', score: 'Score record changed' } }
const titleOf = item => `${item.teamA.short} vs ${item.teamB.short}`
const labelOf = (item, en) => item?.presentation && !['complete', 'upcoming'].includes(item.presentation.state) ? item.presentation.label
  : item?.group === 'live' ? en ? 'Live now' : '正在进行' : item?.group === 'upcoming' ? en ? 'Up next' : '接下来关注' : en ? 'Latest result' : '最近赛果'

export default function FollowingBriefing({ feed, observation, locale, withSeason, seasonId, focusRef }) {
  const en = locale === 'en-US'
  const { lead: match, related, attention } = getFollowingBriefing(feed)
  const byId = new Map(feed.matches.map(item => [item.id, item]))
  const when = item => item.schedule.hasSchedule ? item.schedule.compact : en ? 'Time not published' : uiText("时间未公布", locale)
  const renderChange = update => {
    const item = byId.get(update.id)
    return item ? <FollowingLink key={update.id} to={withSeason(followingMatchPath(item))}><strong>{titleOf(item)}</strong><span>{update.kinds.map(kind => uiText(changes[en ? 'en' : 'zh'], locale)[kind]).join(' · ')} ↗</span></FollowingLink> : null
  }
  return <section ref={focusRef} tabIndex={-1} className={styles.briefing} data-single={!related.length} aria-label={en ? 'Following briefing' : uiText("关注近况", locale)}>
    <div className={styles.next} data-state={match?.group}>
      <header><span>{match ? labelOf(match, en) : en ? 'Following outlook' : uiText("关注近况", locale)}</span><small>{feed.archived ? feed.weekly ? en ? 'Cycle archive' : uiText("周期档案", locale) : en ? 'Season records' : uiText("赛季记录", locale) : en ? 'Times in Beijing time' : uiText("北京时间", locale)}</small></header>
      {match ? <><FollowingLink to={withSeason(followingMatchPath(match))}>
        <div className={styles.leadMeta}><time dateTime={match.schedule.hasSchedule ? match.scheduledAt : undefined}>{when(match)}</time><span>{match.stage}</span></div>
        <div className={styles.leadTeams}><div><TeamLogo team={match.teamA} seasonId={seasonId} className={styles.leadLogo} /><strong>{match.teamA.short}</strong></div><div className={styles.leadScore}><small>{match.presentation?.scoreLabel}</small><b>{followingScore(match)}</b></div><div><TeamLogo team={match.teamB} seasonId={seasonId} className={styles.leadLogo} /><strong>{match.teamB.short}</strong></div></div>
      </FollowingLink>
      <FollowingMapProgress item={match} locale={locale} withSeason={withSeason} />
      {match.presentation?.caption && <p className={styles.matchCaption}>{match.presentation.caption}</p>}
      <div className={styles.leadFoot}><span>{match.relations.map(reason => `${reason.name} · ${reason.type === 'team' ? en ? 'Following' : uiText("关注队伍", locale) : reason.type === 'appearance' ? en ? 'Recorded appearance' : uiText("正式出场", locale) : en ? 'Team schedule' : uiText("所属队伍赛程", locale)}`).join(' / ')}</span><FollowingLink to={withSeason(followingMatchPath(match))}>{en ? 'Match details' : uiText("查看比赛", locale)} ↗</FollowingLink></div></>
        : <p>{attention.length ? en ? 'Linked matches have schedule or record notices. Check the notices below.' : uiText("关联比赛有待补充或取消的记录，请查看下方提醒。", locale) : en ? 'Match records will appear when the event publishes them.' : uiText("赛事发布比赛记录后，会展示在这里。", locale)}</p>}
    </div>
    {related.length > 0 && <aside className={styles.related} aria-label={en ? 'Also following' : uiText("同时关注", locale)}>{related.map(item => <FollowingLink key={item.id} data-state={item.group} to={withSeason(followingMatchPath(item))}><span>{labelOf(item, en)} <i>{item.stage}</i></span><strong>{titleOf(item)}</strong><div><time dateTime={item.schedule.hasSchedule ? item.scheduledAt : undefined}>{when(item)}</time><b>{followingScore(item)} ↗</b></div></FollowingLink>)}</aside>}
    <div className={styles.updates} data-quiet={!observation.updates.length && !observation.olderSnapshot && !observation.storageError}>
      {observation.updates.length > 0 && <header><h2>{en ? 'Record changes' : uiText("关注记录变化", locale)} <b>{observation.updates.length}</b></h2><button type="button" onClick={observation.acknowledge}>{en ? 'Mark seen' : uiText("标为已看", locale)}</button></header>}
      {!observation.updates.length && !observation.olderSnapshot && !observation.storageError ? <details className={styles.quietUpdate}><summary>{en ? 'No unseen changes' : uiText("暂无未读变化", locale)}</summary><p>{en ? 'Compared with the records you last marked as seen in this browser. Your viewing record stays in this browser.' : uiText("与此浏览器上次标记的记录相比，查看记录仅保存在此浏览器。", locale)}</p></details> : <p>{observation.olderSnapshot ? en ? 'These records are older than your last check. Your viewing record is preserved.' : uiText("当前赛事记录早于上次查看，已保留你的查看记录。", locale) : observation.updates.length ? en ? 'Compared with the records you last marked as seen in this browser.' : uiText("与此浏览器上次标记的记录相比。", locale) : en ? 'No unseen record changes.' : uiText("暂无未读变化。", locale)}</p>}
      {observation.storageError && <p role="status">{en ? 'This browser could not save your viewing record. It is kept for this visit only.' : uiText("浏览器未能保存查看记录，本次访问内仍可使用。", locale)}</p>}
      {observation.updates.length > 0 && <div className={styles.changeList}>{observation.updates.slice(0, 4).map(renderChange)}{observation.updates.length > 4 && <details><summary>{en ? 'More changes' : uiText("其余变化", locale)} · {observation.updates.length - 4}</summary>{observation.updates.slice(4).map(renderChange)}</details>}</div>}
    </div>
    {attention.length > 0 && <details className={styles.attention}><summary>{en ? feed.archived ? 'Record notes' : 'Schedule notices' : feed.archived ? uiText("记录说明", locale) : uiText("赛程提醒", locale)} · {attention.length}</summary><div>{attention.map(item => <FollowingLink key={item.id} to={withSeason(followingMatchPath(item))}><strong>{titleOf(item)}</strong><span>{item.presentation?.label || (item.group === 'cancelled' ? en ? 'Cancelled' : uiText("已取消", locale) : en ? 'Schedule or record pending' : uiText("赛程或记录待补充", locale))} ↗</span></FollowingLink>)}</div></details>}
  </section>
}
