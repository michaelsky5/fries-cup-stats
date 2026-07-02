import React, { useMemo } from 'react'
import { useParams, Link, useOutletContext } from 'react-router-dom'
import DatabaseSubnav from '../../components/database/DatabaseSubnav.jsx'
import styles from './MapDetailPage.module.css'
import { getMapDetail, safeArr } from '../../lib/selectors'
import {
  formatOwHeroName,
  formatOwMapMode,
  formatOwMapName,
  getOwHeroCanonicalName,
  getOwMapImageName,
  getOwMapModeFolder
} from '../../lib/heroes.js'

function formatMapFileName(name) {
  if (!name) return 'unknown'
  return getOwMapImageName(name)
}

function SummaryCard({ labelCn, labelEn, value, meta, tone = 'default' }) {
  return (
    <div className={`${styles.summaryCard} ${styles[`summary_${tone}`] || ''}`}>
      <div className={styles.summaryLabel}>
        <span className={styles.summaryCn}>{labelCn}</span>
        <span className={styles.summaryEn}>{labelEn}</span>
      </div>
      <div className={styles.summaryValue}>{value}</div>
      {meta ? <div className={styles.summaryMeta}>{meta}</div> : null}
    </div>
  )
}

function RecordCard({ label, value, player, hero, tone = '', locale = 'zh-CN' }) {
  const heroText = locale === 'en-US' ? `on ${hero}` : `使用 ${hero}`

  return (
    <div className={`${styles.recordCard} ${tone ? styles[tone] : ''}`}>
      <div className={styles.recordLabel}>{label}</div>
      <div className={styles.recordValue}>{value}</div>
      <div className={styles.recordPlayer}>
        {player || '--'} {hero ? <span className={styles.dim}>{heroText}</span> : null}
      </div>
    </div>
  )
}

function RankedBarItem({ rank, title, sub, rateText, width, barTone = 'yellow' }) {
  return (
    <div className={styles.listItem}>
      <div className={styles.rankNum}>{rank}</div>

      <div className={styles.itemInfo}>
        <span className={styles.itemTitle}>{title}</span>
        <span className={styles.itemSub}>{sub}</span>
      </div>

      <div className={styles.barArea}>
        <div className={styles.barWrap}>
          <div
            className={`${styles.barFill} ${barTone === 'gray' ? styles.bgGray : styles.bgYellow}`}
            style={{ width }}
          />
        </div>
        <span className={styles.rateText}>{rateText}</span>
      </div>
    </div>
  )
}

const MapDetailPage = () => {
  const { mapName } = useParams()
  const { db, locale = 'zh-CN', withSeason = path => path } = useOutletContext()
  const isEn = locale === 'en-US'
  const decodedMapName = decodeURIComponent(mapName || '')
  const displayMapName = formatOwMapName(decodedMapName, locale)

  const data = useMemo(() => {
    const baseData = getMapDetail(db, decodedMapName)
    if (!baseData || baseData.totalPlays === 0) return null

    let maxAssists = { value: 0, player: '', hero: '' }
    let maxMitigation = { value: 0, player: '', hero: '' }
    const recentMatches = []

    const matches = safeArr(db?.matches)
    matches.forEach(match => {
      if (match.status !== 'COMPLETE' && match.status !== 'COMPLETED') return
      const mapObj = safeArr(match.maps).find(m => m.map_name === decodedMapName)
      if (!mapObj) return

      recentMatches.push({
        matchId: match.match_id,
        stage: match.stage,
        round: match.round,
        teamA: match.team_a?.short || match.team_a?.name,
        teamB: match.team_b?.short || match.team_b?.name,
        scoreA: mapObj.score_a,
        scoreB: mapObj.score_b,
        winnerLabel: mapObj.winner_label,
        winnerId: mapObj.winner
      })

      const allStats = [...safeArr(mapObj.team_a_stats), ...safeArr(mapObj.team_b_stats)]
      allStats.forEach(stat => {
      if (!stat.heroes_played) return
      const ast = Number(stat.assists) || 0
      const mit = Number(stat.mitigation) || 0
      const hero = getOwHeroCanonicalName(stat.heroes_played)
      const cleanName = (stat.player_name || (isEn ? 'Unknown Player' : '未知选手')).split('#')[0]

        if (ast > maxAssists.value) maxAssists = { value: ast, player: cleanName, hero }
        if (mit > maxMitigation.value) maxMitigation = { value: mit, player: cleanName, hero }
      })
    })

    recentMatches.reverse()

    return {
      ...baseData,
      records: {
        ...baseData.records,
        maxAssists,
        maxMitigation
      },
      recentMatches
    }
  }, [db, decodedMapName, isEn])

  const mapType = useMemo(() => {
    const allMaps = safeArr(db?.matches).flatMap(match => safeArr(match?.maps))
    const found = allMaps.find(map => map.map_name === decodedMapName)
    return found?.map_type || 'UNKNOWN'
  }, [db, decodedMapName])

  const mapImageUrl = `/maps/${getOwMapModeFolder(mapType)}/${formatMapFileName(decodedMapName)}.jpg`

  if (!data || data.totalPlays === 0) {
    return (
      <div className={styles.shell}>
        <DatabaseSubnav />
        <div className={styles.errorShell}>
          <div className={styles.errorPanel}>
            <div className={styles.errorKicker}>{isEn ? 'Map Report' : '地图报告'}</div>
            <h2 className={styles.errorTitle}>{isEn ? 'No map records yet' : '暂无地图记录'}</h2>
            <p className={styles.errorDesc}>
              {isEn
                ? 'This map has no valid match records yet, or its name does not match the current season data.'
                : '该地图尚未进行任何有效对局，或地图名称与当前赛季记录不匹配。'}
            </p>
            <Link to={withSeason('/maps')} className={styles.backBtn}>
              {isEn ? '← Back to maps' : '← 返回地图列表'}
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const avgTime = data.avgMatchTime || '--'
  const topHero = data.heroStats?.[0]
  const topTeam = data.teamWinRates?.[0]

  return (
    <div className={styles.shell}>
      <DatabaseSubnav />
      <Link to={withSeason('/maps')} className={styles.backLink}>
        ← 返回全联盟地图数据 / BACK TO ALL MAPS
      </Link>

      <section className={styles.heroSection}>
        <div className={styles.heroBgWrapper}>
          <img
            src={mapImageUrl}
            alt={displayMapName}
            className={styles.heroBgImg}
            onError={e => {
              e.target.style.display = 'none'
            }}
          />
          <div className={styles.heroBgOverlay} />
        </div>

        <div className={styles.heroMain}>
          <div className={styles.heroKicker}>
            <span className={styles.heroKickerCn}>地图情报页</span>
            <span className={styles.heroKickerEn}>MAP INTEL</span>
          </div>

          <h1 className={styles.heroTitle}>{displayMapName}</h1>

          <div className={styles.heroMeta}>
            <span className={styles.metaBadge}>{formatOwMapMode(mapType, locale).toUpperCase()}</span>
            <span className={styles.metaText}>
              PLAYS <strong>{data.totalPlays}</strong>
            </span>
            <span className={styles.metaText}>
              AVG TIME <strong>{avgTime}</strong>
            </span>
          </div>

          <p className={styles.heroDesc}>
            查看该地图在当前赛季的综合表现，包括 <strong>出场频率</strong>、
            <strong>单图极值记录</strong>、<strong>英雄环境</strong>、
            <strong>战队胜率</strong> 与 <strong>近期战报</strong>。
          </p>

          <div className={styles.ruleStrip}>
            <span className={styles.ruleChip}>MAP RECORDS</span>
            <span className={styles.ruleChip}>HERO META</span>
            <span className={styles.ruleChip}>TEAM PERFORMANCE</span>
            <span className={styles.ruleChip}>RECENT MATCHES</span>
          </div>
        </div>

        <div className={styles.heroSummary}>
          <SummaryCard
            labelCn="总计出场"
            labelEn="TOTAL PLAYS"
            value={data.totalPlays}
            meta={isEn ? 'Valid map records' : '有效地图记录'}
            tone="accent"
          />
          <SummaryCard
            labelCn="平均时长"
            labelEn="AVG TIME"
            value={avgTime}
            meta={isEn ? 'Average map duration' : '平均单图时长'}
          />
          <SummaryCard
            labelCn="最常见英雄"
            labelEn="TOP HERO"
            value={topHero?.hero ? formatOwHeroName(topHero.hero, locale) : '--'}
            meta={topHero
              ? (isEn ? `${topHero.count} picks` : `${topHero.count} 次出场`)
              : (isEn ? 'Awaiting records' : '等待记录')}
          />
          <SummaryCard
            labelCn="最佳战队"
            labelEn="TOP TEAM"
            value={topTeam?.name || '--'}
            meta={topTeam
              ? (isEn ? `${(topTeam.winRate * 100).toFixed(1)}% win rate` : `${(topTeam.winRate * 100).toFixed(1)}% 胜率`)
              : (isEn ? 'Awaiting records' : '等待记录')}
            tone="highlight"
          />
        </div>
      </section>

      <section className={styles.recordsSection}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionHeaderMain}>
            <div className={styles.sectionKicker}>MAP RECORDS</div>
            <h2 className={styles.sectionTitle}>极值记录</h2>
          </div>
          <span className={styles.sectionMeta}>PEAK PERFORMANCES ON THIS MAP</span>
        </div>

        <div className={styles.recordGrid}>
          <RecordCard
            label="最高击杀 / ELIMS"
            value={data.records.maxElims.value}
            player={data.records.maxElims.player}
            hero={formatOwHeroName(data.records.maxElims.hero, locale)}
            locale={locale}
            tone="recordAccent"
          />
          <RecordCard
            label="最多助攻 / ASSISTS"
            value={data.records.maxAssists.value}
            player={data.records.maxAssists.player}
            hero={formatOwHeroName(data.records.maxAssists.hero, locale)}
            locale={locale}
          />
          <RecordCard
            label="最高伤害 / DAMAGE"
            value={Number(data.records.maxDamage.value || 0).toLocaleString()}
            player={data.records.maxDamage.player}
            hero={formatOwHeroName(data.records.maxDamage.hero, locale)}
            locale={locale}
          />
          <RecordCard
            label="最高治疗 / HEALING"
            value={Number(data.records.maxHealing.value || 0).toLocaleString()}
            player={data.records.maxHealing.player}
            hero={formatOwHeroName(data.records.maxHealing.hero, locale)}
            locale={locale}
          />
          <RecordCard
            label="最高阻挡 / MITIGATION"
            value={Number(data.records.maxMitigation.value || 0).toLocaleString()}
            player={data.records.maxMitigation.player}
            hero={formatOwHeroName(data.records.maxMitigation.hero, locale)}
            locale={locale}
          />
        </div>
      </section>

      <div className={styles.mainGrid}>
        <section className={styles.panelSection}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionHeaderMain}>
              <div className={styles.sectionKicker}>HERO META</div>
              <h2 className={styles.sectionTitle}>英雄环境</h2>
            </div>
            <span className={styles.sectionMeta}>PICK RATE DISTRIBUTION</span>
          </div>

          <div className={styles.listContainer}>
            {data.heroStats.slice(0, 15).map((hero, index) => {
              const pickRatePercent = (hero.pickRate * 100).toFixed(1)
              return (
                <RankedBarItem
                  key={hero.hero}
                  rank={index + 1}
                  title={formatOwHeroName(hero.hero, locale)}
                  sub={`${hero.count} 次出场`}
                  rateText={`${pickRatePercent}%`}
                  width={`${pickRatePercent}%`}
                />
              )
            })}
          </div>
        </section>

        <section className={styles.panelSection}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionHeaderMain}>
              <div className={styles.sectionKicker}>TEAM WIN RATES</div>
              <h2 className={styles.sectionTitle}>战队胜率</h2>
            </div>
            <span className={styles.sectionMeta}>MAP DOMINANCE</span>
          </div>

          <div className={styles.listContainer}>
            {data.teamWinRates.map((team, index) => {
              const winRatePercent = (team.winRate * 100).toFixed(1)
              return (
                <RankedBarItem
                  key={team.name}
                  rank={index + 1}
                  title={team.name}
                  sub={`${team.wins}胜 / ${team.plays - team.wins}负`}
                  rateText={`${winRatePercent}%`}
                  width={`${winRatePercent}%`}
                  barTone={team.winRate >= 0.5 ? 'yellow' : 'gray'}
                />
              )
            })}
          </div>
        </section>
      </div>

      <section className={styles.recentSection}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionHeaderMain}>
            <div className={styles.sectionKicker}>RECENT MATCHES</div>
            <h2 className={styles.sectionTitle}>近期交战</h2>
          </div>
          <span className={styles.sectionMeta}>MATCH HISTORY ON THIS MAP</span>
        </div>

        <div className={styles.recentGrid}>
          {data.recentMatches.map((m, idx) => {
            const isDraw = m.winnerId === 'DRAW' || Number(m.scoreA) === Number(m.scoreB)
            return (
              <Link to={withSeason(`/matches/${m.matchId}`)} key={`${m.matchId}-${idx}`} className={styles.matchCard}>
                <div className={styles.matchMetaInfo}>
                  <span className={styles.matchStage}>
                    {m.stage} · {m.round}
                  </span>
                  <span className={styles.matchId}>{m.matchId}</span>
                </div>

                <div className={styles.matchScoreboard}>
                  <div className={`${styles.teamTag} ${m.winnerLabel === m.teamA && !isDraw ? styles.textYellow : ''}`}>
                    {m.teamA}
                  </div>

                  <div className={styles.scoreBox}>
                    <span className={styles.scoreNum}>{m.scoreA}</span>
                    <span className={styles.scoreDiv}>-</span>
                    <span className={styles.scoreNum}>{m.scoreB}</span>
                  </div>

                  <div className={`${styles.teamTag} ${m.winnerLabel === m.teamB && !isDraw ? styles.textYellow : ''}`}>
                    {m.teamB}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </section>
    </div>
  )
}

export default MapDetailPage
