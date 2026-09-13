import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { Link } from 'react-router-dom'
import { useState } from 'react'
import { getHeroAvatarSrc } from '../../lib/leaderboardSelectors.js'
import { getDossierMapMatchPath } from './teamDossierAnalysis.js'
import styles from './TeamPerformance.module.css'

export const valueLabel = (value) =>
  value === null || value === undefined
    ? '—'
    : Number(value).toLocaleString('en-US', { maximumFractionDigits: Math.abs(value) >= 1000 ? 0 : 1 })
export const rateLabel = (value) =>
  value === null || value === undefined ? '—' : `${(value * 100).toFixed(1)}%`
export const resultLabel = (value, en) =>
  ({ win: en ? 'W' : '胜', loss: en ? 'L' : '负', draw: en ? 'D' : '平' })[value] || '—'
export const roleLabel = (role, en) =>
  ({
    TANK: en ? 'Tank' : '重装',
    DPS: en ? 'Damage' : '输出',
    SUP: en ? 'Support' : '支援',
    UNKNOWN: en ? 'Unassigned' : '职责待定'
  })[role] || role

export function PerformanceHeading({ index, title, note, id }) {
  return (
    <header className={styles.sectionHeading}>
      <div>
        <span>{index}</span>
        <h2 id={id}>{title}</h2>
      </div>
      {note ? <p>{note}</p> : null}
    </header>
  )
}

export function PerformanceEvidence({ id, title, label, opened, onToggle, children }) {
  const open = opened.includes(id)
  return (
    <details className={styles.evidence} open={open}>
      <summary
        aria-label={label}
        onClick={(event) => {
          event.preventDefault()
          onToggle(id)
        }}
      >
        <span>{title}</span>
        <i aria-hidden="true">{open ? '−' : '+'}</i>
      </summary>
      {open ? children : null}
    </details>
  )
}

export function PerformanceRecords({ records, en, withSeason, returnState, onLeave }) {
  const uiLocale = useUiLocale()
  return (
    <div className={styles.recordList}>
      {records.length ? (
        records.map((record) => (
          <Link
            key={`${record.match.match_id}:${record.mapIndex}`}
            to={withSeason(getDossierMapMatchPath(record))}
            state={returnState}
            onClick={onLeave}
          >
            <span>
              <small>
                {record.timeLabel} · {record.roundLabel}
              </small>
              <b>{record.opponentLabel}</b>
            </span>
            <span>
              {record.mapName}
              <small>
                {en ? 'Map ' : uiText("第 ", uiLocale)}
                {record.mapOrder}
                {en ? '' : uiText(" 图", uiLocale)}
              </small>
            </span>
            <strong>{record.mapScore}</strong>
            <span data-result={record.mapOutcome}>{resultLabel(record.mapOutcome, en)} ↗</span>
          </Link>
        ))
      ) : (
        <p className={styles.empty}>
          {en ? 'No eligible map records in this selection.' : uiText("当前范围暂无有效地图记录。", uiLocale)}
        </p>
      )}
    </div>
  )
}

export function HeroPortrait({ hero }) {
  const source = hero ? getHeroAvatarSrc(hero) : null
  const [failedSource, setFailedSource] = useState(null)
  return source && failedSource !== source ? (
    <img
      className={styles.heroPortrait}
      src={source}
      alt=""
      loading="lazy"
      onError={() => setFailedSource(source)}
    />
  ) : (
    <span className={styles.portraitFallback} aria-hidden="true">
      <i />
    </span>
  )
}

export function MetricBars({ left, right, leftLabel, rightLabel }) {
  const maximum = Math.max(left ?? 0, right ?? 0, 1)
  return (
    <div className={styles.metricBars}>
      {[
        [left, leftLabel],
        [right, rightLabel]
      ].map(([value, label], index) => (
        <div key={index} data-series={index}>
          <span>{label}</span>
          <div aria-hidden="true">
            <i style={{ width: `${value === null ? 0 : (value / maximum) * 100}%` }} />
          </div>
          <b>{valueLabel(value)}</b>
        </div>
      ))}
    </div>
  )
}
