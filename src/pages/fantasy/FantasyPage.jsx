import React, { useMemo, useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import styles from './FantasyPage.module.css';
import { getPlayerCards, calculateTeamPower } from '../../lib/managerEngine';

const TOTAL_BUDGET = 1500;
const ROLE_LIMITS = { TANK: 1, DPS: 2, SUP: 2 };

// 英雄头像路径生成器
function getHeroAvatarUrl(role, heroNameCn) {
  if (!heroNameCn) return ''; 
  const dir = role === 'DPS' ? 'damage' : role === 'SUP' ? 'support' : 'tank';
  const dict = {
    "末日铁拳": "doomfist", "D.Va": "dva", "奥丽莎": "orisa", "莱因哈特": "reinhardt", 
    "路霸": "roadhog", "西格玛": "sigma", "温斯顿": "winston", "破坏球": "wreckingball", 
    "查莉娅": "zarya", "拉玛刹": "ramattra", "渣客女王": "junkerqueen", "毛加": "mauga",
    "艾什": "ashe", "堡垒": "bastion", "卡西迪": "cassidy", "回声": "echo", 
    "源氏": "genji", "半藏": "hanzo", "狂鼠": "junkrat", "美": "mei", 
    "法老之鹰": "pharah", "死神": "reaper", "索杰恩": "sojourn", "士兵：76": "soldier76", 
    "黑影": "sombra", "秩序之光": "symmetra", "托比昂": "torbjorn", "猎空": "tracer", 
    "黑百合": "widowmaker", "探险家": "venture", "安然": "anran", 
    "安娜": "ana", "巴蒂斯特": "baptiste", "布丽吉塔": "brigitte", "伊拉锐": "illari", 
    "雾子": "kiriko", "生命编织者": "lifeweaver", "卢西奥": "lucio", "天使": "mercy", 
    "莫伊拉": "moira", "禅雅塔": "zenyatta", "朱诺": "juno"
  };
  const fileName = dict[heroNameCn] || heroNameCn.toLowerCase();
  return `/heroes/${dir}/${fileName}.png`;
}

export default function FantasyPage() {
  const { db } = useOutletContext();
  const navigate = useNavigate();
  
  const allCards = useMemo(() => getPlayerCards(db).sort((a, b) => b.ovr - a.ovr), [db]);
  
  const [roster, setRoster] = useState([]);
  const [filterRole, setFilterRole] = useState('ALL');
  const [career, setCareer] = useState({ wins: 0, losses: 0, maxOvr: 0 });

  useEffect(() => {
    const saved = localStorage.getItem('fca_manager_career');
    if (saved) setCareer(JSON.parse(saved));
  }, []);

  const teamData = useMemo(() => calculateTeamPower(roster), [roster]);
  const budgetLeft = TOTAL_BUDGET - teamData.totalPrice;

  const handleDraft = (player) => {
    if (roster.find(p => p.player_id === player.player_id)) return;
    if (roster.length >= 5) return alert("阵容已满 5 人！");
    if (budgetLeft < player.price) return alert("预算不足！");
    
    const currentRoleCount = roster.filter(p => p.role === player.role).length;
    if (currentRoleCount >= ROLE_LIMITS[player.role]) {
      return alert(`你的阵容里 ${player.role} 位置已满！`);
    }
    
    setRoster([...roster, player]);
  };

  const handleDrop = (playerId) => {
    setRoster(roster.filter(p => p.player_id !== playerId));
  };

  const handleSimulate = () => {
    if (roster.length < 5) return alert("请先挑满 5 名首发队员！");
    localStorage.setItem('fca_my_roster', JSON.stringify(roster));
    localStorage.setItem('fca_my_power', teamData.powerScore.toString());
    navigate('/fantasy/battle');
  };

  const handleResetCareer = () => {
    if (window.confirm("🚨 警告：这会清空你所有的经理生涯战绩 (0胜0负)，确定继续吗？")) {
      localStorage.removeItem('fca_manager_career');
      setCareer({ wins: 0, losses: 0, maxOvr: 0 });
    }
  };

  const filteredCards = filterRole === 'ALL' ? allCards : allCards.filter(p => p.role === filterRole);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.titleArea}>
          <div className={styles.kicker}>// FRIES CUP MANAGER</div>
          <h1>电竞经理</h1>
          <p>利用 <strong>${TOTAL_BUDGET}</strong> 预算，挑选真实联赛数据换算的选手，组建 1T-2C-2N 阵容，挑战随机赛事Boss。</p>
        </div>
        
        <div className={styles.careerBoard}>
          <div className={styles.statBox}>
            <span className={styles.statLabel}>生涯战绩</span>
            <span className={styles.statValue}>{career.wins}W - {career.losses}L</span>
          </div>
          <div className={styles.statBox}>
            <span className={styles.statLabel}>历史最高战力</span>
            <span className={styles.statValueHighlight}>{career.maxOvr} OVR</span>
          </div>
          <button onClick={handleResetCareer} className={styles.resetCareerBtn}>
            重置生涯
          </button>
        </div>
      </header>

      <div className={styles.gameGrid}>
        <div className={styles.myTeamPanel}>
          <div className={styles.panelHead}>
            <h2>我的首发 (MY ROSTER)</h2>
            <div className={styles.budgetBox}>
              剩余预算: <span className={budgetLeft < 150 ? styles.textDanger : styles.textYellow}>${budgetLeft}</span>
            </div>
          </div>
          
          <div className={styles.rosterSlots}>
            {[...Array(5)].map((_, i) => {
              const p = roster[i];
              return p ? (
                <div key={p.player_id} className={styles.rosterCard}>
                  <div className={styles.cardLeft}>
                    <span className={`${styles.roleTag} ${styles[p.role.toLowerCase()]}`}>{p.role}</span>
                    {p.most_played_hero && (
                      <img 
                        src={getHeroAvatarUrl(p.role, p.most_played_hero)} 
                        className={styles.heroAvatar} 
                        alt={p.most_played_hero}
                        onError={(e) => e.target.style.display = 'none'}
                      />
                    )}
                    <div className={styles.cardInfo}>
                      <span className={styles.playerName}>{p.display_name}</span>
                      <span className={styles.playerBnet}>{p.player_name}</span>
                      <span className={styles.playerMeta}>{p.team_short_name} | {p.most_played_hero}</span>
                    </div>
                  </div>
                  <div className={styles.cardRight}>
                    <span className={styles.ovrBadge}>{p.ovr} OVR</span>
                    <button onClick={() => handleDrop(p.player_id)} className={styles.dropBtn}>解雇</button>
                  </div>
                </div>
              ) : (
                <div key={i} className={styles.emptySlot}>[ 空缺槽位 EMPTY SLOT ]</div>
              );
            })}
          </div>

          <div className={styles.teamPowerBar}>
            <span>当前阵容评分: <strong>{teamData.powerScore} OVR</strong></span>
            <button 
              className={roster.length === 5 ? styles.simBtnReady : styles.simBtnDisabled}
              onClick={handleSimulate}
            >
              {roster.length === 5 ? '确认阵容，进入总决赛 (ENTER FINALS)' : '需要5名选手'}
            </button>
          </div>
        </div>

        <div className={styles.marketPanel}>
          <div className={styles.panelHead}>
            <h2>自由市场 (FREE AGENTS)</h2>
            <div className={styles.filterTabs}>
              {['ALL', 'TANK', 'DPS', 'SUP'].map(role => (
                <button 
                  key={role} 
                  className={filterRole === role ? styles.tabActive : styles.tab}
                  onClick={() => setFilterRole(role)}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>
          
          <div className={styles.playerList}>
            {filteredCards.map(p => {
              const isDrafted = roster.find(r => r.player_id === p.player_id);
              return (
                <div key={p.player_id} className={`${styles.marketRow} ${isDrafted ? styles.draftedRow : ''}`}>
                  <div className={styles.marketInfo}>
                    <span className={`${styles.roleTag} ${styles[p.role.toLowerCase()]}`}>{p.role}</span>
                    {p.most_played_hero && (
                      <img 
                        src={getHeroAvatarUrl(p.role, p.most_played_hero)} 
                        className={styles.heroAvatarSmall} 
                        alt={p.most_played_hero}
                        onError={(e) => e.target.style.display = 'none'}
                      />
                    )}
                    <div className={styles.marketNameGroup}>
                      <span className={styles.marketName}>{p.display_name}</span>
                      <span className={styles.marketBnet}>{p.player_name}</span>
                    </div>
                  </div>
                  <div className={styles.marketAction}>
                    <span className={styles.priceTag}>${p.price}</span>
                    <button 
                      disabled={isDrafted} 
                      onClick={() => handleDraft(p)}
                      className={isDrafted ? styles.btnDrafted : styles.btnDraft}
                    >
                      {isDrafted ? '已选' : '签约'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  );
}