import { Link } from 'react-router-dom'
import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import styles from '../account-ui/SignalWeeklyTeam.module.css'

export default function WeeklyRosterReview({ players, ids, previousIds, firstAppearance, check, status, writable, dirty, busy, editHref, onSubmit }) {
  const locale = useUiLocale()
  const previous = new Set(previousIds)
  const selected = new Set(ids)
  const added = ids.filter(id => !previous.has(id))
  const removed = previousIds.filter(id => !selected.has(id))
  const label = id => {
    const player = players.find(item => item.id === id)
    return player ? `${player.nickname || player.displayName} · ${player.battleTag || ''}` : uiText('历史名单选手（已不在当前阵容）', locale)
  }
  return <>
    <p>{uiText('核对下面的完整名单后正式提交。保存调整只会保存草稿，不代表已提交。', locale)}</p>
    <div className={styles.reviewRoster}>
      <section><h4>{uiText('本周完整名单', locale)} · {ids.length}</h4>{ids.length ? <ol>{ids.map(id => <li key={id}>{label(id)}</li>)}</ol> : <p>{uiText('请先调整并保存本周出赛人选。', locale)}</p>}</section>
      <section><h4>{firstAppearance ? uiText('首次参赛名单', locale) : uiText('与最近一次参赛比较', locale)}</h4>
        <p>{uiText('新增出赛', locale)}：{added.length ? added.map(label).join('、') : uiText('无', locale)}</p>
        {!firstAppearance && <p>{uiText('本周不出赛', locale)}：{removed.length ? removed.map(label).join('、') : uiText('无', locale)}</p>}
        <p>{uiText('移出本周名单不会删除选手档案或历史战绩。', locale)}</p>
      </section>
    </div>
    <div role="status" className={styles.reviewCheck}>
      {check.errors.map(message => <p key={message}>{uiText(message, locale)}</p>)}
      {check.canSubmit && <p>{uiText('✓ 人数与继承规则符合要求', locale)}</p>}
      {status === 'LOCKED' ? <p>{uiText('管理员已锁定，正式出赛名单已确认。', locale)}</p> : status === 'SUBMITTED' && !dirty ? <p>{uiText('已提交给周赛管理员，等待锁定，无需重复提交。', locale)}</p> : null}
    </div>
    <div className={styles.reviewActions}>
      <Link to={editHref}>{uiText(status === 'LOCKED' ? '查看人员名单' : '返回调整人员', locale)}</Link>
      {writable && <button type="button" className={styles.primaryButton} disabled={busy || dirty || !check.canSubmit || status === 'SUBMITTED'} onClick={onSubmit}>{uiText(busy ? '保存中…' : status === 'SUBMITTED' ? '已提交 · 等待管理员' : '确认并提交名单', locale)}</button>}
    </div>
  </>
}
