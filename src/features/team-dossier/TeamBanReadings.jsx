import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { Fragment } from 'react'
import { HeroPortrait } from './TeamPerformancePrimitives.jsx'
import TeamReviewRecords from './TeamReviewRecords.jsx'
import { getBanComparison } from './teamBanComparison.js'
import styles from './TeamHeroAnalysis.module.css'

export default function TeamBanReadings({ report, scopeLabel, onReviewHero, ...context }) {
  const uiLocale = useUiLocale()
  const { en, params, updateQuery, opened, onToggle } = context
  const preferredSide = params.get('banSide') === 'own' ? 'own' : 'opponent'
  const rows = getBanComparison(report.bans, preferredSide)
  const showAll = opened.includes('all-ban-heroes')
  const sides = [['opponent', en ? 'Opponent bans' : uiText("对手禁用", uiLocale)], ['own', en ? 'Team bans' : uiText("本队禁用", uiLocale)]]
  const visible = rows.filter((row, index) => showAll || index < 5 || sides.some(([side]) => opened.includes(`ban-${side}-${row.key}`)))

  return <section className={styles.bans} aria-labelledby="ban-records-title">
    <header className={styles.banHeader}>
      <div>
        <span className={styles.eyebrow}>03 / BAN RECORDS</span>
        <h3 id="ban-records-title">{en ? 'Ban comparison' : uiText("禁用对照", uiLocale)}</h3>
        <p>{scopeLabel} · {en ? 'Both sides on these maps' : uiText("这些地图的双方禁用", uiLocale)}</p>
      </div>
      <span className={styles.banMark} aria-hidden="true">BANS</span>
    </header>
    <div className={styles.banBody}>
      {rows.length ? <>
        <div className={styles.banHint}><span>{en ? 'Named bans by hero · maps' : uiText("同一个英雄，对照双方禁用图数", uiLocale)}</span><span>{en ? 'Select a count to inspect maps' : uiText("点击次数，核对比赛", uiLocale)}</span></div>
        <table className={styles.banTable} aria-labelledby="ban-records-title">
          <thead><tr>
            <th scope="col">{en ? 'Hero' : uiText("英雄", uiLocale)}</th>
            {sides.map(([side, label]) => <th key={side} scope="col" aria-sort={preferredSide === side ? 'descending' : 'none'}>
              <button type="button" aria-label={en ? `Sort by ${label.toLowerCase()}` : uiText("按{0}排序", uiLocale, [label])} aria-pressed={preferredSide === side} onClick={() => updateQuery({ banSide: side })}>{label}<span aria-hidden="true">{preferredSide === side ? '↓' : '↕'}</span></button>
              <span className={styles.banCoverage}><b>{report.bans[`${side}Coverage`]} / {report.records.length}</b> {en ? 'maps with named bans' : uiText("图有具名记录", uiLocale)}</span>
            </th>)}
          </tr></thead>
          <tbody>{visible.map(row => <Fragment key={row.key}>
            <tr>
              <th scope="row"><button type="button" className={styles.banIdentity} aria-label={en ? `Review bans for ${row.label}` : uiText("复盘{0}的禁用", uiLocale, [row.label])}
                onClick={() => onReviewHero(row.key, row[preferredSide].maps > 0 ? preferredSide : preferredSide === 'own' ? 'opponent' : 'own')}>
                <HeroPortrait hero={row.hero} /><span><b>{row.label}</b><small>{en ? 'Review ↗' : uiText("复盘 ↗", uiLocale)}</small></span>
              </button></th>
              {sides.map(([side, label]) => {
                const sample = row[side]
                const evidenceId = `ban-${side}-${row.key}`
                const open = opened.includes(evidenceId)
                return <td key={side} data-priority={preferredSide === side}>
                  {sample.maps > 0 ? <button type="button" className={styles.banCount} aria-label={en ? `${open ? 'Close' : 'Inspect'} ${row.label}: ${label.toLowerCase()}, ${sample.maps} ${sample.maps === 1 ? 'map' : 'maps'}` : uiText("{0}{1}的{2}，{3}图", uiLocale, [open ? '收起' : '核对', row.label, label, sample.maps])} aria-expanded={open} aria-controls={open ? `evidence-${evidenceId}` : undefined} onClick={() => onToggle(evidenceId)}>
                    <strong>{sample.maps}</strong><small>{en ? (sample.maps === 1 ? 'map' : 'maps') : uiText("图", uiLocale)}</small><span aria-hidden="true">{open ? '−' : '+'}</span>
                  </button> : <span className={styles.banMissing} aria-label={sample.maps === null ? (en ? 'No named records for this side' : uiText("该方暂无具名记录", uiLocale)) : (en ? 'Not present in the named records' : uiText("具名记录中未出现", uiLocale))}>{sample.maps === null ? '—' : '0'}</span>}
                </td>
              })}
            </tr>
            {sides.filter(([side]) => opened.includes(`ban-${side}-${row.key}`) && row[side].maps > 0).map(([side, label]) => <tr key={side} className={styles.banEvidenceRow}><td colSpan={3}>
              <div id={`evidence-ban-${side}-${row.key}`} className={styles.banEvidence}>
                <header><h4>{row.label} · {label} · {row[side].maps} {en ? 'maps' : uiText("图", uiLocale)}</h4><button type="button" onClick={() => onToggle(`ban-${side}-${row.key}`)} aria-label={en ? `Close ${row.label} ${label.toLowerCase()}` : uiText("收起{0}的{1}", uiLocale, [row.label, label])}>{en ? 'Close' : uiText("收起", uiLocale)} ×</button></header>
                <TeamReviewRecords records={row[side].records} evidenceKey={`ban-${side}-${row.key}`} {...context} />
              </div>
            </td></tr>)}
          </Fragment>)}</tbody>
        </table>
        {rows.length > 5 ? <button type="button" className={styles.expand} aria-expanded={showAll} onClick={() => onToggle('all-ban-heroes')}>{showAll ? (en ? 'Show fewer heroes' : uiText("收起其余英雄", uiLocale)) : (en ? `Compare all ${rows.length} heroes with ban records` : uiText("对照全部 {0} 位有禁用记录的英雄", uiLocale, [rows.length]))}<span aria-hidden="true">{showAll ? '−' : '+'}</span></button> : null}
        <p className={styles.banNote}>{en ? 'Counts use published named bans only. 0: absent from those records. —: no named records for that side.' : uiText("仅统计已发布的具名禁用。0 表示在这些记录中未出现；— 表示该方暂无具名记录。", uiLocale)}</p>
      </> : <p className={styles.empty}>{en ? 'No published named bans in this scope.' : uiText("当前范围暂无具名禁用记录。", uiLocale)}</p>}
    </div>
  </section>
}
