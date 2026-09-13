import { translateUiText as uiText } from '../../lib/uiText.js'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { buildScoutingBrief } from './teamScoutingBrief.js'
import { getFindingMatches } from './teamAnalysisReading.js'
import TeamBriefFigure from './TeamBriefFigure.jsx'
import styles from './TeamScoutingBrief.module.css'

const actionLabel = (finding, en) => finding.opponentId ? (en ? 'Study these meetings' : '核对这组交手')
  : finding.section === 'members' ? (en ? 'Explore the players' : '查看成员组成')
    : finding.section === 'trend' ? (en ? 'Compare the stages' : '核对阶段变化')
      : finding.section === 'maps' ? (en ? 'Explore the modes' : '核对模式表现') : (en ? 'Inspect the comparison' : '查看完整对照')

export default function TeamScoutingBrief({ team, report, mapPool, onInspect, en, locale, withSeason, returnState, onLeave }) {
  const brief = useMemo(() => buildScoutingBrief(report, mapPool, locale), [report, mapPool, locale])
  const labels = en ? { strength: 'OBSERVED STRENGTH', watch: 'REVIEW PRIORITY', profile: 'LINEUP PROFILE', context: 'STAGE CHANGE' }
    : { strength: uiText("已表现的优势", locale), watch: uiText("优先复盘", locale), profile: uiText("成员与阵容", locale), context: uiText("阶段变化", locale) }
  return <section className={styles.brief} id="performance-brief" aria-labelledby="scouting-brief-heading">
    <header className={styles.heading}><h2 id="scouting-brief-heading">{en ? 'What stands out in this scope' : uiText("当前范围，先看这几件事", locale)}</h2><span>{String(brief.findings.length).padStart(2, '0')} / TEAM BRIEF</span></header>
    <div className={styles.findings} data-count={brief.findings.length}>
      {brief.findings.map((finding, index) => {
        const matches = index === 0 ? getFindingMatches(report, finding) : []
        const series = new Set(finding.records.map(record => record.match.match_id)).size
        return <article key={finding.id} className={styles.finding} data-lead={index === 0}>
          <div className={styles.body}>
          <div className={styles.mast}><span>{labels[finding.kind]}</span><b>{String(index + 1).padStart(2, '0')}</b></div>
          <h3>{finding.headline ? finding.headline.map(line => <span key={line}>{line}</span>) : finding.title}</h3>
          <p className={styles.summary}>{finding.summary}</p>
          <div className={styles.actions}><button type="button" onClick={() => onInspect(finding)}>{actionLabel(finding, en)} <span aria-hidden="true">↗</span></button>{index > 0 ? <span>{finding.records.length} {en ? 'maps' : uiText("图", locale)} · {series} {en ? 'series' : uiText("场交手", locale)}</span> : null}</div>
          </div>
          {index === 0 ? <aside className={styles.evidence}><TeamBriefFigure finding={finding} team={team} en={en} /><p className={styles.review}><b>{en ? 'Review focus' : uiText("复盘重点", locale)}</b>{finding.review}</p></aside> : null}
          {matches.length && matches.length < series ? <p className={styles.matchScope}>{en ? 'First and latest meetings · inspect the full comparison for every series' : uiText("首场与最近一次交手 · 完整场次见上方对照", locale)}</p> : null}
          {matches.length ? <div className={styles.matches} aria-label={en ? 'Meetings behind the observation' : uiText("这条观察对应的交手", locale)}>{matches.map(row => <Link key={row.match.match_id} to={withSeason('/matches/' + encodeURIComponent(row.match.match_id))} state={returnState} onClick={onLeave}><time>{row.timeLabel.split(' ')[0]}</time><span>{row.opponentLabel}<small>{row.roundLabel}</small></span><b>{row.scoreLabel}</b><i aria-hidden="true">↗</i></Link>)}</div> : null}
        </article>
      })}
    </div>
    {!brief.findings.length ? <p className={styles.empty}>{en ? 'There are not enough comparable records for a team-level reading yet. Player records remain available below.' : uiText("当前可比记录不足，暂不形成队伍研判。下方仍可查看成员记录。", locale)}</p>
      : !brief.hasWatch ? <p className={styles.note}>{en ? 'No clear review priority is established in this scope.' : uiText("当前样本尚未形成明确的短板判断。", locale)}</p> : null}
  </section>
}
