import { translateUiText as uiText } from '../../lib/uiText.js'
import { useMemo } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { seasonRecordFacts } from './teamPerformanceReadings.js'
import styles from './TeamPerformanceReadings.module.css'

export default function TeamSeasonRecords({ rows, archived, locale, withSeason, returnState, onLeave }) {
  const en = locale === 'en-US'
  const location = useLocation()
  const [params, setParams] = useSearchParams()
  const open = params.get('seasonRecords') === 'open'
  const toggleRecords = event => {
    event.preventDefault()
    const next = new URLSearchParams(params)
    if (open) next.delete('seasonRecords')
    else next.set('seasonRecords', 'open')
    setParams(next, { replace: true, state: location.state })
  }
  const facts = useMemo(() => seasonRecordFacts(rows, locale), [rows, locale])
  if (!facts.played.length) return null
  const range = run => run.length ? `${run[0].timeLabel.split(' ')[0]} — ${run.at(-1).timeLabel.split(' ')[0]}` : (en ? 'No confirmed winning run' : uiText("暂无可确认的连胜", locale))
  const figures = [
    [en ? 'Longest winning run' : uiText("最长连胜", locale), facts.longest.length, range(facts.longest)],
    [archived ? (en ? 'Closing winning run' : uiText("收官连胜", locale)) : (en ? 'Current winning run' : uiText("当前连胜", locale)), facts.closingKnown ? facts.closing.length : '—', facts.closingKnown ? range(facts.closing) : (en ? 'Latest completed score is missing' : uiText("最近完赛的比分尚未发布", locale))],
    [en ? 'Map difference' : uiText("净胜地图", locale), facts.differential === null ? '—' : `${facts.differential > 0 ? '+' : ''}${facts.differential}`, `${facts.wins} ${en ? 'W' : uiText("胜", locale)} / ${facts.losses} ${en ? 'L' : uiText("负", locale)}${facts.draws ? ` / ${facts.draws} ${en ? 'D' : uiText("平", locale)}` : ''} · ${facts.maps.length} ${en ? 'scored maps' : uiText("图有记录", locale)}`],
    [en ? 'Sweeps on record' : uiText("一图未失的胜场", locale), facts.completeSequences ? facts.sweeps.length : '—', `${facts.completeSequences} ${en ? 'series with a complete map sequence' : uiText("场逐图记录完整的比赛", locale)}`]
  ]
  return <section className={styles.seasonRecords} aria-labelledby="season-records-title">
    <header><span>THE SEASON IN NUMBERS</span><h2 id="season-records-title">{en ? 'The marks this season leaves.' : uiText("这一季，留下这些纪录。", locale)}</h2></header>
    <div className={styles.seasonFigures}>{figures.map(([label, value, note]) => <div key={label}><span>{label}</span><strong>{value}</strong><small>{note}</small></div>)}</div>
    <p>{en ? `Played series only; ${facts.administrative} administrative results and ${facts.byes} byes excluded. Unknown completed scores interrupt a confirmed run; sweeps require a complete, reconciled map record.` : uiText("仅计算实际交手；{0} 场判罚、{1} 次轮空另计。缺失的完赛比分会中断可确认连胜；一图未失要求逐图记录完整并与系列赛比分一致。", locale, [facts.administrative, facts.byes])}</p>
    <details className={styles.recordDetails} open={open}><summary onClick={toggleRecords}>{en ? 'Open the matches behind these records' : uiText("查看纪录对应的比赛", locale)}<span aria-hidden="true">＋</span></summary><div className={styles.recordColumns}>{[[en ? 'Longest winning run' : uiText("最长连胜经过", locale), facts.longest], [en ? 'Sweeps on record' : uiText("一图未失的比赛", locale), facts.sweeps]].map(([label, recordRows]) => <div key={label}><h3>{label}</h3>{recordRows.length ? recordRows.map(row => <Link key={row.match.match_id} to={withSeason(`/matches/${encodeURIComponent(row.match.match_id)}`)} state={returnState} onClick={onLeave}><span>{row.timeLabel.split(' ')[0]} · {row.opponentLabel}</span><b>{row.scoreLabel} ↗</b></Link>) : <p>{en ? 'No qualifying records.' : uiText("暂无符合条件的记录。", locale)}</p>}</div>)}</div></details>
  </section>
}
