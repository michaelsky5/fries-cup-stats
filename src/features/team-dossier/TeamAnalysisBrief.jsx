import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { Link } from 'react-router-dom'
import { getTeamReadingFindings } from './teamEditorialContent.js'
import { getMapOpponents, getTeamRematch } from './teamDossierResearch.js'
import { getDossierMapMatchPath } from './teamDossierAnalysis.js'
import TeamLogo from '../../components/matches/TeamLogo.jsx'
import styles from './TeamReading.module.css'

const outcome = (value, en) => ({ win: en ? 'W' : '胜', loss: en ? 'L' : '负', draw: en ? 'D' : '平' })[value] || '—'
const recordLabel = (summary, en) => summary.wins + (en ? 'W / ' : ' 胜 / ') + summary.losses + (en ? 'L' : ' 负') + (summary.draws ? ' / ' + summary.draws + (en ? 'D' : ' 平') : '')

function Evidence({ id, title, children, opened, onToggle }) {
  return <details className={styles.evidence} open={opened.includes(id)}>
    <summary onClick={event => { event.preventDefault(); onToggle(id) }}>{title}<span aria-hidden="true">{opened.includes(id) ? '−' : '＋'}</span></summary>
    {children}
  </details>
}

function MapRecords({ records, mapName, en, withSeason, returnState, onLeave }) {
  const uiLocale = useUiLocale()
  return <div className={styles.evidenceRows}>{records.map(record => <Link key={record.match.match_id + ':' + record.mapIndex} to={withSeason(getDossierMapMatchPath(record))} state={returnState} onClick={onLeave}>
    <span><small>{record.timeLabel} · {record.roundLabel}</small><b>{en ? 'vs ' : uiText("对阵 ", uiLocale)}{record.opponentLabel}</b></span>
    <span><strong>{record.mapScore}</strong><small>{mapName || record.mapName} · {en ? 'Map ' : uiText("第 ", uiLocale)}{record.mapOrder}{en ? '' : uiText(" 图", uiLocale)}</small></span>
    <span data-outcome={record.mapOutcome}>{outcome(record.mapOutcome, en)}</span><span aria-hidden="true">↗</span>
  </Link>)}</div>
}

export function OpponentStudy({ research, selectedOpponent, onOpponentChange, team, seasonId, en, locale, withSeason, returnState, onLeave }) {
  const repeated = research.opponents.filter(opponent => opponent.rows.length > 1)
  const selected = repeated.find(opponent => opponent.id === selectedOpponent) || research.rematch?.opponent
  const comparison = selected ? getTeamRematch([selected], locale) : null
  if (!comparison) return <div className={styles.sampleNote}><b>{en ? 'A second meeting will add another perspective.' : uiText("再一次相遇，才有第二个观察角度。", locale)}</b><p>{en ? 'There are no two played series against the same identified opponent to compare yet.' : uiText("目前还没有与同一位已识别对手的两场实际交手，先从下面的单场记录读起。", locale)}</p></div>
  const first = comparison.meetings[0]
  const last = comparison.meetings[1]
  return <section className={styles.opponentStudy} aria-labelledby="team-rematch-title">
    <header className={styles.sectionHeading}><div><span>02 / {en ? 'THE NEXT MEETING' : uiText("再次交手", locale)}</span><h2 id="team-rematch-title">{en ? 'Against ' + selected.label + ', again.' : '再次相遇，' + selected.label + '。'}</h2></div><p>{comparison.changed ? (en ? 'The series result changed. Compare where the map results changed with it.' : uiText("系列赛的结果变了。把两次地图赛果放在一起，看变化发生在哪里。", locale)) : (en ? 'The series outcome stayed the same. The map records provide a closer view.' : uiText("系列赛的胜负相同，逐图记录仍然值得放在一起读。", locale))}</p></header>
    <div className={styles.opponentChoices} role="group" aria-label={en ? 'Choose a repeat opponent' : uiText("选择再次交手的对手", locale)}>{repeated.map(opponent => <button type="button" key={opponent.id} aria-pressed={opponent.id === selected.id} onClick={() => onOpponentChange(opponent.id)}><TeamLogo team={opponent.team} seasonId={seasonId} className={styles.choiceLogo} /><b>{opponent.label}</b><span>{opponent.rows.length} {en ? 'meetings' : uiText("次交手", locale)}</span></button>)}</div>
    <div className={styles.comparison} aria-live="polite">
      <div className={styles.meetingMast}><div><span>{team.shortName} / {selected.label}</span><p>{en ? 'Scores from ' + team.shortName + '’s side.' : '比分以 ' + team.shortName + ' 为左侧。'}</p></div>{[first, last].map((meeting, index) => <Link key={meeting.row.match.match_id} to={withSeason('/matches/' + encodeURIComponent(meeting.row.match.match_id))} state={returnState} onClick={onLeave}><span>{index ? (en ? 'LATER' : uiText("后一次", locale)) : (en ? 'EARLIER' : uiText("前一次", locale))} · {meeting.row.timeLabel.split(' ')[0]}</span><strong>{meeting.row.scoreLabel}</strong><span>{meeting.row.roundLabel} ↗</span></Link>)}</div>
      <div className={styles.comparisonRows}>{comparison.maps.map(map => <div className={styles.comparisonRow} key={map.name}>
        <div className={styles.comparisonMap}><img src={map.image} alt="" loading="lazy" /><b>{map.displayName}</b></div>
        {['before', 'after'].map(side => <div className={styles.comparisonResults} key={side}>{map[side].length ? map[side].map(record => <Link key={record.mapIndex} to={withSeason(getDossierMapMatchPath(record))} state={returnState} onClick={onLeave} data-outcome={record.mapOutcome}><span>{outcome(record.mapOutcome, en)}</span><strong>{record.mapScore}</strong><small>{en ? 'Map ' : uiText("第 ", locale)}{record.mapOrder}{en ? '' : uiText(" 图", locale)} ↗</small></Link>) : <span className={styles.noMap}>{en ? 'No record' : uiText("无本图记录", locale)}</span>}</div>)}
      </div>)}</div>
    </div>
    <p className={styles.method}>{en ? 'Each link opens the exact map. No record means no eligible entry here; tactical explanations require match footage. More than two meetings: a consecutive pair with a changed result is prioritised.' : uiText("每个比分进入对应单图。无本图记录表示没有可用条目；战术原因仍需比赛画面佐证。超过两次交手时，优先对照结果改变的相邻两次。", locale)}</p>
  </section>
}

export function SeriesPatterns({ research, en, evidenceProps, withSeason, returnState, onLeave }) {
  const uiLocale = useUiLocale()
  const patterns = [
    ['close', en ? 'A one-map difference' : uiText("一图之差的系列赛", uiLocale), research.oneMapSeries, en ? 'The final series margin was one map, with both teams winning maps.' : uiText("双方都拿过地图，最终系列赛只差一图。", uiLocale)],
    ['opening', en ? 'Won after losing the opening map' : uiText("先丢首图，最终赢下比赛", uiLocale), research.openingLossWins, en ? 'The first recorded map was lost and the series was won.' : uiText("首图失利，最终系列赛获胜；完整逐图赛果可以核对。", uiLocale)],
    ['sweep', en ? 'Won every map in the series' : uiText("一图未失的胜场", uiLocale), research.sweeps, en ? 'Every map in a complete series record was a win.' : uiText("该场逐图记录完整，全部地图获胜。", uiLocale)]
  ]
  return <section className={styles.patterns} aria-labelledby="team-pattern-title">
    <header className={styles.sectionHeading}><div><span>03 / {en ? 'HOW THE SERIES UNFOLDED' : uiText("比赛如何走完", uiLocale)}</span><h2 id="team-pattern-title">{en ? 'A final score has a sequence.' : uiText("总比分之前，还有逐图经过。", uiLocale)}</h2></div><p>{en ? research.completeSequences.length + ' series have a complete, reconciled map sequence.' : research.completeSequences.length + ' 场比赛的逐图记录完整，且与系列赛比分一致。'}</p></header>
    <div className={styles.patternGrid}>{patterns.map(([id, title, items, explanation]) => <article key={id}><span className={styles.patternCount}>{research.completeSequences.length ? items.length : '—'}<small>{en ? 'series' : uiText("场", uiLocale)}</small></span><h3>{title}</h3><p>{explanation}</p>{items.length ? <Evidence id={'pattern-' + id} title={en ? 'Read these ' + items.length + ' series' : '展开这 ' + items.length + ' 场比赛'} {...evidenceProps}><div className={styles.patternEvidence}>{items.map(item => <Link key={item.row.match.match_id} to={withSeason('/matches/' + encodeURIComponent(item.row.match.match_id))} state={returnState} onClick={onLeave}><span>{item.row.timeLabel.split(' ')[0]} · {item.row.opponentLabel}<b>{item.row.scoreLabel}</b></span><span className={styles.sequenceMarks}>{item.sequence.map(record => <i key={record.mapIndex} data-outcome={record.mapOutcome} title={record.mapName + ' ' + record.mapScore}>{outcome(record.mapOutcome, en)}</i>)}</span></Link>)}</div></Evidence> : <span className={styles.patternEmpty}>{en ? 'No qualifying record' : uiText("暂无符合条件的记录", uiLocale)}</span>}</article>)}</div>
    <p className={styles.method}>{en ? 'These groups can overlap. Incomplete map sequences, byes and administrative results are excluded.' : uiText("这三类记录可以重叠；逐图记录不完整、轮空及判罚结果不计入。", uiLocale)}</p>
  </section>
}

function OpponentsLedger({ research, seasonId, en, evidenceProps, withSeason, returnState, onLeave }) {
  const uiLocale = useUiLocale()
  return <section className={styles.opponentLedger} aria-labelledby="team-opponent-title">
    <header className={styles.sectionHeading}><div><span>04 / {en ? 'ACROSS THE TABLE' : uiText("对手档案", uiLocale)}</span><h2 id="team-opponent-title">{en ? 'Who the results came against.' : uiText("这些胜负，发生在谁身上。", uiLocale)}</h2></div><p>{research.opponents.length} {en ? 'identified opponents · played series only' : uiText("个已识别对手 · 仅统计实际交手", uiLocale)}</p></header>
    <div className={styles.ledgerLabels} aria-hidden="true"><span>{en ? 'Opponent / meetings' : uiText("对手 / 交手次数", uiLocale)}</span><span>{en ? 'Series record' : uiText("系列赛战绩", uiLocale)}</span><span>{en ? 'Map wins / losses / draws' : uiText("地图胜 / 负 / 平", uiLocale)}</span></div>
    {research.opponents.map(opponent => <Evidence key={opponent.id} id={'opponent-' + opponent.id} title={<span className={styles.opponentSummary}><span><TeamLogo team={opponent.team} seasonId={seasonId} className={styles.choiceLogo} /><b>{opponent.label}<small>{opponent.rows.length} {en ? 'meetings' : uiText("次交手", uiLocale)}</small></b></span><strong>{recordLabel(opponent.summary, en)}</strong><span className={styles.opponentMapRecord}><b>{opponent.records.length ? (en ? 'Maps ' : uiText("地图 ", uiLocale)) + recordLabel({ wins: opponent.mapWins, losses: opponent.mapLosses, draws: opponent.mapDraws }, en) : (en ? 'No map record' : uiText("暂无地图记录", uiLocale))}</b><span className={styles.opponentBar} aria-hidden="true" style={{ display: opponent.records.length ? undefined : 'none' }}><i style={{ width: (opponent.records.length ? opponent.mapWins / opponent.records.length * 100 : 0) + '%' }} /></span></span></span>} {...evidenceProps}><div className={styles.opponentMatches}>{opponent.rows.map(row => <Link key={row.match.match_id} to={withSeason('/matches/' + encodeURIComponent(row.match.match_id))} state={returnState} onClick={onLeave}><span>{row.timeLabel}<small>{row.roundLabel}</small></span><strong>{row.scoreLabel}</strong><span>{outcome(row.tone, en)} ↗</span></Link>)}</div></Evidence>)}
    <p className={styles.method}>{en ? 'Known opponent identities are matched across meetings. Dark bars show map wins; the remaining length includes losses and draws.' : uiText("按已识别的对手身份归并多次交手。深色条为获胜地图，其余长度包含失利与平局。", uiLocale)}{research.unknownOpponents ? (en ? ' ' + research.unknownOpponents + ' series have an unidentified opponent and are not grouped here.' : ' 另有 ' + research.unknownOpponents + ' 场对手身份未明确，未合并进此表。') : ''}</p>
  </section>
}

export default function TeamAnalysisBrief({ team, seasonId, research, locale, selectedOpponent, onOpponentChange, opened, onEvidenceToggle, withSeason, returnState, onLeave }) {
  const en = locale === 'en-US'
  const findings = getTeamReadingFindings(research.mapPool)
  const { most, review } = findings
  const mainOpponents = getMapOpponents(most)
  const reviewOpponents = getMapOpponents(review)
  const repeatedLoss = reviewOpponents.concentratedLoss
  const evidenceProps = { opened, onToggle: onEvidenceToggle }
  const recordProps = { en, withSeason, returnState, onLeave }
  const lowVolume = most && (most.maps < 3 || findings.mostTies > 0)
  const mainReading = !most ? '' : mainOpponents.concentratedLoss
    ? (en ? (most.losses === 1 ? 'The only loss on this map came against ' : 'All ' + most.losses + ' losses on this map came against ') + mainOpponents.concentratedLoss.label + '. Compare the opponent and the later meetings before drawing a broader conclusion.' : (most.losses === 1 ? uiText("本图唯一一次失利，发生在对阵 ", locale) : '这张图的 ' + most.losses + ' 次失利，都发生在对阵 ') + mainOpponents.concentratedLoss.label + ' 时。把对手和再次交手放进来，才能读清这些赛果。')
    : most.wins === most.maps ? (en ? 'Every recorded appearance here was a win. The opponents and sample size give that record its context.' : uiText("本图已有记录均获胜。把对手与样本量一起看，才能理解这份战绩。", locale))
      : (en ? 'The map record spans ' + mainOpponents.groups.length + ' identified opponents. Read the individual results before assigning a team characteristic.' : '本图记录涉及 ' + mainOpponents.groups.length + ' 个已识别对手，展开各场赛果，再判断是否形成反复出现的特点。')
  return <section className={styles.brief}>
    <div className={styles.reportMast}><span>{team.shortName} / {en ? 'COMPETITIVE NOTES' : uiText("竞技分析", locale)}</span><span>{research.records.length} {en ? 'maps' : uiText("图", locale)} · {research.played.length} {en ? 'played series' : uiText("场实际交手", locale)}</span></div>
    <header className={styles.lead}>
      <div className={styles.leadReading}><span className={styles.kicker}>01 / {en ? 'START WITH THE MAPS' : uiText("先从地图读起", locale)}</span><h1>{most ? lowVolume ? (en ? <>{research.mapPool.length} maps.<br />Read the samples first.</> : <>{research.mapPool.length}{uiText(" 张地图，", locale)}<br />{uiText("先读具体的交手。", locale)}</>) : <>{most.displayName}{en ? '.' : '，'}<br />{en ? most.maps + ' maps. ' + most.wins + ' wins.' : most.maps + ' 图 ' + most.wins + ' 胜。'}</> : (en ? 'The first record will open the analysis.' : uiText("第一份记录，让分析开始。", locale))}</h1><p>{lowVolume ? (en ? 'No single map has a substantial lead in recorded volume. Start with individual meetings and build the picture from there.' : uiText("目前单张地图的样本较少，或多张地图出场次数并列。先从具体交手建立认识。", locale)) : mainReading}</p></div>
      {most ? <div className={styles.leadVisual}><img src={most.imageUrl} alt="" /><div><span>{most.mode}</span><b>{most.displayName}</b><small>{findings.mostTies ? (en ? 'Joint most recorded · ' + (findings.mostTies + 1) + ' maps tied' : '出场次数并列最多 · ' + (findings.mostTies + 1) + ' 图并列') : (en ? 'Most recorded for this team' : uiText("本队出场记录最多的地图", locale))}</small></div></div> : null}
    </header>
    {most ? <Evidence id="lead-map" title={en ? 'Read the ' + most.maps + ' records on ' + most.displayName : '展开' + most.displayName + '的 ' + most.maps + ' 份记录'} {...evidenceProps}><MapRecords mapName={most.displayName} records={most.records} {...recordProps} /></Evidence> : <p className={styles.empty}>{en ? 'Named, scored maps are required. Byes and administrative results are kept in the journey ledger.' : uiText("分析需要具名且有比分的地图；轮空和判罚结果保留在赛季记录中。", locale)}</p>}
    {review ? <article className={styles.reviewFocus}><div><span>{en ? 'A QUESTION FOR THE REVIEW' : uiText("值得带进复盘的一个问题", locale)}</span><h2>{repeatedLoss ? (en ? <>{review.displayName}: {review.losses} losses.<br />One opponent, {repeatedLoss.label}.</> : <>{review.displayName}{uiText("的 ", locale)}{review.losses}{uiText(" 次失利，", locale)}<br />{uiText("都来自 ", locale)}{repeatedLoss.label}。</>) : (en ? 'Look closer at ' + review.displayName + '.' : '把' + review.displayName + '拿近一点看。')}</h2><p>{repeatedLoss ? (en ? 'The losses are concentrated in one matchup. Review those meetings together; this sample does not establish a weakness against every opponent.' : uiText("失利集中在同一组对阵。复盘可以先比较这些交手，当前记录不足以概括面对所有队伍时的表现。", locale)) : (en ? 'Among the other maps with at least three records, this map has the lowest win rate. Begin with its opponents and losses.' : uiText("在其余至少有 3 份记录的地图中，本图胜率最低。先看对手与失利经过。", locale))}</p></div><div className={styles.reviewEvidence}><div className={styles.reviewRecord}><strong>{review.wins}<small>{en ? 'W' : uiText("胜", locale)}</small> / {review.losses}<small>{en ? 'L' : uiText("负", locale)}</small></strong><span>{review.maps} {en ? 'map records' : uiText("份地图记录", locale)}</span></div><MapRecords records={review.records.filter(record => record.mapOutcome === 'loss')} mapName={review.displayName} {...recordProps} /></div></article> : most ? <p className={styles.method}>{en ? findings.small.length + ' maps have fewer than three appearances. No low-sample map is labelled as a weakness.' : findings.small.length + ' 张地图不足 3 份记录，暂不据此指定队伍的弱图。'}</p> : null}
    <OpponentStudy research={research} selectedOpponent={selectedOpponent} onOpponentChange={onOpponentChange} team={team} seasonId={seasonId} locale={locale} {...recordProps} />
    <SeriesPatterns research={research} evidenceProps={evidenceProps} {...recordProps} />
    <OpponentsLedger research={research} seasonId={seasonId} evidenceProps={evidenceProps} {...recordProps} />
  </section>
}
