import { buildReviewPath } from './reviewNavigation.js'

export const BOARDING_SANS_FONT = '"FCA Harmony", "HarmonyOS Sans SC", "Noto Sans SC", "Microsoft YaHei", sans-serif'
export const BOARDING_MONO_FONT = '"FCR Boarding Mono", "Cascadia Mono", Consolas, "Liberation Mono", monospace'
export const BOARDING_QR_SLOT = Object.freeze({ x: 1676, y: 526, size: 166 })
const REVIEW_PUBLIC_ORIGIN = 'https://stats.fries-cup.com'
let boardingFontsReady = null

// Printed keepsakes always point to the public archive, including local previews.
// Keep only the identity path, season and language; omit transient scene/modal state.
export function buildBoardingReviewUrl(pathname, seasonId, locale) {
  if (!/^\/review\/story\/(?:player|person)\/[^/?#]+\/?$/.test(String(pathname || ''))) return ''
  return new URL(buildReviewPath(pathname, seasonId, locale), REVIEW_PUBLIC_ORIGIN).href
}

export async function ensureBoardingFontsReady() {
  if (typeof document === 'undefined' || !document.fonts || typeof FontFace === 'undefined') return
  if (!boardingFontsReady) {
    const mono = new FontFace('FCR Boarding Mono', 'url("/fonts/roboto-mono/RobotoMono-Variable.ttf")', { weight: '100 700' })
    document.fonts.add(mono)
    boardingFontsReady = Promise.all([
      mono.load().catch(() => null),
      ...[400, 500, 700, 900].map(weight => document.fonts.load(`${weight} 24px "FCA Harmony"`).catch(() => []))
    ])
  }
  let timer
  try {
    await Promise.race([
      boardingFontsReady,
      new Promise(resolve => { timer = setTimeout(resolve, 4000) })
    ])
  } finally {
    clearTimeout(timer)
  }
}

export async function createBoardingQr(reviewUrl) {
  if (!reviewUrl) return null
  const { default: QRCode } = await import('qrcode')
  return QRCode.create(reviewUrl, { errorCorrectionLevel: 'M' }).modules
}

// Render after the ticket is scaled onto the export canvas, so module edges land
// on whole output pixels. Four light modules around the code form its quiet zone.
export function drawBoardingQr(ctx, modules, x, y, size) {
  if (!modules) return
  const left = Math.round(x)
  const top = Math.round(y)
  const pixels = Math.round(size)
  const extent = modules.size + 8
  const edge = position => Math.round(position * pixels / extent)
  ctx.save()
  ctx.fillStyle = '#e7dfc8'
  ctx.fillRect(left, top, pixels, pixels)
  ctx.fillStyle = '#171812'
  for (let row = 0; row < modules.size; row += 1) {
    for (let column = 0; column < modules.size; column += 1) {
      if (!modules.get(row, column)) continue
      const x1 = edge(column + 4)
      const y1 = edge(row + 4)
      ctx.fillRect(left + x1, top + y1, edge(column + 5) - x1, edge(row + 5) - y1)
    }
  }
  ctx.restore()
}
