import { pickUiLocale, translateUiText as uiText } from '../../lib/uiText.js'
import { useId, useState } from 'react'
import { Link } from 'react-router-dom'
import styles from './WeeklyConfirmationCard.module.css'

export default function WeeklyConfirmationCard({ preparation, seasonId, locale, withSeason = value => value }) {
  const [expanded, setExpanded] = useState(false)
  const actionsId = useId()
  const t = (text, values) => uiText(text, locale, values)
  const hasWeek = Boolean(preparation?.week_id)
  const deadline = Date.parse(preparation?.closes_at)
  const opensAt = Date.parse(preparation?.opens_at)
  const closed = Number.isFinite(deadline) && deadline <= Date.now()
  const upcoming = Number.isFinite(opensAt) && opensAt > Date.now()
  const date = Number.isFinite(deadline) ? new Intl.DateTimeFormat(locale || 'zh-CN', { timeZone: 'Asia/Shanghai', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(deadline) : ''
  return <section className={styles.card} data-i18n-ignore data-expanded={expanded || undefined} aria-label={t('报名与参赛')}>
    <button type="button" className={styles.mobileToggle} aria-expanded={expanded} aria-controls={actionsId} onClick={() => setExpanded(value => !value)}><span>{t('报名与参赛')}</span><span aria-hidden="true">{expanded ? '−' : '+'}</span></button>
    <div className={styles.actions} id={actionsId}>
      <div className={styles.intro}><span>PLAY THIS WEEK</span><strong>{t('报名与参赛')}</strong></div>
      <Link className={styles.entry} to={withSeason(`/participate/${encodeURIComponent(seasonId)}`)}><span><small>01 / {t('本赛季报名')}</small><b>{t('首次报名 / 继续报名')}</b></span><span aria-hidden="true">↗</span></Link>
      <Link className={styles.entry} to={withSeason(`/me?section=team&competition=${encodeURIComponent(seasonId)}`)}><span><small>02 / {t('每周参赛确认')}</small><b>{t('本周参赛确认')}</b></span><span aria-hidden="true">↗</span></Link>
      <details className={styles.help}>
        <summary>{pickUiLocale(locale, '参赛说明', 'Entry guide', '참가 안내', '參賽說明')}</summary>
        <div className={styles.helpContent}>
          <p><b>{t('本赛季报名')}</b>{t('创建队伍或继续已保存的报名。首次创建需要负责人邀请，请联系赛事负责人获取链接。')}</p>
          <p><b>{t('每周参赛确认')}</b>{t('已通过报名的队伍，由队长或经理确认当周参赛并提交出赛名单。')}</p>
          <small>{t('确认窗口与截止时间以参赛页面为准。')}</small>
        </div>
      </details>
    </div>
    {hasWeek && <div className={styles.window}>
      <strong>{t('第 {0} 周', [preparation.week_number])} · {t(closed ? '确认已截止' : upcoming ? '确认尚未开始' : '参赛确认中')}</strong>
      <span>{date ? `${t('参赛确认截止')}：${date} UTC+8` : t('确认截止时间待公布。')}</span>
    </div>}
  </section>
}
