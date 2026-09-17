const ROLE_COPY = {
  TANK: { label: '重装', en: 'TANK' },
  DPS: { label: '输出', en: 'DAMAGE' },
  SUPPORT: { label: '支援', en: 'SUPPORT' },
  FLEX: { label: '自由职责', en: 'FLEX' }
}

function number(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function normalized(value) {
  return String(value || '').trim().toUpperCase()
}

function formatMinutes(minutes) {
  const total = Math.max(0, Math.round(number(minutes)))
  if (total >= 60) return `${Math.floor(total / 60)} 小时 ${total % 60} 分`
  return `${total} 分钟`
}

function roleView(entry, minTimeMins) {
  const summary = entry?.summary || {}
  const key = normalized(entry?.role || summary.role) || 'FLEX'
  const copy = ROLE_COPY[key] || { label: summary.roleLabel || key, en: key }
  const timeMins = number(summary.timeMins)
  const eligible = Boolean(summary.eligible)
  const remainingMinutes = eligible ? 0 : Math.max(0, Math.ceil(number(minTimeMins) - timeMins))

  return {
    key,
    label: summary.roleLabel || copy.label,
    en: summary.roleEn || copy.en,
    maps: number(summary.maps),
    timeMins,
    timeLabel: summary.timeLabel || formatMinutes(timeMins),
    scoreLabel: summary.scoreLabel || '—',
    eligible,
    rankLabel: summary.rankLabel || '—',
    percentileLabel: summary.scorePercentileLabel || '样本不足',
    primaryHero: summary.primaryHero || entry?.heroPool?.[0]?.hero || '尚无记录',
    remainingMinutes,
    sampleLabel: eligible
      ? `已进入${summary.roleLabel || copy.label}职责排行`
      : remainingMinutes > 0
        ? `还需 ${remainingMinutes} 分钟进入职责排行`
        : '等待满足职责排名条件',
    source: entry
  }
}

function uniqueCount(items, keyOf) {
  return new Set(items.map(keyOf).filter(Boolean)).size
}

export function buildPlayerStatsWorkspace(dossier = {}) {
  const minTimeMins = Math.max(0, number(dossier?.minTimeMins) || 30)
  const entries = Array.isArray(dossier?.roleEntries) ? dossier.roleEntries : []
  const roles = entries.map(entry => roleView(entry, minTimeMins))
  const totalMaps = roles.reduce((sum, role) => sum + role.maps, 0)
  const totalMinutes = roles.reduce((sum, role) => sum + role.timeMins, 0)
  const rankedRoles = roles.filter(role => role.eligible).length
  const primaryRole = [...roles].sort((left, right) => right.timeMins - left.timeMins || right.maps - left.maps)[0] || null
  const heroCount = uniqueCount(entries.flatMap(entry => entry?.heroPool || []), hero => normalized(hero?.hero))
  const recentMatchCount = uniqueCount(entries.flatMap(entry => entry?.recentMatches || []), match => match?.matchId || match?.key)
  const isPublished = Boolean(dossier?.isPublished)

  let status = {
    key: 'PENDING',
    tone: 'pending',
    eyebrow: 'DATA PIPELINE',
    headline: '等待公开赛事数据',
    description: '选手身份已经生效；正式名单和比赛数据发布后会自动建立个人赛季档案。'
  }

  if (isPublished && totalMaps === 0) {
    status = {
      key: 'NO_APPEARANCE',
      tone: 'pending',
      eyebrow: 'OFFICIAL PROFILE READY',
      headline: '公开档案已建立 · 等待正式出场',
      description: '至少参加一张正式地图后，才会形成职责表现、英雄池和近期比赛记录。'
    }
  } else if (isPublished && rankedRoles === 0) {
    status = {
      key: 'BUILDING_SAMPLE',
      tone: 'building',
      eyebrow: 'SAMPLE BUILDING',
      headline: `${primaryRole?.label || '职责'}样本累积中`,
      description: `已经记录 ${totalMaps} 张正式地图；达到每个职责 ${minTimeMins} 分钟的门槛后，才进入对应职责排行。`
    }
  } else if (isPublished) {
    status = {
      key: 'RANKED',
      tone: 'ranked',
      eyebrow: 'SEASON DATA ACTIVE',
      headline: `${rankedRoles} 个职责已进入正式排行`,
      description: '不同职责独立计算样本、OVR、排名和同职责分位，不进行跨职责混算。'
    }
  }

  return {
    isPublished,
    minTimeMins,
    roles,
    primaryRole,
    status,
    totals: {
      maps: totalMaps,
      minutes: totalMinutes,
      timeLabel: formatMinutes(totalMinutes),
      roles: roles.length,
      rankedRoles,
      heroes: heroCount,
      recentMatches: recentMatchCount
    },
    facts: [
      { label: '正式地图', value: String(totalMaps), detail: '张' },
      { label: '正式出场', value: formatMinutes(totalMinutes), detail: '总时长' },
      { label: '记录职责', value: String(roles.length), detail: '个' },
      { label: '有效排名', value: String(rankedRoles), detail: '个职责' }
    ]
  }
}
