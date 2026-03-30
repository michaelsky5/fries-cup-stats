import React, { useMemo } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import styles from './StandingsPage.module.css';
import { getSwissStandings } from '../../lib/selectors.js';

// 核心规则引擎：判断当前队伍的晋级状态
function getTeamStatus(wins, losses) {
  // 达到 5 胜，提前直通季后赛
  if (wins >= 5) return { label: 'PLAYOFFS', cn: '直通季后赛', type: 'success' };
  // 达到 4 负，最多只能拿 2 胜，直接淘汰
  if (losses >= 4) return { label: 'ELIMINATED', cn: '淘汰', type: 'danger' };
  
  // 如果已经打满 6 轮 (但没到 5 胜，也没到 4 负，说明是 4-2 或 3-3)
  if (wins + losses >= 6) {
    if (wins >= 3) return { label: 'LCQ', cn: '突围赛资格', type: 'warning' };
  }
  
  // 比赛进行中，生死未卜
  return { label: 'ACTIVE', cn: '进行中', type: 'active' };
}

export default function StandingsPage() {
  const { db } = useOutletContext();
  const standings = useMemo(() => getSwissStandings(db), [db]);

  return (
    <div className={styles.pageContainer}>
      <header className={styles.header}>
        <div className={styles.kicker}>// TOURNAMENT STANDINGS</div>
        <h1 className={styles.title}>瑞士轮积分榜</h1>
        <p className={styles.subtitle}>
          2026 赛季赛制：拿到 <strong>5 胜</strong>直通季后赛，拿到 <strong>3 胜</strong>进入 LCQ 突围赛，累计 <strong>4 负</strong>直接淘汰。
        </p>
      </header>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.colRank}>RANK</th>
              <th className={styles.colTeam}>TEAM</th>
              <th className={styles.colCenter}>MATCH W-L</th>
              <th className={styles.colCenter}>MAP W-L</th>
              <th className={styles.colCenter}>MAP DIFF</th>
              <th className={styles.colStatus}>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {standings.map(team => {
              const status = getTeamStatus(team.match_wins, team.match_losses);
              const diffText = team.map_diff > 0 ? `+${team.map_diff}` : team.map_diff;

              return (
                <tr key={team.team_id} className={`${styles.row} ${styles[`row_${status.type}`]}`}>
                  <td className={styles.colRank}>
                    <span className={styles.rankNum}>{team.rank}</span>
                  </td>
                  <td className={styles.colTeam}>
                    <Link to={`/teams/${team.team_id}`} className={styles.teamLink}>
                      <span className={styles.teamShort}>{team.team_short_name}</span>
                      <span className={styles.teamFull}>{team.team_name}</span>
                    </Link>
                  </td>
                  <td className={styles.colCenter}>
                    <span className={styles.matchScore}>
                      <span className={styles.textWin}>{team.match_wins}</span>
                      <span className={styles.scoreDash}>-</span>
                      <span className={styles.textLoss}>{team.match_losses}</span>
                    </span>
                  </td>
                  <td className={styles.colCenter}>
                    <span className={styles.mapScore}>
                      {team.map_wins} - {team.map_losses}
                    </span>
                  </td>
                  <td className={styles.colCenter}>
                    <span className={`${styles.mapDiff} ${team.map_diff > 0 ? styles.diffPositive : (team.map_diff < 0 ? styles.diffNegative : '')}`}>
                      {diffText}
                    </span>
                  </td>
                  <td className={styles.colStatus}>
                    <div className={`${styles.statusBadge} ${styles[`badge_${status.type}`]}`}>
                      <span className={styles.statusEn}>{status.label}</span>
                      <span className={styles.statusCn}>{status.cn}</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}