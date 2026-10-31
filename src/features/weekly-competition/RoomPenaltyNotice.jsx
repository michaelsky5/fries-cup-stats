import { useUiLocale } from '../../hooks/useUiLocale.js'
import { translateUiText as uiText } from '../../lib/uiText.js'
import { formatOwMapName } from '../../lib/heroes.js'
import { roomPenaltyPresentation } from './roomPenaltyNotice.js'
import styles from './RoomPhaseClock.module.css'

export default function RoomPenaltyNotice({ event, data, onClose, onRules }) {
  const locale = useUiLocale(), t = (key, values) => uiText(key, locale, values)
  const { historical, message } = roomPenaltyPresentation(event, data)
  return <section className={styles.penaltyNotice} data-room-penalty={event.outcome} data-room-penalty-history={historical}>
    <strong>{t('第 {0} 图', [event.mapOrder])} · {t(({ MAP: '选择地图', LINEUP: '首发确认', BAN_ORDER: '禁用顺序', BAN: '英雄禁用' })[event.kind])}</strong>
    {event.count && <p>{t('本队本场第 {0} 次流程超时', [event.count])}</p>}
    <p>{t(message)}</p>
    {historical && <p>{t('此为已记录的处理结果，当前操作请以比赛房最新状态为准。')}</p>}
    {event.mapName && <p>{formatOwMapName(event.mapName, locale)}{event.attackFirstSide && ` · ${t('先攻')}: ${event.attackFirstSide}`}</p>}
    <div><button type="button" onClick={onRules}>{t('查看规则与记录')}</button><button type="button" autoFocus onClick={onClose}>{t('知道了，继续操作')}</button></div>
  </section>
}
