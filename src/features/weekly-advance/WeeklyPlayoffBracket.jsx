import { Link } from 'react-router-dom'
import TeamLogo from '../../components/matches/TeamLogo.jsx'
import { pickUiLocale } from '../../lib/uiText.js'
import { formatMatchSchedule } from '../../lib/scheduleFormat.js'
import { getMatchDisplayCode } from '../../lib/weeklyMatchIdentity.js'
import { weeklyStatusLabel, weeklyTeamShort } from '../weekly-overview/weeklyPresentation.js'
import { buildWeeklyBracketPresentation } from './weeklyBracketPresentation.js'
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
Object.assign(labels, {
  seedSlot: ['{0} 号种子 · 待公布', 'Seed {0} · To be announced', '{0}번 시드 · 발표 예정', '{0} 號種子 · 待公布'],
  fixturePending: ['对阵待发布', 'Matchup pending', '대진 발표 대기', '對陣待發布'],
  structure: ['签表结构 · 正式对阵待公布', 'Bracket structure · Matchups pending', '대진 구조 · 공식 대진 발표 대기', '籤表結構 · 正式對陣待公布'],
  structureNote: ['占位只说明晋级路径；队伍和开赛时间沿用正式发布。', 'Placeholders explain the route. Teams and start times follow the official publication.', '자리 표시는 진출 경로만 설명합니다. 팀과 시작 시간은 공식 발표를 따릅니다.', '佔位只說明晉級路徑；隊伍和開賽時間沿用正式發布。'],
  wins: ['获胜晋级', 'Win to advance', '승리 시 진출', '獲勝晉級'],
  losses: ['半决赛负方', 'Semifinal losers', '준결승 패자', '準決賽負方'],
  championPending: ['冠军待产生', 'Champion to be decided', '우승 팀 미정', '冠軍待產生'],
  qualifierPath: ['通过加赛确定入围名额', 'Qualifiers decide the remaining places', '결정전으로 남은 진출권 결정', '透過加賽確定入圍名額']
})
const copy = (key, locale) => pickUiLocale(locale, ...labels[key])
const idOf = team => team?.id || team?.team_id

function MatchCard({ item, title, locale, seasonId, withSeason, returnProps, selectedTeamId }) {
  const selected = Boolean(selectedTeamId) && [item.a, item.b].some(team => idOf(team) === selectedTeamId)
  const winnerId = idOf(item.winner)
  const schedule = item.match ? formatMatchSchedule(item.match, { locale }) : null
  const pending = item.type === 'PLACEHOLDER'
  const sourceLabel = index => {
    const source = item.sources?.[index]
    return source ? copy(source.kind === 'SEED' ? 'seedSlot' : 'winner', locale).replace('{0}', source.number) : copy('tbd', locale)
  }
  const label = [title, item.match?.format, weeklyTeamShort(item.a), item.scoreA == null ? 'VS' : `${item.scoreA} : ${item.scoreB}`,
    item.b ? weeklyTeamShort(item.b) : copy('bye', locale), item.match ? weeklyStatusLabel(item.state, locale) : ''].filter(Boolean).join(' · ')
  const content = <>
    <header><span>{title}</span><b>{item.match?.format || item.format || (item.type === 'BYE' ? 'BYE' : '')}</b></header>
    <div className={styles.sides}>{[item.a, item.b].map((team, index) => <div className={styles.side} key={index} data-winner={team && idOf(team) === winnerId || undefined}>
      {team ? <><span className={styles.seed}>{team.seed ? `#${team.seed}` : '—'}</span><TeamLogo team={team} seasonId={seasonId} className={styles.logo} /><strong>{weeklyTeamShort(team)}</strong></> : <><span className={styles.pendingMark} aria-hidden="true">{pending && item.sources?.[index]?.kind === 'SEED' ? `#${item.sources[index].number}` : '↗'}</span><strong className={styles.placeholder}>{item.type === 'BYE' ? copy('bye', locale) : sourceLabel(index)}</strong></>}
      {item.type !== 'BYE' && <b className={styles.score}>{index === 0 ? item.scoreA ?? '—' : item.scoreB ?? '—'}</b>}
    </div>)}</div>
    <footer><span>{pending ? copy('fixturePending', locale) : item.type === 'BYE' ? copy('bye', locale) : weeklyStatusLabel(item.state, locale)}</span><span>{schedule?.hasSchedule ? schedule.label : item.type === 'MATCH' ? copy('tbd', locale) : ''}</span></footer>
    {item.match && <small className={styles.matchCode}>{getMatchDisplayCode(item.match)} <span aria-hidden="true">↗</span></small>}
  </>
  return item.match ? <Link className={styles.match} aria-label={label} data-state={item.state} data-selected={selected || undefined} to={withSeason(`/matches/${encodeURIComponent(item.match.id)}`)} {...returnProps}>{content}</Link>
    : <article className={styles.match} data-state={pending ? 'unpublished' : 'bye'} data-selected={selected || undefined} data-bracket-placeholder={pending || undefined}>{content}</article>
}

export default function WeeklyPlayoffBracket({ model, cycle, locale, seasonId, withSeason, returnProps, selectedTeamId, onSelectTeam }) {
  if (!model) return null
  const diagram = buildWeeklyBracketPresentation(model)
  const cardProps = { locale, seasonId, withSeason, returnProps, selectedTeamId }
  return <section id="weekly-playoffs" className={styles.section} aria-labelledby="weekly-playoffs-title" data-weekly-playoffs="true">
    <header className={styles.heading}><div><p className={styles.eyebrow}>PLAYOFFS / {cycle.code || cycle.name}</p><h2 id="weekly-playoffs-title">{copy('title', locale)}</h2><p>{copy('intro', locale)}</p></div><Link to={withSeason(`/matches?cycle=${encodeURIComponent(cycle.id)}&week=all`)}>{copy('schedule', locale)} ↗</Link></header>
    {model.seeds.length > 0 && <ol className={styles.seeds} aria-label={copy('seed', locale)}>{model.seeds.map(seed => <li key={seed.id}><button type="button" aria-pressed={seed.id === selectedTeamId} onClick={() => onSelectTeam(seed.id)}><span>{copy('seed', locale)} <b>{String(seed.seed).padStart(2, '0')}</b></span><TeamLogo team={seed.team} seasonId={seasonId} className={styles.logo} /><strong>{weeklyTeamShort(seed.team)}</strong></button></li>)}</ol>}
    {!model.seedsCurrent && (model.semifinals.length > 0 || model.finals.length > 0 || model.thirdPlaces.length > 0) && <p className={styles.notice}>{copy('stale', locale)}</p>}
    {model.qualifiers.length > 0 && <div className={styles.qualifierSection}><div className={styles.routeLabel}><span>01 / QUALIFIER</span><strong>{copy('qualifierPath', locale)}</strong></div><div className={styles.qualifierRounds}>{model.qualifiers.map(round => <div className={styles.qualifier} key={round.id}>
      <h3>{copy('qualifier', locale)}{round.round_number ? ` · ${copy('round', locale).replace('{0}', round.round_number)}` : ''}</h3>
      <div className={styles.qualifierMatches}>{round.items.map((item, index) => <MatchCard key={item.id} {...{ item, locale, seasonId, withSeason, returnProps, selectedTeamId }} title={`${copy('qualifier', locale)} ${index + 1}`} />)}</div>
      {round.qualification_current === false && <p className={styles.notice}>{copy('qualifierReview', locale)}</p>}
      {round.qualification_current !== false && round.outcome_team_ids?.length > 0 && <p className={styles.notice}>{copy('qualified', locale)}：{round.outcome_team_ids.map(id => weeklyTeamShort(model.teamById.get(id))).join(' · ')}</p>}
    </div>)}</div></div>}
    {!diagram.hasPublishedMatches && <div className={styles.pendingNotice}><div><strong>{copy(model.seeds.length ? 'awaitingMatchups' : model.qualificationResolved ? 'seedsPending' : 'structure', locale)}</strong><p>{copy('structureNote', locale)}</p></div>{model.qualificationRequired && <span>{copy('qualification', locale)}</span>}{model.seedDrawRequired && <span>{copy('draw', locale)}</span>}</div>}
    <div className={styles.diagramHeading}><span>02 / PLAYOFFS</span><span className={styles.legend}>{copy('wins', locale)} <i aria-hidden="true" /> {copy('champion', locale)}</span></div>
    <div className={styles.bracket} data-direct-final={diagram.directFinal || undefined}>
      {diagram.semifinals.length > 0 && <div className={styles.roundColumn}><h3>{copy('semifinal', locale)} <small>FT3</small></h3><div className={styles.round} data-single={diagram.semifinals.length === 1 || undefined}>{diagram.semifinals.map((item, index) => <MatchCard key={item.id} item={item} {...cardProps} title={`${copy('semifinal', locale)} ${index + 1}`} />)}</div></div>}
      <div className={styles.roundColumn}><h3>{copy('final', locale)} {model.finalFormat && <small>{model.finalFormat}</small>}</h3><div className={styles.finalRound}>{diagram.finals.map(item => <MatchCard key={item.id} item={item} {...cardProps} title={copy('final', locale)} />)}</div></div>
      <div className={styles.roundColumn}><h3>{copy('champion', locale)}</h3><div className={styles.championColumn}><div className={styles.champion} data-weekly-champion={model.champion ? idOf(model.champion) : undefined} data-pending={!model.champion || undefined}><span>WINNER</span>{model.champion ? <><TeamLogo team={model.champion} seasonId={seasonId} className={styles.championLogo} /><strong>{weeklyTeamShort(model.champion)}</strong></> : <><span className={styles.trophy} aria-hidden="true">★</span><strong>{copy('championPending', locale)}</strong></>}<small>{copy('champion', locale)}</small></div></div></div>
    </div>
    {diagram.thirdPlaces.length > 0 && <div className={styles.thirdPlace} data-weekly-third-place="true"><div><span className={styles.lossLine} aria-hidden="true" /><span>{copy('losses', locale)}</span></div><h3>{copy('thirdPlace', locale)} · FT3</h3>{diagram.thirdPlaces.map(item => <MatchCard key={item.id} item={item} {...cardProps} title={copy('thirdPlace', locale)} />)}</div>}
    <p className={styles.pointsNote}>{copy('points', locale)}</p>
  </section>
}
