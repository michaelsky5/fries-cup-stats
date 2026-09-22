import { translateUiText as uiText } from '../../lib/uiText.js'
import { Link } from 'react-router-dom'
import styles from './WeeklyConfirmationCard.module.css'

export default function WeeklyConfirmationCard({ preparation, seasonId, locale, withSeason = value => value }) {
  const t = (text, values) => uiText(text, locale, values)
  const hasWeek = Boolean(preparation?.week_id)
  const deadline = Date.parse(preparation?.closes_at)
  const opensAt = Date.parse(preparation?.opens_at)
  const closed = Number.isFinite(deadline) && deadline <= Date.now()
  const upcoming = Number.isFinite(opensAt) && opensAt > Date.now()
  const date = Number.isFinite(deadline) ? new Intl.DateTimeFormat(locale || 'zh-CN', { timeZone: 'Asia/Shanghai', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(deadline) : ''
  return <section className={styles.card} data-i18n-ignore aria-label={t('报名与参赛')}>
    <div className={styles.actions}>
      <div className={styles.entry}>
        <span className={styles.step}>01 / {t('本赛季报名')}</span>
        <Link to={withSeason(`/participate/${encodeURIComponent(seasonId)}`)}>{t('首次报名 / 继续报名')} <span aria-hidden="true">↗</span></Link>
        <p>{t('创建队伍或继续已保存的报名。首次创建需要负责人邀请，请联系赛事负责人获取链接。')}</p>
      </div>
      <div className={styles.entry}>
        <span className={styles.step}>02 / {t('每周参赛确认')}</span>
        <Link to={withSeason(`/me?section=team&competition=${encodeURIComponent(seasonId)}`)}>{t('本周参赛确认')} <span aria-hidden="true">↗</span></Link>
        <p>{t('已通过报名的队伍，由队长或经理确认当周参赛并提交出赛名单。')}</p>
      </div>
    </div>
    <div className={styles.window}>
      {hasWeek && <strong>{t('第 {0} 周', [preparation.week_number])} · {t(closed ? '确认已截止' : upcoming ? '确认尚未开始' : '参赛确认中')}</strong>}
      {hasWeek && <span>{date ? `${t('参赛确认截止')}：${date} UTC+8` : t('确认截止时间待公布。')}</span>}
      <span>{t('确认窗口与截止时间以参赛页面为准。')}</span>
    </div>
  </section>
}
