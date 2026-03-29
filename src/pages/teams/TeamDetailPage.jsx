import { useMemo, useEffect } from 'react'
import { Link, useOutletContext, useParams, useNavigate } from 'react-router-dom'
import { safeArr, getLeaderboardRows } from '../../lib/selectors.js'
import PlayerCard from '../../components/players/PlayerCard.jsx'
import styles from './TeamDetailPage.module.css'

function cleanStr(str) {
  if (!str) return ''
  return String(str).trim().toLowerCase()
}

function normalizeRole(role) {
  const r = String(role || '').toUpperCase()
  if (r === 'SUPPORT') return 'SUP'
  return r || 'FLEX'
}

function avgOf(rows, key) {
  if (!rows.length) return 0
  return rows.reduce((sum, row) => sum + (Number(row?.[key]) || 0), 0) / rows.length
}

function formatNum(value, digits = 1) {
  const num = Number(value || 0)
  return Number.isFinite(num) ? num.toFixed(digits) : '0.0'
}

function pickFirstValue(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim() !== '') return value
  }
  return '-'
}

function getStatusInfo(match, isMyTeamA) {
  if (match.status === 'PENDING' || match.status === 'SCHEDULED') {
    return { cn: '未开始', en: 'PENDING', className: styles.resTbd }
  }

  const myScore = isMyTeamA ? Number(match.team_a?.score || 0) : Number(match.team_b?.score || 0)
  const opScore = isMyTeamA ? Number(match.team_b?.score || 0) : Number(match.team_a?.score || 0)

  if (myScore > opScore) return { cn: '胜', en: 'WIN', className: styles.resWin }
  if (myScore < opScore) return { cn: '负', en: 'LOSS', className: styles.resLoss }
  if (myScore === 0 && opScore === 0) return { cn: '待定', en: 'TBD', className: styles.resTbd }
  return { cn: '平', en: 'DRAW', className: styles.resDraw }
}

export default function TeamDetailPage() {
  const { db } = useOutletContext()
  const { teamId } = useParams()
  const navigate = useNavigate()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const handleBack = () => {
    if (window.history.state && window.history.state.idx > 0) navigate(-1)
    else navigate('/teams')
  }

  const team = useMemo(() => {
    return safeArr(db?.teams).find(t => String(t.team_id) === String(teamId))
  }, [db, teamId])

  const leaderboardRows = useMemo(() => getLeaderboardRows(db), [db])

  const roster = useMemo(() => {
    if (!team) return []

    const tId = cleanStr(team.team_id)
    const tName = cleanStr(team.team_name)

    return safeArr(db?.players).filter(p => {
      const pTId = cleanStr(p.team_id)
      const pTName = cleanStr(p.team_name)
      return pTId === tId || (pTName && pTName === tName)
    })
  }, [db, team])

  const rosterStatsRows = useMemo(() => {
    if (!team) return []

    const tId = cleanStr(team.team_id)
    const tName = cleanStr(team.team_name)

    return safeArr(leaderboardRows).filter(p => {
      const pTId = cleanStr(p.team_id)
      const pTName = cleanStr(p.team_name)
      return pTId === tId || (pTName && pTName === tName)
    })
  }, [leaderboardRows, team])

  const teamMatches = useMemo(() => {
    if (!team) return []
    const targetId = String(teamId)

    const statusOrder = { IN_PROGRESS: 0, PENDING: 1, SCHEDULED: 1, COMPLETE: 2, COMPLETED: 2 }

    return safeArr(db?.matches)
      .filter(m => String(m.team_a?.id) === targetId || String(m.team_b?.id) === targetId)
      .sort((a, b) => {
        const sa = statusOrder[a.status] ?? 99
        const sb = statusOrder[b.status] ?? 99
        if (sa !== sb) return sa - sb
        return String(a.match_id || '').localeCompare(String(b.match_id || ''))
      })
  }, [db, team, teamId])

  const staffInfo = useMemo(() => {
    const staff = team?.staff || {}
    return {
      coach: pickFirstValue(team?.coach, team?.head_coach, team?.headCoach, staff?.coach, staff?.head_coach),
      manager: pickFirstValue(team?.manager, team?.team_manager, team?.teamManager, staff?.manager),
      captain: pickFirstValue(team?.captain, team?.leader, team?.team_captain, staff?.captain),
      analyst: pickFirstValue(team?.analyst, team?.analysis, staff?.analyst)
    }
  }, [team])

  const matchSummary = useMemo(() => {
    const completedMatches = teamMatches.filter(m => m.status === 'COMPLETE' || m.status === 'COMPLETED')

    let wins = 0
    let losses = 0
    let draws = 0

    completedMatches.forEach(match => {
      const mineAsA = String(match.team_a?.id) === String(teamId)
      const myScore = mineAsA ? Number(match.team_a?.score || 0) : Number(match.team_b?.score || 0)
      const opScore = mineAsA ? Number(match.team_b?.score || 0) : Number(match.team_a?.score || 0)

      if (myScore > opScore) wins += 1
      else if (myScore < opScore) losses += 1
      else draws += 1
    })

    const completed = completedMatches.length
    const live = teamMatches.filter(m => m.status === 'IN_PROGRESS').length
    const pending = teamMatches.filter(m => m.status === 'PENDING' || m.status === 'SCHEDULED').length
    const winRate = completed > 0 ? Math.round((wins / completed) * 100) : 0

    const recentForm = completedMatches.slice(-5).map(match => {
      const mineAsA = String(match.team_a?.id) === String(teamId)
      const myScore = mineAsA ? Number(match.team_a?.score || 0) : Number(match.team_b?.score || 0)
      const opScore = mineAsA ? Number(match.team_b?.score || 0) : Number(match.team_a?.score || 0)

      if (myScore > opScore) return 'W'
      if (myScore < opScore) return 'L'
      return 'D'
    })

    return { wins, losses, draws, completed, live, pending, winRate, recentForm }
  }, [teamMatches, teamId])

  const roleStructure = useMemo(() => {
    const counts = {
      TANK: 0,
      DPS: 0,
      SUP: 0
    }

    roster.forEach(player => {
      const role = normalizeRole(player.role)
      if (role === 'TANK') counts.TANK += 1
      if (role === 'DPS') counts.DPS += 1
      if (role === 'SUP') counts.SUP += 1
    })

    return counts
  }, [roster])

  const rolePanels = useMemo(() => {
    const makeRolePanel = (role, cn, en, metrics) => {
      const rows = rosterStatsRows.filter(p => normalizeRole(p.role) === role)
      return {
        role,
        cn,
        en,
        count: roleStructure[role] || 0,
        metrics: metrics.map(metric => ({
          ...metric,
          value: rows.length > 0 ? avgOf(rows, metric.key) : null
        }))
      }
    }

    return [
      makeRolePanel('TANK', '重装阵列', 'TANK UNIT', [
        { label: '阻挡 /10', key: 'avg_block' },
        { label: '伤害 /10', key: 'avg_dmg' },
        { label: '阵亡 /10', key: 'avg_dth' }
      ]),
      makeRolePanel('DPS', '输出阵列', 'DPS UNIT', [
        { label: '击杀 /10', key: 'avg_elim' },
        { label: '伤害 /10', key: 'avg_dmg' },
        { label: '阵亡 /10', key: 'avg_dth' }
      ]),
      makeRolePanel('SUP', '支援阵列', 'SUPPORT UNIT', [
        { label: '治疗 /10', key: 'avg_heal' },
        { label: '助攻 /10', key: 'avg_ast' },
        { label: '阵亡 /10', key: 'avg_dth' }
      ])
    ]
  }, [rosterStatsRows, roleStructure])

  const teamProfile = useMemo(() => {
    const tankPanel = rolePanels.find(p => p.role === 'TANK')
    const dpsPanel = rolePanels.find(p => p.role === 'DPS')
    const supPanel = rolePanels.find(p => p.role === 'SUP')

    const tankScore =
      (tankPanel?.count || 0) * 500 +
      Number(tankPanel?.metrics?.[0]?.value || 0) +
      Number(tankPanel?.metrics?.[1]?.value || 0) * 0.6

    const dpsScore =
      (dpsPanel?.count || 0) * 500 +
      Number(dpsPanel?.metrics?.[0]?.value || 0) * 350 +
      Number(dpsPanel?.metrics?.[1]?.value || 0)

    const supScore =
      (supPanel?.count || 0) * 500 +
      Number(supPanel?.metrics?.[0]?.value || 0) +
      Number(supPanel?.metrics?.[1]?.value || 0) * 450

    if (dpsScore >= tankScore && dpsScore >= supScore) {
      return {
        tag: '进攻压制型',
        en: 'OFFENSIVE PRESSURE',
        desc: '更依赖输出位的火力制造节奏与压制，整体风格偏向主动进攻。'
      }
    }

    if (tankScore >= dpsScore && tankScore >= supScore) {
      return {
        tag: '前线推进型',
        en: 'FRONTLINE DRIVE',
        desc: '以前排承压与空间推进构成团队骨架，比赛节奏更偏向正面展开。'
      }
    }

    return {
      tag: '运营支点型',
      en: 'CONTROLLED SUPPORT',
      desc: '队伍节奏更依赖支援与协同稳定性，整体表现偏向稳态运营。'
    }
  }, [rolePanels])

  if (!team) {
    return (
      <div className={styles.shell}>
        <section className={styles.errorState}>
          <div className={styles.errorKicker}>TEAM DOSSIER / ERROR</div>
          <h1 className={styles.errorTitle}>未找到战队档案</h1>
          <p className={styles.errorDesc}>
            请求的战队编号 <span className={styles.errorCode}>[{teamId}]</span> 不存在，或未载入当前赛季数据库。
          </p>
          <button type="button" onClick={handleBack} className={styles.backLinkBtn}>
            返回战队列表
            <span className={styles.backLinkBtnEn}>TEAMS</span>
          </button>
        </section>
      </div>
    )
  }

  const isMyTeamA = match => String(match.team_a?.id) === String(teamId)

  return (
    <div className={styles.shell}>
      <div className={styles.topbar}>
        <div className={styles.topbarLeft}>
          <button type="button" onClick={handleBack} className={styles.navBackBtn}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            <span className={styles.navBackText}>
              <span className={styles.navBackCn}>返回</span>
              <span className={styles.navBackEn}>BACK</span>
            </span>
          </button>

          <div className={styles.topbarPathGroup}>
            <div className={styles.topbarKicker}>
              <span className={styles.topbarKickerCn}>战队档案</span>
              <span className={styles.topbarKickerEn}>TEAM DOSSIER</span>
            </div>
            <div className={styles.topbarPath}>
              <span className={styles.topbarDivider}>/</span>
              <span className={styles.topbarCurrent}>{team.team_short_name || team.team_id}</span>
            </div>
          </div>
        </div>
      </div>

      <section className={styles.teamHero}>
        <div className={styles.heroGlow}></div>

        <div className={styles.heroContent}>
          <div className={styles.heroLeft}>
            <div className={styles.teamIdBox}>{team.team_id}</div>
            <h1 className={styles.teamName}>{team.team_name || '未命名战队'}</h1>
            <div className={styles.teamShortName}>{team.team_short_name || team.team_name}</div>
          </div>

          <div className={styles.heroRight}>
            <div className={styles.statBox}>
              <div className={styles.statLabel}>
                <span className={styles.statCn}>注册选手</span>
                <span className={styles.statEn}>ROSTER</span>
              </div>
              <div className={styles.statValue}>{roster.length}</div>
            </div>

            <div className={styles.statBox}>
              <div className={styles.statLabel}>
                <span className={styles.statCn}>总场次</span>
                <span className={styles.statEn}>MATCHES</span>
              </div>
              <div className={styles.statValue}>{teamMatches.length}</div>
            </div>

            <div className={styles.statBox}>
              <div className={styles.statLabel}>
                <span className={styles.statCn}>胜场</span>
                <span className={styles.statEn}>WINS</span>
              </div>
              <div className={styles.statValue}>{matchSummary.wins}</div>
            </div>

            <div className={styles.statBox}>
              <div className={styles.statLabel}>
                <span className={styles.statCn}>胜率</span>
                <span className={styles.statEn}>WIN RATE</span>
              </div>
              <div className={styles.statValue}>{matchSummary.winRate}%</div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.infoGrid}>
        <div className={styles.infoPanel}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionKicker}>
              <span className={styles.sectionKickerCn}>团队管理层</span>
              <span className={styles.sectionKickerEn}>TEAM STAFF</span>
            </div>
          </div>

          <div className={styles.staffGrid}>
            <div className={styles.staffItem}>
              <span className={styles.staffLabel}>主教练 / COACH</span>
              <span className={styles.staffValue}>{staffInfo.coach}</span>
            </div>
            <div className={styles.staffItem}>
              <span className={styles.staffLabel}>经理 / MANAGER</span>
              <span className={styles.staffValue}>{staffInfo.manager}</span>
            </div>
            <div className={styles.staffItem}>
              <span className={styles.staffLabel}>队长 / CAPTAIN</span>
              <span className={styles.staffValue}>{staffInfo.captain}</span>
            </div>
            <div className={styles.staffItem}>
              <span className={styles.staffLabel}>分析 / ANALYST</span>
              <span className={styles.staffValue}>{staffInfo.analyst}</span>
            </div>
          </div>
        </div>

        <div className={styles.infoPanel}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionKicker}>
              <span className={styles.sectionKickerCn}>战队画像</span>
              <span className={styles.sectionKickerEn}>TEAM PROFILE</span>
            </div>
          </div>

          <div className={styles.profileTag}>{teamProfile.tag}</div>
          <div className={styles.profileTagEn}>{teamProfile.en}</div>
          <p className={styles.profileDesc}>{teamProfile.desc}</p>

          <div className={styles.roleStrip}>
            <span className={styles.roleChip}>TANK {roleStructure.TANK}</span>
            <span className={styles.roleChip}>DPS {roleStructure.DPS}</span>
            <span className={styles.roleChip}>SUP {roleStructure.SUP}</span>
          </div>

          <div className={styles.formRow}>
            <span className={styles.formLabel}>RECENT FORM</span>
            <div className={styles.formList}>
              {matchSummary.recentForm.length > 0 ? (
                matchSummary.recentForm.map((item, index) => (
                  <span
                    key={`${item}-${index}`}
                    className={`${styles.formChip} ${item === 'W' ? styles.formWin : item === 'L' ? styles.formLoss : styles.formDraw}`}
                  >
                    {item}
                  </span>
                ))
              ) : (
                <span className={styles.formEmpty}>NO DATA</span>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className={styles.roleAnalyticsSection}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionKicker}>
            <span className={styles.sectionKickerCn}>职责数据面板</span>
            <span className={styles.sectionKickerEn}>ROLE PANELS</span>
          </div>
        </div>

        <div className={styles.rolePanels}>
          {rolePanels.map(panel => (
            <div key={panel.role} className={styles.rolePanel}>
              <div className={styles.rolePanelHead}>
                <div className={styles.rolePanelTitleGroup}>
                  <div className={styles.rolePanelTitle}>{panel.cn}</div>
                  <div className={styles.rolePanelSub}>{panel.en}</div>
                </div>
                <div className={styles.rolePanelCount}>{panel.count}</div>
              </div>

              <div className={styles.roleMetrics}>
                {panel.metrics.map(metric => (
                  <div key={metric.label} className={styles.roleMetric}>
                    <span className={styles.roleMetricLabel}>{metric.label}</span>
                    <span className={styles.roleMetricValue}>
                      {metric.value === null ? '-' : formatNum(metric.value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className={styles.contentGrid}>
        <div className={styles.mainColumn}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionKicker}>
              <span className={styles.sectionKickerCn}>首发花名册</span>
              <span className={styles.sectionKickerEn}>ACTIVE ROSTER</span>
            </div>
          </div>

          {roster.length > 0 ? (
            <div className={styles.rosterGrid}>
              {roster.map(player => (
                <PlayerCard key={player.player_id} player={player} />
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <span className={styles.emptyCn}>暂无注册选手</span>
              <span className={styles.emptyEn}>NO ROSTER DATA</span>
            </div>
          )}
        </div>

        <div className={styles.sideColumn}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionKicker}>
              <span className={styles.sectionKickerCn}>近期赛程</span>
              <span className={styles.sectionKickerEn}>MATCH HISTORY</span>
            </div>
          </div>

          <div className={styles.matchList}>
            {teamMatches.length > 0 ? teamMatches.map(match => {
              const mineAsA = isMyTeamA(match)
              const statusInfo = getStatusInfo(match, mineAsA)

              const myTeamObj = mineAsA ? match.team_a : match.team_b
              const opTeamObj = mineAsA ? match.team_b : match.team_a

              const myName = myTeamObj?.short || myTeamObj?.name || 'TBD'
              const opName = opTeamObj?.short || opTeamObj?.name || 'TBD'

              const isPending = match.status === 'PENDING' || match.status === 'SCHEDULED'
              const myScore = isPending ? '-' : (myTeamObj?.score ?? '0')
              const opScore = isPending ? '-' : (opTeamObj?.score ?? '0')

              return (
                <Link key={match.match_id} to={`/matches/${match.match_id}`} className={styles.matchRow}>
                  <div className={`${styles.matchResult} ${statusInfo.className}`}>
                    <span className={styles.matchResultCn}>{statusInfo.cn}</span>
                    <span className={styles.matchResultEn}>{statusInfo.en}</span>
                  </div>

                  <div className={styles.matchMain}>
                    <div className={styles.matchMeta}>
                      <span className={styles.matchStage}>{match.stage || 'TBD'}</span>
                      <span className={styles.matchRound}>{match.round || '-'}</span>
                    </div>

                    <div className={styles.matchScoreboard}>
                      <div className={styles.myTeam}>
                        <span className={styles.teamText}>{myName}</span>
                        <span className={statusInfo.en === 'WIN' ? styles.scoreWin : styles.scoreNormal}>{myScore}</span>
                      </div>

                      <div className={styles.vsDivider}>VS</div>

                      <div className={styles.opTeam}>
                        <span className={statusInfo.en === 'LOSS' ? styles.scoreWin : styles.scoreNormal}>{opScore}</span>
                        <span className={styles.teamText}>{opName}</span>
                      </div>
                    </div>
                  </div>

                  <div className={styles.matchArrow}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </div>
                </Link>
              )
            }) : (
              <div className={styles.emptyState}>
                <span className={styles.emptyCn}>暂无比赛记录</span>
                <span className={styles.emptyEn}>NO MATCH HISTORY</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}