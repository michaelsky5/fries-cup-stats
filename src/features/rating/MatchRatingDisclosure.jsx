import { getRoleLabel } from '../../lib/leaderboardSelectors.js'
import { getStatisticalRatingModelNotice, getStatisticalRatingNotes } from '../../lib/statisticalRatingPresentation.js'
import { translateUiText as uiText } from '../../lib/uiText.js'
import styles from './MatchRatingDisclosure.module.css'

export function MatchRatingNotes({ rating, locale }) {
  if (!rating?.ratingModelVersion) return null
  const en = locale === 'en-US'
  const records = (rating.entries || []).filter(entry => entry.statisticalRating)
    .map(entry => ({ entry, notes: getStatisticalRatingNotes(entry, locale) }))
  const common = records.length ? records[0].notes.filter(note => records.every(record => record.notes.includes(note)))
    : [getStatisticalRatingModelNotice(locale), en ? 'No usable reference score is available for these records. A dash indicates an unavailable rating.' : '这些记录尚无可用评分参照。“—”表示暂无评分。']
  const individual = records.map(record => ({ ...record, notes: record.notes.filter(note => !common.includes(note)) }))
    .filter(record => record.notes.length > 0)

  return <div className={styles.notes} data-statistical-rating={rating.ratingModelVersion}>
    {common.map(note => <p key={note}>{uiText(note, locale)}</p>)}
    {individual.length ? <ul>{individual.map(({ entry, notes }) => <li key={`${entry.player_id}:${entry.role}`}>
      <strong>{entry.nickname || entry.display_name || String(entry.player_name || entry.player_id).split('#')[0]} · {en ? entry.role : uiText(getRoleLabel(entry.role), locale)}</strong>
      {notes.map(note => <p key={note}>{uiText(note, locale)}</p>)}
    </li>)}</ul> : null}
  </div>
}

export default function MatchRatingDisclosure({ rating, locale = 'zh-CN' }) {
  if (!rating?.ratingModelVersion) return null
  return <details className={styles.disclosure} data-match-rating-disclosure>
    <summary>{locale === 'en-US' ? 'About ratings' : uiText('评分说明', locale)}<span aria-hidden="true">＋</span></summary>
    <MatchRatingNotes rating={rating} locale={locale} />
  </details>
}
