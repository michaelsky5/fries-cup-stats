// src/EsportsManager/pages/ShopPage.jsx
import React, { useMemo, useState, useEffect, useRef } from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import styles from './ShopPage.module.css'
import { getPlayerCards, calculateTeamPower, getUpgradeCost, trainPlayer } from '../engine/managerEngine'
import { getRunState, initNewRun, hirePlayer, firePlayer, saveRun, generateMatchOptions, processEventChoice, refreshShop, YOUTH_TRAINEES, getRandomShopPool } from '../engine/runEngine'
import { assignAdvancedTraits } from '../engine/traitAssigner'
import SysModal from '../components/SysModal'

function getHeroAvatarUrl(role, heroName) {
  if (!heroName) return ''
  const dir = role === 'DPS' ? 'damage' : role === 'SUP' ? 'support' : 'tank'
  
  // 1. 字典映射：将中文名映射到【准确包含下划线的文件名】
  const dict = {
    '末日铁拳': 'doomfist', '奥丽莎': 'orisa', '莱因哈特': 'reinhardt', '路霸': 'roadhog', '西格玛': 'sigma', '温斯顿': 'winston', '破坏球': 'wrecking_ball', '哈蒙德': 'wrecking_ball', '查莉娅': 'zarya', '拉玛刹': 'ramattra', '渣客女王': 'junker_queen', '毛加': 'mauga',
    '艾什': 'ashe', '堡垒': 'bastion', '卡西迪': 'cassidy', '回声': 'echo', '源氏': 'genji', '半藏': 'hanzo', '狂鼠': 'junkrat', '美': 'mei', '法老之鹰': 'pharah', '死神': 'reaper', '索杰恩': 'sojourn', '士兵：76': 'soldier_76', '黑影': 'sombra', '秩序之光': 'symmetra', '托比昂': 'torbjorn', '猎空': 'tracer', '黑百合': 'widowmaker', '探险家': 'venture', '安然': 'anran',
    '安娜': 'ana', '巴蒂斯特': 'baptiste', '布丽吉塔': 'brigitte', '伊拉锐': 'illari', '雾子': 'kiriko', '生命编织者': 'lifeweaver', '卢西奥': 'lucio', '天使': 'mercy', '莫伊拉': 'moira', '禅雅塔': 'zenyatta', '朱诺': 'juno',
    '喷气猫': 'jetpack_cat' // 补上彩蛋英雄
  }

  if (dict[heroName]) {
    return `/heroes/${dir}/${dict[heroName]}.png`;
  }

  // 2. 如果字典没命中 (比如直接传了英文名 Wrecking Ball)
  // 把注音符号去掉，然后把 空格、冒号、连字符 转换为下划线，最后清理多余的下划线
  const cleanName = heroName
    .toLowerCase()
    .replace(/[úü]/g, 'u')
    .replace(/ö/g, 'o')
    .replace(/[\.\s:\-]/g, '_') 
    .replace(/_+/g, '_'); 

  return `/heroes/${dir}/${cleanName}.png`
}

function SummaryCard({ label, value, meta, tone = '' }) {
  return (
    <div className={`${styles.summaryCard} ${tone ? styles[tone] : ''}`}>
      <span className={styles.summaryLabel}>{label}</span>
      <span className={styles.summaryValue}>{value}</span>
      {meta ? <span className={styles.summaryMeta}>{meta}</span> : null}
    </div>
  )
}

function PanelHeader({ kicker, title, desc, right }) {
  return (
    <div className={styles.panelHeader}>
      <div className={styles.panelHeaderMain}>
        <div className={styles.panelKicker}>{kicker}</div>
        <h2 className={styles.panelTitle}>{title}</h2>
        {desc ? <p className={styles.panelDesc}>{desc}</p> : null}
      </div>
      {right ? <div className={styles.panelHeaderRight}>{right}</div> : null}
    </div>
  )
}

function getMatchDiff(teamPower, enemyPower) {
  const diff = enemyPower - teamPower
  if (diff >= 12) return { label: `+${diff} OVR`, tone: 'danger' }
  if (diff >= 4) return { label: `+${diff} OVR`, tone: 'warn' }
  if (diff > -4) return { label: 'EVEN', tone: 'neutral' }
  return { label: `${diff} OVR`, tone: 'safe' }
}

export default function ShopPage() {
  const { db } = useOutletContext()
  const navigate = useNavigate()
  const opsPanelRef = useRef(null)

  const [runState, setRunState] = useState(null)
  const [filterRole, setFilterRole] = useState('ALL')
  const [activeTab, setActiveTab] = useState('MARKET')
  const [matchOptions, setMatchOptions] = useState(null)
  const [activeEvent, setActiveEvent] = useState(null)
  
  const [sysModal, setSysModal] = useState(null)

  useEffect(() => {
    let currentState = getRunState()
    if (!currentState || currentState.hp <= 0) currentState = initNewRun(db)
    else if (!currentState.shopPool || currentState.shopPool.length === 0) {
      currentState.shopPool = getRandomShopPool(db, currentState.roster.map(p => p.player_id), currentState.relics)
      saveRun(currentState)
    }
    setRunState({ ...currentState })
  }, [db])

  useEffect(() => {
    if (runState) setMatchOptions(null)
  }, [runState?.currentNode])

  useEffect(() => {
    if (runState && activeTab === 'SCOUTING' && !matchOptions) {
      const opts = generateMatchOptions(db, runState.currentNode, runState.relics)
      setMatchOptions(opts)
    }
  }, [activeTab, runState, db, matchOptions])

  const allCards = useMemo(() => {
    const cards = getPlayerCards(db)
    const cardsWithTraits = assignAdvancedTraits(cards)
    return cardsWithTraits.sort((a, b) => b.ovr - a.ovr)
  }, [db])

  const roster = runState?.roster || []
  const relics = runState?.relics || []
  const teamData = useMemo(() => calculateTeamPower(roster), [roster])
  const roleCounts = useMemo(() => ({
    TANK: roster.filter(p => p.role === 'TANK').length,
    DPS: roster.filter(p => p.role === 'DPS').length,
    SUP: roster.filter(p => p.role === 'SUP').length
  }), [roster])
  const hasBlackCard = relics.some(r => r.id === 'BLACK_CARD')

  const displaySlots = useMemo(() => {
    const slots = [
      { role: 'TANK', label: 'TANK', player: null },
      { role: 'DPS', label: 'DAMAGE-1', player: null },
      { role: 'DPS', label: 'DAMAGE-2', player: null },
      { role: 'SUP', label: 'SUPPORT-1', player: null },
      { role: 'SUP', label: 'SUPPORT-2', player: null }
    ];
    
    const tempRoster = [...roster];
    slots.forEach(slot => {
      const foundIdx = tempRoster.findIndex(p => p.role === slot.role);
      if (foundIdx !== -1) {
        slot.player = tempRoster.splice(foundIdx, 1)[0];
      }
    });
    return slots;
  }, [roster])

  const enrichedShopPool = useMemo(() => {
    const rawPool = runState?.shopPool || []
    return rawPool.map(raw => {
      const baseCard = allCards.find(c => c.player_id === raw.player_id)
      
      if (!baseCard) {
        if (raw.player_id && String(raw.player_id).startsWith('L-')) return raw;
        return null;
      }
      
      return { ...baseCard, ...raw }
    }).filter(Boolean)
  }, [runState?.shopPool, allCards])

  const filteredCards = useMemo(() => (
    filterRole === 'ALL' ? enrichedShopPool : enrichedShopPool.filter(p => p.role === filterRole)
  ), [enrichedShopPool, filterRole])

  const nextMilestone = useMemo(() => Math.ceil((runState?.currentNode || 1) / 5) * 5, [runState?.currentNode])
  const nodesToMilestone = Math.max(0, nextMilestone - (runState?.currentNode || 1))
  const canDeploy = roster.length === 5
  const teamPowerLabel = canDeploy ? `${teamData.powerScore} OVR` : 'INCOMPLETE'
  const teamStatusLabel = canDeploy ? 'READY TO DEPLOY' : `MISSING ${5 - roster.length} PLAYER${5 - roster.length > 1 ? 'S' : ''}`

  const showAlert = (message, title = 'SYSTEM ALERT') => {
    setSysModal({ type: 'alert', title, message })
  }
  const showConfirm = (message, onConfirmCallback, title = 'SYSTEM CONFIRMATION') => {
    setSysModal({ type: 'confirm', title, message, onConfirm: onConfirmCallback })
  }

  // ---------------- 处理函数区 ---------------- //

  const handleDraft = player => {
    const result = hirePlayer(runState, player)
    if (!result.success) return showAlert(result.msg, 'DRAFT REJECTED')
    
    setRunState({
      ...result.state,
      roster: [...result.state.roster],
      shopPool: [...(result.state.shopPool || [])]
    })
  }

  const handleDrop = playerId => {
    const newState = firePlayer(runState, playerId)
    setRunState({
      ...newState,
      roster: [...newState.roster],
      // 👇 完美修复：强制刷新 shopPool，使得退回的选手立刻出现在市场上
      shopPool: [...(newState.shopPool || [])]
    })
  }

  const handleUpgrade = player => {
    const currentLevel = player.upgradeLevel || 0
    if (currentLevel >= 5) return showAlert('该选手已达到最高特训等级！', 'MAX LEVEL REACHED')
    
    const cost = getUpgradeCost(currentLevel)
    const finalCost = hasBlackCard ? Math.floor(cost * 0.8) : cost
    
    if (runState.money < finalCost) return showAlert(`俱乐部资金不足，特训需要 $${finalCost}K 预算！`, 'INSUFFICIENT FUNDS')

    showConfirm(`确认投入 $${finalCost}K 俱乐部资金为 ${player.display_name} 进行特训吗？(OVR +2)`, () => {
      const updatedPlayer = trainPlayer(player)
      const newRoster = roster.map(p => (p.player_id === player.player_id ? updatedPlayer : p))
      const newState = { ...runState, money: runState.money - finalCost, roster: newRoster }

      setRunState(newState)
      saveRun(newState)
    }, 'TRAINING AUTHORIZATION')
  }

  const handleRefresh = () => {
    const res = refreshShop(runState, db)
    if (!res.success) return showAlert(res.msg, 'REFRESH FAILED')
    setRunState({ ...res.state })
  }

  const focusOperations = tab => {
    setActiveTab(tab)
    setTimeout(() => opsPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
  }

  const handleSimulate = selectedMatch => {
    if (roster.length < 5) return showAlert('首发名单未满，需要 5 名首发队员才能报名参赛！', 'ACTION REQUIRED')
    localStorage.setItem('fca_my_roster', JSON.stringify(roster))
    localStorage.setItem('fca_my_power', teamData.powerScore.toString())
    localStorage.setItem('fca_current_match', JSON.stringify(selectedMatch))
    navigate('/fantasy/battle')
  }

  const handleEventOptionClick = optionType => {
    const result = processEventChoice(runState, optionType)
    if (!result.success) return
    
    showAlert(result.msg, 'ENCOUNTER RESULT')
    setRunState({ ...result.state })
    setActiveEvent(null)
    setMatchOptions(prev => ({ ...prev, event: null }))
  }

  // ---------------- 渲染区 ---------------- //

  if (!runState) return null

  return (
    <div className={styles.container}>
      <SysModal modal={sysModal} onClose={() => setSysModal(null)} />

      {activeEvent && (
        <div className={styles.eventOverlay}>
          <div className={styles.eventModal}>
            <div className={styles.eventKicker}>UNSTABLE ANOMALY</div>
            <h2 className={styles.eventModalTitle}>{activeEvent.title}</h2>
            <p className={styles.eventModalDesc}>{activeEvent.desc}</p>
            <div className={styles.eventOptions}>
              {activeEvent.options.map((opt, idx) => (
                <button key={idx} className={styles.btnEventOption} onClick={() => handleEventOptionClick(opt.type)}>
                  {opt.text}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <header className={styles.header}>
        <div className={styles.headerMain}>
          <div className={styles.headerKicker}>
            <span className={styles.headerKickerCn}>电竞经理模拟器</span>
            <span className={styles.headerKickerEn}>CLUB HQ / ESPORTS MANAGER</span>
          </div>
          <h1 className={styles.title}>战队指挥中心</h1>
          <p className={styles.headerDesc}>
            主教练，欢迎回到指挥中心。左侧监控首发名单与俱乐部资产；右侧负责自由市场签约、特训强化和赛程部署。打造属于你的冠军战舰。
          </p>

          <div className={styles.commandStrip}>
            <div className={styles.commandStatMain}>
              <span className={styles.commandLabel}>TEAM POWER</span>
              <strong className={styles.commandValue}>{teamPowerLabel}</strong>
              <span className={styles.commandSub}>{teamStatusLabel}</span>
            </div>

            <div className={styles.commandMetricGroup}>
              <div className={styles.commandMetric}>
                <span className={styles.commandMetricLabel}>NEXT MILESTONE</span>
                <span className={styles.commandMetricValue}>STAGE {nextMilestone}</span>
                <span className={styles.commandMetricSub}>{nodesToMilestone === 0 ? 'AT CHECKPOINT' : `${nodesToMilestone} NODE${nodesToMilestone > 1 ? 'S' : ''} LEFT`}</span>
              </div>
              <div className={styles.commandMetric}>
                <span className={styles.commandMetricLabel}>ACTIVE SYNERGY</span>
                <span className={styles.commandMetricValue}>{teamData.activeSynergy ? teamData.activeSynergy.label : 'OFFLINE'}</span>
                <span className={styles.commandMetricSub}>{teamData.activeSynergy ? `OVR +${teamData.activeSynergy.bonus}` : 'NO BONUS ACTIVE'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.headerSummary}>
          <SummaryCard label="CURRENT NODE" value={`STAGE ${runState.currentNode}`} meta="RUN PROGRESSION" />
          <SummaryCard label="TEAM LIVES" value={Array(runState.hp).fill('❤').join('')} meta="RUN HP" tone="summaryWarn" />
          <SummaryCard label="CLUB FUNDS" value={`$${runState.money}K`} meta={hasBlackCard ? 'BLACK CARD DISCOUNT ACTIVE' : 'STANDARD ECONOMY'} tone="summaryAccent" />
          <SummaryCard label="ROSTER STATUS" value={`${roster.length}/5`} meta={`T ${roleCounts.TANK} · D ${roleCounts.DPS} · S ${roleCounts.SUP}`} />
        </div>
      </header>

      <div className={styles.layout}>
        <section className={styles.leftPanel}>
          <div className={styles.basePanel}>
            <PanelHeader
              kicker="BASE OPERATIONS"
              title="当前首发大名单"
              desc="联赛规章要求 1 坦克、2 输出、2 辅助 首发。请注意选手特质的化学反应，构建战术闭环。"
              right={
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => navigate('/career')}
                    className={styles.btnReset}
                    style={{ borderColor: '#facc15', color: '#facc15' }}
                  >
                    荣誉殿堂 / HISTORY
                  </button>
                  <button
                    onClick={() => {
                      showConfirm('确定要解散当前战队，清空资金并开启新的执教生涯吗？', () => {
                        setRunState(initNewRun(db))
                        setMatchOptions(null)
                        setActiveTab('MARKET')
                      }, 'HARD RESET')
                    }}
                    className={styles.btnReset}
                  >
                    RESTART RUN
                  </button>
                </div>
              }
            />

            <div className={styles.rosterTopStats}>
              <div className={styles.roleMiniStat}>
                <span className={styles.roleMiniLabel}>TANK</span>
                <span className={styles.roleMiniValue}>{roleCounts.TANK}/1</span>
              </div>
              <div className={styles.roleMiniStat}>
                <span className={styles.roleMiniLabel}>DPS</span>
                <span className={styles.roleMiniValue}>{roleCounts.DPS}/2</span>
              </div>
              <div className={styles.roleMiniStat}>
                <span className={styles.roleMiniLabel}>SUP</span>
                <span className={styles.roleMiniValue}>{roleCounts.SUP}/2</span>
              </div>
              <div className={styles.roleMiniStat}>
                <span className={styles.roleMiniLabel}>RELICS</span>
                <span className={styles.roleMiniValue}>{relics.length}</span>
              </div>
            </div>

            <div className={styles.rosterList}>
              {displaySlots.map((slot, i) => {
                const p = slot.player;
                const isLegendary = p?.player_id?.startsWith('L-');

                return p ? (
                  <div key={p.player_id} className={styles.rosterSlot}>
                    <div className={styles.slotInfo}>
                      <span className={p.role === 'TANK' ? styles.roleTextTank : p.role === 'DPS' ? styles.roleTextDps : styles.roleTextSup}>
                        {p.role}
                      </span>

                      {p.most_played_hero && (
                        <img
                          src={getHeroAvatarUrl(p.role, p.most_played_hero)}
                          className={styles.heroAvatar}
                          alt={p.most_played_hero}
                          onError={e => { e.target.style.display = 'none' }}
                        />
                      )}

                      <div className={styles.playerBlock}>
                        <div className={styles.playerNameGroup}>
                          <p className={`${styles.playerName} ${p.isAwakened || isLegendary ? styles.textAwakened : ''}`}>
                            {isLegendary ? '👑 ' : ''}{p.display_name}
                          </p>
                          {p.traits?.map(t => <span key={t.id} title={`${t.name}: ${t.desc}`} className={styles.traitIcon}>{t.icon}</span>)}
                          {p.isAwakened && p.awakenTrait && <span className={styles.awakenLabel} title={p.awakenTrait.desc}>{p.awakenTrait.name}</span>}
                          {p.upgradeLevel > 0 && (
                            <span className={p.isAwakened ? styles.upgradeStarsMax : styles.upgradeStars}>
                              {Array(p.upgradeLevel).fill('★').join('')}
                            </span>
                          )}
                        </div>
                        
                        <p className={styles.playerMeta}>
                          {p.team_short_name} // OVR {p.ovr + (p.upgradeBonus || 0)} //{' '}
                          <span style={{ color: (p.isNewThisNode && (p.upgradeLevel||0) === 0) ? '#4ade80' : 'inherit' }}>
                            SELL ${Math.floor((p.actualPaidPrice !== undefined ? p.actualPaidPrice : p.price) * (p.isNewThisNode && (p.upgradeLevel||0) === 0 ? 1 : 0.8))}K
                          </span>
                        </p>
                      </div>
                    </div>
                    <button onClick={() => handleDrop(p.player_id)} className={styles.btnSell}>SELL</button>
                  </div>
                ) : (
                  <div key={`empty-${i}`} className={styles.slotEmpty}>
                    [ EMPTY {slot.label} SLOT ]
                  </div>
                )
              })}
            </div>

            <div className={styles.academySection}>
              <div className={styles.academyHeader}>
                <span className={styles.academyTitle}>青训营招募</span>
                <span className={styles.academySub}>从守望先锋挑战者系列赛 (Contenders) 提拔青训选手</span>
              </div>
              <div className={styles.academyGrid}>
                {YOUTH_TRAINEES.map(p => (
                  <button key={p.player_id} className={styles.btnTrainee} onClick={() => handleDraft(p)}>
                    + {p.role} · OVR 45
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.submitPanel}>
              {relics.length > 0 && (
                <div className={styles.relicsBackpack}>
                  <span className={styles.relicsLabel}>已获赞助与设备 / SPONSORS & RELICS</span>
                  <div className={styles.relicsList}>
                    {relics.map(r => (
                      <span key={r.id} title={`${r.name}: ${r.desc}`} className={styles.relicBadge}>
                        {r.icon}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {teamData.activeSynergy && (
                <div className={styles.synergyBanner}>
                  [阵营协同] <strong>{teamData.activeSynergy.label}</strong>（OVR +{teamData.activeSynergy.bonus}）
                </div>
              )}

              <div className={styles.deployBar}>
                <div className={styles.deployHint}>
                  <span className={styles.deployHintLabel}>NEXT ACTION</span>
                  <strong className={styles.deployHintValue}>{canDeploy ? 'OPEN MATCH DEPLOYMENT' : 'COMPLETE STARTING FIVE'}</strong>
                  <span className={styles.deployHintMeta}>{canDeploy ? '前往赛事中心部署下一场比赛' : '请先在自由市场或青训营签满 5 名首发选手'}</span>
                </div>

                <button
                  className={canDeploy ? styles.btnConfirm : styles.btnConfirmDisabled}
                  onClick={() => {
                    if (!canDeploy) return showAlert('首发名单未满，需要 5 名首发队员才能报名参赛！', 'DEPLOYMENT FAILED')
                    focusOperations('SCOUTING')
                  }}
                >
                  {canDeploy ? 'DEPLOY TO MATCH →' : 'REQUIRE 5 PLAYERS'}
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.rightPanel} ref={opsPanelRef}>
          <div className={styles.hubTabs}>
            <button className={activeTab === 'MARKET' ? styles.hubTabActive : styles.hubTab} onClick={() => setActiveTab('MARKET')}>
              自由市场
            </button>
            <button className={activeTab === 'TRAINING' ? styles.hubTabActive : styles.hubTab} onClick={() => setActiveTab('TRAINING')}>
              特训中心
            </button>
            <button className={activeTab === 'SCOUTING' ? styles.hubTabActive : styles.hubTab} onClick={() => setActiveTab('SCOUTING')}>
              赛事部署
            </button>
          </div>

          <div className={styles.opsHero}>
            <div className={styles.opsHeroMain}>
              <span className={styles.opsHeroKicker}>
                {activeTab === 'MARKET' ? 'TRANSFER MARKET' : activeTab === 'TRAINING' ? 'TRAINING CENTER' : 'MATCH DEPLOYMENT'}
              </span>
              <strong className={styles.opsHeroTitle}>
                {activeTab === 'MARKET' ? '组建你的首发大名单' : activeTab === 'TRAINING' ? '投资预算提升选手硬实力' : `赛程推进：备战 Stage ${runState.currentNode}`}
              </strong>
              <span className={styles.opsHeroDesc}>
                {activeTab === 'MARKET'
                  ? '自由市场上充斥着各种状态的选手，请主教练注意甄别他们的“特质标签”。'
                  : activeTab === 'TRAINING'
                  ? '特训是本赛季永久生效的战力投资。当选手达到满级 (5星) 时，将迎来质变并觉醒终极神格特质。'
                  : '选择常规联赛队伍稳步推进，或挑战精英战队获取高级赞助商设备。未知遭遇可能会彻底改变你的赛季走向。'}
              </span>
            </div>

            <div className={styles.opsHeroChips}>
              <span className={styles.opsChip}>FUNDS ${runState.money}K</span>
              <span className={styles.opsChip}>POWER {teamData.powerScore} OVR</span>
              <span className={styles.opsChip}>ROSTER {roster.length}/5</span>
            </div>
          </div>

          {activeTab === 'MARKET' && (
            <>
              <PanelHeader
                kicker="FREE MARKET"
                title="签约候选名单"
                desc="签约区强调位置补齐与特质适配。注意：毒瘤和绝活哥可能会在赛场上给你带来巨大的惊喜，或者惊吓。"
                right={(
                  <div className={styles.marketMetaBar}>
                    <span className={styles.marketMetaChip}>POOL {filteredCards.length}/6</span>
                    <button onClick={handleRefresh} className={styles.btnRefreshSmall}>
                      刷新名单 (${hasBlackCard ? 16 : 10}K)
                    </button>
                  </div>
                )}
              />

              <div className={styles.filterTabs}>
                {['ALL', 'TANK', 'DPS', 'SUP'].map(role => (
                  <button key={role} className={filterRole === role ? styles.tabBtnActive : styles.tabBtn} onClick={() => setFilterRole(role)}>
                    {role}
                  </button>
                ))}
              </div>

              <div className={styles.marketList}>
                {filteredCards.length === 0 ? (
                  <div className={styles.emptyShop}>当前自由市场已无合适人选，请点击上方刷新名单。</div>
                ) : (
                  filteredCards.map(p => {
                    const isDrafted = roster.find(r => r.player_id === p.player_id)
                    const finalPrice = p.price === 0 ? 0 : (hasBlackCard ? Math.floor(p.price * 0.8) : p.price)
                    const isLegendary = p.player_id.startsWith('L-')

                    return (
                      <div key={p.player_id} className={isDrafted ? styles.marketRowDrafted : styles.marketRow}>
                        <div className={styles.marketInfo}>
                          <div className={p.role === 'TANK' ? styles.roleBoxTank : p.role === 'DPS' ? styles.roleBoxDps : styles.roleBoxSup}>
                            {p.role.charAt(0)}
                          </div>

                          {p.most_played_hero && <img src={getHeroAvatarUrl(p.role, p.most_played_hero)} className={styles.marketAvatar} alt="" />}

                          <div className={styles.marketTextBlock}>
                            <div className={styles.marketNameGroup}>
                              <span className={`${styles.marketName} ${isLegendary ? styles.textAwakened : ''}`}>
                                {isLegendary ? '👑 ' : ''}{p.display_name}
                              </span>
                              <span className={styles.marketBnet}>{p.player_name}</span>
                            </div>

                            <div className={styles.marketMetaGroup}>
                              <span className={styles.marketOvr} style={isLegendary ? { borderColor: '#facc15', color: '#facc15' } : {}}>
                                {isLegendary ? 'SSR ' : 'OVR '}{p.ovr}
                              </span>
                              <div className={styles.traitContainer}>
                                {p.traits?.map(t => (
                                  <span key={t.id} title={`${t.name}: ${t.desc}`} className={styles.traitBadge}>
                                    {t.icon}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className={styles.marketAction}>
                          <span className={styles.priceTag}>${finalPrice}K</span>
                          <button disabled={isDrafted} onClick={() => handleDraft(p)} className={isDrafted ? styles.btnOwned : styles.btnBuy}>
                            {isDrafted ? 'OWNED' : 'BUY'}
                          </button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </>
          )}

          {activeTab === 'TRAINING' && (
            <>
              <PanelHeader
                kicker="TRAINING CENTER"
                title="俱乐部特训中心"
                desc="在此消耗俱乐部资金提升选手基础 OVR。满级 (5星) 选手将迎来质变并觉醒强大的专属特质。"
                right={<div className={styles.marketMetaBar}><span className={styles.marketMetaChip}>DISCOUNT {hasBlackCard ? '20%' : '0%'}</span></div>}
              />

              <div className={styles.trainingIntro}>
                <div className={styles.trainingInsight}>
                  <span className={styles.trainingInsightLabel}>INVESTMENT STATUS</span>
                  <strong className={styles.trainingInsightValue}>${runState.money}K AVAILABLE</strong>
                  <span className={styles.trainingInsightMeta}>特训费用将随选手等级递增。主教练需要权衡是倾斜资源打造明星选手，还是全员均衡发展。</span>
                </div>
                <button className={styles.inlineAction} onClick={() => focusOperations('SCOUTING')} disabled={!canDeploy}>
                  GO TO MATCH DEPLOYMENT
                </button>
              </div>

              <div className={styles.marketList}>
                {roster.length === 0 ? (
                  <div className={styles.slotEmpty}>战队大名单为空，请先前往自由市场签约选手。</div>
                ) : (
                  roster.map(p => {
                    const currentLevel = p.upgradeLevel || 0
                    const isMaxLevel = currentLevel >= 5
                    const baseCost = getUpgradeCost(currentLevel)
                    const upgradeCost = hasBlackCard ? Math.floor(baseCost * 0.8) : baseCost
                    const canAfford = runState.money >= upgradeCost
                    const isLegendary = p.player_id.startsWith('L-')

                    return (
                      <div key={p.player_id} className={styles.trainingRow}>
                        <div className={styles.marketInfo}>
                          {p.most_played_hero && <img src={getHeroAvatarUrl(p.role, p.most_played_hero)} className={styles.marketAvatar} alt="" />}
                          <div className={styles.marketTextBlock}>
                            <div className={styles.marketNameGroup}>
                              <span className={`${styles.marketName} ${p.isAwakened || isLegendary ? styles.textAwakened : ''}`}>
                                {isLegendary ? '👑 ' : ''}{p.display_name}
                              </span>
                              {p.isAwakened && p.awakenTrait && <span className={styles.awakenLabel} title={p.awakenTrait.desc}>{p.awakenTrait.name}</span>}
                            </div>

                            <div className={styles.upgradeProgress}>
                              {Array(5).fill(0).map((_, idx) => (
                                <span key={idx} className={idx < currentLevel ? (p.isAwakened ? styles.upgradeStarsMax : styles.starActive) : styles.starDim}>★</span>
                              ))}
                            </div>
                            <span className={styles.marketOvr}>OVR {p.ovr + (p.upgradeBonus || 0)}</span>
                          </div>
                        </div>

                        <div className={styles.marketAction}>
                          {!isMaxLevel && <span className={canAfford ? styles.costAffordable : styles.costTooExpensive}>-${upgradeCost}K</span>}
                          <button
                            disabled={isMaxLevel || !canAfford}
                            onClick={() => handleUpgrade(p)}
                            className={isMaxLevel ? styles.btnMaxed : (canAfford ? styles.btnTrain : styles.btnTrainDisabled)}
                          >
                            {isMaxLevel ? 'MAX LEVEL' : 'TRAIN +2'}
                          </button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </>
          )}

          {activeTab === 'SCOUTING' && (
            <>
              <PanelHeader
                kicker="SCOUTING CENTER"
                title={`赛事部署中心 · Stage ${runState.currentNode}`}
                desc="你的决策将决定本赛季的最终成绩。如果对阵容有信心，请大胆挑战精英强队获取高级设备吧。"
              />

              {!matchOptions ? (
                <div className={styles.scoutingEmpty}>正在获取联赛各支战队的赛事数据...</div>
              ) : (
                <div className={styles.scoutingGrid}>
                  <div className={styles.matchCardNormal}>
                    <div className={styles.matchRiskSafe}>{matchOptions.normal.risk}</div>
                    <div className={styles.matchCardBody}>
                      <div className={styles.matchCardTopline}>
                        <span className={styles.matchModeTag}>STANDARD MATCH</span>
                        <span className={`${styles.diffChip} ${styles[getMatchDiff(teamData.powerScore, matchOptions.normal.team.powerScore).tone]}`}>
                          {getMatchDiff(teamData.powerScore, matchOptions.normal.team.powerScore).label}
                        </span>
                      </div>

                      <h4 className={styles.matchTeamName}>{matchOptions.normal.team.team_short_name}</h4>
                      <div className={styles.matchOvrVal}>{matchOptions.normal.team.powerScore} OVR</div>

                      <div className={styles.matchIntelList}>
                        <div className={styles.matchIntelRow}>
                          <span>赛事基础奖金</span>
                          <strong>${matchOptions.normal.rewardMoney}K</strong>
                        </div>
                        <div className={styles.matchIntelRow}>
                          <span>风险评级</span>
                          <strong>{matchOptions.normal.risk}</strong>
                        </div>
                        <div className={styles.matchIntelRow}>
                          <span>赞助商掉落</span>
                          <strong>无</strong>
                        </div>
                      </div>
                    </div>
                    <button className={styles.btnDeploySafe} onClick={() => handleSimulate(matchOptions.normal)}>START MATCH</button>
                  </div>

                  <div className={styles.matchCardElite}>
                    <div className={styles.matchRiskDanger}>{matchOptions.elite.risk}</div>
                    <div className={styles.matchCardBody}>
                      <div className={styles.matchCardTopline}>
                        <span className={styles.matchModeTag}>ELITE MATCH</span>
                        <span className={`${styles.diffChip} ${styles[getMatchDiff(teamData.powerScore, matchOptions.elite.team.powerScore).tone]}`}>
                          {getMatchDiff(teamData.powerScore, matchOptions.elite.team.powerScore).label}
                        </span>
                      </div>

                      <h4 className={styles.matchTeamName}>{matchOptions.elite.team.team_short_name}</h4>
                      <div className={styles.matchOvrValDanger}>{matchOptions.elite.team.powerScore} OVR</div>

                      <div className={styles.matchIntelList}>
                        <div className={styles.matchIntelRow}>
                          <span>赛事基础奖金</span>
                          <strong>${matchOptions.elite.rewardMoney}K</strong>
                        </div>
                        <div className={styles.matchIntelRow}>
                          <span>风险评级</span>
                          <strong>{matchOptions.elite.risk}</strong>
                        </div>
                        <div className={styles.matchIntelRow}>
                          <span>潜在掉落</span>
                          <strong>{matchOptions.elite.rewardRelic ? matchOptions.elite.rewardRelic.name : '无'}</strong>
                        </div>
                      </div>

                      {matchOptions.elite.rewardRelic && (
                        <div className={styles.relicRewardBox}>
                          <span>精英赛掉落</span>
                          <div className={styles.relicPreview}>
                            <span className={styles.relicPreviewIcon}>{matchOptions.elite.rewardRelic.icon}</span>
                            <span className={styles.relicPreviewName}>{matchOptions.elite.rewardRelic.name}</span>
                          </div>
                        </div>
                      )}
                    </div>
                    <button className={styles.btnDeployDanger} onClick={() => handleSimulate(matchOptions.elite)}>CHALLENGE ELITE</button>
                  </div>

                  {matchOptions.event && (
                    <div className={styles.matchCardEvent}>
                      <div className={styles.matchRiskUnknown}>UNKNOWN ANOMALY</div>
                      <div className={styles.matchCardBody}>
                        <div className={styles.matchCardTopline}>
                          <span className={styles.matchModeTag}>RANDOM ENCOUNTER</span>
                          <span className={`${styles.diffChip} ${styles.neutral}`}>...</span>
                        </div>

                        <div className={styles.eventIcon}>!</div>
                        <h4 className={styles.matchTeamName}>突发事件</h4>
                        <p className={styles.eventDescText}>赞助商空投、场外风波或是神秘车队加练……在做出决定前，没人知道会发生什么。</p>

                        <div className={styles.eventWarningBox}>
                          <span className={styles.eventWarningTitle}>EVENT OUTLOOK</span>
                          <span className={styles.eventWarningText}>突发事件可能会带来高额收益，也可能让战队陷入困境。请主教练谨慎抉择。</span>
                        </div>
                      </div>
                      <button className={styles.btnDeployEvent} onClick={() => setActiveEvent(matchOptions.event)}>INVESTIGATE</button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  )
}