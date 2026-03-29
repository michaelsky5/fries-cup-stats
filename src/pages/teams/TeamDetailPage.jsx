import { useMemo, useEffect } from 'react'
import { Link, useOutletContext, useParams, useNavigate } from 'react-router-dom'
import { safeArr } from '../../lib/selectors.js'
import PlayerCard from '../../components/players/PlayerCard.jsx'
import styles from './TeamDetailPage.module.css'

function cleanStr(str) {
  if (!str) return ''
  return String(str).trim().toLowerCase()
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

  const summary = useMemo(() => {
    const completed = teamMatches.filter(m => m.status === 'COMPLETE' || m.status === 'COMPLETED').length
    const live = teamMatches.filter(m => m.status === 'IN_PROGRESS').length
    return {
      roster: roster.length,
      matches: teamMatches.length,
      completed,
      live
    }
  }, [roster, teamMatches])

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
              <div className={styles.statValue}>{summary.roster}</div>
            </div>

            <div className={styles.statBox}>
              <div className={styles.statLabel}>
                <span className={styles.statCn}>记录场次</span>
                <span className={styles.statEn}>MATCHES</span>
              </div>
              <div className={styles.statValue}>{summary.matches}</div>
            </div>

            <div className={styles.statBox}>
              <div className={styles.statLabel}>
                <span className={styles.statCn}>已完结</span>
                <span className={styles.statEn}>COMPLETE</span>
              </div>
              <div className={styles.statValue}>{summary.completed}</div>
            </div>

            <div className={styles.statBox}>
              <div className={styles.statLabel}>
                <span className={styles.statCn}>进行中</span>
                <span className={styles.statEn}>LIVE</span>
              </div>
              <div className={`${styles.statValue} ${summary.live > 0 ? styles.liveValue : ''}`}>{summary.live}</div>
            </div>
          </div>
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