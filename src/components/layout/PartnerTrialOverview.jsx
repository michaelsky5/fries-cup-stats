import { Link, useOutletContext } from 'react-router-dom'
import { getGlobalSummary } from '../../lib/selectors.js'
import home from '../../pages/home/HomePage.module.css'
import styles from './PartnerTrialNotice.module.css'

const COPY = {
  'zh-CN': { title: '公开结果核对', intro: '每场练习独立，不组成正式赛季，也不计算晋级。核对比赛编号后，再查看对应比分和选手数据。', complete: '已公开赛果', maps: '已记录地图', players: '演练选手', results: '已批准并发布的比赛', matches: '查看全部练习', roster: '查看演练名单', stats: '查看选手数据', reference: '已完成参考样例', review: '负责人审核样例', exercise: '赛管练习', empty: '还没有公开赛果。负责人批准并发布后，结果才会出现在这里。' },
  'zh-TW': { title: '公開結果核對', intro: '每場練習獨立，不組成正式賽季，也不計算晉級。核對比賽編號後，再查看對應比分和選手資料。', complete: '已公開賽果', maps: '已記錄地圖', players: '演練選手', results: '已核准並發布的比賽', matches: '查看全部練習', roster: '查看演練名單', stats: '查看選手資料', reference: '已完成參考範例', review: '負責人審核範例', exercise: '賽管練習', empty: '還沒有公開賽果。負責人核准並發布後，結果才會出現在這裡。' },
  'en-US': { title: 'Check published results', intro: 'Exercises are independent and do not form a competitive season or advancement table. Match the exercise ID before checking scores and player data.', complete: 'Published results', maps: 'Recorded maps', players: 'Demo players', results: 'Approved and published matches', matches: 'All exercises', roster: 'Demo roster', stats: 'Player statistics', reference: 'Completed reference', review: 'Reviewer exercise', exercise: 'Operator exercise', empty: 'No published results yet. Results appear after the reviewer approves and publishes them.' },
  'ko-KR': { title: '공개 결과 확인', intro: '각 연습은 독립적이며 정규 시즌이나 진출 순위를 구성하지 않습니다. 경기 번호를 확인한 뒤 점수와 선수 데이터를 검토하세요.', complete: '공개된 결과', maps: '기록된 맵', players: '연습 선수', results: '승인 및 게시된 경기', matches: '전체 연습', roster: '연습 명단', stats: '선수 데이터', reference: '완료된 참고 예시', review: '담당자 검토 연습', exercise: '운영자 연습', empty: '아직 공개된 결과가 없습니다. 담당자가 승인하고 게시하면 여기에 표시됩니다.' }
}

export default function PartnerTrialOverview() {
  const { db, season, locale, withSeason } = useOutletContext()
  const copy = COPY[locale] || COPY['zh-CN']
  const summary = getGlobalSummary(db)
  const results = (db?.matches || []).filter(match => ['COMPLETE', 'COMPLETED'].includes(match.status))
  function label(match) {
    const id = match.raw_match_id || match.match_id || match.id
    if (id.endsWith('-REFERENCE')) return copy.reference
    if (/-REVIEW(?:-|$)/.test(id)) return copy.review
    return `${copy.exercise} ${id.match(/-P(\d+)-/)?.[1] || id}`
  }
  return <section className={home.commandBoard} data-event-mark={season.displayCode || season.id} data-i18n-ignore>
    <div className={home.commandLead}>
      <span className={home.commandKicker}>FRIES CUP / TRIAL RESULTS</span>
      <div className={home.commandTitle}><strong>{season.displayCode || season.id}</strong><h1>{copy.title}</h1></div>
      <p className={styles.explanation}>{copy.intro}</p>
      <dl className={home.commandFacts}>{[[copy.complete, summary.completed], [copy.maps, summary.mapCount], [copy.players, summary.playerCount]].map(([name, value]) => <div key={name}><dt>{name}</dt><dd>{value}</dd></div>)}</dl>
      <div className={home.commandActions}><Link to={withSeason('/matches')}>{copy.matches}</Link><Link to={withSeason('/roster')}>{copy.roster}</Link><Link to={withSeason('/leaderboard')}>{copy.stats}</Link></div>
    </div>
    <aside className={home.commandFeatured}>
      <div className={home.commandFeaturedHead}><span>PUBLISHED RESULTS</span><strong>{copy.results}</strong></div>
      <div className={styles.resultList}>{results.map(match => <Link className={styles.result} key={match.match_id || match.id} to={withSeason(`/matches/${encodeURIComponent(match.match_id || match.id)}`)}><strong>{label(match)}</strong><span>{match.team_a?.name || match.team_a?.short} {match.team_a?.score} : {match.team_b?.score} {match.team_b?.name || match.team_b?.short}</span><small>{match.raw_match_id || match.match_id}</small></Link>)}{!results.length && <p>{copy.empty}</p>}</div>
    </aside>
  </section>
}
