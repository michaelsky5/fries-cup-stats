import { heroNameToSlug, normalizeHeroFolder } from './reviewAssets.js'
import { localizeTraditionalReview } from './traditionalText.js'
import { getPosterLocaleContext } from './posterLocaleContext.js'
import { REVIEW_SOURCE_SCENE } from './reviewSource.js'
import { getDirectorCutEdition, getDirectorCutProfile } from './directorCutProfiles.js'
import { drawDirectorCutStorySignature } from './directorCutStorySignatures.js'
import { BOARDING_MONO_FONT, BOARDING_QR_SLOT, BOARDING_SANS_FONT, createBoardingQr, drawBoardingQr, ensureBoardingFontsReady } from './reviewBoardingPass.js'

export const TONE_COLORS = {
  gold: '#f4c320',
  silver: '#d9d9d9',
  bronze: '#c7834c',
  red: '#ff5a5d',
  blue: '#72b2ff',
  green: '#57dc8b',
  purple: '#b58cff'
}

const FONT_SC = '"HarmonyOS Sans SC", "HarmonyOS Sans", "Noto Sans SC", "PingFang SC", "Microsoft YaHei", "Source Han Sans SC", sans-serif'
const FONT_MONO = '"HarmonyOS Sans SC", "HarmonyOS Sans", "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif'
const CARD_BG = '#050505'
const PANEL_BG = 'rgba(14,14,14,0.94)'
const DEFAULT_EVENT_LOGO = '/logos/fca_logo.png'
const DEFAULT_TEAM_LOGO = '/logos/fc_logo.png'
const DEFAULT_OW_TEAM_LOGO = '/logos/FCR/OW.png'
export const DIRECTOR_CUT_HERO_EMBLEMS = Object.freeze({
  ana: '/review/hero-marks/ana-vigil-sightline.svg',
  anran: '/review/hero-marks/anran-silk-ember.svg',
  ashe: '/review/hero-marks/ashe-velvet-deadeye.svg',
  baptiste: '/review/hero-marks/baptiste-second-chance-field.svg',
  bastion: '/review/hero-marks/bastion-nature-reconfigure.svg',
  brigitte: '/review/hero-marks/brigitte-rally-standard.svg',
  cassidy: '/review/hero-marks/cassidy-noon-cut.svg',
  dmon: '/review/hero-marks/dmon-intercept-aegis.svg',
  domina: '/review/hero-marks/domina-sovereign-panopticon.svg',
  doomfist: '/review/hero-marks/doomfist-evolution-impact.svg',
  dva: '/review/hero-marks/dva-mecha-orbit.svg',
  echo: '/review/hero-marks/echo-adaptive-reprise.svg',
  emre: '/review/hero-marks/emre-broken-override.svg',
  freja: '/review/hero-marks/freja-northwind-lock.svg',
  genji: '/review/hero-marks/genji-chroma-blade.svg',
  hanzo: '/review/hero-marks/hanzo-penitent-bow.svg',
  hazard: '/review/hero-marks/hazard-vanadium-fracture.svg',
  illari: '/review/hero-marks/illari-fractured-inti.svg',
  jetpack_cat: '/review/hero-marks/jetpack-cat-fika-landing.svg',
  junker_queen: '/review/hero-marks/junker-queen-arena-crown.svg',
  junkrat: '/review/hero-marks/junkrat-secret-detonation.svg',
  juno: '/review/hero-marks/juno-mars-lifeline.svg',
  kiriko: '/review/hero-marks/kiriko-fold.svg',
  lifeweaver: '/review/hero-marks/lifeweaver-bloom-lattice.svg',
  lucio: '/review/hero-marks/lucio-rio-resonance.svg',
  mauga: '/review/hero-marks/mauga-twin-heart-crossfire.svg',
  mei: '/review/hero-marks/mei-cryo-thaw.svg',
  mercy: '/review/hero-marks/mercy-ascension.svg',
  mizuki: '/review/hero-marks/mizuki-fate-unbound.svg',
  moira: '/review/hero-marks/moira-biotic-schism.svg',
  orisa: '/review/hero-marks/orisa-guardian-horizon.svg',
  pharah: '/review/hero-marks/pharah-legacy-launch.svg',
  ramattra: '/review/hero-marks/ramattra-vow-fracture.svg',
  reaper: '/review/hero-marks/reaper-blackwatch-dissolve.svg',
  reinhardt: '/review/hero-marks/reinhardt-crusader-vow.svg',
  roadhog: '/review/hero-marks/roadhog-chain-undertow.svg',
  sigma: '/review/hero-marks/sigma-gravity-score.svg',
  shion: '/review/hero-marks/shion-redaction-ascent.svg',
  sierra: '/review/hero-marks/sierra-summit-pursuit.svg',
  sojourn: '/review/hero-marks/sojourn-rail-map.svg',
  soldier_76: '/review/hero-marks/soldier-76-classified-vigil.svg',
  sombra: '/review/hero-marks/sombra-conspiracy-negative.svg',
  symmetra: '/review/hero-marks/symmetra-hard-light-lattice.svg',
  torbjorn: '/review/hero-marks/torbjorn-forge-blueprint.svg',
  tracer: '/review/hero-marks/tracer-jump-cut.svg',
  vendetta: '/review/hero-marks/vendetta-duel-final-cut.svg',
  venture: '/review/hero-marks/venture-buried-wayfinder.svg',
  widowmaker: '/review/hero-marks/widowmaker-lock.svg',
  winston: '/review/hero-marks/winston-lunar-recall.svg',
  wrecking_ball: '/review/hero-marks/wrecking-ball-arena-escape.svg',
  wuyang: '/review/hero-marks/wuyang-return-current.svg',
  zarya: '/review/hero-marks/zarya-particle-vault.svg',
  zenyatta: '/review/hero-marks/zenyatta-open-iris.svg'
})
// Compatibility export for the existing review audit and external callers.
export const DIRECTOR_CUT_HERO_MARKS = DIRECTOR_CUT_HERO_EMBLEMS
const POSTER_FONT_TIMEOUT_MS = 1800
const POSTER_FONT_LOADS = [
  '900 32px "HarmonyOS Sans SC"',
  '800 32px "HarmonyOS Sans SC"',
  '900 32px "HarmonyOS Sans"',
  '800 32px "HarmonyOS Sans"',
  '900 32px "Noto Sans SC"',
  '800 32px "Noto Sans SC"',
  '900 32px "PingFang SC"',
  '800 32px "PingFang SC"',
  '900 32px "Microsoft YaHei"',
  '800 32px "Microsoft YaHei"',
  '900 24px "HarmonyOS Sans SC"',
  '900 24px "HarmonyOS Sans"'
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

function getHeroRenderSrc(heroName) {
  const name = safeText(heroName)
  if (!name) return ''

  const slug = heroNameToSlug(name).replace(/_/g, '-')
  if (!slug || slug === 'unknown') return ''

  return `/review/hero-renders/${normalizeHeroFolder('', name)}/${slug}.png`
}

function getHeroRenderFromPortrait(src) {
  const match = String(src || '').match(/\/heroes\/([^/]+)\/([^/?#]+?)\.(?:avif|webp|png|jpe?g)(?:[?#].*)?$/i)
  if (!match) return ''

  const [, role, slug] = match
  return `/review/hero-renders/${role.toLowerCase()}/${slug.toLowerCase().replace(/_/g, '-')}.png`
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
  if (/RUNNER.?UP|준우승/i.test(text)) return 'runner_up'
  if (/CHAMPION|우승/i.test(text)) return 'champion'
  if (/THIRDPLACE|(?:^|\D)3위/i.test(text)) return 'third'
  if (/FOURTHPLACE|(?:^|\D)4위/i.test(text)) return 'fourth'
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

  const tier = getRankTierFromText(first.routeTo || first.route_to || reliableText)
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
    .replace(/，这是你的常规赛.*$/g, '')
    .replace(/, 这是你的常规赛.*$/g, '')
    .replace(/，这几张地图也属于你.*$/g, '')
    .replace(/, 这几张地图也属于你.*$/g, '')
    .replace(/，这一页也为你留下.*$/g, '')
    .replace(/, 这一页也为你留下.*$/g, '')
    .replace(/,\s*we kept a page for you too.*$/gi, '')
    .replace(/,\s*these few maps belong to you too.*$/gi, '')
    .replace(/,\s*this season belongs to you too.*$/gi, '')
    .replace(/,\s*이 페이지에도 당신의 자리를 남겼습니다.*$/g, '')
    .replace(/,\s*이 몇 개의 전장도 당신의 시즌입니다.*$/g, '')
    .replace(/,\s*이 시즌은 당신의 것이기도 합니다.*$/g, '')
    .replace(/\s*的赛季旅程.*$/g, '')
    .replace(/\s*的赛季回顾.*$/g, '')
    .replace(/\s*的学院赛纪念卡.*$/g, '')
    .replace(/\s*的学院赛纪念票.*$/g, '')
    .replace(/\s*的常规赛纪念卡.*$/g, '')
    .replace(/\s*的常规赛纪念票.*$/g, '')
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
  const prefix = safeText(payload.seasonId, 'FCA26').replace(/[^A-Z0-9]/gi, '').toUpperCase()
  return `${prefix}-${Math.abs(hash).toString(36).toUpperCase().slice(0, 6).padStart(6, '0')}`
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

  const full = source.match(/(20\d{2})[-/.年](\d{1,2})[-/.月](\d{1,2})/)
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
      body: `它不只是一个英雄名，也是这段${data.eventNoun || '学院赛'}行程里最清晰的影子。`
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
    body: `比赛会结束，赛程也会归档。但这张票记住的是你曾经站进这届${data.eventNoun || '学院赛'}，留下属于自己的路线。`
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
  if (text.includes('time') || text.includes('时间')) return 'PLAYTIME'
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
  if (text.includes('tank') || text.includes('坦克') || text.includes('重装')) return 1
  if (text.includes('dps') || text.includes('damage') || text.includes('输出')) return 2
  if (text.includes('support') || text.includes('sup') || text.includes('辅助') || text.includes('支援') || text.includes('奶')) return 3
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
  const explicitTeam = first.teamShortName || first.team_short_name || first.teamShort
  if (explicitTeam) return explicitTeam

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

function getTeamStaffCredits(first) {
  const roles = [
    {
      role: 'MANAGER',
      name: pickPosterValue(
        first?.managerCallsign,
        first?.manager_callsign,
        first?.managerDisplayName,
        first?.manager_display_name,
        first?.managerTag,
        first?.manager_tag
      )
    },
    {
      role: 'COACH',
      name: pickPosterValue(
        first?.coachCallsign,
        first?.coach_callsign,
        first?.coachDisplayName,
        first?.coach_display_name,
        first?.coachTag,
        first?.coach_tag
      )
    }
  ]
    .map(item => ({ ...item, name: stripTicketHash(item.name) }))
    .filter(item => item.name)

  const grouped = new Map()
  roles.forEach(item => {
    const key = item.name.toLocaleLowerCase('en-US')
    const current = grouped.get(key)
    if (current) {
      current.role = `${current.role} / ${item.role}`
      return
    }
    grouped.set(key, { ...item })
  })

  return Array.from(grouped.values())
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
      rows.push({ label: englishStatLabel(scene.sourceMetricLabel || scene.metricLabel || scene.eyebrow || 'STAT'), value: scene.metric })
    }

    safeArr(scene?.statLines).forEach(line => {
      if (line?.value !== undefined && line?.value !== null && String(line.value).trim() !== '') {
        rows.push({ label: englishStatLabel(line.sourceLabel || line.label), value: line.value })
      }
    })

    safeArr(scene?.dataBars).forEach(bar => {
      if (bar?.displayValue || bar?.value) {
        rows.push({ label: englishStatLabel(bar.sourceLabel || bar.label), value: bar.displayValue || bar.value })
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

// eslint-disable-next-line no-unused-vars
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
  const maps = getTicketStatValue(stats, ['MAPS', 'MAP', '地图']) || '-'

  return [
    { label: 'TEAMS', value: teams },
    { label: 'MATCHES', value: matches },
    { label: 'MAPS', value: maps },
    { label: 'CHAMPION', value: champion || '-' }
  ]
}

// eslint-disable-next-line no-unused-vars
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

// eslint-disable-next-line no-unused-vars
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
  const first = list[0] || {}
  const seasonId = first.seasonId || first.season_id || 'FCA26'
  const seasonCode = first.seasonCode || first.season_code || (seasonId === 'FCR26' ? 'FCR2026' : 'FCA2026')
  const eventTitle = first.eventTitle || first.event_title || '2026 薯条杯学院赛'
  const seriesPrefix = String(seasonId).replace(/\d+$/g, '') || 'FCA'
  const config = {
    ...getIdentityTicketConfig(cardKind),
    ...(cardKind === 'staff' ? { teamFallback: `${seriesPrefix} OPS` } : {}),
    ...(cardKind === 'caster' ? { teamFallback: `${seriesPrefix} CAST` } : {}),
    ...(cardKind === 'tournament' ? { teamFullFallback: eventTitle } : {})
  }
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
  const rawDest = first.routeTo || first.route_to || getRankLikeText(list) || ending.metric || firstChips[firstChips.length - 1] || 'ARCHIVE'
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
  const rosterNames = cardKind === 'team'
    ? collectRosterTicketCards(list, 12).map(stamp => stripTicketHash(stamp.title)).filter(Boolean)
    : []
  const staffCredits = cardKind === 'team' ? getTeamStaffCredits(first) : []
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
    eventTitle: cardKind === 'tournament' ? eventTitle : '',
    seasonId,
    seasonCode,
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
    firstMatchId: first.firstMatchId || '',
    firstMatchTime: first.firstMatchTime || first.first_match_time || '',
    lastMatchTime: first.lastMatchTime || first.last_match_time || '',
    finalMatchupLabel,
    recordText,
    stage: firstChips[1] || '',
    stamps,
    rosterNames,
    staffCredits,
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
  const companionScene = list.find(scene => String(scene.eyebrow || '').toUpperCase().includes('NAMES BESIDE YOU')) || {}
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
  const metricValue = key => metricLines.find(item => englishStatLabel(item.sourceLabel || item.label) === key)?.value
  const tagLines = safeArr(tagScene.statLines)
  const mapTitleParts = String(mapScene.title || '').split('\n')
  const topMap = mapTitleParts[mapTitleParts.length - 1] || safeArr(mapScene.chips)[0] || safeArr(metricScene.mapCards)[0]?.title || ''
  const firstMoment = safeArr(firstMomentScene.chips).filter(Boolean).join(' · ')
  const peakContext = safeArr(peakScene.chips).filter(Boolean).join(' · ')
  const topHero = heroes[0]?.title || cleanPosterSubject(String(heroScene.title || '').split('：').pop() || '')
  const coStars = safeArr(companionScene.rosterCards)
    .map(card => stripTicketHash(card?.title))
    .filter(Boolean)
    .slice(0, 3)

  const data = {
    playerName: cleanPosterSubject(first.title || ''),
    battleTag: first.subTitle || '',
    team: first.teamShortName || first.team_short_name || firstChips[0] || '',
    teamFullName: first.teamFullName || first.team_full_name || first.teamName || first.team_name || first.team?.name || firstChips[0] || '',
    role: firstChips[1] || '',
    rank: first.routeTo || first.route_to || firstChips[2] || ending.metric || '',
    teamLogo: ending.image || first.image || '',
    mapCount: metricScene.metric || metricValue('MAPS') || '',
    matchCount: metricValue('MATCHES') || '',
    minutes: metricValue('PLAYTIME') || '',
    topMap,
    topMapMeta: safeArr(mapScene.chips).filter(Boolean).join(' · '),
    topHero,
    heroRender: getHeroRenderSrc(topHero),
    peakValue: peakScene.metric || '',
    peakLabel: peakScene.metricLabel || '',
    peakTitle: peakScene.title || '',
    peakContext,
    firstMoment,
    firstMomentTitle: firstMomentScene.title || '',
    routeDateRange: getPlayerRouteDateRange(list),
    routeStartLabel: normalizePosterDate(first.routeStartDate || first.route_start_date) || '',
    routeEndLabel: normalizePosterDate(first.routeEndDate || first.route_end_date) || '',
    routeFrom: first.routeFrom || first.route_from || '2026 薯条杯学院赛',
    routeTo: first.routeTo || first.route_to || firstChips[2] || ending.metric || '赛季归档',
    firstMatchLabel: first.firstMatchLabel || first.first_match_label || '',
    lastMatchLabel: first.lastMatchLabel || first.last_match_label || '',
    firstMatchId: first.firstMatchId || '',
    firstMatchTime: first.firstMatchTime || first.first_match_time || '',
    lastMatchTime: first.lastMatchTime || first.last_match_time || '',
    competitionSize: Number(first.competitionSize || first.competition_size || 0),
    coverageLevel: first.coverageLevel || first.coverage_level || '',
    matchResults: safeArr(first.matchResultSequence || first.match_result_sequence),
    recordText: first.seasonRecordText || first.season_record_text || '',
    coStars,
    identityTitle: tagScene.title || roleScene.title || '',
    identityBody: tagScene.body || roleScene.body || '',
    roleStats: safeArr(roleScene.statLines).length ? safeArr(roleScene.statLines) : tagLines,
    heroes
  }

  data.eventNoun = first.eventNoun || first.event_noun || '学院赛'
  data.eventTitle = first.eventTitle || first.event_title || '2026 薯条杯学院赛'
  data.seasonId = first.seasonId || first.season_id || 'FCA26'
  data.seasonCode = first.seasonCode || first.season_code || 'FCA2026'

  return {
    ...data,
    memory: buildPlayerTicketMemory(data)
  }
}

export function getPosterPayload(scenes) {
  const list = (Array.isArray(scenes) ? scenes : []).filter(scene => !scene?.excludeFromPoster)
    .map(scene => {
      if (!scene?.[REVIEW_SOURCE_SCENE]) return scene
      const record = { ...scene, ...scene[REVIEW_SOURCE_SCENE] }
      // A viewer may add their name after localization, and the page supplies
      // the explicit identity type independently from translated headings.
      for (const key of ['cardKind', 'card_kind', 'posterCardKind', 'poster_card_kind', 'storyType', 'story_type', 'perspective', 'staffType', 'staff_type', 'viewerId', 'viewer_id', 'viewerBattleTag', 'viewer_battle_tag', 'viewerName', 'viewer_name', 'issuedTo', 'issued_to', 'callsign', 'callSign']) {
        if (scene[key] !== undefined) record[key] = scene[key]
      }
      return record
    })
  const first = list[0] || {}
  const ending = list[list.length - 1] || first
  const spotlight = list.find(scene => scene.kind === 'spotlight') || null
  const roleScene = list.find(scene => String(scene.eyebrow || '').toUpperCase().includes('ROLE')) || null
  const cardKind = inferCardKind(first, list)
  const cardType = first.isPartner ? inferCardType(first, list).replace('OFFICIAL', 'PARTNER') : inferCardType(first, list)
  const metric = pickMetricScene(list, cardKind)
  const subject = cleanPosterSubject(first.title || '')
  const playerTicket = cardKind === 'player' ? getPlayerTicketData(list) : null
  const identityTicket = cardKind !== 'player' && isRouteTicketKind(cardKind) ? getIdentityTicketData(list, cardKind) : null
  const posterImage = pickPosterImage(list, cardKind)

  const payload = {
    isPartner: Boolean(first.isPartner),
    usesRegularTemplate: Boolean(first.usesRegularTemplate),
    seasonId: first.seasonId || first.season_id || 'FCA26',
    seasonCode: first.seasonCode || first.season_code || 'FCA2026',
    seasonMark: first.seasonMark || first.season_mark || 'FCA 2026',
    eventTitle: first.eventTitle || first.event_title || '2026 薯条杯学院赛',
    eventLogo: first.eventLogo || first.event_logo || DEFAULT_EVENT_LOGO,
    eventNoun: first.eventNoun || first.event_noun || '学院赛',
    tone: ending.tone || first.tone || 'gold',
    cardKind,
    cardType,
    achievement: inferAchievement(list, cardKind),
    eyebrow: first.eyebrow || '2026 FRIES CUP',
    title: cardKind === 'player'
      ? `${subject || '我的'} 的${first.eventNoun || first.event_noun || '学院赛'}纪念票`
      : first.title || '我的薯条杯赛季回顾',
    subtitle: first.subTitle || first.chips?.filter(Boolean).join(' · ') || '',
    image: posterImage,
    metricValue: metric?.metric || '',
    metricLabel: metric?.metricLabel || '',
    signatureTitle: cardKind === 'player'
      ? `你在这届${first.eventNoun || first.event_noun || '学院赛'}留下了自己的参赛轨迹`
      : spotlight?.title || roleScene?.title || metric?.title || '',
    mainText: cardKind === 'player'
      ? `比赛会结束，赛程也会归档。但这张纪念票会记住：${subject || '你'} 曾经站进这届${first.eventNoun || first.event_noun || '学院赛'}，在地图、队友、对手和结果之间，留下属于自己的参赛痕迹。`
      : pickMainText(list),
    chips: ending.chips?.length ? ending.chips : first.chips || [],
    playerTicket,
    identityTicket,
    recordedStages: safeArr(first.recordedStages),
    heroRender: playerTicket?.heroRender || (cardKind === 'player' ? getHeroRenderFromPortrait(posterImage) : ''),
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

// eslint-disable-next-line no-unused-vars
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

function drawMemorySeal(ctx, x, y, radius, accent) {
  ctx.save()
  ctx.translate(x, y)
  ctx.fillStyle = hexToRgba(accent, 0.025)
  ctx.beginPath()
  ctx.arc(0, 0, radius, 0, Math.PI * 2)
  ctx.fill()

  ctx.globalAlpha = 0.24
  ctx.strokeStyle = accent
  ctx.lineWidth = 2.5
  ctx.beginPath()
  ctx.arc(0, 0, radius, 0, Math.PI * 2)
  ctx.stroke()

  ctx.globalAlpha = 0.14
  ctx.lineWidth = 1.25
  ctx.beginPath()
  ctx.arc(0, 0, radius - 14, 0, Math.PI * 2)
  ctx.stroke()

  ctx.globalAlpha = 0.2
  ctx.lineWidth = 2
  for (let index = 0; index < 12; index += 1) {
    const angle = (Math.PI * 2 * index) / 12
    const inner = radius - (index % 3 === 0 ? 10 : 6)
    ctx.beginPath()
    ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner)
    ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius)
    ctx.stroke()
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

// eslint-disable-next-line no-unused-vars
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

// Boarding passes and the regular film poster use word-aware copy fitting.
// Keep the Director's Cut text renderer unchanged.
function wrapKeepsakeText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 3) {
  const lines = []
  String(text || '').replace(/\r\n/g, '\n').split('\n').forEach(paragraph => {
    const tokens = paragraph.match(/[\p{Script=Latin}\p{N}]+(?:['’.-][\p{Script=Latin}\p{N}]+)*|[^\S\n]+|[^\s]/gu) || []
    let line = ''
    const append = token => {
      if (!line && !token.trim()) return
      if (line && ctx.measureText(line + token).width > maxWidth) {
        lines.push(line.trimEnd())
        line = token.trimStart()
      } else {
        line += token
      }
    }
    tokens.forEach(token => {
      if (ctx.measureText(token).width > maxWidth) [...token].forEach(append)
      else append(token)
    })
    if (line.trim()) lines.push(line.trimEnd())
  })
  const visible = lines.slice(0, maxLines)
  if (lines.length > maxLines && visible.length) {
    let last = visible[visible.length - 1]
    while (last && ctx.measureText(`${last}…`).width > maxWidth) last = last.slice(0, -1).trimEnd()
    visible[visible.length - 1] = `${last}…`
  }
  visible.forEach((line, index) => ctx.fillText(line, x, y + index * lineHeight))
}

function drawBoardingText(ctx, text, x, y, options = {}) {
  const { size = 24, minSize = 14, weight = 700, maxWidth = 600, family = FONT_SC, ...rest } = options
  let value = String(text || '')
  let fontSize = size
  ctx.save()
  ctx.font = `${weight} ${fontSize}px ${family}`
  while (fontSize > minSize && ctx.measureText(value).width > maxWidth) {
    fontSize -= 1
    ctx.font = `${weight} ${fontSize}px ${family}`
  }
  if (ctx.measureText(value).width > maxWidth) {
    const characters = [...value]
    while (characters.length && ctx.measureText(`${characters.join('')}…`).width > maxWidth) characters.pop()
    value = `${characters.join('')}…`
  }
  drawText(ctx, value, x, y, { font: ctx.font, ...rest })
  ctx.restore()
}

function getBoardingCopy(locale) {
  if (locale === 'zh-TW') return localizeTraditionalReview(getBoardingCopy('zh-CN'))
  if (locale === 'ko-KR') return {
    passTitle: '시즌 기념 탑승권',
    passenger: '탑승객',
    firstRecord: '첫 출전 기록',
    lastRecord: '마지막 출전 기록',
    archived: '시즌 기록 보관',
    finalRoster: '최종 명단',
    teamSeason: '팀 시즌 기간',
    rosterJourney: '명단 등재 기록 · 출전 기록 아님',
    roster: '이 시즌에도 당신의 이름이 있습니다',
    rosterBody: '최종 명단에 남은 이름도 이 팀의 시즌을 이룹니다.\n이 한 장은 당신을 위해 남깁니다.',
    rosterStatus: '최종 명단에 등록',
    rosterDetail: '공개된 출전 기록 없음',
    teamResult: '팀 최종 성적',
    note: '함께 기록된 이름들',
    companions: '같은 경기 기록에 남은 이름들입니다.',
    archiveNote: '당신의 시즌을 여기에 남깁니다.',
    scanReview: '시즌 다시 보기'
  }
  if (locale === 'en-US') return {
    passTitle: 'YOUR SEASON, KEPT IN ONE TICKET',
    passenger: 'PLAYER',
    firstRecord: 'FIRST RECORDED MATCH',
    lastRecord: 'LAST RECORDED MATCH',
    archived: 'Season archive',
    finalRoster: 'FINAL ROSTER',
    teamSeason: 'TEAM SEASON',
    rosterJourney: 'ROSTER ENTRY · NO RECORDED APPEARANCES',
    roster: 'Your name belongs to this season',
    rosterBody: 'Every name on the final roster is part of the team’s season.\nThis copy is yours.',
    rosterStatus: 'CONFIRMED ON THE FINAL ROSTER',
    rosterDetail: 'No recorded map appearances',
    teamResult: 'TEAM FINAL RESULT',
    note: 'The names alongside yours',
    companions: 'Together in your match records.',
    archiveNote: 'A place to keep your season.',
    scanReview: 'YOUR SEASON REVIEW'
  }
  return {
    passTitle: '赛季纪念登机牌',
    passenger: '乘机人',
    firstRecord: '首次出场记录',
    lastRecord: '最后出场记录',
    archived: '赛季档案',
    finalRoster: '最终名单',
    teamSeason: '队伍赛季',
    rosterJourney: '名单已收录 · 不代表实际出场',
    roster: '这个赛季，也有你的名字',
    rosterBody: '名单中的每个名字，都属于这支队伍的赛季。\n这一张，留给你。',
    rosterStatus: '最终名单 · 阵容留名',
    rosterDetail: '暂无公开地图出场记录',
    teamResult: '队伍最终成绩',
    note: '这一程，与你并肩',
    companions: '这些名字，也与你一同留在了这份赛季记录里。',
    archiveNote: '这里，留着你的赛季。',
    scanReview: '扫码重温赛季'
  }
}

function drawBoardingRosterEntry(ctx, data, images, accent, copy, x, y, w, h, markSize = 168) {
  const center = x + w / 2
  drawBoardingText(ctx, 'TEAM CREST / ROSTER ARCHIVE', center, y + 24, {
    size: 15, maxWidth: w, align: 'center', fill: 'rgba(255,255,255,0.64)'
  })
  const mark = images.teamLogo || images.fcaLogo
  if (mark) drawImageInside(ctx, mark, center - markSize / 2, y + 48, markSize, markSize, { contain: true, radius: 4 })
  else drawBoardingText(ctx, data.team, center, y + 170, { size: 72, maxWidth: w - 30, align: 'center' })
  drawBoardingText(ctx, copy.rosterStatus, center, y + h - 4, {
    size: 18, maxWidth: w, align: 'center', fill: accent
  })
}



function drawPlayerTicketPoster(ctx, payload, images, accent) {
  const width = ctx.canvas.width
  const height = ctx.canvas.height
  const isWideBoarding = payload.usesRegularTemplate || payload.seasonId === 'FCR26'
  const ticketWidth = isWideBoarding ? 2080 : 1680
  const ticketHeight = isWideBoarding ? 800 : 900
  const ticket = document.createElement('canvas')
  const tctx = getPosterLocaleContext(ticket, payload)

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

  if (isWideBoarding && images.boardingQr) {
    const { x, y, size } = BOARDING_QR_SLOT
    drawBoardingQr(ctx, images.boardingQr, drawX + x * scale, drawY + y * scale, size * scale)
  }
}

function drawBoardingAircraft(ctx, x, y, scale, fill) {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(scale, scale)
  ctx.fillStyle = fill
  ctx.beginPath()
  ctx.moveTo(38, 0)
  ctx.quadraticCurveTo(29, -6, 10, -6)
  ctx.lineTo(-13, -29)
  ctx.lineTo(-23, -29)
  ctx.lineTo(-12, -5)
  ctx.lineTo(-31, -4)
  ctx.lineTo(-40, -14)
  ctx.lineTo(-47, -14)
  ctx.lineTo(-41, 0)
  ctx.lineTo(-47, 14)
  ctx.lineTo(-40, 14)
  ctx.lineTo(-31, 4)
  ctx.lineTo(-12, 5)
  ctx.lineTo(-23, 29)
  ctx.lineTo(-13, 29)
  ctx.lineTo(10, 6)
  ctx.quadraticCurveTo(29, 6, 38, 0)
  ctx.fill()
  ctx.restore()
}

function drawBoardingFlightRoute(ctx, data, accent, copy, rosterOnly, x, y, w, compact = false) {
  const routeText = compact ? drawBoardingPrintText : drawBoardingText
  const dateFamily = compact ? rosterOnly ? BOARDING_SANS_FONT : BOARDING_MONO_FONT : FONT_SC
  const start = data.routeStartLabel || getDateRangeStart(data.routeDateRange)
  const end = data.routeEndLabel || getDateRangeEnd(data.routeDateRange)
  const from = rosterOnly ? 'ROSTER' : compactRouteDate(start) || 'START'
  const to = rosterOnly ? 'ARCHIVE' : compactRouteDate(end) || 'END'
  const middle = x + w / 2
  const valueWidth = Math.min(compact ? 294 : 250, w * 0.36)
  const dateY = y + (compact ? 80 : 88)
  const lineY = y + (compact ? 49 : 56)

  routeText(ctx, 'FROM', x, y, { size: compact ? 16 : 18, fill: accent, maxWidth: valueWidth })
  routeText(ctx, 'TO', x + w, y, { size: compact ? 16 : 18, fill: accent, align: 'right', maxWidth: valueWidth })
  routeText(ctx, from, x - 3, dateY, {
    size: rosterOnly ? 66 : compact ? 86 : 88, minSize: 36, weight: compact ? 600 : 900, family: dateFamily, fill: '#ffffff', maxWidth: valueWidth
  })
  routeText(ctx, to, x + w, dateY, {
    size: rosterOnly ? 66 : compact ? 86 : 88, minSize: 36, weight: compact ? 600 : 900, family: dateFamily, fill: '#ffffff', align: 'right', maxWidth: valueWidth
  })

  ctx.save()
  ctx.strokeStyle = hexToRgba(accent, 0.56)
  ctx.lineWidth = 2
  ctx.setLineDash([5, 7])
  ctx.beginPath()
  ctx.moveTo(middle - 66, lineY)
  ctx.lineTo(middle + 66, lineY)
  ctx.stroke()
  ctx.setLineDash([])
  ctx.fillStyle = PANEL_BG
  ctx.fillRect(middle - 42, lineY - 38, 88, 70)
  drawBoardingAircraft(ctx, middle + 4, lineY, 0.85, accent)
  ctx.restore()

  routeText(ctx, safeText(data.seasonId, 'FCR26'), middle, y - 1, {
    size: compact ? 17 : 18, family: compact ? BOARDING_MONO_FONT : FONT_SC, fill: 'rgba(255,255,255,0.76)', align: 'center', maxWidth: 142
  })
  routeText(ctx, rosterOnly ? copy.finalRoster : copy.firstRecord, x, y + (compact ? 119 : 124), {
    size: 21, minSize: 16, fill: 'rgba(255,255,255,0.72)', maxWidth: valueWidth + 28
  })
  routeText(ctx, rosterOnly ? copy.archived : copy.lastRecord, x + w, y + (compact ? 119 : 124), {
    size: 21, minSize: 16, fill: 'rgba(255,255,255,0.72)', align: 'right', maxWidth: valueWidth + 28
  })
  routeText(ctx, rosterOnly ? copy.rosterJourney : `RECORDED JOURNEY / ${safeText(data.routeDateRange, '2026 SEASON')}`, x, y + (compact ? 159 : 168), {
    size: compact ? 15 : 17, minSize: 14, weight: compact ? 400 : 600, family: compact && !rosterOnly ? BOARDING_MONO_FONT : FONT_SC, fill: compact ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.56)', maxWidth: w
  })
}

function drawBoardingField(ctx, label, value, x, y, maxWidth, options = {}) {
  drawBoardingText(ctx, label, x, y, {
    size: 16, minSize: 14, weight: 700, fill: 'rgba(255,255,255,0.6)', maxWidth
  })
  drawBoardingText(ctx, value, x, y + 47, {
    size: 35, minSize: 19, weight: 800, fill: '#ffffff', maxWidth, ...options
  })
}

function drawBoardingPrintText(ctx, text, x, y, options = {}) {
  drawBoardingText(ctx, text, x, y, { family: BOARDING_SANS_FONT, weight: 500, ...options })
}

function drawBoardingPrintField(ctx, label, value, x, y, maxWidth, options = {}) {
  drawBoardingPrintText(ctx, label, x, y, {
    size: 15, minSize: 13, weight: 400, fill: 'rgba(255,255,255,0.65)', maxWidth
  })
  drawBoardingPrintText(ctx, value, x, y + 47, {
    size: 35, minSize: 19, weight: 500, maxWidth, ...options
  })
}

function drawBoardingPrintSeal(ctx, x, y, radius, accent) {
  ctx.save()
  ctx.strokeStyle = hexToRgba(accent, 0.22)
  ctx.lineWidth = 1.2
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()
}

function drawBoardingColumnContent(ctx, payload, images, accent) {
  const data = payload.playerTicket || {}
  const copy = getBoardingCopy(payload.locale)
  const rosterOnly = data.coverageLevel === 'roster' || parsePosterNumber(data.mapCount) <= 0
  const companions = safeArr(data.coStars).filter(Boolean).slice(0, 3)
  const heroList = safeArr(data.heroes).slice(0, 3)
  const issuedTo = safeText(data.battleTag, data.playerName)
  const callsign = safeText(data.playerName, issuedTo.replace(/#\d+$/g, ''))
  const flight = safeText(data.seasonId, payload.seasonId || 'FCR26')
  const archiveId = safeText(payload.archiveId, flight)
  const left = 76
  const passengerWidth = 520
  const routeX = 680
  const stubX = ctx.canvas.width - 440
  const mainRight = stubX - 56
  const stubLeft = stubX + 36
  const stubWidth = ctx.canvas.width - 24 - stubX
  const stubCenter = stubX + stubWidth / 2
  const stubContentWidth = stubWidth - 72
  const labelFill = 'rgba(255,255,255,0.65)'
  const secondaryFill = 'rgba(255,255,255,0.72)'

  ctx.save()
  ctx.strokeStyle = 'rgba(255,255,255,0.13)'
  ctx.lineWidth = 1
  ;[
    [632, 151, 632, 674],
    [left, 442, left + passengerWidth, 442],
    [routeX, 362, mainRight, 362],
    [routeX, 470, mainRight, 470],
    [stubLeft, 282, stubLeft + stubContentWidth, 282],
    [left, 712, mainRight, 712]
  ].forEach(([x1, y1, x2, y2]) => {
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.stroke()
  })
  ctx.restore()

  // Passenger details and shared memories stay together in the left column.
  drawBoardingPrintText(ctx, `PASSENGER / ${copy.passenger}`, left, 161, {
    size: 16, weight: 400, fill: labelFill, maxWidth: passengerWidth
  })
  drawBoardingPrintText(ctx, callsign, left - 4, 244, {
    size: 88, minSize: 30, weight: 900, maxWidth: passengerWidth
  })
  drawBoardingPrintText(ctx, issuedTo, left, 281, {
    size: 22, minSize: 17, weight: 400, fill: secondaryFill, maxWidth: passengerWidth
  })
  drawBoardingPrintField(ctx, 'TEAM', safeText(data.teamFullName, data.team), left, 327, passengerWidth, {
    size: 31, minSize: 19, weight: 500
  })
  drawBoardingPrintText(ctx, `ROLE / ${safeText(data.role, '—')}`, left, 409, {
    size: 21, minSize: 17, weight: 500, fill: secondaryFill, maxWidth: passengerWidth
  })
  drawBoardingPrintText(ctx, rosterOnly ? 'ROSTER NOTE' : 'TRAVEL NOTE', left, 479, {
    size: 15, weight: 500, fill: accent, maxWidth: passengerWidth
  })
  const noteTitle = rosterOnly ? copy.roster : companions.length ? copy.note : copy.archiveNote
  drawBoardingPrintText(ctx, noteTitle, left, 516, {
    size: 27, minSize: 20, weight: 500, maxWidth: passengerWidth
  })
  if (!rosterOnly && companions.length) {
    companions.forEach((name, index) => drawBoardingPrintText(ctx, name, left, 554 + index * 33, {
      size: 25, minSize: 18, weight: 500, maxWidth: passengerWidth
    }))
    drawBoardingPrintText(ctx, copy.companions, left, 589 + (companions.length - 1) * 33, {
      size: 17, minSize: 14, weight: 400, fill: labelFill, maxWidth: passengerWidth
    })
  } else {
    const body = rosterOnly
      ? copy.rosterBody
      : safeText(data.memory?.body, payload.mainText).split(/(?<=[。！？.!?])\s*/u)[0]
    ctx.save()
    ctx.font = `500 22px ${BOARDING_SANS_FONT}`
    ctx.fillStyle = secondaryFill
    wrapKeepsakeText(ctx, body, left, 555, passengerWidth, 30, 4)
    ctx.restore()
  }

  // Route, appearances and map memories share the central travel record.
  drawBoardingFlightRoute(ctx, data, accent, copy, rosterOnly, routeX, 161, mainRight - routeX, true)
  if (rosterOnly) {
    drawBoardingPrintField(ctx, 'RECORD BASIS', copy.finalRoster, routeX, 396, 380, { size: 29, fill: accent })
    drawBoardingPrintField(ctx, copy.teamSeason, safeText(data.routeDateRange, data.seasonCode), 1110, 396, mainRight - 1110, {
      size: 25, minSize: 18, weight: 500, family: BOARDING_MONO_FONT
    })
    drawBoardingPrintText(ctx, 'TEAM CREST / ROSTER ARCHIVE', routeX, 498, {
      size: 15, weight: 400, fill: labelFill, maxWidth: mainRight - routeX
    })
    const mark = images.teamLogo || images.fcaLogo
    if (mark) drawImageInside(ctx, mark, routeX, 526, 132, 132, { contain: true, radius: 4 })
    else drawBoardingPrintText(ctx, data.team, routeX + 66, 612, {
      size: 50, minSize: 25, align: 'center', maxWidth: 132
    })
    drawBoardingPrintText(ctx, copy.rosterStatus, 852, 569, {
      size: 28, minSize: 19, fill: accent, maxWidth: mainRight - 852
    })
    drawBoardingPrintText(ctx, copy.rosterDetail, 852, 613, {
      size: 21, minSize: 17, weight: 600, fill: secondaryFill, maxWidth: mainRight - 852
    })
  } else {
    const stats = [
      ['MAPS', data.mapCount || payload.metricValue, accent],
      ['MATCHES', data.matchCount, '#ffffff'],
      ['MINUTES', data.minutes, '#ffffff']
    ]
    const columnWidth = (mainRight - routeX) / stats.length
    stats.forEach(([label, value, fill], index) => drawBoardingPrintField(ctx, label, value, routeX + index * columnWidth, 396, columnWidth - 36, {
      size: 40, minSize: 24, weight: 500, family: BOARDING_MONO_FONT, fill
    }))
    drawBoardingPrintField(ctx, 'FIRST MAP', getRouteStopValue(data.firstMoment), routeX, 497, 360, { size: 29, weight: 500 })
    drawBoardingPrintField(ctx, 'MOST PLAYED MAP', getRouteStopValue(data.topMap, '-'), routeX, 584, 360, { size: 29, weight: 500 })

    if (heroList.length) {
      const heroWidth = 132
      const heroHeight = 156
      const heroStep = 148
      const stampsX = mainRight - heroWidth - heroStep * 2
      drawBoardingPrintText(ctx, 'HERO STAMPS', stampsX, 497, {
        size: 15, weight: 400, fill: labelFill, maxWidth: mainRight - stampsX
      })
      heroList.forEach((hero, index) => {
        const x = stampsX + index * heroStep
        const y = 518
        ctx.save()
        ctx.fillStyle = 'rgba(255,255,255,0.025)'
        ctx.strokeStyle = hexToRgba(accent, index === 0 ? 0.48 : 0.26)
        ctx.lineWidth = 1
        drawCutCornerRect(ctx, x, y, heroWidth, heroHeight, 8)
        ctx.fill()
        ctx.stroke()
        drawImagePlain(ctx, images.heroImages?.[index], x + 8, y + 8, heroWidth - 16, 108, { contain: true })
        drawBoardingPrintText(ctx, safeText(hero.title, ''), x + heroWidth / 2, y + 143, {
          size: 20, minSize: 12, align: 'center', maxWidth: heroWidth - 16
        })
        ctx.restore()
      })
    }
  }

  // The detachable copy keeps its own identity, route and archive reference.
  drawBoardingPrintText(ctx, 'PASSENGER', stubLeft, 161, { size: 15, weight: 400, fill: labelFill, maxWidth: stubContentWidth })
  drawBoardingPrintText(ctx, callsign, stubLeft, 213, { size: 42, minSize: 22, weight: 700, maxWidth: stubContentWidth })
  drawBoardingPrintText(ctx, issuedTo, stubLeft, 248, { size: 18, minSize: 13, weight: 400, fill: secondaryFill, maxWidth: stubContentWidth })
  drawBoardingPrintField(ctx, 'TEAM', data.team, stubLeft, 314, 154, { size: 29, family: /^[\x20-\x7e]+$/.test(data.team || '') ? BOARDING_MONO_FONT : BOARDING_SANS_FONT })
  drawBoardingPrintField(ctx, 'ROLE', data.role, stubLeft + 186, 314, stubContentWidth - 186, { size: 29 })
  const period = rosterOnly
    ? copy.finalRoster
    : `${compactRouteDate(data.routeStartLabel || getDateRangeStart(data.routeDateRange))} → ${compactRouteDate(data.routeEndLabel || getDateRangeEnd(data.routeDateRange))}`
  drawBoardingPrintText(ctx, period, stubCenter, 401, {
    size: 23, minSize: 17, family: rosterOnly ? BOARDING_SANS_FONT : BOARDING_MONO_FONT, align: 'center', fill: secondaryFill, maxWidth: stubContentWidth
  })
  const hasQr = Boolean(images.boardingQr)
  if (hasQr) {
    const { x: qrX, y: qrY, size: qrSize } = BOARDING_QR_SLOT
    const scanX = qrX + qrSize + 26
    const scanWidth = stubLeft + stubContentWidth - scanX

    // Printed rows share the stub's margins; no ornament enters the QR quiet zone.
    ctx.save()
    ctx.strokeStyle = 'rgba(255,255,255,0.12)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(stubLeft, 434)
    ctx.lineTo(stubLeft + stubContentWidth, 434)
    ctx.moveTo(stubLeft, 712)
    ctx.lineTo(stubLeft + stubContentWidth, 712)
    ctx.stroke()
    ctx.strokeStyle = hexToRgba(accent, 0.48)
    ctx.beginPath()
    ctx.moveTo(scanX, qrY + 104)
    ctx.lineTo(scanX + 28, qrY + 104)
    ctx.stroke()
    ctx.restore()

    drawBoardingPrintText(ctx, copy.teamResult, stubLeft, 469, {
      size: 15, minSize: 12, weight: 400, fill: secondaryFill, maxWidth: 174
    })
    drawBoardingPrintText(ctx, 'SEASON ARCHIVED', stubLeft, 491, {
      size: 11, minSize: 10, family: BOARDING_MONO_FONT, fill: labelFill, maxWidth: 174
    })
    drawBoardingPrintText(ctx, safeText(data.rank || payload.achievement, 'SEASON'), stubLeft + stubContentWidth, 485, {
      size: 34, minSize: 18, weight: 700, align: 'right', fill: accent, maxWidth: 154
    })

    drawBoardingPrintText(ctx, 'SCAN TO REVISIT', scanX, qrY + 34, {
      size: 12, minSize: 11, family: BOARDING_MONO_FONT, fill: hexToRgba(accent, 0.85), maxWidth: scanWidth
    })
    // Let longer translations wrap at a readable size beside the code.
    ctx.save()
    ctx.font = `500 20px ${BOARDING_SANS_FONT}`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'
    ctx.fillStyle = '#e7dfc8'
    wrapKeepsakeText(ctx, copy.scanReview, scanX, qrY + 64, scanWidth, 24, 2)
    ctx.restore()
    drawBoardingPrintText(ctx, 'KEEP FOR YOUR RECORDS', scanX, qrY + 154, {
      size: 11, minSize: 10, weight: 400, family: BOARDING_MONO_FONT, fill: labelFill, maxWidth: scanWidth
    })
    drawBoardingPrintText(ctx, 'TICKET ID', stubLeft, 752, {
      size: 13, minSize: 12, family: BOARDING_MONO_FONT, fill: labelFill, maxWidth: 94
    })
    drawBoardingPrintText(ctx, archiveId, stubLeft + stubContentWidth, 752, {
      size: 18, minSize: 16, family: BOARDING_MONO_FONT, align: 'right', fill: accent, maxWidth: stubContentWidth - 112
    })
  } else {
    drawBoardingPrintSeal(ctx, stubCenter, 512, 82, accent)
    drawBoardingPrintText(ctx, copy.teamResult, stubCenter, 483, {
      size: 14, minSize: 11, weight: 400, align: 'center', fill: secondaryFill, maxWidth: 136
    })
    drawBoardingPrintText(ctx, safeText(data.rank || payload.achievement, 'SEASON'), stubCenter, 524, {
      size: 32, minSize: 18, weight: 700, align: 'center', fill: accent, maxWidth: 132
    })
    drawBoardingPrintText(ctx, 'SEASON ARCHIVED', stubCenter, 550, {
      size: 11, minSize: 10, weight: 400, align: 'center', fill: hexToRgba(accent, 0.76), maxWidth: 136
    })
    drawBoardingPrintText(ctx, copy.archiveNote, stubCenter, 665, {
      size: 18, align: 'center', fill: secondaryFill, maxWidth: stubContentWidth
    })
    drawBoardingPrintText(ctx, archiveId, stubCenter, 721, {
      size: 18, minSize: 16, family: BOARDING_MONO_FONT, align: 'center', fill: accent, maxWidth: stubContentWidth
    })
    drawBoardingPrintText(ctx, 'KEEP THIS BOARDING PASS', stubCenter, 752, {
      size: 13, weight: 400, align: 'center', fill: labelFill, maxWidth: stubContentWidth
    })
  }

  const peakValue = String(data.peakValue ?? '').trim()
  const peakNumber = Number(peakValue.replace(/,/g, ''))
  const formattedPeakValue = Number.isFinite(peakNumber)
    ? peakNumber.toLocaleString('en-US', { maximumFractionDigits: 1 })
    : peakValue
  const peakNote = peakValue && peakValue !== '-' && peakValue !== '—'
    ? `${safeText(data.peakLabel, 'PEAK')} · ${formattedPeakValue} / `
    : ''
  const footer = rosterOnly ? copy.rosterDetail : `${peakNote}PUBLIC MATCH ARCHIVE`
  drawBoardingPrintText(ctx, footer, left, 752, { size: 17, minSize: 14, weight: 400, fill: labelFill, maxWidth: 1080 })
  drawBoardingPrintText(ctx, archiveId, mainRight, 752, { size: 18, family: BOARDING_MONO_FONT, fill: accent, align: 'right', maxWidth: 330 })
}

function drawLandscapePlayerTicket(ctx, width, height, payload, images, accent) {
  const data = payload.playerTicket || {}
  const heroList = safeArr(data.heroes).slice(0, 3)
  const rosterOnly = data.coverageLevel === 'roster' || parsePosterNumber(data.mapCount) <= 0
  const copy = getBoardingCopy(payload.locale)
  const companions = safeArr(data.coStars).filter(Boolean).slice(0, 3)
  const ticketX = 24
  const ticketY = 24
  const ticketW = width - 48
  const ticketH = height - 48
  const compact = width > 1900
  const stubX = compact ? 1640 : 1360
  const stubW = width - ticketX - stubX
  const stubCenter = stubX + stubW / 2
  const mainX = 76
  const mainRight = stubX - 56
  const issuedTo = safeText(data.battleTag, data.playerName)
  const callsign = safeText(data.playerName, issuedTo.replace(/#\d+$/g, ''))
  const flight = safeText(data.seasonId, payload.seasonId || 'FCR26')
  const archiveId = safeText(payload.archiveId, flight)
  const year = String(data.routeDateRange || data.seasonCode || '').match(/20\d{2}/)?.[0] || '2026'
  const headerHeight = compact ? 74 : 108
  const headerTitleY = compact ? 58 : 76
  const headerSubY = compact ? 83 : 108
  const passengerY = compact ? 155 : 181
  const passengerWidth = compact ? 530 : 445
  const routeX = compact ? 680 : 590
  const fieldsTop = compact ? 352 : 391
  const fieldsBottom = compact ? 452 : 509
  const fieldLabelY = fieldsTop + (compact ? 32 : 39)
  const lowerLabelY = fieldsBottom + (compact ? 38 : 46)
  const footerLineY = height - (compact ? 88 : 114)
  const footerY = footerLineY + 40
  const noteWidth = compact ? 916 : 716
  const heroWidth = compact ? 164 : 148
  const heroHeight = compact ? 188 : 178
  const heroStep = heroWidth + (compact ? 13 : 11)
  const heroX = mainRight - heroWidth - heroStep * 2

  ctx.clearRect(0, 0, width, height)
  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.6)'
  ctx.shadowBlur = 35
  ctx.fillStyle = PANEL_BG
  drawCutCornerRect(ctx, ticketX, ticketY, ticketW, ticketH, 24)
  ctx.fill()
  ctx.restore()

  ctx.save()
  drawCutCornerRect(ctx, ticketX, ticketY, ticketW, ticketH, 24)
  ctx.clip()
  ctx.fillStyle = 'rgba(255,255,255,0.017)'
  ctx.fillRect(stubX, ticketY, stubW, ticketH)
  ctx.fillStyle = accent
  ctx.fillRect(ticketX, ticketY, ticketW, headerHeight)
  ctx.fillStyle = 'rgba(0,0,0,0.075)'
  ctx.fillRect(stubX, ticketY, stubW, headerHeight)
  ctx.restore()

  ctx.save()
  ctx.strokeStyle = 'rgba(255,255,255,0.2)'
  ctx.lineWidth = 1.5
  drawCutCornerRect(ctx, ticketX, ticketY, ticketW, ticketH, 24)
  ctx.stroke()
  ctx.setLineDash([6, 10])
  ctx.strokeStyle = 'rgba(255,255,255,0.34)'
  ctx.beginPath()
  ctx.moveTo(stubX, ticketY + 20)
  ctx.lineTo(stubX, height - ticketY - 20)
  ctx.stroke()
  ctx.setLineDash([])
  ;[ticketY, height - ticketY].forEach(cy => {
    ctx.fillStyle = CARD_BG
    ctx.beginPath()
    ctx.arc(stubX, cy, 17, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.17)'
    ctx.stroke()
  })
  ctx.restore()

  const headerText = compact ? drawBoardingPrintText : drawBoardingText
  drawBoardingAircraft(ctx, 100, headerTitleY, compact ? 0.45 : 0.55, '#121209')
  headerText(ctx, 'FRIES CUP', 146, headerTitleY - 1, { size: compact ? 26 : 29, weight: compact ? 700 : 900, fill: '#121209', maxWidth: 380 })
  headerText(ctx, `${year} / SEASON ARCHIVE`, 146, headerSubY - 1, { size: compact ? 14 : 16, fill: '#393313', maxWidth: 420 })
  headerText(ctx, rosterOnly ? 'ROSTER BOARDING PASS' : 'BOARDING PASS', mainRight, headerTitleY, {
    size: compact ? 28 : 35, weight: compact ? 700 : 900, fill: '#121209', align: 'right', maxWidth: 690
  })
  headerText(ctx, copy.passTitle, mainRight, headerSubY, {
    size: compact ? 15 : 18, fill: '#393313', align: 'right', maxWidth: 690
  })
  headerText(ctx, 'PASSENGER COPY', stubCenter, headerTitleY - 6, {
    size: compact ? 13 : 15, weight: compact ? 500 : 800, fill: '#29240d', align: 'center', maxWidth: stubW - 48
  })
  headerText(ctx, flight, stubCenter, headerSubY - 2, {
    size: compact ? 26 : 28, weight: compact ? 600 : 900, family: compact ? BOARDING_MONO_FONT : FONT_SC, fill: '#121209', align: 'center', maxWidth: stubW - 48
  })

  if (compact) {
    drawBoardingColumnContent(ctx, payload, images, accent)
    return
  }

  drawBoardingText(ctx, `PASSENGER / ${copy.passenger}`, mainX, passengerY, {
    size: 18, fill: 'rgba(255,255,255,0.67)', maxWidth: 430
  })
  drawBoardingText(ctx, callsign, mainX - 4, passengerY + (compact ? 80 : 86), {
    size: 84, minSize: 30, weight: 900, fill: '#ffffff', maxWidth: passengerWidth
  })
  drawBoardingText(ctx, issuedTo, mainX, passengerY + (compact ? 119 : 126), {
    size: 23, minSize: 17, weight: 600, fill: 'rgba(255,255,255,0.67)', maxWidth: passengerWidth
  })
  drawBoardingText(ctx, safeText(data.teamFullName, data.team), mainX, passengerY + (compact ? 159 : 170), {
    size: 27, minSize: 18, fill: '#ffffff', maxWidth: passengerWidth
  })
  drawBoardingFlightRoute(ctx, data, accent, copy, rosterOnly, routeX, passengerY, mainRight - routeX, compact)

  ctx.save()
  ctx.strokeStyle = 'rgba(255,255,255,0.22)'
  ctx.lineWidth = 1.25
  ;[fieldsTop, fieldsBottom].forEach(y => {
    ctx.beginPath()
    ctx.moveTo(mainX, y)
    ctx.lineTo(mainRight, y)
    ctx.stroke()
  })
  const dividers = rosterOnly
    ? compact ? [367, 714, 1070] : [302, 560, 852]
    : compact ? [312, 557, 835, 1083, 1324] : [270, 467, 695, 903, 1096]
  dividers.forEach(x => {
    ctx.beginPath()
    ctx.moveTo(x, fieldsTop + (compact ? 20 : 25))
    ctx.lineTo(x, fieldsBottom - (compact ? 20 : 25))
    ctx.stroke()
  })
  ctx.restore()

  if (rosterOnly) {
    drawBoardingField(ctx, 'FLIGHT / SEASON', flight, mainX, fieldLabelY, compact ? 267 : 202)
    drawBoardingField(ctx, 'TEAM', data.team, compact ? 397 : 332, fieldLabelY, compact ? 293 : 204)
    drawBoardingField(ctx, 'ROLE', data.role, compact ? 744 : 590, fieldLabelY, compact ? 302 : 230)
    drawBoardingField(ctx, 'RECORD BASIS', copy.finalRoster, compact ? 1100 : 884, fieldLabelY, mainRight - (compact ? 1100 : 884), { fill: accent })
    drawBoardingField(ctx, copy.teamSeason, safeText(data.routeDateRange, year), mainX, lowerLabelY, compact ? 916 : 810, { size: 36 })
    drawBoardingText(ctx, copy.roster, mainX, compact ? 588 : 671, { size: 34, minSize: 23, fill: '#ffffff', maxWidth: compact ? 916 : 820 })
    ctx.save()
    ctx.font = `600 24px ${FONT_SC}`
    ctx.fillStyle = 'rgba(255,255,255,0.73)'
    wrapKeepsakeText(ctx, copy.rosterBody, mainX, compact ? 632 : 712, compact ? 916 : 820, 31, 2)
    ctx.restore()
    drawBoardingRosterEntry(ctx, data, images, accent, copy, compact ? 1128 : 932, compact ? 464 : 533, compact ? 456 : 372, compact ? 230 : 244, compact ? 140 : 168)
  } else {
    drawBoardingField(ctx, 'FLIGHT / SEASON', flight, mainX, fieldLabelY, compact ? 212 : 170)
    drawBoardingField(ctx, 'TEAM', data.team, compact ? 342 : 298, fieldLabelY, compact ? 191 : 145)
    drawBoardingField(ctx, 'ROLE', data.role, compact ? 587 : 497, fieldLabelY, compact ? 224 : 174)
    drawBoardingField(ctx, 'MAPS', data.mapCount || payload.metricValue, compact ? 865 : 725, fieldLabelY, compact ? 194 : 154, { fill: accent })
    drawBoardingField(ctx, 'MATCHES', data.matchCount, compact ? 1113 : 933, fieldLabelY, compact ? 187 : 139)
    drawBoardingField(ctx, 'MINUTES', data.minutes, compact ? 1354 : 1126, fieldLabelY, mainRight - (compact ? 1354 : 1126))
    drawBoardingField(ctx, 'FIRST MAP', getRouteStopValue(data.firstMoment), mainX, lowerLabelY, compact ? 350 : 306, { size: 29 })
    drawBoardingField(ctx, 'MOST PLAYED MAP', getRouteStopValue(data.topMap, '-'), compact ? 470 : 422, lowerLabelY, compact ? 532 : 340, { size: 29 })

    const noteTitle = companions.length ? copy.note : copy.archiveNote
    const noteBody = companions.length
      ? companions.join('  /  ')
      : safeText(data.memory?.body, payload.mainText).split(/(?<=[。！？.!?])\s*/u)[0]
    drawBoardingText(ctx, `TRAVEL NOTE / ${noteTitle}`, mainX, compact ? 580 : 660, {
      size: 21, minSize: 17, fill: accent, maxWidth: noteWidth
    })
    ctx.save()
    ctx.font = `700 27px ${FONT_SC}`
    ctx.fillStyle = '#ffffff'
    wrapKeepsakeText(ctx, noteBody, mainX, compact ? 622 : 702, noteWidth, 31, 2)
    ctx.restore()
    if (companions.length) drawBoardingText(ctx, copy.companions, mainX, footerLineY - 23, {
      size: 18, weight: 600, fill: 'rgba(255,255,255,0.63)', maxWidth: noteWidth
    })

    if (heroList.length) {
      drawBoardingText(ctx, 'HERO STAMPS', heroX, lowerLabelY - 2, { size: 16, fill: 'rgba(255,255,255,0.65)', maxWidth: mainRight - heroX })
      heroList.forEach((hero, index) => {
        const x = heroX + index * heroStep
        const y = lowerLabelY + 21
        ctx.save()
        ctx.fillStyle = 'rgba(255,255,255,0.035)'
        ctx.strokeStyle = hexToRgba(accent, index === 0 ? 0.7 : 0.35)
        ctx.lineWidth = index === 0 ? 2 : 1.5
        drawCutCornerRect(ctx, x, y, heroWidth, heroHeight, 12)
        ctx.fill()
        ctx.stroke()
        drawImageInside(ctx, images.heroImages?.[index], x + 9, y + 9, heroWidth - 18, heroHeight - 53, { contain: true, radius: 3 })
        drawBoardingText(ctx, safeText(hero.title, ''), x + heroWidth / 2, y + heroHeight - 16, {
          size: 22, minSize: 13, align: 'center', fill: '#ffffff', maxWidth: heroWidth - 20
        })
        ctx.restore()
      })
    }
  }

  ctx.save()
  ctx.strokeStyle = 'rgba(255,255,255,0.13)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(mainX, footerLineY)
  ctx.lineTo(mainRight, footerLineY)
  ctx.stroke()
  ctx.restore()
  const peakValue = String(data.peakValue ?? '').trim()
  const peakNote = peakValue && peakValue !== '-'
    ? `${safeText(data.peakLabel, 'PEAK')} ${peakValue} / `
    : ''
  const footer = rosterOnly ? copy.rosterDetail : `${peakNote}PUBLIC MATCH ARCHIVE`
  drawBoardingText(ctx, footer, mainX, footerY, { size: 17, minSize: 14, weight: 600, fill: 'rgba(255,255,255,0.64)', maxWidth: 850 })
  drawBoardingText(ctx, archiveId, mainRight, footerY, { size: 18, fill: accent, align: 'right', maxWidth: 330 })

  const stubLeft = stubX + 36
  const stubContentW = stubW - 72
  drawBoardingText(ctx, 'PASSENGER', stubLeft, passengerY + 2, { size: 15, fill: 'rgba(255,255,255,0.59)', maxWidth: stubContentW })
  drawBoardingText(ctx, callsign, stubLeft, compact ? 202 : 232, { size: 40, minSize: 20, weight: 900, fill: '#ffffff', maxWidth: stubContentW })
  drawBoardingText(ctx, issuedTo, stubLeft, compact ? 234 : 264, { size: 16, minSize: 12, weight: 600, fill: 'rgba(255,255,255,0.61)', maxWidth: stubContentW })
  drawBoardingField(ctx, 'FLIGHT', flight, stubLeft, compact ? 275 : 312, compact ? 172 : 112, { size: 29 })
  drawBoardingField(ctx, 'TEAM', data.team, stubX + (compact ? 242 : 181), compact ? 275 : 312, compact ? 138 : 82, { size: 29 })
  const period = rosterOnly
    ? copy.finalRoster
    : `${compactRouteDate(data.routeStartLabel || getDateRangeStart(data.routeDateRange))} → ${compactRouteDate(data.routeEndLabel || getDateRangeEnd(data.routeDateRange))}`
  drawBoardingText(ctx, period, stubCenter, compact ? 371 : 421, {
    size: 24, minSize: 17, align: 'center', fill: 'rgba(255,255,255,0.8)', maxWidth: stubContentW
  })
  const sealY = compact ? 468 : 553
  drawMemorySeal(ctx, stubCenter, sealY, compact ? 78 : 99, accent)
  drawBoardingText(ctx, copy.teamResult, stubCenter, sealY - (compact ? 25 : 33), {
    size: 15, minSize: compact ? 12 : 13, align: 'center', fill: 'rgba(255,255,255,0.72)', maxWidth: compact ? 134 : 170
  })
  drawBoardingText(ctx, safeText(data.rank || payload.achievement, 'SEASON'), stubCenter, sealY + (compact ? 16 : 17), {
    size: 35, minSize: 22, weight: 900, align: 'center', fill: accent, maxWidth: compact ? 136 : 166
  })
  drawBoardingText(ctx, 'SEASON ARCHIVED', stubCenter, sealY + (compact ? 41 : 48), {
    size: 13, align: 'center', fill: hexToRgba(accent, 0.76), maxWidth: 164
  })
  drawBarcode(ctx, stubLeft, compact ? 584 : 681, stubContentW, compact ? 58 : 61, accent, archiveId)
  drawBoardingText(ctx, archiveId, stubCenter, compact ? 679 : 778, { size: 19, align: 'center', fill: accent, maxWidth: stubContentW })
  drawBoardingText(ctx, 'KEEP THIS BOARDING PASS', stubCenter, footerY, {
    size: 14, align: 'center', fill: 'rgba(255,255,255,0.54)', maxWidth: stubContentW
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
  const tctx = getPosterLocaleContext(ticket, payload)

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
  const primaryValue = isViewerTicket ? safeText(data.eventTitle, payload.eventTitle || '2026 薯条杯学院赛') : safeText(data.issuedTo, config.issuedFallback)
  const identityLabel = isViewerTicket ? 'WITNESS ID' : (config.infoLabel || 'CALLSIGN')
  const identityValue = isViewerTicket ? safeText(data.viewerId || data.callsign, '共同见证者') : safeText(data.callsign, data.issuedTo)
  const archiveLabel = isViewerTicket ? 'ARCHIVE' : (config.issuedTeamLabel || 'ISSUED TEAM')
  const archiveValue = isViewerTicket ? 'SEASON MEMORY' : safeText(data.teamFullName, data.team)
  const leftFieldLabel = isViewerTicket ? 'SEASON' : (config.teamLabel || 'TEAM')
  const leftFieldValue = isViewerTicket ? (data.seasonCode || payload.seasonCode || 'FCA2026') : data.team
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

  drawMemorySeal(ctx, stubCenterX, 356, 102, accent)

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
  drawCutCornerRect(ctx, 70, 558, 644, 154, 18)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = accent
  ctx.fillRect(70, 558, 6, 154)
  drawText(ctx, config.noteTitle || 'TRAVEL NOTE', 104, 594, {
    font: `900 18px ${FONT_MONO}`,
    fill: accent
  })
  drawText(ctx, safeText(data.memory?.title, '这张票证明你来过'), 104, 626, {
    font: `900 24px ${FONT_SC}`,
    fill: '#ffffff',
    maxWidth: 560
  })
  ctx.font = `800 20px ${FONT_SC}`
  ctx.fillStyle = 'rgba(255,255,255,0.68)'
  wrapCanvasText(ctx, safeText(data.memory?.body, payload.mainText), 104, 654, 560, 25, 3)
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

  drawText(ctx, 'FRIES CUP SEASON REVIEW', stubCenterX, 184, {
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

  drawText(ctx, isViewerTicket ? (data.seasonCode || payload.seasonCode || 'FCA2026') : safeText(data.team, config.teamFallback), stubCenterX, 430, {
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

  drawText(ctx, `${payload.eventTitle || '2026 薯条杯学院赛'} · SEASON REVIEW`, 82, 1808, {
    font: `900 23px ${FONT_MONO}`,
    fill: 'rgba(255,255,255,0.34)'
  })

  drawText(ctx, 'FRIES CUP SEASON REVIEW', 82, 1856, {
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

function getFilmPosterData(payload) {
  const ticket = payload.playerTicket || payload.identityTicket || {}
  const ticketStats = safeArr(ticket.stats)
  const mapStat = ticketStats.find(item => String(item?.label || '').toUpperCase().includes('MAP'))
  const subject = safeText(
    ticket.callsign || ticket.playerName || ticket.issuedTo || ticket.viewerId,
    cleanPosterSubject(payload.title) || 'SEASON ARCHIVE'
  )
  const subtitle = safeText(
    ticket.battleTag || ticket.teamFullName || ticket.team || payload.subtitle,
    payload.cardType || 'OFFICIAL SEASON FILM'
  )

  return {
    subject,
    subtitle,
    team: safeText(ticket.teamFullName || ticket.team, 'FRIES CUP'),
    role: safeText(ticket.role, payload.cardType || 'SEASON PARTICIPANT'),
    topHero: safeText(ticket.topHero, ''),
    rosterNames: payload.cardKind === 'team' ? safeArr(ticket.rosterNames).slice(0, 12) : [],
    staffCredits: payload.cardKind === 'team' ? safeArr(ticket.staffCredits).slice(0, 3) : [],
    recordText: payload.cardKind === 'team' ? safeText(ticket.recordText, '') : '',
    mapCount: payload.cardKind === 'team' ? safeText(mapStat?.value, '') : '',
    finalRank: payload.cardKind === 'team' ? safeText(ticket.dest, '') : '',
    achievement: safeText(payload.achievement, 'SEASON ARCHIVE'),
    memoryTitle: safeText(payload.signatureTitle, '这一季，已经成为你的电影。'),
    memoryBody: safeText(payload.mainText, '比赛会结束，但你在这里留下的画面不会消失。')
  }
}

function drawFilmTeamSlate(ctx, data, accent, offsetY = 0) {
  const items = [
    { label: 'RECORD', value: data.recordText },
    { label: 'MAPS', value: data.mapCount },
    { label: 'FINAL', value: data.finalRank }
  ].filter(item => item.value)

  if (!items.length) return

  const x = 352
  const y = 880 + offsetY
  const width = 608
  const height = 145
  const headerHeight = 45
  const statsY = y + headerHeight
  const statsHeight = height - headerHeight
  const columnWidth = width / items.length

  ctx.save()
  ctx.translate(x + (width / 2), y + (height / 2))
  ctx.rotate(4 * (Math.PI / 180))
  ctx.translate(-(x + (width / 2)), -(y + (height / 2)))
  ctx.fillStyle = 'rgba(6,7,4,0.94)'
  ctx.fillRect(x, y, width, height)
  ctx.fillStyle = accent
  ctx.fillRect(x, y, 6, height)
  ctx.strokeStyle = hexToRgba(accent, 0.34)
  ctx.lineWidth = 1
  ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1)

  ctx.fillStyle = 'rgba(255,247,220,0.12)'
  ctx.fillRect(x + 18, statsY, width - 36, 1)
  drawText(ctx, safeText(data.team, data.subject), x + 24, y + 29, {
    font: `900 14px ${FONT_SC}`,
    fill: '#fffdf4',
    maxWidth: 350
  })
  drawText(ctx, 'SEASON DOSSIER / 2026', x + width - 22, y + 28, {
    font: `900 9px ${FONT_MONO}`,
    fill: accent,
    align: 'right',
    maxWidth: 190
  })

  items.forEach((item, index) => {
    const itemX = x + 22 + (columnWidth * index)
    if (index > 0) {
      ctx.fillStyle = 'rgba(255,247,220,0.12)'
      ctx.fillRect(x + (columnWidth * index), statsY + 18, 1, statsHeight - 36)
    }
    drawText(ctx, item.label, itemX, statsY + 34, {
      font: `900 10px ${FONT_MONO}`,
      fill: accent
    })
    drawText(ctx, item.value, itemX, statsY + 74, {
      font: `900 22px ${FONT_SC}`,
      fill: '#fffdf4',
      maxWidth: columnWidth - 34
    })
  })
  ctx.restore()
}

function getFilmCreditLines(ctx, names, maxWidth, maxLines = 2) {
  const separator = '  ·  '
  const lines = []
  let current = ''

  safeArr(names).forEach(name => {
    const value = stripTicketHash(name)
    if (!value) return
    const candidate = current ? `${current}${separator}${value}` : value

    if (current && ctx.measureText(candidate).width > maxWidth) {
      lines.push(current)
      current = value
      return
    }

    current = candidate
  })

  if (current) lines.push(current)
  if (lines.length <= maxLines) return lines

  const clipped = lines.slice(0, maxLines)
  clipped[maxLines - 1] = `${clipped[maxLines - 1].replace(/…?$/, '')}…`
  return clipped
}

const visibleImageBoundsCache = new WeakMap()

function getVisibleImageBounds(image) {
  if (!image) return null
  if (visibleImageBoundsCache.has(image)) return visibleImageBoundsCache.get(image)

  const fallback = { x: 0, y: 0, width: image.width, height: image.height }
  if (typeof document === 'undefined' || !image.width || !image.height) return fallback

  try {
    const maxSample = 420
    const sampleScale = Math.min(1, maxSample / Math.max(image.width, image.height))
    const sampleWidth = Math.max(1, Math.round(image.width * sampleScale))
    const sampleHeight = Math.max(1, Math.round(image.height * sampleScale))
    const sample = document.createElement('canvas')
    sample.width = sampleWidth
    sample.height = sampleHeight
    const sampleCtx = sample.getContext('2d', { willReadFrequently: true })
    if (!sampleCtx) return fallback

    sampleCtx.drawImage(image, 0, 0, sampleWidth, sampleHeight)
    const pixels = sampleCtx.getImageData(0, 0, sampleWidth, sampleHeight).data
    let minX = sampleWidth
    let minY = sampleHeight
    let maxX = -1
    let maxY = -1

    for (let y = 0; y < sampleHeight; y += 1) {
      for (let x = 0; x < sampleWidth; x += 1) {
        if (pixels[((y * sampleWidth) + x) * 4 + 3] < 18) continue
        minX = Math.min(minX, x)
        minY = Math.min(minY, y)
        maxX = Math.max(maxX, x)
        maxY = Math.max(maxY, y)
      }
    }

    if (maxX < minX || maxY < minY) return fallback

    const scaleBack = 1 / sampleScale
    const bounds = {
      x: minX * scaleBack,
      y: minY * scaleBack,
      width: (maxX - minX + 1) * scaleBack,
      height: (maxY - minY + 1) * scaleBack
    }
    visibleImageBoundsCache.set(image, bounds)
    return bounds
  } catch {
    visibleImageBoundsCache.set(image, fallback)
    return fallback
  }
}

function getAdaptiveFilmSubjectPlacement(ctx, image, options = {}) {
  if (!image) return null
  const {
    centerX = ctx.canvas.width / 2,
    bottom = 1220,
    maxWidth = 1060,
    maxHeight = 930
  } = options
  const bounds = getVisibleImageBounds(image) || { x: 0, y: 0, width: image.width, height: image.height }
  const ratio = Math.min(maxWidth / bounds.width, maxHeight / bounds.height)
  const imageWidth = image.width * ratio
  const imageHeight = image.height * ratio
  const imageX = centerX - ((bounds.x + (bounds.width / 2)) * ratio)
  const imageY = bottom - ((bounds.y + bounds.height) * ratio)

  return { imageX, imageY, imageWidth, imageHeight, bounds, ratio }
}

function drawTintedFilmSubject(ctx, image, placement, tint, alpha = 1, offsetX = 0, offsetY = 0) {
  if (!image || !placement || typeof document === 'undefined') return

  const layerWidth = Math.max(1, Math.ceil(placement.imageWidth))
  const layerHeight = Math.max(1, Math.ceil(placement.imageHeight))
  const layer = document.createElement('canvas')
  layer.width = layerWidth
  layer.height = layerHeight
  const layerCtx = layer.getContext('2d')
  if (!layerCtx) return

  layerCtx.drawImage(image, 0, 0, layerWidth, layerHeight)
  layerCtx.globalCompositeOperation = 'source-in'
  layerCtx.fillStyle = tint
  layerCtx.fillRect(0, 0, layerWidth, layerHeight)

  ctx.save()
  ctx.globalAlpha = alpha
  ctx.drawImage(layer, placement.imageX + offsetX, placement.imageY + offsetY)
  ctx.restore()
}

function drawScreenPrintedFilmSubject(ctx, image, options = {}, accent = '#f4c320') {
  const placement = getAdaptiveFilmSubjectPlacement(ctx, image, options)
  if (!placement) return

  drawTintedFilmSubject(ctx, image, placement, accent, 0.46, -13, 4)
  drawTintedFilmSubject(ctx, image, placement, '#fff7dc', 0.16, 8, -3)

  ctx.save()
  ctx.filter = 'saturate(0.78) contrast(1.12) sepia(0.06)'
  ctx.shadowColor = 'rgba(0,0,0,0.7)'
  ctx.shadowBlur = 38
  ctx.drawImage(image, placement.imageX, placement.imageY, placement.imageWidth, placement.imageHeight)
  ctx.restore()
}

function splitFilmPosterTitle(value) {
  const subject = safeText(value, 'SEASON ARCHIVE').trim()
  const compact = subject.replace(/\s+/g, '')
  const compactLength = [...compact].length
  const containsCjk = /[\u3400-\u9fff\uf900-\ufaff]/.test(subject)
  if ((containsCjk && compactLength <= 10) || (!containsCjk && compactLength <= 18)) return [subject]

  const words = subject.split(/\s+/).filter(Boolean)
  if (words.length > 1) {
    const totalLength = words.reduce((sum, word) => sum + [...word].length, 0)
    let runningLength = 0
    let splitIndex = 1
    words.forEach((word, index) => {
      if (index === words.length - 1) return
      runningLength += [...word].length
      if (Math.abs(runningLength - (totalLength / 2)) < Math.abs(words.slice(0, splitIndex).join('').length - (totalLength / 2))) {
        splitIndex = index + 1
      }
    })
    return [words.slice(0, splitIndex).join(' '), words.slice(splitIndex).join(' ')].filter(Boolean)
  }

  const chars = [...subject]
  const splitIndex = Math.ceil(chars.length / 2)
  return [chars.slice(0, splitIndex).join(''), chars.slice(splitIndex).join('')]
}

function fitFilmPosterTitleSize(ctx, lines, maxWidth, preferredSize, minimumSize) {
  let size = preferredSize
  while (size > minimumSize) {
    ctx.font = `900 ${size}px ${FONT_SC}`
    if (lines.every(line => ctx.measureText(line).width <= maxWidth)) return size
    size -= 2
  }
  return minimumSize
}

function drawAdaptiveFilmTitle(ctx, value, x, bottomY, maxWidth, accent = '#f4c320') {
  const lines = splitFilmPosterTitle(value).slice(0, 2)
  const compactLength = [...safeText(value, '').replace(/\s+/g, '')].length
  const preferredSize = lines.length === 1
    ? compactLength <= 5 ? 164 : compactLength <= 10 ? 140 : 116
    : 86
  const minimumSize = lines.length === 1 ? 54 : 44
  const size = fitFilmPosterTitleSize(ctx, lines, maxWidth, preferredSize, minimumSize)
  const lineHeight = size * 0.88
  const firstBaseline = bottomY - ((lines.length - 1) * lineHeight)

  lines.forEach((line, index) => {
    drawText(ctx, line, x + 7, firstBaseline + (index * lineHeight) + 5, {
      font: `900 ${size}px ${FONT_SC}`,
      fill: hexToRgba(accent, 0.42)
    })
    drawText(ctx, line, x, firstBaseline + (index * lineHeight), {
      font: `900 ${size}px ${FONT_SC}`,
      fill: '#fffdf4'
    })
  })

  return { lines, size, topY: firstBaseline - size, bottomY }
}

function drawFilmHalftoneField(ctx, x, y, width, height, accent) {
  ctx.save()
  ctx.beginPath()
  ctx.rect(x, y, width, height)
  ctx.clip()
  for (let row = 0; row < 32; row += 1) {
    for (let column = 0; column < 24; column += 1) {
      const progress = (row + column) / 54
      const radius = 1.2 + ((1 - progress) * 2.8)
      ctx.fillStyle = hexToRgba(accent, 0.05 + ((1 - progress) * 0.08))
      ctx.beginPath()
      ctx.arc(x + 11 + (column * 22), y + 11 + (row * 22), radius, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.restore()
}

function drawFilmInkPanel(ctx, accent) {
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(392, 214)
  ctx.lineTo(1042, 260)
  ctx.lineTo(942, 1088)
  ctx.lineTo(328, 1034)
  ctx.closePath()
  ctx.clip()
  ctx.fillStyle = accent
  ctx.globalAlpha = 0.82
  ctx.fillRect(300, 190, 760, 930)
  ctx.globalAlpha = 1
  drawFilmHalftoneField(ctx, 392, 214, 650, 874, '#060704')
  ctx.restore()
}

function drawFilmStill(ctx, image, x, y, width, height) {
  if (!image) return

  ctx.save()
  ctx.beginPath()
  ctx.rect(x, y, width, height)
  ctx.clip()
  ctx.fillStyle = '#0d0e0b'
  ctx.fillRect(x, y, width, height)

  const ratio = Math.max(width / image.width, height / image.height)
  const imageWidth = image.width * ratio
  const imageHeight = image.height * ratio
  const imageX = x + ((width - imageWidth) / 2)
  const imageY = y + ((height - imageHeight) / 2)
  ctx.filter = 'saturate(0.74) contrast(1.08) sepia(0.05)'
  ctx.drawImage(image, imageX, imageY, imageWidth, imageHeight)
  ctx.filter = 'none'

  const stillFade = ctx.createLinearGradient(x, y, x + width, y + height)
  stillFade.addColorStop(0, 'rgba(6,7,4,0.16)')
  stillFade.addColorStop(0.62, 'rgba(6,7,4,0)')
  stillFade.addColorStop(1, 'rgba(6,7,4,0.34)')
  ctx.fillStyle = stillFade
  ctx.fillRect(x, y, width, height)
  ctx.restore()
}

function drawFilmMarkVisual(ctx, image, x, y, width, height) {
  if (!image) return

  ctx.save()
  ctx.globalAlpha = 0.9
  drawImagePlain(ctx, image, x, y, width, height, { contain: true, alpha: 0.9 })
  ctx.restore()
}

function drawVisibleImageContained(ctx, image, x, y, width, height, options = {}) {
  if (!image) return

  const { alpha = 1, scale = 1, offsetX = 0, offsetY = 0 } = options
  const bounds = getVisibleImageBounds(image) || { x: 0, y: 0, width: image.width, height: image.height }
  const safeScale = Math.max(0.1, Math.min(3, Number(scale) || 1))
  const ratio = Math.min(width / bounds.width, height / bounds.height) * safeScale
  const imageWidth = image.width * ratio
  const imageHeight = image.height * ratio
  const imageX = x + ((width - (bounds.width * ratio)) / 2) - (bounds.x * ratio) + (Number(offsetX) || 0)
  const imageY = y + ((height - (bounds.height * ratio)) / 2) - (bounds.y * ratio) + (Number(offsetY) || 0)

  ctx.save()
  ctx.globalAlpha = alpha
  ctx.drawImage(image, imageX, imageY, imageWidth, imageHeight)
  ctx.restore()
}

function drawTeamEntryRegistration(ctx, label, options = {}) {
  const { strength = 1, labelY = 252 } = options

  ctx.save()
  ctx.translate(0, -8)
  ctx.strokeStyle = `rgba(6,7,4,${0.13 * strength})`
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(0, 0, 230, 0, Math.PI * 2)
  ctx.stroke()

  ctx.setLineDash([7, 13])
  ctx.strokeStyle = `rgba(6,7,4,${0.1 * strength})`
  ctx.beginPath()
  ctx.arc(0, 0, 211, 0, Math.PI * 2)
  ctx.stroke()
  ctx.setLineDash([])

  ctx.strokeStyle = `rgba(6,7,4,${0.2 * strength})`
  ctx.lineWidth = 3
  ;[
    [-260, 0, -239, 0],
    [239, 0, 260, 0],
    [0, -260, 0, -239],
    [0, 239, 0, 260]
  ].forEach(([fromX, fromY, toX, toY]) => {
    ctx.beginPath()
    ctx.moveTo(fromX, fromY)
    ctx.lineTo(toX, toY)
    ctx.stroke()
  })
  ctx.restore()

  drawText(ctx, label, 0, labelY, {
    font: `900 11px ${FONT_MONO}`,
    fill: `rgba(6,7,4,${0.58 * strength})`,
    align: 'center',
    maxWidth: 440
  })
}

function drawDefaultTeamWatermark(ctx, image) {
  if (!image) return

  ctx.save()
  ctx.beginPath()
  ctx.moveTo(392, 214)
  ctx.lineTo(1042, 260)
  ctx.lineTo(942, 1088)
  ctx.lineTo(328, 1034)
  ctx.closePath()
  ctx.clip()

  ctx.translate(683, 525)
  ctx.rotate(4 * (Math.PI / 180))
  drawTeamEntryRegistration(ctx, 'OVERWATCH / TEAM ENTRY')
  ctx.filter = 'grayscale(1) brightness(0) contrast(1.5)'
  drawVisibleImageContained(ctx, image, -178, -194, 356, 356, { alpha: 0.62 })
  ctx.filter = 'none'
  ctx.restore()
}

function drawTeamCrestEntry(ctx, image) {
  if (!image) return

  const bounds = getVisibleImageBounds(image) || { width: image.width, height: image.height }
  const aspect = bounds.height ? bounds.width / bounds.height : 1
  const safeWidth = aspect > 1.25 ? 510 : aspect < 0.66 ? 350 : 480
  const safeHeight = aspect > 1.25 ? 330 : aspect < 0.66 ? 500 : 470

  ctx.save()
  ctx.beginPath()
  ctx.moveTo(392, 214)
  ctx.lineTo(1042, 260)
  ctx.lineTo(942, 1088)
  ctx.lineTo(328, 1034)
  ctx.closePath()
  ctx.clip()

  ctx.translate(683, 525)
  ctx.rotate(4 * (Math.PI / 180))
  drawTeamEntryRegistration(ctx, 'TEAM CREST / OFFICIAL ENTRY', {
    strength: 0.8,
    labelY: 260
  })
  ctx.shadowColor = 'rgba(6,7,4,0.22)'
  ctx.shadowBlur = 18
  ctx.shadowOffsetY = 9
  drawVisibleImageContained(
    ctx,
    image,
    -(safeWidth / 2),
    -(safeHeight / 2) - 8,
    safeWidth,
    safeHeight,
    { alpha: 0.98 }
  )
  ctx.restore()
}

function getFilmRoleLabel(payload, data) {
  if (payload.cardKind === 'caster') return 'BROADCAST TALENT'
  if (payload.cardKind === 'staff') return 'TOURNAMENT OPERATIONS'
  if (payload.cardKind === 'team') return 'TEAM ARCHIVE'
  if (payload.cardKind === 'player') return 'PLAYER ARCHIVE'
  return safeText(data.role, 'SEASON PARTICIPANT').toLocaleUpperCase('en-US')
}

export function getFilmStageLabels(payload) {
  const phases = [...new Set(safeArr(payload.recordedStages).map(stage => {
    const key = String(stage).toUpperCase()
    if (key.includes('PLAYOFF')) return 'PLAYOFFS'
    if (/SWISS|LCQ|QUALIFIER/.test(key)) return 'OPEN QUALIFIER'
    return ''
  }).filter(Boolean))]

  if (phases.length > 1) return [phases[0], phases[phases.length - 1]]
  if (phases.length === 1) return [phases[0], 'SEASON ARCHIVE']
  return [payload.playerTicket?.coverageLevel === 'roster' ? 'ROSTER RECORD' : 'SEASON RECORD', 'SEASON ARCHIVE']
}

function drawFilmStageLine(ctx, payload, accent, width, offsetY = 0) {
  const left = 82
  const right = width - 82
  const center = width / 2
  const [firstStage, lastStage] = getFilmStageLabels(payload)

  drawText(ctx, firstStage, left, 1328 + offsetY, {
    font: `900 14px ${FONT_MONO}`,
    fill: '#fffdf4'
  })
  drawText(ctx, lastStage, right, 1328 + offsetY, {
    font: `900 14px ${FONT_MONO}`,
    fill: '#fffdf4',
    align: 'right'
  })
  ctx.strokeStyle = 'rgba(255,247,220,0.2)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(260, 1323 + offsetY)
  ctx.lineTo(center - 24, 1323 + offsetY)
  ctx.moveTo(center + 24, 1323 + offsetY)
  ctx.lineTo(right - 160, 1323 + offsetY)
  ctx.stroke()
  ctx.fillStyle = accent
  ctx.beginPath()
  ctx.moveTo(center - 8, 1315 + offsetY)
  ctx.lineTo(center + 8, 1323 + offsetY)
  ctx.lineTo(center - 8, 1331 + offsetY)
  ctx.closePath()
  ctx.fill()
}

function drawClassicPosterGrain(ctx, width, height, key = 'FRIES CUP') {
  let seed = 2166136261
  for (const char of String(key || 'FRIES CUP')) {
    seed ^= char.charCodeAt(0)
    seed = Math.imul(seed, 16777619)
  }

  const next = () => {
    seed = Math.imul(seed ^ (seed >>> 15), 2246822519)
    seed = Math.imul(seed ^ (seed >>> 13), 3266489917)
    return ((seed ^= seed >>> 16) >>> 0) / 4294967296
  }

  ctx.save()
  for (let index = 0; index < 2200; index += 1) {
    const alpha = 0.012 + next() * 0.035
    const size = next() > 0.88 ? 2 : 1
    ctx.fillStyle = next() > 0.52
      ? `rgba(255,247,220,${alpha})`
      : `rgba(0,0,0,${alpha * 1.8})`
    ctx.fillRect(next() * width, next() * height, size, size)
  }

  ctx.lineWidth = 1
  for (let index = 0; index < 26; index += 1) {
    const x = next() * width
    const y = next() * height
    ctx.strokeStyle = `rgba(255,247,220,${0.015 + next() * 0.025})`
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + (next() - 0.5) * 16, y + 24 + next() * 80)
    ctx.stroke()
  }
  ctx.restore()
}

function drawSeasonFilmPoster(ctx, payload, images, accent) {
  const width = ctx.canvas.width
  const height = ctx.canvas.height
  const data = getFilmPosterData(payload)
  const brandAccent = payload.usesRegularTemplate || payload.seasonId === 'FCR26' ? '#f4c320' : accent
  const heroRender = images.heroRender || null
  const primaryVisual = heroRender || images.mainImage || null
  const heroBounds = heroRender ? getVisibleImageBounds(heroRender) : null
  const heroAspect = heroBounds ? heroBounds.width / heroBounds.height : 0.72
  const roleLabel = getFilmRoleLabel(payload, data)
  const usesPhotoStill = !heroRender && primaryVisual && (payload.cardKind === 'staff' || payload.cardKind === 'caster')
  const usesDefaultTeamMark = Boolean(images.usesDefaultTeamMark)
  const contentOffsetY = 0
  const titleX = usesDefaultTeamMark ? 104 : 74
  const copyX = usesDefaultTeamMark ? 112 : 82

  ctx.fillStyle = '#060704'
  ctx.fillRect(0, 0, width, height)

  drawFilmInkPanel(ctx, brandAccent)

  ctx.fillStyle = brandAccent
  ctx.fillRect(82, 76, 86, 6)
  drawText(ctx, 'FRIES CUP / SEASON REVIEW', 82, 118, {
    font: `900 15px ${FONT_MONO}`,
    fill: brandAccent
  })
  drawText(ctx, safeText(payload.seasonMark, 'FCR 2026'), 78, 157, {
    font: `900 35px ${FONT_MONO}`,
    fill: '#ffffff'
  })
  drawText(ctx, 'ONE FRAME / ONE NAME', width - 82, 118, {
    font: `900 13px ${FONT_MONO}`,
    fill: 'rgba(255,247,220,0.42)',
    align: 'right'
  })

  if (images.eventLogo && primaryVisual) {
    drawImagePlain(ctx, images.eventLogo, width - 148, 135, 66, 66, {
      contain: true,
      alpha: usesDefaultTeamMark ? 0.55 : 0.94
    })
  }

  ctx.save()
  ctx.beginPath()
  ctx.rect(0, 190, width, 1080)
  ctx.clip()

  if (heroRender) {
    const subjectOptions = heroAspect > 0.94
      ? { centerX: width * 0.5, bottom: 1158, maxWidth: 1140, maxHeight: 900 }
      : heroAspect < 0.56
        ? { centerX: width * 0.53, bottom: 1162, maxWidth: 930, maxHeight: 1000 }
        : { centerX: width * 0.5, bottom: 1160, maxWidth: 1080, maxHeight: 960 }
    drawScreenPrintedFilmSubject(ctx, heroRender, subjectOptions, brandAccent)
  } else if (usesPhotoStill) {
    drawFilmStill(ctx, primaryVisual, 70, 248, 856, 822)
  } else if (usesDefaultTeamMark) {
    drawDefaultTeamWatermark(ctx, primaryVisual)
  } else if (payload.cardKind === 'team' && primaryVisual) {
    drawTeamCrestEntry(ctx, primaryVisual)
  } else if (primaryVisual) {
    drawFilmMarkVisual(ctx, primaryVisual, 232, 318, 616, 616)
  } else if (images.eventLogo) {
    drawFilmMarkVisual(ctx, images.eventLogo, 286, 350, 508, 508)
  } else {
    ctx.fillStyle = 'rgba(255,247,220,0.08)'
    ctx.fillRect(82, 350, width - 164, 2)
  }
  ctx.filter = 'none'

  const visualFade = ctx.createLinearGradient(0, 1015, 0, 1160)
  visualFade.addColorStop(0, 'rgba(6,7,4,0)')
  visualFade.addColorStop(0.34, 'rgba(6,7,4,0)')
  visualFade.addColorStop(0.82, 'rgba(6,7,4,0.72)')
  visualFade.addColorStop(1, '#060704')
  ctx.fillStyle = visualFade
  ctx.fillRect(0, 990, width, 180)
  ctx.restore()

  const frameCredit = payload.cardKind === 'team' ? data.subject : data.team
  drawText(ctx, `ONE FRAME  /  ${frameCredit.toLocaleUpperCase('en-US')}`, copyX, 1018 + contentOffsetY, {
    font: `900 15px ${FONT_MONO}`,
    fill: brandAccent,
    maxWidth: 720
  })

  const filmDisplayTitle = data.subject
  const filmTeamFullName = payload.cardKind === 'team' ? safeText(data.team, data.subject) : ''
  drawAdaptiveFilmTitle(
    ctx,
    filmDisplayTitle,
    titleX,
    1192 + contentOffsetY,
    width - titleX - 74,
    brandAccent
  )
  if (payload.cardKind === 'team') drawFilmTeamSlate(ctx, data, brandAccent, contentOffsetY)
  drawText(ctx, roleLabel, copyX, 1248 + contentOffsetY, {
    font: `900 17px ${FONT_MONO}`,
    fill: 'rgba(255,247,220,0.58)',
    maxWidth: 620
  })

  drawText(ctx, data.achievement.toLocaleUpperCase('en-US'), width - 82, 1248 + contentOffsetY, {
    font: `900 14px ${FONT_MONO}`,
    fill: brandAccent,
    align: 'right',
    maxWidth: 250
  })

  drawFilmStageLine(ctx, payload, brandAccent, width, contentOffsetY)

  ctx.fillStyle = brandAccent
  ctx.fillRect(82, 1382 + contentOffsetY, 52, 4)
  drawText(ctx, data.memoryTitle, 82, 1430 + contentOffsetY, {
    font: `900 30px ${FONT_SC}`,
    fill: '#ffffff',
    maxWidth: width - 164
  })

  drawText(ctx, roleLabel, 82, 1502 + contentOffsetY, {
    font: `900 13px ${FONT_MONO}`,
    fill: brandAccent
  })
  drawText(ctx, `“${filmTeamFullName || filmDisplayTitle}”  /  FCR 2026 SEASON ARCHIVE`, 82, 1540 + contentOffsetY, {
    font: `900 21px ${FONT_SC}`,
    fill: 'rgba(255,247,220,0.88)',
    maxWidth: width - 164
  })
  const hasTeamCredits = payload.cardKind === 'team' && data.rosterNames.length > 0
  let separatorY = 1626 + contentOffsetY
  let seasonTitleY = 1674 + contentOffsetY
  let seasonBodyY = 1714 + contentOffsetY
  let seasonBodyLines = 3

  if (hasTeamCredits) {
    drawText(ctx, 'STARRING', 82, 1575 + contentOffsetY, {
      font: `900 12px ${FONT_MONO}`,
      fill: brandAccent
    })

    ctx.save()
    ctx.font = `900 ${data.rosterNames.length >= 9 ? 12 : data.rosterNames.length >= 7 ? 13 : 14}px ${FONT_MONO}`
    ctx.fillStyle = 'rgba(255,247,220,0.68)'
    const rosterLines = getFilmCreditLines(ctx, data.rosterNames, width - 164, 2)
    rosterLines.forEach((line, index) => {
      ctx.fillText(line, 82, 1600 + contentOffsetY + index * 21)
    })
    ctx.restore()

    const staffLine = data.staffCredits
      .map(item => `${item.role}  ${item.name}`)
      .join('     ·     ')

    if (staffLine) {
      drawText(ctx, `TEAM STAFF  /  ${staffLine}`, 82, 1645 + contentOffsetY, {
        font: `900 12px ${FONT_MONO}`,
        fill: 'rgba(255,247,220,0.38)',
        maxWidth: width - 164
      })
    }

    separatorY = 1672 + contentOffsetY
    seasonTitleY = 1712 + contentOffsetY
    seasonBodyY = 1752 + contentOffsetY
    seasonBodyLines = 2
  } else {
    drawText(ctx, `WITH  ${data.team}     /     ${data.subtitle}     /     ${data.topHero || roleLabel}`, 82, 1578 + contentOffsetY, {
      font: `900 14px ${FONT_MONO}`,
      fill: 'rgba(255,247,220,0.42)',
      maxWidth: width - 164
    })
  }

  ctx.strokeStyle = 'rgba(255,247,220,0.12)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(82, separatorY)
  ctx.lineTo(width - 82, separatorY)
  ctx.stroke()

  drawText(ctx, 'THE SEASON / ONE FRAME', 82, seasonTitleY, {
    font: `900 19px ${FONT_MONO}`,
    fill: '#ffffff'
  })
  ctx.font = `700 17px ${FONT_SC}`
  ctx.fillStyle = 'rgba(255,247,220,0.48)'
  wrapKeepsakeText(ctx, data.memoryBody, 82, seasonBodyY, 830, 27, seasonBodyLines)

  drawText(ctx, safeText(payload.archiveId, 'FCR26-ARCHIVE'), 82, 1838, {
    font: `900 14px ${FONT_MONO}`,
    fill: brandAccent
  })
  drawText(ctx, payload.isPartner ? 'FRIES CUP  /  PARTNER ARCHIVE EDITION' : 'FRIES CUP 2026  /  OFFICIAL ARCHIVE EDITION', width - 82, 1838, {
    font: `900 13px ${FONT_MONO}`,
    fill: 'rgba(255,247,220,0.34)',
    align: 'right'
  })

  drawClassicPosterGrain(ctx, width, height, payload.archiveId)
}

function getCinemaTicketCopy(locale = 'zh-CN') {
  if (locale === 'zh-TW') return localizeTraditionalReview(getCinemaTicketCopy('zh-CN'))
  if (locale === 'en-US') {
    return {
      cinema: 'FRIES CUP CINEMA', premiere: 'SEASON PREMIERE', feature: 'FEATURE PRESENTATION',
      starring: 'STARRING', program: 'PICTURE DETAILS', showDate: 'FIRST RECORD', showtime: 'RECORDED AT',
      screen: 'SCREEN', row: 'ROW', seat: 'SEAT', credits: 'CAST & CREDITS', admitOne: 'ADMIT ONE',
      gate: 'GATE', doors: 'DOORS OPEN', opening: 'OPENING', closing: 'CLOSING', presentedBy: 'FRIES CUP PICTURES PRESENTS',
      serial: 'SERIAL', commemorative: 'COMMEMORATIVE SCREENING · NOT VALID FOR ADMISSION',
      defaultLogline: 'One season. One name. One picture worth keeping.',
      selection: 'OFFICIAL ARCHIVE', logline: 'SEASON LOGLINE', selectionEdition: 'SEASON PICTURE · 2026',
      selectionValues: {
        player: 'SEASON RECORD', team: 'TEAM RECORD', staff: 'CREW RECORD', caster: 'VOICE RECORD',
        manager: 'PRODUCTION RECORD', coach: 'PRODUCTION RECORD', managerCoach: 'PRODUCTION RECORD', tournament: 'SPECIAL RECORD'
      },
      roles: {
        player: 'PLAYER FEATURE', team: 'TEAM FEATURE', staff: 'BEHIND THE MATCH', caster: 'VOICE OF THE SEASON',
        manager: 'TEAM PRODUCTION', coach: 'TEAM PRODUCTION', managerCoach: 'TEAM PRODUCTION', tournament: 'AUDIENCE FEATURE'
      }
    }
  }

  if (locale === 'ko-KR') {
    return {
      cinema: '프라이즈 컵 시네마', premiere: '시즌 프리미어', feature: '상영작 / FEATURE PRESENTATION',
      starring: '주연 / STARRING', program: '작품 정보 / PICTURE DETAILS', showDate: '첫 기록 / FIRST RECORD',
      showtime: '기록 시간 / TIME', screen: '상영관 / SCREEN', row: '열 / ROW', seat: '좌석 / SEAT',
      credits: '출연진 / CAST & CREDITS', admitOne: '1인 1매 / ADMIT ONE', gate: '입장구 / GATE',
      doors: '입장 시작', opening: '개막 / OPENING', closing: '종영 / CLOSING', presentedBy: 'FRIES CUP PICTURES 제공', serial: '일련번호 / SERIAL',
      commemorative: '기념 상영 · 실제 입장권이 아닙니다',
      defaultLogline: '한 시즌, 한 이름, 간직할 한 장면.',
      selection: '공식 아카이브 / OFFICIAL ARCHIVE', logline: '시즌 로그라인 / LOGLINE',
      selectionEdition: 'SEASON PICTURE · 2026',
      selectionValues: {
        player: '정식 기록', team: '팀 기록', staff: '스태프 기록', caster: '보이스 기록',
        manager: '제작 기록', coach: '제작 기록', managerCoach: '제작 기록', tournament: '특별 기록'
      },
      roles: {
        player: '선수 주연작', team: '팀 주연작', staff: '경기 뒤의 사람들', caster: '시즌의 목소리',
        manager: '팀 프로덕션', coach: '팀 프로덕션', managerCoach: '팀 프로덕션', tournament: '관객 특별 상영'
      }
    }
  }

  return {
    cinema: '薯条杯影院', premiere: '赛季首映专场', feature: '本场影片 / FEATURE PRESENTATION',
    starring: '主演 / STARRING', program: '影片资料 / PICTURE DETAILS', showDate: '首次记录 / FIRST RECORD',
    showtime: '记录时间 / TIME', screen: '影厅 / SCREEN', row: '排 / ROW', seat: '座 / SEAT',
    credits: '演职员 / CAST & CREDITS', admitOne: '一人一票 / ADMIT ONE', gate: '检票口 / GATE',
    doors: '开始检票', opening: '开场 / OPENING', closing: '散场 / CLOSING', presentedBy: '薯条杯影业出品 / FRIES CUP PICTURES PRESENTS',
    serial: '票号 / SERIAL', commemorative: '纪念放映 · 非实体入场凭证',
    defaultLogline: '一个赛季，一个名字，一帧值得留下的画面。',
    selection: '官方档案 / OFFICIAL ARCHIVE', logline: '纪念语 / SEASON LOGLINE',
    selectionEdition: 'SEASON PICTURE · 2026',
    selectionValues: {
      player: '正式收录', team: '队伍收录', staff: '幕后收录', caster: '声音收录',
      manager: '制作收录', coach: '制作收录', managerCoach: '制作收录', tournament: '特别收录'
    },
    roles: {
      player: '选手主演作品', team: '队伍主演作品', staff: '赛事幕后作品', caster: '赛季之声',
      manager: '队伍幕后制作', coach: '队伍幕后制作', managerCoach: '队伍幕后制作', tournament: '观众特别场'
    }
  }
}

function getCinemaTicketRoleCode(kind) {
  if (kind === 'staff') return 'OPS'
  if (kind === 'caster') return 'CAST'
  if (kind === 'team') return 'TEAM'
  if (kind === 'manager') return 'MGR'
  if (kind === 'coach') return 'COACH'
  if (kind === 'managerCoach') return 'M/C'
  if (kind === 'tournament') return 'GUEST'
  return 'PLAYER'
}

function localizeCinemaStatLabel(label, locale) {
  const normalized = String(label || '').toLocaleUpperCase('en-US')
  const key = normalized.includes('MATCH') ? 'SCENES'
    : normalized.includes('MAP') ? 'REELS'
      : normalized.includes('MIN') || normalized.includes('TIME') || normalized.includes('RUNTIME') || normalized.includes('PLAYTIME') ? 'PLAYTIME'
        : normalized.includes('STAGE') ? 'ACTS'
          : normalized.includes('TEAM') ? 'IN FRAME'
            : normalized.includes('FINAL') || normalized.includes('RANK') ? 'FINAL BILLING'
              : normalized.includes('RECORD') ? 'SEASON CUT'
                : normalized || 'PICTURE NOTE'

  if (locale === 'zh-TW') return localizeTraditionalReview(localizeCinemaStatLabel(label, 'zh-CN'))
  if (locale === 'zh-CN') {
    return {
      SCENES: '记录场次 / SCENES', REELS: '地图镜头 / REELS', PLAYTIME: '出场时长 / PLAYTIME',
      ACTS: '幕 / ACTS', 'IN FRAME': '入镜队伍 / IN FRAME', 'FINAL BILLING': '最终署名 / BILLING',
      'SEASON CUT': '赛季剪辑 / SEASON CUT'
    }[key] || key
  }
  if (locale === 'ko-KR') {
    return {
      SCENES: '기록 경기 / SCENES', REELS: '맵 릴 / REELS', PLAYTIME: '출전 시간 / PLAYTIME',
      ACTS: '막 / ACTS', 'IN FRAME': '등장 팀 / IN FRAME', 'FINAL BILLING': '최종 기록 / BILLING',
      'SEASON CUT': '시즌 컷 / SEASON CUT'
    }[key] || key
  }
  return key
}

function getCinemaShowtime(source) {
  // A highlight or final elsewhere in the story is not the first record's time.
  const value = String(source.firstMatchTime || source.first_match_time || '')
  return value.match(/\b(?:[01]?\d|2[0-3]):[0-5]\d\b/)?.[0] || '--:--'
}

function getCinemaDateCode(value) {
  const normalized = normalizePosterDate(value)
  const match = normalized.match(/20\d{2}\.(\d{2})\.(\d{2})/)
  return match ? `${match[1]}:${match[2]}` : '--:--'
}

function getCinemaRankPosition(value) {
  const text = String(value || '').trim()
  if (!text) return 0
  if (/亚军|RUNNER.?UP|준우승/i.test(text)) return 2
  if (/冠军|CHAMPION|우승/i.test(text)) return 1
  if (/季军|THIRD/i.test(text)) return 3
  if (/殿军|FOURTH/i.test(text)) return 4
  const exact = text.match(/第\s*(\d+)\s*名|#\s*(\d+)|(\d+)\s*(?:ST|ND|RD|TH)\b|(\d+)\s*위/i)
  if (exact) return Number(exact[1] || exact[2] || exact[3] || exact[4] || 0)
  const range = text.match(/(\d+)\s*[-–~]\s*(\d+)/)
  return range ? Math.round((Number(range[1]) + Number(range[2])) / 2) : 0
}

function getCinemaActLabel(payload, rankText) {
  const acts = safeArr(payload?.scenes)
    .map(scene => String(scene?.seasonAct || '').toLocaleLowerCase('en-US'))
    .filter(Boolean)
  if (!acts.length) return ''

  const rank = getCinemaRankPosition(rankText)
  if (rank > 0 && rank <= 2) return 'FINAL ACT'
  return acts.includes('playoffs') ? 'ACT II · PLAYOFFS' : 'ACT I · OPEN QUALIFIER'
}

function getCinemaHall(rankText, competitionSize, recordText, participationCount) {
  const rank = getCinemaRankPosition(rankText)
  const fieldSize = Number(competitionSize || 0)
  if (rank > 0) {
    const percentile = fieldSize > 0
      ? (rank / fieldSize) * 100
      : rank <= 4 ? 10 : rank <= 12 ? 30 : rank <= 24 ? 60 : 100
    if (percentile <= 10) return 'APEX'
    if (percentile <= 30) return 'PREMIERE'
    if (percentile <= 60) return 'SPOTLIGHT'
    return 'CLASSIC'
  }

  const record = String(recordText || '').match(/(\d+)\s*W\s*[-–]\s*(\d+)\s*L/i)
  if (record) {
    const wins = Number(record[1])
    const total = wins + Number(record[2])
    const rate = total > 0 ? wins / total : 0
    if (rate >= 0.75) return 'APEX'
    if (rate >= 0.55) return 'PREMIERE'
    if (rate >= 0.35) return 'SPOTLIGHT'
    return 'CLASSIC'
  }

  return parsePosterNumber(participationCount) > 0 ? 'SPOTLIGHT' : 'ARCHIVE'
}

function getCinemaGate(value, fallback = 'FCR') {
  const raw = stripTicketHash(safeText(value, fallback)).trim()
  if (!raw) return fallback
  if (raw.length <= 5) return raw.toLocaleUpperCase('en-US')
  const words = raw.split(/\s+/).filter(Boolean)
  const compact = words.length > 1 ? words.map(word => word[0]).join('') : raw.slice(0, 5)
  return compact.toLocaleUpperCase('en-US')
}

function getCinemaRow(role, kind) {
  const value = String(role || '').toLocaleUpperCase('en-US')
  const roles = [
    [/TANK|重装|坦克|돌격/, 'T'],
    [/DAMAGE|DPS|输出|공격/, 'D'],
    [/SUPPORT|支援|辅助|지원/, 'S']
  ].filter(([pattern]) => pattern.test(value))
  if (roles.length > 1 || /FLEX|自由|多位置|플렉스/.test(value)) return 'F'
  if (roles.length === 1) return roles[0][1]
  return {
    team: 'TM', staff: 'OPS', caster: 'V', manager: 'M', coach: 'C', managerCoach: 'MC', tournament: 'FC'
  }[kind] || 'P'
}

function getCinemaSeat(value) {
  const count = Math.max(0, Math.round(parsePosterNumber(value)))
  return String(count).padStart(2, '0')
}

function getCinemaCut(source, kind) {
  if (kind !== 'player') return kind === 'team' ? 'TEAM CUT' : 'FEATURE CUT'
  if (source.coverageLevel === 'roster' || parsePosterNumber(source.mapCount) <= 0) return 'ARCHIVE CUT'
  if (source.coverageLevel === 'brief' || parsePosterNumber(source.mapCount) <= 4 || parsePosterNumber(source.minutes) < 30) return 'SHORT CUT'
  return 'FEATURE CUT'
}

function getCinemaPlayerProofLine(source, locale) {
  const matchCount = Math.max(0, Math.round(parsePosterNumber(source.matchCount)))
  const mapCount = Math.max(0, Math.round(parsePosterNumber(source.mapCount)))
  const minutes = Math.max(0, parsePosterNumber(source.minutes))
  const minuteText = Number.isInteger(minutes) ? String(minutes) : String(Math.round(minutes * 10) / 10)
  const rawTeam = stripTicketHash(normalizeTicketValue(source.team, ''))
  const team = /^(?:ARCHIVE|SEASON ARCHIVE)$/i.test(rawTeam) ? '' : rawTeam

  if (locale === 'en-US') {
    return [
      team,
      matchCount > 0 ? `${matchCount} MATCHES` : '',
      `${mapCount} MAPS`,
      minutes > 0 ? `${minuteText} MIN` : ''
    ].filter(Boolean).join(' · ')
  }

  if (locale === 'ko-KR') {
    return [
      team,
      matchCount > 0 ? `${matchCount}경기` : '',
      `${mapCount}개 전장`,
      minutes > 0 ? `${minuteText}분` : ''
    ].filter(Boolean).join(' · ')
  }

  return [
    team,
    matchCount > 0 ? `${matchCount} 场比赛` : '',
    `${mapCount} 张地图`,
    minutes > 0 ? `${minuteText} 分钟` : ''
  ].filter(Boolean).join(' · ')
}

function getCinemaCreditDisplayLabel(label, locale) {
  const normalized = String(label || '').toLocaleUpperCase('en-US')
  if (locale === 'en-US') return normalized

  if (locale === 'ko-KR') {
    return {
      'CO-STARRING': '동료 / CO-STARS',
      FEATURING: '영웅 / HEROES',
      PRODUCTION: '제작 / PRODUCTION',
      'ENSEMBLE CAST': '로스터 / ENSEMBLE',
      CAST: '출연 / CAST'
    }[normalized] || normalized
  }

  return {
    'CO-STARRING': '队友 / CO-STARS',
    FEATURING: '英雄 / HEROES',
    PRODUCTION: '制作 / PRODUCTION',
    'ENSEMBLE CAST': '阵容 / ENSEMBLE',
    CAST: '演职 / CAST'
  }[normalized] || normalized
}

function getCinemaTicketLogline(payload, source, film, copy, locale) {
  const subject = safeText(film.subject, 'SEASON ARCHIVE')
  const mapCount = parsePosterNumber(payload.cardKind === 'team' ? film.mapCount : source.mapCount)

  if (payload.cardKind === 'player') {
    const proofLine = getCinemaPlayerProofLine(source, locale)
    if (locale === 'en-US') {
      return mapCount > 0
        ? `${proofLine}\nCUT INTO ${subject}'S SEASON PICTURE.`
        : `${proofLine} · ROSTER CREDIT\n${subject}'s name remains in this season's roster archive.`
    }
    if (locale === 'ko-KR') {
      return mapCount > 0
        ? `${proofLine}\n${subject}의 시즌 영화로 편집되었습니다.`
        : `로스터 기록 · ${proofLine}\n${subject}의 이름이 이번 시즌 로스터 아카이브에 남았습니다.`
    }
    return mapCount > 0
      ? `${proofLine}\n剪成 ${subject} 的赛季正片。`
      : `阵容收录 · ${proofLine}\n${subject} 的名字，留在了这季的阵容档案里。`
  }

  if (payload.cardKind === 'team' && mapCount > 0) {
    if (locale === 'en-US') return `${mapCount} maps became ${subject}'s season picture.`
    if (locale === 'ko-KR') return `${mapCount}개의 전장이 ${subject}의 시즌 영화가 되었습니다.`
    return `${mapCount} 张地图，构成 ${subject} 的队伍赛季正片。`
  }

  return safeText(source.memory?.title || payload.signatureTitle, copy.defaultLogline)
}

export function getCinemaTicketData(payload) {
  const source = payload.playerTicket || payload.identityTicket || {}
  const film = getFilmPosterData(payload)
  const directorCut = payload.directorCut || {}
  const locale = payload.locale || 'zh-CN'
  const copy = getCinemaTicketCopy(locale)
  if (payload.isPartner) {
    copy.selection = locale === 'en-US' ? 'PARTNER ARCHIVE'
      : locale === 'ko-KR' ? '파트너 대회 아카이브 / PARTNER ARCHIVE'
        : locale === 'zh-TW' ? '合作賽事檔案 / PARTNER ARCHIVE' : '合作赛事档案 / PARTNER ARCHIVE'
  }
  const sourceStats = safeArr(source.stats)
  let stats = []

  if (payload.cardKind === 'player') {
    const matchCount = normalizeTicketValue(source.matchCount, '0')
    const mapCount = normalizeTicketValue(source.mapCount, '0')
    const minutes = normalizeTicketValue(source.minutes, '0')
    stats = [
      { label: 'MATCHES', value: matchCount },
      { label: 'MAPS', value: mapCount },
      { label: 'PLAYTIME', value: `${minutes} MIN` }
    ]
  } else if (payload.cardKind === 'team') {
    stats = [
      { label: 'RECORD', value: source.recordText },
      { label: 'MAPS', value: film.mapCount },
      { label: 'FINAL', value: film.finalRank }
    ]
  } else {
    stats = sourceStats.slice(0, 3).map(item => ({
      label: englishStatLabel(item?.label),
      value: item?.value
    }))
  }

  const fallbackStats = [
    { label: 'STAGE', value: source.stage || payload.eventNoun || copy.premiere },
    { label: 'SCREEN', value: payload.seasonMark || 'FCR 2026' },
    { label: 'ARCHIVE', value: payload.archiveId || 'FCR26' }
  ]
  const normalizedStats = stats
    .map(item => ({
      label: localizeCinemaStatLabel(item.label, locale),
      value: normalizeTicketValue(item.value, '')
    }))
    .filter(item => item.value)

  fallbackStats.forEach(item => {
    if (normalizedStats.length >= 3) return
    normalizedStats.push({ label: localizeCinemaStatLabel(item.label, locale), value: item.value })
  })

  const coStars = safeArr(source.coStars).map(stripTicketHash).filter(Boolean).slice(0, 3)
  const featuredCast = safeArr(source.heroes).map(item => stripTicketHash(item?.title)).filter(Boolean).slice(0, 4)
  const rawCredits = payload.cardKind === 'team'
    ? film.rosterNames
    : payload.cardKind === 'player'
      ? [...coStars, ...featuredCast]
      : [...safeArr(source.stamps).map(item => item?.title), film.team]
  const subject = safeText(film.subject, 'SEASON ARCHIVE')
  const creditKeys = new Set()
  const credits = rawCredits
    .map(stripTicketHash)
    .filter(Boolean)
    .filter(value => {
      const key = String(value).trim().toLocaleLowerCase()
      if (!key || key === subject.toLocaleLowerCase() || creditKeys.has(key)) return false
      creditKeys.add(key)
      return true
    })
    .slice(0, 10)
  const dateRange = safeText(source.routeDateRange, '2026 SEASON')
  const showDate = normalizePosterDate(source.firstMatchTime) || source.routeStartLabel || getDateRangeStart(dateRange) || '2026'
  const finalDate = normalizePosterDate(source.lastMatchTime) || source.routeEndLabel || getDateRangeEnd(dateRange) || showDate
  const showtime = getCinemaShowtime(source)
  const participationCount = payload.cardKind === 'player'
    ? source.mapCount
    : payload.cardKind === 'team'
      ? film.mapCount
      : sourceStats.find(item => /MAP|MATCH|地图|比赛/i.test(String(item?.label || '')))?.value
  const rankText = payload.cardKind === 'team' ? film.finalRank : (source.rank || source.dest || film.finalRank)
  const actLabel = getCinemaActLabel(payload, rankText)
  const screen = getCinemaHall(rankText, source.competitionSize, source.recordText || film.recordText, participationCount)
  const gate = getCinemaGate(source.team || film.team, payload.seasonId || 'FCR')
  const row = getCinemaRow(source.role || film.role, payload.cardKind)
  const seat = getCinemaSeat(participationCount)
  const productionName = stripTicketHash(safeText(film.team, payload.eventTitle || 'FRIES CUP')).toLocaleUpperCase('en-US')
  const makeCreditGroup = (label, names) => ({
    label,
    displayLabel: getCinemaCreditDisplayLabel(label, locale),
    names
  })
  const creditGroups = payload.cardKind === 'player'
    ? [
        coStars.length ? makeCreditGroup('CO-STARRING', coStars) : null,
        featuredCast.length ? makeCreditGroup('FEATURING', featuredCast) : null
      ].filter(Boolean)
    : [makeCreditGroup(payload.cardKind === 'team' ? 'ENSEMBLE CAST' : 'CAST', credits)]

  return {
    ...film,
    copy,
    locale,
    title: subject,
    secondary: safeText(
      payload.cardKind === 'team' ? film.team : (source.battleTag || source.teamFullName || source.team || film.subtitle),
      copy.roles[payload.cardKind] || copy.premiere
    ),
    roleLabel: copy.roles[payload.cardKind] || copy.premiere,
    roleCode: getCinemaTicketRoleCode(payload.cardKind),
    kind: payload.cardKind,
    topHero: directorCut.heroName || film.topHero,
    directorCut,
    directorHeroName: directorCut.heroName || '',
    directorHeroNameEn: directorCut.heroNameEn || '',
    directorChoiceLabel: directorCut.choiceLabel || (film.topHero ? 'SIGNATURE HERO' : 'SELECT HERO'),
    dateRange,
    showDate,
    showtime,
    openingCode: getCinemaDateCode(showDate),
    closingCode: getCinemaDateCode(finalDate),
    screen,
    gate,
    row,
    seat,
    stage: safeText(source.stage || payload.eventNoun, copy.premiere),
    actLabel,
    selectionEdition: actLabel || copy.selectionEdition,
    stats: normalizedStats.slice(0, 3),
    credits: credits.length ? credits : [copy.roles[payload.cardKind] || copy.premiere],
    creditGroups: creditGroups.length ? creditGroups : [makeCreditGroup('PRODUCTION', [film.team])],
    productionLine: `A ${productionName} PRODUCTION`,
    cutLabel: getCinemaCut(source, payload.cardKind),
    topMap: stripTicketHash(source.topMap || source.stage || payload.eventNoun || 'SEASON ARCHIVE'),
    locationLine: `ON LOCATION · ${stripTicketHash(source.topMap || source.stage || payload.eventNoun || 'SEASON ARCHIVE')}`,
    formatLine: 'FCRSCOPE 2.39:1 · TEAM COMMS 5.1 · BASED ON RECORDED MATCHES',
    matchResults: safeArr(source.matchResults).map(result => String(result || '').toLocaleUpperCase('en-US')).filter(Boolean),
    note: getCinemaTicketLogline(payload, source, film, copy, locale)
  }
}

function drawCinemaTicketArtwork(ctx, payload, images, accent, x, y, width, height) {
  const heroRender = images.heroRender || null
  const primary = heroRender || images.mainImage || images.teamLogo || null
  const isTeam = payload.cardKind === 'team'
  const isPortrait = payload.cardKind === 'staff' || payload.cardKind === 'caster'
  const title = getFilmPosterData(payload).subject

  ctx.save()
  drawCutCornerRect(ctx, x, y, width, height, 22)
  ctx.clip()

  const field = ctx.createLinearGradient(x, y, x + width, y + height)
  field.addColorStop(0, '#15140e')
  field.addColorStop(0.58, '#090a07')
  field.addColorStop(1, hexToRgba(accent, 0.34))
  ctx.fillStyle = field
  ctx.fillRect(x, y, width, height)
  drawFilmHalftoneField(ctx, x, y, width, height, accent)

  ctx.strokeStyle = 'rgba(6,7,4,0.18)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(x + width * 0.5, y + height * 0.5, Math.min(width, height) * 0.37, 0, Math.PI * 2)
  ctx.stroke()

  if (heroRender) {
    const artworkScale = Math.max(0.85, Math.min(1.4, Number(payload.movieTicketArtwork?.scale) || 1))
    const artworkOffsetY = Math.max(-100, Math.min(80, Number(payload.movieTicketArtwork?.offsetY) || 0))
    ctx.shadowColor = 'rgba(0,0,0,0.48)'
    ctx.shadowBlur = 24
    drawVisibleImageContained(ctx, heroRender, x + 8, y + 12, width - 16, height + 72, {
      alpha: 1,
      scale: artworkScale,
      offsetY: artworkOffsetY
    })
  } else if (isTeam && primary) {
    ctx.shadowColor = 'rgba(0,0,0,0.25)'
    ctx.shadowBlur = 20
    drawVisibleImageContained(ctx, primary, x + 76, y + 62, width - 152, height - 124, { alpha: 0.98 })
  } else if (isPortrait && primary) {
    drawImagePlain(ctx, primary, x, y, width, height, { contain: false, alpha: 0.96 })
  } else if (primary) {
    drawVisibleImageContained(ctx, primary, x + 66, y + 60, width - 132, height - 120, { alpha: 0.95 })
  } else {
    const monogram = String(title || 'FC').replace(/\s+/g, '').slice(0, 2).toLocaleUpperCase('en-US')
    drawText(ctx, 'FRIES CUP ORIGINAL', x + 26, y + 46, {
      font: `900 13px ${FONT_MONO}`,
      fill: accent
    })
    drawText(ctx, monogram, x + width / 2, y + height * 0.58, {
      font: `900 116px ${FONT_SC}`,
      fill: '#fffdf4',
      align: 'center',
      maxWidth: width - 70
    })
    ctx.fillStyle = accent
    ctx.fillRect(x + 28, y + height - 58, width - 56, 5)
  }

  if (images.eventLogo) {
    ctx.save()
    ctx.globalAlpha = 0.11
    drawVisibleImageContained(ctx, images.eventLogo, x + width - 78, y + 22, 52, 52, { alpha: 1 })
    ctx.restore()
  }

  const fade = ctx.createLinearGradient(x, y + height * 0.6, x, y + height)
  fade.addColorStop(0, 'rgba(6,7,4,0)')
  fade.addColorStop(1, 'rgba(6,7,4,0.74)')
  ctx.fillStyle = fade
  ctx.fillRect(x, y, width, height)
  ctx.restore()

  ctx.save()
  ctx.strokeStyle = hexToRgba(accent, 0.7)
  ctx.lineWidth = 3
  drawCutCornerRect(ctx, x, y, width, height, 22)
  ctx.stroke()
  ctx.restore()
}

function drawCinemaTicketTitle(ctx, value, x, y, maxWidth, accent) {
  const lines = splitFilmPosterTitle(value).slice(0, 2)
  const preferredSize = lines.length === 1 ? 92 : 68
  const size = fitFilmPosterTitleSize(ctx, lines, maxWidth, preferredSize, 44)
  const lineHeight = size * 0.9

  lines.forEach((line, index) => {
    const baseline = y + index * lineHeight
    drawText(ctx, line, x + 5, baseline + 4, {
      font: `900 ${size}px ${FONT_SC}`,
      fill: hexToRgba(accent, 0.38),
      maxWidth
    })
    drawText(ctx, line, x, baseline, {
      font: `900 ${size}px ${FONT_SC}`,
      fill: '#fffdf4',
      maxWidth
    })
  })

  return y + ((lines.length - 1) * lineHeight)
}

function getCinemaTicketSelection(data) {
  const finalStat = data.stats.find(item => /FINAL|BILLING|最终|최종/i.test(String(item?.label || '')))
  const selectionValue = data.copy.selectionValues?.[data.kind] || data.roleCode
  const selectionMeta = [
    safeText(data.stage, data.copy.premiere),
    safeText(finalStat?.value, '2026')
  ].filter(Boolean)

  return {
    value: safeText(selectionValue, data.roleCode),
    meta: selectionMeta.join(' · ')
  }
}

function drawCinemaTicketSelectionBadge(ctx, data, x, y, width, height, accent) {
  const selection = getCinemaTicketSelection(data)
  const selectionSize = fitFilmPosterTitleSize(ctx, [selection.value], width - 48, 32, 21)

  ctx.save()
  ctx.fillStyle = 'rgba(255,247,220,0.018)'
  ctx.strokeStyle = 'rgba(255,247,220,0.13)'
  ctx.lineWidth = 1
  drawCutCornerRect(ctx, x, y, width, height, 13)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = accent
  ctx.fillRect(x, y, width, 4)
  ctx.fillRect(x, y, 4, height)

  ctx.strokeStyle = hexToRgba(accent, 0.12)
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.arc(x + width - 38, y + 65, 29, 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(x + width - 38, y + 65, 22, 0, Math.PI * 2)
  ctx.stroke()

  drawText(ctx, data.copy.selection, x + 16, y + 27, {
    font: `900 10px ${FONT_MONO}`,
    fill: accent,
    maxWidth: width - 32
  })
  drawText(ctx, selection.value, x + 16, y + 72, {
    font: `900 ${selectionSize}px ${FONT_SC}`,
    fill: '#fffdf4',
    maxWidth: width - 42
  })
  drawText(ctx, selection.meta, x + 16, y + 99, {
    font: `900 11px ${FONT_SC}`,
    fill: 'rgba(255,247,220,0.76)',
    maxWidth: width - 32
  })
  drawText(ctx, data.selectionEdition, x + 16, y + height - 14, {
    font: `900 8px ${FONT_MONO}`,
    fill: 'rgba(255,247,220,0.5)',
    maxWidth: width - 32
  })
  ctx.restore()
}

function drawCinemaTicketLogline(ctx, data, x, y, width, accent) {
  const height = 66

  ctx.save()
  ctx.fillStyle = 'rgba(255,247,220,0.026)'
  ctx.strokeStyle = 'rgba(255,247,220,0.13)'
  ctx.lineWidth = 1
  ctx.fillRect(x, y, width, height)
  ctx.strokeRect(x, y, width, height)
  ctx.fillStyle = accent
  ctx.fillRect(x, y, 4, height)
  drawText(ctx, data.copy.logline, x + 15, y + 19, {
    font: `900 9px ${FONT_MONO}`,
    fill: accent,
    maxWidth: width - 30
  })
  ctx.font = `800 18px ${FONT_SC}`
  ctx.fillStyle = 'rgba(255,247,220,0.9)'
  wrapCanvasText(ctx, data.note, x + 15, y + 43, width - 30, 21, 2)
  ctx.restore()
}

function drawCinemaTicketSprockets(ctx, startX, endX, y, accent, results = null) {
  const count = 12
  const gap = (endX - startX) / count
  const hasResultRecord = Array.isArray(results)
  const sequence = safeArr(results).slice(0, count)
  const sequenceOffset = Math.max(0, Math.floor((count - sequence.length) / 2))
  ctx.save()
  for (let index = 0; index < count; index += 1) {
    const x = startX + index * gap + 7
    const result = sequence[index - sequenceOffset]
    ctx.fillStyle = hasResultRecord
      ? result === 'W'
        ? hexToRgba(accent, 0.86)
        : result === 'L'
          ? 'rgba(255,247,220,0.22)'
          : 'rgba(255,247,220,0.055)'
      : index % 3 === 0
        ? hexToRgba(accent, 0.78)
        : 'rgba(255,247,220,0.14)'
    drawCutCornerRect(ctx, x, y, gap - 14, 8, 2)
    ctx.fill()
  }
  ctx.restore()
}

function drawCinemaTicketDetails(ctx, data, x, y, width, accent) {
  const items = [
    { label: data.copy.showDate, value: data.showDate },
    { label: data.copy.showtime, value: data.showtime },
    { label: data.copy.screen, value: data.screen },
    { label: data.copy.row, value: data.row },
    { label: data.copy.seat, value: data.seat }
  ]
  const columnWidth = width / items.length

  ctx.save()
  ctx.fillStyle = 'rgba(255,247,220,0.025)'
  ctx.fillRect(x, y, width, 80)
  ctx.strokeStyle = 'rgba(255,247,220,0.16)'
  ctx.strokeRect(x, y, width, 80)
  ctx.fillStyle = accent
  ctx.fillRect(x, y, 5, 80)
  items.forEach((item, index) => {
    const cellX = x + index * columnWidth
    if (index > 0) {
      ctx.fillStyle = 'rgba(255,247,220,0.12)'
      ctx.fillRect(cellX, y + 12, 1, 56)
    }
    drawText(ctx, item.label, cellX + 15, y + 26, {
      font: `900 11px ${FONT_MONO}`,
      fill: 'rgba(255,247,220,0.68)',
      maxWidth: columnWidth - 28
    })
    const valueSize = String(item.value || '').length > 8 ? 15 : String(item.value || '').length > 5 ? 18 : 22
    drawText(ctx, item.value, cellX + 15, y + 61, {
      font: `900 ${valueSize}px ${FONT_SC}`,
      fill: '#fffdf4',
      maxWidth: columnWidth - 28
    })
  })
  ctx.restore()
}

function cutCinemaTicketNotches(ctx, ticketX, ticketY, ticketWidth, ticketHeight, stubX) {
  ctx.save()
  ctx.globalCompositeOperation = 'destination-out'
  ctx.fillStyle = '#000000'
  ;[
    [ticketX, ticketY + (ticketHeight / 2), 22],
    [ticketX + ticketWidth, ticketY + (ticketHeight / 2), 22],
    [stubX, ticketY, 21],
    [stubX, ticketY + ticketHeight, 21]
  ].forEach(([x, y, radius]) => {
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.fill()
  })
  ctx.restore()
}

function drawCinemaTicketStub(ctx, width, height, payload, data, images, accent, stubX) {
  const stubWidth = width - stubX - 20
  const centerX = stubX + stubWidth / 2

  ctx.save()
  ctx.fillStyle = accent
  ctx.fillRect(stubX, 20, stubWidth, height - 40)
  ctx.fillStyle = 'rgba(6,7,4,0.09)'
  ctx.fillRect(stubX, 20, stubWidth, height - 40)
  const stubShade = ctx.createLinearGradient(stubX, 20, stubX + stubWidth, height - 20)
  stubShade.addColorStop(0, 'rgba(6,7,4,0)')
  stubShade.addColorStop(0.58, 'rgba(6,7,4,0.045)')
  stubShade.addColorStop(1, 'rgba(6,7,4,0.13)')
  ctx.fillStyle = stubShade
  ctx.fillRect(stubX, 20, stubWidth, height - 40)
  ctx.fillStyle = 'rgba(6,7,4,0.08)'
  drawFilmHalftoneField(ctx, stubX, 20, stubWidth, height - 40, '#060704')

  const seamShade = ctx.createLinearGradient(stubX - 18, 0, stubX + 7, 0)
  seamShade.addColorStop(0, 'rgba(6,7,4,0)')
  seamShade.addColorStop(1, 'rgba(6,7,4,0.25)')
  ctx.fillStyle = seamShade
  ctx.fillRect(stubX - 18, 20, 25, height - 40)

  ctx.setLineDash([8, 8])
  ctx.strokeStyle = 'rgba(6,7,4,0.54)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(stubX, 42)
  ctx.lineTo(stubX, height - 42)
  ctx.stroke()
  ctx.setLineDash([])
  ctx.strokeStyle = 'rgba(255,247,220,0.18)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(stubX + 4, 44)
  ctx.lineTo(stubX + 4, height - 44)
  ctx.stroke()

  drawText(ctx, data.copy.admitOne, centerX, 63, {
    font: `900 13px ${FONT_MONO}`,
    fill: 'rgba(6,7,4,0.74)',
    align: 'center',
    maxWidth: stubWidth - 44
  })
  drawText(ctx, data.copy.premiere, centerX, 96, {
    font: `900 17px ${FONT_SC}`,
    fill: 'rgba(6,7,4,0.68)',
    align: 'center',
    maxWidth: stubWidth - 44
  })

  const stubTitleLines = splitFilmPosterTitle(data.title).slice(0, 2)
  const stubTitleSize = fitFilmPosterTitleSize(ctx, stubTitleLines, stubWidth - 46, 27, 17)
  stubTitleLines.forEach((line, index) => {
    drawText(ctx, line, centerX, 142 + index * (stubTitleSize * 0.92), {
      font: `900 ${stubTitleSize}px ${FONT_SC}`,
      fill: '#060704',
      align: 'center',
      maxWidth: stubWidth - 46
    })
  })

  drawMemorySeal(ctx, centerX, 250, 50, '#060704')
  if (images.eventLogo) {
    ctx.save()
    ctx.filter = 'grayscale(1) brightness(0) contrast(1.5)'
    drawVisibleImageContained(ctx, images.eventLogo, centerX - 31, 219, 62, 62, { alpha: 0.86 })
    ctx.restore()
  } else {
    drawText(ctx, 'FC', centerX, 264, {
      font: `900 36px ${FONT_MONO}`,
      fill: '#060704',
      align: 'center'
    })
  }

  const timeColumnWidth = (stubWidth - 58) / 2
  const doorsCenterX = stubX + 22 + (timeColumnWidth / 2)
  const showtimeCenterX = stubX + stubWidth - 22 - (timeColumnWidth / 2)

  drawText(ctx, data.copy.opening, doorsCenterX, 326, {
    font: `900 9px ${FONT_MONO}`,
    fill: 'rgba(6,7,4,0.48)',
    align: 'center',
    maxWidth: timeColumnWidth - 8
  })
  drawText(ctx, data.copy.closing, showtimeCenterX, 326, {
    font: `900 10px ${FONT_MONO}`,
    fill: 'rgba(6,7,4,0.7)',
    align: 'center',
    maxWidth: timeColumnWidth - 8
  })
  drawText(ctx, data.openingCode, doorsCenterX, 362, {
    font: `900 20px ${FONT_MONO}`,
    fill: 'rgba(6,7,4,0.72)',
    align: 'center',
    maxWidth: timeColumnWidth - 8
  })
  drawText(ctx, data.closingCode, showtimeCenterX, 362, {
    font: `900 27px ${FONT_MONO}`,
    fill: '#060704',
    align: 'center',
    maxWidth: timeColumnWidth - 8
  })
  ctx.fillStyle = 'rgba(6,7,4,0.2)'
  ctx.fillRect(centerX, 315, 1, 54)

  ctx.fillStyle = 'rgba(6,7,4,0.18)'
  ctx.fillRect(stubX + 28, 388, stubWidth - 56, 1)
  drawText(ctx, data.copy.gate, doorsCenterX, 404, {
    font: `900 8px ${FONT_MONO}`,
    fill: 'rgba(6,7,4,0.5)',
    align: 'center',
    maxWidth: timeColumnWidth - 8
  })
  drawText(ctx, data.copy.screen, showtimeCenterX, 404, {
    font: `900 8px ${FONT_MONO}`,
    fill: 'rgba(6,7,4,0.5)',
    align: 'center',
    maxWidth: timeColumnWidth - 8
  })
  drawText(ctx, data.gate, doorsCenterX, 424, {
    font: `900 15px ${FONT_MONO}`,
    fill: '#060704',
    align: 'center',
    maxWidth: timeColumnWidth - 8
  })
  drawText(ctx, data.screen, showtimeCenterX, 424, {
    font: `900 14px ${FONT_MONO}`,
    fill: '#060704',
    align: 'center',
    maxWidth: timeColumnWidth - 8
  })
  ctx.fillStyle = 'rgba(6,7,4,0.055)'
  ctx.fillRect(stubX + 24, 429, stubWidth - 48, 45)
  ctx.strokeStyle = 'rgba(6,7,4,0.15)'
  ctx.strokeRect(stubX + 24, 429, stubWidth - 48, 45)
  drawText(ctx, `${data.copy.row} ${data.row}   ·   ${data.copy.seat} ${data.seat}`, centerX, 458, {
    font: `900 23px ${FONT_SC}`,
    fill: '#060704',
    align: 'center',
    maxWidth: stubWidth - 44
  })

  ctx.fillStyle = 'rgba(6,7,4,0.18)'
  ctx.fillRect(stubX + 28, 480, stubWidth - 56, 1)
  drawText(ctx, data.copy.serial, centerX, 508, {
    font: `900 9px ${FONT_MONO}`,
    fill: 'rgba(6,7,4,0.55)',
    align: 'center'
  })
  drawBarcode(ctx, stubX + 42, 522, stubWidth - 84, 50, '#060704', payload.archiveId)
  drawText(ctx, safeText(payload.archiveId, 'FCR26-ARCHIVE'), centerX, 601, {
    font: `900 14px ${FONT_MONO}`,
    fill: '#060704',
    align: 'center',
    maxWidth: stubWidth - 44
  })
  drawText(ctx, data.copy.commemorative, centerX, 628, {
    font: `900 8px ${FONT_MONO}`,
    fill: 'rgba(6,7,4,0.56)',
    align: 'center',
    maxWidth: stubWidth - 34
  })
  ctx.restore()
}

function drawLandscapeCinemaTicket(ctx, width, height, payload, images, accent) {
  const data = getCinemaTicketData(payload)
  const ticketX = 20
  const ticketY = 20
  const ticketWidth = width - 40
  const ticketHeight = height - 40
  const stubX = width - 278
  const artX = 58
  const artY = 146
  const artWidth = 340
  const artHeight = 318
  const copyX = 438
  const copyWidth = stubX - copyX - 34

  ctx.clearRect(0, 0, width, height)
  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.65)'
  ctx.shadowBlur = 24
  ctx.fillStyle = '#080906'
  drawCutCornerRect(ctx, ticketX, ticketY, ticketWidth, ticketHeight, 24)
  ctx.fill()
  ctx.restore()

  ctx.save()
  ctx.strokeStyle = 'rgba(255,247,220,0.24)'
  ctx.lineWidth = 2
  drawCutCornerRect(ctx, ticketX, ticketY, ticketWidth, ticketHeight, 24)
  ctx.stroke()
  ctx.strokeStyle = 'rgba(255,247,220,0.08)'
  ctx.lineWidth = 1
  drawCutCornerRect(ctx, ticketX + 12, ticketY + 12, ticketWidth - 24, ticketHeight - 24, 18)
  ctx.stroke()
  ctx.fillStyle = hexToRgba(accent, 0.16)
  ctx.fillRect(ticketX, ticketY, ticketWidth, 78)
  ctx.fillStyle = accent
  ctx.fillRect(ticketX, ticketY, 7, ticketHeight)
  ctx.restore()

  const resultStrip = data.kind === 'player' ? data.matchResults : null
  drawCinemaTicketSprockets(ctx, 54, stubX - 40, 31, accent, resultStrip)
  drawCinemaTicketSprockets(ctx, 54, stubX - 40, height - 39, accent, resultStrip)

  drawText(ctx, data.copy.presentedBy, 58, 59, {
    font: `900 15px ${FONT_SC}`,
    fill: accent
  })
  drawText(ctx, data.productionLine, 58, 84, {
    font: `900 12px ${FONT_MONO}`,
    fill: 'rgba(255,247,220,0.72)',
    maxWidth: Math.max(320, copyX + 70)
  })
  drawText(ctx, safeText(payload.archiveId, 'FCR26-ARCHIVE'), stubX - 38, 58, {
    font: `900 15px ${FONT_MONO}`,
    fill: 'rgba(255,247,220,0.68)',
    align: 'right'
  })
  drawText(ctx, data.dateRange, stubX - 38, 83, {
    font: `900 12px ${FONT_MONO}`,
    fill: 'rgba(255,247,220,0.56)',
    align: 'right',
    maxWidth: 330
  })

  drawCinemaTicketArtwork(ctx, payload, images, accent, artX, artY, artWidth, artHeight)

  drawText(ctx, data.copy.feature, copyX, 158, {
    font: `900 13px ${FONT_MONO}`,
    fill: accent
  })
  drawText(ctx, data.roleLabel, copyX + copyWidth, 158, {
    font: `900 12px ${FONT_MONO}`,
    fill: 'rgba(255,247,220,0.68)',
    align: 'right',
    maxWidth: 270
  })
  ctx.fillStyle = 'rgba(255,247,220,0.12)'
  ctx.fillRect(copyX, 174, copyWidth, 1)

  const selectionGap = 20
  const selectionWidth = 200
  const identityWidth = copyWidth - selectionWidth - selectionGap
  const selectionX = copyX + identityWidth + selectionGap
  const titleBottom = drawCinemaTicketTitle(ctx, data.title, copyX, 236, identityWidth, accent)
  drawText(ctx, data.copy.starring, copyX, titleBottom + 28, {
    font: `900 10px ${FONT_MONO}`,
    fill: accent
  })
  const secondarySize = fitFilmPosterTitleSize(ctx, [safeText(data.secondary, '')], identityWidth, 23, 15)
  drawText(ctx, data.secondary, copyX, titleBottom + 43, {
    font: `900 ${secondarySize}px ${FONT_SC}`,
    fill: 'rgba(255,247,220,0.92)',
    maxWidth: identityWidth,
    baseline: 'top'
  })
  ctx.save()
  ctx.fillStyle = 'rgba(255,247,220,0.15)'
  ctx.fillRect(copyX + identityWidth + 4, 201, selectionGap - 8, 1)
  ctx.fillStyle = accent
  ctx.fillRect(copyX + identityWidth + selectionGap - 7, 198, 4, 7)
  ctx.restore()
  drawCinemaTicketSelectionBadge(ctx, data, selectionX, 198, selectionWidth, 126, accent)

  const loglineY = Math.max(348, titleBottom + 82)
  drawCinemaTicketLogline(ctx, data, copyX, loglineY, copyWidth, accent)

  const detailY = loglineY + 76
  drawCinemaTicketDetails(ctx, data, copyX, detailY, copyWidth, accent)

  drawText(ctx, data.cutLabel, artX, 492, {
    font: `900 11px ${FONT_MONO}`,
    fill: accent
  })
  drawText(ctx, data.locationLine, artX + artWidth, 492, {
    font: `900 10px ${FONT_MONO}`,
    fill: 'rgba(255,247,220,0.66)',
    align: 'right',
    maxWidth: artWidth * 0.66
  })

  const statX = artX
  const statY = 506
  const statWidth = artWidth / 3
  data.stats.forEach((item, index) => {
    const x = statX + statWidth * index
    if (index > 0) {
      ctx.fillStyle = 'rgba(255,247,220,0.12)'
      ctx.fillRect(x, statY + 8, 1, 54)
    }
    drawText(ctx, item.label, x + 10, statY + 22, {
      font: `900 11px ${FONT_MONO}`,
      fill: 'rgba(255,247,220,0.72)',
      maxWidth: statWidth - 18
    })
    drawText(ctx, item.value, x + 10, statY + 52, {
      font: `900 22px ${FONT_SC}`,
      fill: '#fffdf4',
      maxWidth: statWidth - 18
    })
  })

  drawText(ctx, data.copy.credits, copyX, 560, {
    font: `900 11px ${FONT_MONO}`,
    fill: accent
  })
  safeArr(data.creditGroups).slice(0, 2).forEach((group, index) => {
    const lineY = 584 + index * 20
    drawText(ctx, group.label, copyX, lineY, {
      font: `900 9px ${FONT_MONO}`,
      fill: 'rgba(255,247,220,0.48)',
      maxWidth: 92
    })
    drawText(ctx, safeArr(group.names).map(stripTicketHash).filter(Boolean).join('  ·  '), copyX + 98, lineY, {
      font: `900 14px ${FONT_SC}`,
      fill: 'rgba(255,247,220,0.88)',
      maxWidth: copyWidth - 98
    })
  })

  drawText(ctx, data.formatLine, stubX - 38, height - 50, {
    font: `900 9px ${FONT_MONO}`,
    fill: 'rgba(255,247,220,0.58)',
    align: 'right',
    maxWidth: stubX - 160
  })

  drawCinemaTicketStub(ctx, width, height, payload, data, images, accent, stubX)
  ctx.save()
  drawCutCornerRect(ctx, ticketX, ticketY, ticketWidth, ticketHeight, 24)
  ctx.clip()
  drawClassicPosterGrain(ctx, width, height, `${payload.archiveId}-MOVIE-TICKET`)
  ctx.restore()
  cutCinemaTicketNotches(ctx, ticketX, ticketY, ticketWidth, ticketHeight, stubX)
}

function drawCinemaTicketPoster(ctx, payload, images, accent) {
  const width = ctx.canvas.width
  const height = ctx.canvas.height
  const ticketWidth = 1520
  const ticketHeight = 680
  const ticket = document.createElement('canvas')
  const ticketCtx = getPosterLocaleContext(ticket, payload)

  ticket.width = ticketWidth
  ticket.height = ticketHeight
  ctx.fillStyle = CARD_BG
  ctx.fillRect(0, 0, width, height)

  const glow = ctx.createRadialGradient(width * 0.63, height * 0.32, 0, width * 0.63, height * 0.32, 760)
  glow.addColorStop(0, hexToRgba(accent, 0.15))
  glow.addColorStop(0.48, hexToRgba(accent, 0.045))
  glow.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, width, height)
  drawGrid(ctx, width, height)

  drawLandscapeCinemaTicket(ticketCtx, ticketWidth, ticketHeight, payload, images, accent)

  const scale = Math.min((width - 240) / ticketWidth, (height - 160) / ticketHeight)
  const drawWidth = ticketWidth * scale
  const drawHeight = ticketHeight * scale
  const drawX = (width - drawWidth) / 2
  const drawY = (height - drawHeight) / 2

  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.58)'
  ctx.shadowBlur = 34
  ctx.drawImage(ticket, drawX, drawY, drawWidth, drawHeight)
  ctx.restore()
}

function createDirectorCutRandom(key = 'DIRECTORS CUT') {
  let seed = 2166136261
  for (const char of String(key || 'DIRECTORS CUT')) {
    seed ^= char.charCodeAt(0)
    seed = Math.imul(seed, 16777619)
  }

  return () => {
    seed = Math.imul(seed ^ (seed >>> 15), 2246822519)
    seed = Math.imul(seed ^ (seed >>> 13), 3266489917)
    return ((seed ^= seed >>> 16) >>> 0) / 4294967296
  }
}

function drawDirectorCutHeroSignature(ctx, motif, options) {
  const signature = String(motif?.signature || '').trim()
  if (!signature) return

  const {
    x,
    width,
    height,
    centerX,
    centerY,
    accent,
    secondary,
    motifAlpha,
    phase
  } = options
  const signatureStrength = Math.max(0.72, Math.min(1.32, Number(motif?.signatureStrength) || 1))
  const signatureAlpha = value => motifAlpha(value * signatureStrength)
  const signatureHighlight = motif?.signatureHighlight || motif?.story?.highlight || secondary
  const rawSignatureX = Number(motif?.signatureX)
  const rawSignatureY = Number(motif?.signatureY)
  const signatureOffsetX = Number.isFinite(rawSignatureX) ? width * rawSignatureX : 0
  const signatureOffsetY = Number.isFinite(rawSignatureY) ? height * rawSignatureY : 0
  const setStroke = (color = secondary, alpha = 0.16, lineWidth = 2) => {
    ctx.strokeStyle = hexToRgba(color, signatureAlpha(alpha))
    ctx.lineWidth = lineWidth
  }
  const drawPolygon = (pointX, pointY, radius, sides, rotation = 0) => {
    ctx.beginPath()
    for (let index = 0; index <= sides; index += 1) {
      const angle = rotation + ((Math.PI * 2 * index) / sides)
      const vertexX = pointX + Math.cos(angle) * radius
      const vertexY = pointY + Math.sin(angle) * radius
      if (index === 0) ctx.moveTo(vertexX, vertexY)
      else ctx.lineTo(vertexX, vertexY)
    }
    ctx.closePath()
  }

  ctx.save()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  if (signature === 'aegis') {
    const shieldX = centerX + width * 0.01
    const shieldY = centerY + height * 0.01
    ;[1, 0.78, 0.56].forEach((scale, index) => {
      const shieldWidth = width * 0.22 * scale
      const shieldHeight = height * 0.43 * scale
      ctx.beginPath()
      ctx.moveTo(shieldX, shieldY - shieldHeight * 0.52)
      ctx.lineTo(shieldX + shieldWidth * 0.48, shieldY - shieldHeight * 0.28)
      ctx.lineTo(shieldX + shieldWidth * 0.38, shieldY + shieldHeight * 0.28)
      ctx.quadraticCurveTo(shieldX, shieldY + shieldHeight * 0.58, shieldX, shieldY + shieldHeight * 0.58)
      ctx.quadraticCurveTo(shieldX, shieldY + shieldHeight * 0.58, shieldX - shieldWidth * 0.38, shieldY + shieldHeight * 0.28)
      ctx.lineTo(shieldX - shieldWidth * 0.48, shieldY - shieldHeight * 0.28)
      ctx.closePath()
      setStroke(index === 0 ? secondary : accent, index === 0 ? 0.25 : 0.11, index === 0 ? 3 : 1)
      ctx.stroke()
    })
    for (let band = -3; band <= 3; band += 1) {
      const bandY = shieldY + band * 34
      setStroke(band === 0 ? secondary : accent, band === 0 ? 0.22 : 0.075, band === 0 ? 3 : 1)
      ctx.beginPath()
      ctx.moveTo(x + 40, bandY)
      ctx.lineTo(shieldX - width * 0.11, bandY)
      ctx.moveTo(shieldX + width * 0.11, bandY)
      ctx.lineTo(x + width * 0.72, bandY)
      ctx.stroke()
    }
    ;[-1, 1].forEach(direction => {
      ctx.beginPath()
      ctx.arc(shieldX + direction * width * 0.11, shieldY, 11, 0, Math.PI * 2)
      setStroke(secondary, 0.24, 3)
      ctx.stroke()
    })
  } else if (signature === 'sentinel') {
    const horizonY = centerY + height * 0.13
    setStroke(secondary, 0.23, 3)
    ctx.beginPath()
    ctx.moveTo(x + 42, horizonY)
    ctx.lineTo(x + width * 0.75, horizonY)
    ctx.stroke()
    ;[86, 148, 224].forEach((radius, index) => {
      ctx.beginPath()
      ctx.arc(centerX, horizonY, radius, Math.PI, Math.PI * 2)
      setStroke(index === 1 ? secondary : accent, index === 1 ? 0.2 : 0.09, index === 1 ? 3 : 1)
      ctx.stroke()
    })
    for (let ray = 0; ray <= 10; ray += 1) {
      const angle = Math.PI + (Math.PI * ray) / 10
      const inner = 52
      const outer = ray % 2 === 0 ? 270 : 236
      setStroke(ray % 2 === 0 ? secondary : accent, ray % 2 === 0 ? 0.13 : 0.07, ray % 2 === 0 ? 2 : 1)
      ctx.beginPath()
      ctx.moveTo(centerX + Math.cos(angle) * inner, horizonY + Math.sin(angle) * inner)
      ctx.lineTo(centerX + Math.cos(angle) * outer, horizonY + Math.sin(angle) * outer)
      ctx.stroke()
    }
    for (let chevron = -2; chevron <= 2; chevron += 1) {
      const chevronX = centerX + chevron * 76
      setStroke(accent, chevron === 0 ? 0.19 : 0.09, chevron === 0 ? 3 : 1)
      ctx.beginPath()
      ctx.moveTo(chevronX - 28, horizonY + 36)
      ctx.lineTo(chevronX, horizonY + 58)
      ctx.lineTo(chevronX + 28, horizonY + 36)
      ctx.stroke()
    }
  } else if (signature === 'gravity-score') {
    ctx.save()
    ctx.translate(centerX, centerY)
    ctx.rotate(-0.08)
    for (let staff = -2; staff <= 2; staff += 1) {
      setStroke(staff === 0 ? secondary : accent, staff === 0 ? 0.18 : 0.07, staff === 0 ? 2 : 1)
      ctx.beginPath()
      ctx.moveTo(-width * 0.34, staff * 28)
      ctx.lineTo(width * 0.34, staff * 28)
      ctx.stroke()
    }
    ;[92, 156, 226, 298].forEach((radius, index) => {
      setStroke(index % 2 === 0 ? secondary : accent, index === 1 ? 0.21 : 0.1, index === 1 ? 3 : 1)
      ctx.beginPath()
      ctx.ellipse(0, 0, radius, radius * (0.38 + index * 0.025), phase + index * 0.18, 0, Math.PI * 2)
      ctx.stroke()
    })
    for (let note = 0; note < 9; note += 1) {
      const angle = phase + (note / 9) * Math.PI * 2
      const radius = 150 + (note % 3) * 44
      const noteX = Math.cos(angle) * radius
      const noteY = Math.sin(angle) * radius * 0.44
      ctx.fillStyle = hexToRgba(note % 3 === 0 ? secondary : accent, signatureAlpha(note % 3 === 0 ? 0.24 : 0.12))
      ctx.fillRect(noteX - 6, noteY - 6, 12, 12)
      ctx.fillRect(noteX + 4, noteY - 30, 3, 28)
    }
    ctx.restore()
  } else if (signature === 'breach-scan') {
    const scanX = centerX - width * 0.02
    const scanY = centerY - height * 0.02
    const frameWidth = width * 0.43
    const frameHeight = height * 0.48
    const corner = 58
    ;[-1, 1].forEach(horizontal => {
      ;[-1, 1].forEach(vertical => {
        const cornerX = scanX + horizontal * frameWidth * 0.5
        const cornerY = scanY + vertical * frameHeight * 0.5
        setStroke(horizontal === vertical ? secondary : accent, horizontal === vertical ? 0.21 : 0.1, horizontal === vertical ? 3 : 1)
        ctx.beginPath()
        ctx.moveTo(cornerX - horizontal * corner, cornerY)
        ctx.lineTo(cornerX, cornerY)
        ctx.lineTo(cornerX, cornerY - vertical * corner)
        ctx.stroke()
      })
    })
    ctx.setLineDash([18, 13])
    for (let sweep = -2; sweep <= 2; sweep += 1) {
      setStroke(sweep === 0 ? secondary : accent, sweep === 0 ? 0.22 : 0.07, sweep === 0 ? 3 : 1)
      ctx.beginPath()
      ctx.moveTo(scanX - frameWidth * 0.58, scanY + sweep * 46 + 120)
      ctx.lineTo(scanX + frameWidth * 0.58, scanY + sweep * 46 - 120)
      ctx.stroke()
    }
    ctx.setLineDash([])
    ;[46, 84, 126].forEach((radius, index) => {
      setStroke(index === 1 ? secondary : accent, index === 1 ? 0.2 : 0.09, index === 1 ? 3 : 1)
      ctx.beginPath()
      ctx.arc(scanX, scanY, radius, -0.82 * Math.PI, 0.82 * Math.PI)
      ctx.stroke()
    })
  } else if (signature === 'crusader-vow') {
    const crestX = centerX
    const crestY = centerY + height * 0.015
    const shieldWidth = width * 0.24
    const shieldHeight = height * 0.5
    ;[1, 0.76, 0.52].forEach((scale, index) => {
      ctx.beginPath()
      ctx.moveTo(crestX, crestY - shieldHeight * 0.5 * scale)
      ctx.lineTo(crestX + shieldWidth * 0.48 * scale, crestY - shieldHeight * 0.25 * scale)
      ctx.lineTo(crestX + shieldWidth * 0.38 * scale, crestY + shieldHeight * 0.25 * scale)
      ctx.quadraticCurveTo(crestX, crestY + shieldHeight * 0.58 * scale, crestX, crestY + shieldHeight * 0.58 * scale)
      ctx.quadraticCurveTo(crestX, crestY + shieldHeight * 0.58 * scale, crestX - shieldWidth * 0.38 * scale, crestY + shieldHeight * 0.25 * scale)
      ctx.lineTo(crestX - shieldWidth * 0.48 * scale, crestY - shieldHeight * 0.25 * scale)
      ctx.closePath()
      setStroke(index === 0 ? secondary : accent, index === 0 ? 0.24 : 0.095, index === 0 ? 3 : 1)
      ctx.stroke()
    })

    ctx.save()
    ctx.translate(crestX, crestY)
    ctx.rotate(-0.18)
    setStroke(secondary, 0.22, 3)
    ctx.beginPath()
    ctx.moveTo(0, -shieldHeight * 0.36)
    ctx.lineTo(0, shieldHeight * 0.38)
    ctx.stroke()
    ctx.strokeRect(-shieldWidth * 0.24, -shieldHeight * 0.34, shieldWidth * 0.48, shieldHeight * 0.14)
    ctx.restore()

    for (let ray = -2; ray <= 2; ray += 1) {
      const angle = -Math.PI / 2 + ray * 0.24
      const inner = shieldHeight * 0.32
      const outer = shieldHeight * (ray === 0 ? 0.62 : 0.54)
      setStroke(ray === 0 ? secondary : accent, ray === 0 ? 0.19 : 0.075, ray === 0 ? 3 : 1)
      ctx.beginPath()
      ctx.moveTo(crestX + Math.cos(angle) * inner, crestY + Math.sin(angle) * inner)
      ctx.lineTo(crestX + Math.cos(angle) * outer, crestY + Math.sin(angle) * outer)
      ctx.stroke()
    }
  } else if (signature === 'outback-chain') {
    const undertowX = centerX + width * 0.075 + signatureOffsetX
    const undertowY = centerY + height * 0.015 + signatureOffsetY
    const rust = '#8f573b'
    const steel = '#8fa0a2'

    const corrosionWash = ctx.createRadialGradient(
      undertowX,
      undertowY,
      28,
      undertowX,
      undertowY,
      width * 0.42
    )
    corrosionWash.addColorStop(0, hexToRgba(signatureHighlight, signatureAlpha(0.052)))
    corrosionWash.addColorStop(0.46, hexToRgba(rust, signatureAlpha(0.03)))
    corrosionWash.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = corrosionWash
    ctx.fillRect(x + width * 0.12, undertowY - height * 0.48, width * 0.82, height * 0.96)

    // The hook is the poster's dominant movement: it rises out of the irradiated
    // Outback instead of sitting in the frame like a literal inventory icon.
    setStroke(steel, 0.18, 4)
    ctx.beginPath()
    ctx.moveTo(undertowX - width * 0.34, undertowY + height * 0.36)
    ctx.bezierCurveTo(
      undertowX - width * 0.13,
      undertowY + height * 0.18,
      undertowX + width * 0.15,
      undertowY - height * 0.18,
      undertowX + width * 0.27,
      undertowY - height * 0.3
    )
    ctx.stroke()
    setStroke(signatureHighlight, 0.17, 3)
    ctx.beginPath()
    ctx.arc(
      undertowX + width * 0.22,
      undertowY - height * 0.23,
      height * 0.13,
      Math.PI * 1.08,
      Math.PI * 2.12
    )
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(undertowX + width * 0.14, undertowY - height * 0.32)
    ctx.lineTo(undertowX + width * 0.31, undertowY - height * 0.37)
    ctx.lineTo(undertowX + width * 0.27, undertowY - height * 0.25)
    ctx.stroke()

    const linkRadius = Math.max(10, Math.min(width, height) * 0.038)
    for (let link = 0; link < 9; link += 1) {
      const progress = link / 8
      const linkX = undertowX - width * 0.31 + progress * width * 0.49
      const linkY = undertowY + height * 0.32 - progress * height * 0.48 - Math.sin(progress * Math.PI) * height * 0.075
      const tangent = -0.46 - Math.cos(progress * Math.PI) * 0.18
      ctx.save()
      ctx.translate(linkX, linkY)
      ctx.rotate(tangent + (link % 2 === 0 ? -0.42 : 0.42))
      setStroke(link === 6 ? signatureHighlight : link % 2 === 0 ? steel : secondary, link === 6 ? 0.24 : 0.105, link === 6 ? 3 : 1.5)
      ctx.beginPath()
      ctx.ellipse(0, 0, linkRadius * 0.86, linkRadius * 0.44, 0, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()
    }

    // Respirator pressure gauge: a technical counterweight in the copy field.
    const gaugeX = undertowX + width * 0.18
    const gaugeY = undertowY + height * 0.11
    const gaugeRadius = Math.min(width, height) * 0.105
    ;[1, 0.74].forEach((ratio, index) => {
      setStroke(index === 0 ? steel : signatureHighlight, index === 0 ? 0.1 : 0.16, index === 0 ? 1.5 : 2.5)
      ctx.beginPath()
      ctx.arc(gaugeX, gaugeY, gaugeRadius * ratio, Math.PI * 0.74, Math.PI * 2.26)
      ctx.stroke()
    })
    for (let tick = 0; tick < 13; tick += 1) {
      const angle = Math.PI * 0.78 + (tick / 12) * Math.PI * 1.44
      const inner = gaugeRadius * (tick % 3 === 0 ? 0.67 : 0.75)
      const outer = gaugeRadius * 0.9
      setStroke(tick === 8 ? rust : tick % 3 === 0 ? signatureHighlight : steel, tick === 8 ? 0.22 : tick % 3 === 0 ? 0.12 : 0.065, tick === 8 ? 2.5 : 1)
      ctx.beginPath()
      ctx.moveTo(gaugeX + Math.cos(angle) * inner, gaugeY + Math.sin(angle) * inner)
      ctx.lineTo(gaugeX + Math.cos(angle) * outer, gaugeY + Math.sin(angle) * outer)
      ctx.stroke()
    }
    setStroke(rust, 0.22, 2.5)
    ctx.beginPath()
    ctx.moveTo(gaugeX, gaugeY)
    ctx.lineTo(gaugeX + gaugeRadius * 0.52, gaugeY - gaugeRadius * 0.32)
    ctx.stroke()

    ctx.save()
    ctx.translate(undertowX + width * 0.3, undertowY - height * 0.05)
    ctx.rotate(-0.32)
    ;[-1, 0, 1].forEach((band, index) => {
      ctx.fillStyle = hexToRgba(index === 0 ? rust : signatureHighlight, signatureAlpha(index === 0 ? 0.07 : 0.035))
      ctx.fillRect(-width * 0.08 + band * width * 0.045, -height * 0.38, width * 0.022, height * 0.76)
    })
    ctx.restore()
  } else if (signature === 'blackwatch-wraith') {
    const wraithX = centerX - width * 0.015 + signatureOffsetX
    const wraithY = centerY + height * 0.015 + signatureOffsetY
    const voidWash = ctx.createRadialGradient(wraithX, wraithY, 28, wraithX, wraithY, width * 0.38)
    voidWash.addColorStop(0, hexToRgba('#050609', signatureAlpha(0.28)))
    voidWash.addColorStop(0.56, hexToRgba('#050609', signatureAlpha(0.12)))
    voidWash.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = voidWash
    ctx.fillRect(x, wraithY - height * 0.46, width * 0.78, height * 0.92)

    for (let stream = -3; stream <= 3; stream += 1) {
      const streamY = wraithY + stream * 38
      setStroke(stream === 0 ? secondary : accent, stream === 0 ? 0.22 : 0.07, stream === 0 ? 3 : 1)
      ctx.beginPath()
      ctx.moveTo(x - 30, streamY + 62)
      ctx.bezierCurveTo(
        wraithX - width * 0.28,
        streamY - 104,
        wraithX + width * 0.16,
        streamY + 90,
        x + width * 0.74,
        streamY - 46
      )
      ctx.stroke()
    }

    ctx.save()
    ctx.translate(wraithX, wraithY)
    ctx.rotate(-0.23)
    ;[-142, -58, 36, 128].forEach((offset, index) => {
      ctx.fillStyle = hexToRgba(index === 1 ? signatureHighlight : secondary, signatureAlpha(index === 1 ? 0.14 : 0.04))
      ctx.fillRect(-width * 0.36, offset, width * 0.72, index === 1 ? 8 : 3)
    })
    ctx.restore()

    setStroke(signatureHighlight, 0.24, 3)
    ctx.beginPath()
    ctx.moveTo(wraithX - 190, wraithY - 214)
    ctx.lineTo(wraithX - 58, wraithY - 68)
    ctx.lineTo(wraithX - 102, wraithY - 12)
    ctx.lineTo(wraithX + 34, wraithY + 64)
    ctx.lineTo(wraithX + 4, wraithY + 168)
    ctx.lineTo(wraithX + 202, wraithY + 104)
    ctx.stroke()

    ;[-1, 1].forEach(direction => {
      setStroke(direction < 0 ? secondary : accent, direction < 0 ? 0.2 : 0.09, direction < 0 ? 3 : 1)
      ctx.beginPath()
      ctx.moveTo(wraithX + direction * 36, wraithY - 142)
      ctx.lineTo(wraithX + direction * 122, wraithY - 72)
      ctx.lineTo(wraithX + direction * 96, wraithY + 92)
      ctx.lineTo(wraithX + direction * 34, wraithY + 148)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(wraithX + direction * 80, wraithY + 92)
      ctx.lineTo(wraithX + direction * 248, wraithY + 214)
      ctx.stroke()
    })
  } else if (signature === 'conspiracy-void') {
    const voidX = centerX + width * 0.018 + signatureOffsetX
    const voidY = centerY - height * 0.018 + signatureOffsetY
    const voidRadius = Math.min(width, height) * 0.39
    const voidWash = ctx.createRadialGradient(voidX, voidY, 24, voidX, voidY, voidRadius)
    voidWash.addColorStop(0, hexToRgba('#040209', signatureAlpha(0.36)))
    voidWash.addColorStop(0.5, hexToRgba('#040209', signatureAlpha(0.2)))
    voidWash.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = voidWash
    ctx.fillRect(voidX - voidRadius, voidY - voidRadius, voidRadius * 2, voidRadius * 2)

    const nodes = [
      [-0.42, -0.28], [-0.29, 0.19], [-0.11, -0.18], [0.08, 0.24],
      [0.26, -0.22], [0.43, 0.13], [0.5, -0.05]
    ].map(([nodeX, nodeY]) => [voidX + width * nodeX, voidY + height * nodeY])
    setStroke(accent, 0.065, 1)
    ctx.beginPath()
    nodes.forEach(([nodeX, nodeY], index) => {
      if (index === 0) ctx.moveTo(nodeX, nodeY)
      else ctx.lineTo(nodeX, nodeY)
    })
    ctx.stroke()
    nodes.forEach(([nodeX, nodeY], index) => {
      const selected = index === 2 || index === 3
      setStroke(index === 2 ? signatureHighlight : index === 3 ? secondary : accent, selected ? 0.25 : 0.09, selected ? 3 : 1)
      ctx.beginPath()
      ctx.arc(nodeX, nodeY, selected ? 10 : 6, 0, Math.PI * 2)
      ctx.stroke()
    })

    ;[-158, -74, 26, 118].forEach((offset, index) => {
      const fromLeft = index % 2 === 0
      setStroke(index === 1 ? signatureHighlight : secondary, index === 1 ? 0.23 : 0.1, index === 1 ? 4 : 2)
      ctx.beginPath()
      ctx.moveTo(fromLeft ? x + 24 : voidX + 62, voidY + offset)
      ctx.lineTo(fromLeft ? voidX - 48 : x + width * 0.76, voidY + offset)
      ctx.stroke()
    })

    setStroke(secondary, 0.22, 3)
    ctx.beginPath()
    ctx.moveTo(voidX - 248, voidY + 2)
    ctx.quadraticCurveTo(voidX - 86, voidY - 170, voidX + 34, voidY - 112)
    ctx.moveTo(voidX + 92, voidY - 76)
    ctx.quadraticCurveTo(voidX + 188, voidY - 42, voidX + 248, voidY + 2)
    ctx.stroke()
    setStroke(accent, 0.1, 1)
    ctx.beginPath()
    ctx.moveTo(voidX - 248, voidY + 2)
    ctx.quadraticCurveTo(voidX - 94, voidY + 154, voidX - 18, voidY + 116)
    ctx.moveTo(voidX + 42, voidY + 106)
    ctx.quadraticCurveTo(voidX + 172, voidY + 72, voidX + 248, voidY + 2)
    ctx.stroke()
    drawPolygon(voidX, voidY, 22, 3, -Math.PI / 2)
    setStroke(signatureHighlight, 0.28, 3)
    ctx.stroke()
  } else if (signature === 'scope') {
    const scopeX = centerX + width * 0.035 + signatureOffsetX
    const scopeY = centerY - height * 0.015 + signatureOffsetY
    const lens = ctx.createRadialGradient(scopeX, scopeY, 20, scopeX, scopeY, 248)
    lens.addColorStop(0, hexToRgba(signatureHighlight, signatureAlpha(0.075)))
    lens.addColorStop(0.48, hexToRgba(secondary, signatureAlpha(0.026)))
    lens.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = lens
    ctx.fillRect(scopeX - 260, scopeY - 260, 520, 520)
    ;[72, 132, 204].forEach((radius, index) => {
      setStroke(index === 1 ? secondary : accent, index === 1 ? 0.24 : 0.1, index === 1 ? 3 : 1)
      ctx.beginPath()
      ctx.arc(scopeX, scopeY, radius, 0, Math.PI * 2)
      ctx.stroke()
    })
    for (let tick = 0; tick < 32; tick += 1) {
      const angle = (tick / 32) * Math.PI * 2
      const inner = tick % 4 === 0 ? 222 : 232
      const outer = 248
      setStroke(tick % 4 === 0 ? secondary : accent, tick % 4 === 0 ? 0.18 : 0.07, tick % 4 === 0 ? 3 : 1)
      ctx.beginPath()
      ctx.moveTo(scopeX + Math.cos(angle) * inner, scopeY + Math.sin(angle) * inner)
      ctx.lineTo(scopeX + Math.cos(angle) * outer, scopeY + Math.sin(angle) * outer)
      ctx.stroke()
    }
    for (let web = 0; web < 8; web += 1) {
      const angle = -Math.PI / 2 + (web / 8) * Math.PI * 2
      const inner = web % 2 === 0 ? 92 : 132
      const outer = web % 2 === 0 ? 314 : 282
      setStroke(web === 0 ? signatureHighlight : web % 2 === 0 ? secondary : accent, web === 0 ? 0.24 : web % 2 === 0 ? 0.12 : 0.055, web === 0 ? 3 : 1)
      ctx.beginPath()
      ctx.moveTo(scopeX + Math.cos(angle) * inner, scopeY + Math.sin(angle) * inner)
      ctx.lineTo(scopeX + Math.cos(angle) * outer, scopeY + Math.sin(angle) * outer)
      ctx.stroke()
    }
    ;[0, Math.PI / 2, Math.PI, Math.PI * 1.5].forEach((rotation, index) => {
      setStroke(index === 0 ? secondary : accent, index === 0 ? 0.17 : 0.07, index === 0 ? 3 : 1)
      ctx.beginPath()
      ctx.arc(scopeX, scopeY, 166 + index * 8, rotation + 0.12, rotation + Math.PI / 2 - 0.12)
      ctx.stroke()
    })
    setStroke(secondary, 0.2, 2)
    ctx.beginPath()
    ctx.moveTo(scopeX - 286, scopeY)
    ctx.lineTo(scopeX - 28, scopeY)
    ctx.moveTo(scopeX + 28, scopeY)
    ctx.lineTo(scopeX + 286, scopeY)
    ctx.moveTo(scopeX, scopeY - 244)
    ctx.lineTo(scopeX, scopeY - 28)
    ctx.moveTo(scopeX, scopeY + 28)
    ctx.lineTo(scopeX, scopeY + 244)
    ctx.stroke()
    drawPolygon(scopeX, scopeY, 18, 4, Math.PI * 0.25)
    setStroke(signatureHighlight, 0.3, 3)
    ctx.stroke()
    ctx.fillStyle = hexToRgba(signatureHighlight, signatureAlpha(0.42))
    ctx.beginPath()
    ctx.arc(scopeX, scopeY, 5, 0, Math.PI * 2)
    ctx.fill()
  } else if (signature === 'field') {
    const fieldX = centerX
    const fieldY = centerY + height * 0.015
    ;[92, 158, 224].forEach((radius, index) => {
      drawPolygon(fieldX, fieldY, radius, 6, Math.PI / 6)
      setStroke(index === 1 ? secondary : accent, index === 1 ? 0.22 : 0.095, index === 1 ? 3 : 1)
      ctx.stroke()
    })
    for (let pillar = -3; pillar <= 3; pillar += 1) {
      const pillarX = fieldX + pillar * 68
      setStroke(pillar === 0 ? secondary : accent, pillar === 0 ? 0.2 : 0.075, pillar === 0 ? 3 : 1)
      ctx.beginPath()
      ctx.moveTo(pillarX, fieldY - 190 + Math.abs(pillar) * 24)
      ctx.lineTo(pillarX, fieldY + 190 - Math.abs(pillar) * 24)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(pillarX, fieldY, pillar === 0 ? 13 : 8, 0, Math.PI * 2)
      ctx.stroke()
    }
  } else if (signature === 'petal-lattice') {
    const petalX = centerX
    const petalY = centerY
    for (let petal = 0; petal < 6; petal += 1) {
      const angle = phase + (petal / 6) * Math.PI * 2
      ctx.save()
      ctx.translate(petalX, petalY)
      ctx.rotate(angle)
      setStroke(petal % 2 === 0 ? secondary : accent, petal % 2 === 0 ? 0.2 : 0.1, petal % 2 === 0 ? 3 : 1)
      ctx.beginPath()
      ctx.ellipse(0, -105, 48, 122, 0, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()
    }
    ;[82, 154, 226].forEach((radius, index) => {
      drawPolygon(petalX, petalY, radius, 6, phase + Math.PI / 6)
      setStroke(index === 1 ? secondary : accent, index === 1 ? 0.17 : 0.065, index === 1 ? 2 : 1)
      ctx.stroke()
    })
    ctx.beginPath()
    ctx.arc(petalX, petalY, 28, 0, Math.PI * 2)
    setStroke(secondary, 0.26, 3)
    ctx.stroke()
  } else if (signature === 'afterimage') {
    const echoX = centerX - width * 0.04
    const echoY = centerY - height * 0.04
    ctx.setLineDash([24, 14])
    for (let echo = 0; echo < 4; echo += 1) {
      const offsetX = echo * 46
      const offsetY = echo * -18
      setStroke(echo === 0 ? secondary : accent, echo === 0 ? 0.22 : 0.075, echo === 0 ? 3 : 1)
      ctx.beginPath()
      ctx.arc(echoX + offsetX, echoY + offsetY, 110 + echo * 24, Math.PI * 1.08, Math.PI * 1.92)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(echoX - 170 + offsetX, echoY + 14 + offsetY)
      ctx.lineTo(echoX + 170 + offsetX, echoY + 14 + offsetY)
      ctx.stroke()
    }
    ctx.setLineDash([])
    for (let trail = -3; trail <= 3; trail += 1) {
      setStroke(trail === 0 ? secondary : accent, trail === 0 ? 0.2 : 0.07, trail === 0 ? 3 : 1)
      ctx.beginPath()
      ctx.moveTo(x + 30, echoY + 180 + trail * 24)
      ctx.quadraticCurveTo(echoX, echoY + trail * 32, x + width * 0.72, echoY - 130 + trail * 18)
      ctx.stroke()
    }
  } else if (signature === 'ravager-vow') {
    const vowX = centerX + width * 0.015 + signatureOffsetX
    const vowY = centerY - height * 0.01 + signatureOffsetY
    const vowRadius = Math.min(width, height) * 0.34
    const vowWash = ctx.createRadialGradient(vowX, vowY, 24, vowX, vowY, vowRadius * 1.4)
    vowWash.addColorStop(0, hexToRgba(signatureHighlight, signatureAlpha(0.055)))
    vowWash.addColorStop(0.52, hexToRgba(secondary, signatureAlpha(0.026)))
    vowWash.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = vowWash
    ctx.fillRect(vowX - vowRadius * 1.5, vowY - vowRadius, vowRadius * 3, vowRadius * 2)

    ;[72, 132, 206, 282].forEach((radius, index) => {
      setStroke(index === 1 ? signatureHighlight : secondary, index === 1 ? 0.22 : index === 2 ? 0.11 : 0.055, index === 1 ? 3 : index === 2 ? 2 : 1)
      ctx.setLineDash(index === 3 ? [18, 14] : [])
      ctx.beginPath()
      ctx.ellipse(vowX - 82, vowY, radius, radius * 0.78, 0.02, Math.PI * 0.62, Math.PI * 2.36)
      ctx.stroke()
    })
    ctx.setLineDash([])
    for (let bead = 0; bead < 12; bead += 1) {
      const angle = -Math.PI * 0.82 + (bead / 11) * Math.PI * 1.64
      const beadX = vowX - 82 + Math.cos(angle) * 208
      const beadY = vowY + Math.sin(angle) * 164
      ctx.fillStyle = hexToRgba(bead % 3 === 0 ? signatureHighlight : secondary, signatureAlpha(bead % 3 === 0 ? 0.24 : 0.11))
      ctx.beginPath()
      ctx.arc(beadX, beadY, bead % 3 === 0 ? 6 : 4, 0, Math.PI * 2)
      ctx.fill()
    }

    setStroke(signatureHighlight, 0.24, 3)
    ctx.beginPath()
    ctx.moveTo(vowX + 16, vowY - 248)
    ctx.lineTo(vowX + 16, vowY + 246)
    ctx.stroke()
    ;[-126, -42, 48, 138].forEach((offset, index) => {
      const chevronX = vowX + 74 + index * 26
      setStroke(index === 1 ? signatureHighlight : secondary, index === 1 ? 0.2 : 0.085, index === 1 ? 3 : 1)
      ctx.beginPath()
      ctx.moveTo(chevronX, vowY + offset - 28)
      ctx.lineTo(chevronX + 54, vowY + offset)
      ctx.lineTo(chevronX, vowY + offset + 28)
      ctx.lineTo(x + width * 0.76, vowY + offset + 28)
      ctx.stroke()
    })
    ;[-1, 1].forEach(direction => {
      setStroke(direction < 0 ? secondary : signatureHighlight, direction < 0 ? 0.13 : 0.19, direction < 0 ? 2 : 3)
      ctx.beginPath()
      ctx.moveTo(vowX + direction * 34, vowY - 112)
      ctx.lineTo(vowX + direction * 104, vowY - 58)
      ctx.lineTo(vowX + direction * 88, vowY + 94)
      ctx.lineTo(vowX + direction * 30, vowY + 142)
      ctx.stroke()
    })
  } else if (signature === 'redacted-wraith') {
    const wraithX = centerX - width * 0.01 + signatureOffsetX
    const wraithY = centerY - height * 0.02 + signatureOffsetY
    const pearlWash = ctx.createRadialGradient(wraithX - 40, wraithY, 18, wraithX - 40, wraithY, width * 0.34)
    pearlWash.addColorStop(0, hexToRgba(secondary, signatureAlpha(0.055)))
    pearlWash.addColorStop(0.56, hexToRgba(secondary, signatureAlpha(0.018)))
    pearlWash.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = pearlWash
    ctx.fillRect(x, wraithY - height * 0.48, width * 0.76, height * 0.96)

    for (let veil = -3; veil <= 3; veil += 1) {
      const veilY = wraithY + veil * 34
      setStroke(veil === 0 ? secondary : accent, veil === 0 ? 0.2 : 0.055, veil === 0 ? 3 : 1)
      ctx.beginPath()
      ctx.moveTo(x - 18, veilY + 72)
      ctx.bezierCurveTo(wraithX - width * 0.22, veilY - 124, wraithX + width * 0.16, veilY + 98, x + width * 0.75, veilY - 58)
      ctx.stroke()
    }

    ctx.save()
    ctx.translate(wraithX, wraithY)
    ctx.rotate(-0.18)
    ;[-154, -68, 28, 122].forEach((offset, index) => {
      ctx.fillStyle = hexToRgba(index === 1 ? signatureHighlight : secondary, signatureAlpha(index === 1 ? 0.2 : 0.045))
      ctx.fillRect(-width * 0.39, offset, index === 1 ? width * 0.58 : width * 0.76, index === 1 ? 9 : 3)
    })
    ctx.restore()

    setStroke(secondary, 0.21, 3)
    ctx.beginPath()
    ctx.moveTo(wraithX, wraithY - 218)
    ctx.lineTo(wraithX + 126, wraithY - 136)
    ctx.lineTo(wraithX + 144, wraithY + 58)
    ctx.lineTo(wraithX + 54, wraithY + 190)
    ctx.lineTo(wraithX, wraithY + 136)
    ctx.lineTo(wraithX - 54, wraithY + 190)
    ctx.lineTo(wraithX - 144, wraithY + 58)
    ctx.lineTo(wraithX - 126, wraithY - 136)
    ctx.closePath()
    ctx.stroke()
    setStroke(accent, 0.08, 1)
    ctx.beginPath(); ctx.moveTo(wraithX, wraithY - 214); ctx.lineTo(wraithX, wraithY + 142); ctx.stroke()
    setStroke(secondary, 0.17, 2)
    ctx.beginPath(); ctx.moveTo(wraithX - 104, wraithY - 42); ctx.quadraticCurveTo(wraithX - 54, wraithY - 78, wraithX - 12, wraithY - 32); ctx.stroke()
    setStroke(signatureHighlight, 0.27, 3)
    ctx.beginPath(); ctx.moveTo(wraithX + 20, wraithY - 70); ctx.lineTo(wraithX + 118, wraithY + 28); ctx.moveTo(wraithX + 118, wraithY - 70); ctx.lineTo(wraithX + 20, wraithY + 28); ctx.stroke()
    ctx.fillStyle = hexToRgba(signatureHighlight, signatureAlpha(0.22))
    ctx.fillRect(wraithX + 42, wraithY + 92, 126, 8)
    ctx.setLineDash([14, 10])
    setStroke(secondary, 0.09, 1)
    ctx.beginPath(); ctx.arc(wraithX, wraithY + 12, 234, Math.PI * 0.08, Math.PI * 0.92); ctx.stroke()
    ctx.setLineDash([])
  } else if (signature === 'biotic-schism') {
    const labX = centerX - width * 0.015 + signatureOffsetX
    const labY = centerY - height * 0.005 + signatureOffsetY
    const leftX = labX - 132
    const rightX = labX + 132
    const reservoirWash = ctx.createRadialGradient(labX, labY, 30, labX, labY, width * 0.38)
    reservoirWash.addColorStop(0, hexToRgba('#060309', signatureAlpha(0.18)))
    reservoirWash.addColorStop(0.62, hexToRgba(secondary, signatureAlpha(0.018)))
    reservoirWash.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = reservoirWash
    ctx.fillRect(x, labY - height * 0.46, width * 0.78, height * 0.92)

    ;[[leftX, secondary, -1], [rightX, signatureHighlight, 1]].forEach(([reservoirX, color, direction]) => {
      ;[58, 104, 154].forEach((radius, index) => {
        setStroke(color, index === 1 ? 0.22 : index === 0 ? 0.14 : 0.075, index === 1 ? 3 : 1)
        ctx.beginPath()
        ctx.ellipse(reservoirX, labY, radius * 0.78, radius, direction * 0.08, phase * direction, phase * direction + Math.PI * 1.68)
        ctx.stroke()
      })
      ctx.fillStyle = hexToRgba(color, signatureAlpha(0.18))
      ctx.beginPath(); ctx.arc(reservoirX, labY + direction * 42, 9, 0, Math.PI * 2); ctx.fill()
    })

    const helixTop = labY - 238
    const helixHeight = 476
    const helixSteps = 18
    ;[-1, 1].forEach((strand, strandIndex) => {
      setStroke(strandIndex === 0 ? secondary : signatureHighlight, strandIndex === 0 ? 0.18 : 0.2, 3)
      ctx.beginPath()
      for (let step = 0; step <= helixSteps; step += 1) {
        const progress = step / helixSteps
        const strandX = labX + Math.sin(progress * Math.PI * 3.4) * 74 * strand
        const strandY = helixTop + progress * helixHeight
        if (step === 0) ctx.moveTo(strandX, strandY)
        else ctx.lineTo(strandX, strandY)
      }
      ctx.stroke()
    })
    for (let rung = 1; rung < helixSteps; rung += 2) {
      const progress = rung / helixSteps
      const rungX = Math.sin(progress * Math.PI * 3.4) * 74
      const rungY = helixTop + progress * helixHeight
      setStroke(rung % 4 === 1 ? signatureHighlight : secondary, rung % 4 === 1 ? 0.17 : 0.1, rung % 4 === 1 ? 2 : 1)
      ctx.beginPath(); ctx.moveTo(labX - rungX, rungY); ctx.lineTo(labX + rungX, rungY); ctx.stroke()
    }
    ;[-176, -92, 88, 174].forEach((offset, index) => {
      setStroke(index === 2 ? signatureHighlight : accent, index === 2 ? 0.16 : 0.05, index === 2 ? 2 : 1)
      ctx.beginPath(); ctx.moveTo(x + 24, labY + offset); ctx.lineTo(x + width * 0.75, labY + offset); ctx.stroke()
    })
    ctx.setLineDash([12, 10])
    setStroke(secondary, 0.08, 1)
    ctx.strokeRect(labX - 244, labY - 204, 488, 408)
    ctx.setLineDash([])
  } else if (signature === 'duality') {
    const leftX = centerX - 112
    const rightX = centerX + 112
    const orbY = centerY
    ;[[leftX, secondary, -1], [rightX, accent, 1]].forEach(([orbX, color, direction]) => {
      ;[46, 86, 132].forEach((radius, index) => {
        setStroke(color, index === 1 ? 0.23 : 0.1, index === 1 ? 3 : 1)
        ctx.beginPath()
        ctx.arc(orbX, orbY, radius, phase * direction, phase * direction + Math.PI * 1.62)
        ctx.stroke()
      })
    })
    setStroke(secondary, 0.2, 3)
    ctx.beginPath()
    ctx.moveTo(leftX, orbY - 180)
    ctx.bezierCurveTo(centerX + 180, orbY - 130, centerX - 180, orbY + 130, rightX, orbY + 180)
    ctx.stroke()
    setStroke(accent, 0.14, 2)
    ctx.beginPath()
    ctx.moveTo(rightX, orbY - 180)
    ctx.bezierCurveTo(centerX - 180, orbY - 130, centerX + 180, orbY + 130, leftX, orbY + 180)
    ctx.stroke()
  } else if (signature === 'return-current') {
    const currentY = centerY + height * 0.03
    for (let stream = -3; stream <= 3; stream += 1) {
      const startY = currentY + stream * 34
      const endY = currentY - 130 + stream * 22
      setStroke(stream === 0 ? secondary : accent, stream === 0 ? 0.23 : 0.075, stream === 0 ? 3 : 1)
      ctx.beginPath()
      ctx.moveTo(x + 16, startY + 120)
      ctx.bezierCurveTo(centerX - 260, startY - 130, centerX + 190, endY + 120, x + width * 0.72, endY)
      ctx.stroke()
      const arrowX = x + width * 0.72
      ctx.beginPath()
      ctx.moveTo(arrowX - 24, endY - 10)
      ctx.lineTo(arrowX, endY)
      ctx.lineTo(arrowX - 18, endY + 18)
      ctx.stroke()
    }
    ;[-1, 1].forEach(direction => {
      setStroke(direction < 0 ? secondary : accent, 0.16, 2)
      ctx.beginPath()
      ctx.arc(centerX + direction * 155, currentY + direction * 44, 72, phase, phase + Math.PI * 1.72)
      ctx.stroke()
    })
  } else if (signature === 'mandala') {
    const mandalaX = centerX
    const mandalaY = centerY
    ;[[78, 8], [142, 12], [214, 12], [286, 16]].forEach(([radius, sides], index) => {
      drawPolygon(mandalaX, mandalaY, radius, sides, phase + index * 0.08)
      setStroke(index === 1 ? secondary : accent, index === 1 ? 0.22 : 0.085, index === 1 ? 3 : 1)
      ctx.stroke()
    })
    for (let spoke = 0; spoke < 12; spoke += 1) {
      const angle = phase + (spoke / 12) * Math.PI * 2
      setStroke(spoke % 3 === 0 ? secondary : accent, spoke % 3 === 0 ? 0.18 : 0.075, spoke % 3 === 0 ? 2 : 1)
      ctx.beginPath()
      ctx.moveTo(mandalaX + Math.cos(angle) * 42, mandalaY + Math.sin(angle) * 42)
      ctx.lineTo(mandalaX + Math.cos(angle) * 286, mandalaY + Math.sin(angle) * 286)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(mandalaX + Math.cos(angle) * 214, mandalaY + Math.sin(angle) * 214, spoke % 3 === 0 ? 10 : 6, 0, Math.PI * 2)
      ctx.stroke()
    }
  }

  ctx.setLineDash([])
  ctx.restore()
}

function drawDirectorCutIdentityLayer(ctx, motif, options) {
  const {
    x,
    y,
    width,
    height,
    accent,
    secondary,
    paper = false
  } = options
  const type = String(motif?.type || 'archive').trim()
  const hasStory = Boolean(motif?.story)
  const identityStrength = Math.max(0, Math.min(1, Number(motif?.identityStrength) || (hasStory ? 0.34 : 1)))
  const identityColor = safeText(secondary, accent)
  const ink = paper ? '#080906' : identityColor
  const companion = paper ? identityColor : accent
  const centerX = x + width * (paper ? 0.5 : 0.84)
  const centerY = y + height * (paper ? 0.31 : 0.48)
  const spanX = width * (paper ? 0.34 : 0.2)
  const spanY = height * (paper ? 0.085 : 0.13)
  const baseAlpha = (paper ? 0.04 : 0.05) * (hasStory ? identityStrength * 0.56 : 1)

  ctx.save()
  ctx.beginPath()
  ctx.rect(x, y, width, height)
  ctx.clip()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  const washRadius = Math.max(spanX * 1.45, spanY * 2.6)
  const wash = ctx.createRadialGradient(centerX, centerY, 6, centerX, centerY, washRadius)
  wash.addColorStop(0, hexToRgba(identityColor, paper ? 0.045 : 0.05))
  wash.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = wash
  ctx.fillRect(centerX - washRadius, centerY - washRadius, washRadius * 2, washRadius * 2)

  const setStroke = (color = ink, alpha = baseAlpha, lineWidth = 1) => {
    ctx.strokeStyle = hexToRgba(color, alpha)
    ctx.lineWidth = lineWidth
  }
  setStroke()

  if (hasStory) {
    setStroke(companion, baseAlpha + (paper ? 0.004 : 0.008), paper ? 1 : 1.2)
    ctx.beginPath()
    ctx.moveTo(centerX - spanX, centerY + spanY * 0.72)
    ctx.lineTo(centerX + spanX, centerY - spanY * 0.72)
    ctx.stroke()
  } else if (type === 'orbit' || type === 'halo' || type === 'nine-lives') {
    ;[0.48, 0.74, 1].forEach((ratio, index) => {
      setStroke(index === 1 ? companion : ink, baseAlpha + (index === 1 ? 0.018 : 0), index === 1 ? 1.4 : 1)
      ctx.beginPath()
      ctx.ellipse(centerX, centerY, spanX * ratio, spanY * ratio, -0.16 + index * 0.09, 0, Math.PI * 2)
      ctx.stroke()
    })
    for (let spoke = 0; spoke < 4; spoke += 1) {
      const angle = -0.3 + (spoke / 4) * Math.PI * 2
      setStroke(spoke === 0 ? companion : ink, spoke === 0 ? baseAlpha + 0.018 : baseAlpha, spoke === 0 ? 1.4 : 1)
      ctx.beginPath()
      ctx.moveTo(centerX + Math.cos(angle) * spanX * 0.2, centerY + Math.sin(angle) * spanY * 0.2)
      ctx.lineTo(centerX + Math.cos(angle) * spanX * 1.08, centerY + Math.sin(angle) * spanY * 1.08)
      ctx.stroke()
    }
  } else if (type === 'grid' || type === 'signal' || type === 'fortress') {
    ;[0.46, 0.72, 1].forEach((ratio, index) => {
      const boxWidth = spanX * 2 * ratio
      const boxHeight = spanY * 2 * (0.62 + index * 0.19)
      setStroke(index === 1 ? companion : ink, baseAlpha + (index === 1 ? 0.018 : 0), index === 1 ? 1.4 : 1)
      ctx.strokeRect(centerX - boxWidth / 2, centerY - boxHeight / 2, boxWidth, boxHeight)
    })
    ;[-1, 1].forEach(horizontal => {
      ;[-1, 1].forEach(vertical => {
        const cornerX = centerX + horizontal * spanX
        const cornerY = centerY + vertical * spanY
        const tickX = spanX * 0.22
        const tickY = spanY * 0.28
        setStroke(horizontal === vertical ? companion : ink, horizontal === vertical ? baseAlpha + 0.018 : baseAlpha, horizontal === vertical ? 1.4 : 1)
        ctx.beginPath()
        ctx.moveTo(cornerX - horizontal * tickX, cornerY)
        ctx.lineTo(cornerX, cornerY)
        ctx.lineTo(cornerX, cornerY - vertical * tickY)
        ctx.stroke()
      })
    })
  } else if (type === 'wave' || type === 'tide') {
    for (let stream = -1; stream <= 1; stream += 1) {
      const streamY = centerY + stream * spanY * 0.42
      setStroke(stream === 0 ? companion : ink, stream === 0 ? baseAlpha + 0.02 : baseAlpha, stream === 0 ? 1.5 : 1)
      ctx.beginPath()
      ctx.moveTo(centerX - spanX, streamY + spanY * 0.36)
      ctx.bezierCurveTo(
        centerX - spanX * 0.45,
        streamY - spanY * 0.72,
        centerX + spanX * 0.42,
        streamY + spanY * 0.64,
        centerX + spanX,
        streamY - spanY * 0.28
      )
      ctx.stroke()
    }
  } else {
    for (let track = -1; track <= 1; track += 1) {
      const offset = track * spanY * 0.48
      setStroke(track === 0 ? companion : ink, track === 0 ? baseAlpha + 0.018 : baseAlpha, track === 0 ? 1.4 : 1)
      ctx.beginPath()
      ctx.moveTo(centerX - spanX, centerY + offset + spanY * 0.42)
      ctx.lineTo(centerX + spanX, centerY + offset - spanY * 0.42)
      ctx.stroke()
    }
    ;[0.54, 0.92].forEach((ratio, index) => {
      setStroke(index === 0 ? companion : ink, index === 0 ? baseAlpha + 0.018 : baseAlpha, index === 0 ? 1.4 : 1)
      ctx.beginPath()
      ctx.ellipse(centerX, centerY, spanX * ratio, spanY * ratio, -0.12, Math.PI * 1.04, Math.PI * 1.94)
      ctx.stroke()
    })
  }

  ctx.fillStyle = hexToRgba(identityColor, (paper ? 0.2 : 0.095) * (hasStory ? identityStrength : 1))
  ctx.fillRect(centerX - spanX, centerY + spanY * 1.34, spanX * 0.62, paper ? 2 : 1.5)

  ctx.save()
  ctx.beginPath()
  ctx.rect(centerX - spanX * 1.08, centerY - spanY * 1.55, spanX * 2.16, spanY * 3.1)
  ctx.clip()
  drawDirectorCutStorySignature(ctx, motif, {
    x: centerX - spanX,
    y: centerY - spanY * 1.5,
    width: spanX * 2,
    height: spanY * 3,
    centerX,
    centerY,
    accent: companion,
    secondary: ink,
    alpha: value => Math.min(paper ? 0.036 : 0.052, value * (paper ? 0.18 : 0.26) * identityStrength),
    compact: true,
    showEmblem: false,
    textureStrength: identityStrength
  })
  ctx.restore()

  ctx.restore()
}

function drawDirectorCutNarrativeStage(ctx, motif, options) {
  if (!motif?.narrativeStage || (!motif?.story && !motif?.signature)) return

  const {
    x,
    y,
    width,
    height,
    copyX,
    mainRight,
    accent,
    secondary
  } = options
  const stageStrength = Math.max(0.35, Math.min(1, Number(motif?.narrativeStageStrength) || 0.72))
  const flowStrength = Math.max(0.25, Math.min(1, Number(motif?.narrativeFlowStrength) || 0.64))
  const stageLeft = Math.max(copyX - 22, x + width * 0.34)
  const stageWidth = Math.max(360, mainRight - stageLeft - 18)
  const rawStageX = Number(motif?.narrativeStageX)
  const rawStageY = Number(motif?.narrativeStageY)
  const rawStartY = Number(motif?.narrativeStartY)
  const stageX = stageLeft + stageWidth * (Number.isFinite(rawStageX) ? Math.max(0.46, Math.min(0.82, rawStageX)) : 0.62)
  const stageY = y + height * (Number.isFinite(rawStageY) ? Math.max(0.22, Math.min(0.54, rawStageY)) : 0.36)
  const startX = Math.max(x + width * 0.27, stageLeft - width * 0.09)
  const startY = y + height * (Number.isFinite(rawStartY) ? Math.max(0.28, Math.min(0.68, rawStartY)) : 0.48)
  const storyColor = motif?.story?.highlight || secondary || accent
  const flowStyle = safeText(motif?.narrativeFlow, motif?.story?.texture || motif?.type || 'signal')
  const flowAlpha = value => Math.min(0.105, value * flowStrength)
  const stageAlpha = value => Math.min(0.13, value * stageStrength * 0.54)

  ctx.save()
  ctx.beginPath()
  ctx.rect(Math.max(x, stageLeft - width * 0.1), y + 64, mainRight - Math.max(x, stageLeft - width * 0.1) - 14, height - 118)
  ctx.clip()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  const washRadius = Math.min(stageWidth * 0.34, height * 0.29)
  const wash = ctx.createRadialGradient(stageX, stageY, 10, stageX, stageY, washRadius)
  wash.addColorStop(0, hexToRgba(storyColor, 0.042 * stageStrength))
  wash.addColorStop(0.56, hexToRgba(secondary || accent, 0.016 * stageStrength))
  wash.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = wash
  ctx.fillRect(stageX - washRadius, stageY - washRadius, washRadius * 2, washRadius * 2)

  const setFlowStroke = (color, alpha, lineWidth = 1) => {
    ctx.strokeStyle = hexToRgba(color, flowAlpha(alpha))
    ctx.lineWidth = lineWidth
  }

  if (flowStyle === 'formation') {
    ;[-1, 0, 1].forEach((lane, index) => {
      const offset = lane * 38
      setFlowStroke(index === 1 ? storyColor : secondary || accent, index === 1 ? 0.11 : 0.055, index === 1 ? 2 : 1)
      ctx.beginPath()
      ctx.moveTo(startX, startY + offset)
      ctx.lineTo(startX + stageWidth * 0.18, startY + offset * 0.72)
      ctx.lineTo(stageX - stageWidth * 0.18, stageY + offset * 0.38)
      ctx.lineTo(stageX - stageWidth * 0.07, stageY + offset * 0.16)
      ctx.stroke()
    })
    ;[-1, 1].forEach(direction => {
      ctx.strokeStyle = hexToRgba(storyColor, flowAlpha(0.11))
      ctx.lineWidth = 1.5
      ctx.strokeRect(stageX - stageWidth * 0.18 + direction * 34 - 5, stageY + direction * 20 - 5, 10, 10)
    })
  } else if (flowStyle === 'scrap' || flowStyle === 'blade') {
    ;[-1, 0, 1].forEach((lane, index) => {
      const offset = lane * 32
      setFlowStroke(index === 1 ? storyColor : accent, index === 1 ? 0.12 : 0.05, index === 1 ? 2.2 : 1)
      ctx.beginPath()
      ctx.moveTo(startX, startY + 88 + offset)
      ctx.lineTo(startX + stageWidth * 0.22, startY + 26 + offset * 0.5)
      ctx.lineTo(stageX - stageWidth * 0.14, stageY + 54 + offset * 0.26)
      ctx.lineTo(stageX - stageWidth * 0.04, stageY + offset * 0.12)
      ctx.stroke()
    })
  } else if (flowStyle === 'talon' || flowStyle === 'scope') {
    ;[-1, 1].forEach((lane, index) => {
      setFlowStroke(index === 0 ? storyColor : secondary || accent, index === 0 ? 0.1 : 0.05, index === 0 ? 1.8 : 1)
      ctx.beginPath()
      ctx.moveTo(startX, startY + lane * 52)
      ctx.bezierCurveTo(
        startX + stageWidth * 0.28,
        startY + lane * 18,
        stageX - stageWidth * 0.24,
        stageY + lane * 44,
        stageX - stageWidth * 0.09,
        stageY + lane * 20
      )
      ctx.stroke()
    })
    setFlowStroke(storyColor, 0.085, 1)
    ctx.beginPath()
    ctx.moveTo(stageX - stageWidth * 0.28, stageY)
    ctx.lineTo(stageX - stageWidth * 0.08, stageY)
    ctx.stroke()
  } else if (flowStyle === 'shrine') {
    ;[-1, 0, 1].forEach((stream, index) => {
      setFlowStroke(index === 1 ? storyColor : secondary || accent, index === 1 ? 0.105 : 0.045, index === 1 ? 1.8 : 1)
      ctx.beginPath()
      ctx.moveTo(startX, startY + stream * 34)
      ctx.bezierCurveTo(
        startX + stageWidth * 0.2,
        startY - 76 + stream * 28,
        stageX - stageWidth * 0.24,
        stageY + 90 + stream * 22,
        stageX - stageWidth * 0.06,
        stageY + stream * 12
      )
      ctx.stroke()
    })
  } else {
    ;[-1, 0, 1].forEach((lane, index) => {
      setFlowStroke(index === 1 ? storyColor : accent, index === 1 ? 0.095 : 0.04, index === 1 ? 1.8 : 1)
      ctx.beginPath()
      ctx.moveTo(startX, startY + lane * 38)
      ctx.quadraticCurveTo(startX + stageWidth * 0.42, stageY + lane * 42, stageX - stageWidth * 0.06, stageY + lane * 12)
      ctx.stroke()
    })
  }

  if (motif.signature) {
    const stageMotif = {
      ...motif,
      signatureX: Number(motif?.narrativeSignatureX) || 0,
      signatureY: Number(motif?.narrativeSignatureY) || 0
    }
    drawDirectorCutHeroSignature(ctx, stageMotif, {
      x: stageLeft,
      y,
      width: stageWidth,
      height,
      centerX: stageX,
      centerY: stageY,
      accent,
      secondary: secondary || accent,
      motifAlpha: stageAlpha,
      phase: Number(motif?.rotation) || 0
    })
  } else {
    drawDirectorCutStorySignature(ctx, motif, {
      x: stageLeft,
      y,
      width: stageWidth,
      height,
      centerX: stageX,
      centerY: stageY,
      accent,
      secondary: secondary || accent,
      alpha: stageAlpha,
      showTexture: false,
      showEmblem: true,
      emblemStrength: Math.max(0.55, Math.min(1.2, Number(motif?.narrativeEmblemStrength) || 0.9)),
      unitScale: Math.max(0.55, Math.min(1.15, Number(motif?.narrativeStageScale) || 0.82))
    })
  }

  ctx.restore()
}

export function getDirectorCutEmblemLayout(motif, options) {
  const {
    x,
    y,
    width,
    height,
    heroMark
  } = options
  if (!heroMark) return null

  const clampNumber = (value, fallback, minimum, maximum) => {
    const number = Number(value)
    return Number.isFinite(number) ? Math.max(minimum, Math.min(maximum, number)) : fallback
  }
  const fallbackFocusX = clampNumber(motif?.languageFieldX, 0.75, 0.58, 0.94)
  const fallbackFocusY = clampNumber(motif?.languageFieldY, 0.37, 0.18, 0.58)
  const focusX = x + width * clampNumber(motif?.heroEmblemX, fallbackFocusX, 0.58, 0.94)
  const focusY = y + height * clampNumber(motif?.heroEmblemY, fallbackFocusY, 0.18, 0.58)
  const sourceWidth = Math.max(1, Number(heroMark.naturalWidth || heroMark.width) || 360)
  const sourceHeight = Math.max(1, Number(heroMark.naturalHeight || heroMark.height) || 260)
  const anchorX = clampNumber(motif?.heroMarkAnchorX, 0.58, 0, 1)
  const anchorY = clampNumber(motif?.heroMarkAnchorY, 0.5, 0, 1)
  const isolated = motif?.heroMarkIsolated === true
  const cropWidth = sourceWidth * clampNumber(motif?.heroMarkCropWidth, 0.5, isolated ? 0.15 : 0.28, 1)
  const cropHeight = sourceHeight * clampNumber(motif?.heroMarkCropHeight, 0.68, isolated ? 0.15 : 0.38, 1)
  const cropX = Math.max(0, Math.min(sourceWidth - cropWidth, sourceWidth * anchorX - cropWidth / 2))
  const cropY = Math.max(0, Math.min(sourceHeight - cropHeight, sourceHeight * anchorY - cropHeight / 2))
  const requestedWidth = clampNumber(motif?.heroEmblemSize, 216, 176, 260)
  const containScale = Math.min(requestedWidth / cropWidth, 216 / cropHeight)
  const drawWidth = isolated ? cropWidth * containScale : requestedWidth
  const drawHeight = isolated ? cropHeight * containScale : Math.max(148, Math.min(248, drawWidth * (cropHeight / cropWidth)))
  const offsetX = clampNumber(motif?.heroEmblemOffsetX, 0, -0.08, 0.08) * width
  const offsetY = clampNumber(motif?.heroEmblemOffsetY, 0, -0.08, 0.08) * height
  const drawX = focusX - drawWidth / 2 + offsetX
  const drawY = focusY - drawHeight / 2 + offsetY
  return {
    focusX, focusY, sourceWidth, sourceHeight, isolated,
    cropWidth, cropHeight, cropX, cropY, drawWidth, drawHeight, drawX, drawY
  }
}

function drawDirectorCutHeroEmblem(ctx, motif, options) {
  const layout = getDirectorCutEmblemLayout(motif, options)
  if (!layout) return
  const { accent, secondary, heroMark } = options
  const {
    focusX, focusY, sourceWidth, sourceHeight, isolated,
    cropWidth, cropHeight, cropX, cropY, drawWidth, drawHeight, drawX, drawY
  } = layout
  const rawOpacity = Number(motif?.heroMarkOpacity)
  const requestedOpacity = Number.isFinite(rawOpacity) ? Math.max(0.42, Math.min(0.86, rawOpacity)) : 0.68
  const opacity = Math.min(0.88, Math.max(0.66, requestedOpacity * 1.08))
  const color = safeText(motif?.languageColor, secondary || accent)
  const matteFinish = motif?.heroMarkFinish === 'matte'
  const etchedFinish = motif?.heroMarkFinish === 'etched'

  // Isolated SVGs have no former travel paths. Contain the full curated bounds
  // at their original aspect ratio; do not feather away crowns, legs or tips.
  // The two approved soft-crop masters retain their established finish.
  const scale = 2
  const layer = document.createElement('canvas')
  layer.width = Math.max(1, Math.ceil(drawWidth * scale))
  layer.height = Math.max(1, Math.ceil(drawHeight * scale))
  const layerCtx = layer.getContext('2d')
  if (!layerCtx) return
  layerCtx.imageSmoothingEnabled = true
  layerCtx.imageSmoothingQuality = 'high'
  const cropScaleX = layer.width / cropWidth
  const cropScaleY = layer.height / cropHeight
  layerCtx.drawImage(
    heroMark,
    -cropX * cropScaleX,
    -cropY * cropScaleY,
    sourceWidth * cropScaleX,
    sourceHeight * cropScaleY
  )
  if (!isolated) {
    layerCtx.globalCompositeOperation = 'destination-in'
    const mask = layerCtx.createRadialGradient(
      layer.width * 0.5,
      layer.height * 0.5,
      Math.min(layer.width, layer.height) * 0.25,
      layer.width * 0.5,
      layer.height * 0.5,
      Math.max(layer.width, layer.height) * 0.54
    )
    mask.addColorStop(0, 'rgba(255,255,255,1)')
    mask.addColorStop(0.72, 'rgba(255,255,255,0.96)')
    mask.addColorStop(1, 'rgba(255,255,255,0)')
    layerCtx.fillStyle = mask
    layerCtx.fillRect(0, 0, layer.width, layer.height)
  }

  ctx.save()
  const haloRadius = Math.max(drawWidth, drawHeight) * 0.66
  const halo = ctx.createRadialGradient(focusX, focusY, 0, focusX, focusY, haloRadius)
  halo.addColorStop(0, hexToRgba(color, matteFinish ? 0.028 : etchedFinish ? 0.038 : 0.07))
  halo.addColorStop(0.46, hexToRgba(color, matteFinish ? 0.01 : etchedFinish ? 0.014 : 0.025))
  halo.addColorStop(1, hexToRgba(color, 0))
  ctx.fillStyle = halo
  ctx.fillRect(focusX - haloRadius, focusY - haloRadius, haloRadius * 2, haloRadius * 2)
  if (!matteFinish && !etchedFinish) {
    ctx.globalAlpha = opacity * 0.34
    ctx.globalCompositeOperation = 'screen'
    ctx.shadowColor = hexToRgba(color, 0.22)
    ctx.shadowBlur = 14
    ctx.drawImage(layer, drawX, drawY, drawWidth, drawHeight)
    ctx.shadowBlur = 0
  }
  ctx.globalAlpha = opacity
  ctx.globalCompositeOperation = matteFinish || etchedFinish ? 'source-over' : 'screen'
  ctx.drawImage(layer, drawX, drawY, drawWidth, drawHeight)
  if (etchedFinish) {
    ctx.globalAlpha = opacity * 0.2
    ctx.globalCompositeOperation = 'screen'
    ctx.drawImage(layer, drawX, drawY, drawWidth, drawHeight)
  }
  ctx.restore()
}

function drawDirectorCutLanguageField(ctx, motif, options) {
  const language = String(motif?.languageField || '').trim()
  if (!language) return

  const {
    x,
    y,
    width,
    height,
    copyX,
    mainRight,
    accent,
    secondary
  } = options
  const readRatio = (value, fallback, minimum, maximum) => {
    const number = Number(value)
    return Number.isFinite(number) ? Math.max(minimum, Math.min(maximum, number)) : fallback
  }
  const strength = readRatio(motif?.languageFieldStrength, 0.8, 0.3, 1)
  const fieldLeft = Math.max(x + width * 0.24, copyX - width * 0.2)
  const fieldRight = mainRight - 18
  const fieldWidth = Math.max(420, fieldRight - fieldLeft)
  const fieldX = fieldLeft + fieldWidth * readRatio(motif?.languageFieldX, 0.75, 0.52, 0.9)
  const fieldY = y + height * readRatio(motif?.languageFieldY, 0.37, 0.23, 0.58)
  const startY = y + height * readRatio(motif?.languageStartY, 0.52, 0.34, 0.68)
  const color = safeText(motif?.languageColor, secondary || accent)
  const neutral = safeText(motif?.ambientLineNeutral, safeText(motif?.languageNeutral, '#f5ecd2'))
  const posterEdition = motif?.languageFieldEdition === 'poster'
  const fieldAlpha = (value, layer = 'base') => {
    const amount = Math.max(0, value)
    if (!posterEdition) return Math.min(0.098, amount * strength * 0.11)
    const tiers = {
      base: [0.09, 0.07],
      focal: [0.18, 0.17],
      micro: [0.11, 0.09],
      fill: [0.085, 0.06]
    }
    const [multiplier, ceiling] = tiers[layer] || tiers.base
    return Math.min(ceiling, amount * strength * multiplier)
  }

  const setStroke = (strokeColor, opacity, lineWidth = 1, dash = [], layer = 'base') => {
    ctx.strokeStyle = hexToRgba(strokeColor, fieldAlpha(opacity, layer))
    ctx.lineWidth = lineWidth
    ctx.setLineDash(dash)
  }
  // Poster fields need one gesture that survives at share-card scale. Keep the
  // ordinary field tiers restrained, and reserve this higher ceiling for that
  // single hero-defining stroke instead of lifting every decorative line.
  const dominantAlpha = (opacity, ceiling = 0.24) => {
    if (!posterEdition) return fieldAlpha(opacity, 'focal')
    return Math.min(ceiling, Math.max(0, opacity) * strength * 0.24)
  }
  const setDominantStroke = (strokeColor, opacity, lineWidth = 1, dash = [], ceiling = 0.24) => {
    ctx.strokeStyle = hexToRgba(strokeColor, dominantAlpha(opacity, ceiling))
    ctx.lineWidth = lineWidth
    ctx.setLineDash(dash)
  }
  const drawNode = (nodeX, nodeY, radius = 5, opacity = 0.72, layer = 'micro') => {
    ctx.fillStyle = hexToRgba(color, fieldAlpha(opacity, layer))
    ctx.beginPath()
    ctx.arc(nodeX, nodeY, radius, 0, Math.PI * 2)
    ctx.fill()
    setStroke(neutral, opacity * 0.48, 1, [], 'micro')
    ctx.beginPath()
    ctx.arc(nodeX, nodeY, radius + 5, 0, Math.PI * 2)
    ctx.stroke()
  }
  const drawGlow = (glowX, glowY, radius, opacity = 0.7) => {
    if (!posterEdition) return
    const glow = ctx.createRadialGradient(glowX, glowY, 0, glowX, glowY, radius)
    glow.addColorStop(0, hexToRgba(color, fieldAlpha(opacity, 'fill')))
    glow.addColorStop(0.32, hexToRgba(color, fieldAlpha(opacity * 0.42, 'fill')))
    glow.addColorStop(1, hexToRgba(color, 0))
    ctx.fillStyle = glow
    ctx.fillRect(glowX - radius, glowY - radius, radius * 2, radius * 2)
  }
  const drawPlane = (points, opacity = 0.62) => {
    if (!posterEdition || points.length < 3) return
    const left = Math.min(...points.map(point => point[0]))
    const right = Math.max(...points.map(point => point[0]))
    const wash = ctx.createLinearGradient(left, 0, right, 0)
    wash.addColorStop(0, hexToRgba(color, fieldAlpha(opacity, 'fill')))
    wash.addColorStop(0.58, hexToRgba(color, fieldAlpha(opacity * 0.48, 'fill')))
    wash.addColorStop(1, hexToRgba(color, 0))
    ctx.fillStyle = wash
    ctx.beginPath()
    ctx.moveTo(points[0][0], points[0][1])
    points.slice(1).forEach(point => ctx.lineTo(point[0], point[1]))
    ctx.closePath()
    ctx.fill()
  }
  const drawMicroTicks = (originX, originY, count = 4, spacing = 44, direction = -1) => {
    if (!posterEdition) return
    Array.from({ length: count }, (_, index) => index).forEach(index => {
      const tickX = originX + index * spacing
      const tickY = originY + direction * index * 3
      setStroke(index === 1 ? color : neutral, index === 1 ? 0.78 : 0.42, index === 1 ? 1.6 : 1, [], 'micro')
      ctx.beginPath()
      ctx.moveTo(tickX - 7, tickY + direction * 11)
      ctx.lineTo(tickX + 7, tickY - direction * 11)
      ctx.stroke()
    })
  }

  ctx.save()
  ctx.beginPath()
  ctx.rect(fieldLeft, y + 72, fieldRight - fieldLeft, height - 126)
  ctx.clip()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  if (language === 'intercept') {
    const impactX = fieldX - fieldWidth * 0.18
    const impactY = fieldY + 18
    const entryX = fieldLeft + fieldWidth * 0.08
    const entryY = startY + 26
    const magenta = '#b55b82'

    // Split the interception into two physical masses: an incoming pressure
    // wedge and an armour plane that exits through the upper ticket edge. The
    // break between them is the event; no closed shield or continuous ribbon.
    const impactGlow = ctx.createRadialGradient(impactX, impactY, 0, impactX, impactY, 94)
    impactGlow.addColorStop(0, hexToRgba(color, 0.19 * strength))
    impactGlow.addColorStop(0.26, hexToRgba(color, 0.09 * strength))
    impactGlow.addColorStop(1, hexToRgba(color, 0))
    ctx.fillStyle = impactGlow
    ctx.fillRect(impactX - 94, impactY - 94, 188, 188)

    const pressureWash = ctx.createLinearGradient(fieldLeft - 20, entryY, impactX, impactY)
    pressureWash.addColorStop(0, hexToRgba(magenta, 0.015 * strength))
    pressureWash.addColorStop(0.56, hexToRgba(magenta, 0.052 * strength))
    pressureWash.addColorStop(1, hexToRgba(magenta, 0.095 * strength))
    ctx.fillStyle = pressureWash
    ctx.beginPath()
    ctx.moveTo(fieldLeft - 20, entryY + 42)
    ctx.lineTo(entryX, entryY - 34)
    ctx.lineTo(impactX - 56, impactY - 24)
    ctx.lineTo(impactX - 12, impactY - 5)
    ctx.lineTo(impactX - 52, impactY + 34)
    ctx.lineTo(entryX + 42, entryY + 26)
    ctx.closePath()
    ctx.fill()

    const armourWash = ctx.createLinearGradient(impactX + 18, impactY, fieldRight + 84, impactY - 110)
    armourWash.addColorStop(0, hexToRgba(color, 0.16 * strength))
    armourWash.addColorStop(0.5, hexToRgba(color, 0.12 * strength))
    armourWash.addColorStop(1, hexToRgba(color, 0.055 * strength))
    ctx.fillStyle = armourWash
    ctx.beginPath()
    ctx.moveTo(impactX + 18, impactY - 20)
    ctx.lineTo(impactX + 94, impactY - 112)
    ctx.lineTo(fieldRight + 84, impactY - 126)
    ctx.lineTo(fieldRight + 84, impactY - 48)
    ctx.lineTo(impactX + 112, impactY - 30)
    ctx.lineTo(impactX + 38, impactY + 8)
    ctx.closePath()
    ctx.fill()

    const armourDepth = ctx.createLinearGradient(impactX + 54, 0, fieldRight + 84, 0)
    armourDepth.addColorStop(0, hexToRgba(color, 0.052 * strength))
    armourDepth.addColorStop(1, hexToRgba(color, 0.018 * strength))
    ctx.fillStyle = armourDepth
    ctx.beginPath()
    ctx.moveTo(impactX + 54, impactY + 18)
    ctx.lineTo(impactX + 118, impactY - 10)
    ctx.lineTo(fieldRight + 84, impactY - 34)
    ctx.lineTo(fieldRight + 84, impactY - 17)
    ctx.lineTo(impactX + 126, impactY + 14)
    ctx.lineTo(impactX + 66, impactY + 36)
    ctx.closePath()
    ctx.fill()

    // A hard elbow replaces the previous Bézier ribbon. One low-pressure echo
    // is enough to suggest speed while keeping the construction cinematic.
    ctx.save()
    ctx.lineCap = 'square'
    ctx.lineJoin = 'bevel'
    ctx.strokeStyle = hexToRgba(magenta, 0.19 * strength)
    ctx.lineWidth = 2.5
    ctx.shadowColor = hexToRgba(magenta, 0.12 * strength)
    ctx.shadowBlur = 6
    ctx.beginPath()
    ctx.moveTo(fieldLeft - 34, entryY + 12)
    ctx.lineTo(entryX + fieldWidth * 0.18, entryY - 14)
    ctx.lineTo(impactX, impactY)
    ctx.stroke()

    ctx.strokeStyle = hexToRgba(color, 0.37 * strength)
    ctx.lineWidth = 4.2
    ctx.shadowColor = hexToRgba(color, 0.24 * strength)
    ctx.shadowBlur = 9
    ctx.beginPath()
    ctx.moveTo(impactX, impactY)
    ctx.lineTo(impactX + 96, impactY - 104)
    ctx.lineTo(fieldRight + 84, impactY - 118)
    ctx.stroke()
    ctx.restore()

    ctx.strokeStyle = hexToRgba(magenta, 0.075 * strength)
    ctx.lineWidth = 1.35
    ctx.beginPath()
    ctx.moveTo(fieldLeft - 20, entryY + 58)
    ctx.lineTo(entryX + fieldWidth * 0.16, entryY + 28)
    ctx.lineTo(impactX - 22, impactY + 28)
    ctx.stroke()

    ctx.strokeStyle = hexToRgba(color, 0.09 * strength)
    ctx.beginPath()
    ctx.moveTo(impactX - 22, impactY + 28)
    ctx.lineTo(impactX + 66, impactY - 70)
    ctx.lineTo(fieldRight + 72, impactY - 86)
    ctx.stroke()

    ctx.strokeStyle = hexToRgba(color, 0.2 * strength)
    ctx.lineWidth = 2.1
    ctx.beginPath()
    ctx.moveTo(impactX + 94, impactY - 112)
    ctx.lineTo(fieldRight + 84, impactY - 126)
    ctx.stroke()

    ctx.strokeStyle = hexToRgba(neutral, 0.075 * strength)
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(impactX + 112, impactY - 70)
    ctx.lineTo(fieldRight + 70, impactY - 94)
    ctx.stroke()

    ctx.save()
    ctx.translate(impactX, impactY)
    ctx.rotate(Math.PI / 4)
    ctx.fillStyle = hexToRgba(color, 0.58 * strength)
    ctx.shadowColor = hexToRgba(color, 0.28 * strength)
    ctx.shadowBlur = 8
    ctx.fillRect(-1.8, -12, 3.6, 24)
    ctx.restore()
  } else if (language === 'gravity-score') {
    const gravityX = fieldX + 30
    const gravityY = fieldY + 20
    const scoreGapLeft = gravityX - 172
    const scoreGapRight = gravityX - 122
    drawGlow(gravityX, gravityY, 154, 0.82)

    // The five staff lines begin measured and parallel, then the discovery
    // literally changes their physics. One absent beat keeps the system from
    // reading as a generic space HUD and mirrors Sigma's interrupted mind.
    ;[-2, -1, 0, 1, 2].forEach((lane, index) => {
      const laneY = startY + lane * 22
      const warpedY = gravityY + lane * (index === 2 ? 8 : 13)
      const isVoice = index === 2
      setStroke(
        isVoice ? color : neutral,
        isVoice ? 0.94 : 0.34,
        isVoice ? 2.7 : 1,
        [],
        isVoice ? 'focal' : 'base'
      )
      ctx.beginPath()
      ctx.moveTo(fieldLeft - 22, laneY)
      ctx.bezierCurveTo(
        fieldLeft + fieldWidth * 0.25,
        laneY - lane * 2,
        scoreGapLeft - 54,
        warpedY + lane * 8,
        scoreGapLeft,
        warpedY
      )
      ctx.stroke()

      setStroke(
        isVoice ? color : neutral,
        isVoice ? 0.88 : 0.28,
        isVoice ? 2.4 : 1,
        [],
        isVoice ? 'focal' : 'base'
      )
      ctx.beginPath()
      ctx.moveTo(scoreGapRight, warpedY + lane * 1.8)
      ctx.bezierCurveTo(
        gravityX - 86,
        warpedY - lane * 10,
        gravityX - 52,
        gravityY + lane * 5,
        gravityX,
        gravityY + lane * 2
      )
      ctx.stroke()
    })

    ctx.save()
    ctx.translate(gravityX, gravityY)
    ctx.rotate(-0.2)
    ;[72, 114, 154].forEach((radius, index) => {
      ctx.save()
      ctx.scale(1, 0.48 + index * 0.05)
      setStroke(index === 0 ? color : neutral, index === 0 ? 0.9 : (index === 1 ? 0.42 : 0.24), index === 0 ? 2.5 : 1, [], index === 0 ? 'focal' : 'base')
      ctx.beginPath()
      ctx.arc(0, 0, radius, -Math.PI * 0.1, Math.PI * (1.44 - index * 0.08))
      ctx.stroke()
      ctx.restore()
    })
    ctx.restore()

    // The legacy line field remains self-sufficient; the separate emblem
    // renderer owns all SVG imagery and never leaks into this choreography.
    setDominantStroke(color, 0.92, 3.2)
    ctx.beginPath()
    ctx.moveTo(scoreGapLeft + 22, gravityY + 62)
    ctx.lineTo(scoreGapLeft + 22, gravityY + 104)
    ctx.stroke()
    setStroke(neutral, 0.4, 1, [], 'micro')
    ctx.beginPath()
    ctx.moveTo(scoreGapLeft + 9, gravityY + 104)
    ctx.lineTo(scoreGapLeft + 35, gravityY + 104)
    ctx.stroke()
    drawNode(gravityX, gravityY, 5, 0.94, 'focal')
    drawMicroTicks(fieldRight - 204, y + height * 0.66, 4, 36, -1)
  } else if (language === 'bloom-lattice') {
    const bloomX = fieldX + 18
    const bloomY = fieldY + 10
    const transitionX = bloomX - 132
    drawGlow(bloomX, bloomY, 138, 0.68)

    // Vishkar's construction begins as an exact rectilinear system. Only at
    // one hinge does it choose organic growth, so the flower is narrative
    // transformation rather than a decorative wallpaper pattern.
    ;[-1.5, -0.5, 0.5, 1.5].forEach((lane, index) => {
      const sourceY = startY + lane * 36
      const hingeY = bloomY + lane * 20
      setStroke(index === 1 ? color : neutral, index === 1 ? 0.9 : 0.32, index === 1 ? 2.5 : 1, [], index === 1 ? 'focal' : 'base')
      ctx.beginPath()
      ctx.moveTo(fieldLeft - 22, sourceY)
      ctx.lineTo(fieldLeft + fieldWidth * 0.27, sourceY - lane * 4)
      ctx.lineTo(transitionX - 48, hingeY + lane * 8)
      ctx.lineTo(transitionX, hingeY)
      ctx.stroke()
    })

    setDominantStroke(color, 0.98, 3.2)
    ctx.beginPath()
    ctx.moveTo(transitionX, bloomY - 10)
    ctx.bezierCurveTo(
      transitionX + 42,
      bloomY - 58,
      bloomX - 54,
      bloomY - 42,
      bloomX,
      bloomY
    )
    ctx.stroke()

    const petals = [
      { tipX: 0, tipY: -116, baseLeft: -16, baseRight: 16, control: 34 },
      { tipX: -66, tipY: -82, baseLeft: -20, baseRight: 2, control: 30 },
      { tipX: 66, tipY: -82, baseLeft: -2, baseRight: 20, control: 30 },
      { tipX: -112, tipY: -28, baseLeft: -24, baseRight: -4, control: 24 },
      { tipX: 112, tipY: -28, baseLeft: 4, baseRight: 24, control: 24 }
    ]
    petals.forEach((petal, index) => {
      const tipX = bloomX + petal.tipX
      const tipY = bloomY + petal.tipY
      const directionX = Math.sign(petal.tipX)
      const baseY = bloomY + 16 + Math.abs(petal.tipX) * 0.04
      ctx.beginPath()
      ctx.moveTo(bloomX + petal.baseLeft, baseY)
      ctx.bezierCurveTo(
        bloomX + petal.tipX * 0.44 - directionX * petal.control,
        bloomY + petal.tipY * 0.5,
        tipX - directionX * 18,
        tipY + 20,
        tipX,
        tipY
      )
      ctx.bezierCurveTo(
        tipX + directionX * 18,
        tipY + 20,
        bloomX + petal.tipX * 0.44 + directionX * petal.control,
        bloomY + petal.tipY * 0.5,
        bloomX + petal.baseRight,
        baseY
      )
      ctx.closePath()
      ctx.fillStyle = hexToRgba(color, fieldAlpha(index === 0 ? 0.62 : 0.26, 'fill'))
      ctx.fill()
      setStroke(index === 0 ? color : neutral, index === 0 ? 0.92 : 0.52, index === 0 ? 2.2 : 1.1, [], index === 0 ? 'focal' : 'micro')
      ctx.stroke()

      setStroke(color, index === 0 ? 0.66 : 0.34, index === 0 ? 1.4 : 1, [], index === 0 ? 'focal' : 'micro')
      ctx.beginPath()
      ctx.moveTo(bloomX + (petal.baseLeft + petal.baseRight) / 2, baseY - 2)
      ctx.quadraticCurveTo(
        bloomX + petal.tipX * 0.42,
        bloomY + petal.tipY * 0.42,
        bloomX + petal.tipX * 0.78,
        bloomY + petal.tipY * 0.76
      )
      ctx.stroke()
    })
    drawNode(bloomX, bloomY, 5, 0.94, 'focal')

    setStroke(neutral, 0.32, 1, [], 'base')
    ctx.beginPath()
    ctx.moveTo(transitionX - 104, bloomY - 84)
    ctx.lineTo(transitionX - 104, bloomY + 70)
    ctx.moveTo(transitionX - 56, bloomY - 62)
    ctx.lineTo(transitionX - 56, bloomY + 50)
    ctx.stroke()
    drawMicroTicks(fieldRight - 210, y + height * 0.67, 5, 34, 1)
  } else if (language === 'lattice') {
    const constructX = fieldX - fieldWidth * 0.02
    const constructY = fieldY + 2
    const prismX = Math.min(fieldRight - 116, constructX + 92)
    const prismRightX = fieldRight + 58
    const prismTopY = constructY - 94
    const prismBottomY = constructY + 78
    const prismLeftX = prismX - 88
    drawGlow(prismX, constructY, 118, 0.72)

    // Symmetra's field is manufactured rather than discovered: parallel
    // construction rails resolve into one exact hard-light prism. A single
    // unfinished cell is the only exception, carrying her growing conscience.
    drawPlane([
      [prismLeftX, constructY],
      [prismX, prismTopY],
      [prismRightX, constructY - 30],
      [prismX + 8, constructY + 2]
    ], 0.48)
    drawPlane([
      [prismLeftX, constructY + 8],
      [prismX, prismBottomY],
      [prismRightX, constructY - 18],
      [prismX + 8, constructY + 8]
    ], 0.24)

    ctx.save()
    ctx.lineCap = 'square'
    ctx.lineJoin = 'bevel'
    ;[-1.5, -0.5, 0.5, 1.5].forEach((lane, index) => {
      const railY = startY + lane * 34
      const targetY = constructY + lane * 18
      const isPrimary = index === 1
      setStroke(
        isPrimary ? color : neutral,
        isPrimary ? 0.9 : 0.3,
        isPrimary ? 2.4 : 1,
        [],
        isPrimary ? 'focal' : 'base'
      )
      ctx.beginPath()
      ctx.moveTo(fieldLeft - 18, railY)
      ctx.lineTo(constructX - 82, railY - lane * 3)
      ctx.lineTo(prismLeftX, targetY)
      ctx.stroke()
    })

    setDominantStroke(color, 0.96, 2.8)
    ctx.beginPath()
    ctx.moveTo(prismLeftX, constructY)
    ctx.lineTo(prismX, prismTopY)
    ctx.lineTo(prismRightX, constructY - 30)
    ctx.moveTo(prismLeftX, constructY)
    ctx.lineTo(prismX, prismBottomY)
    ctx.moveTo(prismX, prismTopY)
    ctx.lineTo(prismX, prismBottomY)
    ctx.stroke()

    setStroke(color, 0.46, 1, [], 'base')
    ctx.beginPath()
    ctx.moveTo(prismX - 44, constructY - 46)
    ctx.lineTo(prismRightX - 52, constructY - 38)
    ctx.moveTo(prismX - 44, constructY + 39)
    ctx.lineTo(prismRightX - 44, constructY - 22)
    ctx.moveTo(prismX + 34, prismTopY + 12)
    ctx.lineTo(prismX + 34, constructY - 8)
    ctx.stroke()

    const openCellX = prismX + 56
    const openCellY = constructY - 12
    setStroke(neutral, 0.9, 1.7, [], 'focal')
    ctx.beginPath()
    ctx.moveTo(openCellX - 28, openCellY - 20)
    ctx.lineTo(openCellX + 18, openCellY - 12)
    ctx.moveTo(openCellX - 28, openCellY - 20)
    ctx.lineTo(openCellX - 28, openCellY + 18)
    ctx.lineTo(openCellX + 4, openCellY + 24)
    ctx.stroke()
    ctx.fillStyle = hexToRgba(neutral, dominantAlpha(0.88, 0.18))
    ctx.beginPath()
    ctx.arc(openCellX + 18, openCellY + 27, 2.8, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()

    drawNode(prismLeftX, constructY, 4, 0.86, 'focal')
    drawMicroTicks(fieldRight - 212, y + height * 0.67, 5, 34, 1)
  } else if (language === 'lock') {
    const lockX = fieldRight - 126
    const lockY = fieldY + 2
    const focusX = lockX
    const focusY = lockY + 38
    drawGlow(focusX, focusY, 166, 0.72)

    // Widowmaker's motion grammar is tension rather than extra decoration:
    // two separated sightlines narrow into one final lock at the hourglass.
    // The hero emblem stays an independent SVG and owns the identity layer.
    const mergeX = focusX - 122
    const mergeY = focusY + 4
    const primaryStartX = fieldLeft - 40
    const primaryStartY = startY + 86
    const echoStartX = fieldLeft - 46
    const echoStartY = startY + 58
    ctx.save()
    ctx.lineCap = 'round'

    // Before the sightline becomes a weapon, one pale, open gesture retains
    // the human ballet training underneath it. The S-curve loses amplitude as
    // it approaches the merge and is absorbed by the final red lock.
    ctx.strokeStyle = hexToRgba('#f1dce2', dominantAlpha(0.24, 0.062))
    ctx.lineWidth = 1.15
    ctx.beginPath()
    ctx.moveTo(fieldLeft - 32, startY + 118)
    ctx.bezierCurveTo(
      fieldLeft + fieldWidth * 0.18,
      startY + 30,
      fieldLeft + fieldWidth * 0.31,
      startY + 154,
      fieldLeft + fieldWidth * 0.46,
      startY + 74
    )
    ctx.bezierCurveTo(
      mergeX - 122,
      mergeY + 66,
      mergeX - 52,
      mergeY + 18,
      mergeX,
      mergeY
    )
    ctx.stroke()

    // A restrained underlay gives the converging gesture enough poster weight
    // without turning it into a neon laser or competing with the title block.
    ctx.strokeStyle = hexToRgba(color, dominantAlpha(0.16, 0.045))
    ctx.lineWidth = 7
    ctx.beginPath()
    ctx.moveTo(primaryStartX, primaryStartY)
    ctx.bezierCurveTo(fieldLeft + fieldWidth * 0.34, primaryStartY - 8, mergeX - 92, mergeY + 20, mergeX, mergeY)
    ctx.bezierCurveTo(mergeX + 38, mergeY - 2, focusX - 42, focusY + 2, focusX, focusY)
    ctx.stroke()

    // The secondary thread remains quieter and ends at the merge so only one
    // line reaches the mark. That convergence is the recognisable sniper cue.
    ctx.strokeStyle = hexToRgba(color, dominantAlpha(0.42, 0.11))
    ctx.lineWidth = 1.25
    ctx.beginPath()
    ctx.moveTo(echoStartX, echoStartY)
    ctx.bezierCurveTo(fieldLeft + fieldWidth * 0.32, echoStartY + 2, mergeX - 88, mergeY - 22, mergeX, mergeY)
    ctx.stroke()

    ctx.strokeStyle = hexToRgba(color, dominantAlpha(0.76, 0.18))
    ctx.lineWidth = 2.15
    ctx.beginPath()
    ctx.moveTo(primaryStartX, primaryStartY)
    ctx.bezierCurveTo(fieldLeft + fieldWidth * 0.34, primaryStartY - 8, mergeX - 92, mergeY + 20, mergeX, mergeY)
    ctx.stroke()

    ctx.strokeStyle = hexToRgba(color, dominantAlpha(0.88, 0.21))
    ctx.lineWidth = 2.35
    ctx.beginPath()
    ctx.moveTo(mergeX, mergeY)
    ctx.bezierCurveTo(mergeX + 38, mergeY - 2, focusX - 42, focusY + 2, focusX, focusY)
    ctx.stroke()

    // Keep the line layer meaningful without borrowing the SVG identity mark.
    ctx.fillStyle = hexToRgba('#e85d76', dominantAlpha(0.72, 0.17))
    ctx.beginPath()
    ctx.moveTo(focusX - 9, focusY - 12)
    ctx.lineTo(focusX + 9, focusY - 12)
    ctx.lineTo(focusX, focusY)
    ctx.closePath()
    ctx.moveTo(focusX - 9, focusY + 12)
    ctx.lineTo(focusX + 9, focusY + 12)
    ctx.lineTo(focusX, focusY)
    ctx.closePath()
    ctx.fill()

    ctx.save()
    ctx.fillStyle = hexToRgba('#ffd4dc', dominantAlpha(0.9, 0.24))
    ctx.shadowColor = hexToRgba('#e85d76', dominantAlpha(0.78, 0.2))
    ctx.shadowBlur = 10
    ctx.beginPath()
    ctx.arc(focusX, focusY, 2.3, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
    ctx.restore()
  } else if (language === 'fold') {
    const foldX = fieldX - 34
    const foldY = fieldY + 18
    const gateCenterX = Math.min(fieldRight - 124, foldX + 172)
    const gateHalfWidth = 104
    const gateTop = fieldY - 92
    const gateBottom = fieldY + 84
    const gateLeft = gateCenterX - gateHalfWidth
    const gateRight = gateCenterX + gateHalfWidth
    drawGlow(foldX, foldY, 112, 0.7)
    drawGlow(gateCenterX, fieldY - 8, 126, 0.5)

    // The street does not simply bend: it disappears at one cut and returns
    // through the shrine gate at a different height. The small closing curve
    // is a fox-tail cadence, not a literal fox silhouette.
    drawPlane([
      [fieldLeft - 18, startY + 42],
      [foldX - 54, foldY + 38],
      [foldX - 10, foldY + 4],
      [foldX + 34, foldY - 34],
      [gateCenterX - 12, gateBottom],
      [gateCenterX + 8, gateBottom - 4],
      [foldX + 18, foldY - 14]
    ], 0.3)

    ctx.save()
    ctx.lineCap = 'square'
    ctx.lineJoin = 'bevel'
    ctx.shadowColor = hexToRgba(color, dominantAlpha(0.58, 0.15))
    ctx.shadowBlur = 7
    setDominantStroke(color, 0.98, 3.2)
    ctx.beginPath()
    ctx.moveTo(fieldLeft - 18, startY + 42)
    ctx.lineTo(foldX - 54, foldY + 38)
    ctx.lineTo(foldX - 10, foldY + 4)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(foldX + 34, foldY - 34)
    ctx.lineTo(gateCenterX - 12, gateBottom)
    ctx.lineTo(gateCenterX + 6, gateTop + 34)
    ctx.lineTo(fieldRight + 54, gateTop + 6)
    ctx.stroke()
    ctx.restore()

    setStroke(neutral, 0.42, 1.1, [], 'base')
    ctx.beginPath()
    ctx.moveTo(fieldLeft - 18, startY + 78)
    ctx.lineTo(foldX - 36, foldY + 62)
    ctx.lineTo(foldX + 22, foldY + 8)
    ctx.moveTo(foldX + 50, foldY - 24)
    ctx.lineTo(gateCenterX + 10, gateBottom + 18)
    ctx.stroke()

    ctx.save()
    ctx.lineCap = 'square'
    ctx.lineJoin = 'bevel'
    setDominantStroke(color, 0.86, 2.4)
    ctx.beginPath()
    ctx.moveTo(gateLeft - 18, gateTop + 7)
    ctx.lineTo(gateLeft, gateTop)
    ctx.lineTo(gateRight, gateTop)
    ctx.lineTo(gateRight + 18, gateTop + 7)
    ctx.moveTo(gateLeft + 10, gateTop + 18)
    ctx.lineTo(gateRight - 10, gateTop + 18)
    ctx.stroke()

    setStroke(neutral, 0.5, 1.3, [], 'micro')
    ctx.beginPath()
    ctx.moveTo(gateLeft + 34, gateTop + 18)
    ctx.lineTo(gateLeft + 28, gateBottom)
    ctx.moveTo(gateRight - 34, gateTop + 18)
    ctx.lineTo(gateRight - 28, gateBottom - 16)
    ctx.stroke()
    ctx.restore()

    setStroke(color, 0.52, 1.4, [], 'focal')
    ctx.beginPath()
    ctx.moveTo(gateCenterX + 8, gateTop + 34)
    ctx.bezierCurveTo(
      gateCenterX + 72,
      gateTop - 20,
      fieldRight + 18,
      fieldY - 18,
      fieldRight + 62,
      fieldY + 20
    )
    ctx.stroke()
    drawNode(foldX - 10, foldY + 4, 4, 0.9, 'focal')
    drawNode(foldX + 34, foldY - 34, 3, 0.72, 'micro')
  } else if (language === 'undertow') {
    const pullX = fieldX
    const pullY = fieldY + 18
    drawGlow(pullX, pullY, 116, 0.66)

    const undertowWash = ctx.createLinearGradient(fieldLeft, startY + 72, fieldRight, pullY - 84)
    undertowWash.addColorStop(0, hexToRgba(color, fieldAlpha(0.12, 'fill')))
    undertowWash.addColorStop(0.58, hexToRgba(color, fieldAlpha(0.54, 'fill')))
    undertowWash.addColorStop(1, hexToRgba(color, 0))
    ctx.fillStyle = undertowWash
    ctx.beginPath()
    ctx.moveTo(fieldLeft - 22, startY + 64)
    ctx.bezierCurveTo(fieldLeft + fieldWidth * 0.25, startY + 38, pullX - fieldWidth * 0.2, pullY + 112, pullX, pullY)
    ctx.bezierCurveTo(pullX + fieldWidth * 0.1, pullY - 48, fieldRight - 24, pullY - 70, fieldRight + 62, pullY - 108)
    ctx.lineTo(fieldRight + 62, pullY - 82)
    ctx.bezierCurveTo(fieldRight - 10, pullY - 48, pullX + fieldWidth * 0.12, pullY - 22, pullX + 20, pullY + 26)
    ctx.bezierCurveTo(pullX - fieldWidth * 0.18, pullY + 136, fieldLeft + fieldWidth * 0.24, startY + 70, fieldLeft - 22, startY + 88)
    ctx.closePath()
    ctx.fill()

    ctx.save()
    ctx.lineCap = 'square'
    ctx.shadowColor = hexToRgba(color, dominantAlpha(0.58, 0.15))
    ctx.shadowBlur = 8
    setDominantStroke(color, 0.92, 3.6)
    ctx.beginPath()
    ctx.moveTo(fieldLeft - 22, startY + 62)
    ctx.bezierCurveTo(
      fieldLeft + fieldWidth * 0.24,
      startY + 38,
      pullX - fieldWidth * 0.2,
      pullY + 108,
      pullX,
      pullY
    )
    ctx.bezierCurveTo(pullX + fieldWidth * 0.08, pullY - 48, fieldRight - 26, pullY - 66, fieldRight + 62, pullY - 102)
    ctx.stroke()
    ctx.restore()

    setStroke(neutral, 0.38, 1, [], 'base')
    ctx.beginPath()
    ctx.moveTo(fieldRight + 32, pullY - 58)
    ctx.bezierCurveTo(pullX + fieldWidth * 0.14, pullY + 28, pullX - fieldWidth * 0.12, pullY + 76, fieldLeft + fieldWidth * 0.18, startY + 112)
    ctx.stroke()

    setDominantStroke(color, 0.72, 2.6, [], 0.19)
    ctx.beginPath()
    ctx.ellipse(pullX, pullY, 82, 44, -0.38, -Math.PI * 0.18, Math.PI * 1.08)
    ctx.stroke()
    ;[-1, 1].forEach((mark, index) => {
      setStroke(index === 0 ? color : neutral, index === 0 ? 0.58 : 0.3, index === 0 ? 1.8 : 1, [], index === 0 ? 'micro' : 'base')
      const markX = fieldLeft + fieldWidth * (0.35 + index * 0.075)
      const markY = startY + 70 + mark * 7
      ctx.beginPath()
      ctx.moveTo(markX - 12, markY + 18)
      ctx.lineTo(markX + 12, markY - 18)
      ctx.stroke()
    })
    drawNode(pullX, pullY, 4.5, 0.88, 'focal')
  } else if (language === 'noon-cut') {
    const noonX = fieldX
    const horizonY = fieldY + 10
    drawGlow(noonX, horizonY, 128, 0.72)

    ctx.save()
    ctx.lineCap = 'square'
    ctx.shadowColor = hexToRgba(color, fieldAlpha(0.58, 'focal'))
    ctx.shadowBlur = 7
    setStroke(color, 0.98, 2.8, [], 'focal')
    ctx.beginPath()
    ctx.moveTo(fieldLeft - 18, startY + 18)
    ctx.lineTo(noonX - 142, horizonY)
    ctx.lineTo(fieldRight + 54, horizonY - 8)
    ctx.stroke()
    ctx.restore()

    setStroke(neutral, 0.34, 1, [], 'base')
    ctx.beginPath()
    ctx.moveTo(fieldLeft - 18, startY + 58)
    ctx.lineTo(noonX - 148, horizonY + 22)
    ctx.lineTo(fieldRight + 54, horizonY + 12)
    ctx.stroke()

    setStroke(color, 0.92, 2.4, [], 'focal')
    ctx.beginPath()
    ctx.arc(noonX, horizonY, 132, Math.PI, Math.PI * 1.86)
    ctx.stroke()
    setStroke(neutral, 0.32, 1, [], 'base')
    ctx.beginPath()
    ctx.arc(noonX, horizonY, 156, Math.PI * 0.1, Math.PI * 0.46)
    ctx.stroke()

    setStroke(color, 0.66, 1.8, [], 'micro')
    ctx.beginPath()
    ctx.moveTo(noonX, horizonY - 154)
    ctx.lineTo(noonX, horizonY - 88)
    ctx.moveTo(noonX, horizonY + 56)
    ctx.lineTo(noonX, horizonY + 106)
    ctx.stroke()
    drawNode(noonX, horizonY, 3.5, 0.92, 'focal')
    drawMicroTicks(fieldRight - 194, y + height * 0.66, 4, 38, -1)
  } else if (language === 'particle-vault') {
    const vaultX = fieldX
    const vaultY = fieldY
    drawGlow(vaultX, vaultY, 154, 0.82)

    ctx.save()
    ctx.lineCap = 'round'
    ctx.strokeStyle = hexToRgba(color, fieldAlpha(0.52, 'fill'))
    ctx.lineWidth = 28
    ctx.beginPath()
    ctx.ellipse(vaultX, vaultY, 244, 126, -0.12, Math.PI * 0.62, Math.PI * 1.92)
    ctx.stroke()
    ctx.restore()

    setStroke(color, 1, 3.2, [], 'focal')
    ctx.beginPath()
    ctx.ellipse(vaultX, vaultY, 244, 126, -0.12, Math.PI * 0.62, Math.PI * 1.92)
    ctx.stroke()
    setStroke(neutral, 0.34, 1, [], 'base')
    ctx.beginPath()
    ctx.ellipse(vaultX, vaultY, 204, 94, -0.12, -Math.PI * 0.34, Math.PI * 0.58)
    ctx.stroke()

    ctx.save()
    ctx.lineCap = 'square'
    setStroke(color, 0.82, 2.2, [], 'focal')
    ctx.beginPath()
    ctx.moveTo(fieldLeft - 18, startY + 42)
    ctx.lineTo(vaultX - 72, vaultY + 14)
    ctx.lineTo(fieldRight + 54, vaultY - 42)
    ctx.stroke()
    ctx.restore()

    ;[-1, 0, 1].forEach((mark, index) => {
      const markX = vaultX - 118 + index * 50
      setStroke(index === 1 ? color : neutral, index === 1 ? 0.72 : 0.3, index === 1 ? 1.8 : 1, [], index === 1 ? 'micro' : 'base')
      ctx.beginPath()
      ctx.moveTo(markX - 7, vaultY - 36)
      ctx.lineTo(markX + 7, vaultY + 30)
      ctx.stroke()
    })
    drawNode(vaultX - 72, vaultY + 14, 4.5, 0.9, 'focal')
  } else if (language === 'vow-fracture') {
    const vowX = fieldX - 28
    const vowY = fieldY + 8
    const fractureX = vowX + 20
    const fractureY = vowY + 6
    drawGlow(fractureX, fractureY, 138, 0.74)

    // A quiet Shambali vow exists only on the left side of the fracture. The
    // Null Sector half grows from that same break as an angular, unfinished
    // mask so the conflict is structural rather than generic purple menace.
    drawPlane([
      [fractureX + 8, fractureY - 8],
      [vowX + 112, vowY - 104],
      [fieldRight + 54, vowY - 120],
      [fieldRight + 54, vowY - 62],
      [vowX + 132, vowY - 42]
    ], 0.5)
    drawPlane([
      [fractureX + 12, fractureY + 12],
      [vowX + 96, vowY + 72],
      [vowX + 146, vowY + 42],
      [vowX + 122, vowY - 24]
    ], 0.22)

    ctx.save()
    ctx.lineCap = 'square'
    ctx.lineJoin = 'bevel'
    setDominantStroke(neutral, 0.72, 2.2, [], 0.15)
    ctx.beginPath()
    ctx.ellipse(vowX - 18, vowY, 104, 142, 0, Math.PI * 0.6, Math.PI * 1.4)
    ctx.moveTo(vowX - 18, y + 94)
    ctx.lineTo(vowX - 18, vowY - 42)
    ctx.moveTo(vowX - 18, vowY + 48)
    ctx.lineTo(vowX - 18, y + height - 122)
    ctx.stroke()

    setStroke(neutral, 0.48, 1.2, [], 'micro')
    ctx.beginPath()
    ctx.moveTo(fieldLeft - 18, startY + 54)
    ctx.lineTo(vowX - 34, vowY + 24)
    ctx.lineTo(fractureX, fractureY)
    ctx.stroke()

    ctx.shadowColor = hexToRgba(color, dominantAlpha(0.62, 0.16))
    ctx.shadowBlur = 7
    setDominantStroke(color, 1, 3.6)
    ctx.beginPath()
    ctx.moveTo(fractureX, fractureY)
    ctx.lineTo(vowX + 112, vowY - 96)
    ctx.lineTo(fieldRight + 54, vowY - 114)
    ctx.moveTo(fractureX + 8, fractureY + 18)
    ctx.lineTo(vowX + 130, vowY - 32)
    ctx.lineTo(fieldRight + 54, vowY - 52)
    ctx.moveTo(fractureX + 12, fractureY + 26)
    ctx.lineTo(vowX + 92, vowY + 74)
    ctx.lineTo(vowX + 148, vowY + 42)
    ctx.stroke()

    setStroke(color, 0.54, 1.3, [], 'micro')
    ctx.beginPath()
    ctx.moveTo(vowX + 112, vowY - 96)
    ctx.lineTo(vowX + 130, vowY - 32)
    ctx.lineTo(vowX + 92, vowY + 74)
    ctx.stroke()
    ctx.restore()

    ctx.fillStyle = hexToRgba(neutral, dominantAlpha(0.74, 0.16))
    ;[-14, 0, 14].forEach((offset, index) => {
      ctx.beginPath()
      ctx.arc(vowX + 96 + Math.abs(offset) * 0.35, vowY - 18 + offset, index === 1 ? 2.8 : 2.2, 0, Math.PI * 2)
      ctx.fill()
    })
    drawNode(fractureX, fractureY, 4, 0.92, 'focal')
  } else if (language === 'jump-cut') {
    const jumpX = fieldX + 14
    const jumpY = fieldY
    const firstCutX = jumpX - 174
    const secondCutX = jumpX - 112
    drawGlow(jumpX, jumpY, 126, 0.72)

    // Three time traces share the same destination but lose different frames
    // on the way. Only the central trace reconnects cleanly at the chronal
    // anchor; the echoes remain visibly one frame early and one frame late.
    ctx.save()
    ctx.lineCap = 'square'
    ;[-1, 0, 1].forEach((echo, index) => {
      const sourceY = startY + echo * 36
      const anchorY = jumpY + echo * 18
      const isPrimary = index === 1
      if (isPrimary) setDominantStroke(color, 0.98, 3, [], 0.22)
      else setStroke(neutral, 0.42, 1.1, [], 'base')

      ctx.beginPath()
      ctx.moveTo(fieldLeft - 18, sourceY)
      ctx.bezierCurveTo(
        fieldLeft + fieldWidth * 0.24,
        sourceY - 28,
        firstCutX - 54,
        anchorY + 44,
        firstCutX,
        anchorY + 28
      )
      ctx.stroke()

      ctx.beginPath()
      ctx.moveTo(secondCutX, anchorY + echo * 10)
      ctx.lineTo(jumpX - 34, anchorY)
      ctx.stroke()

      ctx.beginPath()
      ctx.moveTo(jumpX + 34, anchorY - echo * 6)
      ctx.lineTo(fieldRight + 56, jumpY - 48 + echo * 8)
      ctx.stroke()
    })
    ctx.restore()

    setStroke(neutral, 0.62, 1.3, [], 'micro')
    ctx.beginPath()
    ctx.moveTo(firstCutX - 7, jumpY - 64)
    ctx.lineTo(firstCutX + 7, jumpY - 44)
    ctx.moveTo(firstCutX - 7, jumpY + 44)
    ctx.lineTo(firstCutX + 7, jumpY + 64)
    ctx.moveTo(secondCutX - 7, jumpY - 42)
    ctx.lineTo(secondCutX + 7, jumpY - 22)
    ctx.moveTo(secondCutX - 7, jumpY + 22)
    ctx.lineTo(secondCutX + 7, jumpY + 42)
    ctx.stroke()

    setDominantStroke(color, 0.88, 2.2)
    ctx.beginPath()
    ctx.arc(jumpX, jumpY, 66, -Math.PI * 0.16, Math.PI * 0.34)
    ctx.moveTo(jumpX - 62, jumpY + 22)
    ctx.arc(jumpX, jumpY, 66, Math.PI * 0.9, Math.PI * 1.56)
    ctx.stroke()
    setStroke(neutral, 0.46, 1.1, [42, 16], 'base')
    ctx.beginPath()
    ctx.arc(jumpX, jumpY, 98, -Math.PI * 0.32, Math.PI * 1.18)
    ctx.stroke()
    ctx.setLineDash([])

    setStroke(color, 0.72, 1.4, [], 'micro')
    ctx.beginPath()
    ;[-1, 0, 1].forEach(index => {
      const angle = -Math.PI * 0.5 + index * Math.PI * 0.5
      ctx.moveTo(jumpX + Math.cos(angle) * 44, jumpY + Math.sin(angle) * 44)
      ctx.lineTo(jumpX + Math.cos(angle) * 58, jumpY + Math.sin(angle) * 58)
    })
    ctx.stroke()
    drawNode(jumpX, jumpY, 4.5, 0.92, 'focal')
  }

  ctx.setLineDash([])
  ctx.restore()
}

function drawDirectorCutAmbientLineField(ctx, motif, options) {
  const style = safeText(motif?.ambientLineStyle)
  if (!style) return

  const { x, y, width, height, accent, secondary } = options
  const requestedStrength = Number(motif?.ambientLineStrength)
  const strength = Number.isFinite(requestedStrength)
    ? Math.max(0.2, Math.min(1, requestedStrength))
    : 0.7
  const requestedY = Number(motif?.ambientLineY)
  const centerY = y + height * (Number.isFinite(requestedY)
    ? Math.max(0.32, Math.min(0.72, requestedY))
    : 0.54)
  const clipLeft = Math.max(x, Math.min(x + width, Number(options?.clipLeft) || x))
  const clipRight = Math.max(clipLeft, Math.min(x + width, Number(options?.clipRight) || (x + width)))
  const mainColor = safeText(motif?.languageColor, secondary || accent)
  const neutral = safeText(motif?.ambientLineNeutral, safeText(motif?.languageNeutral, '#f5ecd2'))
  // Keep the music field around the portrait; the independent emblem owns the right side.
  const fadeStops = style === 'soundwave'
    ? [[0, 0.82], [0.09, 0.94], [0.24, 1], [0.36, 0.92], [0.48, 0.4], [0.6, 0.1], [0.76, 0.035], [1, 0]]
    : style === 'authored'
      ? [[0, 0.64], [0.12, 0.9], [0.3, 1], [0.42, 0.64], [0.52, 0.22], [0.66, 0.05], [0.82, 0], [1, 0]]
      : [[0, 0], [0.1, 0.48], [0.34, 1], [0.72, 0.78], [0.94, 0.28], [1, 0]]
  const makeGradient = (color, alpha) => {
    const gradient = ctx.createLinearGradient(x, 0, x + width, 0)
    fadeStops.forEach(([position, opacity]) => {
      gradient.addColorStop(position, hexToRgba(color, alpha * opacity))
    })
    return gradient
  }

  ctx.save()
  ctx.beginPath()
  ctx.rect(clipLeft, y, clipRight - clipLeft, height)
  ctx.clip()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  if (style === 'authored') {
    for (const path of motif.ambientField?.paths || []) {
      ctx.strokeStyle = makeGradient(path.tone === 'neutral' ? neutral : mainColor, path.alpha * strength)
      ctx.lineWidth = path.width
      ctx.save()
      ctx.translate(x, y)
      ctx.scale(width / 1000, height / 600)
      ctx.stroke(new Path2D(path.d))
      ctx.restore()
    }
  } else if (style === 'soundwave') {
    for (let band = -5; band <= 5; band += 1) {
      const distance = Math.abs(band)
      const greenBand = band % 4 === 0
      const alpha = strength * (band === 0 ? 0.35 : greenBand ? 0.17 : 0.14 + (5 - distance) * 0.012)
      const color = greenBand ? mainColor : neutral
      ctx.strokeStyle = makeGradient(color, alpha)
      ctx.lineWidth = band === 0 ? 3 : greenBand ? 1.5 : band % 3 === 0 ? 1.35 : 1.05
      ctx.beginPath()
      for (let step = 0; step <= 180; step += 1) {
        const progress = step / 180
        const pointX = x + progress * width
        // Restore the original short-period rhythm; phase offsets stay below the band spacing.
        const wave = Math.sin(progress * Math.PI * 7 + 3.5 + band * 0.3) * 30
        const pointY = centerY + band * 24 + wave
        if (step === 0) ctx.moveTo(pointX, pointY)
        else ctx.lineTo(pointX, pointY)
      }
      ctx.stroke()
    }
  } else if (style === 'fold') {
    ;[-26, 0, 24].forEach((offset, index) => {
      const alpha = strength * (index === 1 ? 0.18 : 0.075)
      ctx.strokeStyle = makeGradient(index === 1 ? mainColor : neutral, alpha)
      ctx.lineWidth = index === 1 ? 2 : 1
      ctx.setLineDash(index === 1 ? [190, 18, 82, 24] : [76, 28])
      ctx.beginPath()
      ctx.moveTo(x - width * 0.04, centerY + offset + 54)
      ctx.bezierCurveTo(
        x + width * 0.2,
        centerY + offset + 46,
        x + width * 0.36,
        centerY + offset - 24,
        x + width * 0.54,
        centerY + offset - 8
      )
      ctx.lineTo(x + width * 0.64, centerY + offset - 38)
      ctx.bezierCurveTo(
        x + width * 0.76,
        centerY + offset - 66,
        x + width * 0.86,
        centerY + offset - 14,
        x + width * 1.04,
        centerY + offset - 46
      )
      ctx.stroke()
    })
  }

  ctx.setLineDash([])
  ctx.restore()
}

function drawDirectorCutLineChoreography(ctx, motif, options) {
  const direction = motif?.lineDirection
  if (!direction) return

  const { x, y, width, height, accent, secondary } = options
  const clampRatio = (value, fallback, minimum = 0, maximum = 1) => {
    const number = Number(value)
    return Number.isFinite(number) ? Math.max(minimum, Math.min(maximum, number)) : fallback
  }
  const grammar = safeText(direction.grammar, 'flow')
  const posterEdition = motif?.languageFieldEdition === 'poster'
  const originX = x + width * clampRatio(direction.originX, 0.1, 0.02, 0.28)
  const directionOriginY = clampRatio(direction.originY, 0.7, 0.44, 0.86)
  const posterOriginY = 0.44 + ((directionOriginY - 0.44) * 0.45)
  const originY = y + height * (posterEdition ? posterOriginY : directionOriginY)
  const focusX = x + width * clampRatio(direction.focusX, 0.82, 0.58, 0.94)
  const focusY = y + height * clampRatio(direction.focusY, 0.34, 0.18, 0.58)
  const bend = clampRatio(direction.bend, -0.36, -0.82, 0.82)
  const breakAt = clampRatio(direction.breakAt, 0.58, 0.34, 0.78)
  const intensity = clampRatio(direction.intensity, 0.86, 0.6, 1)
  const fieldStrength = posterEdition ? 0.94 : (motif?.languageField ? 0.38 : 1)
  const mainColor = safeText(motif?.languageColor, secondary || accent)
  const neutral = safeText(motif?.languageNeutral, '#f5ecd2')
  const isRailMap = motif?.languageField === 'rail-map'
  const requestedTravelX = Number(options?.travelX)
  const travelX = isRailMap && Number.isFinite(requestedTravelX)
    ? Math.max(x - width * 0.42, Math.min(x, requestedTravelX))
    : x
  const travelRight = x + width
  const travelWidth = Math.max(width, travelRight - travelX)
  const requestedLineRight = Number(options?.lineRight)
  const lineRight = isRailMap && Number.isFinite(requestedLineRight)
    ? Math.max(travelRight, Math.min(travelRight + width * 0.18, requestedLineRight))
    : travelRight
  const posterGrammarBoost = {
    orbit: 1.16,
    flow: 1.14,
    lattice: 1.08,
    cut: 1.08,
    fracture: 1.06
  }[grammar] || 1
  const baseAlpha = Math.min(
    posterEdition ? 0.145 : 0.15,
    0.108 * intensity * fieldStrength * (posterEdition ? posterGrammarBoost : 1)
  )
  const controlOne = {
    x: originX + width * 0.28,
    y: originY - height * (0.12 + bend * 0.04)
  }
  const controlTwo = {
    x: focusX - width * 0.24,
    y: focusY + height * (bend * 0.18)
  }
  const pointAt = (t, lane = 0, converge = true) => {
    const inverse = 1 - t
    const laneOffset = lane * height * 0.025 * (converge ? inverse : 1)
    return {
      x: (inverse ** 3 * originX)
        + (3 * inverse ** 2 * t * controlOne.x)
        + (3 * inverse * t ** 2 * controlTwo.x)
        + (t ** 3 * focusX),
      y: (inverse ** 3 * originY)
        + (3 * inverse ** 2 * t * controlOne.y)
        + (3 * inverse * t ** 2 * controlTwo.y)
        + (t ** 3 * focusY)
        + laneOffset
    }
  }
  const traceCurve = ({
    lane = 0,
    alpha = baseAlpha,
    lineWidth = 1,
    dash = [],
    gap = true,
    converge = true,
    wobble = 0
  } = {}) => {
    ctx.strokeStyle = hexToRgba(mainColor, alpha)
    ctx.lineWidth = lineWidth
    ctx.setLineDash(dash)
    ctx.beginPath()
    let penDown = false
    for (let step = 0; step <= 72; step += 1) {
      const t = step / 72
      if (gap && Math.abs(t - breakAt) < 0.026) {
        penDown = false
        continue
      }
      const point = pointAt(t, lane, converge)
      point.y += Math.sin((t * Math.PI * 5) + bend * 3) * wobble * height
      if (!penDown) {
        ctx.moveTo(point.x, point.y)
        penDown = true
      } else {
        ctx.lineTo(point.x, point.y)
      }
    }
    ctx.stroke()
    ctx.setLineDash([])
  }
  const drawFocusNode = (radius = 4, alpha = baseAlpha * 1.7) => {
    ctx.fillStyle = hexToRgba(mainColor, Math.min(0.24, alpha))
    ctx.beginPath()
    ctx.arc(focusX, focusY, radius, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = hexToRgba(neutral, Math.min(0.11, baseAlpha * 0.72))
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.arc(focusX, focusY, radius + 7, 0, Math.PI * 2)
    ctx.stroke()
  }

  ctx.save()
  ctx.beginPath()
  ctx.rect(isRailMap ? travelX : x, y, isRailMap ? lineRight - travelX : width, height)
  ctx.clip()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  if (grammar === 'lock' && isRailMap) {
    const hardRailX = focusX - width * 0.17
    const railY = focusY + 1
    const drawRailRoute = ({
      startX,
      startY,
      controlOneX,
      controlOneY,
      controlTwoX,
      controlTwoY,
      endY,
      color = mainColor,
      alpha,
      lineWidth,
      dash = []
    }) => {
      const routeGradient = ctx.createLinearGradient(startX, 0, hardRailX, 0)
      routeGradient.addColorStop(0, hexToRgba(color, 0))
      routeGradient.addColorStop(0.16, hexToRgba(color, alpha * 0.56))
      routeGradient.addColorStop(0.72, hexToRgba(color, alpha))
      routeGradient.addColorStop(1, hexToRgba(color, alpha * 0.82))
      ctx.strokeStyle = routeGradient
      ctx.lineWidth = lineWidth
      ctx.setLineDash(dash)
      ctx.beginPath()
      ctx.moveTo(startX, startY)
      ctx.bezierCurveTo(controlOneX, controlOneY, controlTwoX, controlTwoY, hardRailX, endY)
      ctx.stroke()
      ctx.setLineDash([])
    }

    ctx.save()
    ctx.lineCap = 'square'
    ctx.lineJoin = 'bevel'
    drawRailRoute({
      startX: travelX + travelWidth * 0.13,
      startY: y + height * 0.28,
      controlOneX: travelX + travelWidth * 0.34,
      controlOneY: y + height * 0.2,
      controlTwoX: hardRailX - travelWidth * 0.18,
      controlTwoY: railY - height * 0.08,
      endY: railY - 7,
      color: neutral,
      alpha: baseAlpha * 0.95,
      lineWidth: 1.5,
      dash: [210, 20, 120, 16]
    })
    drawRailRoute({
      startX: travelX + travelWidth * 0.03,
      startY: y + height * 0.53,
      controlOneX: travelX + travelWidth * 0.31,
      controlOneY: y + height * 0.48,
      controlTwoX: hardRailX - travelWidth * 0.2,
      controlTwoY: railY + height * 0.025,
      endY: railY + 3,
      alpha: baseAlpha * 1.95,
      lineWidth: 3.2,
      dash: [360, 22, 520]
    })
    drawRailRoute({
      startX: travelX + travelWidth * 0.09,
      startY: y + height * 0.69,
      controlOneX: travelX + travelWidth * 0.32,
      controlOneY: y + height * 0.72,
      controlTwoX: hardRailX - travelWidth * 0.17,
      controlTwoY: railY + height * 0.1,
      endY: railY + 9,
      alpha: baseAlpha * 0.75,
      lineWidth: 1.35,
      dash: [160, 22, 90, 18]
    })
    ctx.restore()
  } else if (grammar === 'lock') {
    traceCurve({ lane: -1.25, alpha: baseAlpha * 0.44, lineWidth: 1, gap: false })
    traceCurve({ lane: 1.15, alpha: baseAlpha * 0.58, lineWidth: 1.25, gap: false })
    traceCurve({ alpha: baseAlpha * 1.55, lineWidth: 2.15 })
    ctx.strokeStyle = hexToRgba(mainColor, baseAlpha * 1.34)
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(focusX - 22, focusY)
    ctx.lineTo(focusX - 7, focusY)
    ctx.moveTo(focusX + 7, focusY)
    ctx.lineTo(focusX + 22, focusY)
    ctx.moveTo(focusX, focusY - 22)
    ctx.lineTo(focusX, focusY - 7)
    ctx.moveTo(focusX, focusY + 7)
    ctx.lineTo(focusX, focusY + 22)
    ctx.stroke()
    drawFocusNode(3.4)
  } else if (grammar === 'orbit') {
    traceCurve({ lane: -1, alpha: baseAlpha * 0.48, lineWidth: 1, gap: false, converge: false })
    traceCurve({ alpha: baseAlpha * 1.24, lineWidth: 1.8 })
    ;[52, 86].forEach((radius, index) => {
      ctx.save()
      ctx.translate(focusX, focusY)
      ctx.rotate(bend * 0.24)
      ctx.scale(1, 0.52 + index * 0.08)
      ctx.strokeStyle = hexToRgba(index === 0 ? mainColor : neutral, baseAlpha * (index === 0 ? 1.35 : 0.54))
      ctx.lineWidth = index === 0 ? 1.8 : 1
      ctx.beginPath()
      ctx.arc(0, 0, radius, -Math.PI * 0.16, Math.PI * (1.54 - index * 0.12))
      ctx.stroke()
      ctx.restore()
    })
    drawFocusNode(4)
  } else if (grammar === 'lattice') {
    traceCurve({ alpha: baseAlpha * 1.18, lineWidth: 1.8 })
    traceCurve({ lane: 1.25, alpha: baseAlpha * 0.42, lineWidth: 1, gap: false })
    const cell = 34
    ctx.strokeStyle = hexToRgba(mainColor, baseAlpha * 0.9)
    ctx.lineWidth = 1.15
    ctx.beginPath()
    ctx.moveTo(focusX - cell * 1.8, focusY + cell * 0.9)
    ctx.lineTo(focusX - cell * 0.8, focusY - cell * 0.8)
    ctx.lineTo(focusX + cell * 0.2, focusY + cell * 0.2)
    ctx.lineTo(focusX + cell * 1.3, focusY - cell * 1.05)
    ctx.lineTo(focusX + cell * 2.2, focusY - cell * 0.1)
    ctx.stroke()
    ctx.strokeStyle = hexToRgba(neutral, baseAlpha * 0.44)
    ctx.beginPath()
    ctx.moveTo(focusX - cell * 0.8, focusY - cell * 0.8)
    ctx.lineTo(focusX - cell * 0.8, focusY + cell * 0.92)
    ctx.moveTo(focusX + cell * 0.2, focusY + cell * 0.2)
    ctx.lineTo(focusX + cell * 0.2, focusY + cell * 1.25)
    ctx.moveTo(focusX + cell * 1.3, focusY - cell * 1.05)
    ctx.lineTo(focusX + cell * 1.3, focusY + cell * 0.52)
    ctx.stroke()
    drawFocusNode(3.8)
  } else if (grammar === 'impact') {
    traceCurve({ alpha: baseAlpha * 1.42, lineWidth: 2.3 })
    traceCurve({ lane: -1.3, alpha: baseAlpha * 0.45, lineWidth: 1, gap: false })
    ;[38, 66].forEach((radius, index) => {
      ctx.strokeStyle = hexToRgba(index === 0 ? mainColor : neutral, baseAlpha * (index === 0 ? 1.28 : 0.44))
      ctx.lineWidth = index === 0 ? 1.8 : 1
      ctx.setLineDash(index === 0 ? [18, 9] : [7, 12])
      ctx.beginPath()
      ctx.arc(focusX, focusY, radius, -Math.PI * 0.84, Math.PI * 0.72)
      ctx.stroke()
    })
    ctx.setLineDash([])
    ;[-0.72, -0.2, 0.32].forEach((angle, index) => {
      ctx.strokeStyle = hexToRgba(mainColor, baseAlpha * (0.9 - index * 0.18))
      ctx.beginPath()
      ctx.moveTo(focusX + Math.cos(angle) * 18, focusY + Math.sin(angle) * 18)
      ctx.lineTo(focusX + Math.cos(angle) * (74 + index * 18), focusY + Math.sin(angle) * (74 + index * 18))
      ctx.stroke()
    })
    drawFocusNode(4.5)
  } else if (grammar === 'fracture') {
    ctx.strokeStyle = hexToRgba(mainColor, baseAlpha * 1.38)
    ctx.lineWidth = 1.9
    ctx.beginPath()
    let penDown = false
    for (let step = 0; step <= 32; step += 1) {
      const t = step / 32
      if (Math.abs(t - breakAt) < 0.04) {
        penDown = false
        continue
      }
      const point = pointAt(t)
      const fracture = step > 12 ? ((step % 2 === 0 ? 1 : -1) * height * 0.008 * t) : 0
      if (!penDown) {
        ctx.moveTo(point.x, point.y + fracture)
        penDown = true
      } else {
        ctx.lineTo(point.x, point.y + fracture)
      }
    }
    ctx.stroke()
    ;[-1, 1].forEach((branch, index) => {
      const root = pointAt(Math.min(0.9, breakAt + 0.13 + index * 0.08))
      ctx.strokeStyle = hexToRgba(index === 0 ? mainColor : neutral, baseAlpha * (index === 0 ? 0.9 : 0.4))
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(root.x, root.y)
      ctx.lineTo(root.x + width * 0.07, root.y + branch * height * 0.08)
      ctx.lineTo(root.x + width * 0.12, root.y + branch * height * 0.035)
      ctx.stroke()
    })
    drawFocusNode(3.8)
  } else if (grammar === 'vow') {
    traceCurve({ alpha: baseAlpha * 1.22, lineWidth: 1.9 })
    traceCurve({ lane: 1.25, alpha: baseAlpha * 0.42, lineWidth: 1, gap: false })
    ctx.strokeStyle = hexToRgba(mainColor, baseAlpha * 1.1)
    ctx.lineWidth = 1.7
    ctx.beginPath()
    ctx.moveTo(focusX, focusY - 82)
    ctx.lineTo(focusX, focusY - 16)
    ctx.moveTo(focusX, focusY + 16)
    ctx.lineTo(focusX, focusY + 94)
    ctx.stroke()
    ctx.strokeStyle = hexToRgba(neutral, baseAlpha * 0.52)
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.arc(focusX, focusY + 18, 88, Math.PI * 1.12, Math.PI * 1.88)
    ctx.stroke()
    drawFocusNode(4)
  } else if (grammar === 'cut') {
    traceCurve({ alpha: baseAlpha * 1.26, lineWidth: 1.8, dash: [72, 20], gap: false })
    traceCurve({ lane: -1.25, alpha: baseAlpha * 0.42, lineWidth: 1, dash: [30, 24], gap: false })
    const frameWidth = 46
    ;[-1, 0, 1].forEach((frame, index) => {
      const frameX = focusX + frame * 64
      const frameY = focusY + frame * 10
      ctx.strokeStyle = hexToRgba(index === 1 ? mainColor : neutral, baseAlpha * (index === 1 ? 1.1 : 0.42))
      ctx.lineWidth = index === 1 ? 1.6 : 1
      ctx.strokeRect(frameX - frameWidth / 2, frameY - 24, frameWidth, 48)
    })
    drawFocusNode(3.4)
  } else {
    traceCurve({ lane: -1.2, alpha: baseAlpha * 0.38, lineWidth: 1, gap: false, wobble: 0.009 })
    traceCurve({ alpha: baseAlpha * 1.28, lineWidth: 1.9, wobble: 0.006 })
    traceCurve({ lane: 1.1, alpha: baseAlpha * 0.48, lineWidth: 1, gap: false, wobble: 0.012 })
    drawFocusNode(4)
  }

  ctx.setLineDash([])
  ctx.restore()
}

function getDirectorCutMotif(data) {
  return data.directorCut?.profile || getDirectorCutProfile(data.topHero, data.role, data.kind)
}

function drawDirectorCutRailAfterimageField(ctx, motif, {
  x,
  y,
  width,
  height,
  secondary
}) {
  const railColor = motif?.languageColor || secondary
  const railNeutral = motif?.languageNeutral || '#e1e7df'
  const routes = [
    { startY: 0.29, endY: 0.38, controlY1: 0.25, controlY2: 0.34, color: railNeutral, alpha: 0.09, lineWidth: 1.1 },
    { startY: 0.36, endY: 0.42, controlY1: 0.33, controlY2: 0.39, color: railColor, alpha: 0.17, lineWidth: 2 },
    { startY: 0.54, endY: 0.49, controlY1: 0.52, controlY2: 0.5, color: railColor, alpha: 0.135, lineWidth: 1.55 },
    { startY: 0.66, endY: 0.56, controlY1: 0.64, controlY2: 0.58, color: railNeutral, alpha: 0.07, lineWidth: 1.05 }
  ]

  ctx.save()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  routes.forEach((route, index) => {
    const startX = x - (width * (0.05 + ((index % 3) * 0.018)))
    const endX = x + (width * (1.015 + ((index % 2) * 0.014)))
    const controlX1 = x + (width * (0.2 + ((index % 4) * 0.018)))
    const controlX2 = x + (width * (0.65 + ((index % 3) * 0.022)))
    const trailGradient = ctx.createLinearGradient(startX, 0, endX, 0)
    trailGradient.addColorStop(0, hexToRgba(route.color, 0))
    trailGradient.addColorStop(0.09, hexToRgba(route.color, route.alpha * 0.42))
    trailGradient.addColorStop(0.36, hexToRgba(route.color, route.alpha))
    trailGradient.addColorStop(0.7, hexToRgba(route.color, route.alpha * 0.76))
    trailGradient.addColorStop(0.93, hexToRgba(route.color, route.alpha * 0.3))
    trailGradient.addColorStop(1, hexToRgba(route.color, 0))

    ctx.strokeStyle = trailGradient
    ctx.lineWidth = route.lineWidth
    ctx.beginPath()
    ctx.moveTo(startX, y + (height * route.startY))
    ctx.bezierCurveTo(
      controlX1,
      y + (height * route.controlY1),
      controlX2,
      y + (height * route.controlY2),
      endX,
      y + (height * route.endY)
    )
    ctx.stroke()
  })

  ctx.restore()
}

function drawDirectorCutRailCopyCleanZone(ctx, {
  centerX,
  centerY,
  radiusX,
  radiusY
}) {
  ctx.save()
  ctx.translate(centerX, centerY)
  ctx.scale(1, radiusY / radiusX)
  const cleanZone = ctx.createRadialGradient(0, 0, radiusX * 0.24, 0, 0, radiusX)
  cleanZone.addColorStop(0, 'rgba(8,9,6,0.98)')
  cleanZone.addColorStop(0.52, 'rgba(8,9,6,0.94)')
  cleanZone.addColorStop(0.78, 'rgba(8,9,6,0.68)')
  cleanZone.addColorStop(1, 'rgba(8,9,6,0)')
  ctx.fillStyle = cleanZone
  ctx.beginPath()
  ctx.arc(0, 0, radiusX, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function drawDirectorCutRailTerminal(ctx, motif, {
  x,
  y,
  width,
  height,
  lineRight,
  secondary
}) {
  const focusRatio = Math.max(0.18, Math.min(0.58, Number(motif?.lineDirection?.focusY) || 0.36))
  const railY = y + (height * focusRatio) + 1
  const startX = x + (width * 0.7)
  const endX = Math.max(startX + 24, Number(lineRight) || (x + width)) - 4
  const railColor = motif?.languageColor || secondary
  const railNeutral = motif?.languageNeutral || '#e1e7df'
  const terminals = [
    { color: railNeutral, alpha: 0.14, lineWidth: 1.1, startOffset: -5, endOffset: -1 },
    { color: railColor, alpha: 0.22, lineWidth: 2.4, startOffset: 2, endOffset: -1 },
    { color: railColor, alpha: 0.105, lineWidth: 1.05, startOffset: 8, endOffset: 4 }
  ]

  ctx.save()
  ctx.lineCap = 'square'
  ctx.lineJoin = 'bevel'
  terminals.forEach(terminal => {
    const terminalGradient = ctx.createLinearGradient(startX, 0, endX, 0)
    terminalGradient.addColorStop(0, hexToRgba(terminal.color, 0))
    terminalGradient.addColorStop(0.2, hexToRgba(terminal.color, terminal.alpha * 0.52))
    terminalGradient.addColorStop(0.62, hexToRgba(terminal.color, terminal.alpha))
    terminalGradient.addColorStop(1, hexToRgba(terminal.color, terminal.alpha * 0.74))
    ctx.strokeStyle = terminalGradient
    ctx.lineWidth = terminal.lineWidth
    ctx.beginPath()
    ctx.moveTo(startX, railY + terminal.startOffset)
    ctx.lineTo(endX, railY + terminal.endOffset)
    ctx.stroke()
  })
  ctx.restore()
}

function drawDirectorCutMotif(ctx, data, x, y, width, height, accent, key) {
  const motif = getDirectorCutMotif(data)
  const random = createDirectorCutRandom(`${key}-${motif.type}-${data.topMap}`)
  const centerX = x + width * ((motif.centerX || 0.46) + ((random() - 0.5) * 0.05))
  const centerY = y + height * ((motif.centerY || 0.5) + ((random() - 0.5) * 0.05))
  const phase = (random() * Math.PI * 2) + ((motif.rotation || 0) * Math.PI * 2)
  const density = Math.max(0.72, Math.min(1.3, Number(motif.density) || 1))
  const secondary = motif.secondary || accent
  const motifStrength = Math.max(1, Math.min(2, Number(motif.motifStrength) || 1.35))
  const hasStory = Boolean(motif?.story)
  const hasSignature = Boolean(motif?.signature)
  const hasNarrativeStage = Boolean(motif?.narrativeStage)
  const hasLanguageField = Boolean(motif?.languageField)
  const hasDedicatedStage = hasNarrativeStage || hasLanguageField
  const readStrength = (value, fallback, maximum = 1.2) => {
    const number = Number(value)
    return Number.isFinite(number) ? Math.max(0, Math.min(maximum, number)) : fallback
  }
  const genericStrength = readStrength(motif?.genericStrength, hasStory ? (hasSignature ? 0.06 : 0.14) : 1, 1)
  const storyStrength = readStrength(motif?.storyStrength, 0.72)
  const storyTextureStrength = readStrength(motif?.storyTextureStrength, 0.72)
  const storyEmblemStrength = readStrength(motif?.storyEmblemStrength, 0.82)
  const signatureLayerStrength = readStrength(motif?.signatureLayerStrength, 0.72)
  const motifAlpha = value => Math.min(0.22, value * motifStrength * 0.78 * genericStrength)
  const signatureAlpha = value => Math.min(0.3, value * motifStrength * 0.82 * signatureLayerStrength)
  const storyAlpha = value => Math.min(0.32, value * motifStrength * storyStrength)
  const washAlpha = value => Math.min(0.15, value * motifStrength * 0.56)

  ctx.save()
  ctx.beginPath()
  ctx.rect(x, y, width, height)
  ctx.clip()
  ctx.lineCap = 'round'

  const colorWash = ctx.createRadialGradient(centerX, centerY, 12, centerX, centerY, width * 0.52)
  colorWash.addColorStop(0, hexToRgba(secondary, washAlpha(0.13)))
  colorWash.addColorStop(0.46, hexToRgba(secondary, washAlpha(0.045)))
  colorWash.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = colorWash
  ctx.fillRect(x, y, width, height)

  if (motif?.languageField === 'rail-map' && motif?.lineLayer !== 'ambient') {
    drawDirectorCutRailAfterimageField(ctx, motif, {
      x,
      y,
      width,
      height,
      secondary
    })
  }

  const drawOrganicRings = (count, flatten = 0.62, strength = 1) => {
    for (let ring = 0; ring < count; ring += 1) {
      const radius = 54 + (ring * 35)
      ctx.beginPath()
      for (let step = 0; step <= 96; step += 1) {
        const angle = (Math.PI * 2 * step) / 96
        const noise = Math.sin((angle * 3) + phase + (ring * 0.37)) * (8 + ring * 0.7)
          + Math.sin((angle * 7) - phase) * 3
        const pointX = centerX + (Math.cos(angle) * (radius + noise))
        const pointY = centerY + (Math.sin(angle) * (radius + noise) * flatten)
        if (step === 0) ctx.moveTo(pointX, pointY)
        else ctx.lineTo(pointX, pointY)
      }
      ctx.closePath()
      const ringColor = ring % 4 === 0 ? secondary : accent
      ctx.strokeStyle = hexToRgba(ringColor, motifAlpha((0.08 + (ring % 3) * 0.025) * strength))
      ctx.lineWidth = ring % 4 === 0 ? 2 : 1
      ctx.stroke()
    }
  }

  if (motif.type === 'grid') {
    const columns = Math.round(9 * density)
    const rows = Math.round(7 * density)
    const cellWidth = Math.max(58, width / (columns + 2.5))
    const cellHeight = Math.max(42, height / (rows + 3))
    const startX = centerX - (columns * cellWidth * 0.5)
    const startY = centerY - (rows * cellHeight * 0.5)
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const active = Math.abs((row * 7 + column * 5 + (motif.variant || 0)) % 11) <= 1
        const cellX = startX + column * cellWidth + ((row % 2) * 9)
        const cellY = startY + row * cellHeight
        ctx.strokeStyle = hexToRgba(active ? secondary : accent, motifAlpha(active ? 0.16 : 0.052))
        ctx.lineWidth = active ? 2 : 1
        ctx.strokeRect(cellX, cellY, cellWidth - 10, cellHeight - 9)
        if (active) {
          ctx.fillStyle = hexToRgba(secondary, motifAlpha(0.055))
          ctx.fillRect(cellX + 4, cellY + 4, cellWidth - 18, cellHeight - 17)
        }
      }
    }
    for (let band = -2; band <= 2; band += 1) {
      ctx.fillStyle = hexToRgba(band === 0 ? secondary : accent, motifAlpha(band === 0 ? 0.18 : 0.06))
      ctx.fillRect(x + 80 + (band % 2) * 40, centerY + band * 78, width - 170, band === 0 ? 4 : 2)
    }
  } else if (motif.type === 'impact') {
    const impactX = centerX - width * 0.05
    const impactY = centerY + height * 0.02
    ;[78, 132, 202, 286].forEach((radius, index) => {
      ctx.setLineDash(index % 2 === 0 ? [22, 12] : [8, 17])
      ctx.strokeStyle = hexToRgba(index < 2 ? secondary : accent, motifAlpha(index === 0 ? 0.25 : 0.12))
      ctx.lineWidth = index === 0 ? 4 : index === 1 ? 3 : 1
      ctx.beginPath()
      ctx.arc(impactX, impactY, radius, -0.92 * Math.PI, 0.78 * Math.PI)
      ctx.stroke()
    })
    ctx.setLineDash([])
    for (let ray = 0; ray < 13; ray += 1) {
      const angle = phase + (ray / 13) * Math.PI * 2
      const inner = 52 + (ray % 3) * 16
      const outer = 270 + (ray % 4) * 42
      ctx.strokeStyle = hexToRgba(ray % 4 === 0 ? secondary : accent, motifAlpha(ray % 4 === 0 ? 0.2 : 0.075))
      ctx.lineWidth = ray % 4 === 0 ? 3 : 1
      ctx.beginPath()
      ctx.moveTo(impactX + Math.cos(angle) * inner, impactY + Math.sin(angle) * inner * 0.68)
      ctx.lineTo(impactX + Math.cos(angle) * outer, impactY + Math.sin(angle) * outer * 0.68)
      ctx.stroke()
    }
    for (let offset = -4; offset <= 4; offset += 1) {
      ctx.strokeStyle = hexToRgba(offset === 0 ? secondary : accent, motifAlpha(offset === 0 ? 0.18 : 0.05))
      ctx.lineWidth = offset === 0 ? 3 : 1
      ctx.beginPath()
      ctx.moveTo(x - 100, y + height - 70 + offset * 36)
      ctx.lineTo(x + width + 120, y + 110 + offset * 36)
      ctx.stroke()
    }
  } else if (motif.type === 'nine-lives') {
    const orbitRadiusX = width * 0.31
    const orbitRadiusY = height * 0.24
    for (let life = 0; life < 9; life += 1) {
      const angle = phase + (life / 9) * Math.PI * 2
      const nodeX = centerX + Math.cos(angle) * orbitRadiusX
      const nodeY = centerY + Math.sin(angle) * orbitRadiusY
      ctx.strokeStyle = hexToRgba(life % 3 === 0 ? secondary : accent, motifAlpha(life % 3 === 0 ? 0.24 : 0.11))
      ctx.lineWidth = life % 3 === 0 ? 3 : 1
      ctx.beginPath()
      ctx.arc(nodeX, nodeY, life % 3 === 0 ? 13 : 8, 0, Math.PI * 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(nodeX, nodeY)
      ctx.quadraticCurveTo(centerX + Math.sin(angle) * 120, centerY - Math.cos(angle) * 88, centerX, centerY)
      ctx.stroke()
    }
    for (let trail = -3; trail <= 3; trail += 1) {
      ctx.strokeStyle = hexToRgba(trail === 0 ? secondary : accent, motifAlpha(trail === 0 ? 0.2 : 0.065))
      ctx.lineWidth = trail === 0 ? 3 : 1
      ctx.beginPath()
      ctx.moveTo(x - 70, centerY + trail * 34 + 180)
      ctx.quadraticCurveTo(centerX - 180, centerY + trail * 28 - 120, x + width + 80, centerY + trail * 22 - 210)
      ctx.stroke()
    }
  } else if (motif.type === 'strata') {
    drawOrganicRings(Math.round(10 * density), 0.54, 1.25)
    ctx.strokeStyle = hexToRgba(accent, motifAlpha(0.12))
    ctx.lineWidth = 2
    for (let index = -3; index < Math.round(6 + density * 2); index += 1) {
      ctx.beginPath()
      ctx.moveTo(x - 80, y + height - (index * 58))
      ctx.lineTo(x + width + 100, y + height - 360 - (index * 58))
      ctx.stroke()
    }
  } else if (motif.type === 'wave' || motif.type === 'tide') {
    const amplitude = (motif.type === 'tide' ? 46 : 30) * (0.9 + ((motif.variant || 0) % 4) * 0.055)
    const bandLimit = Math.max(4, Math.round(5 * density))
    for (let band = -bandLimit; band <= bandLimit; band += 1) {
      ctx.beginPath()
      for (let step = 0; step <= 120; step += 1) {
        const progress = step / 120
        const pointX = x + progress * width
        const pointY = centerY + (band * 24) + Math.sin((progress * Math.PI * (motif.type === 'tide' ? 3 : 7)) + phase + (band * 0.3)) * amplitude
        if (step === 0) ctx.moveTo(pointX, pointY)
        else ctx.lineTo(pointX, pointY)
      }
      ctx.strokeStyle = hexToRgba(band % 4 === 0 ? secondary : accent, motifAlpha(band === 0 ? 0.3 : 0.1 + ((bandLimit - Math.abs(band)) * 0.012)))
      ctx.lineWidth = band === 0 ? 3 : band % 3 === 0 ? 2 : 1
      ctx.stroke()
    }
    if (motif.type === 'tide') drawOrganicRings(Math.round(6 * density), 0.46, 1.05)
  } else if (motif.type === 'orbit' || motif.type === 'halo') {
    const ringCount = Math.round((motif.type === 'orbit' ? 8 : 10) * density)
    for (let ring = 0; ring < ringCount; ring += 1) {
      ctx.save()
      ctx.translate(centerX, centerY)
      ctx.rotate((ring - 4) * 0.08)
      ctx.scale(1, 0.55 + ((ring % 3) * 0.07))
      ctx.beginPath()
      ctx.arc(0, 0, 70 + ring * 34, 0, Math.PI * 2)
      ctx.strokeStyle = hexToRgba(ring % 4 === 0 ? secondary : accent, motifAlpha(ring % 3 === 0 ? 0.16 : 0.075))
      ctx.lineWidth = ring % 3 === 0 ? 2 : 1
      ctx.stroke()
      ctx.restore()
    }
    for (let tick = 0; tick < 24; tick += 1) {
      const angle = (Math.PI * 2 * tick) / 24
      const inner = 255 + (tick % 3) * 10
      const outer = inner + (tick % 4 === 0 ? 34 : 14)
      ctx.strokeStyle = hexToRgba(accent, motifAlpha(0.12))
      ctx.beginPath()
      ctx.moveTo(centerX + Math.cos(angle) * inner, centerY + Math.sin(angle) * inner * 0.58)
      ctx.lineTo(centerX + Math.cos(angle) * outer, centerY + Math.sin(angle) * outer * 0.58)
      ctx.stroke()
    }
  } else if (motif.type === 'fortress') {
    for (let ring = 0; ring < Math.round(8 * density); ring += 1) {
      ctx.strokeStyle = hexToRgba(ring % 4 === 0 ? secondary : accent, motifAlpha(ring % 2 === 0 ? 0.15 : 0.07))
      ctx.lineWidth = ring % 2 === 0 ? 3 : 1
      ctx.beginPath()
      ctx.arc(centerX, centerY, 80 + ring * 38, Math.PI * 1.08, Math.PI * 1.92)
      ctx.stroke()
    }
    for (let bar = -4; bar <= 4; bar += 1) {
      ctx.fillStyle = hexToRgba(accent, motifAlpha(bar === 0 ? 0.16 : 0.06))
      ctx.fillRect(centerX - 350, centerY + bar * 42, 700, bar === 0 ? 4 : 1)
    }
  } else if (motif.type === 'trajectory') {
    const lineLimit = Math.max(6, Math.round(8 * density))
    for (let line = -lineLimit; line <= lineLimit; line += 1) {
      ctx.strokeStyle = hexToRgba(line % 5 === 0 ? secondary : accent, motifAlpha(line % 4 === 0 ? 0.16 : 0.06))
      ctx.lineWidth = line % 4 === 0 ? 3 : 1
      ctx.beginPath()
      ctx.moveTo(x - 100, centerY + line * 34 + 220)
      ctx.lineTo(x + width + 100, centerY + line * 34 - 260)
      ctx.stroke()
    }
    ctx.strokeStyle = hexToRgba(accent, motifAlpha(0.18))
    ctx.lineWidth = 2
    ;[74, 132, 196].forEach(radius => {
      ctx.beginPath()
      ctx.arc(centerX + 70, centerY - 22, radius, 0, Math.PI * 2)
      ctx.stroke()
    })
  } else if (motif.type === 'signal') {
    const columns = Math.round(11 * density)
    for (let index = 0; index < columns; index += 1) {
      const progress = columns <= 1 ? 0 : index / (columns - 1)
      const columnX = x + width * (0.12 + progress * 0.76)
      const strength = 0.05 + ((index + (motif.variant || 0)) % 4) * 0.025
      ctx.strokeStyle = hexToRgba(index % 4 === 0 ? secondary : accent, motifAlpha(strength))
      ctx.lineWidth = index % 4 === 0 ? 2 : 1
      ctx.beginPath()
      ctx.moveTo(columnX, y + 70)
      ctx.lineTo(columnX + Math.sin(phase + index) * 34, y + height - 70)
      ctx.stroke()
    }
    ;[72, 138, 214].forEach((radius, index) => {
      ctx.strokeStyle = hexToRgba(index === 1 ? secondary : accent, motifAlpha(index === 1 ? 0.19 : 0.1))
      ctx.lineWidth = index === 1 ? 3 : 1
      ctx.beginPath()
      ctx.arc(centerX, centerY, radius, -0.72 * Math.PI, 0.72 * Math.PI)
      ctx.stroke()
    })
  } else if (motif.type === 'ensemble') {
    const ranks = Math.round(5 * density)
    for (let rank = 0; rank < ranks; rank += 1) {
      const rankY = centerY - 150 + rank * 72
      const count = 4 + ((rank + (motif.variant || 0)) % 3)
      for (let item = 0; item < count; item += 1) {
        const itemX = centerX - ((count - 1) * 58) / 2 + item * 58
        ctx.strokeStyle = hexToRgba((item + rank) % 5 === 0 ? secondary : accent, motifAlpha(0.08 + (rank === 2 ? 0.05 : 0)))
        ctx.lineWidth = rank === 2 ? 2 : 1
        ctx.strokeRect(itemX - 18, rankY - 18, 36, 36)
      }
    }
    drawOrganicRings(5, 0.58, 0.62)
  } else {
    drawOrganicRings(motif.type === 'archive' ? 7 : 9, 0.6, 0.72)
    for (let frame = 0; frame < 7; frame += 1) {
      const frameX = x + 62 + frame * 118
      ctx.strokeStyle = hexToRgba(accent, motifAlpha(frame % 2 === 0 ? 0.12 : 0.06))
      ctx.lineWidth = frame % 2 === 0 ? 2 : 1
      ctx.strokeRect(frameX, y + 90 + ((frame % 3) * 34), 82, height - 220)
    }
  }

  if (motif?.languageFieldEdition !== 'poster') {
    drawDirectorCutLineChoreography(ctx, motif, {
      x,
      y,
      width,
      height,
      accent,
      secondary
    })
  }

  if (!hasDedicatedStage) {
    drawDirectorCutHeroSignature(ctx, motif, {
      x,
      y,
      width,
      height,
      centerX,
      centerY,
      accent,
      secondary,
      motifAlpha: signatureAlpha,
      phase
    })
  }

  const rawStoryX = Number(motif?.storyX)
  const rawStoryY = Number(motif?.storyY)
  const storyCenterX = centerX + (Number.isFinite(rawStoryX) ? width * rawStoryX : 0)
  const storyCenterY = centerY + (Number.isFinite(rawStoryY) ? height * rawStoryY : 0)
  drawDirectorCutStorySignature(ctx, motif, {
    x,
    y,
    width,
    height,
    centerX: storyCenterX,
    centerY: storyCenterY,
    accent,
    secondary,
    alpha: storyAlpha,
    showTexture: !hasLanguageField,
    showEmblem: !hasDedicatedStage && (!hasSignature || motif?.storyEmblemWithSignature === true),
    textureStrength: storyTextureStrength,
    emblemStrength: storyEmblemStrength
  })

  if (!hasStory || motif?.showTechnicalMarks === true) {
    ctx.save()
    ctx.translate(centerX, centerY)
    ctx.rotate(motif.rotation || 0)
    ctx.strokeStyle = hexToRgba(secondary, motifAlpha(0.11))
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(-width * 0.34, 0)
    ctx.lineTo(width * 0.34, 0)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(0, -height * 0.34)
    ctx.lineTo(0, height * 0.34)
    ctx.stroke()
    ctx.restore()
    drawText(ctx, motif.code || 'DC-00', x + width - 34, y + height - 42, {
      font: `900 72px ${FONT_MONO}`,
      fill: hexToRgba(secondary, motifAlpha(0.045)),
      align: 'right',
      maxWidth: width * 0.42
    })
  }

  const vignette = ctx.createRadialGradient(centerX, centerY, 20, centerX, centerY, width * 0.56)
  vignette.addColorStop(0, 'rgba(8,9,6,0)')
  vignette.addColorStop(1, 'rgba(8,9,6,0.46)')
  ctx.fillStyle = vignette
  ctx.fillRect(x, y, width, height)
  ctx.restore()

  return motif
}

export function getDirectorCutPortraitMask(bounds, ratio, placement, stage, motif = {}) {
  if (!bounds || !Number.isFinite(bounds.y) || !Number.isFinite(bounds.height) || bounds.height <= 0
    || !Number.isFinite(ratio) || ratio <= 0) return null
  const feather = value => Number.isFinite(Number(value))
    ? Math.max(0, Math.min(120, Number(value))) / ratio
    : 0
  const top = Math.min(bounds.height * 0.3, feather(motif.subjectFeatherTop))
  const bottom = Math.min(bounds.height * 0.4, feather(motif.subjectFeatherBottom))
  const copyStart = Number(motif.subjectCopyFadeStart)
  const copyEnd = Number(motif.subjectCopyFadeEnd)
  const hasCopyFade = Number.isFinite(copyStart) && Number.isFinite(copyEnd)
    && copyStart >= 0 && copyStart < copyEnd && copyEnd <= 1
    && Number.isFinite(placement?.imageX) && Number.isFinite(stage?.x)
    && Number.isFinite(stage?.width) && stage.width > 0
  if (!top && !bottom && !hasCopyFade) return null
  return {
    top: top ? { start: bounds.y, end: bounds.y + top } : null,
    bottom: bottom ? { start: bounds.y + bounds.height - bottom, end: bounds.y + bounds.height } : null,
    copy: hasCopyFade ? {
      start: (stage.x + stage.width * copyStart - placement.imageX) / ratio,
      end: (stage.x + stage.width * copyEnd - placement.imageX) / ratio
    } : null
  }
}

function maskDirectorCutPortrait(image, mask) {
  if (!mask) return image
  const layer = document.createElement('canvas')
  layer.width = image.naturalWidth || image.width
  layer.height = image.naturalHeight || image.height
  const layerCtx = layer.getContext('2d')
  if (!layerCtx) return image
  layerCtx.drawImage(image, 0, 0)
  layerCtx.globalCompositeOperation = 'destination-in'
  // Fade only the cutout, including its tinted rims. Never lay a black band
  // over the ambient artwork to hide a source edge.
  for (const [edge, range] of Object.entries(mask)) {
    if (!range) continue
    const gradient = edge === 'copy'
      ? layerCtx.createLinearGradient(range.start, 0, range.end, 0)
      : layerCtx.createLinearGradient(0, range.start, 0, range.end)
    gradient.addColorStop(0, edge === 'top' ? 'rgba(255,255,255,0)' : '#fff')
    gradient.addColorStop(1, edge === 'top' ? '#fff' : 'rgba(255,255,255,0)')
    layerCtx.fillStyle = gradient
    layerCtx.fillRect(0, 0, layer.width, layer.height)
  }
  return layer
}

function drawDirectorCutSubject(ctx, images, accent, x, y, width, height, motif) {
  const heroRender = images.heroRender || null
  if (!heroRender) return

  ctx.save()
  ctx.beginPath()
  ctx.rect(x, y, width, height)
  ctx.clip()

  const bounds = getVisibleImageBounds(heroRender) || { x: 0, y: 0, width: heroRender.width, height: heroRender.height }
  const subjectScale = Math.max(0.72, Math.min(2.2, Number(motif?.subjectScale) || 1))
  const ratio = motif?.subjectFraming === 'source-frame'
    ? Math.min(width / heroRender.width, height / heroRender.height) * subjectScale
    : Math.min(width / bounds.width, height / bounds.height) * subjectScale
  const placement = {
    imageX: x + ((width - (bounds.width * ratio)) / 2) - (bounds.x * ratio) + (width * (motif?.subjectX || 0)),
    imageY: y + height - ((bounds.y + bounds.height) * ratio) + (height * (motif?.subjectY || 0)),
    imageWidth: heroRender.width * ratio,
    imageHeight: heroRender.height * ratio
  }
  const subjectImage = maskDirectorCutPortrait(heroRender,
    getDirectorCutPortraitMask(bounds, ratio, placement, { x, width }, motif))
  const rimStrength = Math.max(0.14, Math.min(0.34, Number(motif?.rimStrength) || 0.18))
  const subjectBrightness = Math.max(0.88, Math.min(1.28, Number(motif?.subjectBrightness) || 1))
  const rawSubjectSaturation = Number(motif?.subjectSaturation)
  const rawSubjectContrast = Number(motif?.subjectContrast)
  const rawSubjectSepia = Number(motif?.subjectSepia)
  const subjectSaturation = Number.isFinite(rawSubjectSaturation) ? Math.max(0.45, Math.min(1.25, rawSubjectSaturation)) : 0.82
  const subjectContrast = Number.isFinite(rawSubjectContrast) ? Math.max(0.92, Math.min(1.36, rawSubjectContrast)) : 1.12
  const subjectSepia = Number.isFinite(rawSubjectSepia) ? Math.max(0, Math.min(0.2, rawSubjectSepia)) : 0.04
  const rimPrimary = motif?.rimPrimary || accent
  const rimSecondary = motif?.rimSecondary || motif?.secondary || '#fff7dc'
  drawTintedFilmSubject(ctx, subjectImage, placement, rimPrimary, Math.min(0.42, rimStrength + 0.1), -16, 7)
  drawTintedFilmSubject(ctx, subjectImage, placement, rimSecondary, rimStrength, 11, -5)
  ctx.filter = `saturate(${subjectSaturation}) contrast(${subjectContrast}) brightness(${subjectBrightness}) sepia(${subjectSepia})`
  ctx.shadowColor = 'rgba(0,0,0,0.72)'
  ctx.shadowBlur = 34
  ctx.drawImage(subjectImage, placement.imageX, placement.imageY, placement.imageWidth, placement.imageHeight)
  ctx.filter = 'none'

  const lowerFade = ctx.createLinearGradient(x, y + height * 0.62, x, y + height)
  lowerFade.addColorStop(0, 'rgba(8,9,6,0)')
  lowerFade.addColorStop(1, 'rgba(8,9,6,0.9)')
  ctx.fillStyle = lowerFade
  ctx.fillRect(x, y, width, height)
  ctx.restore()
}

export function getDirectorCutFooterLayout(ctx, {
  heroName = '', creditGroups = [], motif = {}, copyX = 630, copyWidth = 662, rightX = 1288
} = {}) {
  ctx.save()
  const namesX = copyX + 110
  const namesMaxWidth = copyWidth - 110
  const credits = safeArr(creditGroups).slice(0, 2).map((group, index) => {
    const names = safeArr(group.names).map(stripTicketHash).filter(Boolean).join('  ·  ')
    const size = fitFilmPosterTitleSize(ctx, [names], namesMaxWidth, 14, 11)
    ctx.font = `900 ${size}px ${FONT_SC}`
    return {
      label: group.displayLabel || group.label,
      names,
      size,
      x: namesX,
      baseline: 608 + index * 23,
      maxWidth: namesMaxWidth,
      right: namesX + Math.min(namesMaxWidth, ctx.measureText(names).width)
    }
  })
  const creditsRight = Math.max(copyX + 104, ...credits.map(line => line.right))
  const label = safeText(heroName).toLocaleUpperCase('en-US')
  const ghostScale = Math.max(0.76, Math.min(1.12, Number(motif.ghostScale) || 1))
  const sideWidth = Math.max(0, Math.min(392, rightX - creditsRight - 28))
  let size = fitFilmPosterTitleSize(ctx, [label], sideWidth, 88 * ghostScale, 32)
  ctx.font = `900 ${size}px ${FONT_SC}`
  const compact = ctx.measureText(label).width > sideWidth
  const maxWidth = compact ? 392 : sideWidth
  // Long credits keep their space; the edition name becomes a full, compact footer signature.
  if (compact) size = fitFilmPosterTitleSize(ctx, [label], maxWidth, 28, 24)
  ctx.restore()
  return {
    credits,
    wordmark: { label, size, rightX, baseline: compact ? 662 : 650, maxWidth, compact }
  }
}

function drawDirectorCutFooterWordmark(ctx, layout, color, motif = {}) {
  const { label, size, rightX, baseline, maxWidth } = layout
  if (!label) return
  const ghostStrength = Math.max(0.28, Math.min(1, Number(motif.ghostStrength) || 0.54))

  ctx.save()
  ctx.font = `900 ${size}px ${FONT_SC}`
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'right'
  ctx.shadowColor = hexToRgba(color, 0.1 * ghostStrength)
  ctx.shadowBlur = 20
  ctx.lineWidth = Math.min(1.8, size * 0.025)
  // A readable edition signature, still quieter than the player name and credits.
  ctx.strokeStyle = hexToRgba(color, 0.29 * ghostStrength)
  ctx.strokeText(label, rightX, baseline, maxWidth)
  ctx.fillStyle = hexToRgba(color, 0.07 * ghostStrength)
  ctx.fillText(label, rightX, baseline, maxWidth)
  ctx.restore()
}

function drawDirectorCutFocalMatte(ctx, motif, x, y, width, height) {
  const genericStrength = Math.max(0, Math.min(1, Number(motif?.genericStrength) || 0.14))
  const requestedStrength = Number(motif?.cleanZoneStrength)
  const strength = Number.isFinite(requestedStrength)
    ? Math.max(0.2, Math.min(0.68, requestedStrength))
    : Math.max(0.38, Math.min(0.58, 0.42 + Math.max(0, 0.08 - genericStrength) * 2))
  const subjectX = Math.max(-0.16, Math.min(0.16, Number(motif?.subjectX) || 0))
  const subjectY = Math.max(-0.18, Math.min(0.2, Number(motif?.subjectY) || 0))
  const focusX = x + width * (0.23 + subjectX * 0.42)
  const focusY = y + height * (0.34 + subjectY * 0.32)
  const radius = Math.max(190, Math.min(width * 0.25, height * 0.43))

  ctx.save()
  ctx.translate(focusX, focusY)
  ctx.scale(1.18, 1)
  const matte = ctx.createRadialGradient(0, 0, radius * 0.06, 0, 0, radius)
  matte.addColorStop(0, `rgba(8,9,6,${strength})`)
  matte.addColorStop(0.48, `rgba(8,9,6,${strength * 0.46})`)
  matte.addColorStop(1, 'rgba(8,9,6,0)')
  ctx.fillStyle = matte
  ctx.fillRect(-radius, -radius, radius * 2, radius * 2)
  ctx.restore()
}

export function getDirectorCutIdentityLayout(ctx, {
  title = '', secondary = '', copyX = 630, copyWidth = 662, emblemLayout = null
} = {}) {
  ctx.save()
  // Reserve the actual emblem box, including a quiet gutter and the title's 5px shadow.
  // Its position is shared with drawing, so wide or offset glyphs cannot enter the name.
  const maxWidth = Math.max(1, Math.min(copyWidth, (emblemLayout?.drawX ?? copyX + copyWidth + 33) - copyX - 33))
  const fit = (lines, preferred, minimum) => {
    const size = fitFilmPosterTitleSize(ctx, lines, maxWidth, preferred, minimum)
    ctx.font = `900 ${size}px ${FONT_SC}`
    const measuredWidth = Math.max(1, ...lines.map(line => ctx.measureText(line).width))
    return Math.min(size, size * maxWidth / measuredWidth)
  }
  const subject = safeText(title, 'SEASON ARCHIVE').trim()
  const uninterruptedLatin = /^[\p{Script=Latin}\p{Number}\p{Punctuation}]+$/u.test(subject)
  let lines = uninterruptedLatin ? [subject] : splitFilmPosterTitle(subject).slice(0, 2)
  let size = fit(lines, lines.length === 1 ? 112 : 54, 42)
  if (lines.length === 1 && size < 64) {
    const words = lines[0].split(/\s+/).filter(Boolean)
    // Preserve an alias's word units: Ding / Chun / Qiu, not DingC / hunQiu.
    // Plain Latin handles stay on one line unless they cannot fit at a readable size.
    let pieces = words.length > 1 ? words : uninterruptedLatin
      ? subject.split(/(?<=[\p{Ll}\p{Number}])(?=\p{Lu})/u)
      : [...lines[0]]
    if (pieces.length === 1 && size < 42) pieces = [...lines[0]]
    const separator = words.length > 1 ? ' ' : ''
    let bestWidth = Infinity
    for (let index = 1; index < pieces.length; index += 1) {
      const candidate = [pieces.slice(0, index).join(separator), pieces.slice(index).join(separator)]
      const width = Math.max(...candidate.map(line => ctx.measureText(line).width))
      if (width < bestWidth) {
        bestWidth = width
        lines = candidate
      }
    }
    size = fit(lines, lines.length === 1 ? 112 : 54, 42)
  }
  const twoLines = lines.length === 2
  const bottom = twoLines ? 298 : 258
  const lineHeight = size * 1.08
  const baselines = lines.map((_, index) => bottom - (lines.length - 1 - index) * lineHeight)
  const secondarySize = fit([safeText(secondary, '')], 28, 18)
  ctx.restore()
  return {
    x: copyX, maxWidth, lines, size, baselines,
    starringBaseline: bottom + (twoLines ? 22 : 34),
    secondarySize, secondaryBaseline: bottom + (twoLines ? 46 : 58),
    // Two-line names expand upward; the logline, detail strip and credits stay fixed.
    loglineY: 362
  }
}

function drawDirectorCutTitle(ctx, layout, accent) {
  const { x, maxWidth, lines, size, baselines } = layout

  lines.forEach((line, index) => {
    const baseline = baselines[index]
    drawText(ctx, line, x + 5, baseline + 4, {
      font: `900 ${size}px ${FONT_SC}`,
      fill: hexToRgba(accent, 0.44),
      maxWidth
    })
    drawText(ctx, line, x, baseline, {
      font: `900 ${size}px ${FONT_SC}`,
      fill: '#fffdf4',
      maxWidth
    })
  })
}

function drawDirectorCutTimeline(ctx, x, y, width, accent, results = []) {
  const sequence = safeArr(results).slice(0, 12)
  const count = Math.max(12, sequence.length)
  const gap = 5
  const cellWidth = (width - gap * (count - 1)) / count

  ctx.save()
  ctx.fillStyle = 'rgba(255,247,220,0.12)'
  ctx.fillRect(x, y + 5, width, 1)
  for (let index = 0; index < count; index += 1) {
    const result = sequence[index]
    ctx.fillStyle = result === 'W'
      ? hexToRgba(accent, 0.92)
      : result === 'L'
        ? 'rgba(255,247,220,0.25)'
        : 'rgba(255,247,220,0.075)'
    ctx.fillRect(x + index * (cellWidth + gap), y, cellWidth, result ? 11 : 7)
  }
  ctx.restore()
}

function drawDirectorCutDetails(ctx, data, x, y, width, accent) {
  const items = [
    { label: data.copy.showDate, value: data.showDate },
    { label: data.copy.showtime, value: data.showtime },
    { label: data.copy.screen, value: data.screen },
    { label: data.copy.row, value: data.row },
    { label: data.copy.seat, value: data.seat }
  ]
  const columnWidth = width / items.length

  ctx.save()
  ctx.fillStyle = 'rgba(255,247,220,0.025)'
  ctx.fillRect(x, y, width, 86)
  ctx.strokeStyle = 'rgba(255,247,220,0.16)'
  ctx.strokeRect(x, y, width, 86)
  items.forEach((item, index) => {
    const cellX = x + index * columnWidth
    if (index > 0) {
      ctx.fillStyle = 'rgba(255,247,220,0.1)'
      ctx.fillRect(cellX, y + 14, 1, 58)
    }
    drawText(ctx, item.label, cellX + 13, y + 25, {
      font: `900 9px ${FONT_MONO}`,
      fill: index === 2 ? accent : 'rgba(255,247,220,0.55)',
      maxWidth: columnWidth - 24
    })
    const valueSize = String(item.value || '').length > 9 ? 15 : String(item.value || '').length > 6 ? 18 : 24
    drawText(ctx, item.value, cellX + 13, y + 62, {
      font: `900 ${valueSize}px ${FONT_SC}`,
      fill: '#fffdf4',
      maxWidth: columnWidth - 24
    })
  })
  ctx.fillStyle = accent
  ctx.fillRect(x, y, 4, 86)
  ctx.restore()
}

function drawDirectorCutStub(ctx, width, height, payload, data, images, accent, stubX) {
  const ticketTop = 18
  const ticketBottom = height - 18
  const stubWidth = width - stubX - 18
  const centerX = stubX + stubWidth / 2
  const paper = '#e7dfc9'
  const edition = getDirectorCutEdition(payload.cardKind)
  const motif = getDirectorCutMotif(data)

  ctx.save()
  ctx.fillStyle = paper
  ctx.fillRect(stubX, ticketTop, stubWidth, ticketBottom - ticketTop)
  const paperShade = ctx.createLinearGradient(stubX, ticketTop, stubX + stubWidth, ticketBottom)
  paperShade.addColorStop(0, 'rgba(255,255,255,0.14)')
  paperShade.addColorStop(0.54, 'rgba(214,178,40,0.035)')
  paperShade.addColorStop(1, 'rgba(6,7,4,0.11)')
  ctx.fillStyle = paperShade
  ctx.fillRect(stubX, ticketTop, stubWidth, ticketBottom - ticketTop)
  drawFilmHalftoneField(ctx, stubX, ticketTop, stubWidth, ticketBottom - ticketTop, '#060704')
  drawDirectorCutIdentityLayer(ctx, motif, {
    x: stubX + 8,
    y: ticketTop + 8,
    width: stubWidth - 8,
    height: ticketBottom - ticketTop - 16,
    accent,
    secondary: motif.secondary || accent,
    paper: true
  })
  ctx.fillStyle = accent
  ctx.fillRect(stubX, ticketTop, 8, ticketBottom - ticketTop)
  ctx.fillRect(stubX, ticketTop, stubWidth, 8)

  ctx.setLineDash([7, 8])
  ctx.strokeStyle = 'rgba(6,7,4,0.48)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(stubX, ticketTop + 28)
  ctx.lineTo(stubX, ticketBottom - 28)
  ctx.stroke()
  ctx.setLineDash([])

  drawText(ctx, edition.stub, centerX, 62, {
    font: `900 15px ${FONT_MONO}`,
    fill: '#080906',
    align: 'center',
    maxWidth: stubWidth - 38
  })
  drawText(ctx, edition.stubLine, centerX, 84, {
    font: `900 8px ${FONT_MONO}`,
    fill: 'rgba(6,7,4,0.52)',
    align: 'center',
    maxWidth: stubWidth - 34
  })

  const titleLines = splitFilmPosterTitle(data.title).slice(0, 2)
  const titleSize = fitFilmPosterTitleSize(ctx, titleLines, stubWidth - 48, 30, 18)
  titleLines.forEach((line, index) => {
    drawText(ctx, line, centerX, 137 + index * (titleSize * 0.92), {
      font: `900 ${titleSize}px ${FONT_SC}`,
      fill: '#080906',
      align: 'center',
      maxWidth: stubWidth - 48
    })
  })

  drawText(ctx, `${data.directorChoiceLabel}${data.directorHeroNameEn ? ` / ${data.directorHeroNameEn.toLocaleUpperCase('en-US')}` : ''}`, centerX, 184, {
    font: `900 8px ${FONT_MONO}`,
    fill: 'rgba(6,7,4,0.54)',
    align: 'center',
    maxWidth: stubWidth - 42
  })

  drawMemorySeal(ctx, centerX, 244, 48, '#080906')
  if (images.eventLogo) {
    ctx.save()
    ctx.filter = 'grayscale(1) brightness(0) contrast(1.5)'
    drawVisibleImageContained(ctx, images.eventLogo, centerX - 29, 215, 58, 58, { alpha: 0.86 })
    ctx.restore()
  } else {
    drawText(ctx, 'DC', centerX, 256, {
      font: `900 32px ${FONT_MONO}`,
      fill: '#080906',
      align: 'center'
    })
  }

  drawText(ctx, 'PICTURE / FRAME', centerX, 318, {
    font: `900 9px ${FONT_MONO}`,
    fill: 'rgba(6,7,4,0.5)',
    align: 'center'
  })
  drawText(ctx, data.seat, centerX, 378, {
    font: `900 62px ${FONT_SC}`,
    fill: '#080906',
    align: 'center',
    maxWidth: stubWidth - 44
  })

  const halfWidth = (stubWidth - 54) / 2
  const leftCenter = stubX + 23 + (halfWidth / 2)
  const rightCenter = stubX + stubWidth - 23 - (halfWidth / 2)
  ctx.fillStyle = 'rgba(6,7,4,0.16)'
  ctx.fillRect(stubX + 26, 404, stubWidth - 52, 1)
  ctx.fillRect(centerX, 419, 1, 67)
  ;[
    [data.copy.opening, data.openingCode, leftCenter],
    [data.copy.closing, data.closingCode, rightCenter]
  ].forEach(([label, value, columnX]) => {
    drawText(ctx, label, columnX, 432, {
      font: `900 8px ${FONT_MONO}`,
      fill: 'rgba(6,7,4,0.48)',
      align: 'center',
      maxWidth: halfWidth - 8
    })
    drawText(ctx, value, columnX, 470, {
      font: `900 24px ${FONT_MONO}`,
      fill: '#080906',
      align: 'center',
      maxWidth: halfWidth - 8
    })
  })

  ctx.fillStyle = 'rgba(6,7,4,0.07)'
  ctx.fillRect(stubX + 22, 500, stubWidth - 44, 55)
  drawText(ctx, `${data.copy.gate} ${data.gate}`, leftCenter, 522, {
    font: `900 8px ${FONT_MONO}`,
    fill: 'rgba(6,7,4,0.48)',
    align: 'center',
    maxWidth: halfWidth - 8
  })
  drawText(ctx, `${data.copy.screen} ${data.screen}`, rightCenter, 522, {
    font: `900 8px ${FONT_MONO}`,
    fill: 'rgba(6,7,4,0.48)',
    align: 'center',
    maxWidth: halfWidth - 8
  })
  drawText(ctx, `${data.copy.row} ${data.row}`, leftCenter, 544, {
    font: `900 16px ${FONT_SC}`,
    fill: '#080906',
    align: 'center',
    maxWidth: halfWidth - 8
  })
  drawText(ctx, `${data.copy.seat} ${data.seat}`, rightCenter, 544, {
    font: `900 16px ${FONT_SC}`,
    fill: '#080906',
    align: 'center',
    maxWidth: halfWidth - 8
  })

  drawBarcode(ctx, stubX + 38, 582, stubWidth - 76, 48, '#080906', `${payload.archiveId}-DC`)
  drawText(ctx, safeText(payload.archiveId, 'FCR26-ARCHIVE'), centerX, 660, {
    font: `900 13px ${FONT_MONO}`,
    fill: '#080906',
    align: 'center',
    maxWidth: stubWidth - 42
  })
  drawText(ctx, 'FINAL PRINT · NOT VALID FOR ADMISSION', centerX, 699, {
    font: `900 7px ${FONT_MONO}`,
    fill: 'rgba(6,7,4,0.48)',
    align: 'center',
    maxWidth: stubWidth - 32
  })
  ctx.restore()
}

function drawLandscapeDirectorCutTicket(ctx, width, height, payload, images, accent) {
  const data = getCinemaTicketData(payload)
  const edition = getDirectorCutEdition(payload.cardKind)
  const ticketX = 18
  const ticketY = 18
  const ticketWidth = width - 36
  const ticketHeight = height - 36
  const stubX = width - 278
  const railWidth = 58
  const mainRight = stubX
  const copyX = 630
  const copyWidth = mainRight - copyX - 30

  ctx.clearRect(0, 0, width, height)
  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.72)'
  ctx.shadowBlur = 28
  ctx.fillStyle = '#080906'
  drawCutCornerRect(ctx, ticketX, ticketY, ticketWidth, ticketHeight, 24)
  ctx.fill()
  ctx.restore()

  ctx.save()
  drawCutCornerRect(ctx, ticketX, ticketY, ticketWidth, ticketHeight, 24)
  ctx.clip()
  const base = ctx.createLinearGradient(ticketX, ticketY, mainRight, ticketY + ticketHeight)
  base.addColorStop(0, '#10110c')
  base.addColorStop(0.48, '#070805')
  base.addColorStop(1, '#111007')
  ctx.fillStyle = base
  ctx.fillRect(ticketX, ticketY, mainRight - ticketX, ticketHeight)
  const motif = drawDirectorCutMotif(ctx, data, ticketX + railWidth, ticketY, mainRight - ticketX - railWidth, ticketHeight, accent, payload.archiveId)

  const heroGhostTitle = data.directorHeroNameEn || data.directorHeroName || data.title
  const footerLayout = getDirectorCutFooterLayout(ctx, {
    heroName: heroGhostTitle,
    creditGroups: data.creditGroups,
    motif,
    copyX,
    copyWidth,
    rightX: mainRight - 34
  })
  drawDirectorCutFocalMatte(ctx, motif, ticketX + railWidth, ticketY, mainRight - ticketX - railWidth, ticketHeight)
  const ambientStage = {
    x: ticketX + railWidth,
    y: ticketY,
    width: mainRight - ticketX - railWidth,
    height: ticketHeight,
    accent,
    secondary: motif.secondary || accent
  }
  drawDirectorCutAmbientLineField(ctx, motif, ambientStage)
  drawDirectorCutSubject(ctx, images, accent, ticketX + railWidth - 6, 74, 690, 612, motif)

  const copyBlendX = Math.max(430, Math.min(520, Number(motif?.copyBlendX) || 500))
  const copyShade = ctx.createLinearGradient(copyBlendX, 0, 785, 0)
  copyShade.addColorStop(0, 'rgba(8,9,6,0)')
  copyShade.addColorStop(0.62, 'rgba(8,9,6,0.8)')
  copyShade.addColorStop(1, 'rgba(8,9,6,0.98)')
  ctx.fillStyle = copyShade
  ctx.fillRect(copyBlendX, ticketY, 820 - copyBlendX, ticketHeight)
  ctx.fillStyle = 'rgba(8,9,6,0.94)'
  ctx.fillRect(790, ticketY, mainRight - 790, ticketHeight)
  drawDirectorCutAmbientLineField(ctx, motif, {
    ...ambientStage,
    clipLeft: copyX + 18
  })
  drawDirectorCutFooterWordmark(
    ctx,
    footerLayout.wordmark,
    motif.secondary || accent,
    motif
  )

  drawDirectorCutNarrativeStage(ctx, motif, {
    x: ticketX + railWidth,
    y: ticketY,
    width: mainRight - ticketX - railWidth,
    height: ticketHeight,
    copyX,
    mainRight,
    accent,
    secondary: motif.secondary || accent
  })

  const languageStageX = Math.max(ticketX + railWidth, copyX - 92)
  const languageStageY = ticketY + 48
  const languageStageRight = mainRight - 76
  const languageStage = {
    x: languageStageX,
    y: languageStageY,
    width: Math.max(520, languageStageRight - languageStageX),
    height: ticketHeight - 80,
    travelX: ticketX + railWidth + 320,
    lineRight: mainRight - 24,
    copyX,
    mainRight,
    accent,
    secondary: motif.secondary || accent,
    heroMark: images.heroMark || null
  }
  if (motif?.lineLayer !== 'ambient') drawDirectorCutLineChoreography(ctx, motif, languageStage)
  if (motif?.languageField === 'rail-map' && motif?.lineLayer !== 'ambient') {
    drawDirectorCutRailCopyCleanZone(ctx, {
      centerX: copyX + 160,
      centerY: ticketY + 315,
      radiusX: 290,
      radiusY: 190
    })
    drawDirectorCutRailTerminal(ctx, motif, languageStage)
  }
  if (motif?.heroMarkMode === 'emblem') {
    drawDirectorCutHeroEmblem(ctx, motif, languageStage)
  } else {
    drawDirectorCutLanguageField(ctx, motif, {
      x: ticketX + railWidth,
      y: ticketY,
      width: mainRight - ticketX - railWidth,
      height: ticketHeight,
      copyX,
      mainRight,
      accent,
      secondary: motif.secondary || accent
    })
  }

  drawDirectorCutIdentityLayer(ctx, motif, {
    x: copyX - 14,
    y: ticketY + 10,
    width: mainRight - copyX - 4,
    height: ticketHeight - 20,
    accent,
    secondary: motif.secondary || accent
  })

  ctx.fillStyle = accent
  ctx.fillRect(ticketX, ticketY, railWidth, ticketHeight)
  ctx.save()
  ctx.translate(ticketX + 31, ticketY + ticketHeight - 26)
  ctx.rotate(-Math.PI / 2)
  drawText(ctx, edition.rail, 0, 0, {
    font: `900 11px ${FONT_MONO}`,
    fill: '#080906',
    maxWidth: ticketHeight - 54
  })
  ctx.restore()

  if (images.eventLogo) {
    drawVisibleImageContained(ctx, images.eventLogo, ticketX + railWidth + 22, 49, 46, 46, { alpha: 0.88 })
  }
  drawText(ctx, edition.header, ticketX + railWidth + 82, 61, {
    font: `900 12px ${FONT_MONO}`,
    fill: accent
  })
  drawText(ctx, data.productionLine, ticketX + railWidth + 82, 84, {
    font: `900 10px ${FONT_MONO}`,
    fill: 'rgba(255,247,220,0.58)',
    maxWidth: 430
  })
  drawText(ctx, safeText(payload.archiveId, 'FCR26-ARCHIVE'), mainRight - 30, 60, {
    font: `900 12px ${FONT_MONO}`,
    fill: 'rgba(255,247,220,0.55)',
    align: 'right'
  })
  drawText(ctx, 'FINAL PRINT / 2026', mainRight - 30, 83, {
    font: `900 9px ${FONT_MONO}`,
    fill: accent,
    align: 'right'
  })

  drawText(ctx, data.copy.feature, copyX, 137, {
    font: `900 10px ${FONT_MONO}`,
    fill: accent
  })
  drawText(ctx, `${data.directorChoiceLabel}${data.directorHeroNameEn ? ` / ${data.directorHeroNameEn.toLocaleUpperCase('en-US')}` : ''}`, mainRight - 30, 137, {
    font: `900 9px ${FONT_MONO}`,
    fill: 'rgba(255,247,220,0.52)',
    align: 'right',
    maxWidth: 370
  })
  ctx.fillStyle = 'rgba(255,247,220,0.13)'
  ctx.fillRect(copyX, 151, copyWidth, 1)
  drawText(ctx, motif.label, copyX, 174, {
    font: `900 9px ${FONT_MONO}`,
    fill: hexToRgba(motif.secondary || accent, 0.78),
    maxWidth: copyWidth - 90
  })
  drawText(ctx, motif.code || 'DC-00', mainRight - 30, 174, {
    font: `900 9px ${FONT_MONO}`,
    fill: 'rgba(255,247,220,0.38)',
    align: 'right'
  })

  const identityLayout = getDirectorCutIdentityLayout(ctx, {
    title: data.title,
    secondary: data.secondary,
    copyX,
    copyWidth,
    emblemLayout: motif?.heroMarkMode === 'emblem' ? getDirectorCutEmblemLayout(motif, languageStage) : null
  })
  drawDirectorCutTitle(ctx, identityLayout, accent)
  drawText(ctx, data.copy.starring, copyX, identityLayout.starringBaseline, {
    font: `900 9px ${FONT_MONO}`,
    fill: accent
  })
  drawText(ctx, data.secondary, copyX, identityLayout.secondaryBaseline, {
    font: `900 ${identityLayout.secondarySize}px ${FONT_SC}`,
    fill: 'rgba(255,247,220,0.88)',
    maxWidth: identityLayout.maxWidth
  })

  const loglineY = identityLayout.loglineY
  ctx.fillStyle = accent
  ctx.fillRect(copyX, loglineY, 4, 82)
  drawText(ctx, edition.note, copyX + 16, loglineY + 20, {
    font: `900 9px ${FONT_MONO}`,
    fill: accent,
    maxWidth: copyWidth - 32
  })
  ctx.font = `900 22px ${FONT_SC}`
  ctx.fillStyle = 'rgba(255,247,220,0.9)'
  wrapCanvasText(ctx, data.note, copyX + 16, loglineY + 48, copyWidth - 32, 25, 2)

  drawDirectorCutDetails(ctx, data, copyX, 465, copyWidth, accent)

  drawText(ctx, data.copy.credits, copyX, 584, {
    font: `900 10px ${FONT_MONO}`,
    fill: accent
  })
  footerLayout.credits.forEach(line => {
    drawText(ctx, line.label, copyX, line.baseline, {
      font: `900 9px ${FONT_MONO}`,
      fill: 'rgba(255,247,220,0.5)',
      maxWidth: 104
    })
    drawText(ctx, line.names, line.x, line.baseline, {
      font: `900 ${line.size}px ${FONT_SC}`,
      fill: 'rgba(255,247,220,0.88)',
      maxWidth: line.maxWidth
    })
  })

  drawText(ctx, motif.cutLabel || data.cutLabel, ticketX + railWidth + 22, 679, {
    font: `900 10px ${FONT_MONO}`,
    fill: motif.secondary || accent,
    maxWidth: 126
  })
  drawText(ctx, data.locationLine, ticketX + railWidth + 144, 679, {
    font: `900 9px ${FONT_MONO}`,
    fill: 'rgba(255,247,220,0.5)',
    maxWidth: 430
  })
  drawText(ctx, data.formatLine, mainRight - 30, 679, {
    font: `900 8px ${FONT_MONO}`,
    fill: 'rgba(255,247,220,0.46)',
    align: 'right',
    maxWidth: copyWidth
  })
  drawDirectorCutTimeline(ctx, ticketX + railWidth + 22, 714, mainRight - ticketX - railWidth - 52, accent, data.matchResults)

  drawDirectorCutStub(ctx, width, height, payload, data, images, accent, stubX)
  drawClassicPosterGrain(ctx, width, height, `${payload.archiveId}-DIRECTORS-CUT`)
  ctx.restore()

  ctx.save()
  ctx.strokeStyle = 'rgba(255,247,220,0.22)'
  ctx.lineWidth = 2
  drawCutCornerRect(ctx, ticketX, ticketY, ticketWidth, ticketHeight, 24)
  ctx.stroke()
  ctx.restore()
  cutCinemaTicketNotches(ctx, ticketX, ticketY, ticketWidth, ticketHeight, stubX)
}

function drawDirectorCutTicketPoster(ctx, payload, images, accent) {
  const width = ctx.canvas.width
  const height = ctx.canvas.height
  const ticketWidth = 1600
  const ticketHeight = 760
  const ticket = document.createElement('canvas')
  const ticketCtx = getPosterLocaleContext(ticket, payload)

  ticket.width = ticketWidth
  ticket.height = ticketHeight
  ctx.fillStyle = '#030403'
  ctx.fillRect(0, 0, width, height)

  const projection = ctx.createRadialGradient(width * 0.5, height * 0.44, 20, width * 0.5, height * 0.44, 920)
  projection.addColorStop(0, hexToRgba(accent, 0.12))
  projection.addColorStop(0.46, hexToRgba(accent, 0.035))
  projection.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = projection
  ctx.fillRect(0, 0, width, height)
  drawGrid(ctx, width, height)

  drawLandscapeDirectorCutTicket(ticketCtx, ticketWidth, ticketHeight, payload, images, accent)

  const scale = Math.min((width - 180) / ticketWidth, (height - 140) / ticketHeight)
  const drawWidth = ticketWidth * scale
  const drawHeight = ticketHeight * scale
  const drawX = (width - drawWidth) / 2
  const drawY = (height - drawHeight) / 2

  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.72)'
  ctx.shadowBlur = 42
  ctx.drawImage(ticket, drawX, drawY, drawWidth, drawHeight)
  ctx.restore()

  ctx.save()
  ctx.strokeStyle = hexToRgba(accent, 0.3)
  ctx.lineWidth = 1
  const crop = 20
  ;[
    [drawX - crop, drawY, drawX - 4, drawY],
    [drawX, drawY - crop, drawX, drawY - 4],
    [drawX + drawWidth + 4, drawY, drawX + drawWidth + crop, drawY],
    [drawX + drawWidth, drawY - crop, drawX + drawWidth, drawY - 4],
    [drawX - crop, drawY + drawHeight, drawX - 4, drawY + drawHeight],
    [drawX, drawY + drawHeight + 4, drawX, drawY + drawHeight + crop],
    [drawX + drawWidth + 4, drawY + drawHeight, drawX + drawWidth + crop, drawY + drawHeight],
    [drawX + drawWidth, drawY + drawHeight + 4, drawX + drawWidth, drawY + drawHeight + crop]
  ].forEach(([x1, y1, x2, y2]) => {
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.stroke()
  })
  ctx.restore()
}

export async function generatePosterPng(payload, options = {}) {
  const outputFormat = options.format === 'poster'
    ? 'poster'
    : options.format === 'directorCut'
      ? 'directorCut'
    : options.format === 'movieTicket'
      ? 'movieTicket'
      : 'ticket'
  if (outputFormat === 'directorCut' && !payload?.heroRender) return ''

  await ensurePosterFontsReady()

  const canvas = document.createElement('canvas')
  const isPlayerTicket = payload.cardKind === 'player'
  const isIdentityTicket = Boolean(payload.identityTicket)
  const isHorizontalTicket = isPlayerTicket || isIdentityTicket
  const isMovieTicket = outputFormat === 'movieTicket'
  const isDirectorCut = outputFormat === 'directorCut'
  const isWideBoarding = outputFormat === 'ticket' && isPlayerTicket && (payload.usesRegularTemplate || payload.seasonId === 'FCR26')
  const width = isWideBoarding ? 2400 : outputFormat === 'poster' ? 1080 : (isMovieTicket || isDirectorCut || isHorizontalTicket) ? 1920 : 1080
  const height = isWideBoarding ? 960 : outputFormat === 'poster' ? 1920 : (isMovieTicket || isDirectorCut || isHorizontalTicket) ? 1080 : 1920
  const accent = payload.usesRegularTemplate || payload.seasonId === 'FCR26' ? TONE_COLORS.gold : TONE_COLORS[payload.tone] || TONE_COLORS.gold

  canvas.width = width
  canvas.height = height

  const ctx = getPosterLocaleContext(canvas, payload)
  if (!ctx) return ''

  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  const sourceImage = isDirectorCut ? null : await loadImage(payload.image)
  const image = isDirectorCut
    ? null
    : sourceImage || (payload.cardKind === 'team' ? await loadImage(DEFAULT_OW_TEAM_LOGO) : null)

  if (outputFormat === 'poster' || isMovieTicket || isDirectorCut) {
    const teamLogoSource = isDirectorCut
      ? ''
      : payload.playerTicket?.teamLogo || payload.identityTicket?.teamLogo || ''
    const directorData = isDirectorCut ? getCinemaTicketData(payload) : null
    const directorHeroName = safeText(directorData?.directorHeroNameEn, directorData?.directorHeroName)
    const directorHeroMarkSource = isDirectorCut
      ? DIRECTOR_CUT_HERO_MARKS[heroNameToSlug(directorHeroName)] || ''
      : ''
    const [eventLogo, heroRender, teamLogo, heroMark] = await Promise.all([
      loadImage(payload.eventLogo || DEFAULT_EVENT_LOGO),
      loadImage(payload.heroRender),
      loadImage(teamLogoSource),
      loadImage(directorHeroMarkSource)
    ])
    const usesDefaultTeamMark = payload.cardKind === 'team' && !sourceImage && !teamLogo
    const posterMainImage = payload.cardKind === 'team' && teamLogo ? teamLogo : image
    const identityBackdrop = teamLogo || (payload.cardKind === 'player' ? null : posterMainImage)
    const posterImages = {
      mainImage: posterMainImage,
      heroRender,
      heroMark,
      eventLogo,
      teamLogo: identityBackdrop,
      usesDefaultTeamMark
    }
    if (isDirectorCut) drawDirectorCutTicketPoster(ctx, payload, posterImages, accent)
    else if (isMovieTicket) drawCinemaTicketPoster(ctx, payload, posterImages, accent)
    else drawSeasonFilmPoster(ctx, payload, posterImages, accent)
  } else if (isPlayerTicket) {
    const [eventLogo, teamLogo, ...heroImages] = await Promise.all([
      loadImage(payload.eventLogo || DEFAULT_EVENT_LOGO),
      loadImage(payload.playerTicket?.teamLogo),
      ...safeArr(payload.playerTicket?.heroes).slice(0, 3).map(hero => loadImage(hero.src))
    ])

    const [, boardingQr] = await Promise.all([
      isWideBoarding ? ensureBoardingFontsReady() : null,
      isWideBoarding ? createBoardingQr(payload.reviewUrl) : null
    ])
    drawPlayerTicketPoster(ctx, payload, { mainImage: image, fcaLogo: eventLogo, teamLogo, heroImages, boardingQr }, accent)
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
