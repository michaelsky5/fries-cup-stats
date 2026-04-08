import styles from './TeamShareCard.module.css'

function getCoreName(player) {
  if (!player) return '-'
  return player.display_name || player.player_name || player.player_id || '-'
}

function getTopHeroes(heroPool) {
  return Array.isArray(heroPool) ? heroPool.slice(0, 3).map(item => item.hero).filter(Boolean) : []
}

function getRecentFormText(recentForm) {
  if (!Array.isArray(recentForm) || recentForm.length === 0) return '暂无记录'
  return recentForm.join(' ')
}

export default function TeamShareCard({
  team,
  teamProfile,
  matchSummary,
  strongestRole,
  heroPool,
  corePlayers,
  shareRef
}) {
  if (!team) return null

  const topHeroes = getTopHeroes(heroPool)
  // 🌟 修复：增加对 damage 和 support 键名的兼容，防止获取不到数据
  const tankCore = getCoreName(corePlayers?.tank)
  const dpsCore = getCoreName(corePlayers?.dps || corePlayers?.damage)
  const supCore = getCoreName(corePlayers?.sup || corePlayers?.support)

  return (
    <section ref={shareRef} className={styles.shareCard}>
      <div className={styles.cardGlow}></div>

      <div className={styles.topRow}>
        <div className={styles.brandBlock}>
          <div className={styles.brandCn}>薯条杯 2026</div>
          <div className={styles.brandSub}>战队数据分享图</div>
        </div>

        <div className={styles.teamShortTag}>
          {team.team_short_name || team.team_id || 'TEAM'}
        </div>
      </div>

      <div className={styles.mainGrid}>
        <div className={styles.left}>
          <div className={styles.teamIdBox}>{team.team_id}</div>
          <div className={styles.teamName}>{team.team_name || '未命名战队'}</div>
          <div className={styles.teamSubline}>
            <span className={styles.teamShortName}>{team.team_short_name || team.team_name || 'TEAM'}</span>
            <span className={styles.dot}>/</span>
            <span className={styles.profileEn}>{teamProfile?.en || 'TEAM PROFILE'}</span>
          </div>

          <div className={styles.titleGroup}>
            <div className={styles.titleBadge}>{teamProfile?.tag || '战队画像'}</div>
            <div className={styles.titleSub}>赛季战队标签</div>
          </div>

          <p className={styles.desc}>
            {teamProfile?.hook || teamProfile?.desc || '系统正在生成该战队的赛季数据摘要。'}
          </p>

          <div className={styles.metaGrid}>
            <div className={styles.metaItem}>
              <div className={styles.metaLabel}>当前强项</div>
              <div className={styles.metaValueCn}>{strongestRole?.cn || '-'}</div>
            </div>

            <div className={styles.metaItem}>
              <div className={styles.metaLabel}>近期状态</div>
              <div className={styles.metaValueText}>{getRecentFormText(matchSummary?.recentForm)}</div>
            </div>

            <div className={styles.metaItem}>
              <div className={styles.metaLabel}>英雄倾向</div>
              <div className={styles.metaValueText}>
                {topHeroes.length > 0 ? topHeroes.join(' · ') : '-'}
              </div>
            </div>
          </div>
        </div>

        <div className={styles.right}>
          <div className={styles.statPanel}>
            <div className={styles.statPanelTop}>
              <div className={styles.statLabel}>胜率</div>
              <div className={styles.statValue}>{matchSummary?.winRate ?? 0}%</div>
              <div className={styles.statText}>当前赛季完成对局</div>
              <div className={styles.statSub}>
                {matchSummary?.wins ?? 0}胜 / {matchSummary?.losses ?? 0}负
                {matchSummary?.draws ? ` / ${matchSummary.draws}平` : ''}
              </div>
            </div>

            <div className={styles.statDivider}></div>

            <div className={styles.secondRow}>
              <div className={styles.secondLabel}>核心结构</div>

              <div className={styles.coreList}>
                <div className={styles.coreItem}>
                  <span className={styles.coreRole}>TANK</span>
                  <span className={styles.coreName}>{tankCore}</span>
                </div>
                <div className={styles.coreItem}>
                  <span className={styles.coreRole}>DPS</span>
                  <span className={styles.coreName}>{dpsCore}</span>
                </div>
                <div className={styles.coreItem}>
                  <span className={styles.coreRole}>SUP</span>
                  <span className={styles.coreName}>{supCore}</span>
                </div>
              </div>
            </div>

            <div className={styles.panelFoot}>
              <span>ROSTER {team.player_ids?.length || 0}</span>
              <span>MATCHES {matchSummary?.completed ?? 0}</span>
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