// src/EsportsManager/pages/CareerPage.jsx
import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './CareerPage.module.css'

const DEFAULT_STATS = {
  totalRuns: 0,
  wins: 0,
  losses: 0,
  maxOvr: 0,
  totalMoneySpent: 0,
  hallOfFame: []
}

function SummaryCard({ label, value, meta = '', tone = '' }) {
  return (
    <div className={`${styles.summaryCard} ${tone ? styles[tone] : ''}`}>
      <span className={styles.summaryLabel}>{label}</span>
      <span className={styles.summaryValue}>{value}</span>
      {meta ? <span className={styles.summaryMeta}>{meta}</span> : null}
    </div>
  )
}

export default function CareerPage() {
  const navigate = useNavigate()
  const [stats, setStats] = useState(DEFAULT_STATS)

  useEffect(() => {
    const saved = localStorage.getItem('fca_manager_career_v2')
    if (!saved) return
    try {
      const parsed = JSON.parse(saved)
      setStats({ ...DEFAULT_STATS, ...parsed, hallOfFame: Array.isArray(parsed?.hallOfFame) ? parsed.hallOfFame : [] })
    } catch {
      setStats(DEFAULT_STATS)
    }
  }, [])

  const derived = useMemo(() => {
    const wins = Number(stats.wins) || 0
    const losses = Number(stats.losses) || 0
    const totalRuns = Number(stats.totalRuns) || 0
    const totalMoneySpent = Number(stats.totalMoneySpent) || 0
    const maxOvr = Number(stats.maxOvr) || 0
    const totalMatches = wins + losses
    const winRate = totalMatches > 0 ? ((wins / totalMatches) * 100).toFixed(1) : '0.0'
    const hof = Array.isArray(stats.hallOfFame) ? stats.hallOfFame.slice(0, 5) : []
    return { wins, losses, totalRuns, totalMoneySpent, maxOvr, totalMatches, winRate, hof }
  }, [stats])

  const handleReset = () => {
    if (!window.confirm('🚨 警告：这将抹除所有历史荣誉、最高分记录和成就。确定要重置吗？')) return
    localStorage.removeItem('fca_manager_career_v2')
    localStorage.removeItem('friesCup_currentRun')
    setStats(DEFAULT_STATS)
    alert('生涯记录已清空。')
  }

  return (
    <div className={styles.container}>
      <header className={styles.heroSection}>
        <div className={styles.heroMain}>
          <button onClick={() => navigate('/shop')} className={styles.btnBack}>
            ← 返回大本营 / RETURN TO HUB
          </button>

          <div className={styles.heroKicker}>
            <span className={styles.heroKickerCn}>教练档案室</span>
            <span className={styles.heroKickerEn}>MANAGER HALL OF FAME</span>
          </div>

          <h1 className={styles.title}>生涯殿堂</h1>

          <p className={styles.heroDesc}>
            最高机密权限已授权。这里记录了你在执教生涯中的所有荣辱：巅峰对决的胜率、倾注的心血预算，以及那些曾跟随你征战沙场并被载入史册的传奇阵容。
          </p>

          <div className={styles.heroTags}>
            <span className={styles.heroTag}>CAREER STATS</span>
            <span className={styles.heroTag}>HALL OF FAME</span>
            <span className={styles.heroTag}>RUN HISTORY</span>
          </div>
        </div>

        <div className={styles.heroSummary}>
          <SummaryCard
            label="累计挑战次数"
            value={derived.totalRuns}
            meta="TOTAL CLIMBS"
          />
          <SummaryCard
            label="总胜率 (小局)"
            value={`${derived.winRate}%`}
            meta={`${derived.wins}W / ${derived.losses}L`}
            tone="summaryAccent"
          />
          <SummaryCard
            label="生涯最高战力"
            value={`${derived.maxOvr} OVR`}
            meta="PEAK TEAM POWER"
          />
          <SummaryCard
            label="累计消费预算"
            value={`$${derived.totalMoneySpent}K`}
            meta="TOTAL FUNDS SPENT"
          />
        </div>
      </header>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionHeaderMain}>
            <div className={styles.sectionKicker}>RECENT RUNS</div>
            <h2 className={styles.sectionTitle}>战队名册</h2>
          </div>
          <div className={styles.sectionMeta}>显示最近 5 次周目的最终阵容</div>
        </div>

        {derived.hof.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyTitle}>暂无历史记录</div>
            <p className={styles.emptyDesc}>前往大本营开启一次挑战，把你的第一份冠军档案留在这里。</p>
          </div>
        ) : (
          <div className={styles.historyGrid}>
            {derived.hof.map((h, i) => {
              const roster = Array.isArray(h?.roster) ? h.roster : []
              const relics = Array.isArray(h?.relics) ? h.relics : []
              const resultText = h?.result || 'UNKNOWN'
              // 判断是否通关 (比如包含 WON, WIN 或者 冠军)
              const isWin = String(resultText).toUpperCase().includes('WIN') || resultText.includes('胜') || resultText.includes('冠')
              const finalPower = h?.finalPower || '--'

              return (
                <article key={`${h?.node || 'node'}-${i}`} className={`${styles.historyCard} ${isWin ? styles.historyWin : styles.historyLoss}`}>
                  <div className={styles.historyTop}>
                    <div className={styles.historyIndex}>RECORD {String(i + 1).padStart(2, '0')}</div>
                    <div className={`${styles.historyResult} ${isWin ? styles.resultWin : styles.resultLoss}`}>
                      {resultText}
                    </div>
                  </div>

                  <div className={styles.historyBody}>
                    <div className={styles.historyMetaRow}>
                      <div className={styles.historyStage}>
                        <span className={styles.historyLabel}>MAX STAGE</span>
                        <span className={styles.historyValue}>Stage {h?.node ?? '--'}</span>
                      </div>
                      <div className={styles.historyStage}>
                        <span className={styles.historyLabel}>FINAL POWER</span>
                        <span className={styles.historyValue}>{finalPower} OVR</span>
                      </div>
                    </div>

                    <div className={styles.historyRosterBlock}>
                      <span className={styles.historyLabel}>FINAL LINEUP</span>
                      {roster.length > 0 ? (
                        <div className={styles.rosterChips}>
                          {/* 👇 完整版：加入了 SSR 传奇大爹的专属 👑 显示以及满星觉醒的 ⭐ 显示 */}
                          {roster.map((p, idx) => (
                            <span key={`${p?.display_name || 'player'}-${idx}`} className={`${styles.rosterChip} ${p.isAwakened ? styles.chipAwakened : ''}`}>
                              {p.player_id?.startsWith('L-') ? '👑 ' : (p.isAwakened ? '⭐ ' : '')}{p?.display_name || 'Unknown'}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className={styles.historyFallback}>首发名单为空... 疑似携带巨款潜逃？</span>
                      )}
                    </div>

                    {/* 遗物展示 */}
                    {relics.length > 0 && (
                      <div className={styles.historyRosterBlock}>
                        <span className={styles.historyLabel}>ACTIVE RELICS</span>
                        <div className={styles.relicChips}>
                          {relics.map((r, idx) => (
                            <span key={`relic-${idx}`} className={styles.relicChip} title={r.desc}>
                              {r.icon} {r.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerHint}>
          HARD RESET 将抹除您在本机所有的电竞经理生涯数据，且无法恢复。
        </div>

        <button onClick={handleReset} className={styles.btnDanger}>
          清空教练档案 / HARD RESET
        </button>
      </footer>
    </div>
  )
}