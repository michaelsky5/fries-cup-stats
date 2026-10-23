import { useUiLocale } from '../../hooks/useUiLocale.js'
import { translateUiText as uiText } from '../../lib/uiText.js'
import { formatOwMapName } from '../../lib/heroes.js'
import styles from './RoomPhaseClock.module.css'

export default function RoomPenaltyNotice({ event, onClose, onRules }) {
  const locale = useUiLocale(), t = (key, values) => uiText(key, locale, values)
  const message = event.outcome === 'RANDOM_MAP' ? '本图 Ban 权已取消，系统已随机选择地图。请按最新地图重新确认首发。'
    : event.kind === 'BAN' ? '本轮禁用已超时，系统已记录放弃本轮禁用权，不得补 Ban。'
    : event.kind === 'MAP' ? event.outcome === 'WARNING' ? '本次为超时警告。已追加 60 秒，请及时确认地图；本次补时不再追加补交宽限。' : '本图 Ban 权已取消。已追加 60 秒，请及时确认地图；本次补时不再追加补交宽限。'
    : event.outcome === 'WARNING' ? '本次为超时警告。请尽快完成当前环节。' : '本图 Ban 权已取消。请尽快完成当前环节，首发仍须由队伍确认。'
  return <section className={styles.penaltyNotice} data-room-penalty={event.outcome}>
    <strong>{t('第 {0} 图', [event.mapOrder])} · {t(({ MAP: '选择地图', LINEUP: '首发确认', BAN_ORDER: 'Ban 顺序', BAN: '英雄禁用' })[event.kind])}</strong>
    {event.count && <p>{t('本队本场第 {0} 次流程超时', [event.count])}</p>}
    <p>{t(message)}</p>
    {event.mapName && <p>{formatOwMapName(event.mapName, locale)}{event.attackFirstSide && ` · ${t('先攻')}: ${event.attackFirstSide}`}</p>}
    <div><button type="button" onClick={onRules}>{t('查看规则与记录')}</button><button type="button" autoFocus onClick={onClose}>{t('知道了，继续操作')}</button></div>
  </section>
}
