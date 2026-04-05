import { useMemo, useEffect } from 'react'
import { useOutletContext, useParams, useNavigate } from 'react-router-dom'
import MatchHeader from '../../components/matches/MatchHeader.jsx'
import MapCard from '../../components/matches/MapCard.jsx'
import { getMatchById, safeArr } from '../../lib/selectors.js'
import styles from './MatchDetailPage.module.css'

// 🌟 修改：接收 isForfeit，适配顶部状态栏显示
function getStatusInfo(status, isForfeit) {
  if (status === 'IN_PROGRESS') return { cn: '进行中', en: 'LIVE', className: styles.statusLive }
  if (status === 'COMPLETE' || status === 'COMPLETED') {
    if (isForfeit) return { cn: '弃权完结', en: 'FORFEIT', className: styles.statusComplete }
    return { cn: '已完结', en: 'COMPLETED', className: styles.statusComplete }
  }
  return { cn: '未开始', en: 'PENDING', className: styles.statusPending }
}

export default function MatchDetailPage() {
  const { db } = useOutletContext()
  const { matchId } = useParams()
  const navigate = useNavigate()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const handleBack = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1)
    } else {
      navigate('/matches')
    }
  }

  const match = useMemo(() => getMatchById(db, matchId), [db, matchId])

  const playedMapsList = useMemo(() => {
    return safeArr(match?.maps).filter(map => {
      const hasWinner = Boolean(map?.winner && map?.winner !== 'UNKNOWN')
      const scoreA = Number(map?.score_a) || 0
      const scoreB = Number(map?.score_b) || 0
      const hasScore = scoreA > 0 || scoreB > 0
      const allStats = [...safeArr(map?.team_a_stats), ...safeArr(map?.team_b_stats)]
      const hasRealStats = allStats.some(p =>
        Number(p.damage) > 0 ||
        Number(p.healing) > 0 ||
        Number(p.eliminations) > 0 ||
        (p.heroes_played && p.heroes_played !== '-' && p.heroes_played !== 'UNKNOWN')
      )
      return hasWinner || hasScore || hasRealStats
    })
  }, [match])

  const summary = useMemo(() => ({
    totalMaps: safeArr(match?.maps).length,
    playedMaps: playedMapsList.length
  }), [match, playedMapsList])

  if (!match) {
    return (
      <div className={styles.shell}>
        <section className={styles.errorState}>
          <div className={styles.errorKicker}>SYSTEM ALERT / 404</div>
          <h1 className={styles.errorTitle}>未找到对局档案</h1>
          <p className={styles.errorDesc}>
            请求的比赛编号 <span className={styles.errorCode}>[{matchId}]</span> 不存在，或已被移出当前赛季数据库。
          </p>
          <button type="button" onClick={handleBack} className={styles.backLinkBtn}>
            返回比赛大厅
            <span className={styles.backLinkBtnEn}>MATCHES</span>
          </button>
        </section>
      </div>
    )
  }

  // 🌟 传入 is_forfeit
  const statusInfo = getStatusInfo(match.status, match.is_forfeit)

  return (
    <div className={styles.shell}>
      <div className={styles.topbar}>
        <div className={styles.topbarLeft}>
          <button type="button" onClick={handleBack} className={styles.navBackBtn}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            <span className={styles.navBackText}>
              <span className={styles.navBackCn}>返回大厅</span>
              <span className={styles.navBackEn}>MATCHES</span>
            </span>
          </button>

          <div className={styles.topbarPathGroup}>
            <div className={styles.topbarKicker}>
              <span className={styles.topbarKickerCn}>对局档案</span>
              <span className={styles.topbarKickerEn}>MATCH ARCHIVE</span>
            </div>
            <div className={styles.topbarPath}>
              <span className={styles.topbarDivider}>/</span>
              <span className={styles.topbarCurrent}>{match.match_id || 'UNKNOWN'}</span>
            </div>
          </div>
        </div>

        <div className={styles.topbarRight}>
          <span className={styles.topbarMeta}>
            <span className={styles.metaText}>
              <span className={styles.metaCn}>最后同步</span>
              <span className={styles.metaEn}>UPDATED</span>
            </span>
            <span className={styles.metaValue}>{match.updated_at || '-'}</span>
          </span>
        </div>
      </div>

      <MatchHeader match={match} />

      <section className={styles.infoBar}>
        <span className={styles.tagItem}>
          <span className={styles.tagLabelGroup}>
            <span className={styles.tagLabel}>赛段</span>
            <span className={styles.tagLabelEn}>STAGE</span>
          </span>
          <span className={styles.tagVal}>{match.stage || 'TBD'}</span>
        </span>

        <span className={styles.tagItem}>
          <span className={styles.tagLabelGroup}>
            <span className={styles.tagLabel}>轮次</span>
            <span className={styles.tagLabelEn}>ROUND</span>
          </span>
          <span className={styles.tagVal}>{match.round || 'TBD'}</span>
        </span>

        <span className={styles.tagItem}>
          <span className={styles.tagLabelGroup}>
            <span className={styles.tagLabel}>赛制</span>
            <span className={styles.tagLabelEn}>FORMAT</span>
          </span>
          <span className={styles.tagVal}>{match.format || 'TBD'}</span>
        </span>

        <span className={`${styles.tagItem} ${styles.statusItem}`}>
          <span className={styles.tagLabelGroup}>
            <span className={styles.tagLabel}>当前状态</span>
            <span className={styles.tagLabelEn}>STATUS</span>
          </span>
          <span className={`${styles.tagValHighlight} ${statusInfo.className}`}>
            {statusInfo.cn}
            <span className={styles.statusEn}>{statusInfo.en}</span>
          </span>
        </span>

        <span className={styles.tagItem}>
          <span className={styles.tagLabelGroup}>
            <span className={styles.tagLabel}>地图进度</span>
            <span className={styles.tagLabelEn}>MAPS</span>
          </span>
          <span className={styles.tagVal}>
            {match.is_forfeit ? 'N/A' : summary.playedMaps} {/* 🌟 弃权时地图进度显示 N/A */}
            {!match.is_forfeit && (
              <>
                <span className={styles.tagDivider}>/</span>
                {summary.totalMaps}
              </>
            )}
          </span>
        </span>
      </section>

      <section className={styles.mapsSection}>
        <div className={styles.sectionHead}>
          <div className={styles.sectionHeadLeft}>
            <div className={styles.sectionKicker}>
              <span className={styles.sectionKickerCn}>地图时间轴</span>
              <span className={styles.sectionKickerEn}>MAP TIMELINE</span>
            </div>
            <div className={styles.sectionTitle}>对局流程与选手数据记录</div>
          </div>
        </div>

        <div className={styles.mapList}>
          {/* 🌟 核心拦截逻辑：如果是弃权局，直接渲染红色的警告块，不走后续的空图遍历 */}
          {match.is_forfeit ? (
            <div className={styles.noMaps} style={{ border: '1px solid rgba(248,113,113,0.3)', color: '#f87171' }}>
              <span className={styles.noMapsCn}>本场比赛因战队弃权提前结束，无详细对局数据</span>
              <span className={styles.noMapsEn}>WIN BY FORFEIT · NO MATCH DATA AVAILABLE</span>
            </div>
          ) : playedMapsList.length > 0 ? (
            playedMapsList.map(map => (
              <MapCard key={`${match.match_id}-${map.map_order}`} map={map} match={match} />
            ))
          ) : (
            <div className={styles.noMaps}>
              <span className={styles.noMapsCn}>暂无已记录的地图数据</span>
              <span className={styles.noMapsEn}>NO MAP DATA AVAILABLE</span>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}