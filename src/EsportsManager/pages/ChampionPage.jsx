// src/EsportsManager/pages/ChampionPage.jsx
import React, { useEffect, useState, useRef, useMemo } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import html2canvas from 'html2canvas'
import styles from './ChampionPage.module.css'
import { getRunState } from '../engine/runEngine'
import { calculateTeamPower } from '../engine/managerEngine'

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

function HeroStat({ label, value, meta, accent = false }) {
  return (
    <div className={`${styles.heroStat} ${accent ? styles.heroStatAccent : ''}`}>
      <span className={styles.heroStatLabel}>{label}</span>
      <span className={styles.heroStatValue}>{value}</span>
      {meta ? <span className={styles.heroStatMeta}>{meta}</span> : null}
    </div>
  )
}

export default function ChampionPage() {
  const { db } = useOutletContext()
  const navigate = useNavigate()
  const posterRef = useRef(null)

  const [runState, setRunState] = useState(null)
  const [teamData, setTeamData] = useState(null)
  const [isExporting, setIsExporting] = useState(false)

  useEffect(() => {
    const state = getRunState()
    if (!state || state.roster.length < 5) {
      navigate('/shop')
      return
    }
    setRunState(state)
    setTeamData(calculateTeamPower(state.roster))
  }, [navigate, db])

  const roleOrder = { TANK: 1, DPS: 2, SUP: 3 }
  const sortedRoster = useMemo(() => {
    if (!runState) return []
    return [...runState.roster].sort((a, b) => roleOrder[a.role] - roleOrder[b.role])
  }, [runState])

  const awakenedCount = useMemo(() => sortedRoster.filter(p => p.isAwakened).length, [sortedRoster])
  const relicCount = runState?.relics?.length || 0
  const clearedStage = runState ? runState.currentNode - 1 : 0
  const currentDate = useMemo(() => new Date().toLocaleDateString(), [])

  const handleExport = async () => {
    if (!posterRef.current) return
    setIsExporting(true)
    try {
      const canvas = await html2canvas(posterRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#000000'
      })
      const imgData = canvas.toDataURL('image/png')
      const link = document.createElement('a')
      link.href = imgData
      link.download = `FriesCup_Stage${clearedStage}_Cleared.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err) {
      alert('海报生成失败，请检查浏览器权限！')
    } finally {
      setIsExporting(false)
    }
  }

  const handleContinue = () => navigate('/shop')

  if (!runState || !teamData) return null

  return (
    <div className={styles.pageContainer}>
      <header className={styles.heroShell}>
        <div className={styles.heroCopy}>
          <div className={styles.kickerRow}>
            <span className={styles.kickerCn}>网页小游戏</span>
            <span className={styles.kickerEn}>MILESTONE CEREMONY / CHAMPION PAGE</span>
          </div>

          <div className={styles.statusRow}>
            <span className={styles.statusChip}>MILESTONE CLEARED</span>
            <span className={styles.statusChip}>STAGE {clearedStage}</span>
            <span className={styles.statusChip}>RUN ACTIVE</span>
          </div>

          <h1 className={styles.pageTitle}>阶段突破达成</h1>
          <p className={styles.pageDesc}>
            你已成功带领战队突破 <strong>Stage {clearedStage}</strong> 的关键挑战。这一页不只是导出工具，而是本次 run 的阶段性纪念。
            保存这套首发阵容，继续向下一段赛程推进。
          </p>

          <div className={styles.heroStatsGrid}>
            <HeroStat label="STAGE CLEARED" value={`STAGE ${clearedStage}`} meta="CURRENT MILESTONE" accent />
            <HeroStat label="TEAM POWER" value={`${teamData.powerScore} OVR`} meta={`TEAM COST $${teamData.totalPrice}K`} />
            <HeroStat label="AWAKENED" value={`${awakenedCount} PLAYERS`} meta="MAX STAR TALENT" />
            <HeroStat label="RELICS" value={`${relicCount} EQUIPPED`} meta="SPONSORS / HARDWARE" />
          </div>
        </div>

        <div className={styles.actionPanel}>
          <div className={styles.actionPanelHead}>
            <span className={styles.actionKicker}>NEXT ACTION</span>
            <span className={styles.actionMeta}>EXPORT / CONTINUE</span>
          </div>

          <button className={styles.btnExport} onClick={handleExport} disabled={isExporting}>
            <span className={styles.btnTitle}>{isExporting ? '渲染中...' : '生成阶段纪念海报'}</span>
            <span className={styles.btnDesc}>导出当前突破阵容的 PNG 纪念图</span>
          </button>

          <button className={styles.btnContinue} onClick={handleContinue}>
            <span className={styles.btnTitle}>继续当前 Run</span>
            <span className={styles.btnDesc}>返回基地，准备推进下一阶段</span>
          </button>

          <div className={styles.actionHint}>
            海报导出仅截取下方画布内容，不会包含当前页面控制按钮。
          </div>
        </div>
      </header>

      <section className={styles.previewSection}>
        <div className={styles.previewHead}>
          <div>
            <div className={styles.previewKicker}>EXPORT PREVIEW</div>
            <h2 className={styles.previewTitle}>阶段荣誉海报</h2>
          </div>
          <div className={styles.previewMeta}>PNG READY / FRIESCUP MANAGER</div>
        </div>

        <div className={styles.posterWrapper}>
          <div className={styles.posterCanvas} ref={posterRef}>
            <div className={styles.posterHeader}>
              <div className={styles.posterHeaderMain}>
                <div className={styles.kicker}>MILESTONE CLEARED</div>
                <h2 className={styles.posterTitle}>STAGE {clearedStage} CONQUERED</h2>
                <div className={styles.posterDate}>{currentDate}</div>
              </div>

              <div className={styles.posterStageBadge}>
                <span className={styles.posterStageLabel}>CURRENT TEAM POWER</span>
                <div className={styles.posterStageValueWrap}>
                  <span className={styles.powerValue}>{teamData.powerScore}</span>
                  <span className={styles.powerUnit}>OVR</span>
                </div>
                <div className={styles.costValue}>当前建队耗资: ${teamData.totalPrice}K</div>
              </div>
            </div>

            <div className={styles.posterBanner}>
              <div className={styles.bannerBlock}>
                <span className={styles.bannerLabel}>TEAM SYNERGY</span>
                <span className={styles.bannerValue}>
                  {teamData.activeSynergy ? `${teamData.activeSynergy.label} (OVR +${teamData.activeSynergy.bonus})` : '无阵营羁绊'}
                </span>
              </div>
              <div className={styles.bannerDivider} />
              <div className={styles.bannerBlock}>
                <span className={styles.bannerLabel}>MEMORIAL NOTE</span>
                <span className={styles.bannerValue}>本页记录的是你完成 Stage {clearedStage} 时的首发五人组。</span>
              </div>
            </div>

            <div className={styles.lineupSection}>
              <div className={styles.sectionRow}>
                <div className={styles.sectionTitleWrap}>
                  <span className={styles.sectionKicker}>STARTING FIVE</span>
                  <span className={styles.sectionTitle}>战队首发阵容</span>
                </div>
                <div className={styles.sectionMeta}>TANK ×1 / DPS ×2 / SUP ×2</div>
              </div>

              <div className={styles.rosterGrid}>
                {sortedRoster.map(p => {
                  const isLegendary = p.player_id?.startsWith('L-');
                  
                  return (
                    <div key={p.player_id} className={styles.playerCard}>
                      <div className={p.role === 'TANK' ? styles.roleBadgeTank : p.role === 'DPS' ? styles.roleBadgeDps : styles.roleBadgeSup}>
                        {p.role}
                      </div>

                      {p.most_played_hero ? (
                        <img src={getHeroAvatarUrl(p.role, p.most_played_hero)} className={styles.playerAvatar} alt="hero" crossOrigin="anonymous" />
                      ) : (
                        <div className={styles.playerAvatarFallback}>{p.role.charAt(0)}</div>
                      )}

                      <div className={styles.playerInfo}>
                        {/* 👇 核心修复：注入 SSR 传奇王冠与满星觉醒标志 */}
                        <div className={`${styles.playerName} ${p.isAwakened || isLegendary ? styles.textAwakened : ''}`}>
                          {isLegendary ? '👑 ' : (p.isAwakened ? '⭐ ' : '')}{p.display_name}
                        </div>
                        <div className={styles.playerMeta}>{p.team_short_name} · {p.ovr + (p.upgradeBonus || 0)} OVR</div>
                        
                        {/* 👇 新增特质展示栏：让海报真正拥有炫耀的灵魂 */}
                        {p.traits && p.traits.length > 0 && (
                          <div style={{ display: 'flex', gap: '4px', marginTop: '2px', fontSize: '10px' }}>
                            {p.traits.map(t => <span key={t.id} title={t.name}>{t.icon}</span>)}
                          </div>
                        )}

                        {p.isAwakened && p.awakenTrait ? <div className={styles.awakenBadge}>{p.awakenTrait.name}</div> : null}
                        {p.upgradeLevel > 0 ? <div className={styles.stars}>{Array(p.upgradeLevel).fill('★').join('')}</div> : null}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className={styles.footerSection}>
              <div className={styles.infoBox}>
                <div className={styles.boxTitle}>SPONSORS & RELICS</div>
                <div className={styles.boxContent}>
                  {runState.relics.length > 0 ? runState.relics.map(r => `${r.icon} ${r.name}`).join('  |  ') : '纯粹的竞技，不需要赞助。'}
                </div>
              </div>

              <div className={styles.infoBox}>
                <div className={styles.boxTitle}>RUN STATUS</div>
                <div className={styles.boxContent}>阶段突破已记录。</div>
              </div>
            </div>

            <div className={styles.watermark}>Generated by FriesCup Esports Manager</div>
          </div>
        </div>
      </section>
    </div>
  )
}