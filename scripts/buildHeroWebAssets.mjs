import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { OW_HEROES } from '../src/lib/heroes.js'
import { HERO_ARTWORK_PROFILES } from '../src/data/heroArtworkProfiles.js'

// Optional --sharp-root points to an existing Sharp installation. The original
// transparent PNGs remain untouched; only web delivery derivatives are written.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sharpRootIndex = process.argv.indexOf('--sharp-root')
const taskRequire = createRequire(sharpRootIndex >= 0
  ? path.join(path.resolve(process.argv[sharpRootIndex + 1]), 'package.json')
  : import.meta.url)
const sharp = taskRequire('sharp')
const widths = [640, 1280]
const assets = {}
let sourceBytes = 0
let deliveryBytes = 0

for (const hero of OW_HEROES) {
  if (!HERO_ARTWORK_PROFILES[hero.id]) throw new Error(`Missing source framing: ${hero.id}`)
  const slug = (hero.assetKey || hero.id).replace(/_/g, '-')
  const source = path.join(root, 'public/review/hero-renders', hero.role, `${slug}.png`)
  const data = await readFile(source)
  const metadata = await sharp(data).metadata()
  if (!metadata.hasAlpha || metadata.width !== 1920 || metadata.height !== 1080) {
    throw new Error(`Unexpected artwork dimensions or transparency: ${hero.id}`)
  }
  sourceBytes += data.length
  const outputDir = path.join(root, 'public/hero-artwork', hero.role)
  await mkdir(outputDir, { recursive: true })
  assets[hero.id] = await Promise.all(widths.map(async width => {
    const filename = `${slug}-${width}.webp`
    const output = path.join(outputDir, filename)
    await sharp(data).resize({ width, withoutEnlargement: true })
      .webp({ quality: 84, alphaQuality: 100, effort: 4 }).toFile(output)
    const bytes = (await stat(output)).size
    deliveryBytes += bytes
    return { src: `/hero-artwork/${hero.role}/${filename}`, width, height: width * 9 / 16, bytes }
  }))
}

await mkdir(path.join(root, 'src/generated'), { recursive: true })
await writeFile(path.join(root, 'src/generated/heroArtworkAssets.json'), `${JSON.stringify(assets, null, 2)}\n`)
console.log(JSON.stringify({ heroes: Object.keys(assets).length, variants: widths, sourceBytes, deliveryBytes }, null, 2))
