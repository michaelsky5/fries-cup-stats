import { useMemo } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { calculateSwissStandings } from '../../lib/swissEngine.js'
import styles from './StandingsPage.module.css'

const MAX_ROUNDS = 6
const DIRECT_ADVANCE_WINS = 5
const LCQ_SURVIVAL_WINS = 3
const MAX_LOSSES_ALLOWED = MAX_ROUNDS - LCQ_SURVIVAL_WINS

function formatPct(value) {
  const num = Number(value || 0)
  return `${(num * 100).toFixed(1)}%`
}

function getTeamStatus(wins, losses) {
  if (wins >= DIRECT_ADVANCE_WINS) return { label: 'PLAYOFFS', cn: '直通季后赛', type: 'success' }
  if (wins >= LCQ_SURVIVAL_WINS) return { label: 'LCQ', cn: '突围区间', type: 'warning' }
  if (losses > MAX_LOSSES_ALLOWED) return { label: 'ELIMINATED', cn: '淘汰', type: 'danger' }
  return { label: 'ACTIVE', cn: '进行中', type: 'active' }
}

function SummaryCard({ cn, en, value, tone = 'default' }) {
  return (
    <div className={`${styles.summaryCard} ${styles[`summary_${tone}`]}`}>
      <div className={styles.summaryLabel}>
        <span className={styles.summaryCn}>{cn}</span>
        <span className={styles.summaryEn}>{en}</span>
      </div>
      <div className={styles.summaryValue}>{value}</div>
    </div>
  )
}

function MobileStat({ label, value, tone = '' }) {
  return (
    <div className={`${styles.mobileStat} ${tone ? styles[tone] : ''}`}>
      <span className={styles.mobileStatLabel}>{label}</span>
      <span className={styles.mobileStatValue}>{value}</span>
    </div>
  )
}

export default function StandingsPage() {
  const { db } = useOutletContext()
  const standings = useMemo(() => calculateSwissStandings(db), [db])

  const summary = useMemo(() => {
    const playoffs = standings.filter(team => team.match_wins >= DIRECT_ADVANCE_WINS).length
    const lcq = standings.filter(team => team.match_wins >= LCQ_SURVIVAL_WINS && team.match_wins < DIRECT_ADVANCE_WINS).length
    const eliminated = standings.filter(team => team.match_losses > MAX_LOSSES_ALLOWED).length
    const active = standings.filter(team => team.match_wins < LCQ_SURVIVAL_WINS && team.match_losses <= MAX_LOSSES_ALLOWED).length
    return { playoffs, lcq, eliminated, active }
  }, [standings])

  return (
    <div className={styles.shell}>
      <section className={styles.heroSection}>
        <div className={styles.heroMain}>
          <div className={styles.heroKicker}>
            <span className={styles.heroKickerCn}>积分榜总览</span>
            <span className={styles.heroKickerEn}>SWISS STANDINGS</span>
          </div>

          <h1 className={styles.heroTitle}>瑞士轮积分榜</h1>

          <p className={styles.heroDesc}>
            瑞士轮排名：同战绩先比 <strong>Buchholz</strong>，再比
            <strong> 胜负关系</strong>（仅两队同分且直接交手时），最后比
            <strong> 对手胜率</strong>。
          </p>

          <div className={styles.ruleStrip}>
            <span className={styles.ruleChip}>TIEBREAK 1 · BUCHHOLZ</span>
            <span className={styles.ruleChip}>TIEBREAK 2 · H2H</span>
            <span className={styles.ruleChip}>TIEBREAK 3 · OMW%</span>
          </div>
        </div>

        <div className={styles.heroSummary}>
          <SummaryCard cn="直通季后赛" en="PLAYOFFS" value={summary.playoffs} tone="success" />
          <SummaryCard cn="LCQ区间" en="LCQ" value={summary.lcq} tone="warning" />
          <SummaryCard cn="已淘汰" en="ELIMINATED" value={summary.eliminated} tone="danger" />
          <SummaryCard cn="进行中" en="ACTIVE" value={summary.active} tone="active" />
        </div>
      </section>

      <section className={styles.tableSection}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionKicker}>
            <span className={styles.sectionKickerCn}>排名明细</span>
            <span className={styles.sectionKickerEn}>RANKING TABLE</span>
          </div>
        </div>

        <div className={styles.tableWrapper}>
          <div className={styles.desktopTable}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.colRank}>RANK</th>
                  <th className={styles.colTeam}>TEAM</th>
                  <th className={styles.colCenter}>MATCH W-L</th>
                  <th className={styles.colCenter}>BUCHHOLZ</th>
                  <th className={styles.colCenter}>OMW%</th>
                  <th className={styles.colStatus}>STATUS</th>
                </tr>
              </thead>

              <tbody>
                {standings.map(team => {
                  const status = getTeamStatus(team.match_wins, team.match_losses)

                  return (
                    <tr key={team.team_id} className={`${styles.row} ${styles[`row_${status.type}`]}`}>
                      <td className={styles.colRank}>
                        <span className={styles.rankNum}>{team.rank}</span>
                      </td>

                      <td className={styles.colTeam}>
                        <Link to={`/teams/${team.team_id}`} className={styles.teamLink}>
                          <span className={styles.teamShort}>{team.team_short_name || team.team_name}</span>
                          <span className={styles.teamFull}>{team.team_name || team.team_short_name}</span>
                        </Link>
                      </td>

                      <td className={styles.colCenter}>
                        <span className={styles.matchScore}>
                          <span className={styles.textWin}>{team.match_wins}</span>
                          <span className={styles.scoreDash}>-</span>
                          <span className={styles.textLoss}>{team.match_losses}</span>
                        </span>
                      </td>

                      <td className={styles.colCenter}>
                        <span className={styles.tieValue}>{team.buchholz}</span>
                      </td>

                      <td className={styles.colCenter}>
                        <span className={styles.tieValue}>{formatPct(team.opponent_win_rate)}</span>
                      </td>

                      <td className={styles.colStatus}>
                        <div className={`${styles.statusBadge} ${styles[`badge_${status.type}`]}`}>
                          <span className={styles.statusEn}>{status.label}</span>
                          <span className={styles.statusCn}>{status.cn}</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className={styles.mobileList}>
            {standings.map(team => {
              const status = getTeamStatus(team.match_wins, team.match_losses)

              return (
                <article key={team.team_id} className={`${styles.mobileCard} ${styles[`row_${status.type}`]}`}>
                  <div className={styles.mobileTop}>
                    <div className={styles.mobileRankWrap}>
                      <span className={styles.rankNum}>{team.rank}</span>
                    </div>

                    <div className={styles.mobileTeamBlock}>
                      <Link to={`/teams/${team.team_id}`} className={styles.teamLink}>
                        <span className={styles.teamShort}>{team.team_short_name || team.team_name}</span>
                        <span className={styles.teamFull}>{team.team_name || team.team_short_name}</span>
                      </Link>
                    </div>

                    <div className={`${styles.statusBadge} ${styles[`badge_${status.type}`]}`}>
                      <span className={styles.statusEn}>{status.label}</span>
                      <span className={styles.statusCn}>{status.cn}</span>
                    </div>
                  </div>

                  <div className={styles.mobileStatsGrid}>
                    <MobileStat label="战绩" value={`${team.match_wins}-${team.match_losses}`} />
                    <MobileStat label="Buchholz" value={team.buchholz} />
                    <MobileStat label="对手胜率" value={formatPct(team.opponent_win_rate)} />
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      </section>
    </div>
  )
}