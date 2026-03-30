import styles from './PlayerShareCard.module.css'

function getRoleClass(role) {
  const r = String(role || '').toUpperCase()
  if (r === 'TANK') return styles.roleTank
  if (r === 'DPS') return styles.roleDps
  if (r === 'SUP' || r === 'SUPPORT') return styles.roleSup
  return styles.roleFlex
}

function getRoleCn(role) {
  const r = String(role || '').toUpperCase()
  if (r === 'TANK') return '坦克'
  if (r === 'DPS') return '输出'
  if (r === 'SUP' || r === 'SUPPORT') return '辅助'
  return '自由'
}

function formatTimePlayed(player) {
  if (player?.total_time_played) return player.total_time_played
  const mins = Math.round(Number(player?.raw_time_mins || 0))
  if (!mins) return '-'
  if (mins < 60) return `${mins}分钟`

  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (!m) return `${h}小时`
  return `${h}小时 ${m}分钟`
}

function getEdgePool(roleStats) {
  if (!roleStats?.ranks) return []

  return [
    { key: 'dmg', label: '伤害输出', short: '伤害', value: roleStats.ranks.dmg?.percentile || 0 },
    { key: 'elim', label: '击杀效率', short: '击杀', value: roleStats.ranks.elim?.percentile || 0 },
    { key: 'heal', label: '治疗效能', short: '治疗', value: roleStats.ranks.heal?.percentile || 0 },
    { key: 'mit', label: '阻挡效能', short: '阻挡', value: roleStats.ranks.mit?.percentile || 0 },
    { key: 'dth', label: '生存能力', short: '生存', value: roleStats.ranks.dth?.percentile || 0 }
  ].sort((a, b) => b.value - a.value)
}

function getRecordedHero(topHeroes) {
  return Array.isArray(topHeroes) && topHeroes.length > 0 ? topHeroes[0] : '-'
}

function getShareStyleLabel(styleProfile) {
  const cn = styleProfile?.cn || ''

  const map = {
    '高压进攻核心': '进攻核心',
    '稳定压制输出': '稳定输出',
    '节奏型输出': '节奏输出',
    '机动火力点': '机动火力',
    '前线承压核心': '前线核心',
    '推进型前排': '推进前排',
    '均衡前线': '均衡前线',
    '稳定后排支援': '后排支点',
    '进攻型支援': '进攻支援',
    '团队支点': '团队支点',
    '均衡型选手': '均衡选手'
  }

  return map[cn] || cn || '数据画像'
}

export default function PlayerShareCard({ player, styleProfile, roleStats, topHeroes = [], shareRef }) {
  if (!player) return null

  const roleClass = getRoleClass(player.role)
  const roleCn = getRoleCn(player.role)
  const displayTime = formatTimePlayed(player)
  const recordedHero = getRecordedHero(topHeroes)
  const shareStyleLabel = getShareStyleLabel(styleProfile)

  const edgePool = getEdgePool(roleStats)
  const bestEdge = edgePool[0] || { label: '-', short: '-', value: 0 }
  const secondEdge = edgePool[1] || { label: '-', short: '-', value: 0 }

  return (
    <section ref={shareRef} className={`${styles.shareCard} ${roleClass}`}>
      <div className={styles.cardGlow}></div>

      <div className={styles.topRow}>
        <div className={styles.brandBlock}>
          <div className={styles.brandCn}>薯条杯 2026</div>
          <div className={styles.brandSub}>选手数据分享图</div>
        </div>

        <div className={styles.roleTag}>{roleCn}</div>
      </div>

      <div className={styles.mainGrid}>
        <div className={styles.left}>
          <div className={styles.playerName}>{player.display_name || player.player_id}</div>

          <div className={styles.playerSubline}>
            <span className={styles.teamName}>{player.team_name || player.team_short_name || '自由选手'}</span>
            <span className={styles.dot}>/</span>
            <span className={styles.playerId}>{player.player_id}</span>
          </div>

          <div className={styles.titleGroup}>
            <div className={styles.titleBadge}>{shareStyleLabel}</div>
            <div className={styles.titleSub}>赛季风格标签</div>
          </div>

          <p className={styles.desc}>
            {styleProfile?.desc || '系统正在生成该选手的赛季数据摘要。'}
          </p>

          <div className={styles.metaGrid}>
            <div className={styles.metaItem}>
              <div className={styles.metaLabel}>上场时间</div>
              <div className={styles.metaValue}>{displayTime}</div>
            </div>

            <div className={styles.metaItem}>
              <div className={styles.metaLabel}>记录英雄</div>
              <div className={styles.metaValueText}>{recordedHero}</div>
            </div>

            <div className={styles.metaItem}>
              <div className={styles.metaLabel}>风格标签</div>
              <div className={styles.metaValueCn}>{shareStyleLabel}</div>
            </div>
          </div>
        </div>

        <div className={styles.right}>
          <div className={styles.statPanel}>
            <div className={styles.statPanelTop}>
              <div className={styles.statLabel}>最强维度</div>
              <div className={styles.statValue}>{bestEdge.value}%</div>
              <div className={styles.statText}>{bestEdge.label}</div>
              <div className={styles.statSub}>超越同职责选手</div>
            </div>

            <div className={styles.statDivider}></div>

            <div className={styles.secondRow}>
              <div className={styles.secondLabel}>第二强项</div>
              <div className={styles.secondMain}>
                <span className={styles.secondValue}>{secondEdge.value}%</span>
                <span className={styles.secondText}>{secondEdge.label}</span>
              </div>
            </div>

            <div className={styles.panelFoot}>
              <span>{bestEdge.short} P{bestEdge.value}</span>
              <span>{secondEdge.short} P{secondEdge.value}</span>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.footer}>
        <span className={styles.footerLeft}>FRIESCUP 2026</span>
        <span className={styles.footerRight}>STATS.FRIES-CUP.COM</span>
      </div>
    </section>
  )
}