import styles from './LeaderboardTable.module.css'

function formatNum(value, digits = 2) {
  const num = Number(value || 0)
  return Number.isFinite(num) ? num.toFixed(digits) : '0.00'
}

function formatInt(value) {
  const num = Number(value || 0)
  return Number.isFinite(num) ? num.toLocaleString() : '0'
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

function formatRoleText(role) {
  if (!role) return '-'
  const r = role.toUpperCase()
  if (r === 'TANK') return '坦克'
  if (r === 'SUP' || r === 'SUPPORT') return '辅助'
  if (r === 'DAMAGE' || r === 'DPS') return '输出'
  return role
}

function SortHead({ label, subLabel, sortKey, activeKey, direction, onSort, align = 'right', className = '' }) {
  const isActive = activeKey === sortKey
  const headClass = [
    styles.sortHead,
    align === 'left' ? styles.alignLeft : '',
    align === 'center' ? styles.alignCenter : '',
    className
  ].filter(Boolean).join(' ')

  return (
    <button type="button" className={headClass} onClick={() => onSort(sortKey)}>
      <span className={styles.headText}>
        <span className={`${styles.headLabel} ${isActive ? styles.activeLabel : ''}`}>{label}</span>
        <span className={styles.headSubLabel}>{subLabel}</span>
      </span>
      <span className={`${styles.sortArrow} ${isActive ? styles.arrowActive : ''}`}>
        {isActive ? (direction === 'asc' ? '▲' : '▼') : '▼'}
      </span>
    </button>
  )
}

function MobileStat({ label, value, tone = '' }) {
  return (
    <div className={`${styles.mobileStat} ${tone ? styles[tone] : ''}`}>
      <span className={styles.mobileStatLabel}>{label}</span>
      <span className={styles.mobileStatValue}>{value}</span>
    </div>
  )
}

export default function LeaderboardTable({ rows = [], sortKey, direction, onSort }) {
  return (
    <div className={styles.wrap}>
      <div className={styles.desktopTable}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.rankCol}>
                <SortHead label="排名" subLabel="RANK" sortKey="rank" activeKey={sortKey} direction={direction} onSort={onSort} align="center" />
              </th>
              <th className={styles.playerCol}>
                <SortHead label="选手" subLabel="PLAYER" sortKey="display_name" activeKey={sortKey} direction={direction} onSort={onSort} align="left" />
              </th>
              <th className={styles.teamCol}>
                <SortHead label="战队" subLabel="TEAM" sortKey="team_name" activeKey={sortKey} direction={direction} onSort={onSort} align="left" />
              </th>
              <th className={styles.roleCol}>
                <SortHead label="位置" subLabel="ROLE" sortKey="role" activeKey={sortKey} direction={direction} onSort={onSort} align="center" />
              </th>
              <th>
                <SortHead label="时长" subLabel="TIME" sortKey="raw_time_mins" activeKey={sortKey} direction={direction} onSort={onSort} />
              </th>
              <th>
                <SortHead label="地图" subLabel="MAPS" sortKey="maps_played" activeKey={sortKey} direction={direction} onSort={onSort} />
              </th>
              <th className={styles.combatHead}>
                <SortHead label="击杀 /10" subLabel="ELIM /10" sortKey="avg_elim" activeKey={sortKey} direction={direction} onSort={onSort} />
              </th>
              <th className={styles.combatHead}>
                <SortHead label="助攻 /10" subLabel="AST /10" sortKey="avg_ast" activeKey={sortKey} direction={direction} onSort={onSort} />
              </th>
              <th className={styles.combatHead}>
                <SortHead label="死亡 /10" subLabel="DTH /10" sortKey="avg_dth" activeKey={sortKey} direction={direction} onSort={onSort} />
              </th>
              <th className={styles.dmgHead}>
                <SortHead label="伤害 /10" subLabel="DMG /10" sortKey="avg_dmg" activeKey={sortKey} direction={direction} onSort={onSort} />
              </th>
              <th className={styles.healHead}>
                <SortHead label="治疗 /10" subLabel="HEAL /10" sortKey="avg_heal" activeKey={sortKey} direction={direction} onSort={onSort} />
              </th>
              <th className={styles.mitHead}>
                <SortHead label="阻挡 /10" subLabel="BLOCK /10" sortKey="avg_block" activeKey={sortKey} direction={direction} onSort={onSort} />
              </th>
              <th className={styles.heroCol}>
                <SortHead label="常用英雄" subLabel="MOST PLAYED" sortKey="most_played_hero" activeKey={sortKey} direction={direction} onSort={onSort} align="left" />
              </th>
            </tr>
          </thead>

          <tbody>
            {rows.length > 0 ? rows.map((row, index) => {
              const topHeroes = Array.isArray(row.top_3_heroes) ? row.top_3_heroes.filter(Boolean).join(' / ') : ''
              const isTop3 = index < 3 && sortKey === 'rank' && direction === 'asc'

              const rowClass = [
                styles.row,
                isTop3 ? styles.rowTop : '',
                index === 0 && isTop3 ? styles.rowTop1 : '',
                index === 1 && isTop3 ? styles.rowTop2 : '',
                index === 2 && isTop3 ? styles.rowTop3 : ''
              ].filter(Boolean).join(' ')

              const rankBadgeClass = [
                styles.rankBadge,
                isTop3 ? styles.rankTop : '',
                index === 0 && isTop3 ? styles.rankTop1 : '',
                index === 1 && isTop3 ? styles.rankTop2 : '',
                index === 2 && isTop3 ? styles.rankTop3 : ''
              ].filter(Boolean).join(' ')

              const roleFolder = getRoleFolder(row.role)
              const heroFileName = formatHeroName(row.most_played_hero)
              const heroAvatarUrl = `/heroes/${roleFolder}/${heroFileName}.png`

              return (
                <tr key={row.player_id} className={rowClass}>
                  <td className={styles.rank}>
                    <span className={rankBadgeClass}>{row.rank}</span>
                  </td>

                  <td className={styles.player}>
                    <div className={styles.identityBlock}>
                      <div className={styles.mainText}>{row.display_name || row.player_name || '-'}</div>
                      <div className={styles.subText}>{row.player_name || '-'}</div>
                    </div>
                  </td>

                  <td className={styles.team}>
                    <div className={styles.identityBlock}>
                      <div className={styles.mainText}>{row.team_short_name || row.team_name || '-'}</div>
                      <div className={styles.subText}>{row.team_name || '-'}</div>
                    </div>
                  </td>

                  <td className={styles.role}>
                    <span className={`${styles.roleTag} ${styles[roleFolder] || ''}`}>
                      {formatRoleText(row.role)}
                    </span>
                  </td>

                  <td className={styles.dataCellStandard}>
                    {row.total_time_played || `${Math.round(row.raw_time_mins || 0)}m`}
                  </td>
                  <td className={styles.dataCellStandard}>{formatInt(row.maps_played)}</td>

                  <td className={`${styles.dataCellStandard} ${styles.cellCombat}`}>{formatNum(row.avg_elim)}</td>
                  <td className={`${styles.dataCellStandard} ${styles.cellCombat}`}>{formatNum(row.avg_ast)}</td>
                  <td className={`${styles.dataCellStandard} ${styles.cellCombat} ${styles.cellCombatDeath}`}>{formatNum(row.avg_dth)}</td>

                  <td className={`${styles.dataCell} ${styles.cellDmg}`}>{formatNum(row.avg_dmg)}</td>
                  <td className={`${styles.dataCell} ${styles.cellHeal}`}>{formatNum(row.avg_heal)}</td>
                  <td className={`${styles.dataCell} ${styles.cellMit}`}>{formatNum(row.avg_block)}</td>

                  <td className={styles.hero}>
                    <div className={styles.heroWrap}>
                      <div className={styles.avatarBox}>
                        {row.most_played_hero && row.most_played_hero !== '-' ? (
                          <img
                            src={heroAvatarUrl}
                            alt={row.most_played_hero}
                            className={styles.avatarImg}
                            onError={(e) => {
                              e.target.style.display = 'none'
                              e.target.parentElement.classList.add(styles.avatarFallbackState)
                            }}
                          />
                        ) : (
                          <div className={styles.avatarFallback}></div>
                        )}
                      </div>

                      <div className={styles.heroTextGroup}>
                        <div className={styles.mainText}>{row.most_played_hero || '-'}</div>
                        <div className={styles.subText}>{topHeroes || '-'}</div>
                      </div>
                    </div>
                  </td>
                </tr>
              )
            }) : (
              <tr>
                <td colSpan="13" className={styles.empty}>
                  暂无符合条件的选手数据
                  <span className={styles.emptySub}>NO DATA MATCHES CURRENT FILTERS</span>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className={styles.mobileList}>
        {rows.length > 0 ? rows.map((row, index) => {
          const topHeroes = Array.isArray(row.top_3_heroes) ? row.top_3_heroes.filter(Boolean).join(' / ') : ''
          const isTop3 = index < 3 && sortKey === 'rank' && direction === 'asc'

          const rankBadgeClass = [
            styles.rankBadge,
            isTop3 ? styles.rankTop : '',
            index === 0 && isTop3 ? styles.rankTop1 : '',
            index === 1 && isTop3 ? styles.rankTop2 : '',
            index === 2 && isTop3 ? styles.rankTop3 : ''
          ].filter(Boolean).join(' ')

          const roleFolder = getRoleFolder(row.role)
          const heroFileName = formatHeroName(row.most_played_hero)
          const heroAvatarUrl = `/heroes/${roleFolder}/${heroFileName}.png`

          return (
            <article key={row.player_id} className={styles.mobileCard}>
              <div className={styles.mobileCardTop}>
                <div className={styles.mobileRankBlock}>
                  <span className={rankBadgeClass}>{row.rank}</span>
                </div>

                <div className={styles.mobileIdentity}>
                  <div className={styles.mobilePlayerRow}>
                    <span className={styles.mobilePlayerName}>{row.display_name || row.player_name || '-'}</span>
                    <span className={`${styles.roleTag} ${styles[roleFolder] || ''}`}>
                      {formatRoleText(row.role)}
                    </span>
                  </div>

                  <div className={styles.mobileSubline}>
                    <span>{row.player_name || '-'}</span>
                    <span className={styles.mobileDivider}>/</span>
                    <span>{row.team_short_name || row.team_name || '-'}</span>
                  </div>
                </div>
              </div>

              <div className={styles.mobileHeroRow}>
                <div className={styles.avatarBox}>
                  {row.most_played_hero && row.most_played_hero !== '-' ? (
                    <img
                      src={heroAvatarUrl}
                      alt={row.most_played_hero}
                      className={styles.avatarImg}
                      onError={(e) => {
                        e.target.style.display = 'none'
                        e.target.parentElement.classList.add(styles.avatarFallbackState)
                      }}
                    />
                  ) : (
                    <div className={styles.avatarFallback}></div>
                  )}
                </div>

                <div className={styles.mobileHeroText}>
                  <div className={styles.mobileHeroMain}>{row.most_played_hero || '-'}</div>
                  <div className={styles.mobileHeroSub}>{topHeroes || '-'}</div>
                </div>
              </div>

              <div className={styles.mobileStatsGrid}>
                <MobileStat label="时长" value={row.total_time_played || `${Math.round(row.raw_time_mins || 0)}m`} />
                <MobileStat label="地图" value={formatInt(row.maps_played)} />
                <MobileStat label="击杀 /10" value={formatNum(row.avg_elim)} />
                <MobileStat label="助攻 /10" value={formatNum(row.avg_ast)} />
                <MobileStat label="死亡 /10" value={formatNum(row.avg_dth)} />
                <MobileStat label="伤害 /10" value={formatNum(row.avg_dmg)} tone="mobileDmg" />
                <MobileStat label="治疗 /10" value={formatNum(row.avg_heal)} tone="mobileHeal" />
                <MobileStat label="阻挡 /10" value={formatNum(row.avg_block)} tone="mobileMit" />
              </div>
            </article>
          )
        }) : (
          <div className={styles.mobileEmpty}>
            暂无符合条件的选手数据
            <span className={styles.emptySub}>NO DATA MATCHES CURRENT FILTERS</span>
          </div>
        )}
      </div>
    </div>
  )
}