import React, { useMemo } from 'react';
import { Link } from 'react-router-dom'; // 👈 新增引入 Link
import styles from './MapStatsPage.module.css';
import db from '../../../public/data/friescup_db.json';
import { getMapStats } from '../../lib/selectors';

// 格式化地图名称以匹配本地文件路径
function formatMapFileName(name) {
  if (!name) return 'unknown';
  return name
    .replace(/: /g, '_') // 处理 "Watchpoint: Gibraltar" -> "Watchpoint_Gibraltar"
    .replace(/ /g, '_'); // 处理 "Lijiang Tower" -> "Lijiang_Tower"
}

const MapStatsPage = () => {
  const { totalValidMaps, groupedByType } = useMemo(() => getMapStats(db), []);

  const MODE_ORDER = ['Control', 'Hybrid', 'Flashpoint', 'Push', 'Escort', 'Clash'];

  const sortedModes = Object.keys(groupedByType).sort((a, b) => {
    const indexA = MODE_ORDER.indexOf(a);
    const indexB = MODE_ORDER.indexOf(b);
    return (indexA === -1 ? 99 : indexA) - (indexB === -1 ? 99 : indexB);
  });

  return (
    <div className={styles.pageContainer}>
      <header className={styles.header}>
        <div className={styles.kicker}>// DATA CENTER</div>
        <h1 className={styles.title}>MAP PICK RATES</h1>
        <p className={styles.subtitle}>
          OVERALL MAPS PLAYED: <span className={styles.highlight}>{totalValidMaps}</span>
        </p>
      </header>

      <div className={styles.content}>
        {sortedModes.map(mode => {
          const mapsInMode = groupedByType[mode];
          const modeTotalPlays = mapsInMode.reduce((sum, map) => sum + map.playedCount, 0);

          return (
            <section key={mode} className={styles.modeSection}>
              <div className={styles.modeHeader}>
                <h2 className={styles.modeTitle}>{mode.toUpperCase()}</h2>
                <div className={styles.modeTotal}>TOTAL PLAYS: {modeTotalPlays}</div>
              </div>

              <div className={styles.mapGrid}>
                {mapsInMode.map(map => {
                  const relativePickRate = modeTotalPlays > 0 
                    ? (map.playedCount / modeTotalPlays) * 100 
                    : 0;
                  
                  const globalPickRate = (map.pickRate * 100).toFixed(1);
                  
                  // 构建图片路径 (注意：这里默认使用 .jpg，如果是 .png 请自行修改)
                  const mapImageUrl = `/maps/${map.type}/${formatMapFileName(map.name)}.jpg`;

                  return (
                    // 👇 修改：将 div 替换为 Link，并加入 to 属性
                    <Link 
                      key={map.name} 
                      to={`/maps/${encodeURIComponent(map.name)}`} 
                      className={styles.mapCard}
                    >
                      
                      {/* --- 新增：地图背景底纹层 --- */}
                      <div className={styles.mapBgWrapper}>
                        <img 
                          src={mapImageUrl} 
                          alt={map.name} 
                          className={styles.mapBgImg} 
                          onError={(e) => {
                            // 图片加载失败时隐藏图片，露出纯黑底色
                            e.target.style.display = 'none';
                          }}
                        />
                        <div className={styles.mapBgOverlay} />
                      </div>
                      {/* --------------------------- */}

                      {/* 核心数据层保持在 Z 轴最上方 */}
                      <div className={styles.mapCardInner}>
                        <div className={styles.mapInfo}>
                          <span className={styles.mapName}>{map.name}</span>
                          <span className={styles.mapCount}>
                            {map.playedCount} <span className={styles.dimText}>PLAYS</span>
                          </span>
                        </div>
                        
                        <div className={styles.barContainer}>
                          <div 
                            className={styles.barFill} 
                            style={{ width: `${relativePickRate}%` }}
                          />
                        </div>
                        
                        <div className={styles.mapStats}>
                          <span>MODE PICK RATE: {relativePickRate.toFixed(1)}%</span>
                          <span className={styles.globalRate}>GLOBAL: {globalPickRate}%</span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
};

export default MapStatsPage;