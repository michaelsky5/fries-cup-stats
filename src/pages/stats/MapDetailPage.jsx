import React, { useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import styles from './MapDetailPage.module.css'
import db from '../../../public/data/friescup_db.json'
import { getMapDetail, safeArr } from '../../lib/selectors'

function formatMapFileName(name) {
  if (!name) return 'unknown'
  return name.replace(/: /g, '_').replace(/ /g, '_')
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

function RecordCard({ label, value, player, hero, tone = '' }) {
  return (
    <div className={`${styles.recordCard} ${tone ? styles[tone] : ''}`}>
      <div className={styles.recordLabel}>{label}</div>
      <div className={styles.recordValue}>{value}</div>
      <div className={styles.recordPlayer}>
        {player || '--'} {hero ? <span className={styles.dim}>on {hero}</span> : null}
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
  const decodedMapName = decodeURIComponent(mapName || '')

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
        const cleanName = (stat.player_name || 'Unknown').split('#')[0]

        if (ast > maxAssists.value) maxAssists = { value: ast, player: cleanName, hero: stat.heroes_played }
        if (mit > maxMitigation.value) maxMitigation = { value: mit, player: cleanName, hero: stat.heroes_played }
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
  }, [decodedMapName])

  const mapType = useMemo(() => {
    const allMaps = safeArr(db?.matches).flatMap(match => safeArr(match?.maps))
    const found = allMaps.find(map => map.map_name === decodedMapName)
    return found?.map_type || 'UNKNOWN'
  }, [decodedMapName])

  const mapImageUrl = `/maps/${mapType}/${formatMapFileName(decodedMapName)}.jpg`

  if (!data || data.totalPlays === 0) {
    return (
      <div className={styles.errorShell}>
        <div className={styles.errorPanel}>
          <div className={styles.errorKicker}>MAP INTEL</div>
          <h2 className={styles.errorTitle}>暂无数据 / NO DATA AVAILABLE</h2>
          <p className={styles.errorDesc}>该地图尚未进行任何有效对局，或地图名称与数据库记录不匹配。</p>
          <Link to="/maps" className={styles.backBtn}>
            ← 返回地图列表 / RETURN TO MAPS
          </Link>
        </div>
      </div>
    )
  }

  const avgTime = data.avgMatchTime || '--'
  const topHero = data.heroStats?.[0]
  const topTeam = data.teamWinRates?.[0]

  return (
    <div className={styles.shell}>
      <Link to="/maps" className={styles.backLink}>
        ← 返回全联盟地图数据 / BACK TO ALL MAPS
      </Link>

      <section className={styles.heroSection}>
        <div className={styles.heroBgWrapper}>
          <img
            src={mapImageUrl}
            alt={decodedMapName}
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

          <h1 className={styles.heroTitle}>{decodedMapName}</h1>

          <div className={styles.heroMeta}>
            <span className={styles.metaBadge}>{String(mapType).toUpperCase()}</span>
            <span className={styles.metaText}>
              PLAYS <strong>{data.totalPlays}</strong>
            </span>
            <span className={styles.metaText}>
              AVG TIME <strong>{avgTime}</strong>
            </span>
          </div>

          <p className={styles.heroDesc}>
            本页展示该地图在当前赛事数据库中的综合表现，包括 <strong>出场频率</strong>、
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
            meta="VALID MAP RECORDS"
            tone="accent"
          />
          <SummaryCard
            labelCn="平均时长"
            labelEn="AVG TIME"
            value={avgTime}
            meta="AVERAGE MAP DURATION"
          />
          <SummaryCard
            labelCn="最常见英雄"
            labelEn="TOP HERO"
            value={topHero?.hero || '--'}
            meta={topHero ? `${topHero.count} PICKS` : 'NO DATA'}
          />
          <SummaryCard
            labelCn="最佳战队"
            labelEn="TOP TEAM"
            value={topTeam?.name || '--'}
            meta={topTeam ? `${(topTeam.winRate * 100).toFixed(1)}% WIN RATE` : 'NO DATA'}
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
            hero={data.records.maxElims.hero}
            tone="recordAccent"
          />
          <RecordCard
            label="最多助攻 / ASSISTS"
            value={data.records.maxAssists.value}
            player={data.records.maxAssists.player}
            hero={data.records.maxAssists.hero}
          />
          <RecordCard
            label="最高伤害 / DAMAGE"
            value={Number(data.records.maxDamage.value || 0).toLocaleString()}
            player={data.records.maxDamage.player}
            hero={data.records.maxDamage.hero}
          />
          <RecordCard
            label="最高治疗 / HEALING"
            value={Number(data.records.maxHealing.value || 0).toLocaleString()}
            player={data.records.maxHealing.player}
            hero={data.records.maxHealing.hero}
          />
          <RecordCard
            label="最高阻挡 / MITIGATION"
            value={Number(data.records.maxMitigation.value || 0).toLocaleString()}
            player={data.records.maxMitigation.player}
            hero={data.records.maxMitigation.hero}
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
                  title={hero.hero}
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
              <Link to={`/matches/${m.matchId}`} key={`${m.matchId}-${idx}`} className={styles.matchCard}>
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