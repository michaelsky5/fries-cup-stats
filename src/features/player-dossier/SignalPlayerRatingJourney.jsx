import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import TeamLogo from '../../components/matches/TeamLogo.jsx'
import { SignalHeroPortrait } from '../../components/matches/detail/SignalPlayerData.jsx'
import { formatOwHeroName, formatOwMapName } from '../../lib/heroes.js'
import { formatPlayerMatchStage } from './playerDossierPresentation.js'
import styles from './SignalPlayerRatingJourney.module.css'

const text = (en, zh, english) => en ? english : zh
const initialChartSize = { width: 640, height: 300 }
const rating = value => Number.isFinite(value) ? value.toFixed(1) : '—'
const score = match => match.scoreFor != null && match.scoreAgainst != null ? `${match.scoreFor} : ${match.scoreAgainst}` : '—'
const resultLabel = (value, en) => ({ win: text(en, '胜', 'W'), loss: text(en, '负', 'L'), draw: text(en, '平', 'D'), pending: text(en, '进行中', 'LIVE'), unknown: '—' })[value] || '—'

function RatingDot({ cx, cy, payload, selectedKey, onSelect, en }) {
  if (!Number.isFinite(cx) || !Number.isFinite(cy) || !Number.isFinite(payload?.rating)) return null
  const selected = payload.key === selectedKey
  const choose = () => onSelect(payload.key)
  return <g role="button" tabIndex={0} aria-pressed={selected} aria-controls="player-trend-match" aria-label={`${payload.opponent.short} · ${payload.dateLabel} · ${text(en, '全场评分', 'Match rating')} ${rating(payload.rating)}`} onClick={choose} onKeyDown={event => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); choose() }
  }} className={styles.plotPoint}>
    <circle cx={cx} cy={cy} r={15} fill="transparent" />
    <circle cx={cx} cy={cy} r={selected ? 6 : 4} fill={selected ? 'var(--fc-data-signal)' : 'var(--fc-data-paper-raised)'} stroke="var(--fc-data-ink)" strokeWidth={2} />
  </g>
}

function RatingTooltip({ active, payload, en }) {
  const uiLocale = useUiLocale()
  const match = payload?.[0]?.payload
  if (!active || !match) return null
  return <div className={styles.tooltip}><small>{match.dateLabel}</small><strong>vs {match.opponent.short}</strong><span>{text(en, uiText("全场评分", uiLocale), 'Match rating')} <b>{rating(match.rating)}</b></span></div>
}

export default function SignalPlayerRatingJourney({ matches, en, locale, seasonId, selectedKey, onSelect, linkProps }) {
  const detailRef = useRef(null)
  const chooseMatch = key => {
    onSelect(key)
    if (window.matchMedia('(max-width: 760px)').matches) detailRef.current?.scrollIntoView({ block: 'start', behavior: 'instant' })
  }
  const data = useMemo(() => [...matches]
    .map(match => ({ ...match, timestamp: Date.parse(match.date) }))
    .filter(match => Number.isFinite(match.timestamp))
    .sort((a, b) => a.timestamp - b.timestamp || a.matchId.localeCompare(b.matchId)), [matches])
  const selected = matches.find(match => match.key === selectedKey) || matches[0]
  const ratedCount = matches.filter(match => Number.isFinite(match.rating)).length
  const plottedCount = data.filter(match => Number.isFinite(match.rating)).length
  const formatDate = value => new Intl.DateTimeFormat(locale, { month: '2-digit', day: '2-digit' }).format(value)
  const datedSelection = data.find(match => match.key === selected?.key)
  const firstTime = data[0]?.timestamp
  const lastTime = data.at(-1)?.timestamp
  const domain = firstTime === lastTime ? [firstTime - 3600000, lastTime + 3600000] : ['dataMin', 'dataMax']

  return <section className={styles.journey} aria-labelledby="player-trend-title">
    <header className={styles.heading}><div><p>MATCH PERFORMANCE</p><h2 id="player-trend-title">{matches.length === 1 ? text(en, uiText("单场比赛表现", locale), 'Match performance') : text(en, uiText("比赛评分走势", locale), 'Match rating journey')}</h2></div><span>{ratedCount} {text(en, uiText("场有评分", locale), ratedCount === 1 ? 'rated match' : 'rated matches')} / {matches.length} {text(en, uiText("场出场", locale), matches.length === 1 ? 'appearance' : 'appearances')}</span></header>
    {selected ? <div className={styles.board}>
      {matches.length === 1 ? <p className={styles.singleMatchNote}>{text(en, uiText("目前仅有 1 场出场记录，以下为当场表现。", locale), 'One recorded appearance so far. Explore that match below.')}</p> : <div className={styles.timeline}>
        <div className={styles.plot}>
          <div className={styles.plotHeading}><span>{text(en, uiText("全场评分 · 满分 10 分", locale), 'Match rating · out of 10')}</span><span>{text(en, uiText("点选比赛，查看逐图表现", locale), 'Select a match to explore its maps')}</span></div>
          {plottedCount > 0 ? <div className={styles.chart} aria-label={text(en, uiText("按比赛日期排列的全场评分，满分 10 分", locale), 'Match ratings by date, out of 10')}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={initialChartSize}>
              <LineChart data={data} margin={{ top: 20, right: 24, bottom: 8, left: 0 }} accessibilityLayer>
                <CartesianGrid vertical={false} stroke="var(--fc-data-border, #cbccc3)" />
                <XAxis dataKey="timestamp" type="number" domain={domain} ticks={firstTime === lastTime ? [firstTime] : undefined} tickFormatter={formatDate} minTickGap={45} tick={{ fontSize: 12, fill: 'var(--fc-data-text-muted)' }} axisLine={false} tickLine={false} padding={{ left: 15, right: 15 }} />
                <YAxis domain={[0, 10]} ticks={[0, 5, 10]} width={28} tick={{ fontSize: 12, fill: 'var(--fc-data-text-muted)' }} axisLine={false} tickLine={false} />
                {datedSelection && <ReferenceLine x={datedSelection.timestamp} stroke="var(--fc-data-text-muted)" strokeDasharray="4 5" />}
                <Tooltip content={<RatingTooltip en={en} />} />
                <Line type="linear" dataKey="rating" stroke="var(--fc-data-ink)" strokeWidth={2} dot={<RatingDot selectedKey={selected.key} onSelect={chooseMatch} en={en} />} activeDot={false} isAnimationActive={false} connectNulls={false} />
              </LineChart>
            </ResponsiveContainer>
          </div> : <p className={styles.empty}>{ratedCount ? text(en, uiText("比赛日期待补充。", locale), 'Match dates are not available yet.') : text(en, uiText("暂无已公开的比赛评分。", locale), 'No published match ratings yet.')}</p>}
        </div>
        <div className={styles.matchIndex}>
          <div className={styles.indexHeading}><span>{text(en, uiText("按比赛查看", locale), 'Explore matches')}</span><span>{text(en, uiText("最近在前", locale), 'Latest first')}</span></div>
          <div className={styles.matchSelector} aria-label={text(en, uiText("选择走势比赛", locale), 'Select a match in the journey')}>
            {matches.map(match => <button type="button" key={match.key} aria-pressed={selected.key === match.key} aria-controls="player-trend-match" onClick={() => chooseMatch(match.key)} aria-label={`${match.opponent.short} · ${match.dateLabel}`} data-result={match.result}>
              <time dateTime={match.date}>{match.dateLabel.split(' ')[0]}</time><strong>{match.opponent.short}</strong><b>{rating(match.rating)}</b><small>{resultLabel(match.result, en)}</small>
            </button>)}
          </div>
        </div>
      </div>}
      <section id="player-trend-match" ref={detailRef} className={styles.detail} aria-label={text(en, uiText("所选比赛", locale), 'Selected match')}>
        <div className={styles.matchSummary}>
          <div className={styles.matchMeta}><span>{formatPlayerMatchStage(selected.stage, en)}</span><time dateTime={selected.date}>{selected.dateLabel}</time></div>
          <div className={styles.matchTitle}><TeamLogo team={selected.opponent} seasonId={seasonId} className={styles.logo} /><div><span>{text(en, uiText("对阵", locale), 'VERSUS')}</span><strong>{selected.opponent.short}</strong></div><div className={styles.result} data-result={selected.result}><strong>{score(selected)}</strong><span>{resultLabel(selected.result, en)}</span></div></div>
          <div className={styles.matchRating}><span>{text(en, uiText("全场评分", locale), 'Match rating')}<small>{text(en, uiText("满分 10 分", locale), 'Out of 10')}</small></span><strong>{rating(selected.rating)}</strong></div>
          <Link {...linkProps(`/matches/${encodeURIComponent(selected.matchId)}`)} className={styles.report}>{text(en, uiText("完整比赛战报", locale), 'Full match report')} <span aria-hidden="true">↗</span></Link>
        </div>
        <div className={styles.mapHeading}><span>{text(en, uiText("出场地图", locale), 'Maps played')} <b>{selected.maps.length}</b></span><span>{text(en, uiText("单图评分 · 满分 10 分", locale), 'Map rating · out of 10')}</span></div>
        <div className={styles.maps} data-count={selected.maps.length}>{selected.maps.map(map => <Link key={map.order} {...linkProps(`/matches/${encodeURIComponent(selected.matchId)}?map=${map.order}`)}>
          <small>{String(map.order).padStart(2, '0')}</small><strong>{formatOwMapName(map.name, locale)}</strong><span className={styles.mapHeroes}>{map.heroes.map(hero => <SignalHeroPortrait key={hero} hero={hero} role={map.role} description={formatOwHeroName(hero, locale)} />)}</span><b>{rating(map.rating)}</b><span className={styles.mapArrow} aria-hidden="true">↗</span>
        </Link>)}</div>
      </section>
    </div> : <p className={styles.empty}>{text(en, uiText("暂无已公开的比赛记录。", locale), 'No published match appearances yet.')}</p>}
  </section>
}
