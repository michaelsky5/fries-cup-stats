import { useMemo, useEffect, useState } from 'react'
import { useOutletContext, useParams, useNavigate } from 'react-router-dom'
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip
} from 'recharts'
import { getLeaderboardRows, safeArr } from '../../lib/selectors.js'
import styles from './PlayerDetailPage.module.css'

function formatNum(value, digits = 2) {
  const num = Number(value || 0)
  return Number.isFinite(num) ? num.toFixed(digits) : '0.00'
}

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

function getRoleFolder(role) {
  if (!role) return 'damage'
  const r = role.toUpperCase()
  if (r === 'TANK') return 'tank'
  if (r === 'SUP' || r === 'SUPPORT') return 'support'
  return 'damage'
}

function getRoleClass(role) {
  const r = String(role || '').toUpperCase()
  if (r === 'TANK') return styles.roleTank
  if (r === 'DPS') return styles.roleDps
  if (r === 'SUP' || r === 'SUPPORT') return styles.roleSup
  return styles.roleFlex
}

function calculatePercentile(rank, total) {
  if (total <= 1) return 100
  return Math.round(((total - rank) / (total - 1)) * 100)
}

const CustomRadarTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className={styles.radarTooltip}>
        <div className={styles.tooltipTitle}>{data.subject}</div>
        <div className={styles.tooltipRow}>
          <span className={styles.tooltipLabel}>选手真实数据</span>
          <span className={styles.tooltipValueHighlight}>{formatNum(data.rawPlayer)}</span>
        </div>
        <div className={styles.tooltipRow}>
          <span className={styles.tooltipLabel}>同位置平均</span>
          <span className={styles.tooltipValue}>{formatNum(data.rawAvg)}</span>
        </div>
      </div>
    )
  }
  return null
}

export default function PlayerDetailPage() {
  const { db } = useOutletContext()
  const { playerId } = useParams()
  const navigate = useNavigate()
  const [aiText, setAiText] = useState('')

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const handleBack = () => {
    if (window.history.state && window.history.state.idx > 0) navigate(-1)
    else navigate('/players')
  }

  const player = useMemo(() => {
    const rows = getLeaderboardRows(db)
    const statsPlayer = rows.find(p => String(p.player_id) === String(playerId))
    if (!statsPlayer) return safeArr(db?.players).find(p => String(p.player_id) === String(playerId))
    return statsPlayer
  }, [db, playerId])

  const roleStats = useMemo(() => {
    if (!player || !db) return null

    const rows = getLeaderboardRows(db)
    let sameRole = rows.filter(p => p.role === player.role && (p.raw_time_mins || 0) > 0)
    if (sameRole.length === 0) sameRole = [player]

    const totalInRole = sameRole.length

    const getRankBySort = key => {
      if (totalInRole <= 1) return { percentile: 100 }

      const sorted = [...sameRole].sort((a, b) => (
        key === 'avg_dth'
          ? (Number(a[key]) || 0) - (Number(b[key]) || 0)
          : (Number(b[key]) || 0) - (Number(a[key]) || 0)
      ))

      const rank = sorted.findIndex(p => p.player_id === player.player_id) + 1
      if (rank === 0) return { percentile: 0 }

      return { percentile: calculatePercentile(rank, totalInRole) }
    }

    const max = { dmg: 1, heal: 1, mit: 1, elim: 1, ast: 1, dth: 1 }
    const sum = { dmg: 0, heal: 0, mit: 0, elim: 0, ast: 0, dth: 0 }

    sameRole.forEach(p => {
      max.dmg = Math.max(max.dmg, Number(p.avg_dmg) || 0)
      max.heal = Math.max(max.heal, Number(p.avg_heal) || 0)
      max.mit = Math.max(max.mit, Number(p.avg_block) || 0)
      max.elim = Math.max(max.elim, Number(p.avg_elim) || 0)
      max.ast = Math.max(max.ast, Number(p.avg_ast) || 0)
      max.dth = Math.max(max.dth, Number(p.avg_dth) || 0)

      sum.dmg += Number(p.avg_dmg) || 0
      sum.heal += Number(p.avg_heal) || 0
      sum.mit += Number(p.avg_block) || 0
      sum.elim += Number(p.avg_elim) || 0
      sum.ast += Number(p.avg_ast) || 0
      sum.dth += Number(p.avg_dth) || 0
    })

    return {
      avg: {
        dmg: sum.dmg / totalInRole,
        heal: sum.heal / totalInRole,
        mit: sum.mit / totalInRole,
        elim: sum.elim / totalInRole,
        ast: sum.ast / totalInRole,
        dth: sum.dth / totalInRole
      },
      max,
      ranks: {
        dmg: getRankBySort('avg_dmg'),
        heal: getRankBySort('avg_heal'),
        mit: getRankBySort('avg_block'),
        elim: getRankBySort('avg_elim'),
        dth: getRankBySort('avg_dth')
      }
    }
  }, [db, player])

  const radarData = useMemo(() => {
    if (!player || !roleStats) return []

    const getScore = (val, maxVal) => {
      const v = Number(val) || 0
      const m = Number(maxVal) || 1
      return Math.min(100, Math.max(0, (v / m) * 100)) || 0
    }

    const getSurvScore = (dth, maxDth) => {
      const d = Number(dth) || 0
      const m = Number(maxDth) || 1
      if (d <= 0) return 100
      return Math.min(100, Math.max(0, 100 - (d / m) * 100)) || 0
    }

    return [
      { subject: '伤害', Player: getScore(player.avg_dmg, roleStats.max.dmg), Avg: getScore(roleStats.avg.dmg, roleStats.max.dmg), rawPlayer: player.avg_dmg, rawAvg: roleStats.avg.dmg },
      { subject: '击杀', Player: getScore(player.avg_elim, roleStats.max.elim), Avg: getScore(roleStats.avg.elim, roleStats.max.elim), rawPlayer: player.avg_elim, rawAvg: roleStats.avg.elim },
      { subject: '助攻', Player: getScore(player.avg_ast, roleStats.max.ast), Avg: getScore(roleStats.avg.ast, roleStats.max.ast), rawPlayer: player.avg_ast, rawAvg: roleStats.avg.ast },
      { subject: '治疗', Player: getScore(player.avg_heal, roleStats.max.heal), Avg: getScore(roleStats.avg.heal, roleStats.max.heal), rawPlayer: player.avg_heal, rawAvg: roleStats.avg.heal },
      { subject: '阻挡', Player: getScore(player.avg_block, roleStats.max.mit), Avg: getScore(roleStats.avg.mit, roleStats.max.mit), rawPlayer: player.avg_block, rawAvg: roleStats.avg.mit },
      { subject: '生存', Player: getSurvScore(player.avg_dth, roleStats.max.dth), Avg: getSurvScore(roleStats.avg.dth, roleStats.max.dth), rawPlayer: player.avg_dth, rawAvg: roleStats.avg.dth }
    ]
  }, [player, roleStats])

  const styleProfile = useMemo(() => {
    if (!player || !roleStats) {
      return {
        cn: '数据分析中',
        en: 'PROFILE LOADING',
        desc: '系统正在生成该选手的风格画像。'
      }
    }

    const role = String(player.role || '').toUpperCase()
    const dmg = roleStats.ranks.dmg.percentile || 0
    const heal = roleStats.ranks.heal.percentile || 0
    const mit = roleStats.ranks.mit.percentile || 0
    const elim = roleStats.ranks.elim.percentile || 0
    const survive = roleStats.ranks.dth.percentile || 0

    if (role === 'DPS') {
      if (dmg >= 80 && elim >= 80 && survive >= 50) {
        return {
          cn: '高压进攻核心',
          en: 'AGGRESSIVE CORE',
          desc: '以高击杀和高伤害构成正面压制，是典型的前压型输出位。'
        }
      }
      if (survive >= 75 && dmg >= 65) {
        return {
          cn: '稳定压制输出',
          en: 'STABLE DAMAGE',
          desc: '在保持生存稳定的同时持续制造火力压力，节奏控制较强。'
        }
      }
      if (dmg >= 75) {
        return {
          cn: '节奏型输出',
          en: 'PACE BREAKER',
          desc: '更擅长在关键节点拉高输出曲线，打破对局节奏。'
        }
      }
      return {
        cn: '机动火力点',
        en: 'FLEXIBLE FRAGGER',
        desc: '不依赖单一维度取胜，更偏向灵活补位与局部终结。'
      }
    }

    if (role === 'TANK') {
      if (mit >= 80 && survive >= 75) {
        return {
          cn: '前线承压核心',
          en: 'FRONTLINE ANCHOR',
          desc: '承担大量前线压力，生存与阻挡能力构成队伍的主框架。'
        }
      }
      if (dmg >= 75) {
        return {
          cn: '推进型前排',
          en: 'PACE DRIVER',
          desc: '更倾向于用主动推进和输出施压来打开空间。'
        }
      }
      return {
        cn: '均衡前线',
        en: 'BALANCED FRONT',
        desc: '综合能力分布均衡，在对局中承担稳定的前排职责。'
      }
    }

    if (role === 'SUP' || role === 'SUPPORT') {
      if (heal >= 80 && survive >= 75) {
        return {
          cn: '稳定后排支援',
          en: 'BACKLINE CORE',
          desc: '以后排持续援护和稳定存活构成团队支撑，是标准支点型选手。'
        }
      }
      if (dmg >= 70) {
        return {
          cn: '进攻型支援',
          en: 'OFFENSIVE SUPPORT',
          desc: '在保持团队功能的同时，具备较强的主动输出倾向。'
        }
      }
      return {
        cn: '团队支点',
        en: 'TEAM PIVOT',
        desc: '更偏向节奏支援和团队协同，作用体现在整体稳定性上。'
      }
    }

    return {
      cn: '均衡型选手',
      en: 'ALL-ROUND STYLE',
      desc: '整体能力分布较为均衡，没有明显短板，适合多场景发挥。'
    }
  }, [player, roleStats])

  useEffect(() => {
    if (!player || !roleStats || !styleProfile) return

    const lines = [
      `> 载入选手档案 [${player.player_id}] ...`,
      `> 位置识别：${player.role || 'UNKNOWN'}。`,
      `> 风格判定：${styleProfile.cn}。`,
      `> --------------------------------`,
      `> 火力输出高于同职责 ${roleStats.ranks.dmg.percentile}% 选手。`,
      `> 治疗/援护高于同职责 ${roleStats.ranks.heal.percentile}% 选手。`,
      `> 生存控制高于同职责 ${roleStats.ranks.dth.percentile}% 选手。`,
      `> 综合判词：${styleProfile.desc}`,
      `> --------------------------------`,
      `> AI 评估完成。`
    ]

    setAiText('')
    let currentLine = 0
    let currentChar = 0
    let timer

    const typeWriter = () => {
      if (currentLine >= lines.length) return
      const textToType = lines[currentLine]

      if (currentChar <= textToType.length) {
        setAiText(prev => prev + textToType.charAt(currentChar))
        currentChar++
        timer = setTimeout(typeWriter, 10)
      } else {
        setAiText(prev => prev + '\n')
        currentLine++
        currentChar = 0
        timer = setTimeout(typeWriter, 140)
      }
    }

    typeWriter()
    return () => clearTimeout(timer)
  }, [player, roleStats, styleProfile])

  const topHeroes = useMemo(() => {
    if (!player) return []
    const heroes = Array.isArray(player.top_3_heroes) ? player.top_3_heroes.filter(Boolean) : []
    if (heroes.length === 0 && player.most_played_hero) heroes.push(player.most_played_hero)
    return heroes
  }, [player])

  if (!player) {
    return (
      <div className={styles.shell}>
        <section className={styles.errorState}>
          <div className={styles.errorKicker}>PLAYER DOSSIER / ERROR</div>
          <h1 className={styles.errorTitle}>未找到该选手档案</h1>
          <p className={styles.errorDesc}>请求的选手编号不存在，或尚未载入当前赛季数据库。</p>
          <button type="button" onClick={handleBack} className={styles.backLinkBtn}>
            返回选手列表
            <span className={styles.backLinkBtnEn}>PLAYERS</span>
          </button>
        </section>
      </div>
    )
  }

  const roleClass = getRoleClass(player.role)
  const roleColor = 'var(--role-color)'

  return (
    <div className={styles.shell}>
      <div className={styles.topbar}>
        <div className={styles.topbarLeft}>
          <button type="button" onClick={handleBack} className={styles.navBackBtn}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            <span className={styles.navBackText}>
              <span className={styles.navBackCn}>返回</span>
              <span className={styles.navBackEn}>BACK</span>
            </span>
          </button>

          <div className={styles.topbarPathGroup}>
            <div className={styles.topbarKicker}>
              <span className={styles.topbarKickerCn}>选手档案</span>
              <span className={styles.topbarKickerEn}>PLAYER DOSSIER</span>
            </div>
            <div className={styles.topbarPath}>
              <span className={styles.topbarDivider}>/</span>
              <span className={styles.topbarCurrent}>{player.player_id || 'UNKNOWN'}</span>
            </div>
          </div>
        </div>
      </div>

      <section className={`${styles.idCard} ${roleClass}`}>
        <div className={styles.cardGlow}></div>

        <div className={styles.idCardContent}>
          <div className={styles.idCardLeft}>
            <div className={styles.playerRoleTag}>{player.role || 'FLEX'}</div>
            <h1 className={styles.playerName}>{player.display_name || player.player_id}</h1>
            <div className={styles.playerRealName}>{player.player_name || 'UNKNOWN IDENTITY'}</div>

            <div className={styles.profileBlock}>
              <div className={styles.profileTag}>{styleProfile.cn}</div>
              <div className={styles.profileTagEn}>{styleProfile.en}</div>
              <div className={styles.profileDesc}>{styleProfile.desc}</div>
            </div>

            {topHeroes.length > 0 ? (
              <div className={styles.quickHeroList}>
                {topHeroes.map((hero, idx) => (
                  <span key={`${hero}-${idx}`} className={styles.quickHeroChip}>{hero}</span>
                ))}
              </div>
            ) : null}
          </div>

          <div className={styles.idCardRight}>
            <div className={styles.teamBadge}>
              <div className={styles.teamKicker}>CURRENT TEAM</div>
              <div className={styles.currentTeamName}>{player.team_name || player.team_short_name || 'FREE AGENT'}</div>
            </div>

            <div className={styles.idCardMeta}>
              <div className={styles.idMetaItem}>
                <span className={styles.idMetaLabel}>MAPS</span>
                <span className={styles.idMetaValue}>{player.maps_played || '-'}</span>
              </div>
              <div className={styles.idMetaItem}>
                <span className={styles.idMetaLabel}>TIME</span>
                <span className={styles.idMetaValue}>{player.total_time_played || `${Math.round(player.raw_time_mins || 0)}m`}</span>
              </div>
              <div className={styles.idMetaItem}>
                <span className={styles.idMetaLabel}>FOCUS</span>
                <span className={styles.idMetaValue}>{topHeroes[0] || '-'}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className={styles.chartsGrid}>
        <section className={`${styles.hudSection} ${roleClass}`}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionKicker}>
              <span className={styles.sectionKickerCn}>能力多边形模型</span>
              <span className={styles.sectionKickerEn}>RADAR MODEL</span>
            </div>
            <div className={styles.legend}>
              <span className={styles.legendPlayer}>■ 本人</span>
              <span className={styles.legendAvg}>■ 平均</span>
            </div>
          </div>

          <div className={styles.radarWrap}>
            {radarData.length > 0 && (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius={86} data={radarData}>
                  <PolarGrid gridType="polygon" stroke="rgba(255,255,255,0.15)" />
                  <PolarAngleAxis dataKey="subject" stroke="rgba(255,255,255,0.6)" fontSize={11} fontWeight={800} />
                  <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                  <Tooltip content={<CustomRadarTooltip />} />
                  <Radar name="Avg" dataKey="Avg" stroke="rgba(255,255,255,0.42)" fill="rgba(255,255,255,0.05)" fillOpacity={0.5} strokeDasharray="3 3" />
                  <Radar name="Player" dataKey="Player" stroke={roleColor} fill={roleColor} fillOpacity={0.25} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <section className={styles.hudSection}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionKicker}>
              <span className={styles.sectionKickerCn}>同职责超越百分位</span>
              <span className={styles.sectionKickerEn}>PERCENTILE RANKING</span>
            </div>
            <div className={styles.hudLegend}>ROLE COMPARISON</div>
          </div>

          <div className={styles.barsGrid}>
            {[
              { id: 'dmg', label: '伤害输出', val: roleStats?.ranks.dmg.percentile, color: 'dmgRed' },
              { id: 'heal', label: '治疗效能', val: roleStats?.ranks.heal.percentile, color: 'healGreen' },
              { id: 'mit', label: '阻挡效能', val: roleStats?.ranks.mit.percentile, color: 'mitBlue' },
              { id: 'surv', label: '生存能力', val: roleStats?.ranks.dth.percentile, color: 'survGold' }
            ].map(bar => {
              const percentile = bar.val || 0
              return (
                <div key={bar.id} className={`${styles.barField} ${styles[bar.color]}`}>
                  <div className={styles.barLabelGroup}>
                    <span className={styles.barLabel}>{bar.label}</span>
                    <span className={styles.barValue}>{percentile}%</span>
                  </div>
                  <div className={styles.barBase}>
                    <div className={styles.barFill} style={{ width: `${percentile}%` }}></div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      </div>

      <section className={styles.aiTerminal}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionKicker}>
            <span className={styles.sectionKickerCn}>AI 球探综合报告</span>
            <span className={styles.sectionKickerEn}>AI SCOUT REPORT</span>
          </div>
        </div>

        <div className={styles.terminalWindow}>
          <pre className={styles.terminalText}>{aiText}</pre>
        </div>
      </section>

      <section className={`${styles.tacticalGridSection} ${roleClass}`}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionKicker}>
            <span className={styles.sectionKickerCn}>战术数据指标</span>
            <span className={styles.sectionKickerEn}>TACTICAL METRICS / PER 10</span>
          </div>
        </div>

        <div className={styles.metricsGrid}>
          <div className={styles.metricCard}>
            <div className={styles.metricLabelGroup}>
              <span className={styles.metricLabel}>存活时长</span>
              <span className={styles.metricLabelEn}>TIME</span>
            </div>
            <div className={styles.metricValuePrimary}>{player.total_time_played || `${Math.round(player.raw_time_mins || 0)}m`}</div>
            <div className={styles.metricSecondary}>
              <span className={styles.metricAvg}>Maps: {player.maps_played || '-'}</span>
            </div>
          </div>

          <div className={styles.metricCard}>
            <div className={styles.metricLabelGroup}>
              <span className={styles.metricLabel}>击杀</span>
              <span className={styles.metricLabelEn}>ELIM</span>
            </div>
            <div className={styles.metricValuePrimary}>{formatNum(player.avg_elim)}</div>
            <div className={styles.metricSecondary}>
              <span className={styles.metricAvg}>Role Avg: {formatNum(roleStats?.avg.elim)}</span>
              <span className={styles.metricPercentile}>Top {roleStats?.ranks.elim.percentile || 0}%</span>
            </div>
          </div>

          <div className={`${styles.metricCard} ${styles.cardDth}`}>
            <div className={styles.metricLabelGroup}>
              <span className={styles.metricLabel}>阵亡</span>
              <span className={styles.metricLabelEn}>DTH</span>
            </div>
            <div className={styles.metricValuePrimary}>{formatNum(player.avg_dth)}</div>
            <div className={styles.metricSecondary}>
              <span className={styles.metricAvg}>Role Avg: {formatNum(roleStats?.avg.dth)}</span>
              <span className={styles.metricPercentile}>Top {roleStats?.ranks.dth.percentile || 0}%</span>
            </div>
          </div>

          <div className={`${styles.metricCard} ${styles.cardDmg}`}>
            <div className={styles.metricLabelGroup}>
              <span className={styles.metricLabel}>伤害</span>
              <span className={styles.metricLabelEn}>DMG</span>
            </div>
            <div className={styles.metricValuePrimary}>{formatNum(player.avg_dmg)}</div>
            <div className={styles.metricSecondary}>
              <span className={styles.metricAvg}>Role Avg: {formatNum(roleStats?.avg.dmg)}</span>
              <span className={styles.metricPercentile}>Top {roleStats?.ranks.dmg.percentile || 0}%</span>
            </div>
          </div>

          <div className={`${styles.metricCard} ${styles.cardHeal}`}>
            <div className={styles.metricLabelGroup}>
              <span className={styles.metricLabel}>治疗</span>
              <span className={styles.metricLabelEn}>HEAL</span>
            </div>
            <div className={styles.metricValuePrimary}>{formatNum(player.avg_heal)}</div>
            <div className={styles.metricSecondary}>
              <span className={styles.metricAvg}>Role Avg: {formatNum(roleStats?.avg.heal)}</span>
              <span className={styles.metricPercentile}>Top {roleStats?.ranks.heal.percentile || 0}%</span>
            </div>
          </div>

          <div className={`${styles.metricCard} ${styles.cardMit}`}>
            <div className={styles.metricLabelGroup}>
              <span className={styles.metricLabel}>阻挡</span>
              <span className={styles.metricLabelEn}>BLOCK</span>
            </div>
            <div className={styles.metricValuePrimary}>{formatNum(player.avg_block)}</div>
            <div className={styles.metricSecondary}>
              <span className={styles.metricAvg}>Role Avg: {formatNum(roleStats?.avg.mit)}</span>
              <span className={styles.metricPercentile}>Top {roleStats?.ranks.mit.percentile || 0}%</span>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.dataSection}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionKicker}>
            <span className={styles.sectionKickerCn}>常用英雄</span>
            <span className={styles.sectionKickerEn}>MOST PLAYED HEROES</span>
          </div>
        </div>

        {topHeroes.length > 0 ? (
          <div className={styles.heroesGrid}>
            {topHeroes.map((heroName, idx) => {
              const roleFolder = getRoleFolder(player.role)
              const heroFileName = formatHeroName(heroName)

              return (
                <div key={`${heroName}-${idx}`} className={styles.heroCard}>
                  <div className={styles.avatarBox}>
                    <img
                      src={`/heroes/${roleFolder}/${heroFileName}.png`}
                      alt={heroName}
                      className={styles.avatarImg}
                      onError={(e) => {
                        e.target.style.display = 'none'
                        e.target.parentElement.classList.add(styles.avatarFallback)
                      }}
                    />
                  </div>
                  <div className={styles.heroCardName}>{heroName}</div>
                  <div className={styles.heroRank}>TOP {idx + 1}</div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className={styles.emptyState}>暂无英雄使用记录</div>
        )}
      </section>
    </div>
  )
}