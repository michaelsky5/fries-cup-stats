import { useMemo, useState, useEffect } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import DatabaseSubnav from '../../components/database/DatabaseSubnav.jsx'
import { formatOwHeroName, getOwHeroAssetKey, getOwHeroRole, normalizeOwLookupKey } from '../../lib/heroes.js'
import { safeArr } from '../../lib/selectors.js'
import styles from './HeroesPage.module.css'

function formatHeroName(name) {
  if (!name || name === '-') return 'unknown'
  const assetKey = getOwHeroAssetKey(name)
  if (assetKey) return assetKey
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
  return { cn: '其他阵列', en: 'OTHER' }
}

const RECORDED_ROLE_ORDER = {
  TANK: 0,
  DAMAGE: 1,
  SUPPORT: 2
}

function normalizeRecordedRole(role) {
  const normalized = String(role || '').toUpperCase()
  if (normalized === 'DPS') return 'DAMAGE'
  if (normalized === 'SUP') return 'SUPPORT'
  return normalized
}

function getRecordedHeroKey(hero) {
  return getOwHeroAssetKey(hero) || normalizeOwLookupKey(hero)
}

function getTopMapValue(map) {
  return [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] || '-'
}

function getRecordedTeam(match, map, side, stats) {
  const statTeam = stats.find(item => item.team_id || item.team_name || item.team_short_name) || {}
  const fallbackTeam = side === 'team_a_stats' ? match?.team_a : match?.team_b

  return {
    name: statTeam.team_name || (side === 'team_a_stats' ? map?.team_a_name : map?.team_b_name) || fallbackTeam?.name || '',
    short: statTeam.team_short_name || fallbackTeam?.short || statTeam.team_name || ''
  }
}

function getRecordedCompositions(db, limit = 5) {
  const compositionMap = new Map()
  let totalRecords = 0

  safeArr(db?.matches).forEach(match => {
    const status = String(match?.status || '').toUpperCase()
    if (status !== 'COMPLETE' && status !== 'COMPLETED') return

    safeArr(match?.maps).forEach(map => {
      const mapName = String(map?.map_name || '').trim()
      const mapType = String(map?.map_type || 'UNKNOWN').trim()
      if (!mapName || mapName.toLowerCase() === 'default win' || mapType.toUpperCase() === 'UNKNOWN') return

      ;['team_a_stats', 'team_b_stats'].forEach(side => {
        const rawStats = safeArr(map?.[side])
        const recordedHeroes = rawStats
          .map(stat => {
            const hero = String(stat?.heroes_played || '').trim()
            const role = normalizeRecordedRole(stat?.role) || normalizeRecordedRole(getOwHeroRole(hero))
            return {
              hero,
              heroKey: getRecordedHeroKey(hero),
              role
            }
          })
          .filter(item => item.hero && item.hero !== '-' && item.hero !== 'UNKNOWN')
          .sort((a, b) => {
            const roleDiff = (RECORDED_ROLE_ORDER[a.role] ?? 9) - (RECORDED_ROLE_ORDER[b.role] ?? 9)
            if (roleDiff !== 0) return roleDiff
            return a.heroKey.localeCompare(b.heroKey)
          })

        const seenHeroes = new Set()
        const composition = recordedHeroes.filter(item => {
          const key = item.heroKey || item.hero.toLowerCase()
          if (seenHeroes.has(key)) return false
          seenHeroes.add(key)
          return true
        }).slice(0, 5)

        if (composition.length < 5) return

        const key = composition.map(item => `${item.role}:${item.heroKey || item.hero}`).join('|')
        const team = getRecordedTeam(match, map, side, rawStats)

        if (!compositionMap.has(key)) {
          compositionMap.set(key, {
            key,
            heroes: composition,
            count: 0,
            maps: new Map(),
            modes: new Map(),
            teams: new Map()
          })
        }

        const row = compositionMap.get(key)
        row.count += 1
        row.maps.set(mapName, (row.maps.get(mapName) || 0) + 1)
        row.modes.set(mapType, (row.modes.get(mapType) || 0) + 1)

        const teamLabel = team.short || team.name
        if (teamLabel) row.teams.set(teamLabel, (row.teams.get(teamLabel) || 0) + 1)

        totalRecords += 1
      })
    })
  })

  return {
    totalRecords,
    compositions: [...compositionMap.values()]
      .map(row => ({
        ...row,
        share: totalRecords > 0 ? row.count / totalRecords : 0,
        topMap: getTopMapValue(row.maps),
        topMode: getTopMapValue(row.modes),
        topTeam: getTopMapValue(row.teams)
      }))
      .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key))
      .slice(0, limit)
  }
}

function RecordedHeroAvatar({ hero, role, locale }) {
  const heroDisplayName = formatOwHeroName(hero, locale)

  return (
    <span className={styles.compHero}>
      <span className={styles.compHeroAvatar}>
        <img
          src={`/heroes/${getRoleFolder(role)}/${formatHeroName(hero)}.png`}
          alt=""
          onError={(e) => {
            e.target.style.display = 'none'
          }}
        />
      </span>
      <span className={styles.compHeroName} title={heroDisplayName}>{heroDisplayName}</span>
      <span className={styles.compHeroRole}>{role}</span>
    </span>
  )
}

function RecordedCompsPanel({ data, locale }) {
  const leader = data.compositions[0]
  const rest = data.compositions.slice(1)

  if (!leader) return null

  return (
    <section className={styles.compsPanel} aria-labelledby="recorded-comps-title">
      <div className={styles.compsHeader}>
        <div className={styles.compsTitleGroup}>
          <span className={styles.compsKicker}>RECORDED COMPS</span>
          <h2 id="recorded-comps-title">最终记录阵容</h2>
        </div>
        <p>基于每张地图双方队伍的最终记录英雄统计，不代表整局全程阵容。</p>
      </div>

      <div className={styles.compsBody}>
        <article className={styles.compLeader}>
          <div className={styles.compRank}>01</div>
          <div className={styles.compMain}>
            <div className={styles.compHeroes} aria-label="Top recorded composition">
              {leader.heroes.map(item => (
                <RecordedHeroAvatar key={`${item.role}-${item.hero}`} hero={item.hero} role={item.role} locale={locale} />
              ))}
            </div>

            <div className={styles.compMetaGrid}>
              <span>
                <b>记录次数</b>
                <strong>{leader.count}</strong>
              </span>
              <span>
                <b>记录占比</b>
                <strong>{(leader.share * 100).toFixed(1)}%</strong>
              </span>
              <span>
                <b>常见地图</b>
                <strong>{leader.topMap}</strong>
              </span>
              <span>
                <b>样本总数</b>
                <strong>{data.totalRecords}</strong>
              </span>
            </div>
          </div>
        </article>

        <div className={styles.compList}>
          {rest.map((comp, index) => (
            <article key={comp.key} className={styles.compListItem}>
              <div className={styles.compListRank}>{String(index + 2).padStart(2, '0')}</div>
              <div className={styles.compListHeroes}>
                {comp.heroes.map(item => (
                  <RecordedHeroAvatar key={`${item.role}-${item.hero}`} hero={item.hero} role={item.role} locale={locale} />
                ))}
              </div>
              <div className={styles.compListStats}>
                <strong>{comp.count}</strong>
                <span>{(comp.share * 100).toFixed(1)}%</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

export default function HeroesPage() {
  const { db, locale = 'zh-CN', withSeason = path => path } = useOutletContext()
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
  const recordedComps = useMemo(() => getRecordedCompositions(db, 5), [db])

  return (
    <div className={styles.shell}>
      <DatabaseSubnav />
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
            <div className={styles.metaValueText} title={summary.topHero}>{formatOwHeroName(summary.topHero, locale)}</div>
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

      <RecordedCompsPanel data={recordedComps} locale={locale} />

      <section className={styles.gridSection}>
        {filteredHeroes.length > 0 ? (
          <div className={styles.heroGrid}>
            {filteredHeroes.map((hero, index) => {
              const roleFolder = getRoleFolder(hero.role)
              const heroFileName = formatHeroName(hero.name)
              const heroDisplayName = formatOwHeroName(hero.name, locale)
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
                        alt={heroDisplayName}
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
                      <h2 className={styles.heroName}>{heroDisplayName}</h2>
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

                    <Link to={withSeason(`/players/${encodeURIComponent(hero.bestPlayer.id)}`)} className={styles.bestPlayerLink}>
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
            <span className={styles.emptyCn}>{locale === 'en-US' ? 'No hero records yet' : '暂无英雄出场记录'}</span>
            <span className={styles.emptyEn}>{locale === 'en-US' ? 'Awaiting match stats' : '等待比赛统计'}</span>
          </div>
        )}
      </section>
    </div>
  )
}
