import { translateUiText as uiText } from '../../lib/uiText.js'
import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { competitionSwitchSearch } from './accountCompetitionModel.js'
import { resolvePastedInvitation } from './accountInvitationEntry.js'
import styles from './AccountCompetitionEntry.module.css'

export default function AccountCompetitionEntry({ competition, locale, withSeason }) {
  const en = locale === 'en-US'
  const navigate = useNavigate()
  const { search } = useLocation()
  const { competitions, issue, loading, error } = competition
  const [invitation, setInvitation] = useState('')
  const [invitationError, setInvitationError] = useState('')
  const empty = !loading && !error && issue === 'EMPTY'
  const unavailable = ['INVALID', 'UNAVAILABLE'].includes(issue)
  const title = error ? en ? 'Your events could not be loaded' : uiText("参赛赛事暂时未能载入", locale)
    : loading ? en ? 'Finding your events…' : uiText("正在读取参赛赛事…", locale)
      : empty ? en ? 'You have no linked events yet' : uiText("你还没有关联参赛赛事", locale)
        : unavailable ? en ? 'This event is unavailable to this account' : uiText("当前账号无法进入这项赛事", locale)
          : en ? 'Choose your event' : uiText("选择要进入的赛事", locale)
  const description = error ? en ? 'Your team links could not be checked. Retry below; your account and following are still available.' : uiText("暂时无法核对队伍关系。可以重新读取，账号设置和我的关注仍可使用。", locale)
    : loading ? en ? 'Checking the teams linked to this account.' : uiText("正在核对这个账号的队伍关系，请稍候。", locale)
      : empty ? en ? 'Accept your invitation to bring your team, weekly preparation and matches into this space.' : uiText("认领邀请后，你的队伍、每周参赛准备和比赛会汇集在这里。", locale)
        : unavailable ? en ? 'This link may belong to another account. Select a linked event below or check your invitation.' : uiText("这个链接可能属于其他账号。可选择下方已关联赛事，或核对收到的邀请。", locale)
          : en ? 'Each event keeps its own tasks, team rosters and match records.' : uiText("每项赛事分别保存待办、名单和比赛记录。", locale)
  function openInvitation(event) {
    event.preventDefault()
    const target = resolvePastedInvitation(invitation, window.location.origin)
    if (!target) { setInvitationError(en ? 'Paste the complete invitation link, including its token.' : uiText("请粘贴完整的账号邀请链接，保留链接末尾的邀请凭证。", locale)); return }
    setInvitation('')
    navigate(target)
  }
  return <section className={styles.entry} aria-busy={loading} data-i18n-ignore>
    <header className={styles.status}>
      <div><span>{en ? 'PARTICIPATION' : uiText("我的参赛", locale)}</span><h2>{title}</h2><p role={error || unavailable ? 'alert' : 'status'}>{description}</p></div>
      {!loading && <button type="button" onClick={() => competition.refresh().catch(() => {})}>{en ? 'Refresh events' : uiText("重新读取赛事", locale)} <span aria-hidden="true">↻</span></button>}
    </header>
    {!loading && !error && Boolean(competitions?.length) && <nav className={styles.choices} aria-label={en ? 'Your competitions' : uiText("你的参赛赛事", locale)}>{competitions.map(item => <Link key={item.id} to={`/me?${competitionSwitchSearch(search, item.id)}`}><div><small>{item.competitionKind === 'WEEKLY' ? en ? 'Weekly tournament' : uiText("周赛", locale) : en ? 'Tournament' : uiText("赛事", locale)} · {item.status === 'ARCHIVED' ? en ? 'Archived' : uiText("已归档", locale) : en ? 'Ongoing' : uiText("进行中", locale)}</small><strong>{item.name}</strong><span>{item.teams.length ? item.teams.map(team => team.shortName || team.name).join(' / ') : (item.registrations || []).map(record => record.name).join(' / ')}</span></div><b aria-hidden="true">→</b></Link>)}</nav>}
    {!loading && <div className={styles.grid}>
      <section className={styles.join} aria-labelledby="join-event-title">
        <span className={styles.eyebrow}>JOIN YOUR TEAM</span>
        <h3 id="join-event-title">{en ? 'Have a team invitation?' : uiText("已经收到队伍邀请？", locale)}</h3>
        <p>{en ? 'Open it here to confirm the invited account and team. You can review everything before accepting.' : uiText("在这里打开邀请，先核对受邀账号和队伍，再完成认领。", locale)}</p>
        <form onSubmit={openInvitation}>
          <label htmlFor="space-invitation">{en ? 'Account invitation link' : uiText("账号邀请链接", locale)}</label>
          <div><input id="space-invitation" value={invitation} onChange={event => { setInvitation(event.target.value); setInvitationError('') }} placeholder={en ? 'Paste the complete invitation link' : uiText("粘贴收到的完整邀请链接", locale)} autoComplete="off" spellCheck={false} required aria-invalid={Boolean(invitationError)} aria-describedby={invitationError ? 'space-invitation-error' : undefined} /><button type="submit">{en ? 'Review invitation' : uiText("核对邀请", locale)} <span aria-hidden="true">→</span></button></div>
          {invitationError && <p id="space-invitation-error" className={styles.error} role="alert">{invitationError}</p>}
        </form>
        <details><summary>{en ? 'Already joined, but no team is shown?' : uiText("已经参加过，为什么看不到队伍？", locale)}</summary><p>{en ? 'Check that you signed in with the email used for the invitation. Team links belong to that account; an organizer account does not automatically join a team.' : uiText("请核对当前登录账号是否为邀请中的邮箱。队伍关系属于受邀账号；赛管账号不会自动成为参赛队员。", locale)}</p><Link to={withSeason('/account')}>{en ? 'Check my account' : uiText("查看当前账号资料", locale)} ↗</Link></details>
      </section>
      <aside className={styles.personal} aria-label={en ? 'Available now' : uiText("现在就可以使用", locale)}>
        <header><span>YOUR SPACE</span><h3>{en ? 'Make this space yours' : uiText("先从你关心的比赛开始", locale)}</h3></header>
        <Link to={withSeason('/me?section=following')}><span className={styles.symbol} aria-hidden="true">☆</span><div><strong>{en ? 'My Following' : uiText("我的关注", locale)}</strong><p>{en ? 'Follow teams and players to collect their schedules and results.' : uiText("关注队伍与选手，把相关赛程和赛果收在一起。", locale)}</p></div><b aria-hidden="true">↗</b></Link>
        <Link to={withSeason('/account')}><span className={styles.symbol} aria-hidden="true">◎</span><div><strong>{en ? 'Account settings' : uiText("账号设置", locale)}</strong><p>{en ? 'Manage your profile, password, email and signed-in devices.' : uiText("管理资料、密码、邮箱验证和登录设备。", locale)}</p></div><b aria-hidden="true">↗</b></Link>
      </aside>
    </div>}
    {empty && <section className={styles.journey} aria-label={en ? 'Your participation route' : uiText("参赛流程", locale)}><header><span>{en ? 'AFTER JOINING' : uiText("认领之后，在网页里继续", locale)}</span><p>{en ? 'Each step shows who acts next and its current status.' : uiText("每一步都有当前状态和下一步入口。", locale)}</p></header><ol>{[
      [en ? 'Link your identity' : uiText("认领参赛身份", locale), en ? 'Confirm your account and team' : uiText("核对账号与所属队伍", locale)],
      [en ? 'Prepare for the week' : uiText("完成当周准备", locale), en ? 'Confirm participation and the roster' : uiText("确认参赛，提交出赛名单", locale)],
      [en ? 'Enter your match' : uiText("进入本场比赛", locale), en ? 'Check the room and confirm readiness' : uiText("核对安排，确认准备状态", locale)],
      [en ? 'Follow up on results' : uiText("跟进赛果与问题", locale), en ? 'Confirm the result or track a response' : uiText("核对赛果，查看站内处理记录", locale)]
    ].map(([label, detail], index) => <li key={label}><span aria-hidden="true">0{index + 1}</span><div><strong>{label}</strong><p>{detail}</p></div></li>)}</ol></section>}
  </section>
}
