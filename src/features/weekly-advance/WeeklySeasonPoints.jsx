import { pickUiLocale } from '../../lib/uiText.js'
import { weeklyCycleTitle } from '../weekly-overview/weeklyPresentation.js'
import styles from './WeeklySeasonPoints.module.css'

// 票 2.76: the per-cycle breakdown names the cycles (「第一赛段 26 · 第二赛段 0」), not their codes (C01 · 26 / C02 · 0).
export default function WeeklySeasonPoints({ snapshot, locale }) {
  const text = (zh, en, ko, tw) => pickUiLocale(locale, zh, en, ko, tw)
  const rows = snapshot?.season_points_policy === 'CYCLE_POINTS_SUM_STATISTICAL_ONLY' ? snapshot.season_standings : null
  return <details className={styles.panel}>
    <summary><strong>{text('赛季总积分', 'Season points', '시즌 총 포인트', '賽季總積分')}</strong><span>{text('跨赛段累计', 'Across cycles', '사이클 합계', '跨賽段累計')} ＋</span></summary>
    <p>{text('同一赛季各计分赛段的已结算积分相加，赛段积分仍独立排名。总积分仅作统计，不直接决定巅峰赛资格；季后赛名次不额外加分，同分并列。', 'Adds settled points from counted cycles in this season. Cycle rankings remain separate. Totals are statistical only and do not decide Finals qualification. Playoff placements award no extra points; equal totals share a rank.', '같은 시즌의 집계 대상 사이클 포인트를 합산합니다. 사이클 순위는 별개이며 총점은 통계용으로 파이널 진출권을 결정하지 않습니다. 플레이오프 순위에 추가 점수는 없고 동점은 공동 순위입니다.', '同一賽季各計分賽段的已結算積分相加，賽段積分仍獨立排名。總積分僅作統計，不直接決定巔峰賽資格；季後賽名次不額外加分，同分並列。')}</p>
    {!Array.isArray(rows) || !rows.length ? <p>{text('总积分待公布。', 'Season totals await publication.', '총 포인트 발표 대기', '總積分待公布。')}</p> : <div className={styles.tableWrap}><table>
      <thead><tr><th>{text('统计名次', 'Rank', '통계 순위', '統計名次')}</th><th>{text('队伍', 'Team', '팀', '隊伍')}</th><th>{text('赛段明细', 'By cycle', '사이클별', '賽段明細')}</th><th>{text('总积分', 'Total', '총점', '總積分')}</th></tr></thead>
      <tbody>{rows.map(row => <tr key={row.team_id}><td>{String(row.display_rank).padStart(2, '0')}{row.tied && <small> · {text('并列', 'Tied', '공동', '並列')}</small>}</td><th scope="row">{row.team_short_name || row.team_name}</th><td>{row.cycles.map(cycle => `${weeklyCycleTitle({ code: cycle.cycle_code, name: cycle.cycle_name }, locale)} ${cycle.points}`).join(' · ')}</td><td><strong>{row.points}</strong></td></tr>)}</tbody>
    </table></div>}
  </details>
}
