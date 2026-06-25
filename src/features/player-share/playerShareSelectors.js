import { getHeroAvatarSrc, normalizeLeaderboardRole } from '../../lib/leaderboardSelectors.js'
import { formatOwHeroName } from '../../lib/heroes.js'
import { getPlayerDossier, getPlayerRoleAnalysis } from '../../lib/playerDetailSelectors.js'
import { getShareHeroArtwork } from './heroShareArtworkResolver.js'
import { mapPercentileToOvr } from './playerShareOvr.js'

const ROLE_COLORS = {
  TANK: '#3D8DFF',
  DPS: '#FF4D5A',
  SUPPORT: '#42D392'
}

const ATTRIBUTE_LABELS = {
  DPS: {
    消灭: ['火力', 'FIRE'],
    伤害: ['伤害', 'DMG'],
    助攻: ['助攻', 'AST'],
    生存: ['生存', 'SURV'],
    出场稳定: ['稳定', 'STAB'],
    英雄池: ['英雄池', 'POOL']
  },
  TANK: {
    消灭: ['压制', 'PRESS'],
    伤害: ['火力', 'DMG'],
    助攻: ['支援', 'HELP'],
    生存: ['生存', 'SURV'],
    阻挡: ['阻挡', 'MIT'],
    英雄池: ['英雄池', 'POOL']
  },
  SUPPORT: {
    消灭: ['终结', 'FIN'],
    伤害: ['输出', 'DMG'],
    助攻: ['助攻', 'AST'],
    生存: ['生存', 'SURV'],
    治疗: ['治疗', 'HEAL'],
    英雄池: ['英雄池', 'POOL']
  }
}

function isZh(locale) {
  return !String(locale || 'zh').toLowerCase().startsWith('en')
}

function compact(values) {
  return values.filter(value => value !== undefined && value !== null && value !== '')
}

function percentLabel(percentile, locale) {
  if (!Number.isFinite(Number(percentile))) return isZh(locale) ? '样本不足' : 'Not Rated'
  const top = Math.max(1, 100 - Math.round(Number(percentile)))
  return isZh(locale) ? `前 ${top}%` : `TOP ${top}%`
}

function getAttributeLabel(role, subject, locale) {
  const normalizedRole = normalizeLeaderboardRole(role) || 'DPS'
  const labels = ATTRIBUTE_LABELS[normalizedRole]?.[subject]
  if (!labels) return subject
  return isZh(locale) ? labels[0] : labels[1]
}

function resolveSeasonCode(db, season, seasonId) {
  return compact([
    season?.publicCode,
    season?.seasonId,
    season?.id,
    db?.season?.publicCode,
    db?.season?.seasonId,
    db?.season?.id,
    db?.meta?.seasonId,
    seasonId
  ])[0] || 'FCR2026'
}

function resolveHeroArtwork(hero, role) {
  if (!hero) return ''
  return getShareHeroArtwork(hero, role).src || getHeroAvatarSrc(hero, role)
}

function buildAttributes(radarData, role, eligible, locale) {
  return radarData.map(item => {
    const available = Boolean(eligible && item.available && Number.isFinite(Number(item.percentile)))
    const percentile = available ? Math.round(Number(item.percentile)) : null
    return {
      key: `${role}:${item.subject}`,
      sourceLabel: item.subject,
      label: getAttributeLabel(role, item.subject, locale),
      percentile,
      cardValue: available ? mapPercentileToOvr(percentile) : null,
      available
    }
  })
}

function buildHighlights({ attributes, heroPool, summary, locale }) {
  const reliable = attributes
    .filter(item => item.available)
    .sort((a, b) => b.percentile - a.percentile)

  const createHighlight = item => {
    if (!item) return null
    const top = Math.max(1, 100 - item.percentile)
    if (item.percentile >= 85) {
      return {
        type: 'stat',
        title: isZh(locale) ? `${item.label}前 ${top}%` : `${item.label} TOP ${top}%`,
        detail: isZh(locale) ? `同职责 P${item.percentile}` : `ROLE P${item.percentile}`
      }
    }
    if (item.percentile >= 70) {
      return {
        type: 'stat',
        title: isZh(locale) ? `${item.label}前 30%` : `${item.label} TOP 30%`,
        detail: isZh(locale) ? `同职责 P${item.percentile}` : `ROLE P${item.percentile}`
      }
    }
    if (item.percentile >= 60) {
      return {
        type: 'stat',
        title: isZh(locale) ? `${item.label}表现稳定` : `${item.label} STABLE`,
        detail: isZh(locale) ? `同职责 P${item.percentile}` : `ROLE P${item.percentile}`
      }
    }
    return null
  }

  const primary = createHighlight(reliable[0])
  const secondary = createHighlight(reliable.find(item => item.key !== reliable[0]?.key && item.percentile >= 70))
  if (primary) {
    return {
      primary,
      secondary
    }
  }

  const mainHero = heroPool[0]?.hero || summary.primaryHero || ''
  const mainHeroLabel = formatOwHeroName(mainHero, locale)
  return {
    primary: {
      type: 'fallback',
      title: mainHero
        ? (isZh(locale) ? `主力英雄 ${mainHeroLabel}` : `${mainHeroLabel} MAIN`)
        : (isZh(locale) ? '赛季职责档案' : 'ROLE DOSSIER'),
      detail: isZh(locale)
        ? `${summary.maps} 张地图 · ${summary.timeLabel}`
        : `${summary.maps} MAPS · ${summary.timeLabel}`
    },
    secondary: null
  }
}

export function getPlayerShareCardModel({
  db,
  season,
  seasonId,
  playerId,
  role,
  updatedAtText,
  locale = 'zh'
}) {
  const normalizedRole = normalizeLeaderboardRole(role)
  const dossier = getPlayerDossier(db, playerId, normalizedRole, season)
  if (!dossier) return null

  const roleData = dossier.roleEntries.find(item => item.role === normalizedRole) || dossier.selectedRoleData || dossier.roleEntries[0]
  if (!roleData) return null

  const analysis = getPlayerRoleAnalysis(db, dossier.basePlayer, roleData.entry, season, 'per10', 'dmg')
  const summary = analysis.summary
  const identity = dossier.identity
  const hero = analysis.heroPool[0]?.hero || summary.primaryHero || ''
  const heroLabel = formatOwHeroName(hero, locale)
  const eligible = Boolean(summary.eligible && Number.isFinite(Number(summary.scorePercentile)))
  const attributes = buildAttributes(analysis.radarData, summary.role, eligible, locale)
  const roleColor = ROLE_COLORS[summary.role] || '#f4c320'
  const seasonCode = resolveSeasonCode(db, season, seasonId)
  const teamLine = compact([identity.teamShort, summary.role]).join(' · ')
  const heroArtwork = getShareHeroArtwork(hero, summary.role)
  const battleTag = identity.battleTag && identity.battleTag !== identity.displayName
    ? identity.battleTag
    : identity.battleTag || ''

  return {
    locale,
    season: {
      code: seasonCode,
      label: `${seasonCode} · ${isZh(locale) ? '选手卡' : 'Player Card'}`
    },
    identity: {
      nickname: identity.displayName,
      battleTag,
      initials: identity.initials,
      teamId: identity.teamRouteId,
      teamShortName: identity.teamShort,
      teamName: identity.teamFull,
      teamLine,
      role: summary.role
    },
    visuals: {
      roleColor,
      hero: heroLabel,
      rawHero: hero,
      heroArtwork: heroArtwork.src || resolveHeroArtwork(hero, summary.role),
      heroArtworkMeta: heroArtwork,
      heroPortrait: resolveHeroArtwork(hero, summary.role)
    },
    eligibility: {
      eligible,
      minTimeMins: dossier.minTimeMins,
      roleTimeMins: summary.timeMins
    },
    score: {
      rawRoleScore: summary.score,
      rolePercentile: eligible ? summary.scorePercentile : null,
      roleRank: eligible ? summary.rank : null,
      eligibleCount: summary.qualifiedSize,
      rankLabel: eligible ? summary.rankLabel : '—',
      percentileLabel: eligible ? percentLabel(summary.scorePercentile, locale) : (isZh(locale) ? '未定级' : 'Not Rated'),
      ovr: eligible ? mapPercentileToOvr(summary.scorePercentile) : null
    },
    attributes,
    radar: {
      labels: attributes.map(item => item.label),
      playerValues: attributes.map(item => (item.available ? item.percentile : null)),
      roleMedianValues: attributes.map(item => (item.available ? 50 : null))
    },
    highlights: buildHighlights({ attributes, heroPool: analysis.heroPool, summary, locale }),
    footer: {
      mapsPlayed: summary.maps,
      timePlayed: summary.timeLabel,
      mainHero: hero ? heroLabel : '—',
      team: identity.teamShort,
      updatedAt: updatedAtText || '—',
      disclaimer: isZh(locale)
        ? '赛季能力值与数据表现基于赛事统计，不代表官方 MVP 评选。'
        : 'OVR and performance data are based on match statistics and do not represent official MVP voting.'
    }
  }
}
