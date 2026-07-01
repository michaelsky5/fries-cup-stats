// src/EsportsManager/pages/FantasyPage.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './FantasyPage.module.css'
import { getRunState } from '../engine/runEngine'

function InfoCard({ index, title, subtitle, body, meta }) {
  return (
    <article className={styles.infoCard}>
      <div className={styles.infoTop}>
        <span className={styles.infoIndex}>{index}</span>
        <div className={styles.infoTitleWrap}>
          <h2 className={styles.infoTitle}>{title}</h2>
          <div className={styles.infoSubtitle}>{subtitle}</div>
        </div>
      </div>

      <p className={styles.infoBody}>{body}</p>
      {meta ? <div className={styles.infoMeta}>{meta}</div> : null}
    </article>
  )
}

function SummaryCard({ label, value, meta, tone = 'default' }) {
  return (
    <div className={`${styles.summaryCard} ${styles[`summary_${tone}`] || ''}`}>
      <div className={styles.summaryLabel}>{label}</div>
      <div className={styles.summaryValue}>{value}</div>
      {meta ? <div className={styles.summaryMeta}>{meta}</div> : null}
    </div>
  )
}

function FlowCard({ step, title, desc, tag }) {
  return (
    <article className={styles.flowCard}>
      <div className={styles.flowTop}>
        <span className={styles.flowStep}>{step}</span>
        <span className={styles.flowTag}>{tag}</span>
      </div>
      <span className={styles.flowTitle}>{title}</span>
      <span className={styles.flowDesc}>{desc}</span>
    </article>
  )
}

export default function FantasyPage() {
  const navigate = useNavigate()
  const overviewRef = useRef(null)
  const flowRef = useRef(null)
  const [runSnapshot, setRunSnapshot] = useState(null)

  useEffect(() => {
    const currentState = getRunState()
    if (currentState && currentState.hp > 0) setRunSnapshot(currentState)
  }, [])

  const hasActiveRun = Boolean(runSnapshot)

  const heroCopy = useMemo(() => {
    if (hasActiveRun) {
      return {
        status: 'RUN ACTIVE',
        title: '继续你的执教生涯',
        desc: '你的战队仍在征战中。回到大本营，继续补强首发、强化核心、处理随机事件，并带着这套阵容继续向更高阶段推进。'
      }
    }

    return {
      status: 'PRE-SEASON READY',
      title: 'Roguelike 电竞经理模拟',
      desc: '这不是单纯的数值比拼，而是一套围绕资金、选手特质、遗物、随机事件与战术博弈展开的完整循环。合理管理资源，组出能一路爬塔的传奇阵容。'
    }
  }, [hasActiveRun])

  const summaryData = useMemo(() => {
    if (hasActiveRun) {
      const roleCounts = {
        TANK: runSnapshot.roster?.filter(p => p.role === 'TANK').length || 0,
        DPS: runSnapshot.roster?.filter(p => p.role === 'DPS').length || 0,
        SUP: runSnapshot.roster?.filter(p => p.role === 'SUP').length || 0
      }

      return [
        {
          label: 'RUN STATUS',
          value: 'CONTINUE',
          meta: `STAGE ${runSnapshot.currentNode}`,
          tone: 'accent'
        },
        {
          label: 'TEAM LIVES',
          value: Array(runSnapshot.hp || 0).fill('❤').join('') || '--',
          meta: 'ACTIVE SAVE DETECTED'
        },
        {
          label: 'FUNDS',
          value: `$${runSnapshot.money || 0}K`,
          meta: `RELICS ${runSnapshot.relics?.length || 0}`
        },
        {
          label: 'LINEUP',
          value: `${runSnapshot.roster?.length || 0}/5`,
          meta: `T ${roleCounts.TANK} · D ${roleCounts.DPS} · S ${roleCounts.SUP}`
        }
      ]
    }

    return [
      {
        label: 'RUN STATUS',
        value: 'NEW RUN',
        meta: 'NO ACTIVE SAVE'
      },
      {
        label: 'CORE LOOP',
        value: 'DRAFT / BATTLE / GROW',
        meta: 'BUILD → FIGHT → UPGRADE'
      },
      {
        label: 'LINEUP RULE',
        value: '5 PLAYERS',
        meta: 'TANK ×1 / DPS ×2 / SUP ×2'
      },
      {
        label: 'RESOURCE MODEL',
        value: 'FUNDS / RELICS / HP',
        meta: 'ROGUELIKE ECONOMY'
      }
    ]
  }, [hasActiveRun, runSnapshot])

  const scrollToSection = ref => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  return (
    <div className={styles.container}>
      <header className={styles.topBar}>
        <div className={styles.topBarLeft}>
          <span className={styles.kickerCn}>网页小游戏</span>
          <span className={styles.kickerEn}>ROGUELIKE MANAGER</span>
        </div>

        <div className={styles.topBarRight}>
          <div className={styles.statusChip}>
            <span className={styles.statusChipLabel}>SYSTEM</span>
            <span className={styles.statusChipValue}>{heroCopy.status}<span className={styles.pulseDot} /></span>
          </div>
          <div className={styles.statusChip}>
            <span className={styles.statusChipLabel}>MODE</span>
            <span className={styles.statusChipValue}>FRIESCUP FANTASY</span>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        <section className={styles.heroSection}>
          <div className={styles.heroMain}>
            <div className={styles.heroKicker}>ESPORTS MANAGER / FANTASY</div>
            <h1 className={styles.heroTitle}>Fantasy</h1>
            <h2 className={styles.heroSubTitle}>{heroCopy.title}</h2>
            <p className={styles.heroDesc}>{heroCopy.desc}</p>

            <div className={styles.heroActions}>
              <button onClick={() => navigate('/shop')} className={styles.btnPrimary}>
                <div className={styles.btnMain}>
                  <span className={styles.btnTitle}>{hasActiveRun ? 'ENTER BASE CAMP' : 'INITIALIZE NEW RUN'}</span>
                  <span className={styles.btnDesc}>
                    {hasActiveRun ? '进入大本营，继续你未完成的挑战' : '获取 $2000K 初始资金，开始全新执教生涯'}
                  </span>
                </div>
                <span className={styles.btnArrow}>→</span>
              </button>

              <div className={styles.heroMiniActions}>
                <button onClick={() => scrollToSection(overviewRef)} className={styles.btnGhost}>查看玩法机制</button>
                <button onClick={() => scrollToSection(flowRef)} className={styles.btnGhost}>查看推进节奏</button>
              </div>
            </div>

            <div className={styles.heroTags}>
              <span className={styles.heroTag}>ROGUE ECONOMY</span>
              <span className={styles.heroTag}>PLAYER TRAITS</span>
              <span className={styles.heroTag}>RELICS & AWAKEN</span>
              <span className={styles.heroTag}>ENDLESS CLIMB</span>
            </div>
          </div>

          <aside className={styles.heroAside}>
            <div className={styles.heroAsideHead}>
              <div>
                <div className={styles.sectionKicker}>COMMAND SNAPSHOT</div>
                <h3 className={styles.sectionTitle}>当前模式概览</h3>
              </div>
              <div className={styles.sectionMeta}>READY ROOM</div>
            </div>

            <div className={styles.heroSummary}>
              {summaryData.map(card => (
                <SummaryCard
                  key={card.label}
                  label={card.label}
                  value={card.value}
                  meta={card.meta}
                  tone={card.tone}
                />
              ))}
            </div>

            <div className={styles.championCallout}>
              <div className={styles.championLabel}>MANAGER HALL OF FAME</div>
              <div className={styles.championDesc}>系统访问已授权。你可以随时在此查阅自己的执教历史、巅峰阵容与冠军成就。</div>
              {/* 👇 核心修改：解锁生涯殿堂按钮，接入 /career 路由 */}
              <button
                onClick={() => navigate('/career')}
                className={styles.btnSecondary}
              >
                <span>查看生涯殿堂</span>
                <span className={styles.unlockedTag}>OPEN →</span>
              </button>
            </div>
          </aside>
        </section>

        <section ref={overviewRef} className={styles.infoSection}>
          <div className={styles.sectionHead}>
            <div>
              <div className={styles.sectionKicker}>GAMEPLAY OVERVIEW</div>
              <h3 className={styles.sectionTitle}>核心玩法机制</h3>
            </div>
            <div className={styles.sectionMeta}>MODE BRIEFING</div>
          </div>

          <div className={styles.infoGrid}>
            <InfoCard
              index="01"
              title="发掘核心选手"
              subtitle="SCOUTING & TRAITS"
              body="基于真实赛场数据生成的选手卡池。每位选手都有独特的打法特质，合理搭配阵容、触发同队羁绊，才能发挥最大战力。"
              meta="选人不仅仅看 OVR，更注重化学反应"
            />

            <InfoCard
              index="02"
              title="资源运营与特训"
              subtitle="RELICS & AWAKENING"
              body="资金分配是破局的关键。你可以在市场中补强阵容，也可以倾斜资源特训核心，进一步拉高整套体系的上限。"
              meta="高风险与高回报的资源管理"
            />

            <InfoCard
              index="03"
              title="战术博弈与阶段挑战"
              subtitle="TACTICS & ENDLESS CLIMB"
              body="在赛场上灵活运用战术体系克制强敌，逐步挑战更高阶段。阵容成型只是开始，真正的重点是让它持续赢下去。"
              meta="验证阵容强度的不断攀升"
            />
          </div>
        </section>

        <section ref={flowRef} className={styles.flowSection}>
          <div className={styles.sectionHead}>
            <div>
              <div className={styles.sectionKicker}>PLAY FLOW</div>
              <h3 className={styles.sectionTitle}>对局推进节奏</h3>
            </div>
            <div className={styles.sectionMeta}>HOW A RUN MOVES</div>
          </div>

          <div className={styles.flowGrid}>
            <FlowCard
              step="STEP 01"
              tag="BASE CAMP"
              title="组建与特训"
              desc="在预算内凑齐 5 人首发，围绕羁绊、特质与核心位决定这轮 run 的成长路线。"
            />
            <FlowCard
              step="STEP 02"
              tag="SCOUTING"
              title="局外决策"
              desc="选择更稳的对手、收益更高的精英战，或承担未知事件带来的波动与收益。"
            />
            <FlowCard
              step="STEP 03"
              tag="BATTLE"
              title="赛场博弈"
              desc="通过战术克制与阵容强度赢下比赛，带着新的资源回到基地，继续向下一阶段推进。"
            />
          </div>
        </section>
      </main>
    </div>
  )
}