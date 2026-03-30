// src/pages/fantasy/FantasyBattle.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import styles from './FantasyBattle.module.css';
import { getPlayerCards, getRandomBossTeam } from '../../lib/managerEngine';
import { TACTICS, executeSimulation } from '../../lib/simEngine';

// ✨ 全量竞技地图池配置
const MAP_POOL = [
  { name: '釜山', type: 'CONTROL', img: '/maps/Control/Busan.jpg' },
  { name: '伊利奥斯', type: 'CONTROL', img: '/maps/Control/Ilios.jpg' },
  { name: '漓江塔', type: 'CONTROL', img: '/maps/Control/Lijiang_Tower.jpg' },
  { name: '尼泊尔', type: 'CONTROL', img: '/maps/Control/Nepal.jpg' },
  { name: '绿洲城', type: 'CONTROL', img: '/maps/Control/Oasis.jpg' },
  { name: '南极半岛', type: 'CONTROL', img: '/maps/Control/Antarctic_Peninsula.jpg' },
  { name: '萨摩亚', type: 'CONTROL', img: '/maps/Control/Samoa.jpg' },
  { name: '皇家赛道', type: 'ESCORT', img: '/maps/Escort/Circuit_Royal.jpg' },
  { name: '多拉多', type: 'ESCORT', img: '/maps/Escort/Dorado.jpg' },
  { name: '哈瓦那', type: 'ESCORT', img: '/maps/Escort/Havana.jpg' },
  { name: '渣客镇', type: 'ESCORT', img: '/maps/Escort/Junkertown.jpg' },
  { name: '里阿尔托', type: 'ESCORT', img: '/maps/Escort/Rialto.jpg' },
  { name: '66号公路', type: 'ESCORT', img: '/maps/Escort/Route_66.jpg' },
  { name: '香巴里寺院', type: 'ESCORT', img: '/maps/Escort/Shambali_Monastery.jpg' },
  { name: '监测站：直布罗陀', type: 'ESCORT', img: '/maps/Escort/Watchpoint_Gibraltar.jpg' },
  { name: '暴雪世界', type: 'HYBRID', img: '/maps/Hybrid/Blizzard_World.jpg' },
  { name: '艾兴瓦尔德', type: 'HYBRID', img: '/maps/Hybrid/Eichenwalde.jpg' },
  { name: '好莱坞', type: 'HYBRID', img: '/maps/Hybrid/Hollywood.jpg' },
  { name: '国王大道', type: 'HYBRID', img: '/maps/Hybrid/Kings_Row.jpg' },
  { name: '中城', type: 'HYBRID', img: '/maps/Hybrid/Midtown.jpg' },
  { name: '努巴尼', type: 'HYBRID', img: '/maps/Hybrid/Numbani.jpg' },
  { name: '帕拉伊索', type: 'HYBRID', img: '/maps/Hybrid/Paraiso.jpg' },
  { name: '斗兽场', type: 'PUSH', img: '/maps/Push/Colosseo.jpg' },
  { name: '埃斯佩兰萨', type: 'PUSH', img: '/maps/Push/Esperanca.jpg' },
  { name: '新皇后街', type: 'PUSH', img: '/maps/Push/New_Queen_Street.jpg' },
  { name: '卢纳萨皮', type: 'PUSH', img: '/maps/Push/Runasapi.jpg' },
  { name: '新渣客城', type: 'FLASHPOINT', img: '/maps/Flashpoint/New_Junk_City.jpg' },
  { name: '苏拉瓦萨', type: 'FLASHPOINT', img: '/maps/Flashpoint/Suravasa.jpg' }
];

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export default function FantasyBattle() {
  const { db } = useOutletContext();
  const navigate = useNavigate();

  const [myRoster, setMyRoster] = useState([]);
  const [myPower, setMyPower] = useState(0);
  const [bossTeam, setBossTeam] = useState(null);
  
  const [score, setScore] = useState({ myTeam: 0, boss: 0 });
  const [currentMapNum, setCurrentMapNum] = useState(1);
  const [lastWinner, setLastWinner] = useState(null); 
  const [phase, setPhase] = useState('READY'); 
  const [activeMap, setActiveMap] = useState(null);
  const [clashData, setClashData] = useState({ myFinal: 0, bossFinal: 0 });
  const [logs, setLogs] = useState(["[系统] 正在连接赛事服务器..."]);

  // 记录整个 BO5 的个人累计数据
  const [seriesStats, setSeriesStats] = useState({});

  useEffect(() => {
    const savedRoster = localStorage.getItem('fca_my_roster');
    const savedPower = localStorage.getItem('fca_my_power');
    if (!savedRoster || !savedPower) return navigate('/fantasy');

    const roster = JSON.parse(savedRoster);
    setMyRoster(roster);
    setMyPower(Number(savedPower));
    
    // 初始化个人数据累计表
    const initStats = {};
    roster.forEach(p => initStats[p.player_id] = { elim: 0, dmg: 0, heal: 0, score: 0 });
    setSeriesStats(initStats);

    const allCards = getPlayerCards(db);
    const boss = getRandomBossTeam(db, allCards);
    setBossTeam(boss);
    setLogs(prev => [...prev, `[赛事] BO5 总决赛：你的战队 VS ${boss.name}`]);
  }, [db, navigate]);

  // 第一阶段：败方选图
  const playNextMap = async () => {
    if (phase === 'END') return;
    setPhase('PICKING');
    let pickerName = currentMapNum > 1 ? (lastWinner === 'BOSS' ? '你的战队' : bossTeam.short) : '赛事委员会 (随机)';
    
    setLogs(prev => [...prev, `--- 第 ${currentMapNum} 局 ---`, `[BP环节] 等待 ${pickerName} 选择地图...`]);
    await sleep(1500);
    
    const selectedMap = MAP_POOL[Math.floor(Math.random() * MAP_POOL.length)];
    setActiveMap(selectedMap);
    setLogs(prev => [...prev, `[BP环节] 锁定了地图：【${selectedMap.name}】`]);

    await sleep(1000);
    setPhase('TACTIC'); 
    setLogs(prev => [...prev, `[教练席] 比赛即将开始，请主教练下达战术指令！`]);
  };

  // 第二阶段：下达战术 & 引擎演算
  const handleTacticSelect = async (tacticId) => {
    setPhase('CLASHING');
    
    // 调用带有敌方数据的新引擎
    const simResult = executeSimulation(myRoster, bossTeam, tacticId, activeMap.name, currentMapNum);
    
    // 累加个人数据用于评选 MVP
    setSeriesStats(prev => {
       const newStats = { ...prev };
       myRoster.forEach(p => {
           newStats[p.player_id].elim += simResult.matchStats[p.player_id].elim;
           newStats[p.player_id].dmg += simResult.matchStats[p.player_id].dmg;
           newStats[p.player_id].heal += simResult.matchStats[p.player_id].heal;
           newStats[p.player_id].score += simResult.matchStats[p.player_id].score;
       });
       return newStats;
    });

    // 逐条打印战报，制造悬念
    for (let i = 0; i < simResult.logs.length - 1; i++) {
      setLogs(prev => [...prev, simResult.logs[i]]);
      await sleep(1000); 
    }

    setClashData({ myFinal: simResult.myFinal, bossFinal: simResult.bossFinal });
    await sleep(1500); 

    // 第三阶段：单局结算
    setPhase('RESULT');
    const isMyWin = simResult.myFinal >= simResult.bossFinal;
    setLastWinner(isMyWin ? 'ME' : 'BOSS');
    
    setLogs(prev => [...prev, simResult.logs[simResult.logs.length - 1]]);

    if (isMyWin) setScore(s => ({ ...s, myTeam: s.myTeam + 1 }));
    else setScore(s => ({ ...s, boss: s.boss + 1 }));

    await sleep(1500);
    checkSeriesWinner(isMyWin ? score.myTeam + 1 : score.myTeam, isMyWin ? score.boss : score.boss + 1);
  };

  // 终局结算
  const checkSeriesWinner = (myScore, bossScore) => {
    if (myScore >= 3 || bossScore >= 3) {
      setPhase('END');
      const isSeriesWin = myScore >= 3;
      setLogs(prev => [...prev, "=============================", isSeriesWin ? "🏆 恭喜！你赢得了本场 BO5！" : "💀 遗憾落败！"]);
      
      const savedCareer = JSON.parse(localStorage.getItem('fca_manager_career') || '{"wins":0,"losses":0,"maxOvr":0}');
      localStorage.setItem('fca_manager_career', JSON.stringify({
        ...savedCareer,
        wins: savedCareer.wins + (isSeriesWin ? 1 : 0),
        losses: savedCareer.losses + (!isSeriesWin ? 1 : 0),
        maxOvr: Math.max(savedCareer.maxOvr || 0, myPower)
      }));
    } else {
      setCurrentMapNum(prev => prev + 1);
      setPhase('READY'); 
    }
  };

  // 结算 FMVP 选手
  const fmvpPlayer = useMemo(() => {
    if (phase !== 'END') return null;
    let mvp = myRoster[0];
    let maxScore = 0;
    myRoster.forEach(p => {
      if (seriesStats[p.player_id]?.score > maxScore) {
        maxScore = seriesStats[p.player_id].score;
        mvp = p;
      }
    });
    return mvp;
  }, [phase, myRoster, seriesStats]);

  if (!bossTeam) return <div className={styles.container}>连接赛场中...</div>;

  const totalClash = clashData.myFinal + clashData.bossFinal;
  const myClashPercent = totalClash > 0 ? (clashData.myFinal / totalClash) * 100 : 50;

  return (
    <div className={styles.container}>
      {/* 动态地图背景 */}
      {activeMap && (
        <div className={`${styles.mapBackground} ${phase === 'PICKING' ? styles.mapFadeIn : ''}`} style={{ backgroundImage: `url(${activeMap.img})` }}>
          <div className={styles.mapOverlay}></div>
        </div>
      )}

      {/* 计分板 */}
      <div className={styles.scoreboard}>
        <div className={styles.teamBadge}>
          <div className={styles.teamName}>我的梦幻战队</div>
          <div className={styles.teamOvr}>{myPower} OVR</div>
        </div>
        
        <div className={styles.scoreCenter}>
          <div className={styles.scoreKicker}>FINAL - BO5</div>
          <div className={styles.scoreNumbers}>
            <span className={styles.myScore}>{score.myTeam}</span>
            <span className={styles.scoreDash}>-</span>
            <span className={styles.bossScore}>{score.boss}</span>
          </div>
        </div>

        <div className={styles.teamBadge}>
          <div className={styles.teamNameBoss}>{bossTeam.short}</div>
          <div className={styles.teamOvrBoss}>{bossTeam.power} OVR</div>
        </div>
      </div>

      <div className={styles.arena}>
        
        {/* 赛后结算面板 FMVP */}
        {phase === 'END' ? (
          <div className={styles.postMatchReport}>
            <h2 className={styles.pmTitle}>{score.myTeam >= 3 ? '🏆 夺冠结算 (CHAMPIONS)' : '💀 战败结算 (DEFEAT)'}</h2>
            
            {fmvpPlayer && (
              <div className={styles.mvpBox}>
                <div className={styles.mvpLabel}>⭐ 队内最有价值选手 (FMVP)</div>
                <div className={styles.mvpName}>{fmvpPlayer.display_name} ({fmvpPlayer.role})</div>
                <div className={styles.mvpStats}>
                  贡献了全队最高的表现分！
                </div>
              </div>
            )}

            <table className={styles.statsTable}>
              <thead>
                <tr>
                  <th>选手</th>
                  <th>位置</th>
                  <th>总击杀</th>
                  <th>总伤害</th>
                  <th>总治疗</th>
                </tr>
              </thead>
              <tbody>
                {myRoster.map(p => {
                  const s = seriesStats[p.player_id];
                  return (
                    <tr key={p.player_id} className={p.player_id === fmvpPlayer?.player_id ? styles.rowMvp : ''}>
                      <td className={styles.tdName}>{p.display_name} {p.player_id === fmvpPlayer?.player_id && '⭐'}</td>
                      <td className={styles[p.role.toLowerCase()]}>{p.role}</td>
                      <td>{s?.elim}</td>
                      <td className={styles.textDmg}>{s?.dmg.toLocaleString()}</td>
                      <td className={styles.textHeal}>{s?.heal.toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={styles.actionStage}>
            {phase === 'PICKING' && (
              <div className={styles.pickingAlert}>等待 {currentMapNum === 1 ? '随机' : (lastWinner === 'BOSS' ? '你的战队' : bossTeam.short)} 选图...</div>
            )}

            {/* 教练席：战术博弈 */}
            {phase === 'TACTIC' && (
              <div className={styles.tacticBoard}>
                <h3 className={styles.tacticTitle}>请主教练布置本局战术</h3>
                <div className={styles.tacticCards}>
                  {TACTICS.map(t => (
                    <button key={t.id} className={styles.tacticCard} style={{ borderColor: t.color }} onClick={() => handleTacticSelect(t.id)}>
                      <div className={styles.tacticName} style={{ color: t.color }}>{t.name}</div>
                      <div className={styles.tacticDesc}>{t.desc}</div>
                      <div className={styles.tacticRisk}>{t.risk}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 战力碰撞条 */}
            {phase === 'CLASHING' && (
              <div className={styles.clashZone}>
                <div className={styles.clashTitle}>MAP {currentMapNum}: {activeMap?.name}</div>
                <div className={styles.tugOfWar}>
                  <div className={styles.tugBarLeft} style={{ width: `${myClashPercent}%` }}>{clashData.myFinal} PWR</div>
                  <div className={styles.tugVS}>VS</div>
                  <div className={styles.tugBarRight} style={{ width: `${100 - myClashPercent}%` }}>{clashData.bossFinal} PWR</div>
                </div>
              </div>
            )}

            {phase === 'RESULT' && (
              <div className={styles.resultAlert}>{clashData.myFinal >= clashData.bossFinal ? 'ROUND WON' : 'ROUND LOST'}</div>
            )}
          </div>
        )}

        {/* 战报终端机 */}
        <div className={styles.logTerminal}>
          <div className={styles.termHeader}>
            <span className={styles.dotRed}></span><span className={styles.dotYellow}></span><span className={styles.dotGreen}></span>
            <span className={styles.termTitle}>LIVE_CAST.EXE</span>
          </div>
          <div className={styles.termBody}>
            {logs.map((log, idx) => (
              <div key={idx} className={styles.logLine}>
                {log.includes('🏆') ? <span className={styles.textWin}>{log}</span> : 
                 log.includes('💀') ? <span className={styles.textLoss}>{log}</span> :
                 log.includes('敌方高能') || log.includes('敌方觉醒') ? <span className={styles.textLoss}>{log}</span> :
                 log.includes('特质触发') ? <span className={styles.textTrait}>{log}</span> : 
                 log.includes('BP环节') ? <span className={styles.textMap}>{log}</span> : log}
              </div>
            ))}
            {(phase === 'CLASHING' || phase === 'PICKING') && <div className={styles.logLinePulse}>&gt; 系统演算中...</div>}
            {/* 自动滚动锚点 */}
            <div style={{ float:"left", clear: "both" }} ref={(el) => { el?.scrollIntoView({ behavior: "smooth" }) }}></div>
          </div>
        </div>
      </div>

      {/* 底部控制台 */}
      <div className={styles.controls}>
        {phase === 'READY' && (
          <button className={styles.btnPlay} onClick={playNextMap}>
            {currentMapNum === 1 ? '启动总决赛 (START FINALS)' : `进入第 ${currentMapNum} 局`}
          </button>
        )}
        {(phase === 'PICKING' || phase === 'CLASHING' || phase === 'RESULT') && (
          <button className={styles.btnDisabled} disabled>模拟演算中...</button>
        )}
        {phase === 'END' && (
          <button className={styles.btnReturn} onClick={() => navigate('/fantasy')}>返回转会大厅 (NEW DRAFT)</button>
        )}
      </div>
    </div>
  );
}