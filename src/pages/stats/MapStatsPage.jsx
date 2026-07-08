import React, { useMemo } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import DatabaseSubnav from '../../components/database/DatabaseSubnav.jsx'
import styles from './MapStatsPage.module.css'
import { getMapStats } from '../../lib/selectors'
import { formatOwMapMode, formatOwMapName, getOwMapImageName, getOwMapModeFolder } from '../../lib/heroes.js'

function formatMapFileName(name) {
  if (!name) return 'unknown'
  return getOwMapImageName(name)
}

function getMapImageUrl(map) {
  return `/maps/${getOwMapModeFolder(map.type)}/${formatMapFileName(map.name)}.jpg`
}

function formatPercent(value) {
  return `${Number(value || 0).toFixed(1)}%`
}

const MODE_ORDER = ['Control', 'Hybrid', 'Flashpoint', 'Push', 'Escort', 'Clash']

function SummaryCard({ labelCn, labelEn, value, meta, tone = 'default' }) {
  return (
    <div className={[styles.summaryCard, styles[`summary_${tone}`]].filter(Boolean).join(' ')}>
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
  const { db, locale = 'zh-CN', withSeason = path => path } = useOutletContext()
  const isEn = locale === 'en-US'
  const { totalValidMaps, groupedByType } = useMemo(() => getMapStats(db), [db])

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
    const topMaps = [...allMaps].sort((a, b) => b.playedCount - a.playedCount).slice(0, 4)
    const modeTotals = sortedModes
      .map(mode => {
        const maps = groupedByType[mode] || []
        const plays = maps.reduce((sum, map) => sum + map.playedCount, 0)
        return {
          mode,
          mapCount: maps.length,
          plays,
          share: totalValidMaps > 0 ? (plays / totalValidMaps) * 100 : 0,
          topMap: maps[0] || null
        }
      })
      .sort((a, b) => b.plays - a.plays)

    return {
      modeCount,
      totalUniqueMaps,
      topMap,
      topMaps,
      modeTotals
    }
  }, [groupedByType, sortedModes, totalValidMaps])

  return (
    <div className={styles.shell}>
      <DatabaseSubnav />
      <section className={styles.heroSection}>
        <div className={styles.heroMain}>
          <div className={styles.heroKicker}>
            <span className={styles.heroKickerCn}>地图环境总览</span>
            <span className={styles.heroKickerEn}>MAP META REPORT</span>
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
            meta={isEn ? 'Valid map records' : '有效地图记录'}
            tone="accent"
          />
          <SummaryCard
            labelCn="模式分类"
            labelEn="MODE GROUPS"
            value={summary.modeCount}
            meta={isEn ? 'Control / Hybrid / Push ...' : '控制 / 混合 / 推进 ...'}
          />
          <SummaryCard
            labelCn="地图池规模"
            labelEn="UNIQUE MAPS"
            value={summary.totalUniqueMaps}
            meta={isEn ? 'Map pool records' : '地图池记录'}
          />
          <SummaryCard
            labelCn="当前最热地图"
            labelEn="TOP MAP"
            value={summary.topMap?.name ? formatOwMapName(summary.topMap.name, locale) : '--'}
            meta={summary.topMap
              ? (isEn ? `${summary.topMap.playedCount} plays` : `${summary.topMap.playedCount} 次登场`)
              : (isEn ? 'Awaiting records' : '等待记录')}
            tone="highlight"
          />
        </div>
      </section>

      {summary.topMaps.length > 0 ? (
        <section className={styles.overviewPanel} aria-labelledby="map-overview-title">
          <div className={styles.overviewHead}>
            <div>
              <span className={styles.overviewKicker}>GLOBAL MAP RANK</span>
              <h2 id="map-overview-title">{isEn ? 'Overall heat map' : '全局热度排行'}</h2>
            </div>

            <div className={styles.modeShareStrip}>
              {summary.modeTotals.slice(0, 3).map(row => (
                <span key={row.mode}>
                  <b>{formatOwMapMode(row.mode, locale)}</b>
                  <strong>{formatPercent(row.share)}</strong>
                </span>
              ))}
            </div>
          </div>

          <div className={styles.overviewGrid}>
            {summary.topMaps.map((map, index) => {
              const mapDisplayName = formatOwMapName(map.name, locale)
              const globalPickRate = map.pickRate * 100

              return (
                <Link
                  key={map.name}
                  to={withSeason(`/maps/${encodeURIComponent(map.name)}`)}
                  className={styles.overviewCard}
                >
                  <img
                    src={getMapImageUrl(map)}
                    alt={mapDisplayName}
                    className={styles.overviewImage}
                    onError={e => {
                      e.target.style.display = 'none'
                    }}
                  />
                  <div className={styles.overviewOverlay} />
                  <div className={styles.overviewCardBody}>
                    <span className={styles.overviewRank}>{String(index + 1).padStart(2, '0')}</span>
                    <div className={styles.overviewMapText}>
                      <strong>{mapDisplayName}</strong>
                      <span>{formatOwMapMode(map.type, locale)}</span>
                    </div>
                    <div className={styles.overviewMetric}>
                      <b>{map.playedCount}</b>
                      <span>{isEn ? 'PLAYS' : '登场'}</span>
                    </div>
                    <div className={styles.overviewBar}>
                      <span style={{ width: `${globalPickRate}%` }} />
                    </div>
                    <em>{isEn ? 'Global share' : '全局占比'} {formatPercent(globalPickRate)}</em>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      ) : null}

      <section className={styles.content}>
        {sortedModes.map(mode => {
          const mapsInMode = groupedByType[mode]
          const modeTotalPlays = mapsInMode.reduce((sum, map) => sum + map.playedCount, 0)
          const modeShareRate = totalValidMaps > 0 ? (modeTotalPlays / totalValidMaps) * 100 : 0
          const modeDisplayName = formatOwMapMode(mode, locale)
          const modeLeader = mapsInMode[0]

          return (
            <section key={mode} className={styles.modeSection}>
              <div className={styles.modeHeader}>
                <div className={styles.modeHeaderMain}>
                  <div className={styles.modeKicker}>MAP MODE</div>
                  <h2 className={styles.modeTitle}>{modeDisplayName.toUpperCase()}</h2>
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
                  <div className={styles.modeMetaCard}>
                    <span className={styles.modeMetaLabel}>MODE SHARE</span>
                    <span className={styles.modeMetaValue}>{formatPercent(modeShareRate)}</span>
                  </div>
                </div>
              </div>

              {modeLeader ? (
                <div className={styles.modeInsight}>
                  <span>{isEn ? 'Leading map' : '模式首选地图'}</span>
                  <strong>{formatOwMapName(modeLeader.name, locale)}</strong>
                  <em>
                    {modeLeader.playedCount} {isEn ? 'plays' : '次登场'} / {formatPercent(modeShareRate)} {isEn ? 'global share' : '全局占比'}
                  </em>
                </div>
              ) : null}

              <div className={styles.mapGrid}>
                {mapsInMode.map((map, index) => {
                  const relativePickRate = modeTotalPlays > 0 ? (map.playedCount / modeTotalPlays) * 100 : 0
                  const globalPickRate = map.pickRate * 100
                  const mapDisplayName = formatOwMapName(map.name, locale)
                  const mapImageUrl = getMapImageUrl(map)

                  return (
                    <Link
                      key={map.name}
                      to={withSeason(`/maps/${encodeURIComponent(map.name)}`)}
                      className={styles.mapCard}
                    >
                      <div className={styles.mapMedia}>
                        <img
                          src={mapImageUrl}
                          alt={mapDisplayName}
                          className={styles.mapImage}
                          onError={e => {
                            e.target.style.display = 'none'
                          }}
                        />
                        <div className={styles.mapImageOverlay} />
                        <span className={styles.mapIndex}>{String(index + 1).padStart(2, '0')}</span>
                      </div>

                      <div className={styles.mapCardInner}>
                        <div className={styles.mapCardTop}>
                          <div className={styles.mapTitleBlock}>
                            <span className={styles.mapName}>{mapDisplayName}</span>
                            <span className={styles.mapSubline}>{isEn ? 'Map report available' : '可查看地图详情'}</span>
                          </div>

                          <div className={styles.mapPill}>{formatOwMapMode(map.type, locale).toUpperCase()}</div>
                        </div>

                        <div className={styles.mapPrimaryRow}>
                          <div className={styles.primaryMetric}>
                            <span className={styles.primaryMetricLabel}>PLAYS</span>
                            <span className={styles.primaryMetricValue}>{map.playedCount}</span>
                          </div>

                          <div className={styles.primaryMetric}>
                            <span className={styles.primaryMetricLabel}>MODE SHARE</span>
                            <span className={styles.primaryMetricValue}>{formatPercent(relativePickRate)}</span>
                          </div>

                          <div className={styles.primaryMetric}>
                            <span className={styles.primaryMetricLabel}>GLOBAL</span>
                            <span className={styles.primaryMetricValue}>{formatPercent(globalPickRate)}</span>
                          </div>
                        </div>

                        <div className={styles.barContainer}>
                          <div className={styles.barTrack}>
                            <div className={styles.barFill} style={{ width: `${relativePickRate}%` }} />
                          </div>
                        </div>

                        <div className={styles.mapStats}>
                          <span className={styles.statText}>MODE PICK RATE · {formatPercent(relativePickRate)}</span>
                          <span className={styles.statTextMuted}>GLOBAL · {formatPercent(globalPickRate)}</span>
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
