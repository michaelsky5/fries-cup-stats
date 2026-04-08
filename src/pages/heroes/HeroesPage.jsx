import { useMemo, useState, useEffect } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { safeArr } from '../../lib/selectors.js'
import styles from './HeroesPage.module.css'

function formatHeroName(name) {
  if (!name || name === '-') return 'unknown'
  return name.toLowerCase()
    .replace(/ú/g, 'u')
    .replace(/ö/g, 'o')
    .replace(/\./g, '')
    .replace(/: /g, '_')
    .replace(/ /g, '_')
    .replace(/-/g, '_')
}

// 🌟 修复：安全容错机制
function getRoleFolder(role) {
  if (!role) return 'damage'
  const r = role.toUpperCase()
  if (r === 'TANK') return 'tank'
  if (r === 'SUP' || r === 'SUPPORT') return 'support'
  if (r === 'DPS' || r === 'DAMAGE') return 'damage'
  return 'damage'
}

function formatTime(minutes) {
  if (!minutes) return '0m'
  const h = Math.floor(minutes / 60)
  const m = Math.floor(minutes % 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

// 🌟 修复：对齐 DAMAGE 和 SUPPORT
function getRoleLabel(role) {
  if (role === 'ALL') return { cn: '全部阵列', en: 'ALL ROLES' }
  if (role === 'TANK') return { cn: '重装阵列', en: 'TANK' }
  if (role === 'DAMAGE' || role === 'DPS') return { cn: '输出阵列', en: 'DAMAGE' }
  if (role === 'SUPPORT' || role === 'SUP') return { cn: '支援阵列', en: 'SUPPORT' }
  return { cn: '未知阵列', en: 'UNKNOWN' }
}

export default function HeroesPage() {
  const { db } = useOutletContext()
  const [activeRole, setActiveRole] = useState('ALL')

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const heroStats = useMemo(() => {
    const stats = {}
    const players = safeArr(db?.players)

    players.forEach(p => {
      const logs = safeArr(p.match_logs?.length > 0 ? p.match_logs : p.live_match_logs)

      logs.forEach(log => {
        const h = log.hero
        if (!h || h === '-' || h === 'UNKNOWN') return

        // 🌟 修复：规范化 JSON 里的角色，统一变成标准大写
        let normalizedRole = String(log.role).toUpperCase()
        if (normalizedRole === 'DPS') normalizedRole = 'DAMAGE'
        if (normalizedRole === 'SUP') normalizedRole = 'SUPPORT'

        if (!stats[h]) {
          stats[h] = {
            name: h,
            role: normalizedRole,
            totalTime: 0,
            players: {}
          }
        }

        const time = Number(log.playtimeMinutes) || 0
        stats[h].totalTime += time

        if (!stats[h].players[p.player_id]) {
          stats[h].players[p.player_id] = {
            id: p.player_id,
            name: p.display_name || p.player_name,
            team: p.team_short_name || 'FREE',
            time: 0
          }
        }

        stats[h].players[p.player_id].time += time
      })
    })

    return Object.values(stats).map(hero => {
      const bestPlayer = Object.values(hero.players).sort((a, b) => b.time - a.time)[0]
      return { ...hero, bestPlayer }
    }).sort((a, b) => b.totalTime - a.totalTime)
  }, [db])

  const filteredHeroes = useMemo(() => {
    if (activeRole === 'ALL') return heroStats
    return heroStats.filter(h => h.role === activeRole)
  }, [heroStats, activeRole])

  const maxTime = heroStats.length > 0 ? heroStats[0].totalTime : 1

  const summary = useMemo(() => {
    const totalHeroes = heroStats.length
    const currentCount = filteredHeroes.length
    const totalPlaytime = filteredHeroes.reduce((sum, hero) => sum + Number(hero.totalTime || 0), 0)
    const topHero = filteredHeroes[0]?.name || '-'

    return { totalHeroes, currentCount, totalPlaytime, topHero }
  }, [heroStats, filteredHeroes])

  const activeRoleLabel = getRoleLabel(activeRole)

  return (
    <div className={styles.shell}>
      <section className={styles.heroSection}>
        <div className={styles.heroMain}>
          <div className={styles.heroKicker}>
            <span className={styles.heroKickerCn}>英雄情报中心</span>
            <span className={styles.heroKickerEn}>HERO META</span>
          </div>

          <h1 className={styles.heroTitle}>版本答案分析台</h1>

          <p className={styles.heroDesc}>
            基于全联盟比赛日志生成的英雄环境总览。用于观察当前版本的出场倾向、热门英雄与对应专精选手。
          </p>
        </div>

        <div className={styles.heroMeta}>
          <div className={styles.heroMetaItem}>
            <div className={styles.metaLabel}>
              <span className={styles.metaCn}>英雄总数</span>
              <span className={styles.metaEn}>TOTAL HEROES</span>
            </div>
            <div className={styles.metaValue}>{summary.totalHeroes}</div>
          </div>

          <div className={styles.heroMetaItem}>
            <div className={styles.metaLabel}>
              <span className={styles.metaCn}>当前阵列</span>
              <span className={styles.metaEn}>{activeRoleLabel.en}</span>
            </div>
            <div className={styles.metaValue}>{summary.currentCount}</div>
          </div>

          <div className={styles.heroMetaItem}>
            <div className={styles.metaLabel}>
              <span className={styles.metaCn}>累计时长</span>
              <span className={styles.metaEn}>TOTAL PLAYTIME</span>
            </div>
            <div className={styles.metaValue}>{formatTime(summary.totalPlaytime)}</div>
          </div>

          <div className={styles.heroMetaItem}>
            <div className={styles.metaLabel}>
              <span className={styles.metaCn}>头号热门</span>
              <span className={styles.metaEn}>TOP HERO</span>
            </div>
            <div className={styles.metaValueText} title={summary.topHero}>{summary.topHero}</div>
          </div>
        </div>
      </section>

      <section className={styles.filterSection}>
        <div className={styles.filterHead}>
          <div className={styles.filterTitleGroup}>
            <div className={styles.filterTitle}>阵列筛选</div>
            <div className={styles.filterSubTitle}>ROLE FILTER</div>
          </div>
        </div>

        <div className={styles.roleFilter}>
          {/* 🌟 修复：把筛选按钮变成统一的数据格式 */}
          {['ALL', 'TANK', 'DAMAGE', 'SUPPORT'].map(role => {
            const label = getRoleLabel(role)
            return (
              <button
                key={role}
                type="button"
                onClick={() => setActiveRole(role)}
                className={`${styles.filterBtn} ${activeRole === role ? styles.activeFilter : ''}`}
              >
                <span className={styles.filterBtnCn}>{label.cn}</span>
                <span className={styles.filterBtnEn}>{label.en}</span>
              </button>
            )
          })}
        </div>
      </section>

      <section className={styles.gridSection}>
        {filteredHeroes.length > 0 ? (
          <div className={styles.heroGrid}>
            {filteredHeroes.map((hero, index) => {
              const roleFolder = getRoleFolder(hero.role)
              const heroFileName = formatHeroName(hero.name)
              const pickRatePercent = Math.min(100, (hero.totalTime / maxTime) * 100)

              // 🌟 修复：匹配底层的新名字，不然颜色不对
              let roleClass = styles.borderFlex
              if (hero.role === 'TANK') roleClass = styles.borderTank
              if (hero.role === 'DAMAGE' || hero.role === 'DPS') roleClass = styles.borderDps
              if (hero.role === 'SUPPORT' || hero.role === 'SUP') roleClass = styles.borderSup

              return (
                <div key={hero.name} className={`${styles.heroCard} ${roleClass}`}>
                  <div className={styles.cardTop}>
                    <div className={styles.avatarBox}>
                      <img
                        src={`/heroes/${roleFolder}/${heroFileName}.png`}
                        alt={hero.name}
                        className={styles.avatarImg}
                        onError={(e) => {
                          e.target.style.display = 'none'
                          e.target.parentElement.classList.add(styles.avatarFallback)
                        }}
                      />
                    </div>

                    <div className={styles.heroInfo}>
                      <div className={styles.heroTopLine}>
                        <span className={styles.heroRole}>{hero.role}</span>
                        <span className={styles.rankBadge}>TOP {index + 1}</span>
                      </div>
                      <h2 className={styles.heroName}>{hero.name}</h2>
                    </div>
                  </div>

                  <div className={styles.cardMiddle}>
                    <div className={styles.statHead}>
                      <span className={styles.statCn}>总出场时长</span>
                      <span className={styles.statEn}>TOTAL PLAYTIME</span>
                    </div>

                    <div className={styles.statValue}>{formatTime(hero.totalTime)}</div>

                    <div className={styles.hotnessBar}>
                      <div className={styles.hotnessFill} style={{ width: `${pickRatePercent}%` }}></div>
                    </div>
                  </div>

                  <div className={styles.cardBottom}>
                    <div className={styles.bestPlayerLabel}>
                      <span className={styles.bestPlayerCn}>最高熟练度选手</span>
                      <span className={styles.bestPlayerEn}>BEST SPECIALIST</span>
                    </div>

                    <Link to={`/players/${encodeURIComponent(hero.bestPlayer.id)}`} className={styles.bestPlayerLink}>
                      <span className={styles.bpTeam}>[{hero.bestPlayer.team}]</span>
                      <span className={styles.bpName}>{hero.bestPlayer.name}</span>
                      <span className={styles.bpTime}>{formatTime(hero.bestPlayer.time)}</span>
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <span className={styles.emptyCn}>暂无英雄出场记录</span>
            <span className={styles.emptyEn}>NO HERO DATA AVAILABLE</span>
          </div>
        )}
      </section>
    </div>
  )
}