import React, { useMemo } from 'react'
import { useParams, Link, useOutletContext } from 'react-router-dom'
import DatabaseSubnav from '../../components/database/DatabaseSubnav.jsx'
import TeamLogo from '../../components/matches/TeamLogo.jsx'
import styles from './MapDetailPage.module.css'
import { getMapDetail, safeArr } from '../../lib/selectors'
import {
  formatOwHeroName,
  formatOwMapMode,
  formatOwMapName,
  getOwHeroCanonicalKey,
  getOwHeroAssetKey,
  getOwHeroCanonicalName,
  getOwHeroRole,
  getOwMapImageName,
  getOwMapModeFolder
} from '../../lib/heroes.js'

function formatMapFileName(name) {
  if (!name) return 'unknown'
  return getOwMapImageName(name)
}

function getRoleFolder(hero) {
  const role = String(getOwHeroRole(hero) || '').toLowerCase()
  if (role === 'tank') return 'tank'
  if (role === 'support') return 'support'
  return 'damage'
}

function getHeroImageUrl(hero) {
  const assetKey = getOwHeroAssetKey(hero)
  return assetKey ? `/heroes/${getRoleFolder(hero)}/${assetKey}.png` : ''
}

function getHeroRoleOrder(hero) {
  const role = String(getOwHeroRole(hero) || '').toLowerCase()
  if (role === 'tank') return 0
  if (role === 'damage') return 1
  if (role === 'support') return 2
  return 3
}

function sortHeroesForLineup(a, b) {
  const roleDelta = getHeroRoleOrder(a.name) - getHeroRoleOrder(b.name)
  if (roleDelta !== 0) return roleDelta
  return String(a.name).localeCompare(String(b.name), 'zh-Hans-CN')
}

function formatPercent(value) {
  return `${Number(value || 0).toFixed(1)}%`
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString()
}

function getSampleBadge(plays, isEn, minReliable = 2) {
  if (Number(plays || 0) >= minReliable) return ''
  return isEn ? 'SMALL SAMPLE' : '小样本'
}

function normalizeKey(value) {
  return String(value || '').trim().toLowerCase()
}

function getTeamIdentityValues(team) {
  return [
    team?.team_id,
    team?.id,
    team?.team_short_name,
    team?.short,
    team?.team_name,
    team?.name,
    team?.team_club
  ].map(normalizeKey).filter(Boolean)
}

function resolveTeam(db, name) {
  const key = normalizeKey(name)
  if (!key) return null

  return safeArr(db?.teams).find(team => getTeamIdentityValues(team).includes(key)) || null
}

function getTeamShortLabel(team, fallback = '') {
  const explicit = String(team?.team_short_name || team?.short || team?.team_id || team?.id || '').trim()
  if (explicit) return explicit

  const label = String(fallback || '').trim()
  if (!label) return ''

  const asciiWords = label.match(/[A-Za-z0-9]+/g)
  if (asciiWords?.length > 1) {
    return asciiWords.map(word => word[0]).join('').slice(0, 6).toUpperCase()
  }

  if ([...label].every(char => char.charCodeAt(0) < 128) && label.length > 8) {
    return label.slice(0, 6).toUpperCase()
  }

  return label.length > 6 ? label.slice(0, 6) : label
}

function getTeamRouteId(team, fallback = '') {
  return team?.team_id ||
    team?.id ||
    team?.routeId ||
    team?.team_short_name ||
    team?.short ||
    fallback ||
    team?.team_name ||
    team?.name ||
    ''
}

function getTeamPath(team, fallback, withSeason) {
  const routeId = getTeamRouteId(team, fallback)
  return routeId ? withSeason(`/teams/${encodeURIComponent(routeId)}`) : ''
}

function getPlayerPath(playerId, withSeason) {
  return playerId ? withSeason(`/players/${encodeURIComponent(playerId)}`) : ''
}

function getMatchPath(matchId, withSeason) {
  return matchId ? withSeason(`/matches/${encodeURIComponent(matchId)}`) : ''
}

function getRecordMatchLabel(record, isEn) {
  const opponent = record?.opponentName ? (isEn ? `vs ${record.opponentName}` : `对 ${record.opponentName}`) : ''
  const round = [record?.stage, record?.round].filter(Boolean).join(' · ')
  return [opponent, round || record?.matchId].filter(Boolean).join(' · ')
}

function getLineupHeroes(stats) {
  const heroesByKey = new Map()

  safeArr(stats).forEach(stat => {
    const key = getOwHeroCanonicalKey(stat?.heroes_played)
    if (!key || heroesByKey.has(key)) return

    heroesByKey.set(key, {
      key,
      name: getOwHeroCanonicalName(stat.heroes_played)
    })
  })

  return Array.from(heroesByKey.values()).sort(sortHeroesForLineup)
}

function getMapCompositionStats(db, mapName) {
  const compositions = new Map()
  let totalSamples = 0

  safeArr(db?.matches).forEach(match => {
    if (match.status !== 'COMPLETE' && match.status !== 'COMPLETED') return

    const mapObj = safeArr(match.maps).find(m => m.map_name === mapName)
    if (!mapObj) return

    const groups = [
      { stats: mapObj.team_a_stats, teamName: mapObj.team_a_name || match.team_a?.short || match.team_a?.name || '' },
      { stats: mapObj.team_b_stats, teamName: mapObj.team_b_name || match.team_b?.short || match.team_b?.name || '' }
    ]

    groups.forEach(group => {
      const heroes = getLineupHeroes(group.stats)
      if (heroes.length < 5) return

      const key = heroes.map(hero => hero.key).join('|')
      if (!compositions.has(key)) {
        compositions.set(key, {
          key,
          heroes,
          count: 0,
          teamCounts: new Map()
        })
      }

      const entry = compositions.get(key)
      entry.count += 1
      if (group.teamName) {
        entry.teamCounts.set(group.teamName, (entry.teamCounts.get(group.teamName) || 0) + 1)
      }
      totalSamples += 1
    })
  })

  const rows = Array.from(compositions.values())
    .map(entry => ({
      ...entry,
      share: totalSamples > 0 ? entry.count / totalSamples : 0,
      topTeams: Array.from(entry.teamCounts.entries())
        .sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]), 'zh-Hans-CN'))
        .slice(0, 2)
        .map(([name]) => {
          const team = resolveTeam(db, name)
          return {
            name,
            short: getTeamShortLabel(team, name)
          }
        })
    }))
    .sort((a, b) => b.count - a.count || b.share - a.share || a.key.localeCompare(b.key))

  return {
    totalSamples,
    top: rows[0] || null,
    rows: rows.slice(0, 4)
  }
}

function SummaryCard({ labelCn, labelEn, value, meta, tone = 'default', to = '' }) {
  return (
    <div className={[styles.summaryCard, styles[`summary_${tone}`]].filter(Boolean).join(' ')}>
      <div className={styles.summaryLabel}>
        <span className={styles.summaryCn}>{labelCn}</span>
        <span className={styles.summaryEn}>{labelEn}</span>
      </div>
      {to ? (
        <Link to={to} className={[styles.summaryValue, styles.summaryValueLink].join(' ')}>
          {value}
        </Link>
      ) : (
        <div className={styles.summaryValue}>{value}</div>
      )}
      {meta ? <div className={styles.summaryMeta}>{meta}</div> : null}
    </div>
  )
}

function SectionHeader({ kicker, title, meta }) {
  return (
    <div className={styles.sectionHeader}>
      <div className={styles.sectionHeaderMain}>
        <div className={styles.sectionKicker}>{kicker}</div>
        <h2 className={styles.sectionTitle}>{title}</h2>
      </div>
      {meta ? <span className={styles.sectionMeta}>{meta}</span> : null}
    </div>
  )
}

function RecordCard({
  labelCn,
  labelEn,
  value,
  player,
  playerId,
  hero,
  heroImageUrl = '',
  matchTo = '',
  matchLabel = '',
  tone = '',
  locale = 'zh-CN',
  withSeason
}) {
  const heroText = hero ? (locale === 'en-US' ? `on ${hero}` : `使用 ${hero}`) : ''
  const playerPath = getPlayerPath(playerId, withSeason)

  return (
    <div className={[styles.recordCard, tone ? styles[tone] : ''].filter(Boolean).join(' ')}>
      <div className={styles.recordTopRow}>
        <div className={styles.recordLabel}>
          <span>{labelCn}</span>
          <em>{labelEn}</em>
        </div>
        {heroImageUrl ? (
          <div className={styles.recordHeroThumb}>
            <img
              src={heroImageUrl}
              alt=""
              onError={e => {
                e.target.style.display = 'none'
              }}
            />
          </div>
        ) : null}
      </div>
      <div className={styles.recordValue}>{value}</div>
      <div className={styles.recordContext}>
        <div className={styles.recordPlayer}>
          {playerPath ? (
            <Link to={playerPath} className={styles.recordPlayerLink}>
              {player || playerId}
            </Link>
          ) : (
            <span>{player || '--'}</span>
          )} {heroText ? <span className={styles.dim}>{heroText}</span> : null}
        </div>
        {matchTo && matchLabel ? (
          <Link to={matchTo} className={styles.recordMatchLink}>{matchLabel}</Link>
        ) : matchLabel ? (
          <span className={styles.recordMatchText}>{matchLabel}</span>
        ) : null}
      </div>
    </div>
  )
}

function RankedBarItem({ rank, title, titleTo = '', sub, badge = '', rateText, width, barTone = 'yellow', imageUrl = '', media = null }) {
  const hasImage = Boolean(imageUrl || media)
  const barToneClass = barTone === 'gray'
    ? styles.bgGray
    : barTone === 'sample'
      ? styles.bgSample
      : styles.bgYellow

  return (
    <div className={[styles.listItem, hasImage ? styles.listItemWithAvatar : ''].filter(Boolean).join(' ')}>
      <div className={styles.rankNum}>{String(rank).padStart(2, '0')}</div>

      {hasImage ? (
        <div className={styles.rankAvatar}>
          {media || (
            <img
              src={imageUrl}
              alt=""
              onError={e => {
                e.target.style.display = 'none'
              }}
            />
          )}
        </div>
      ) : null}

      <div className={styles.itemInfo}>
        {titleTo ? (
          <Link to={titleTo} className={styles.itemTitleLink}>{title}</Link>
        ) : (
          <span className={styles.itemTitle}>{title}</span>
        )}
        <span className={styles.itemSubLine}>
          <span className={styles.itemSub}>{sub}</span>
          {badge ? <span className={styles.itemBadge}>{badge}</span> : null}
        </span>
      </div>

      <div className={styles.barArea}>
        <div className={styles.barWrap}>
          <div
            className={[styles.barFill, barToneClass].join(' ')}
            style={{ width }}
          />
        </div>
        <span className={styles.rateText}>{rateText}</span>
      </div>
    </div>
  )
}

function LineupHeroToken({ hero, locale, compact = false }) {
  const heroName = formatOwHeroName(hero.name, locale)
  const imageUrl = getHeroImageUrl(hero.name)
  const role = String(getOwHeroRole(hero.name) || '').toUpperCase()

  return (
    <div className={[styles.lineupHeroToken, compact ? styles.lineupHeroTokenCompact : ''].filter(Boolean).join(' ')}>
      <div className={styles.lineupHeroImage}>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={heroName}
            onError={e => {
              e.target.style.display = 'none'
            }}
          />
        ) : null}
      </div>
      <span>{heroName}</span>
      {!compact && role ? <em>{role}</em> : null}
    </div>
  )
}

function CompositionPanel({ stats, locale, isEn }) {
  if (!stats?.top) {
    return (
      <section className={styles.compositionSection}>
        <SectionHeader
          kicker="LINEUP META"
          title={isEn ? 'Common Lineups' : '常见阵容'}
          meta={isEn ? 'NO FULL LINEUP SAMPLES' : '暂无完整阵容样本'}
        />
        <div className={styles.compositionEmpty}>
          {isEn ? 'No complete five-hero lineup samples on this map yet.' : '这张图暂时没有可统计的完整五英雄阵容样本。'}
        </div>
      </section>
    )
  }

  const leader = stats.rows[0]
  const restRows = stats.rows.slice(1)
  const visibleRows = stats.rows.length

  return (
    <section className={styles.compositionSection}>
      <SectionHeader
        kicker="LINEUP META"
        title={isEn ? 'Common Lineups' : '常见阵容'}
        meta={`${isEn ? `TOP ${visibleRows}` : `前 ${visibleRows}`} / ${stats.totalSamples} ${isEn ? 'TEAM-SIDE SAMPLES' : '单方阵容样本'}`}
      />

      <div className={styles.compositionBody}>
        <article className={styles.compositionLeader}>
          <div className={styles.compositionLeaderRank}>01</div>
          <div className={styles.compositionLeaderMain}>
            <div className={styles.compositionLeaderHeroes}>
              {leader.heroes.map(hero => (
                <LineupHeroToken key={hero.key} hero={hero} locale={locale} />
              ))}
            </div>

            <div className={styles.compositionMetaGrid}>
              <span>
                <b>{isEn ? 'Uses' : '出现次数'}</b>
                <strong>{leader.count}</strong>
              </span>
              <span>
                <b>{isEn ? 'Share' : '阵容占比'}</b>
                <strong>{formatPercent(leader.share * 100)}</strong>
              </span>
              <span className={styles.compositionSeenCell}>
                <b>{isEn ? 'Seen From' : '常见使用'}</b>
                {leader.topTeams.length > 0 ? (
                  <strong className={styles.compositionSeenTeams}>
                    {leader.topTeams.map(team => (
                      <em key={team.name} title={team.name}>{team.short}</em>
                    ))}
                  </strong>
                ) : (
                  <strong>{isEn ? 'Team-side samples' : '单方样本'}</strong>
                )}
              </span>
              <span>
                <b>{isEn ? 'Samples' : '样本总数'}</b>
                <strong>{stats.totalSamples}</strong>
              </span>
            </div>
          </div>
        </article>

        <div className={styles.compositionRankList}>
          {restRows.map((row, index) => (
            <div key={row.key} className={styles.compositionRankRow}>
              <div className={styles.compositionRankNum}>{String(index + 2).padStart(2, '0')}</div>
              <div className={styles.compositionMiniHeroes}>
                {row.heroes.map(hero => (
                  <LineupHeroToken key={hero.key} hero={hero} locale={locale} compact />
                ))}
              </div>
              <div className={styles.compositionRate}>
                <span>{row.count}</span>
                <em>{formatPercent(row.share * 100)}</em>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function HeroSpotlight({ hero, locale }) {
  if (!hero) return null

  const heroDisplayName = formatOwHeroName(hero.hero, locale)
  const heroImageUrl = getHeroImageUrl(hero.hero)

  return (
    <div className={styles.heroSpotlight}>
      <div className={styles.heroPortrait}>
        {heroImageUrl ? (
          <img
            src={heroImageUrl}
            alt={heroDisplayName}
            onError={e => {
              e.target.style.display = 'none'
            }}
          />
        ) : null}
      </div>
      <div className={styles.heroSpotlightCopy}>
        <span>TOP HERO</span>
        <strong>{heroDisplayName}</strong>
        <em>{hero.count} {locale === 'en-US' ? 'picks' : '次出场'} / {formatPercent(hero.pickRate * 100)}</em>
      </div>
    </div>
  )
}

function TeamSpotlight({ team, resolvedTeam, seasonId, isEn, teamTo = '' }) {
  if (!team) return null

  const winRate = formatPercent(team.winRate * 100)
  const sampleBadge = getSampleBadge(team.plays, isEn)

  return (
    <div className={styles.teamSpotlight}>
      <div className={styles.teamSpotlightLogoFrame}>
        <TeamLogo
          team={resolvedTeam}
          teamName={team.name}
          teamShortName={resolvedTeam?.team_short_name || resolvedTeam?.short || team.name}
          seasonId={seasonId}
          className={styles.teamSpotlightLogo}
          large
        />
      </div>
      <div className={styles.teamSpotlightCopy}>
        <span>TOP TEAM</span>
        {teamTo ? (
          <Link to={teamTo} className={styles.teamSpotlightTitleLink}>{team.name}</Link>
        ) : (
          <strong>{team.name}</strong>
        )}
        <em>
          {isEn ? `${team.wins}W / ${team.plays - team.wins}L` : `${team.wins}胜 / ${team.plays - team.wins}负`} · {winRate}
        </em>
        {sampleBadge ? <b>{sampleBadge}</b> : null}
      </div>
    </div>
  )
}

const MapDetailPage = () => {
  const { mapName } = useParams()
  const { db, locale = 'zh-CN', seasonId, withSeason = path => path } = useOutletContext()
  const isEn = locale === 'en-US'
  const decodedMapName = decodeURIComponent(mapName || '')
  const displayMapName = formatOwMapName(decodedMapName, locale)

  const data = useMemo(() => {
    const baseData = getMapDetail(db, decodedMapName)
    if (!baseData || baseData.totalPlays === 0) return null

    let maxAssists = { value: 0, player: '', playerId: '', hero: '', matchId: '', teamId: '', teamName: '', opponentId: '', opponentName: '', stage: '', round: '' }
    let maxMitigation = { value: 0, player: '', playerId: '', hero: '', matchId: '', teamId: '', teamName: '', opponentId: '', opponentName: '', stage: '', round: '' }
    const recentMatches = []

    const matches = safeArr(db?.matches)
    matches.forEach(match => {
      if (match.status !== 'COMPLETE' && match.status !== 'COMPLETED') return
      const mapObj = safeArr(match.maps).find(m => m.map_name === decodedMapName)
      if (!mapObj) return

      recentMatches.push({
        matchId: match.match_id,
        stage: match.stage,
        round: match.round,
        teamAId: match.team_a?.id || mapObj.team_a_id || '',
        teamBId: match.team_b?.id || mapObj.team_b_id || '',
        teamA: match.team_a?.short || match.team_a?.name,
        teamB: match.team_b?.short || match.team_b?.name,
        scoreA: mapObj.score_a,
        scoreB: mapObj.score_b,
        winnerLabel: mapObj.winner_label,
        winnerId: mapObj.winner
      })

      const statGroups = [
        {
          stats: safeArr(mapObj.team_a_stats),
          teamId: match.team_a?.id || mapObj.team_a_id || '',
          teamName: mapObj.team_a_name || match.team_a?.short || match.team_a?.name || '',
          opponentId: match.team_b?.id || mapObj.team_b_id || '',
          opponentName: mapObj.team_b_name || match.team_b?.short || match.team_b?.name || ''
        },
        {
          stats: safeArr(mapObj.team_b_stats),
          teamId: match.team_b?.id || mapObj.team_b_id || '',
          teamName: mapObj.team_b_name || match.team_b?.short || match.team_b?.name || '',
          opponentId: match.team_a?.id || mapObj.team_a_id || '',
          opponentName: mapObj.team_a_name || match.team_a?.short || match.team_a?.name || ''
        }
      ]

      statGroups.forEach(group => group.stats.forEach(stat => {
        if (!stat.heroes_played) return
        const ast = Number(stat.assists) || 0
        const mit = Number(stat.mitigation) || 0
        const hero = getOwHeroCanonicalName(stat.heroes_played)
        const cleanName = (stat.player_name || (isEn ? 'Unknown Player' : '未知选手')).split('#')[0]
        const playerId = stat.player_id || stat.playerId || ''
        const recordContext = {
          matchId: match.match_id,
          teamId: group.teamId || stat.team_id || stat.teamId || '',
          teamName: group.teamName,
          opponentId: group.opponentId || '',
          opponentName: group.opponentName,
          stage: match.stage || '',
          round: match.round || ''
        }

        if (ast > maxAssists.value) maxAssists = { value: ast, player: cleanName, playerId, hero, ...recordContext }
        if (mit > maxMitigation.value) maxMitigation = { value: mit, player: cleanName, playerId, hero, ...recordContext }
      }))
    })

    recentMatches.reverse()

    return {
      ...baseData,
      records: {
        ...baseData.records,
        maxAssists,
        maxMitigation
      },
      recentMatches
    }
  }, [db, decodedMapName, isEn])

  const mapType = useMemo(() => {
    const allMaps = safeArr(db?.matches).flatMap(match => safeArr(match?.maps))
    const found = allMaps.find(map => map.map_name === decodedMapName)
    return found?.map_type || 'UNKNOWN'
  }, [db, decodedMapName])

  const mapImageUrl = `/maps/${getOwMapModeFolder(mapType)}/${formatMapFileName(decodedMapName)}.jpg`

  if (!data || data.totalPlays === 0) {
    return (
      <div className={styles.shell}>
        <DatabaseSubnav />
        <div className={styles.errorShell}>
          <div className={styles.errorPanel}>
            <div className={styles.errorKicker}>{isEn ? 'Map Report' : '地图报告'}</div>
            <h2 className={styles.errorTitle}>{isEn ? 'No map records yet' : '暂无地图记录'}</h2>
            <p className={styles.errorDesc}>
              {isEn
                ? 'This map has no valid match records yet, or its name does not match the current season data.'
                : '该地图尚未进行任何有效对局，或地图名称与当前赛季记录不匹配。'}
            </p>
            <Link to={withSeason('/maps')} className={styles.backBtn}>
              {isEn ? 'Back to maps' : '返回地图列表'}
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const avgTime = data.avgMatchTime || '--'
  const topHero = data.heroStats?.[0]
  const minReliableTeamPlays = 2
  const reliableTeamWinRates = data.teamWinRates.filter(team => Number(team.plays || 0) >= minReliableTeamPlays)
  const smallSampleTeamWinRates = data.teamWinRates.filter(team => Number(team.plays || 0) < minReliableTeamPlays)
  const sampleAwareTeamWinRates = [...reliableTeamWinRates, ...smallSampleTeamWinRates]
  const topTeam = sampleAwareTeamWinRates?.[0]
  const resolvedTopTeam = resolveTeam(db, topTeam?.name)
  const topTeamPath = getTeamPath(resolvedTopTeam, topTeam?.id || topTeam?.name, withSeason)
  const heroMetaLimit = Math.min(10, data.heroStats.length)
  const visibleHeroStats = data.heroStats.slice(1, heroMetaLimit)
  const teamMetaLimit = Math.min(10, sampleAwareTeamWinRates.length)
  const visibleTeamWinRates = sampleAwareTeamWinRates.slice(1, teamMetaLimit)
  const maxRecentMatches = 9
  const visibleRecentMatches = data.recentMatches.slice(0, maxRecentMatches)
  const compositionStats = getMapCompositionStats(db, decodedMapName)
  const getRecordExtras = record => ({
    heroImageUrl: getHeroImageUrl(record.hero),
    matchTo: getMatchPath(record.matchId, withSeason),
    matchLabel: getRecordMatchLabel(record, isEn)
  })
  const recordItems = [
    {
      labelCn: isEn ? 'Elims' : '最高击杀',
      labelEn: 'ELIMS',
      value: formatNumber(data.records.maxElims.value),
      player: data.records.maxElims.player,
      playerId: data.records.maxElims.playerId,
      hero: formatOwHeroName(data.records.maxElims.hero, locale),
      ...getRecordExtras(data.records.maxElims),
      tone: 'recordAccent'
    },
    {
      labelCn: isEn ? 'Assists' : '最多助攻',
      labelEn: 'ASSISTS',
      value: formatNumber(data.records.maxAssists.value),
      player: data.records.maxAssists.player,
      playerId: data.records.maxAssists.playerId,
      hero: formatOwHeroName(data.records.maxAssists.hero, locale),
      ...getRecordExtras(data.records.maxAssists)
    },
    {
      labelCn: isEn ? 'Damage' : '最高伤害',
      labelEn: 'DAMAGE',
      value: formatNumber(data.records.maxDamage.value),
      player: data.records.maxDamage.player,
      playerId: data.records.maxDamage.playerId,
      hero: formatOwHeroName(data.records.maxDamage.hero, locale),
      ...getRecordExtras(data.records.maxDamage)
    },
    {
      labelCn: isEn ? 'Healing' : '最高治疗',
      labelEn: 'HEALING',
      value: formatNumber(data.records.maxHealing.value),
      player: data.records.maxHealing.player,
      playerId: data.records.maxHealing.playerId,
      hero: formatOwHeroName(data.records.maxHealing.hero, locale),
      ...getRecordExtras(data.records.maxHealing)
    },
    {
      labelCn: isEn ? 'Mitigation' : '最高承伤',
      labelEn: 'MITIGATION',
      value: formatNumber(data.records.maxMitigation.value),
      player: data.records.maxMitigation.player,
      playerId: data.records.maxMitigation.playerId,
      hero: formatOwHeroName(data.records.maxMitigation.hero, locale),
      ...getRecordExtras(data.records.maxMitigation)
    }
  ]

  return (
    <div className={styles.shell}>
      <DatabaseSubnav />
      <Link to={withSeason('/maps')} className={styles.backLink}>
        {isEn ? 'Back to all maps' : '返回全联盟地图数据'} / BACK TO ALL MAPS
      </Link>

      <section className={styles.heroSection}>
        <div className={styles.heroVisual}>
          <img
            src={mapImageUrl}
            alt={displayMapName}
            className={styles.heroImage}
            onError={e => {
              e.target.style.display = 'none'
            }}
          />
          <div className={styles.heroImageOverlay} />
          <div className={styles.heroVisualMeta}>
            <span>{formatOwMapMode(mapType, locale)}</span>
            <strong>{displayMapName}</strong>
            <em>{data.totalPlays} {isEn ? 'plays' : '次登场'}</em>
          </div>
        </div>

        <div className={styles.heroPanel}>
          <div className={styles.heroKicker}>
            <span className={styles.heroKickerCn}>{isEn ? 'Map Intel' : '地图情报页'}</span>
            <span className={styles.heroKickerEn}>MAP INTEL</span>
          </div>

          <h1 className={styles.heroTitle}>{displayMapName}</h1>

          <p className={styles.heroDesc}>
            {isEn
              ? 'A compact readout of this map across valid matches: play volume, top picks, peak performances, team results and recent series.'
              : '汇总该地图在当前赛季有效对局中的登场频率、英雄选择、单图极值、战队结果与近期交战。'}
          </p>

          <div className={styles.heroSummary}>
            <SummaryCard
              labelCn={isEn ? 'Total Plays' : '总计出场'}
              labelEn="TOTAL PLAYS"
              value={data.totalPlays}
              meta={isEn ? 'Valid map records' : '有效地图记录'}
              tone="accent"
            />
            <SummaryCard
              labelCn={isEn ? 'Avg Time' : '平均时长'}
              labelEn="AVG TIME"
              value={avgTime}
              meta={isEn ? 'Average duration' : '平均单图时长'}
            />
            <SummaryCard
              labelCn={isEn ? 'Top Hero' : '最常见英雄'}
              labelEn="TOP HERO"
              value={topHero?.hero ? formatOwHeroName(topHero.hero, locale) : '--'}
              meta={topHero
                ? (isEn ? `${topHero.count} picks` : `${topHero.count} 次出场`)
                : (isEn ? 'Awaiting records' : '等待记录')}
            />
            <SummaryCard
              labelCn={isEn ? 'Top Team' : '胜率领跑'}
              labelEn="TOP TEAM"
              value={topTeam?.name || '--'}
              meta={topTeam
                ? (isEn ? `${formatPercent(topTeam.winRate * 100)} win rate` : `${formatPercent(topTeam.winRate * 100)} 胜率`)
                : (isEn ? 'Awaiting records' : '等待记录')}
              tone="highlight"
              to={topTeamPath}
            />
          </div>
        </div>
      </section>

      <section className={styles.recordsSection}>
        <SectionHeader
          kicker="MAP RECORDS"
          title={isEn ? 'Peak Records' : '极值记录'}
          meta="PEAK PERFORMANCES ON THIS MAP"
        />

        <div className={styles.recordGrid}>
          {recordItems.map(item => (
            <RecordCard key={item.labelEn} {...item} locale={locale} withSeason={withSeason} />
          ))}
        </div>
      </section>

      <CompositionPanel stats={compositionStats} locale={locale} isEn={isEn} />

      <div className={styles.analysisGrid}>
        <section className={styles.panelSection}>
          <SectionHeader
            kicker="HERO META"
            title={isEn ? 'Hero Meta' : '英雄环境'}
            meta={`TOP ${heroMetaLimit} / ${data.heroStats.length}`}
          />

          <div className={styles.metaPanelBody}>
            <HeroSpotlight hero={topHero} locale={locale} />

            <div className={styles.listContainer}>
              {visibleHeroStats.map((hero, index) => {
                const pickRatePercent = hero.pickRate * 100
                return (
                    <RankedBarItem
                      key={hero.hero}
                      rank={index + 2}
                      title={formatOwHeroName(hero.hero, locale)}
                    sub={isEn ? `${hero.count} picks` : `${hero.count} 次出场`}
                    rateText={formatPercent(pickRatePercent)}
                    width={`${pickRatePercent}%`}
                    imageUrl={getHeroImageUrl(hero.hero)}
                  />
                )
              })}
            </div>
          </div>
        </section>

        <section className={styles.panelSection}>
          <SectionHeader
            kicker="TEAM WIN RATES"
            title={isEn ? 'Team Results' : '战队表现'}
            meta={`TOP ${teamMetaLimit} / ${data.teamWinRates.length} · ${reliableTeamWinRates.length} ${isEn ? 'QUALIFIED' : '稳定样本'}`}
          />

          <div className={styles.metaPanelBody}>
            <TeamSpotlight
              team={topTeam}
              resolvedTeam={resolvedTopTeam}
              seasonId={seasonId}
              isEn={isEn}
              teamTo={topTeamPath}
            />

            <div className={styles.listContainer}>
              {visibleTeamWinRates.map((team, index) => {
                const winRatePercent = team.winRate * 100
                const resolvedTeam = resolveTeam(db, team.name)
                const teamPath = getTeamPath(resolvedTeam, team.id || team.name, withSeason)
                return (
                  <RankedBarItem
                    key={team.name}
                    rank={index + 2}
                    title={team.name}
                    titleTo={teamPath}
                    sub={isEn ? `${team.wins}W / ${team.plays - team.wins}L` : `${team.wins}胜 / ${team.plays - team.wins}负`}
                    badge={getSampleBadge(team.plays, isEn)}
                    rateText={formatPercent(winRatePercent)}
                    width={`${winRatePercent}%`}
                    barTone={team.plays < minReliableTeamPlays ? 'sample' : team.winRate >= 0.5 ? 'yellow' : 'gray'}
                    media={(
                      <TeamLogo
                        team={resolvedTeam}
                        teamName={team.name}
                        teamShortName={resolvedTeam?.team_short_name || resolvedTeam?.short || team.name}
                        seasonId={seasonId}
                        className={styles.teamRankLogo}
                      />
                    )}
                  />
                )
              })}
            </div>
          </div>
        </section>
      </div>

      <section className={styles.recentSection}>
        <SectionHeader
          kicker="RECENT MATCHES"
          title={isEn ? 'Recent Matches' : '近期交战'}
          meta={`RECENT ${visibleRecentMatches.length} / ${data.recentMatches.length}`}
        />

        <div className={styles.recentGrid}>
          {visibleRecentMatches.map((m, idx) => {
            const isDraw = m.winnerId === 'DRAW' || Number(m.scoreA) === Number(m.scoreB)
            const matchPath = withSeason(`/matches/${encodeURIComponent(m.matchId)}`)
            const resolvedTeamA = resolveTeam(db, m.teamAId || m.teamA)
            const resolvedTeamB = resolveTeam(db, m.teamBId || m.teamB)
            const teamAPath = getTeamPath(resolvedTeamA, m.teamAId || m.teamA, withSeason)
            const teamBPath = getTeamPath(resolvedTeamB, m.teamBId || m.teamB, withSeason)
            const winnerKeys = [m.winnerId, m.winnerLabel].map(normalizeKey).filter(Boolean)
            const teamAKeys = new Set([m.teamAId, m.teamA, ...getTeamIdentityValues(resolvedTeamA)].map(normalizeKey).filter(Boolean))
            const teamBKeys = new Set([m.teamBId, m.teamB, ...getTeamIdentityValues(resolvedTeamB)].map(normalizeKey).filter(Boolean))
            const teamAWon = !isDraw && winnerKeys.some(key => teamAKeys.has(key))
            const teamBWon = !isDraw && winnerKeys.some(key => teamBKeys.has(key))
            const teamAClassName = [
              styles.teamTag,
              teamAWon ? styles.winnerTeam : styles.loserTeam,
              teamAPath ? styles.teamTagLink : '',
            ].filter(Boolean).join(' ')
            const teamBClassName = [
              styles.teamTag,
              styles.teamTagRight,
              teamBWon ? styles.winnerTeam : styles.loserTeam,
              teamBPath ? styles.teamTagLink : '',
            ].filter(Boolean).join(' ')

            return (
              <article key={`${m.matchId}-${idx}`} className={styles.matchCard}>
                <div className={styles.matchMetaInfo}>
                  <span className={styles.matchStage}>
                    {m.stage} · {m.round}
                  </span>
                  <Link to={matchPath} className={styles.matchIdLink}>{m.matchId}</Link>
                </div>

                <div className={styles.matchScoreboard}>
                  {teamAPath ? (
                    <Link to={teamAPath} className={teamAClassName}>
                      <TeamLogo
                        team={resolvedTeamA}
                        teamName={m.teamA}
                        teamShortName={resolvedTeamA?.team_short_name || resolvedTeamA?.short || m.teamA}
                        seasonId={seasonId}
                        className={styles.matchTeamLogo}
                      />
                      <span className={styles.teamNameText}>{m.teamA}</span>
                    </Link>
                  ) : (
                    <span className={teamAClassName}>
                      <TeamLogo
                        team={resolvedTeamA}
                        teamName={m.teamA}
                        teamShortName={resolvedTeamA?.team_short_name || resolvedTeamA?.short || m.teamA}
                        seasonId={seasonId}
                        className={styles.matchTeamLogo}
                      />
                      <span className={styles.teamNameText}>{m.teamA}</span>
                    </span>
                  )}

                  <Link to={matchPath} className={styles.scoreBox} aria-label={isEn ? `Open match ${m.matchId}` : `查看比赛 ${m.matchId}`}>
                    <span className={styles.scoreNum}>{m.scoreA}</span>
                    <span className={styles.scoreDiv}>-</span>
                    <span className={styles.scoreNum}>{m.scoreB}</span>
                  </Link>

                  {teamBPath ? (
                    <Link to={teamBPath} className={teamBClassName}>
                      <TeamLogo
                        team={resolvedTeamB}
                        teamName={m.teamB}
                        teamShortName={resolvedTeamB?.team_short_name || resolvedTeamB?.short || m.teamB}
                        seasonId={seasonId}
                        className={styles.matchTeamLogo}
                      />
                      <span className={styles.teamNameText}>{m.teamB}</span>
                    </Link>
                  ) : (
                    <span className={teamBClassName}>
                      <TeamLogo
                        team={resolvedTeamB}
                        teamName={m.teamB}
                        teamShortName={resolvedTeamB?.team_short_name || resolvedTeamB?.short || m.teamB}
                        seasonId={seasonId}
                        className={styles.matchTeamLogo}
                      />
                      <span className={styles.teamNameText}>{m.teamB}</span>
                    </span>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      </section>
    </div>
  )
}

export default MapDetailPage
