import React, { useMemo } from 'react'
import { Link } from 'react-router-dom'
import styles from './MapStatsPage.module.css'
import db from '../../../public/data/friescup_db.json'
import { getMapStats } from '../../lib/selectors'

function formatMapFileName(name) {
  if (!name) return 'unknown'
  return name.replace(/: /g, '_').replace(/ /g, '_')
}

const MODE_ORDER = ['Control', 'Hybrid', 'Flashpoint', 'Push', 'Escort', 'Clash']

function SummaryCard({ labelCn, labelEn, value, meta, tone = 'default' }) {
  return (
    <div className={`${styles.summaryCard} ${styles[`summary_${tone}`]}`}>
      <div className={styles.summaryLabel}>
        <span className={styles.summaryCn}>{labelCn}</span>
        <span className={styles.summaryEn}>{labelEn}</span>
      </div>
      <div className={styles.summaryValue}>{value}</div>
      {meta ? <div className={styles.summaryMeta}>{meta}</div> : null}
    </div>
  )
}

const MapStatsPage = () => {
  const { totalValidMaps, groupedByType } = useMemo(() => getMapStats(db), [])

  const sortedModes = useMemo(() => {
    return Object.keys(groupedByType).sort((a, b) => {
      const indexA = MODE_ORDER.indexOf(a)
      const indexB = MODE_ORDER.indexOf(b)
      return (indexA === -1 ? 99 : indexA) - (indexB === -1 ? 99 : indexB)
    })
  }, [groupedByType])

  const summary = useMemo(() => {
    const modeCount = sortedModes.length
    const allMaps = sortedModes.flatMap(mode => groupedByType[mode] || [])
    const totalUniqueMaps = allMaps.length
    const topMap = [...allMaps].sort((a, b) => b.playedCount - a.playedCount)[0]
    return {
      modeCount,
      totalUniqueMaps,
      topMap
    }
  }, [groupedByType, sortedModes])

  return (
    <div className={styles.shell}>
      <section className={styles.heroSection}>
        <div className={styles.heroMain}>
          <div className={styles.heroKicker}>
            <span className={styles.heroKickerCn}>地图环境总览</span>
            <span className={styles.heroKickerEn}>MAP DATA CENTER</span>
          </div>

          <h1 className={styles.heroTitle}>地图登场数据</h1>

          <p className={styles.heroDesc}>
            本页统计当前赛季所有有效对局中的地图登场次数。可快速查看各模式下的
            <strong> 热门地图分布</strong>、<strong>模式内部占比</strong> 与
            <strong> 全局登场率</strong>。
          </p>

          <div className={styles.ruleStrip}>
            <span className={styles.ruleChip}>GROUPED BY MODE</span>
            <span className={styles.ruleChip}>MAP PICK RATE</span>
            <span className={styles.ruleChip}>GLOBAL SHARE</span>
          </div>
        </div>

        <div className={styles.heroSummary}>
          <SummaryCard
            labelCn="有效地图总数"
            labelEn="TOTAL MAPS PLAYED"
            value={totalValidMaps}
            meta="ALL VALID MAP RECORDS"
            tone="accent"
          />
          <SummaryCard
            labelCn="模式分类"
            labelEn="MODE GROUPS"
            value={summary.modeCount}
            meta="CONTROL / HYBRID / PUSH ..."
          />
          <SummaryCard
            labelCn="地图池规模"
            labelEn="UNIQUE MAPS"
            value={summary.totalUniqueMaps}
            meta="MAPS IN DATABASE"
          />
          <SummaryCard
            labelCn="当前最热地图"
            labelEn="TOP MAP"
            value={summary.topMap?.name || '--'}
            meta={summary.topMap ? `${summary.topMap.playedCount} PLAYS` : 'NO DATA'}
            tone="highlight"
          />
        </div>
      </section>

      <section className={styles.content}>
        {sortedModes.map(mode => {
          const mapsInMode = groupedByType[mode]
          const modeTotalPlays = mapsInMode.reduce((sum, map) => sum + map.playedCount, 0)

          return (
            <section key={mode} className={styles.modeSection}>
              <div className={styles.modeHeader}>
                <div className={styles.modeHeaderMain}>
                  <div className={styles.modeKicker}>MAP MODE</div>
                  <h2 className={styles.modeTitle}>{mode.toUpperCase()}</h2>
                </div>

                <div className={styles.modeMetaGroup}>
                  <div className={styles.modeMetaCard}>
                    <span className={styles.modeMetaLabel}>MAP COUNT</span>
                    <span className={styles.modeMetaValue}>{mapsInMode.length}</span>
                  </div>
                  <div className={styles.modeMetaCard}>
                    <span className={styles.modeMetaLabel}>TOTAL PLAYS</span>
                    <span className={styles.modeMetaValue}>{modeTotalPlays}</span>
                  </div>
                </div>
              </div>

              <div className={styles.mapGrid}>
                {mapsInMode.map((map, index) => {
                  const relativePickRate = modeTotalPlays > 0 ? (map.playedCount / modeTotalPlays) * 100 : 0
                  const globalPickRate = map.pickRate * 100
                  const mapImageUrl = `/maps/${map.type}/${formatMapFileName(map.name)}.jpg`

                  return (
                    <Link
                      key={map.name}
                      to={`/maps/${encodeURIComponent(map.name)}`}
                      className={styles.mapCard}
                    >
                      <div className={styles.mapBgWrapper}>
                        <img
                          src={mapImageUrl}
                          alt={map.name}
                          className={styles.mapBgImg}
                          onError={e => {
                            e.target.style.display = 'none'
                          }}
                        />
                        <div className={styles.mapBgOverlay} />
                      </div>

                      <div className={styles.mapCardInner}>
                        <div className={styles.mapCardTop}>
                          <div className={styles.mapTitleBlock}>
                            <span className={styles.mapIndex}>{String(index + 1).padStart(2, '0')}</span>
                            <span className={styles.mapName}>{map.name}</span>
                          </div>

                          <div className={styles.mapPill}>{map.type.toUpperCase()}</div>
                        </div>

                        <div className={styles.mapPrimaryRow}>
                          <div className={styles.primaryMetric}>
                            <span className={styles.primaryMetricLabel}>PLAYS</span>
                            <span className={styles.primaryMetricValue}>{map.playedCount}</span>
                          </div>

                          <div className={styles.primaryMetric}>
                            <span className={styles.primaryMetricLabel}>MODE SHARE</span>
                            <span className={styles.primaryMetricValue}>{relativePickRate.toFixed(1)}%</span>
                          </div>
                        </div>

                        <div className={styles.barContainer}>
                          <div className={styles.barTrack}>
                            <div className={styles.barFill} style={{ width: `${relativePickRate}%` }} />
                          </div>
                        </div>

                        <div className={styles.mapStats}>
                          <span className={styles.statText}>MODE PICK RATE · {relativePickRate.toFixed(1)}%</span>
                          <span className={styles.statTextMuted}>GLOBAL · {globalPickRate.toFixed(1)}%</span>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </section>
          )
        })}
      </section>
    </div>
  )
}

export default MapStatsPage