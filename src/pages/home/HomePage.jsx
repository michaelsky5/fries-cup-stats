import { useMemo } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { safeArr, getSwissStandings } from '../../lib/selectors.js'
import styles from './HomePage.module.css'

function formatNum(value, digits = 2) {
  const num = Number(value || 0)
  return Number.isFinite(num) ? num.toFixed(digits) : '0.00'
}

function SummaryItem({ cn, en, value, accent = false, live = false }) {
  return (
    <div className={`${styles.summaryItem} ${accent ? styles.summaryItemAccent : ''} ${live ? styles.summaryItemLive : ''}`}>
      <div className={styles.summaryLabel}>
        <span className={styles.summaryCn}>{cn}</span>
        <span className={styles.summaryEn}>{en}</span>
      </div>
      <div className={styles.summaryValue}>{value}</div>
    </div>
  )
}

function EmptyCard({ text = '数据演算中...' }) {
  return <div className={styles.emptyState}>{text}</div>
}

function normalizeRole(role) {
  const r = String(role || '').toUpperCase().trim()
  if (r === 'SUPPORT' || r === 'HEALER' || r === '辅助') return 'SUP'
  if (r === 'DAMAGE' || r === '输出' || r === 'DPS') return 'DPS'
  if (r === 'TANK' || r === '重装') return 'TANK'
  return r || 'FLEX'
}

function getTankScore(player) {
  return Number(player?.avg_block || 0)
}

function getElimDpsScore(player) {
  return Number(player?.avg_elim || 0)
}

function getDamageDpsScore(player) {
  return Number(player?.avg_dmg || 0)
}

function getAssistSupportScore(player) {
  return Number(player?.avg_ast || 0)
}

function getHealSupportScore(player) {
  return Number(player?.avg_heal || 0)
}

function getLineupMetric(player, subrole) {
  if (!player) return { label: '-', value: '-' }

  if (subrole === 'TANK') return { label: '阻挡 /10', value: formatNum(player.avg_block) }
  if (subrole === 'ELIM_DPS') return { label: '击杀 /10', value: formatNum(player.avg_elim) }
  if (subrole === 'DMG_DPS') return { label: '伤害 /10', value: formatNum(player.avg_dmg) }
  if (subrole === 'AST_SUP') return { label: '助攻 /10', value: formatNum(player.avg_ast) }
  if (subrole === 'HEAL_SUP') return { label: '治疗 /10', value: formatNum(player.avg_heal) }

  return { label: '-', value: '-' }
}

function LineupSlot({ cn, en, roleTheme, player, subrole }) {
  if (!player) {
    return (
      <div className={styles.lineupSlot}>
        <div className={styles.lineupSlotTop}>
          <span className={styles.lineupSlotTag}>{cn}</span>
          <span className={`${styles.lineupRoleTag} ${styles[`role${roleTheme}`]}`}>{roleTheme}</span>
        </div>
        <div className={styles.lineupSlotSubEn}>{en}</div>
        <div className={styles.lineupEmpty}>暂无人选</div>
      </div>
    )
  }

  const metric = getLineupMetric(player, subrole)

  return (
    <Link to={`/players/${player.player_id}`} className={styles.lineupSlot}>
      <div className={styles.lineupSlotTop}>
        <span className={styles.lineupSlotTag}>{cn}</span>
        <span className={`${styles.lineupRoleTag} ${styles[`role${roleTheme}`]}`}>{roleTheme}</span>
      </div>

      <div className={styles.lineupSlotSubEn}>{en}</div>

      <div className={styles.lineupPlayerName}>
        {player.display_name || player.player_name || '-'}
      </div>

      <div className={styles.lineupPlayerTeam}>
        {player.team_short_name || player.team_name || 'FREE AGENT'}
      </div>

      <div className={styles.lineupMetric}>
        <span className={styles.lineupMetricLabel}>{metric.label}</span>
        <span className={styles.lineupMetricValue}>{metric.value}</span>
      </div>
    </Link>
  )
}

export default function HomePage() {
  const { db } = useOutletContext()

  const latestMatch = useMemo(() => {
    const matches = safeArr(db?.matches).filter(m => m.status === 'COMPLETE' || m.status === 'COMPLETED')
    if (matches.length === 0) return null
    return matches.sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0))[0]
  }, [db])

  const currentMVP = useMemo(() => {
    const players = safeArr(db?.player_totals).filter(p => Number(p.raw_time_mins) >= 20)
    if (players.length === 0) return null
    return players.sort((a, b) => (Number(b.avg_elim) || 0) - (Number(a.avg_elim) || 0))[0]
  }, [db])

  const topTeams = useMemo(() => {
    return getSwissStandings(db).slice(0, 3)
  }, [db])

  const bestLineup = useMemo(() => {
    const pool = safeArr(db?.player_totals)
      .filter(player => Number(player.raw_time_mins || 0) >= 20)
      .map(player => ({ ...player, roleNorm: normalizeRole(player.role) }))

    const tanks = pool.filter(player => player.roleNorm === 'TANK')
    const dpsPlayers = pool.filter(player => player.roleNorm === 'DPS')
    const supPlayers = pool.filter(player => player.roleNorm === 'SUP')

    const pickTop = (players, scoreFn, excludedIds = new Set()) =>
      players
        .filter(player => !excludedIds.has(String(player.player_id)))
        .sort((a, b) => scoreFn(b) - scoreFn(a))[0] || null

    const tank = pickTop(tanks, getTankScore)

    const elimDps = pickTop(dpsPlayers, getElimDpsScore)
    const usedDps = new Set(elimDps ? [String(elimDps.player_id)] : [])
    const damageDps = pickTop(dpsPlayers, getDamageDpsScore, usedDps)

    const assistSup = pickTop(supPlayers, getAssistSupportScore)
    const usedSup = new Set(assistSup ? [String(assistSup.player_id)] : [])
    const healSup = pickTop(supPlayers, getHealSupportScore, usedSup)

    return {
      tank,
      elimDps,
      damageDps,
      assistSup,
      healSup
    }
  }, [db])

  const summary = useMemo(() => {
    const teams = safeArr(db?.teams)
    const players = safeArr(db?.players)
    const matches = safeArr(db?.matches)
    const liveMatches = matches.filter(m => m.status === 'IN_PROGRESS').length
    const completedMatches = matches.filter(m => m.status === 'COMPLETE' || m.status === 'COMPLETED').length

    return {
      totalTeams: teams.length,
      totalPlayers: players.length,
      totalMatches: matches.length,
      liveMatches,
      completedMatches
    }
  }, [db])

  return (
    <div className={styles.shell}>
      <section className={styles.heroSection}>
        <div className={styles.heroMain}>
          <div className={styles.systemStatus}>
            <span className={styles.statusDot}></span>
            <span className={styles.systemCn}>系统在线</span>
            <span className={styles.systemEn}>SYSTEM ONLINE</span>
          </div>

          <div className={styles.heroKicker}>
            <span className={styles.heroKickerCn}>首页总览</span>
            <span className={styles.heroKickerEn}>DATA CENTER HOME</span>
          </div>

          <h1 className={styles.heroTitle}>
            FRIES CUP <span>DATA CENTER</span>
          </h1>

          <p className={styles.heroDesc}>
            欢迎接入薯条杯全景数据中心。这里汇总当前赛季的核心比赛结果、关键选手与战队走势，作为后续浏览赛程、排行与战术数据的主入口。
          </p>

          <div className={styles.heroActions}>
            <Link to="/matches" className={styles.primaryBtn}>进入赛事大厅</Link>
            <Link to="/standings" className={styles.secondaryBtn}>查看积分榜</Link>
          </div>
        </div>

        <div className={styles.heroSummary}>
          <SummaryItem cn="参赛队伍" en="TEAMS" value={summary.totalTeams} />
          <SummaryItem cn="选手名单" en="PLAYERS" value={summary.totalPlayers} />
          <SummaryItem cn="总场次" en="MATCHES" value={summary.totalMatches} accent />
          <SummaryItem cn="进行中" en="LIVE" value={summary.liveMatches} live />
          <SummaryItem cn="已完结" en="COMPLETE" value={summary.completedMatches} />
        </div>
      </section>

      <section className={styles.mainGrid}>
        {currentMVP ? (
          <Link to={`/players/${currentMVP.player_id}`} className={`${styles.featureCard} ${styles.mvpCard}`}>
            <div className={styles.cardHead}>
              <div className={styles.cardKicker}>
                <span className={styles.cardKickerCn}>数据领跑者</span>
                <span className={styles.cardKickerEn}>STATISTICAL MVP</span>
              </div>
            </div>

            <div className={styles.mvpRole}>{currentMVP.role || 'FLEX'}</div>
            <h2 className={styles.mvpName}>{currentMVP.display_name || currentMVP.player_name}</h2>
            <div className={styles.mvpTeam}>{currentMVP.team_name || currentMVP.team_short_name || 'FREE AGENT'}</div>

            <div className={styles.mvpStats}>
              <div className={styles.mvpStat}>
                <span className={styles.mvpStatCn}>击杀 /10</span>
                <span className={styles.mvpStatEn}>ELIM / 10</span>
                <span className={styles.mvpStatValue}>{formatNum(currentMVP.avg_elim)}</span>
              </div>

              <div className={styles.mvpStat}>
                <span className={styles.mvpStatCn}>伤害 /10</span>
                <span className={styles.mvpStatEn}>DMG / 10</span>
                <span className={styles.mvpStatValue}>{formatNum(currentMVP.avg_dmg)}</span>
              </div>
            </div>

            <div className={styles.cardGhost}>MVP</div>
          </Link>
        ) : (
          <div className={`${styles.featureCard} ${styles.mvpCard}`}>
            <div className={styles.cardHead}>
              <div className={styles.cardKicker}>
                <span className={styles.cardKickerCn}>全场最佳</span>
                <span className={styles.cardKickerEn}>TOURNAMENT MVP</span>
              </div>
            </div>
            <EmptyCard />
          </div>
        )}

        {latestMatch ? (
          <Link to={`/matches/${latestMatch.match_id}`} className={`${styles.featureCard} ${styles.latestCard}`}>
            <div className={styles.cardHead}>
              <div className={styles.cardKicker}>
                <span className={styles.cardKickerCn}>最新战报</span>
                <span className={styles.cardKickerEn}>LATEST MATCH</span>
              </div>
              <span className={styles.finalBadge}>FINAL</span>
            </div>

            <div className={styles.latestMatchContent}>
              <div className={styles.latestTeam}>
                <div className={styles.latestScore}>{latestMatch.team_a?.score || 0}</div>
                <div className={styles.latestName}>{latestMatch.team_a?.short || latestMatch.team_a?.name}</div>
              </div>

              <div className={styles.latestVs}>VS</div>

              <div className={styles.latestTeam}>
                <div className={styles.latestScore}>{latestMatch.team_b?.score || 0}</div>
                <div className={styles.latestName}>{latestMatch.team_b?.short || latestMatch.team_b?.name}</div>
              </div>
            </div>
          </Link>
        ) : (
          <div className={`${styles.featureCard} ${styles.latestCard}`}>
            <div className={styles.cardHead}>
              <div className={styles.cardKicker}>
                <span className={styles.cardKickerCn}>最新战报</span>
                <span className={styles.cardKickerEn}>LATEST MATCH</span>
              </div>
            </div>
            <EmptyCard text="暂无已完成比赛" />
          </div>
        )}

        <div className={`${styles.featureCard} ${styles.teamsCard}`}>
          <div className={styles.cardHead}>
            <div className={styles.cardKicker}>
              <span className={styles.cardKickerCn}>瑞士轮积分榜</span>
              <span className={styles.cardKickerEn}>SWISS TOP TEAMS</span>
            </div>
            <Link to="/standings" className={styles.cardLink}>完整榜单</Link>
          </div>

          <div className={styles.teamsList}>
            {topTeams.length > 0 ? topTeams.map((team, idx) => (
              <Link key={team.team_id || idx} to={`/teams/${team.team_id}`} className={styles.teamRow}>
                <div className={styles.teamRank}>0{team.rank}</div>
                <div className={styles.teamName}>{team.team_short_name || team.team_name}</div>

                <div className={styles.teamRecord}>
                  <span className={styles.textWin}>{team.match_wins}W</span>
                  <span className={styles.textLoss}>{team.match_losses}L</span>
                </div>

                <div className={styles.teamDiff}>
                  {team.map_diff > 0 ? `+${team.map_diff}` : team.map_diff}
                  <span className={styles.teamDiffEn}>DIFF</span>
                </div>
              </Link>
            )) : (
              <EmptyCard text="赛事尚未产出积分" />
            )}
          </div>
        </div>

        <div className={`${styles.featureCard} ${styles.lineupCard}`}>
          <div className={styles.cardHead}>
            <div className={styles.cardKicker}>
              <span className={styles.cardKickerCn}>数据最佳阵容</span>
              <span className={styles.cardKickerEn}>BEST LINEUP BY METRICS</span>
            </div>
            <Link to="/leaderboard" className={styles.cardLink}>查看完整排行</Link>
          </div>

          <div className={styles.lineupGrid}>
            <LineupSlot cn="坦克" en="TANK" roleTheme="TANK" player={bestLineup.tank} subrole="TANK" />
            <LineupSlot cn="输出（击杀）" en="DPS · ELIM" roleTheme="DPS" player={bestLineup.elimDps} subrole="ELIM_DPS" />
            <LineupSlot cn="输出（伤害）" en="DPS · DAMAGE" roleTheme="DPS" player={bestLineup.damageDps} subrole="DMG_DPS" />
            <LineupSlot cn="辅助（助攻）" en="SUPPORT · ASSIST" roleTheme="SUP" player={bestLineup.assistSup} subrole="AST_SUP" />
            <LineupSlot cn="辅助（治疗）" en="SUPPORT · HEAL" roleTheme="SUP" player={bestLineup.healSup} subrole="HEAL_SUP" />
          </div>
        </div>
      </section>
    </div>
  )
}