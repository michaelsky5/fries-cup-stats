import { getOwHero } from './heroes.js'
import { HERO_ARTWORK_PROFILES } from '../data/heroArtworkProfiles.js'
import assets from '../generated/heroArtworkAssets.json' with { type: 'json' }

export function getHeroArtwork(heroName, variant = 'roster') {
  const hero = getOwHero(heroName)
  if (!hero) return null
  const assetKey = (hero.assetKey || hero.id).replace(/_/g, '-')
  const profile = HERO_ARTWORK_PROFILES[hero.id]
  if (!profile) return null
  const crop = variant === 'roster' ? profile.presets?.['roster-card'] || {} : {}
  const scale = crop.scale ?? profile.scale ?? 1
  const height = crop.contentHeight ?? profile.contentHeight
  const top = crop.top ?? profile.top
  const base = `/review/hero-renders/${hero.role}/${assetKey}`
  const variants = assets[hero.id] || []

  return {
    id: hero.id,
    label: hero.zh,
    labelEn: hero.en,
    src: variants[0]?.src || `${base}.png`,
    srcSet: variants.map(item => `${item.src} ${item.width}w`).join(', ') || undefined,
    sizes: variant === 'spotlight' ? '(max-width: 600px) 580px, 840px' : '(max-width: 600px) 420px, 540px',
    original: `${base}.png`,
    thumbnail: `/heroes/${hero.role}/${assetKey.replace(/-/g, '_')}.png`,
    style: {
      '--hero-art-height': `${100 * scale / height}%`,
      '--hero-art-top': `${3 - 100 * top * scale / height}%`,
      '--hero-art-focus': `${-100 * (crop.focusX ?? profile.focusX)}%`
    }
  }
}
