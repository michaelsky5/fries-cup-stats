// src/EsportsManager/pages/ShopPage.jsx
import React, { useMemo, useState, useEffect, useRef } from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import styles from './ShopPage.module.css'
import { getPlayerCards, calculateTeamPower, getUpgradeCost, trainPlayer } from '../engine/managerEngine'
import { getRunState, initNewRun, hirePlayer, firePlayer, saveRun, generateMatchOptions, processEventChoice, refreshShop, YOUTH_TRAINEES, getRandomShopPool } from '../engine/runEngine'
import { assignAdvancedTraits } from '../engine/traitAssigner'

function getHeroAvatarUrl(role, heroName) {
  if (!heroName) return ''
  const dir = role === 'DPS' ? 'damage' : role === 'SUP' ? 'support' : 'tank'
  const cleanName = heroName.toLowerCase().replace(/[úü]/g, 'u').replace(/ö/g, 'o').replace(/[\.\s:\-_]/g, '')
  const dict = {
    '末日铁拳': 'doomfist', '奥丽莎': 'orisa', '莱因哈特': 'reinhardt', '路霸': 'roadhog', '西格玛': 'sigma', '温斯顿': 'winston', '破坏球': 'wreckingball', '哈蒙德': 'wreckingball', '查莉娅': 'zarya', '拉玛刹': 'ramattra', '渣客女王': 'junkerqueen', '毛加': 'mauga',
    '艾什': 'ashe', '堡垒': 'bastion', '卡西迪': 'cassidy', '回声': 'echo', '源氏': 'genji', '半藏': 'hanzo', '狂鼠': 'junkrat', '美': 'mei', '法老之鹰': 'pharah', '死神': 'reaper', '索杰恩': 'sojourn', '士兵：76': 'soldier76', '黑影': 'sombra', '秩序之光': 'symmetra', '托比昂': 'torbjorn', '猎空': 'tracer', '黑百合': 'widowmaker', '探险家': 'venture', '安然': 'anran',
    '安娜': 'ana', '巴蒂斯特': 'baptiste', '布丽吉塔': 'brigitte', '伊拉锐': 'illari', '雾子': 'kiriko', '生命编织者': 'lifeweaver', '卢西奥': 'lucio', '天使': 'mercy', '莫伊拉': 'moira', '禅雅塔': 'zenyatta', '朱诺': 'juno'
  }
  const fileName = dict[heroName] || cleanName
  return `/heroes/${dir}/${fileName}.png`
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
      
      // 👇 核心修复：如果是 SSR 传奇卡（自带所有属性，无基础数据库映射），直接返回！
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

  const handleDraft = player => {
    const result = hirePlayer(runState, player)
    if (!result.success) return alert(result.msg)
    setRunState({ ...result.state })
  }

  const handleDrop = playerId => {
    const newState = firePlayer(runState, playerId)
    setRunState({ ...newState })
  }

  const handleUpgrade = player => {
    const currentLevel = player.upgradeLevel || 0
    if (currentLevel >= 5) return alert('System Auth: 该选手已达到最高强化等级！')
    const cost = getUpgradeCost(currentLevel)
    if (!window.confirm(`确认投入预算特训 ${player.display_name} 吗？(OVR +2)`)) return

    const finalCost = hasBlackCard ? Math.floor(cost * 0.8) : cost
    if (runState.money < finalCost) return alert(`资金不足，特训需要 $${finalCost}K！`)

    const updatedPlayer = trainPlayer(player)
    const newRoster = roster.map(p => (p.player_id === player.player_id ? updatedPlayer : p))
    const newState = { ...runState, money: runState.money - finalCost, roster: newRoster }

    setRunState(newState)
    saveRun(newState)
  }

  const handleRefresh = () => {
    const res = refreshShop(runState, db)
    if (!res.success) return alert(res.msg)
    setRunState({ ...res.state })
  }

  const focusOperations = tab => {
    setActiveTab(tab)
    setTimeout(() => opsPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
  }

  const handleSimulate = selectedMatch => {
    if (roster.length < 5) return alert('Action Required: 需要 5 名首发队员才能进行确认！')
    localStorage.setItem('fca_my_roster', JSON.stringify(roster))
    localStorage.setItem('fca_my_power', teamData.powerScore.toString())
    localStorage.setItem('fca_current_match', JSON.stringify(selectedMatch))
    navigate('/fantasy/battle')
  }

  const handleEventOptionClick = optionType => {
    const result = processEventChoice(runState, optionType)
    if (!result.success) return
    alert(result.msg)
    setRunState({ ...result.state })
    setActiveEvent(null)
    setMatchOptions(prev => ({ ...prev, event: null }))
  }

  if (!runState) return null

  return (
    <div className={styles.container}>
      {activeEvent && (
        <div className={styles.eventOverlay}>
          <div className={styles.eventModal}>
            <div className={styles.eventKicker}>UNKNOWN ENCOUNTER</div>
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
            <span className={styles.headerKickerCn}>网页小游戏</span>
            <span className={styles.headerKickerEn}>BASE CAMP / ROGUELIKE MANAGER</span>
          </div>
          <h1 className={styles.title}>战队大本营</h1>
          <p className={styles.headerDesc}>
            指挥官，欢迎回到基地。左侧监控阵容与资源结构；右侧负责走私买人、突击特训和赛程部署。凑齐属于你的冠军五人组。
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
              title="当前首发阵容"
              desc="严格遵守 1 坦克、2 输出、2 辅助的联赛规章。观察选手特质的化学反应，构建战术闭环。"
              right={
                // 👇 核心修复：补回了快捷进入“荣誉殿堂”的入口！
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => navigate('/career')}
                    className={styles.btnReset}
                    style={{ borderColor: '#facc15', color: '#facc15' }}
                  >
                    History
                  </button>
                  <button
                    onClick={() => {
                      if (!window.confirm('确定要放弃当前进度，清空资产重新开启一轮挑战吗？')) return
                      setRunState(initNewRun(db))
                      setMatchOptions(null)
                      setActiveTab('MARKET')
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
                          {p.team_short_name} // OVR {p.ovr + (p.upgradeBonus || 0)} // SELL ${Math.floor(p.price * 0.8)}K
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
                <span className={styles.academyTitle}>YOUTH ACADEMY</span>
                <span className={styles.academySub}>挑战者杯 (Contenders) 青训保底招募</span>
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
                  <span className={styles.relicsLabel}>已获神器赞助 / RELICS</span>
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
                  ✨ 触发羁绊：<strong>{teamData.activeSynergy.label}</strong>（OVR +{teamData.activeSynergy.bonus}）
                </div>
              )}

              <div className={styles.deployBar}>
                <div className={styles.deployHint}>
                  <span className={styles.deployHintLabel}>NEXT ACTION</span>
                  <strong className={styles.deployHintValue}>{canDeploy ? 'OPEN SCOUTING STATION' : 'COMPLETE STARTING FIVE'}</strong>
                  <span className={styles.deployHintMeta}>{canDeploy ? '前往情报站部署下一局交火' : '先在市场签人或从青训补满阵容'}</span>
                </div>

                <button
                  className={canDeploy ? styles.btnConfirm : styles.btnConfirmDisabled}
                  onClick={() => {
                    if (!canDeploy) return alert('需要 5 名首发才能出战！')
                    focusOperations('SCOUTING')
                  }}
                >
                  {canDeploy ? 'DEPLOY TO SCOUTING →' : 'REQUIRE 5 PLAYERS'}
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.rightPanel} ref={opsPanelRef}>
          <div className={styles.hubTabs}>
            <button className={activeTab === 'MARKET' ? styles.hubTabActive : styles.hubTab} onClick={() => setActiveTab('MARKET')}>
              人才市场
            </button>
            <button className={activeTab === 'TRAINING' ? styles.hubTabActive : styles.hubTab} onClick={() => setActiveTab('TRAINING')}>
              突击特训
            </button>
            <button className={activeTab === 'SCOUTING' ? styles.hubTabActive : styles.hubTab} onClick={() => setActiveTab('SCOUTING')}>
              情报部署
            </button>
          </div>

          <div className={styles.opsHero}>
            <div className={styles.opsHeroMain}>
              <span className={styles.opsHeroKicker}>
                {activeTab === 'MARKET' ? 'BLACK MARKET' : activeTab === 'TRAINING' ? 'TRAINING FACILITY' : 'DEPLOYMENT BOARD'}
              </span>
              <strong className={styles.opsHeroTitle}>
                {activeTab === 'MARKET' ? '构建你的五人首发' : activeTab === 'TRAINING' ? '用预算换取绝对战力' : `赛程推进：锁定 Stage ${runState.currentNode}`}
              </strong>
              <span className={styles.opsHeroDesc}>
                {activeTab === 'MARKET'
                  ? '自由市场鱼龙混杂，注意甄别选手的“特质标签”。带有 🎰 或 🗑️ 符号的是盲盒变异卡。'
                  : activeTab === 'TRAINING'
                  ? '强化是本局永久生效的投资。将选手拉到 5 星满级，即可解锁不可思议的终极大招神格！'
                  : '常规赛更稳，挑战强队有概率掉落赞助商遗物，而未知遭遇则可能彻底改写当前的剧本。'}
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
                      REFRESH (${hasBlackCard ? 16 : 10}K)
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
                  <div className={styles.emptyShop}>当前卡池已空，请点击上方刷新黑市。</div>
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
                kicker="TRAINING FACILITY"
                title="战队特训中心"
                desc="在这里投入资金提升选手的基础 OVR。当选手达到满级 (5星) 时，将迎来质变，觉醒专属的终极大招神格！"
                right={<div className={styles.marketMetaBar}><span className={styles.marketMetaChip}>DISCOUNT {hasBlackCard ? '20%' : '0%'}</span></div>}
              />

              <div className={styles.trainingIntro}>
                <div className={styles.trainingInsight}>
                  <span className={styles.trainingInsightLabel}>INVESTMENT STATUS</span>
                  <strong className={styles.trainingInsightValue}>${runState.money}K AVAILABLE</strong>
                  <span className={styles.trainingInsightMeta}>训练费用按等级翻倍递增。赌一个满星大爹，还是全员均衡发育？</span>
                </div>
                <button className={styles.inlineAction} onClick={() => focusOperations('SCOUTING')} disabled={!canDeploy}>
                  GO TO SCOUTING
                </button>
              </div>

              <div className={styles.marketList}>
                {roster.length === 0 ? (
                  <div className={styles.slotEmpty}>大名单为空，请先前往市场走私选手。</div>
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
                kicker="SCOUTING STATION"
                title={`情报站部署 · Stage ${runState.currentNode}`}
                desc="你的每个决定都将影响这轮挑战的走向。如果队伍配置豪华，大胆去劫掠精英对手的遗物吧！"
              />

              {!matchOptions ? (
                <div className={styles.scoutingEmpty}>正在生成黑爪与各路联盟的情报...</div>
              ) : (
                <div className={styles.scoutingGrid}>
                  <div className={styles.matchCardNormal}>
                    <div className={styles.matchRiskSafe}>{matchOptions.normal.risk}</div>
                    <div className={styles.matchCardBody}>
                      <div className={styles.matchCardTopline}>
                        <span className={styles.matchModeTag}>SAFE ROUTE</span>
                        <span className={`${styles.diffChip} ${styles[getMatchDiff(teamData.powerScore, matchOptions.normal.team.powerScore).tone]}`}>
                          {getMatchDiff(teamData.powerScore, matchOptions.normal.team.powerScore).label}
                        </span>
                      </div>

                      <h4 className={styles.matchTeamName}>{matchOptions.normal.team.team_short_name}</h4>
                      <div className={styles.matchOvrVal}>{matchOptions.normal.team.powerScore} OVR</div>

                      <div className={styles.matchIntelList}>
                        <div className={styles.matchIntelRow}>
                          <span>预计基础奖金</span>
                          <strong>${matchOptions.normal.rewardMoney}K</strong>
                        </div>
                        <div className={styles.matchIntelRow}>
                          <span>风险评级</span>
                          <strong>{matchOptions.normal.risk}</strong>
                        </div>
                        <div className={styles.matchIntelRow}>
                          <span>掉落奖励</span>
                          <strong>无额外赞助</strong>
                        </div>
                      </div>
                    </div>
                    <button className={styles.btnDeploySafe} onClick={() => handleSimulate(matchOptions.normal)}>ENGAGE</button>
                  </div>

                  <div className={styles.matchCardElite}>
                    <div className={styles.matchRiskDanger}>{matchOptions.elite.risk}</div>
                    <div className={styles.matchCardBody}>
                      <div className={styles.matchCardTopline}>
                        <span className={styles.matchModeTag}>HIGH RISK</span>
                        <span className={`${styles.diffChip} ${styles[getMatchDiff(teamData.powerScore, matchOptions.elite.team.powerScore).tone]}`}>
                          {getMatchDiff(teamData.powerScore, matchOptions.elite.team.powerScore).label}
                        </span>
                      </div>

                      <h4 className={styles.matchTeamName}>{matchOptions.elite.team.team_short_name}</h4>
                      <div className={styles.matchOvrValDanger}>{matchOptions.elite.team.powerScore} OVR</div>

                      <div className={styles.matchIntelList}>
                        <div className={styles.matchIntelRow}>
                          <span>预计基础奖金</span>
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
                          <span>🎁 击败掉落赞助</span>
                          <div className={styles.relicPreview}>
                            <span className={styles.relicPreviewIcon}>{matchOptions.elite.rewardRelic.icon}</span>
                            <span className={styles.relicPreviewName}>{matchOptions.elite.rewardRelic.name}</span>
                          </div>
                        </div>
                      )}
                    </div>
                    <button className={styles.btnDeployDanger} onClick={() => handleSimulate(matchOptions.elite)}>ENGAGE ELITE</button>
                  </div>

                  {matchOptions.event && (
                    <div className={styles.matchCardEvent}>
                      <div className={styles.matchRiskUnknown}>UNKNOWN ENCOUNTER</div>
                      <div className={styles.matchCardBody}>
                        <div className={styles.matchCardTopline}>
                          <span className={styles.matchModeTag}>UNSTABLE ROUTE</span>
                          <span className={`${styles.diffChip} ${styles.neutral}`}>???</span>
                        </div>

                        <div className={styles.eventIcon}>❓</div>
                        <h4 className={styles.matchTeamName}>赛博奇遇</h4>
                        <p className={styles.eventDescText}>黑爪的交易、神秘的黑客，或是赞助商的空投……在按下按钮前，没人知道会发生什么。</p>

                        <div className={styles.eventWarningBox}>
                          <span className={styles.eventWarningTitle}>EVENT OUTLOOK</span>
                          <span className={styles.eventWarningText}>这不是对战，是一次变量注入。它可能助你起飞，也可能让战队瞬间破产。</span>
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