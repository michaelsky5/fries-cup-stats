import React, { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import styles from './MapDetailPage.module.css';
import db from '../../../public/data/friescup_db.json';
import { getMapDetail, safeArr } from '../../lib/selectors';

// 格式化地图名称用于加载背景图
function formatMapFileName(name) {
  if (!name) return 'unknown';
  return name.replace(/: /g, '_').replace(/ /g, '_');
}

const MapDetailPage = () => {
  const { mapName } = useParams();
  const decodedMapName = decodeURIComponent(mapName || '');

  // 超级聚合：在原有 selectors 基础上，直接在前端扩充“助攻/阻挡极值”与“近期战报”
  const data = useMemo(() => {
    const baseData = getMapDetail(db, decodedMapName);
    if (!baseData || baseData.totalPlays === 0) return null;

    let maxAssists = { value: 0, player: '', hero: '' };
    let maxMitigation = { value: 0, player: '', hero: '' };
    const recentMatches = [];

    const matches = safeArr(db?.matches);
    matches.forEach(match => {
      if (match.status !== 'COMPLETE' && match.status !== 'COMPLETED') return;
      const mapObj = safeArr(match.maps).find(m => m.map_name === decodedMapName);
      if (!mapObj) return;

      // 提取近期该地图的交战记录
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
      });

      // 提取补充极值（最高助攻 / 最高阻挡）
      const allStats = [...safeArr(mapObj.team_a_stats), ...safeArr(mapObj.team_b_stats)];
      allStats.forEach(stat => {
        if (!stat.heroes_played) return;
        const ast = Number(stat.assists) || 0;
        const mit = Number(stat.mitigation) || 0;
        const cleanName = (stat.player_name || 'Unknown').split('#')[0];

        if (ast > maxAssists.value) maxAssists = { value: ast, player: cleanName, hero: stat.heroes_played };
        if (mit > maxMitigation.value) maxMitigation = { value: mit, player: cleanName, hero: stat.heroes_played };
      });
    });

    // 将比赛倒序排列，最新的在前面
    recentMatches.reverse();

    return {
      ...baseData,
      records: {
        ...baseData.records,
        maxAssists,
        maxMitigation
      },
      recentMatches
    };
  }, [decodedMapName]);

  if (!data || data.totalPlays === 0) {
    return (
      <div className={styles.errorContainer}>
        <h2>暂无数据 / NO DATA AVAILABLE</h2>
        <p>该地图尚未进行任何对局，或地图名称不匹配。</p>
        <Link to="/maps" className={styles.backBtn}>← 返回地图列表 / RETURN TO MAPS</Link>
      </div>
    );
  }

  const mapTypeObj = db.matches?.flatMap(m => m.maps).find(m => m.map_name === decodedMapName);
  const mapType = mapTypeObj?.map_type || 'UNKNOWN';
  const mapImageUrl = `/maps/${mapType}/${formatMapFileName(decodedMapName)}.jpg`;

  return (
    <div className={styles.pageContainer}>
      <Link to="/maps" className={styles.backLink}>← 返回全联盟地图数据 / BACK TO ALL MAPS</Link>

      {/* --- 顶部头图与概览 --- */}
      <header className={styles.heroHeader}>
        <div className={styles.headerBgWrapper}>
          <img 
            src={mapImageUrl} 
            alt={decodedMapName} 
            className={styles.headerBgImg}
            onError={(e) => e.target.style.display = 'none'} 
          />
          <div className={styles.headerOverlay} />
        </div>
        
        <div className={styles.headerContent}>
          <div className={styles.kicker}>// 地图情报 MAP INTEL</div>
          <h1 className={styles.mapTitle}>{decodedMapName}</h1>
          <div className={styles.mapMeta}>
            <span className={styles.metaBadge}>{mapType.toUpperCase()}</span>
            <span>总计出场次数 / PLAYS: <strong className={styles.textYellow}>{data.totalPlays}</strong></span>
            <span>平均单局时长 / AVG TIME: <strong>{data.avgMatchTime}</strong></span>
          </div>
        </div>
      </header>

      {/* --- 极值记录面板 (扩展为 5 格) --- */}
      <section className={styles.recordsSection}>
        <div className={styles.sectionHeader}>
          <h2>极值记录 / MAP RECORDS</h2>
          <span className={styles.subLabel}>单图最高表现 PEAK PERFORMANCES</span>
        </div>
        <div className={styles.recordGrid}>
          <div className={styles.recordCard}>
            <div className={styles.recordLabel}>最高击杀 / ELIMS</div>
            <div className={styles.recordValue}>{data.records.maxElims.value}</div>
            <div className={styles.recordPlayer}>
              {data.records.maxElims.player} <span className={styles.dim}>on {data.records.maxElims.hero}</span>
            </div>
          </div>
          <div className={styles.recordCard}>
            <div className={styles.recordLabel}>最多助攻 / ASSISTS</div>
            <div className={styles.recordValue}>{data.records.maxAssists.value}</div>
            <div className={styles.recordPlayer}>
              {data.records.maxAssists.player} <span className={styles.dim}>on {data.records.maxAssists.hero}</span>
            </div>
          </div>
          <div className={styles.recordCard}>
            <div className={styles.recordLabel}>最高伤害 / DAMAGE</div>
            <div className={styles.recordValue}>{data.records.maxDamage.value.toLocaleString()}</div>
            <div className={styles.recordPlayer}>
              {data.records.maxDamage.player} <span className={styles.dim}>on {data.records.maxDamage.hero}</span>
            </div>
          </div>
          <div className={styles.recordCard}>
            <div className={styles.recordLabel}>最高治疗 / HEALING</div>
            <div className={styles.recordValue}>{data.records.maxHealing.value.toLocaleString()}</div>
            <div className={styles.recordPlayer}>
              {data.records.maxHealing.player} <span className={styles.dim}>on {data.records.maxHealing.hero}</span>
            </div>
          </div>
          <div className={styles.recordCard}>
            <div className={styles.recordLabel}>最高阻挡 / MITIGATION</div>
            <div className={styles.recordValue}>{data.records.maxMitigation.value.toLocaleString()}</div>
            <div className={styles.recordPlayer}>
              {data.records.maxMitigation.player} <span className={styles.dim}>on {data.records.maxMitigation.hero}</span>
            </div>
          </div>
        </div>
      </section>

      {/* --- 核心数据双列布局 --- */}
      <div className={styles.mainGrid}>
        
        {/* 左列：英雄出场率 */}
        <section className={styles.metaSection}>
          <div className={styles.sectionHeader}>
            <h2>英雄环境 / HERO META</h2>
            <span className={styles.subLabel}>出场率排行 PICK RATES</span>
          </div>
          <div className={styles.listContainer}>
            {data.heroStats.slice(0, 15).map((hero, index) => {
              const pickRatePercent = (hero.pickRate * 100).toFixed(1);
              return (
                <div key={hero.hero} className={styles.listItem}>
                  <div className={styles.rankNum}>{index + 1}</div>
                  <div className={styles.heroInfo}>
                    <span className={styles.heroName}>{hero.hero}</span>
                    <span className={styles.heroCount}>{hero.count} 次出场</span>
                  </div>
                  <div className={styles.barArea}>
                    <div className={styles.barWrap}>
                      <div className={styles.barFill} style={{ width: `${pickRatePercent}%` }} />
                    </div>
                    <span className={styles.rateText}>{pickRatePercent}%</span>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* 右列：战队胜率榜 */}
        <section className={styles.metaSection}>
          <div className={styles.sectionHeader}>
            <h2>战队胜率 / TEAM WIN RATES</h2>
            <span className={styles.subLabel}>地图统治力 MAP DOMINANCE</span>
          </div>
          <div className={styles.listContainer}>
            {data.teamWinRates.map((team, index) => {
              const winRatePercent = (team.winRate * 100).toFixed(1);
              return (
                <div key={team.name} className={styles.listItem}>
                  <div className={styles.rankNum}>{index + 1}</div>
                  <div className={styles.teamInfo}>
                    <span className={styles.teamName}>{team.name}</span>
                    <span className={styles.teamRecord}>{team.wins}胜 / {team.plays - team.wins}负</span>
                  </div>
                  <div className={styles.barArea}>
                    <div className={styles.barWrap}>
                      <div 
                        className={`${styles.barFill} ${team.winRate >= 0.5 ? styles.bgYellow : styles.bgGray}`} 
                        style={{ width: `${winRatePercent}%` }} 
                      />
                    </div>
                    <span className={styles.rateText}>{winRatePercent}%</span>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

      </div>

      {/* --- 新增：近期交战记录 --- */}
      <section className={styles.recentSection}>
        <div className={styles.sectionHeader}>
          <h2>近期交战 / RECENT MATCHES</h2>
          <span className={styles.subLabel}>MATCH HISTORY ON THIS MAP</span>
        </div>
        <div className={styles.recentGrid}>
          {data.recentMatches.map((m, idx) => {
            const isDraw = m.winnerId === 'DRAW' || m.scoreA === m.scoreB;
            return (
              <Link to={`/matches/${m.matchId}`} key={`${m.matchId}-${idx}`} className={styles.matchCard}>
                <div className={styles.matchMetaInfo}>
                  <span className={styles.matchStage}>{m.stage} - {m.round}</span>
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
  );
};

export default MapDetailPage;