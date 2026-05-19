export const TONE_COLORS = {
  gold: '#f4c320',
  silver: '#d9d9d9',
  bronze: '#c7834c',
  red: '#ff5a5d',
  blue: '#72b2ff',
  green: '#57dc8b',
  purple: '#b58cff'
}

const FONT_SC = '"FCA Sans", "HarmonyOS Sans SC", "Noto Sans SC", "PingFang SC", "Microsoft YaHei", "Source Han Sans SC", sans-serif'
const FONT_MONO = '"FCA Mono", "JetBrains Mono", "HarmonyOS Sans SC", "Noto Sans SC", "Consolas", monospace'
const CARD_BG = '#050505'
const PANEL_BG = 'rgba(14,14,14,0.94)'
const FCA_LOGO = '/logos/fca_logo.png'
const DEFAULT_TEAM_LOGO = '/logos/OW.png'
const POSTER_FONT_TIMEOUT_MS = 1800
const POSTER_FONT_LOADS = [
  '900 32px "FCA Sans"',
  '800 32px "FCA Sans"',
  '900 32px "HarmonyOS Sans SC"',
  '800 32px "HarmonyOS Sans SC"',
  '900 32px "Noto Sans SC"',
  '800 32px "Noto Sans SC"',
  '900 32px "PingFang SC"',
  '800 32px "PingFang SC"',
  '900 32px "Microsoft YaHei"',
  '800 32px "Microsoft YaHei"',
  '900 24px "FCA Mono"',
  '900 24px "JetBrains Mono"',
  '900 24px "Consolas"'
]

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function nextFrame() {
  if (typeof requestAnimationFrame !== 'function') return Promise.resolve()
  return new Promise(resolve => requestAnimationFrame(() => resolve()))
}

export async function ensurePosterFontsReady(timeoutMs = POSTER_FONT_TIMEOUT_MS) {
  if (typeof document === 'undefined' || !document?.fonts?.load) return

  const fontSet = document.fonts
  const loaders = POSTER_FONT_LOADS.map(font => fontSet.load(font).catch(() => []))
  const ready = Promise.all([...loaders, fontSet.ready].filter(Boolean)).catch(() => null)

  await Promise.race([ready, wait(timeoutMs)])
  await nextFrame()
}

function hexToRgba(hex, alpha = 1) {
  const clean = String(hex || '#f4c320').replace('#', '')
  const bigint = parseInt(clean.length === 3 ? clean.split('').map(char => char + char).join('') : clean, 16)
  const r = (bigint >> 16) & 255
  const g = (bigint >> 8) & 255
  const b = bigint & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function safeText(value, fallback = '') {
  const text = String(value ?? '').trim()
  return text || fallback
}

function safeArr(value) {
  return Array.isArray(value) ? value : []
}

function compactRankText(value) {
  return String(value ?? '')
    .replace(/\s+/g, '')
    .replace(/[–—－~～至到]/g, '-')
}

function loadImage(src) {
  return new Promise(resolve => {
    if (!src) {
      resolve(null)
      return
    }

    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

function drawRoundedRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + radius, y, radius)
  ctx.closePath()
}

function drawCutCornerRect(ctx, x, y, w, h, cut = 18) {
  const c = Math.min(cut, w / 3, h / 3)
  ctx.beginPath()
  ctx.moveTo(x + c, y)
  ctx.lineTo(x + w, y)
  ctx.lineTo(x + w, y + h - c)
  ctx.lineTo(x + w - c, y + h)
  ctx.lineTo(x, y + h)
  ctx.lineTo(x, y + c)
  ctx.closePath()
}

function drawText(ctx, text, x, y, options = {}) {
  const {
    font = `900 28px ${FONT_SC}`,
    fill = '#ffffff',
    align = 'left',
    baseline = 'alphabetic',
    alpha = 1,
    maxWidth = undefined
  } = options

  ctx.save()
  ctx.globalAlpha = alpha
  ctx.font = font
  ctx.fillStyle = fill
  ctx.textAlign = align
  ctx.textBaseline = baseline
  if (maxWidth) ctx.fillText(String(text ?? ''), x, y, maxWidth)
  else ctx.fillText(String(text ?? ''), x, y)
  ctx.restore()
}

function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 99, options = {}) {
  const raw = String(text ?? '').replace(/\r\n/g, '\n')
  const hardLines = raw.split('\n')
  const lines = []

  hardLines.forEach(part => {
    const chars = [...part]
    let line = ''

    chars.forEach(char => {
      const testLine = line + char
      const width = ctx.measureText(testLine).width
      if (width > maxWidth && line) {
        lines.push(line)
        line = char
      } else {
        line = testLine
      }
    })

    if (line) lines.push(line)
  })

  const finalLines = lines.slice(0, maxLines)
  const { fill } = options
  if (fill) ctx.fillStyle = fill

  finalLines.forEach((item, index) => {
    const output = index === maxLines - 1 && lines.length > maxLines ? `${item.replace(/[。.!！?？,，、]?$/, '')}…` : item
    ctx.fillText(output, x, y + index * lineHeight)
  })

  return {
    y: y + finalLines.length * lineHeight,
    lines: finalLines.length,
    clipped: lines.length > maxLines
  }
}

function getSceneText(scene) {
  return [
    scene?.title,
    scene?.eyebrow,
    scene?.badge,
    scene?.watermark,
    scene?.subTitle,
    scene?.metricLabel,
    ...(Array.isArray(scene?.chips) ? scene.chips : [])
  ].filter(Boolean).join(' ')
}

function normalizeCardKindValue(value) {
  const raw = String(value || '').trim().toLowerCase()
  if (!raw) return ''

  if (raw === 'managercoach' || raw === 'manager-coach' || raw === 'manager_coach' || raw.includes('经理/教练') || raw.includes('经理 / 教练')) return 'managerCoach'
  if (raw === 'manager' || raw.includes('经理')) return 'manager'
  if (raw === 'coach' || raw.includes('教练')) return 'coach'
  if (raw === 'staff' || raw === 'admin' || raw === 'referee' || raw === 'observer' || raw.includes('赛管') || raw.includes('裁判') || raw.includes('导播')) return 'staff'
  if (raw === 'caster' || raw === 'commentator' || raw.includes('解说')) return 'caster'
  if (raw === 'tournament' || raw.includes('观众') || raw.includes('赛事总回顾')) return 'tournament'
  if (raw === 'team' || raw.includes('队伍')) return 'team'
  if (raw === 'player' || raw.includes('选手')) return 'player'

  return ''
}

function inferCardKind(firstScene, scenes = []) {
  const firstText = getSceneText(firstScene).toUpperCase()
  const allText = scenes.map(scene => getSceneText(scene)).join(' ').toUpperCase()
  const explicitStoryType = String(firstScene?.storyType || firstScene?.story_type || '').toLowerCase()

  const explicitKind = normalizeCardKindValue(
    firstScene?.posterCardKind ||
    firstScene?.poster_card_kind ||
    firstScene?.cardKind ||
    firstScene?.card_kind
  )
  if (explicitKind) return explicitKind

  const explicitStaffType = normalizeCardKindValue(firstScene?.staffType || firstScene?.staff_type)
  if (explicitStaffType === 'caster' || explicitStaffType === 'staff') return explicitStaffType

  if (explicitStoryType === 'staff') return explicitStaffType === 'caster' ? 'caster' : 'staff'

  const explicitIdentityClass = normalizeCardKindValue(firstScene?.identityClass || firstScene?.identity_class || firstScene?.classValue || firstScene?.class_value)
  if (explicitIdentityClass) return explicitIdentityClass

  if (explicitStoryType === 'tournament' || firstText.includes('TOURNAMENT') || allText.includes('TOURNAMENT') || allText.includes('赛事总回顾') || allText.includes('观众')) return 'tournament'
  if (allText.includes('MANAGER / COACH') || allText.includes('经理 / 教练') || allText.includes('经理/教练')) return 'managerCoach'
  if (firstText.includes('COACH') || firstText.includes('教练') || allText.includes(' COACH') || allText.includes('教练')) return 'coach'
  if (firstText.includes('MANAGER') || firstText.includes('经理') || allText.includes(' MANAGER') || allText.includes('经理')) return 'manager'

  if (firstText.includes('STAFF') || firstText.includes('ADMIN') || firstText.includes('赛管') || firstText.includes('裁判') || firstText.includes('导播')) return 'staff'
  if (firstText.includes('CASTER') || firstText.includes('解说')) return 'caster'

  if (allText.includes('STAFF') || allText.includes('ADMIN') || allText.includes('赛管') || allText.includes('裁判') || allText.includes('导播')) return 'staff'
  if (allText.includes('CASTER') || allText.includes('解说')) return 'caster'
  if (firstText.includes('TEAM')) return 'team'
  return 'player'
}

function inferCardType(firstScene, scenes = []) {
  const kind = inferCardKind(firstScene, scenes)
  if (kind === 'managerCoach') return 'MANAGER / COACH OFFICIAL TICKET'
  if (kind === 'manager') return 'MANAGER OFFICIAL TICKET'
  if (kind === 'coach') return 'COACH OFFICIAL TICKET'
  if (kind === 'caster') return 'CASTER OFFICIAL TICKET'
  if (kind === 'staff') return 'ADMIN OFFICIAL TICKET'
  if (kind === 'team') return 'TEAM OFFICIAL TICKET'
  if (kind === 'tournament') return 'VIEWER OFFICIAL TICKET'
  return 'PLAYER OFFICIAL TICKET'
}

function getRankTierFromText(value) {
  const text = compactRankText(value)
  if (!text) return ''
  if (text.includes('冠军') && !text.includes('亚军')) return 'champion'
  if (text.includes('亚军')) return 'runner_up'
  if (text.includes('季军')) return 'third'
  if (text.includes('殿军') || text.includes('第4名') || text.includes('第4')) return 'fourth'
  if (/^(第)?5-8名?$/.test(text) || text.includes('5-8名') || text.includes('第5-8名')) return 'top8'
  if (/^(第)?9-16名?$/.test(text) || text.includes('9-16名') || text.includes('第9-16名')) return 'top16'

  const singleRank = text.match(/第?(\d+)名?/)
  if (singleRank) {
    const rank = Number(singleRank[1])
    if (rank === 1) return 'champion'
    if (rank === 2) return 'runner_up'
    if (rank === 3) return 'third'
    if (rank === 4) return 'fourth'
    if (rank >= 5 && rank <= 8) return 'top8'
    if (rank >= 9 && rank <= 16) return 'top16'
  }

  return ''
}

function getAchievementLabel(tier, cardKind, explicitText = '') {
  if (tier === 'champion') return '2026 CHAMPION'
  if (tier === 'runner_up') return 'FINALIST'
  if (tier === 'third') return 'PODIUM FINISH'
  if (tier === 'fourth') return 'TOP 4'
  if (tier === 'top8') return 'PLAYOFFS ARCHIVE'
  if (tier === 'top16') return 'QUALIFIER ARCHIVE'
  if (cardKind === 'caster') return 'VOICE ARCHIVE'
  if (cardKind === 'staff') return 'STAFF ARCHIVE'
  if (cardKind === 'manager') return 'MANAGER ARCHIVE'
  if (cardKind === 'coach') return 'COACH ARCHIVE'
  if (cardKind === 'managerCoach') return 'DUAL ROLE ARCHIVE'
  if (String(explicitText || '').includes('季后赛') || String(explicitText || '').includes('前八')) return 'PLAYOFFS ARCHIVE'
  return 'SEASON ARCHIVE'
}

function inferAchievement(scenes, cardKind) {
  const list = Array.isArray(scenes) ? scenes : []
  const first = list[0] || {}
  const ending = list[list.length - 1] || first
  const playoffScene = list.find(scene => String(scene?.eyebrow || '').toUpperCase().includes('PLAYOFFS'))
  const reliableText = [
    ending?.title,
    ending?.watermark,
    ...(Array.isArray(ending?.chips) ? ending.chips : []),
    ...(Array.isArray(first?.chips) ? first.chips : []),
    playoffScene?.title,
    ...(Array.isArray(playoffScene?.chips) ? playoffScene.chips : [])
  ].filter(Boolean).join(' ')

  const tier = getRankTierFromText(reliableText)
  return getAchievementLabel(tier, cardKind, reliableText)
}

function pickMetricScene(list, cardKind) {
  const metrics = list.filter(scene => scene?.kind === 'metric' && scene?.metric && String(scene.metric) !== '—')
  if (!metrics.length) return null

  if (cardKind === 'player') {
    return metrics.find(scene => String(scene.eyebrow || '').toUpperCase().includes('ONE MAP')) ||
      metrics.find(scene => String(scene.metricLabel || '').toUpperCase().includes('PEAK')) ||
      metrics.find(scene => String(scene.metricLabel || '').toUpperCase().includes('MAP')) ||
      metrics[0]
  }

  if (cardKind === 'team' || cardKind === 'manager' || cardKind === 'coach' || cardKind === 'managerCoach') {
    return metrics.find(scene => String(scene.metricLabel || '').toUpperCase().includes('MATCH')) ||
      metrics.find(scene => String(scene.metricLabel || '').includes('比赛')) ||
      metrics.find(scene => String(scene.metricLabel || '').toUpperCase().includes('MAP')) ||
      metrics[0]
  }

  return metrics.find(scene => String(scene.metricLabel || '').toUpperCase().includes('MATCH')) ||
    metrics.find(scene => String(scene.metricLabel || '').includes('比赛')) ||
    metrics[0]
}

function pickMainText(list) {
  const ending = list[list.length - 1] || {}
  const roleScene = list.find(scene => String(scene.eyebrow || '').toUpperCase().includes('ROLE'))
  const playoffScene = list.find(scene => String(scene.eyebrow || '').toUpperCase().includes('PLAYOFFS'))
  const dataScene = list.find(scene => String(scene.eyebrow || '').toUpperCase().includes('DATA'))
  return ending.body || roleScene?.body || playoffScene?.body || dataScene?.body || list[0]?.body || ''
}

function cleanPosterSubject(value) {
  return String(value || '')
    .replace(/，这是你的学院赛.*$/g, '')
    .replace(/, 这是你的学院赛.*$/g, '')
    .replace(/\s*的赛季旅程.*$/g, '')
    .replace(/\s*的赛季回顾.*$/g, '')
    .replace(/\s*的学院赛纪念卡.*$/g, '')
    .replace(/\s*的学院赛纪念票.*$/g, '')
    .replace(/\s*的赛事纪念卡.*$/g, '')
    .replace(/\s*的赛季纪念卡.*$/g, '')
    .trim()
}

function buildArchiveId(payload) {
  const seed = [payload.cardType, payload.title, payload.subtitle, payload.achievement].join('|')
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i)
    hash |= 0
  }
  return `FCA26-${Math.abs(hash).toString(36).toUpperCase().slice(0, 6).padStart(6, '0')}`
}

function pickPosterImage(list, cardKind) {
  const first = list[0] || {}
  const ending = list[list.length - 1] || first
  const spotlight = list.find(scene => scene.kind === 'spotlight') || null
  if (cardKind === 'player') return spotlight?.image || first.image || ending.image || ''
  if (cardKind === 'caster' || cardKind === 'staff') return first.image || ending.image || ''
  return ending.image || first.image || spotlight?.image || ''
}

function parsePosterNumber(value) {
  const num = Number(String(value ?? '').replace(/[^\d.]/g, ''))
  return Number.isFinite(num) ? num : 0
}

function pickPosterValue(...values) {
  return values.find(value => value !== undefined && value !== null && String(value).trim() !== '') || ''
}

function normalizePosterDate(value) {
  const raw = String(value ?? '').trim()
  if (!raw) return ''

  const titleMatch = raw.match(/记录从\s*(.+?)\s*开始/)
  const source = titleMatch ? titleMatch[1] : raw

  const full = source.match(/(20\d{2})[\-\/.年](\d{1,2})[\-\/.月](\d{1,2})/)
  if (full) {
    return `${full[1]}.${String(full[2]).padStart(2, '0')}.${String(full[3]).padStart(2, '0')}`
  }

  const monthDay = source.match(/(\d{1,2})\s*月\s*(\d{1,2})\s*日/)
  if (monthDay) {
    return `2026.${String(monthDay[1]).padStart(2, '0')}.${String(monthDay[2]).padStart(2, '0')}`
  }

  return ''
}

function getPosterDateSortKey(value) {
  const text = normalizePosterDate(value)
  const match = text.match(/(20\d{2})\.(\d{2})\.(\d{2})/)
  return match ? `${match[1]}${match[2]}${match[3]}` : ''
}

function collectSceneDates(scene) {
  const candidates = [
    scene?.routeDate,
    scene?.routeStartDate,
    scene?.routeEndDate,
    scene?.date,
    scene?.time,
    scene?.scheduledText,
    scene?.scheduled_at,
    scene?.matchCard?.time,
    scene?.matchCard?.date,
    scene?.title,
    ...(Array.isArray(scene?.chips) ? scene.chips : [])
  ]

  return candidates
    .map(value => ({ display: normalizePosterDate(value), sortKey: getPosterDateSortKey(value) }))
    .filter(item => item.display)
}

function getPlayerRouteDateRange(list) {
  const first = list[0] || {}
  const explicitStart = normalizePosterDate(pickPosterValue(
    first.routeStartDate,
    first.route_start_date,
    first.firstMatchDate,
    first.first_match_date,
    first.startedAt,
    first.started_at
  ))
  const explicitEnd = normalizePosterDate(pickPosterValue(
    first.routeEndDate,
    first.route_end_date,
    first.lastMatchDate,
    first.last_match_date,
    first.endedAt,
    first.ended_at
  ))

  const dates = safeArr(list).flatMap(collectSceneDates)
  const uniqueDates = Array.from(new Map(dates.map(item => [item.display, item])).values())
    .sort((a, b) => String(a.sortKey || a.display).localeCompare(String(b.sortKey || b.display)))

  const start = explicitStart || uniqueDates[0]?.display || ''
  const end = explicitEnd || uniqueDates[uniqueDates.length - 1]?.display || ''

  if (start && end && start !== end) return `${start} → ${end}`
  return start || end || ''
}

function buildPlayerTicketMemory(data) {
  const mapCount = parsePosterNumber(data.mapCount)
  const matchCount = parsePosterNumber(data.matchCount)
  const minutes = parsePosterNumber(data.minutes)
  const peakValue = parsePosterNumber(data.peakValue)
  const rankText = String(data.rank || '')
  const candidates = []

  if (rankText.includes('冠军')) {
    candidates.push({
      score: 82,
      type: 'rank',
      title: '这段行程抵达了最后一站',
      body: `${data.team || '这支队伍'} 最终抵达冠军终点。这张行程票记住的不只是结果，也包括你在这段路线里留下的每一次出场。`
    })
  } else if (rankText.includes('亚军')) {
    candidates.push({
      score: 72,
      type: 'rank',
      title: '这段行程抵达了最终舞台附近',
      body: `${data.team || '这支队伍'} 最终走到 ${rankText}。差一步也是一整段路，这张行程票保存的是你参与过的路线。`
    })
  } else if (rankText.includes('季军') || rankText.includes('殿军') || rankText.includes('第4名') || rankText.includes('第 4 名')) {
    candidates.push({
      score: 62,
      type: 'rank',
      title: '这段行程停在了终局附近',
      body: `${data.team || '队伍'} 最终抵达 ${rankText}。这不是路过，而是你和队伍一起走进过这届比赛靠后的章节。`
    })
  } else if (rankText.includes('第5') || rankText.includes('第 5') || rankText.includes('5-8') || rankText.includes('前八')) {
    candidates.push({
      score: 54,
      type: 'rank',
      title: '这段行程进入了淘汰赛区间',
      body: `${rankText} 不是终点，但它说明你和队伍穿过了公开预选赛，把这段路线延伸到了更靠后的地方。`
    })
  }

  if (peakValue > 0) {
    candidates.push({
      score: 50 + (peakValue >= 15000 ? 16 : peakValue >= 10000 ? 10 : 4),
      type: 'peak',
      title: '这段行程记住了一次高光',
      body: '它不是平均值，而是某一张地图、某一段路线里真正发生过的瞬间。'
    })
  }

  if (matchCount >= 8 || mapCount >= 20 || minutes >= 180) {
    candidates.push({
      score: 42 + (mapCount >= 30 ? 12 : 0) + (matchCount >= 12 ? 8 : 0) + (minutes >= 300 ? 8 : 0),
      type: 'journey',
      title: '你不是只短暂经过这里',
      body: '这段路线已经完成归档，而你的名字留在票面上。'
    })
  }

  if (data.topHero) {
    candidates.push({
      score: 36 + (safeArr(data.heroes).length >= 3 ? 8 : 0),
      type: 'hero',
      title: '你的英雄成了这段路线的标记',
      body: '它不只是一个英雄名，也是这段学院赛行程里最清晰的影子。'
    })
  }

  if (data.topMap) {
    candidates.push({
      score: 30,
      type: 'map',
      title: '有一张地图反复出现在路线里',
      body: '很多交火、等待和结算，最后都变成这段路线里被保存下来的一站。'
    })
  }

  const best = candidates.sort((a, b) => b.score - a.score)[0]

  return best || {
    score: 0,
    type: 'default',
    title: '这张行程票证明你来过',
    body: '比赛会结束，赛程也会归档。但这张票记住的是你曾经站进这届学院赛，留下属于自己的路线。'
  }
}


function isRouteTicketKind(kind) {
  return ['manager', 'coach', 'managerCoach', 'staff', 'caster', 'team', 'tournament'].includes(kind)
}

function getIdentityTicketConfig(kind) {
  if (kind === 'managerCoach') {
    return {
      ticketType: 'DUAL ROLE ITINERARY',
      passTop: 'DUAL ROLE',
      passBottom: 'PASS',
      classValue: '经理 / 教练',
      routeTitle: 'TEAM ROUTE',
      stampTitle: 'ROSTER MANIFEST',
      noteTitle: 'ROLE NOTE',
      infoLabel: 'CALLSIGN',
      issuedFallback: 'MANAGER / COACH',
      teamFallback: 'TEAM',
      teamLabel: 'TEAM',
      issuedTeamLabel: 'ISSUED TEAM',
      stampMode: 'roster',
      statFallbacks: ['MATCHES', 'PLAYERS', 'LINEUPS', 'FINAL']
    }
  }

  if (kind === 'manager') {
    return {
      ticketType: 'MANAGER ITINERARY',
      passTop: 'MANAGER',
      passBottom: 'PASS',
      classValue: '经理',
      routeTitle: 'TEAM ROUTE',
      stampTitle: 'ROSTER MANIFEST',
      noteTitle: 'MANAGER NOTE',
      infoLabel: 'CALLSIGN',
      issuedFallback: 'MANAGER',
      teamFallback: 'TEAM',
      teamLabel: 'TEAM',
      issuedTeamLabel: 'ISSUED TEAM',
      stampMode: 'roster',
      statFallbacks: ['MATCHES', 'PLAYERS', 'OPPONENTS', 'FINAL']
    }
  }

  if (kind === 'coach') {
    return {
      ticketType: 'COACH ITINERARY',
      passTop: 'COACH',
      passBottom: 'PASS',
      classValue: '教练',
      routeTitle: 'TEAM ROUTE',
      stampTitle: 'ROSTER MANIFEST',
      noteTitle: 'COACH NOTE',
      infoLabel: 'CALLSIGN',
      issuedFallback: 'COACH',
      teamFallback: 'TEAM',
      teamLabel: 'TEAM',
      issuedTeamLabel: 'ISSUED TEAM',
      stampMode: 'roster',
      statFallbacks: ['MATCHES', 'LINEUPS', 'MAPS', 'FINAL']
    }
  }

  if (kind === 'staff') {
    return {
      ticketType: 'OPERATIONS ITINERARY',
      passTop: 'OPS',
      passBottom: 'PASS',
      classValue: '赛管',
      routeTitle: 'OPS ROUTE',
      stampTitle: 'CREW STAMPS',
      noteTitle: 'OPS NOTE',
      infoLabel: 'CALLSIGN',
      issuedFallback: 'STAFF',
      teamFallback: 'FCA OPS',
      teamFullFallback: 'FRIES CUP OPS',
      teamLabel: 'TEAM',
      issuedTeamLabel: 'ISSUED TEAM',
      forceTeamFallback: true,
      statFallbacks: ['MATCHES', 'STAGES', 'PARTNERS', 'OPS']
    }
  }

  if (kind === 'caster') {
    return {
      ticketType: 'BROADCAST ITINERARY',
      passTop: 'BROADCAST',
      passBottom: 'PASS',
      classValue: '解说',
      routeTitle: 'BROADCAST ROUTE',
      stampTitle: 'VOICE STAMPS',
      noteTitle: 'BROADCAST NOTE',
      infoLabel: 'CALLSIGN',
      issuedFallback: 'CASTER',
      teamFallback: 'FCA CAST',
      teamFullFallback: 'FRIES CUP BROADCAST',
      teamLabel: 'TEAM',
      issuedTeamLabel: 'ISSUED TEAM',
      forceTeamFallback: true,
      statFallbacks: ['MATCHES', 'PARTNERS', 'STAGES', 'VOICE']
    }
  }

  if (kind === 'tournament') {
    return {
      ticketType: 'EVENT WITNESS PASS',
      passTop: 'WITNESS',
      passBottom: 'PASS',
      classValue: '见证者',
      routeTitle: 'SEASON ROUTE',
      stampTitle: 'SEASON MARKS',
      noteTitle: 'WITNESS NOTE',
      infoLabel: 'WITNESS ID',
      issuedFallback: '共同见证者',
      teamFallback: 'FRIES CUP 2026',
      teamFullFallback: '2026 薯条杯学院赛',
      teamLabel: 'EVENT',
      issuedTeamLabel: 'ARCHIVE',
      forceTeamFallback: true,
      statFallbacks: ['TEAMS', 'MATCHES', 'MAPS', 'CHAMPION']
    }
  }

  return {
    ticketType: 'TEAM ITINERARY',
    passTop: 'TEAM',
    passBottom: 'PASS',
    classValue: 'TEAM',
    routeTitle: 'TEAM ROUTE',
    stampTitle: 'TEAM STAMPS',
    noteTitle: 'TEAM NOTE',
    infoLabel: 'ARCHIVE NOTE',
    issuedFallback: 'TEAM',
    teamFallback: 'TEAM',
    teamLabel: 'TEAM',
    issuedTeamLabel: 'ISSUED TEAM',
    statFallbacks: ['MATCHES', 'PLAYERS', 'MAPS', 'FINAL']
  }
}

function englishStatLabel(label) {
  const text = String(label || '').toLowerCase()
  if (text.includes('match') || text.includes('比赛') || text.includes('场次')) return 'MATCHES'
  if (text.includes('win') || text.includes('胜')) return 'WINS'
  if (text.includes('loss') || text.includes('lose') || text.includes('负')) return 'LOSSES'
  if (text.includes('map') || text.includes('地图')) return 'MAPS'
  if (text.includes('player') || text.includes('选手') || text.includes('队员')) return 'PLAYERS'
  if (text.includes('lineup') || text.includes('阵容')) return 'LINEUPS'
  if (text.includes('partner') || text.includes('搭档') || text.includes('合作')) return 'PARTNERS'
  if (text.includes('stage') || text.includes('阶段')) return 'STAGES'
  if (text.includes('team') || text.includes('队伍')) return 'TEAMS'
  if (text.includes('caster') || text.includes('voice') || text.includes('解说')) return 'VOICE'
  if (text.includes('staff') || text.includes('admin') || text.includes('赛管') || text.includes('执行')) return 'OPS'
  if (text.includes('champion') || text.includes('冠军')) return 'CHAMPION'
  if (text.includes('final') || text.includes('rank') || text.includes('成绩') || text.includes('名次')) return 'FINAL'
  return String(label || 'STAT').toUpperCase().replace(/\s+/g, ' ').slice(0, 16)
}

function normalizeTicketValue(value, fallback = '-') {
  const text = String(value ?? '').trim()
  return text || fallback
}

const STAFF_DISPLAY_ALIASES = {
  michaelsky5: 'SKY',
  交易大师邦桑迪: '牛萨库斯',
  GHOST: 'GHOST',
  在桜花散落前: '小枝',
  江川鹤一: '江川鹤一',
  缚虎君: '缚虎',
  只看漫天繁星与你: 'Roya',
  桑榆: '桑榆',
  纳纳克绝不熬夜: '南宫',
  丧命: '丧命',
  咸鱼咸: '咸鱼咸',
  Iris: '鸢尾',
  转生成雷电将军: '雷电将军',
  CHILLBOI: 'HAJIMI',
  我在黄昏淇里: '良良子',
  君子与月齐辉: '君子',
  LuckyBoy: 'LuckyBoy',
  寒冷的笑: '小云',
  疯狂大堡垒: '大堡垒',
  对面买菜超级加倍: '滴查',
  MaverickOvO: 'Maverick',
  AvIcII: 'Avicii',
  雾星月: '雾星月',
  Eleven: '伊莱文',
  我一世背叛: '我一世背叛',
  雨说丶: '雨说',
  Bella: '贝拉',
  身上有麻衣在爬: 'Z12'
}

function stripTicketHash(value) {
  return String(value || '').replace(/#\d+$/g, '').trim()
}

function getStaffAliasName(value, fallback = '') {
  const raw = normalizeTicketValue(value, '')
  const publicName = stripTicketHash(raw) || raw
  const candidates = [raw, publicName, stripTicketHash(raw)].filter(Boolean)

  for (const candidate of candidates) {
    if (STAFF_DISPLAY_ALIASES[candidate]) return STAFF_DISPLAY_ALIASES[candidate]
  }

  const normalized = candidates.map(item => String(item).toLowerCase()).filter(Boolean)
  const matchedKey = Object.keys(STAFF_DISPLAY_ALIASES).find(key => normalized.includes(String(key).toLowerCase()))

  return matchedKey ? STAFF_DISPLAY_ALIASES[matchedKey] : (fallback || publicName || raw)
}

function getRosterRoleOrder(card) {
  const text = `${card?.role || ''} ${card?.meta || ''} ${card?.value || ''}`.toLowerCase()
  if (text.includes('tank') || text.includes('坦克')) return 1
  if (text.includes('dps') || text.includes('damage') || text.includes('输出')) return 2
  if (text.includes('support') || text.includes('sup') || text.includes('辅助') || text.includes('奶')) return 3
  return 9
}


function isShortTeamCode(value) {
  const text = String(value || '').trim()
  if (!text) return false
  if (text.length > 10) return false
  if (/^[A-Za-z0-9_.-]{2,10}$/.test(text)) return true
  return /^[\u4e00-\u9fa5A-Za-z0-9_.-]{1,8}$/.test(text) && !/[，。、“”]/.test(text)
}

function pickIdentityTeamCode(cardKind, config, first, firstChips, issuedTo, teamFullName) {
  if (config.forceTeamFallback) return config.teamFallback

  const candidates = [
    first.teamShort,
    first.team_short_name,
    first.short,
    first.team?.short,
    first.team?.team_short_name,
    firstChips[0]
  ].filter(Boolean)

  if (config.preferIssuedAsTeamCode && isShortTeamCode(issuedTo)) return issuedTo

  const short = candidates.find(isShortTeamCode)
  if (short) return short

  return firstChips[0] || teamFullName || config.teamFallback
}

function getIdentityInfoValue(cardKind, subject, callsign) {
  if (cardKind === 'manager' || cardKind === 'coach' || cardKind === 'managerCoach' || cardKind === 'team' || cardKind === 'tournament') {
    return callsign || subject
  }

  return callsign || subject
}

function getRankLikeText(list) {
  const text = safeArr(list).flatMap(scene => [
    scene?.metric,
    scene?.watermark,
    scene?.title,
    ...(Array.isArray(scene?.chips) ? scene.chips : []),
    ...(Array.isArray(scene?.statLines) ? scene.statLines.map(row => `${row?.label || ''} ${row?.value || ''}`) : [])
  ]).filter(Boolean).join(' ')

  const rank = text.match(/(冠军|亚军|季军|殿军|第\s*\d+\s*名|第?\s*\d+\s*[-–—~至到]\s*\d+\s*名?|前八|八强|季后淘汰赛)/)
  return rank ? rank[0].replace(/\s+/g, '') : ''
}

function collectTicketCards(list, limit = 3) {
  const fields = [
    'rosterCards',
    'playerCards',
    'partnerCards',
    'crossPartnerCards',
    'teamCards',
    'mapCards',
    'staffCards',
    'casterCards',
    'cards'
  ]
  const rows = []

  safeArr(list).forEach(scene => {
    fields.forEach(field => {
      safeArr(scene?.[field]).forEach(card => rows.push(card))
    })
    safeArr(scene?.partnerGroups).forEach(group => {
      safeArr(group?.cards).forEach(card => rows.push(card))
    })
  })

  const seen = new Set()
  return rows
    .map(card => ({
      title: normalizeTicketValue(card?.title || card?.name || card?.label, ''),
      meta: normalizeTicketValue(card?.meta || card?.note || card?.value || card?.sub, ''),
      value: normalizeTicketValue(card?.value || card?.displayValue || card?.sub || '', ''),
      image: card?.image || card?.src || ''
    }))
    .filter(card => card.title)
    .filter(card => {
      const key = `${card.title}::${card.meta}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .slice(0, limit)
}

function collectRosterTicketCards(list, limit = 8) {
  const rows = []

  safeArr(list).forEach(scene => {
    safeArr(scene?.rosterCards).forEach(card => rows.push(card))
    safeArr(scene?.playerCards).forEach(card => rows.push(card))
  })

  const seen = new Set()
  const cleaned = rows
    .map((card, index) => ({
      title: normalizeTicketValue(card?.title || card?.name || card?.label, ''),
      meta: normalizeTicketValue(card?.role || card?.meta || card?.note || card?.value || card?.sub, ''),
      value: normalizeTicketValue(card?.value || card?.displayValue || card?.sub || '', ''),
      image: card?.image || card?.src || '',
      role: normalizeTicketValue(card?.role || card?.meta || '', ''),
      orderIndex: index
    }))
    .filter(card => card.title)
    .filter(card => {
      const key = normalizeTicketValue(card.title, '').toLowerCase()
      if (!key || seen.has(key)) return false
      seen.add(key)
      return true
    })
    .sort((a, b) => {
      const roleDiff = getRosterRoleOrder(a) - getRosterRoleOrder(b)
      if (roleDiff !== 0) return roleDiff
      return a.orderIndex - b.orderIndex
    })

  return cleaned.slice(0, limit)
}

function getDateRangeStart(value) {
  const text = String(value || '').trim()
  if (!text) return ''
  return text.split('→')[0]?.trim() || text
}

function getDateRangeEnd(value) {
  const text = String(value || '').trim()
  if (!text) return ''
  const parts = text.split('→').map(item => item.trim()).filter(Boolean)
  return parts[parts.length - 1] || text
}

function getIdentityIssuedTo(first, scenes, subject, fallback) {
  const direct = pickPosterValue(
    first.viewerBattleTag,
    first.viewer_battle_tag,
    first.viewerId,
    first.viewer_id,
    first.viewerName,
    first.viewer_name,
    first.issuedTo,
    first.issued_to,
    first.identityId,
    first.identity_id,
    first.subTitle,
    first.battleTag,
    first.battle_tag,
    first.staffTag,
    first.staff_tag,
    first.casterTag,
    first.caster_tag,
    first.managerTag,
    first.manager_tag,
    first.coachTag,
    first.coach_tag,
    first.account,
    first.account_id,
    first.tag
  )

  if (direct) return direct

  for (const scene of safeArr(scenes)) {
    const value = pickPosterValue(
      scene?.viewerBattleTag,
      scene?.viewer_battle_tag,
      scene?.viewerId,
      scene?.viewer_id,
      scene?.viewerName,
      scene?.viewer_name,
      scene?.issuedTo,
      scene?.issued_to,
      scene?.identityId,
      scene?.identity_id,
      scene?.battleTag,
      scene?.battle_tag,
      scene?.staffTag,
      scene?.staff_tag,
      scene?.casterTag,
      scene?.caster_tag,
      scene?.managerTag,
      scene?.manager_tag,
      scene?.coachTag,
      scene?.coach_tag,
      scene?.subTitle,
      scene?.tag
    )
    if (value) return value
  }

  return subject || fallback
}

function collectIdentityStats(list, config) {
  const rows = []

  safeArr(list).forEach(scene => {
    if (scene?.metric && String(scene.metric) !== '—') {
      rows.push({ label: englishStatLabel(scene.metricLabel || scene.eyebrow || 'STAT'), value: scene.metric })
    }

    safeArr(scene?.statLines).forEach(line => {
      if (line?.value !== undefined && line?.value !== null && String(line.value).trim() !== '') {
        rows.push({ label: englishStatLabel(line.label), value: line.value })
      }
    })

    safeArr(scene?.dataBars).forEach(bar => {
      if (bar?.displayValue || bar?.value) {
        rows.push({ label: englishStatLabel(bar.label), value: bar.displayValue || bar.value })
      }
    })
  })

  const seen = new Set()
  const deduped = rows.filter(row => {
    const label = String(row.label || '').trim()
    if (!label || seen.has(label)) return false
    seen.add(label)
    return true
  })

  while (deduped.length < 4) {
    const label = config.statFallbacks[deduped.length] || 'STAT'
    if (!seen.has(label)) {
      deduped.push({ label, value: '-' })
      seen.add(label)
    } else {
      deduped.push({ label: `STAT ${deduped.length + 1}`, value: '-' })
    }
  }

  return deduped.slice(0, 4)
}


function getTicketStatValue(stats, keys) {
  const rows = safeArr(stats)
  const found = rows.find(row => keys.some(key => String(row?.label || '').toUpperCase().includes(key)))
  return found?.value
}

function normalizeTournamentStageValue(value) {
  const text = String(value || '').trim()
  if (!text) return '-'
  if (/^\d+$/.test(text)) return text

  const parts = text.split(/[、/｜|·,，\s]+/g).map(item => item.trim()).filter(Boolean)
  if (parts.length >= 2 && parts.length <= 6) return String(parts.length)

  return text.length > 8 ? `${text.slice(0, 7)}…` : text
}

function buildTournamentStats(stats, champion) {
  const teams = getTicketStatValue(stats, ['TEAMS', 'TEAM']) || stats[0]?.value || '-'
  const matches = getTicketStatValue(stats, ['MATCHES', 'MATCH']) || stats[1]?.value || '-'
  const maps = getTicketStatValue(stats, ['MAPS', 'MAP', '地图']) || '412'

  return [
    { label: 'TEAMS', value: teams },
    { label: 'MATCHES', value: matches },
    { label: 'MAPS', value: maps },
    { label: 'CHAMPION', value: champion || '-' }
  ]
}

function buildIdentityMemory(kind, data) {
  if (kind === 'caster') {
    return {
      title: '你的声音被归档在赛季里',
      body: '这张票记录的是你讲述过的比赛、团战、等待和结束。'
    }
  }

  if (kind === 'staff') {
    return {
      title: '你让比赛被执行和确认',
      body: '这张票记录的是幕后完成赛程的那部分工作。'
    }
  }

  if (kind === 'coach') {
    return {
      title: '这张票记录了一段战术路线',
      body: '它保存的是阵容、调整和队伍一起走过的比赛。'
    }
  }

  if (kind === 'manager') {
    return {
      title: '这张票记录了一段队伍路线',
      body: '它保存的是报名、沟通、等待和队伍完成赛季的过程。'
    }
  }

  if (kind === 'managerCoach') {
    return {
      title: '你同时站在运营和战术之间',
      body: '这张票保存的是双重身份参与过的整段赛季路线。'
    }
  }

  if (kind === 'tournament') {
    return {
      title: '你见证了这届比赛',
      body: '开赛、等待、翻盘与结束，都因此被看见。'
    }
  }

  return {
    title: '这张票记录了完整的队伍路线',
    body: '成绩会被写进表格，但这张票保存的是这段赛季被完成的过程。'
  }
}

function getRecordTextFromStats(stats) {
  const rows = safeArr(stats)
  const findValue = keys => rows.find(row => keys.some(key => String(row?.label || '').toUpperCase().includes(key)))?.value
  const wins = findValue(['WINS', 'WIN', '胜'])
  const losses = findValue(['LOSSES', 'LOSS', '负'])

  if (wins !== undefined && losses !== undefined) return `${wins}W-${losses}L`
  return ''
}

function getFinalMatchupLabel(list) {
  const cards = safeArr(list)
    .map(scene => scene?.matchCard)
    .filter(card => card && (card.left || card.right || card.title))

  const card = cards[cards.length - 1] || null
  if (!card) return ''

  const left = safeText(card.left)
  const right = safeText(card.right)
  if (left && right) return `${left} VS ${right}`

  return safeText(card.title)
}

function getTournamentChampionLabel(list) {
  const rows = []

  safeArr(list).forEach(scene => {
    safeArr(scene?.teamCards).forEach(card => rows.push(card))
    safeArr(scene?.cards).forEach(card => rows.push(card))
    safeArr(scene?.partnerGroups).forEach(group => safeArr(group?.cards).forEach(card => rows.push(card)))
  })

  const champion = rows.find(card => {
    const text = [card?.title, card?.meta, card?.value, card?.sub, card?.note, card?.label].filter(Boolean).join(' ')
    return /冠军|CHAMPION/i.test(text)
  })

  const fallback = rows[0]
  return safeText(champion?.title || champion?.name || champion?.label || fallback?.title || fallback?.name || '', '')
}

function compactMatchupLabel(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''

  const parts = raw.split(/\s+(?:VS|vs|V\.S\.|v\.s\.)\s+|\s*[：:]\s*/).map(part => part.trim()).filter(Boolean)
  if (parts.length >= 2) {
    const shorten = item => item.length > 6 ? `${item.slice(0, 5)}…` : item
    return `${shorten(parts[0])} VS ${shorten(parts[1])}`
  }

  return raw.length > 14 ? `${raw.slice(0, 13)}…` : raw
}

function compactRouteDate(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''

  const full = raw.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/)
  if (full) return `${full[2].padStart(2, '0')}.${full[3].padStart(2, '0')}`

  const monthOnly = raw.match(/^(\d{4})[-/.](\d{1,2})$/)
  if (monthOnly) return monthOnly[2].padStart(2, '0')

  return raw.replace(/^(\d{4})[-/.]/, '')
}

function getIdentityRouteStops(kind, data) {
  const firstStop = compactRouteDate(getDateRangeStart(data.routeDateRange)) || 'FIRST'
  const finalStop = compactRouteDate(getDateRangeEnd(data.routeDateRange) || data.routeEndLabel || data.dest) || 'END'

  if (kind === 'caster') {
    return [
      { code: 'FIRST', label: 'FIRST CAST', value: firstStop },
      { code: 'STAGE', label: 'MAIN STAGE', value: data.stage || data.stats[1]?.value || 'BROADCAST' },
      { code: 'PAIR', label: 'CAST PARTNER', value: data.stamps[0]?.title || 'PARTNER' },
      { code: 'LAST', label: 'FINAL CAST', value: finalStop }
    ]
  }

  if (kind === 'staff') {
    return [
      { code: 'FIRST', label: 'FIRST OPS', value: firstStop },
      { code: 'STAGE', label: 'MAIN STAGE', value: data.stage || data.stats[1]?.value || 'OPS' },
      { code: 'CREW', label: 'CREW LINK', value: data.stamps[0]?.title || 'CREW' },
      { code: 'LAST', label: 'FINAL OPS', value: finalStop }
    ]
  }

  if (kind === 'tournament') {
    return [
      { code: 'OPEN', label: 'SEASON OPEN', value: firstStop === 'FIRST' ? '03.28' : firstStop },
      { code: 'TEAMS', label: 'TEAMS RECORDED', value: data.stats[0]?.value || '-' },
      { code: 'MATCHES', label: 'MATCHES PLAYED', value: data.stats[1]?.value || '-' },
      { code: 'FINAL', label: 'CHAMPION', value: data.dest || 'ARCHIVE' }
    ]
  }

  if (kind === 'manager' || kind === 'coach' || kind === 'managerCoach') {
    return [
      { code: 'RIVAL', label: 'FIRST OPPONENT', value: data.firstOpponentName || data.firstMatchLabel || 'FIRST' },
      { code: 'ROSTER', label: 'TEAM ROSTER', value: `${safeArr(data.stamps).length || '-'} 人` },
      { code: 'RECORD', label: 'SEASON RECORD', value: data.recordText || 'RECORD' },
      { code: 'DEST', label: 'FINAL RANK', value: data.dest || 'ARCHIVE' }
    ]
  }

  return [
    { code: 'TEAM', label: 'ISSUED TEAM', value: data.team || 'TEAM' },
    { code: 'ROSTER', label: 'ROSTER MARK', value: data.stamps[0]?.title || 'ROSTER' },
    { code: 'MATCH', label: 'MATCH ROUTE', value: data.stamps[1]?.title || 'MATCH' },
    { code: 'DEST', label: 'FINAL RANK', value: data.dest || 'ARCHIVE' }
  ]
}

function getIdentityTicketData(list, cardKind) {
  const config = getIdentityTicketConfig(cardKind)
  const first = list[0] || {}
  const ending = list[list.length - 1] || first
  const firstChips = safeArr(first.chips)
  const subject = cleanPosterSubject(first.title || '') || first.subTitle || config.issuedFallback
  const issuedTo = getIdentityIssuedTo(first, list, subject, config.issuedFallback)
  const callsignRaw = pickPosterValue(
    first.viewerName,
    first.viewer_name,
    first.callsign,
    first.callSign,
    first.nickname,
    first.nickName,
    first.display_name,
    first.displayName,
    first.publicName,
    first.name,
    subject
  )
  const rawTeamFullName = first.teamFullName || first.team_full_name || first.teamName || first.team_name || firstChips[0] || config.teamFallback
  const team = pickIdentityTeamCode(cardKind, config, first, firstChips, issuedTo, rawTeamFullName)
  const teamFullName = config.forceTeamFallback ? (config.teamFullFallback || team) : rawTeamFullName
  const inferredRouteDateRange = getPlayerRouteDateRange(list)
  const routeDateRange = cardKind === 'tournament'
    ? pickPosterValue(first.routeDateRange, first.route_date_range, inferredRouteDateRange && inferredRouteDateRange.includes('→') ? inferredRouteDateRange : '', '2026.03.27 → 2026.05.17')
    : inferredRouteDateRange
  const rawDest = getRankLikeText(list) || ending.metric || firstChips[firstChips.length - 1] || 'ARCHIVE'
  const finalMatchupLabel = pickPosterValue(
    first.finalMatchupLabel,
    first.final_matchup_label,
    first.lastMatchupLabel,
    first.last_matchup_label,
    getFinalMatchupLabel(list)
  )
  const stamps = config.stampMode === 'roster'
    ? collectRosterTicketCards(list, 8)
    : collectTicketCards(list, 3)
  const rawStats = collectIdentityStats(list, config)
  const tournamentChampion = cardKind === 'tournament' ? getTournamentChampionLabel(list) : ''
  const stats = cardKind === 'tournament' ? buildTournamentStats(rawStats, tournamentChampion) : rawStats
  const dest = cardKind === 'tournament'
    ? (tournamentChampion || rawDest || 'SEASON ARCHIVE')
    : (cardKind === 'staff' || cardKind === 'caster')
      ? (finalMatchupLabel || getDateRangeEnd(routeDateRange) || rawDest)
      : rawDest
  const baseCallsign = getIdentityInfoValue(cardKind, subject, callsignRaw)
  const callsign = cardKind === 'tournament'
    ? (callsignRaw || stripTicketHash(issuedTo) || '共同见证者')
    : (cardKind === 'staff' || cardKind === 'caster')
      ? getStaffAliasName(baseCallsign || issuedTo || subject, baseCallsign || subject)
      : baseCallsign
  const firstOpponentName = pickPosterValue(first.firstOpponentName, first.first_opponent_name, first.firstOpponent, first.first_opponent)
  const firstMatchLabel = pickPosterValue(first.firstMatchLabel, first.first_match_label)
  const recordText = pickPosterValue(first.seasonRecordText, first.season_record_text) || getRecordTextFromStats(stats)

  const data = {
    kind: cardKind,
    config,
    issuedTo,
    callsign,
    viewerId: cardKind === 'tournament' ? (issuedTo || callsign || config.issuedFallback) : '',
    eventTitle: cardKind === 'tournament' ? (config.teamFullFallback || '2026 薯条杯学院赛') : '',
    ticketType: config.ticketType,
    team,
    teamFullName,
    classValue: config.classValue,
    dest,
    routeDateRange,
    routeStartLabel: getDateRangeStart(routeDateRange) || normalizePosterDate(first.routeStartDate || first.route_start_date) || '',
    routeEndLabel: getDateRangeEnd(routeDateRange) || normalizePosterDate(first.routeEndDate || first.route_end_date) || '',
    firstOpponentName,
    firstMatchLabel,
    finalMatchupLabel,
    recordText,
    stage: firstChips[1] || '',
    stamps,
    stats
  }

  return {
    ...data,
    memory: buildIdentityMemory(cardKind, data),
    routeStops: getIdentityRouteStops(cardKind, data)
  }
}

function getPlayerTicketData(list) {
  const first = list[0] || {}
  const firstMomentScene = list.find(scene => String(scene.eyebrow || '').toUpperCase().includes('FIRST RECORDED')) || {}
  const metricScene = list.find(scene => String(scene.metricLabel || '').toUpperCase().includes('MAPS RECORDED')) ||
    list.find(scene => String(scene.eyebrow || '').toUpperCase().includes('YOU WERE THERE')) ||
    {}
  const heroScene = list.find(scene => String(scene.eyebrow || '').toUpperCase().includes('SIGNATURE HERO')) || {}
  const peakScene = list.find(scene => scene.visualType === 'peakHighlight' || String(scene.eyebrow || '').toUpperCase().includes('ONE MAP')) || {}
  const mapScene = list.find(scene => String(scene.eyebrow || '').toUpperCase().includes('MAP MEMORY')) || {}
  const roleScene = list.find(scene => String(scene.eyebrow || '').toUpperCase().includes('ROLE MEMORY')) || {}
  const tagScene = list.find(scene => String(scene.eyebrow || '').toUpperCase().includes('SEASON TAG')) || {}
  const ending = list[list.length - 1] || {}

  const heroesFromGallery = safeArr(heroScene.images).map(item => ({
    title: item.title,
    meta: item.meta,
    src: item.src
  })).filter(item => item.title || item.src)

  const heroes = heroesFromGallery.length
    ? heroesFromGallery
    : heroScene.image
      ? [{
        title: cleanPosterSubject(String(heroScene.title || '').split('：').pop() || 'SIGNATURE HERO'),
        meta: safeArr(heroScene.chips).join(' · '),
        src: heroScene.image
      }]
      : []

  const firstChips = safeArr(first.chips)
  const metricLines = safeArr(metricScene.statLines)
  const tagLines = safeArr(tagScene.statLines)
  const mapTitleParts = String(mapScene.title || '').split('\n')
  const topMap = mapTitleParts[mapTitleParts.length - 1] || safeArr(mapScene.chips)[0] || ''
  const firstMoment = safeArr(firstMomentScene.chips).filter(Boolean).join(' · ')
  const peakContext = safeArr(peakScene.chips).filter(Boolean).join(' · ')
  const topHero = heroes[0]?.title || cleanPosterSubject(String(heroScene.title || '').split('：').pop() || '')

  const data = {
    playerName: cleanPosterSubject(first.title || ''),
    battleTag: first.subTitle || '',
    team: firstChips[0] || '',
    teamFullName: first.teamFullName || first.team_full_name || first.teamName || first.team_name || first.team?.name || firstChips[0] || '',
    role: firstChips[1] || '',
    rank: firstChips[2] || ending.metric || '',
    teamLogo: ending.image || first.image || '',
    mapCount: metricScene.metric || metricLines.find(item => item.label?.includes('地图'))?.value || '',
    matchCount: metricLines.find(item => String(item.label).includes('比赛'))?.value || '',
    minutes: metricLines.find(item => String(item.label).includes('时间'))?.value || '',
    topMap,
    topMapMeta: safeArr(mapScene.chips).filter(Boolean).join(' · '),
    topHero,
    peakValue: peakScene.metric || '',
    peakLabel: peakScene.metricLabel || '',
    peakTitle: peakScene.title || '',
    peakContext,
    firstMoment,
    routeDateRange: getPlayerRouteDateRange(list),
    routeFrom: first.routeFrom || first.route_from || '2026 薯条杯学院赛',
    routeTo: first.routeTo || first.route_to || firstChips[2] || ending.metric || '赛季归档',
    firstMatchLabel: first.firstMatchLabel || first.first_match_label || '',
    lastMatchLabel: first.lastMatchLabel || first.last_match_label || '',
    identityTitle: tagScene.title || roleScene.title || '',
    identityBody: tagScene.body || roleScene.body || '',
    roleStats: safeArr(roleScene.statLines).length ? safeArr(roleScene.statLines) : tagLines,
    heroes
  }

  return {
    ...data,
    memory: buildPlayerTicketMemory(data)
  }
}

export function getPosterPayload(scenes) {
  const list = (Array.isArray(scenes) ? scenes : []).filter(scene => !scene?.excludeFromPoster)
  const first = list[0] || {}
  const ending = list[list.length - 1] || first
  const spotlight = list.find(scene => scene.kind === 'spotlight') || null
  const roleScene = list.find(scene => String(scene.eyebrow || '').toUpperCase().includes('ROLE')) || null
  const cardKind = inferCardKind(first, list)
  const cardType = inferCardType(first, list)
  const metric = pickMetricScene(list, cardKind)
  const subject = cleanPosterSubject(first.title || '')
  const playerTicket = cardKind === 'player' ? getPlayerTicketData(list) : null
  const identityTicket = cardKind !== 'player' && isRouteTicketKind(cardKind) ? getIdentityTicketData(list, cardKind) : null

  const payload = {
    tone: ending.tone || first.tone || 'gold',
    cardKind,
    cardType,
    achievement: inferAchievement(list, cardKind),
    eyebrow: first.eyebrow || '2026 FRIES CUP',
    title: cardKind === 'player'
      ? `${subject || '我的'} 的学院赛纪念票`
      : first.title || '我的薯条杯赛季回顾',
    subtitle: first.subTitle || first.chips?.filter(Boolean).join(' · ') || '',
    image: pickPosterImage(list, cardKind),
    metricValue: metric?.metric || '',
    metricLabel: metric?.metricLabel || '',
    signatureTitle: cardKind === 'player'
      ? '你在这届学院赛留下了自己的参赛轨迹'
      : spotlight?.title || roleScene?.title || metric?.title || '',
    mainText: cardKind === 'player'
      ? `比赛会结束，赛程也会归档。但这张纪念票会记住：${subject || '你'} 曾经站进这届学院赛，在地图、队友、对手和结果之间，留下属于自己的参赛痕迹。`
      : pickMainText(list),
    chips: ending.chips?.length ? ending.chips : first.chips || [],
    playerTicket,
    identityTicket,
    scenes: list
  }

  return {
    ...payload,
    archiveId: buildArchiveId(payload)
  }
}

function drawGrid(ctx, width, height) {
  ctx.strokeStyle = 'rgba(255,255,255,0.035)'
  ctx.lineWidth = 1

  for (let x = 0; x <= width; x += 72) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)
    ctx.stroke()
  }

  for (let y = 0; y <= height; y += 72) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
    ctx.stroke()
  }
}

function drawTicketBase(ctx, x, y, w, h, accent, options = {}) {
  const { label = '', stub = true, perforationX = x + w - 214 } = options

  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.52)'
  ctx.shadowBlur = 36
  ctx.fillStyle = PANEL_BG
  drawRoundedRect(ctx, x, y, w, h, 28)
  ctx.fill()
  ctx.restore()

  ctx.save()
  ctx.strokeStyle = 'rgba(255,255,255,0.14)'
  ctx.lineWidth = 2
  drawRoundedRect(ctx, x, y, w, h, 28)
  ctx.stroke()

  ctx.strokeStyle = hexToRgba(accent, 0.7)
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.moveTo(x + 26, y + 28)
  ctx.lineTo(x + Math.min(320, w - 34), y + 28)
  ctx.stroke()

  if (stub) {
    ctx.setLineDash([8, 12])
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(perforationX, y + 24)
    ctx.lineTo(perforationX, y + h - 24)
    ctx.stroke()
    ctx.setLineDash([])

    ctx.fillStyle = CARD_BG
    ;[y + 76, y + h - 76].forEach(cy => {
      ctx.beginPath()
      ctx.arc(perforationX, cy, 24, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = 'rgba(255,255,255,0.12)'
      ctx.stroke()
    })
  }

  if (label) {
    drawText(ctx, label, x + 30, y + h - 30, {
      font: `900 20px ${FONT_MONO}`,
      fill: hexToRgba(accent, 0.72)
    })
  }

  ctx.restore()
}

function drawTicketField(ctx, label, value, x, y, accent, options = {}) {
  const { valueFont = `900 34px ${FONT_SC}`, labelFont = `900 18px ${FONT_MONO}`, maxWidth = 240 } = options

  drawText(ctx, label, x, y, {
    font: labelFont,
    fill: 'rgba(255,255,255,0.34)'
  })

  drawText(ctx, safeText(value, '-'), x, y + 38, {
    font: valueFont,
    fill: '#ffffff',
    maxWidth
  })
}

function drawBarcode(ctx, x, y, w, h, accent, seed = '') {
  const raw = String(seed || 'FCA26')
  let cursor = x

  ctx.save()
  for (let i = 0; cursor < x + w; i += 1) {
    const code = raw.charCodeAt(i % raw.length) || 70
    const barW = 2 + (code % 4)
    const gap = 2 + (code % 3)
    ctx.fillStyle = i % 5 === 0 ? hexToRgba(accent, 0.9) : 'rgba(255,255,255,0.58)'
    ctx.fillRect(cursor, y, barW, h)
    cursor += barW + gap
  }
  ctx.restore()
}

function drawImageInside(ctx, image, x, y, w, h, options = {}) {
  const { contain = true, radius = 18, alpha = 1 } = options

  ctx.save()
  drawRoundedRect(ctx, x, y, w, h, radius)
  ctx.clip()
  ctx.fillStyle = 'rgba(255,255,255,0.05)'
  ctx.fillRect(x, y, w, h)

  if (image) {
    const ratio = contain ? Math.min(w / image.width, h / image.height) : Math.max(w / image.width, h / image.height)
    const imgW = image.width * ratio
    const imgH = image.height * ratio
    const imgX = x + (w - imgW) / 2
    const imgY = y + (h - imgH) / 2
    ctx.globalAlpha = alpha
    ctx.drawImage(image, imgX, imgY, imgW, imgH)
  }

  ctx.restore()
  ctx.save()
  ctx.strokeStyle = 'rgba(255,255,255,0.14)'
  ctx.lineWidth = 2
  drawRoundedRect(ctx, x, y, w, h, radius)
  ctx.stroke()
  ctx.restore()
}

function drawImagePlain(ctx, image, x, y, w, h, options = {}) {
  const { contain = true, alpha = 1 } = options
  if (!image) return

  ctx.save()
  const ratio = contain ? Math.min(w / image.width, h / image.height) : Math.max(w / image.width, h / image.height)
  const imgW = image.width * ratio
  const imgH = image.height * ratio
  const imgX = x + (w - imgW) / 2
  const imgY = y + (h - imgH) / 2
  ctx.globalAlpha = alpha
  ctx.drawImage(image, imgX, imgY, imgW, imgH)
  ctx.restore()
}

function drawHeroStamp(ctx, hero, image, x, y, accent, index) {
  ctx.save()
  ctx.fillStyle = 'rgba(255,255,255,0.045)'
  ctx.strokeStyle = hexToRgba(accent, index === 0 ? 0.62 : 0.32)
  ctx.lineWidth = index === 0 ? 3 : 2
  drawRoundedRect(ctx, x, y, 190, 212, 18)
  ctx.fill()
  ctx.stroke()

  drawImageInside(ctx, image, x + 18, y + 18, 154, 116, { contain: true, radius: 12 })

  drawText(ctx, index === 0 ? 'SIGNATURE' : `HERO 0${index + 1}`, x + 18, y + 162, {
    font: `900 15px ${FONT_MONO}`,
    fill: hexToRgba(accent, 0.9)
  })

  drawText(ctx, safeText(hero?.title, '英雄'), x + 18, y + 190, {
    font: `900 28px ${FONT_SC}`,
    fill: '#ffffff',
    maxWidth: 154
  })

  ctx.restore()
}

function getRouteStopValue(value, fallback = '-') {
  const text = String(value || '').trim()
  if (!text) return fallback
  const first = text.split(/[·/｜|]/g).map(item => item.trim()).filter(Boolean)[0]
  return first || text || fallback
}

function getPosterStatLabel(label) {
  const text = String(label || '').toLowerCase()
  if (!text) return 'PEAK'
  if (text.includes('治疗') || text.includes('heal')) return 'PEAK HEAL'
  if (text.includes('伤害') || text.includes('damage') || text.includes('dmg')) return 'PEAK DMG'
  if (text.includes('阻挡') || text.includes('blocked') || text.includes('block')) return 'PEAK BLOCK'
  if (text.includes('击杀') || text.includes('消除') || text.includes('elim') || text.includes('kill')) return 'PEAK ELIM'
  if (text.includes('助攻') || text.includes('assist')) return 'PEAK AST'
  return 'PEAK'
}

function drawRouteMap(ctx, data, accent, x, y, w, h) {
  const stops = [
    {
      code: 'CHECK-IN',
      label: 'FIRST MAP',
      value: getRouteStopValue(data.firstMoment, 'FRIES CUP')
    },
    {
      code: 'VIA',
      label: 'MOST VISITED',
      value: getRouteStopValue(data.topMap, '-')
    },
    {
      code: 'HERO',
      label: 'HERO STAMP',
      value: getRouteStopValue(data.topHero, '-')
    },
    {
      code: 'DEST',
      label: 'FINAL RANK',
      value: getRouteStopValue(data.rank, '-')
    }
  ]

  ctx.save()
  ctx.fillStyle = 'rgba(255,255,255,0.01)'
  ctx.strokeStyle = 'rgba(255,255,255,0.026)'
  ctx.lineWidth = 2
  drawCutCornerRect(ctx, x, y, w, h, 16)
  ctx.fill()
  ctx.stroke()

  const lineY = y + 136
  const startX = x + 54
  const endX = x + w - 54

  const stopCodeFont = `900 14px ${FONT_MONO}`
  ctx.save()
  ctx.font = stopCodeFont
  const routeTitleX = startX - ctx.measureText('CHECK-IN').width / 2
  const recordTitleX = endX + ctx.measureText('DEST').width / 2
  ctx.restore()

  drawText(ctx, 'ROUTE STOPS', routeTitleX, y + 46, {
    font: `900 20px ${FONT_MONO}`,
    fill: accent
  })

  drawText(ctx, 'PLAYER RECORD', recordTitleX, y + 46, {
    font: `900 13px ${FONT_MONO}`,
    fill: 'rgba(255,255,255,0.26)',
    align: 'right'
  })

  ctx.strokeStyle = 'rgba(255,255,255,0.2)'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(startX, lineY)
  ctx.lineTo(endX, lineY)
  ctx.stroke()

  stops.forEach((stop, index) => {
    const px = startX + ((endX - startX) / (stops.length - 1)) * index
    const isEdge = index === 0 || index === stops.length - 1

    ctx.fillStyle = isEdge ? accent : CARD_BG
    ctx.beginPath()
    ctx.arc(px, lineY, isEdge ? 13 : 10, 0, Math.PI * 2)
    ctx.fill()

    ctx.strokeStyle = isEdge ? hexToRgba(accent, 0.92) : 'rgba(255,255,255,0.43)'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(px, lineY, isEdge ? 13 : 10, 0, Math.PI * 2)
    ctx.stroke()

    drawText(ctx, stop.code, px, y + 96, {
      font: stopCodeFont,
      fill: index === 0 ? accent : 'rgba(255,255,255,0.38)',
      align: 'center',
      maxWidth: 104
    })

    drawText(ctx, stop.value, px, y + 186, {
      font: `900 24px ${FONT_SC}`,
      fill: index === stops.length - 1 ? accent : '#ffffff',
      align: 'center',
      maxWidth: 108
    })

    drawText(ctx, stop.label, px, y + 214, {
      font: `900 11px ${FONT_MONO}`,
      fill: 'rgba(255,255,255,0.28)',
      align: 'center',
      maxWidth: 112
    })
  })

  ctx.fillStyle = hexToRgba(accent, 0.08)
  ctx.fillRect(x + 28, y + h - 37, w - 56, 1)

  drawText(ctx, 'STOPS VERIFIED', x + 28, y + h - 16, {
    font: `900 11px ${FONT_MONO}`,
    fill: 'rgba(255,255,255,0.16)',
    maxWidth: w - 56
  })

  ctx.restore()
}

function drawPlayerTicketPoster(ctx, payload, images, accent) {
  const width = ctx.canvas.width
  const height = ctx.canvas.height
  const ticketWidth = 1680
  const ticketHeight = 900
  const ticket = document.createElement('canvas')
  const tctx = ticket.getContext('2d')

  ticket.width = ticketWidth
  ticket.height = ticketHeight

  ctx.fillStyle = CARD_BG
  ctx.fillRect(0, 0, width, height)

  const bgGlow = ctx.createRadialGradient(width * 0.68, height * 0.28, 0, width * 0.68, height * 0.28, 760)
  bgGlow.addColorStop(0, hexToRgba(accent, 0.2))
  bgGlow.addColorStop(0.42, hexToRgba(accent, 0.07))
  bgGlow.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = bgGlow
  ctx.fillRect(0, 0, width, height)

  drawGrid(ctx, width, height)
  drawLandscapePlayerTicket(tctx, ticketWidth, ticketHeight, payload, images, accent)

  const scale = Math.min((width - 96) / ticketWidth, (height - 96) / ticketHeight)
  const drawW = ticketWidth * scale
  const drawH = ticketHeight * scale
  const drawX = (width - drawW) / 2
  const drawY = (height - drawH) / 2

  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.62)'
  ctx.shadowBlur = 44
  ctx.drawImage(ticket, drawX, drawY, drawW, drawH)
  ctx.restore()
}

function drawLandscapePlayerTicket(ctx, width, height, payload, images, accent) {
  const data = payload.playerTicket || {}
  const heroList = safeArr(data.heroes).slice(0, 3)
  const memory = data.memory || {}
  const ticketX = 24
  const ticketY = 24
  const ticketW = width - 48
  const ticketH = height - 48
  const stubX = 1310
  const stubW = 322
  const issuedTo = safeText(data.battleTag, data.playerName)
  const callsign = safeText(data.playerName, issuedTo.replace(/#\d+$/g, ''))

  ctx.clearRect(0, 0, width, height)

  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.62)'
  ctx.shadowBlur = 42
  ctx.fillStyle = PANEL_BG
  drawCutCornerRect(ctx, ticketX, ticketY, ticketW, ticketH, 28)
  ctx.fill()
  ctx.restore()

  ctx.save()
  ctx.strokeStyle = 'rgba(255,255,255,0.14)'
  ctx.lineWidth = 2
  drawCutCornerRect(ctx, ticketX, ticketY, ticketW, ticketH, 28)
  ctx.stroke()

  ctx.fillStyle = hexToRgba(accent, 0.11)
  ctx.fillRect(ticketX, ticketY, ticketW, 92)

  ctx.strokeStyle = hexToRgba(accent, 0.72)
  ctx.lineWidth = 5
  ctx.beginPath()
  ctx.moveTo(70, 78)
  ctx.lineTo(408, 78)
  ctx.stroke()

  ctx.setLineDash([10, 13])
  ctx.strokeStyle = 'rgba(255,255,255,0.23)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(stubX, 48)
  ctx.lineTo(stubX, height - 48)
  ctx.stroke()
  ctx.setLineDash([])

  ;[130, height - 130].forEach(cy => {
    ctx.fillStyle = CARD_BG
    ctx.beginPath()
    ctx.arc(stubX, cy, 30, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.12)'
    ctx.stroke()
  })
  ctx.restore()

  drawText(ctx, 'FRIES CUP 2026', 70, 67, {
    font: `900 23px ${FONT_MONO}`,
    fill: accent
  })

  drawText(ctx, 'SEASON ROUTE ARCHIVE', 70, 104, {
    font: `900 25px ${FONT_MONO}`,
    fill: 'rgba(255,255,255,0.56)'
  })

  drawText(ctx, payload.archiveId || 'FCA26-ARCHIVE', 1252, 66, {
    font: `900 22px ${FONT_MONO}`,
    fill: 'rgba(255,255,255,0.42)',
    align: 'right'
  })

  drawText(ctx, 'MEMORY ARCHIVE ONLY', 1252, 102, {
    font: `900 17px ${FONT_MONO}`,
    fill: 'rgba(255,255,255,0.26)',
    align: 'right'
  })

  drawText(ctx, 'ISSUED TO', 70, 164, {
    font: `900 18px ${FONT_MONO}`,
    fill: 'rgba(255,255,255,0.3)'
  })

  drawText(ctx, issuedTo, 70, 228, {
    font: `900 64px ${FONT_SC}`,
    fill: '#ffffff',
    maxWidth: 650
  })

  drawText(ctx, 'CALLSIGN', 74, 284, {
    font: `900 15px ${FONT_MONO}`,
    fill: 'rgba(255,255,255,0.26)'
  })

  drawText(ctx, callsign, 74, 314, {
    font: `900 23px ${FONT_SC}`,
    fill: 'rgba(255,255,255,0.68)',
    maxWidth: 240
  })

  drawText(ctx, 'TICKET TYPE', 396, 284, {
    font: `900 15px ${FONT_MONO}`,
    fill: 'rgba(255,255,255,0.26)'
  })

  drawText(ctx, 'PLAYER ITINERARY', 396, 314, {
    font: `900 19px ${FONT_MONO}`,
    fill: 'rgba(255,255,255,0.42)',
    maxWidth: 312
  })

  drawText(ctx, 'ISSUED TEAM', 74, 368, {
    font: `900 15px ${FONT_MONO}`,
    fill: 'rgba(255,255,255,0.26)'
  })

  drawText(ctx, safeText(data.teamFullName, data.team), 74, 398, {
    font: `900 23px ${FONT_SC}`,
    fill: 'rgba(255,255,255,0.66)',
    maxWidth: 300
  })

  drawText(ctx, 'VALID PERIOD', 396, 368, {
    font: `900 15px ${FONT_MONO}`,
    fill: 'rgba(255,255,255,0.26)'
  })

  drawText(ctx, safeText(data.routeDateRange, '2026 SEASON'), 396, 398, {
    font: `900 20px ${FONT_MONO}`,
    fill: hexToRgba(accent, 0.64),
    maxWidth: 314
  })

  drawTicketField(ctx, 'TEAM', data.team, 74, 452, accent, { maxWidth: 150, valueFont: `900 32px ${FONT_SC}` })
  drawTicketField(ctx, 'CLASS', data.role, 250, 452, accent, { maxWidth: 190, valueFont: `900 32px ${FONT_SC}` })
  drawTicketField(ctx, 'DEST', data.rank || payload.achievement, 476, 452, accent, { maxWidth: 230, valueFont: `900 32px ${FONT_SC}` })

  ctx.save()
  ctx.fillStyle = 'rgba(255,255,255,0.04)'
  ctx.strokeStyle = 'rgba(255,255,255,0.1)'
  ctx.lineWidth = 2
  drawCutCornerRect(ctx, 70, 558, 644, 120, 18)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = accent
  ctx.fillRect(70, 558, 6, 120)

  drawText(ctx, 'TRAVEL NOTE', 104, 594, {
    font: `900 18px ${FONT_MONO}`,
    fill: accent
  })

  drawText(ctx, safeText(memory.title, '这张票证明你来过'), 104, 628, {
    font: `900 26px ${FONT_SC}`,
    fill: '#ffffff',
    maxWidth: 560
  })

  ctx.font = `800 21px ${FONT_SC}`
  ctx.fillStyle = 'rgba(255,255,255,0.68)'
  wrapCanvasText(ctx, safeText(memory.body, payload.mainText), 104, 658, 560, 26, 1)
  ctx.restore()

  drawRouteMap(ctx, data, accent, 770, 252, 490, 294)

  const stampAreaX = 770
  const stampAreaW = 490
  const stampCardW = 128
  const stampCardH = 154
  const stampGap = (stampAreaW - stampCardW * 3) / 2
  const stampY = 652

  drawText(ctx, 'TOP HERO STAMPS', stampAreaX, 620, {
    font: `900 15px ${FONT_MONO}`,
    fill: 'rgba(255,255,255,0.24)'
  })

  ;[0, 1, 2].forEach(index => {
    const hero = heroList[index] || {}
    const x = stampAreaX + index * (stampCardW + stampGap)
    const y = stampY
    ctx.fillStyle = 'rgba(255,255,255,0.04)'
    ctx.strokeStyle = hexToRgba(accent, index === 0 ? 0.64 : 0.32)
    ctx.lineWidth = index === 0 ? 3 : 2
    drawCutCornerRect(ctx, x, y, stampCardW, stampCardH, 14)
    ctx.fill()
    ctx.stroke()
    drawImageInside(ctx, images.heroImages?.[index], x + 9, y + 9, stampCardW - 18, 98, { contain: true, radius: 4 })
    drawText(ctx, safeText(hero.title, `HERO ${index + 1}`), x + stampCardW / 2, y + 138, {
      font: `900 21px ${FONT_SC}`,
      fill: '#ffffff',
      align: 'center',
      maxWidth: stampCardW - 28
    })
  })

  const stats = [
    { label: 'MAPS', value: data.mapCount || payload.metricValue || '-' },
    { label: 'MATCHES', value: data.matchCount || '-' },
    { label: 'MIN', value: data.minutes || '-' },
    { label: getPosterStatLabel(data.peakLabel), value: data.peakValue || '-' }
  ]

  stats.forEach((item, index) => {
    const x = 74 + index * 174
    drawText(ctx, item.value, x, 772, {
      font: `900 40px ${FONT_MONO}`,
      fill: index === 0 || index === 3 ? accent : '#ffffff',
      maxWidth: 148
    })
    drawText(ctx, item.label, x + 2, 806, {
      font: `900 15px ${FONT_MONO}`,
      fill: 'rgba(255,255,255,0.36)',
      maxWidth: 148
    })
  })

  const stubCenterX = stubX + stubW / 2

  ctx.strokeStyle = hexToRgba(accent, 0.58)
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(stubX + 52, 126)
  ctx.lineTo(stubX + stubW - 52, 126)
  ctx.stroke()

  drawText(ctx, 'ISSUED BY', stubCenterX, 156, {
    font: `900 12px ${FONT_MONO}`,
    fill: 'rgba(255,255,255,0.3)',
    align: 'center'
  })

  drawText(ctx, 'FRIES CUP DATA CENTER', stubCenterX, 184, {
    font: `900 16px ${FONT_MONO}`,
    fill: hexToRgba(accent, 0.82),
    align: 'center',
    maxWidth: 240
  })

  ctx.strokeStyle = 'rgba(255,255,255,0.1)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(stubX + 64, 220)
  ctx.lineTo(stubX + stubW - 64, 220)
  ctx.stroke()

  drawText(ctx, 'SEASON', stubCenterX, 274, {
    font: `900 23px ${FONT_MONO}`,
    fill: accent,
    align: 'center'
  })

  drawText(ctx, 'PASS', stubCenterX, 316, {
    font: `900 42px ${FONT_MONO}`,
    fill: '#ffffff',
    align: 'center'
  })

  drawText(ctx, 'TEAM', stubCenterX, 376, {
    font: `900 15px ${FONT_MONO}`,
    fill: 'rgba(255,255,255,0.34)',
    align: 'center'
  })

  drawText(ctx, safeText(data.team, 'TEAM'), stubCenterX, 418, {
    font: `900 48px ${FONT_SC}`,
    fill: '#ffffff',
    align: 'center',
    maxWidth: 260
  })

  drawText(ctx, 'CLASS', stubX + 62, 482, {
    font: `900 14px ${FONT_MONO}`,
    fill: 'rgba(255,255,255,0.34)'
  })

  drawText(ctx, 'DEST', stubX + 202, 482, {
    font: `900 14px ${FONT_MONO}`,
    fill: 'rgba(255,255,255,0.34)'
  })

  drawText(ctx, safeText(data.role, 'ROLE'), stubX + 62, 516, {
    font: `900 20px ${FONT_SC}`,
    fill: 'rgba(255,255,255,0.72)',
    maxWidth: 132
  })

  drawText(ctx, safeText(data.rank || payload.achievement, 'SEASON'), stubX + 202, 516, {
    font: `900 24px ${FONT_SC}`,
    fill: accent,
    maxWidth: 108
  })

  drawText(ctx, 'TICKET CODE', stubCenterX, 574, {
    font: `900 15px ${FONT_MONO}`,
    fill: 'rgba(255,255,255,0.28)',
    align: 'center'
  })

  drawBarcode(ctx, stubX + 66, 606, 190, 72, accent, payload.archiveId)

  drawText(ctx, 'KEEP THIS TICKET', stubCenterX, 714, {
    font: `900 21px ${FONT_MONO}`,
    fill: 'rgba(255,255,255,0.38)',
    align: 'center'
  })

  drawText(ctx, 'TICKET ID', stubCenterX, 758, {
    font: `900 15px ${FONT_MONO}`,
    fill: 'rgba(255,255,255,0.28)',
    align: 'center'
  })

  drawText(ctx, payload.archiveId || 'FCA26', stubCenterX, 802, {
    font: `900 21px ${FONT_MONO}`,
    fill: accent,
    align: 'center'
  })
}


function drawIdentityRouteMap(ctx, data, accent, x, y, w, h) {
  const stops = safeArr(data.routeStops).slice(0, 4)
  while (stops.length < 4) stops.push({ code: 'STOP', label: 'ARCHIVE', value: '-' })

  ctx.save()
  ctx.fillStyle = 'rgba(255,255,255,0.01)'
  ctx.strokeStyle = 'rgba(255,255,255,0.026)'
  ctx.lineWidth = 2
  drawCutCornerRect(ctx, x, y, w, h, 16)
  ctx.fill()
  ctx.stroke()

  const lineY = y + 136
  const startX = x + 54
  const endX = x + w - 54
  const stopCodeFont = `900 14px ${FONT_MONO}`

  ctx.save()
  ctx.font = stopCodeFont
  const routeTitleX = startX - ctx.measureText(stops[0].code || 'CHECK-IN').width / 2
  const recordTitleX = endX + ctx.measureText(stops[stops.length - 1].code || 'DEST').width / 2
  ctx.restore()

  drawText(ctx, data.config.routeTitle || 'ROUTE STOPS', routeTitleX, y + 46, {
    font: `900 20px ${FONT_MONO}`,
    fill: accent,
    maxWidth: 260
  })

  drawText(ctx, 'ARCHIVE RECORD', recordTitleX, y + 46, {
    font: `900 13px ${FONT_MONO}`,
    fill: 'rgba(255,255,255,0.26)',
    align: 'right',
    maxWidth: 180
  })

  ctx.strokeStyle = 'rgba(255,255,255,0.2)'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(startX, lineY)
  ctx.lineTo(endX, lineY)
  ctx.stroke()

  stops.forEach((stop, index) => {
    const px = startX + ((endX - startX) / (stops.length - 1)) * index
    const isEdge = index === 0 || index === stops.length - 1

    ctx.fillStyle = isEdge ? accent : CARD_BG
    ctx.beginPath()
    ctx.arc(px, lineY, isEdge ? 13 : 10, 0, Math.PI * 2)
    ctx.fill()

    ctx.strokeStyle = isEdge ? hexToRgba(accent, 0.92) : 'rgba(255,255,255,0.43)'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(px, lineY, isEdge ? 13 : 10, 0, Math.PI * 2)
    ctx.stroke()

    drawText(ctx, stop.code || 'STOP', px, y + 96, {
      font: stopCodeFont,
      fill: index === 0 ? accent : 'rgba(255,255,255,0.38)',
      align: 'center',
      maxWidth: 108
    })

    drawText(ctx, normalizeTicketValue(stop.value), px, y + 186, {
      font: `900 23px ${FONT_SC}`,
      fill: index === stops.length - 1 ? accent : '#ffffff',
      align: 'center',
      maxWidth: 108
    })

    drawText(ctx, stop.label || 'ARCHIVE', px, y + 214, {
      font: `900 11px ${FONT_MONO}`,
      fill: 'rgba(255,255,255,0.28)',
      align: 'center',
      maxWidth: 112
    })
  })

  ctx.fillStyle = hexToRgba(accent, 0.08)
  ctx.fillRect(x + 28, y + h - 37, w - 56, 1)

  drawText(ctx, 'STOPS VERIFIED', x + 28, y + h - 16, {
    font: `900 11px ${FONT_MONO}`,
    fill: 'rgba(255,255,255,0.16)',
    maxWidth: w - 56
  })

  ctx.restore()
}

function drawRosterStrip(ctx, cards, images, x, y, w, h, accent) {
  const rows = safeArr(cards).slice(0, 8)
  const count = rows.length ? Math.min(8, Math.max(5, rows.length)) : 5
  const gap = count >= 8 ? 6 : count >= 7 ? 7 : 9
  const itemW = (w - gap * (count - 1)) / count
  const itemH = h
  const imageH = count <= 5 ? 72 : count <= 6 ? 66 : 58
  const nameY = y + imageH + 34
  const metaY = nameY + 20

  rows
    .concat(Array.from({ length: Math.max(0, count - rows.length) }, (_, index) => ({ title: `P${index + rows.length + 1}`, meta: 'ROSTER' })))
    .slice(0, count)
    .forEach((card, index) => {
      const itemX = x + index * (itemW + gap)
      ctx.save()
      ctx.fillStyle = 'rgba(255,255,255,0.035)'
      ctx.strokeStyle = hexToRgba(accent, index === 0 ? 0.58 : 0.24)
      ctx.lineWidth = index === 0 ? 2.5 : 1.5
      drawCutCornerRect(ctx, itemX, y, itemW, itemH, 10)
      ctx.fill()
      ctx.stroke()

      drawImageInside(ctx, images?.[index], itemX + 7, y + 8, itemW - 14, imageH, { contain: true, radius: 4 })

      drawText(ctx, safeText(card?.title, `P${index + 1}`), itemX + itemW / 2, nameY, {
        font: `900 ${count >= 8 ? 14 : 16}px ${FONT_SC}`,
        fill: '#ffffff',
        align: 'center',
        maxWidth: itemW - 10
      })

      if (card?.meta) {
        drawText(ctx, card.meta, itemX + itemW / 2, metaY, {
          font: `900 ${count >= 8 ? 9 : 10}px ${FONT_SC}`,
          fill: 'rgba(255,255,255,0.34)',
          align: 'center',
          maxWidth: itemW - 10
        })
      }
      ctx.restore()
    })
}

function drawIdentityStampCard(ctx, card, image, x, y, w, h, accent, index) {
  ctx.save()
  ctx.fillStyle = 'rgba(255,255,255,0.04)'
  ctx.strokeStyle = hexToRgba(accent, index === 0 ? 0.64 : 0.32)
  ctx.lineWidth = index === 0 ? 3 : 2
  drawCutCornerRect(ctx, x, y, w, h, 14)
  ctx.fill()
  ctx.stroke()

  if (image) {
    drawImageInside(ctx, image, x + 9, y + 9, w - 18, 82, { contain: true, radius: 4 })
    drawText(ctx, safeText(card?.title, `STAMP ${index + 1}`), x + w / 2, y + 120, {
      font: `900 20px ${FONT_SC}`,
      fill: '#ffffff',
      align: 'center',
      maxWidth: w - 22
    })
    if (card?.meta) {
      drawText(ctx, card.meta, x + w / 2, y + 140, {
        font: `900 11px ${FONT_SC}`,
        fill: 'rgba(255,255,255,0.36)',
        align: 'center',
        maxWidth: w - 22
      })
    }
  } else {
    drawText(ctx, `STAMP 0${index + 1}`, x + 14, y + 34, {
      font: `900 12px ${FONT_MONO}`,
      fill: hexToRgba(accent, 0.72)
    })
    drawText(ctx, safeText(card?.title, `ARCHIVE ${index + 1}`), x + w / 2, y + 82, {
      font: `900 23px ${FONT_SC}`,
      fill: '#ffffff',
      align: 'center',
      maxWidth: w - 22
    })
    drawText(ctx, safeText(card?.meta || card?.value, 'SEASON RECORD'), x + w / 2, y + 116, {
      font: `900 13px ${FONT_SC}`,
      fill: 'rgba(255,255,255,0.4)',
      align: 'center',
      maxWidth: w - 24
    })
  }

  ctx.restore()
}

function drawIdentityTicketPoster(ctx, payload, images, accent) {
  const width = ctx.canvas.width
  const height = ctx.canvas.height
  const ticketWidth = 1680
  const ticketHeight = 900
  const ticket = document.createElement('canvas')
  const tctx = ticket.getContext('2d')

  ticket.width = ticketWidth
  ticket.height = ticketHeight

  ctx.fillStyle = CARD_BG
  ctx.fillRect(0, 0, width, height)

  const bgGlow = ctx.createRadialGradient(width * 0.68, height * 0.28, 0, width * 0.68, height * 0.28, 760)
  bgGlow.addColorStop(0, hexToRgba(accent, 0.2))
  bgGlow.addColorStop(0.42, hexToRgba(accent, 0.07))
  bgGlow.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = bgGlow
  ctx.fillRect(0, 0, width, height)

  drawGrid(ctx, width, height)
  drawLandscapeIdentityTicket(tctx, ticketWidth, ticketHeight, payload, images, accent)

  const scale = Math.min((width - 96) / ticketWidth, (height - 96) / ticketHeight)
  const drawW = ticketWidth * scale
  const drawH = ticketHeight * scale
  const drawX = (width - drawW) / 2
  const drawY = (height - drawH) / 2

  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.62)'
  ctx.shadowBlur = 44
  ctx.drawImage(ticket, drawX, drawY, drawW, drawH)
  ctx.restore()
}

function drawLandscapeIdentityTicket(ctx, width, height, payload, images, accent) {
  const data = payload.identityTicket || {}
  const config = data.config || getIdentityTicketConfig(payload.cardKind)
  const ticketX = 24
  const ticketY = 24
  const ticketW = width - 48
  const ticketH = height - 48
  const stubX = 1310
  const stubW = 322
  const stubCenterX = stubX + stubW / 2
  const isViewerTicket = data.kind === 'tournament' || payload.cardKind === 'tournament'
  const primaryLabel = isViewerTicket ? 'EVENT' : 'ISSUED TO'
  const primaryValue = isViewerTicket ? safeText(data.eventTitle, '2026 薯条杯学院赛') : safeText(data.issuedTo, config.issuedFallback)
  const identityLabel = isViewerTicket ? 'WITNESS ID' : (config.infoLabel || 'CALLSIGN')
  const identityValue = isViewerTicket ? safeText(data.viewerId || data.callsign, '共同见证者') : safeText(data.callsign, data.issuedTo)
  const archiveLabel = isViewerTicket ? 'ARCHIVE' : (config.issuedTeamLabel || 'ISSUED TEAM')
  const archiveValue = isViewerTicket ? 'SEASON MEMORY' : safeText(data.teamFullName, data.team)
  const leftFieldLabel = isViewerTicket ? 'SEASON' : (config.teamLabel || 'TEAM')
  const leftFieldValue = isViewerTicket ? 'FCA2026' : data.team
  const middleFieldLabel = isViewerTicket ? 'CLASS' : 'CLASS'
  const middleFieldValue = isViewerTicket ? data.classValue : data.classValue
  const rightFieldLabel = isViewerTicket ? 'CHAMPION' : 'DEST'
  const rightFieldValue = isViewerTicket ? data.dest : (data.dest || payload.achievement)

  ctx.clearRect(0, 0, width, height)

  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.62)'
  ctx.shadowBlur = 42
  ctx.fillStyle = PANEL_BG
  drawCutCornerRect(ctx, ticketX, ticketY, ticketW, ticketH, 28)
  ctx.fill()
  ctx.restore()

  ctx.save()
  ctx.strokeStyle = 'rgba(255,255,255,0.14)'
  ctx.lineWidth = 2
  drawCutCornerRect(ctx, ticketX, ticketY, ticketW, ticketH, 28)
  ctx.stroke()
  ctx.fillStyle = hexToRgba(accent, 0.11)
  ctx.fillRect(ticketX, ticketY, ticketW, 92)
  ctx.strokeStyle = hexToRgba(accent, 0.72)
  ctx.lineWidth = 5
  ctx.beginPath()
  ctx.moveTo(70, 78)
  ctx.lineTo(408, 78)
  ctx.stroke()
  ctx.setLineDash([10, 13])
  ctx.strokeStyle = 'rgba(255,255,255,0.23)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(stubX, 48)
  ctx.lineTo(stubX, height - 48)
  ctx.stroke()
  ctx.setLineDash([])
  ;[130, height - 130].forEach(cy => {
    ctx.fillStyle = CARD_BG
    ctx.beginPath()
    ctx.arc(stubX, cy, 30, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.12)'
    ctx.stroke()
  })
  ctx.restore()

  drawText(ctx, 'FRIES CUP 2026', 70, 67, {
    font: `900 23px ${FONT_MONO}`,
    fill: accent
  })

  drawText(ctx, 'SEASON ROUTE ARCHIVE', 70, 104, {
    font: `900 25px ${FONT_MONO}`,
    fill: 'rgba(255,255,255,0.56)'
  })

  drawText(ctx, payload.archiveId || 'FCA26-ARCHIVE', 1252, 66, {
    font: `900 22px ${FONT_MONO}`,
    fill: 'rgba(255,255,255,0.42)',
    align: 'right'
  })

  drawText(ctx, 'MEMORY ARCHIVE ONLY', 1252, 102, {
    font: `900 17px ${FONT_MONO}`,
    fill: 'rgba(255,255,255,0.26)',
    align: 'right'
  })

  drawText(ctx, primaryLabel, 70, 164, {
    font: `900 18px ${FONT_MONO}`,
    fill: 'rgba(255,255,255,0.3)'
  })

  drawText(ctx, primaryValue, 70, 228, {
    font: `900 60px ${FONT_SC}`,
    fill: '#ffffff',
    maxWidth: 650
  })

  drawText(ctx, identityLabel, 74, 284, {
    font: `900 15px ${FONT_MONO}`,
    fill: 'rgba(255,255,255,0.26)'
  })

  drawText(ctx, identityValue, 74, 314, {
    font: `900 23px ${FONT_SC}`,
    fill: 'rgba(255,255,255,0.68)',
    maxWidth: 240
  })

  drawText(ctx, 'TICKET TYPE', 396, 284, {
    font: `900 15px ${FONT_MONO}`,
    fill: 'rgba(255,255,255,0.26)'
  })

  drawText(ctx, safeText(data.ticketType, config.ticketType), 396, 314, {
    font: `900 19px ${FONT_MONO}`,
    fill: 'rgba(255,255,255,0.42)',
    maxWidth: 312
  })

  drawText(ctx, archiveLabel, 74, 368, {
    font: `900 15px ${FONT_MONO}`,
    fill: 'rgba(255,255,255,0.26)'
  })

  drawText(ctx, archiveValue, 74, 398, {
    font: `900 23px ${FONT_SC}`,
    fill: 'rgba(255,255,255,0.66)',
    maxWidth: 300
  })

  drawText(ctx, 'VALID PERIOD', 396, 368, {
    font: `900 15px ${FONT_MONO}`,
    fill: 'rgba(255,255,255,0.26)'
  })

  drawText(ctx, safeText(data.routeDateRange, '2026 SEASON'), 396, 398, {
    font: `900 20px ${FONT_MONO}`,
    fill: hexToRgba(accent, 0.64),
    maxWidth: 314
  })

  drawTicketField(ctx, leftFieldLabel, leftFieldValue, 74, 452, accent, { maxWidth: 150, valueFont: `900 32px ${FONT_SC}` })
  drawTicketField(ctx, middleFieldLabel, middleFieldValue, 250, 452, accent, { maxWidth: 190, valueFont: `900 32px ${FONT_SC}` })
  drawTicketField(ctx, rightFieldLabel, rightFieldValue, 476, 452, accent, { maxWidth: 240, valueFont: `900 30px ${FONT_SC}` })

  ctx.save()
  ctx.fillStyle = 'rgba(255,255,255,0.04)'
  ctx.strokeStyle = 'rgba(255,255,255,0.1)'
  ctx.lineWidth = 2
  drawCutCornerRect(ctx, 70, 558, 644, 120, 18)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = accent
  ctx.fillRect(70, 558, 6, 120)
  drawText(ctx, config.noteTitle || 'TRAVEL NOTE', 104, 594, {
    font: `900 18px ${FONT_MONO}`,
    fill: accent
  })
  drawText(ctx, safeText(data.memory?.title, '这张票证明你来过'), 104, 628, {
    font: `900 26px ${FONT_SC}`,
    fill: '#ffffff',
    maxWidth: 560
  })
  ctx.font = `800 21px ${FONT_SC}`
  ctx.fillStyle = 'rgba(255,255,255,0.68)'
  wrapCanvasText(ctx, safeText(data.memory?.body, payload.mainText), 104, 658, 560, 26, 1)
  ctx.restore()

  drawIdentityRouteMap(ctx, data, accent, 770, 252, 490, 294)

  const stampAreaX = 770
  const stampAreaW = 490
  const stampY = 652

  drawText(ctx, config.stampTitle || 'SEASON STAMPS', stampAreaX, 620, {
    font: `900 15px ${FONT_MONO}`,
    fill: 'rgba(255,255,255,0.24)'
  })

  if (config.stampMode === 'roster') {
    drawRosterStrip(ctx, data.stamps, images.stampImages, stampAreaX, stampY, stampAreaW, 144, accent)
  } else {
    const stampCardW = 128
    const stampCardH = 154
    const stampGap = (stampAreaW - stampCardW * 3) / 2

    ;[0, 1, 2].forEach(index => {
      const card = data.stamps?.[index] || data.routeStops?.[index] || { title: `STAMP ${index + 1}`, meta: 'ARCHIVE' }
      const x = stampAreaX + index * (stampCardW + stampGap)
      drawIdentityStampCard(ctx, card, images.stampImages?.[index], x, stampY, stampCardW, stampCardH, accent, index)
    })
  }

  safeArr(data.stats).slice(0, 4).forEach((item, index) => {
    const x = 74 + index * 174
    drawText(ctx, normalizeTicketValue(item.value), x, 772, {
      font: `900 40px ${FONT_MONO}`,
      fill: index === 0 || index === 3 ? accent : '#ffffff',
      maxWidth: 148
    })
    drawText(ctx, normalizeTicketValue(item.label), x + 2, 806, {
      font: `900 15px ${FONT_MONO}`,
      fill: 'rgba(255,255,255,0.36)',
      maxWidth: 148
    })
  })

  ctx.strokeStyle = hexToRgba(accent, 0.58)
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(stubX + 52, 126)
  ctx.lineTo(stubX + stubW - 52, 126)
  ctx.stroke()

  drawText(ctx, 'ISSUED BY', stubCenterX, 156, {
    font: `900 12px ${FONT_MONO}`,
    fill: 'rgba(255,255,255,0.3)',
    align: 'center'
  })

  drawText(ctx, 'FRIES CUP DATA CENTER', stubCenterX, 184, {
    font: `900 16px ${FONT_MONO}`,
    fill: hexToRgba(accent, 0.82),
    align: 'center',
    maxWidth: 240
  })

  ctx.strokeStyle = 'rgba(255,255,255,0.1)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(stubX + 64, 220)
  ctx.lineTo(stubX + stubW - 64, 220)
  ctx.stroke()

  drawText(ctx, config.passTop || 'SEASON', stubCenterX, 274, {
    font: `900 23px ${FONT_MONO}`,
    fill: accent,
    align: 'center',
    maxWidth: 240
  })

  drawText(ctx, config.passBottom || 'PASS', stubCenterX, 316, {
    font: `900 42px ${FONT_MONO}`,
    fill: '#ffffff',
    align: 'center',
    maxWidth: 260
  })

  drawText(ctx, isViewerTicket ? 'EVENT' : (config.teamLabel || 'TEAM'), stubCenterX, 388, {
    font: `900 15px ${FONT_MONO}`,
    fill: 'rgba(255,255,255,0.34)',
    align: 'center'
  })

  drawText(ctx, isViewerTicket ? 'FCA2026' : safeText(data.team, config.teamFallback), stubCenterX, 430, {
    font: `900 42px ${FONT_SC}`,
    fill: '#ffffff',
    align: 'center',
    maxWidth: 260
  })

  const classColumnX = stubX + 96
  const destColumnX = stubX + 226

  drawText(ctx, isViewerTicket ? 'ROLE' : 'CLASS', classColumnX, 492, {
    font: `900 14px ${FONT_MONO}`,
    fill: 'rgba(255,255,255,0.34)',
    align: 'center'
  })

  drawText(ctx, isViewerTicket ? 'CHAMPION' : 'DEST', destColumnX, 492, {
    font: `900 14px ${FONT_MONO}`,
    fill: 'rgba(255,255,255,0.34)',
    align: 'center'
  })

  drawText(ctx, safeText(data.classValue, config.classValue), classColumnX, 526, {
    font: `900 20px ${FONT_SC}`,
    fill: 'rgba(255,255,255,0.72)',
    align: 'center',
    maxWidth: 116
  })

  drawText(ctx, safeText(data.dest || payload.achievement, 'ARCHIVE'), destColumnX, 526, {
    font: `900 20px ${FONT_SC}`,
    fill: accent,
    align: 'center',
    maxWidth: 134
  })

  drawText(ctx, 'TICKET CODE', stubCenterX, 584, {
    font: `900 15px ${FONT_MONO}`,
    fill: 'rgba(255,255,255,0.28)',
    align: 'center'
  })

  drawBarcode(ctx, stubX + 66, 616, 190, 72, accent, payload.archiveId)

  drawText(ctx, isViewerTicket ? 'KEEP THIS MEMORY' : 'KEEP THIS TICKET', stubCenterX, 724, {
    font: `900 21px ${FONT_MONO}`,
    fill: 'rgba(255,255,255,0.38)',
    align: 'center'
  })

  drawText(ctx, 'TICKET ID', stubCenterX, 768, {
    font: `900 15px ${FONT_MONO}`,
    fill: 'rgba(255,255,255,0.28)',
    align: 'center'
  })

  drawText(ctx, payload.archiveId || 'FCA26', stubCenterX, 812, {
    font: `900 21px ${FONT_MONO}`,
    fill: accent,
    align: 'center'
  })
}

function drawLegacyPoster(ctx, payload, image, accent) {
  const width = 1080
  const height = 1920

  ctx.fillStyle = '#060606'
  ctx.fillRect(0, 0, width, height)

  const bgGradient = ctx.createRadialGradient(850, 220, 0, 850, 220, 760)
  bgGradient.addColorStop(0, hexToRgba(accent, 0.32))
  bgGradient.addColorStop(0.36, hexToRgba(accent, 0.13))
  bgGradient.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = bgGradient
  ctx.fillRect(0, 0, width, height)

  drawGrid(ctx, width, height)

  ctx.fillStyle = '#0d0d0d'
  drawRoundedRect(ctx, 54, 54, 972, 1812, 26)
  ctx.fill()

  ctx.strokeStyle = 'rgba(255,255,255,0.14)'
  ctx.lineWidth = 2
  ctx.stroke()

  drawText(ctx, 'FRIES CUP 2026', 82, 158, {
    font: `900 30px ${FONT_SC}`,
    fill: accent
  })

  drawText(ctx, payload.cardType || 'SEASON REVIEW OFFICIAL CARD', 82, 198, {
    font: `900 25px ${FONT_SC}`,
    fill: 'rgba(255,255,255,0.48)'
  })

  drawText(ctx, payload.archiveId || 'FCA26-ARCHIVE', 998, 158, {
    font: `900 24px ${FONT_MONO}`,
    fill: 'rgba(255,255,255,0.42)',
    align: 'right'
  })

  ctx.font = `900 76px ${FONT_SC}`
  ctx.fillStyle = '#ffffff'
  const titleResult = wrapCanvasText(ctx, safeText(payload.title, '我的薯条杯赛季回顾'), 82, 320, 860, 86, 3)

  if (image) drawImageInside(ctx, image, 118, Math.max(600, titleResult.y + 80), 844, 360, { contain: true, radius: 24 })

  drawText(ctx, safeText(payload.metricValue, 'ARCHIVE'), 82, 1140, {
    font: `900 112px ${FONT_MONO}`,
    fill: accent,
    maxWidth: 420
  })

  drawText(ctx, safeText(payload.metricLabel, 'SEASON RECORD'), 88, 1180, {
    font: `900 25px ${FONT_MONO}`,
    fill: 'rgba(255,255,255,0.42)'
  })

  ctx.font = `800 35px ${FONT_SC}`
  ctx.fillStyle = 'rgba(255,255,255,0.78)'
  wrapCanvasText(ctx, safeText(payload.mainText, '这份赛季档案已经被保存。'), 82, 1310, 900, 56, 5)

  drawText(ctx, '2026 薯条杯学院赛 · SEASON REVIEW', 82, 1808, {
    font: `900 23px ${FONT_MONO}`,
    fill: 'rgba(255,255,255,0.34)'
  })

  drawText(ctx, 'FRIES CUP DATA CENTER', 82, 1856, {
    font: `900 32px ${FONT_MONO}`,
    fill: accent
  })

  drawText(ctx, payload.archiveId || 'FCA26-ARCHIVE', 998, 1856, {
    font: `900 26px ${FONT_MONO}`,
    fill: 'rgba(255,255,255,0.28)',
    align: 'right'
  })
}

function canvasToPngUrl(canvas) {
  return new Promise(resolve => {
    if (!canvas) {
      resolve('')
      return
    }

    const fallbackToDataUrl = () => {
      try {
        resolve(canvas.toDataURL('image/png', 0.96))
      } catch {
        resolve('')
      }
    }

    if (typeof canvas.toBlob !== 'function') {
      fallbackToDataUrl()
      return
    }

    canvas.toBlob(blob => {
      if (blob) {
        resolve(URL.createObjectURL(blob))
        return
      }

      fallbackToDataUrl()
    }, 'image/png', 0.96)
  })
}

export async function generatePosterPng(payload) {
  await ensurePosterFontsReady()

  const canvas = document.createElement('canvas')
  const isPlayerTicket = payload.cardKind === 'player'
  const isIdentityTicket = Boolean(payload.identityTicket)
  const isHorizontalTicket = isPlayerTicket || isIdentityTicket
  const width = isHorizontalTicket ? 1920 : 1080
  const height = isHorizontalTicket ? 1080 : 1920
  const accent = TONE_COLORS[payload.tone] || TONE_COLORS.gold

  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d')
  if (!ctx) return ''

  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  const image = await loadImage(payload.image)

  if (isPlayerTicket) {
    const [fcaLogo, ...heroImages] = await Promise.all([
      loadImage(FCA_LOGO),
      ...safeArr(payload.playerTicket?.heroes).slice(0, 3).map(hero => loadImage(hero.src))
    ])

    drawPlayerTicketPoster(ctx, payload, { mainImage: image, fcaLogo, heroImages }, accent)
  } else if (isIdentityTicket) {
    const stampImages = await Promise.all(
      safeArr(payload.identityTicket?.stamps).slice(0, 8).map(async stamp => {
        const image = await loadImage(stamp.image || DEFAULT_TEAM_LOGO)
        return image || await loadImage(DEFAULT_TEAM_LOGO)
      })
    )

    drawIdentityTicketPoster(ctx, payload, { mainImage: image, stampImages }, accent)
  } else {
    drawLegacyPoster(ctx, payload, image, accent)
  }

  return canvasToPngUrl(canvas)
}
