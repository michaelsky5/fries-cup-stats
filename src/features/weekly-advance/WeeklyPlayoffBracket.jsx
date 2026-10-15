import { Link } from 'react-router-dom'
import TeamLogo from '../../components/matches/TeamLogo.jsx'
import { pickUiLocale } from '../../lib/uiText.js'
import { formatMatchSchedule } from '../../lib/scheduleFormat.js'
import { getMatchDisplayCode } from '../../lib/weeklyMatchIdentity.js'
import { weeklyStatusLabel, weeklyTeamShort } from '../weekly-overview/weeklyPresentation.js'
import styles from './WeeklyPlayoffBracket.module.css'

const labels = {
  title: ['季后赛签表', 'Playoff bracket', '플레이오프 대진표', '季後賽籤表'],
  intro: ['四强单败 · 对阵与晋级沿用正式公示', 'Four-team single elimination · Published matchups and results', '4팀 싱글 엘리미네이션 · 공식 대진 및 결과', '四強單敗 · 對陣與晉級沿用正式公示'],
  schedule: ['查看赛段赛程', 'Cycle schedule', '대회 일정', '查看賽段賽程'],
  seed: ['种子', 'Seed', '시드', '種子'],
  waiting: ['等待入围名单公布', 'Awaiting published entrants', '진출 팀 발표 대기', '等待入圍名單公布'],
  seedsPending: ['加赛已完成，等待种子公布', 'Qualifiers complete. Awaiting published seeds', '결정전 완료. 공식 시드 발표 대기', '加賽已完成，等待種子公布'],
  seedsPendingNote: ['正式种子和季后赛对阵尚待公布。', 'Official seeds and playoff matchups are still pending.', '공식 시드와 플레이오프 대진 발표를 기다리고 있습니다.', '正式種子和季後賽對陣尚待公布。'],
  waitingNote: ['积分排名与入围名单分别公布。正式种子和对阵公布后，在这里查看晋级路径。', 'Standings and entrants are published separately. Seeds and matchups appear here once announced.', '순위와 진출 팀은 별도로 발표됩니다. 공식 시드와 대진 발표 후 이곳에서 확인할 수 있습니다.', '積分排名與入圍名單分別公布。正式種子和對陣公布後，在這裡查看晉級路徑。'],
  qualification: ['晋级名额需加赛确定', 'Qualification requires a tiebreak', '진출권 결정전 필요', '晉級名額需加賽確定'],
  draw: ['种子顺序待公开抽签', 'Seed order awaits a public draw', '공개 추첨으로 시드 순서 결정', '種子順序待公開抽籤'],
  qualifier: ['晋级加赛', 'Tiebreak qualifier', '진출권 결정전', '晉級加賽'],
  round: ['第 {0} 轮', 'Round {0}', '{0}라운드', '第 {0} 輪'],
  qualified: ['已公布入围队伍', 'Published qualifiers', '발표된 진출 팀', '已公布入圍隊伍'],
  semifinal: ['半决赛', 'Semifinal', '준결승', '準決賽'],
  thirdPlace: ['季军赛', 'Third-place match', '3위 결정전', '季軍賽'],
  final: ['决赛', 'Final', '결승', '決賽'],
  finalPending: ['等待决赛对阵公布', 'Awaiting the final matchup', '결승 대진 발표 대기', '等待決賽對陣公布'],
  winner: ['半决赛 {0} 胜者', 'Semifinal {0} winner', '준결승 {0} 승자', '準決賽 {0} 勝者'],
  bye: ['本轮轮空', 'Round bye', '이번 라운드 부전승', '本輪輪空'],
  qualifierReview: ['晋级依据待复核，暂不展示入围结论。', 'Qualification awaits review. Entrants are not confirmed.', '진출 근거 재검토 대기 중입니다. 진출 팀은 아직 확정되지 않았습니다.', '晉級依據待複核，暫不展示入圍結論。'],
  tbd: ['待定', 'TBD', '미정', '待定'],
  awaitingMatchups: ['种子已公布，等待对阵发布。', 'Seeds are published. Matchups are pending.', '시드가 발표되었습니다. 대진 발표를 기다리고 있습니다.', '種子已公布，等待對陣發布。'],
  stale: ['种子待复核，保留已公布比赛记录。', 'Seeds await review. Published match records remain available.', '시드 재검토 대기 중입니다. 발표된 경기 기록은 유지됩니다.', '種子待複核，保留已公布比賽紀錄。'],
  champion: ['赛段冠军', 'Cycle champion', '대회 우승 팀', '賽段冠軍'],
  points: ['加赛与季后赛不增加赛段积分。', 'Qualifiers and playoffs do not add cycle points.', '결정전과 플레이오프는 대회 포인트에 합산되지 않습니다.', '加賽與季後賽不增加賽段積分。']
}
const copy = (key, locale) => pickUiLocale(locale, ...labels[key])
const idOf = team => team?.id || team?.team_id

function MatchCard({ item, title, locale, seasonId, withSeason, returnProps, selectedTeamId }) {
  const selected = [item.a, item.b].some(team => idOf(team) === selectedTeamId)
  const winnerId = idOf(item.winner)
  const schedule = item.match ? formatMatchSchedule(item.match, { locale }) : null
  const label = [title, item.match?.format, weeklyTeamShort(item.a), item.scoreA == null ? 'VS' : `${item.scoreA} : ${item.scoreB}`,
    item.b ? weeklyTeamShort(item.b) : copy('bye', locale), item.match ? weeklyStatusLabel(item.state, locale) : ''].filter(Boolean).join(' · ')
  const content = <>
    <header><span>{title}</span><b>{item.match?.format || (item.type === 'BYE' ? 'BYE' : '')}</b></header>
    <div className={styles.sides}>{[item.a, item.b].map((team, index) => <div className={styles.side} key={index} data-winner={team && idOf(team) === winnerId || undefined}>
      {team ? <><span className={styles.seed}>{team.seed ? `#${team.seed}` : '—'}</span><TeamLogo team={team} seasonId={seasonId} className={styles.logo} /><strong>{weeklyTeamShort(team)}</strong></> : <strong className={styles.placeholder}>{item.type === 'BYE' ? copy('bye', locale) : copy('tbd', locale)}</strong>}
      {item.type === 'MATCH' && <b className={styles.score}>{index === 0 ? item.scoreA ?? '—' : item.scoreB ?? '—'}</b>}
    </div>)}</div>
    <footer><span>{item.type === 'BYE' ? copy('bye', locale) : weeklyStatusLabel(item.state, locale)}</span><span>{schedule?.hasSchedule ? schedule.label : item.type === 'MATCH' ? copy('tbd', locale) : ''}</span></footer>
    {item.match && <small className={styles.matchCode}>{getMatchDisplayCode(item.match)} <span aria-hidden="true">↗</span></small>}
  </>
  return item.match ? <Link className={styles.match} aria-label={label} data-state={item.state} data-selected={selected || undefined} to={withSeason(`/matches/${encodeURIComponent(item.match.id)}`)} {...returnProps}>{content}</Link>
    : <article className={styles.match} data-state="bye" data-selected={selected || undefined}>{content}</article>
}

export default function WeeklyPlayoffBracket({ model, cycle, locale, seasonId, withSeason, returnProps, selectedTeamId, onSelectTeam }) {
  if (!model) return null
  return <section id="weekly-playoffs" className={styles.section} aria-labelledby="weekly-playoffs-title" data-weekly-playoffs="true">
    <header className={styles.heading}><div><p className={styles.eyebrow}>PLAYOFFS / {cycle.code || cycle.name}</p><h2 id="weekly-playoffs-title">{copy('title', locale)}</h2><p>{copy('intro', locale)}</p></div><Link to={withSeason(`/matches?cycle=${encodeURIComponent(cycle.id)}&week=all`)}>{copy('schedule', locale)} ↗</Link></header>
    {model.champion && <div className={styles.champion} data-weekly-champion={idOf(model.champion)}><span>{copy('champion', locale)}</span><TeamLogo team={model.champion} seasonId={seasonId} className={styles.championLogo} /><strong>{weeklyTeamShort(model.champion)}</strong></div>}
    {model.seeds.length > 0 && <ol className={styles.seeds} aria-label={copy('seed', locale)}>{model.seeds.map(seed => <li key={seed.id}><button type="button" aria-pressed={seed.id === selectedTeamId} onClick={() => onSelectTeam(seed.id)}><span>{copy('seed', locale)} <b>{String(seed.seed).padStart(2, '0')}</b></span><TeamLogo team={seed.team} seasonId={seasonId} className={styles.logo} /><strong>{weeklyTeamShort(seed.team)}</strong></button></li>)}</ol>}
    {!model.seedsCurrent && (model.semifinals.length > 0 || model.finals.length > 0 || model.thirdPlaces.length > 0) && <p className={styles.notice}>{copy('stale', locale)}</p>}
    {model.qualifiers.map(round => <div className={styles.qualifier} key={round.id}>
      <h3>{copy('qualifier', locale)}{round.round_number ? ` · ${copy('round', locale).replace('{0}', round.round_number)}` : ''}</h3>
      <div className={styles.qualifierMatches}>{round.items.map((item, index) => <MatchCard key={item.id} {...{ item, locale, seasonId, withSeason, returnProps, selectedTeamId }} title={`${copy('qualifier', locale)} ${index + 1}`} />)}</div>
      {round.qualification_current === false && <p className={styles.notice}>{copy('qualifierReview', locale)}</p>}
      {round.qualification_current !== false && round.outcome_team_ids?.length > 0 && <p className={styles.notice}>{copy('qualified', locale)}：{round.outcome_team_ids.map(id => weeklyTeamShort(model.teamById.get(id))).join(' · ')}</p>}
    </div>)}
    {model.semifinals.length > 0 || model.finals.length > 0 ? <div className={styles.bracket} data-direct-final={!model.semifinals.length || undefined}>
      {model.semifinals.length > 0 && <div className={styles.round}><h3>{copy('semifinal', locale)}</h3>{model.semifinals.flatMap(round => round.items).map((item, index) => <MatchCard key={item.id} {...{ item, locale, seasonId, withSeason, returnProps, selectedTeamId }} title={`${copy('semifinal', locale)} ${index + 1}`} />)}</div>}
      <div className={styles.finalRound}><h3>{copy('final', locale)}{model.finalFormat ? ` · ${model.finalFormat}` : ''}</h3>
        {model.finals.length > 0 ? model.finals.flatMap(round => round.items).map(item => <MatchCard key={item.id} {...{ item, locale, seasonId, withSeason, returnProps, selectedTeamId }} title={copy('final', locale)} />)
          : <article className={`${styles.match} ${styles.pendingFinal}`} data-final-pending="true"><header><span>{copy('finalPending', locale)}</span></header>{[0, 1].map(index => <div className={styles.side} key={index}>{model.finalists[index] ? <><TeamLogo team={model.finalists[index]} seasonId={seasonId} className={styles.logo} /><strong>{weeklyTeamShort(model.finalists[index])}</strong></> : <strong className={styles.placeholder}>{copy('winner', locale).replace('{0}', index + 1)}</strong>}</div>)}</article>}
      </div>
    </div> : !model.thirdPlaces.length && <div className={styles.empty}><h3>{copy(model.seeds.length ? 'awaitingMatchups' : model.qualificationResolved ? 'seedsPending' : 'waiting', locale)}</h3><p>{copy(model.qualificationResolved ? 'seedsPendingNote' : 'waitingNote', locale)}</p>{model.qualificationRequired && <strong>{copy('qualification', locale)}</strong>}{model.seedDrawRequired && <strong>{copy('draw', locale)}</strong>}</div>}
    {model.thirdPlaces.length > 0 && <div className={styles.thirdPlace} data-weekly-third-place="true"><h3>{copy('thirdPlace', locale)} · FT3</h3>{model.thirdPlaces.flatMap(round => round.items).map(item => <MatchCard key={item.id} {...{ item, locale, seasonId, withSeason, returnProps, selectedTeamId }} title={copy('thirdPlace', locale)} />)}</div>}
    <p className={styles.pointsNote}>{copy('points', locale)}</p>
  </section>
}
