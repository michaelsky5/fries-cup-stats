import { Link } from 'react-router-dom'
import { translateUiText as uiText } from '../../lib/uiText.js'
import { eventCenterText } from '../../lib/eventCenterCopy.js'
import { formatOwMapName } from '../../lib/heroes.js'
import { getMapImage } from '../../lib/reviewAssets.js'
import { weeklyScore } from '../weekly-overview/weeklyOverviewModel.js'
import { weeklyTeamShort } from '../weekly-overview/weeklyPresentation.js'
import { getWeeklyScheduleMapSlots } from './weeklyScheduleModel.js'
import styles from './SignalWeeklySchedule.module.css'

const idOf = team => String(team?.id || team?.team_id || '')

export default function WeeklyMatchMaps({ match, locale, withSeason, returnProps, preview = false }) {
  const en = String(locale).startsWith('en')
  const t = (zh, english) => en ? english : uiText(zh, locale)
  const path = `/matches/${encodeURIComponent(match.id)}`
  const maps = getWeeklyScheduleMapSlots(match)
  const recorded = maps.filter(slot => ['recorded', 'ruling'].includes(slot.state)).length

  return <>
    <div className={styles.mapHeading}><span>{eventCenterText('mapResults', locale)}</span>{maps.length > 0 && <b>{recorded}<i> / {maps.length}</i></b>}</div>
    <ol className={styles.mapCells} aria-label={eventCenterText('mapResults', locale)}>
      {maps.map(({ order, map, state }) => {
        const winner = map?.winner === idOf(match.team_a) ? weeklyTeamShort(match.team_a) : map?.winner === idOf(match.team_b) ? weeklyTeamShort(match.team_b) : ''
        const result = state === 'ruling' ? t('判定', 'Ruling') : state === 'live' ? t('进行中', 'In play')
          : state === 'recorded' ? winner ? `${winner} · ${t('胜', 'wins')}` : t('已记录', 'Recorded')
            : state === 'unrecorded' ? t('暂无记录', 'No record') : eventCenterText('mapPending', locale)
        const mapName = formatOwMapName(map?.map_name, locale) || eventCenterText(state === 'unrecorded' ? 'mapUnrecorded' : 'mapTba', locale)
        const a = weeklyScore(map?.score_a)
        const b = weeklyScore(map?.score_b)
        const score = ['recorded', 'live'].includes(state) && a !== '—' && b !== '—' ? `${a} : ${b}` : ''
        const label = `${String(order).padStart(2, '0')} · ${mapName} · ${result}${preview && score ? ` · ${score}` : ''}`
        const content = <>
          <span className={styles.mapArt}>{map && <img src={getMapImage(map.map_type, map.map_name)} alt="" loading="lazy" />}<span>{String(order).padStart(2, '0')}</span></span>
          <span className={styles.mapCopy}><b>{mapName}</b><small>{result}</small></span>
          {preview && score ? <strong className={styles.mapScore}>{score}</strong> : null}
        </>
        return <li key={order} data-map-state={state}>{map ? <Link to={withSeason(`${path}?map=${order}`)} {...returnProps} aria-label={label} title={label}>{content}</Link> : <span aria-label={label} title={label}>{content}</span>}</li>
      })}
    </ol>
    {!maps.length && <span className={styles.noMaps}>{t('暂无地图记录', 'No map records yet')}</span>}
  </>
}
