import { getHeroAvatarSrc, getHeroSlug, getRoleHeroFolder } from '../../lib/leaderboardSelectors.js'
import { getOwHeroRole } from '../../lib/heroes.js'
import { DEFAULT_SHARE_ARTWORK_CROP, HERO_SHARE_ARTWORK_CROPS } from './heroShareArtworkConfig.js'

export function getShareHeroArtwork(heroName, role) {
  const slug = getHeroSlug(heroName)
  if (!slug) {
    return {
      type: 'fallback',
      src: '',
      fallbackSrc: '',
      slug: '',
      crop: DEFAULT_SHARE_ARTWORK_CROP
    }
  }

  const crop = {
    ...DEFAULT_SHARE_ARTWORK_CROP,
    ...(HERO_SHARE_ARTWORK_CROPS[slug] || {})
  }
  const assetRole = getOwHeroRole(heroName) || role

  return {
    type: 'roster',
    src: `/roster/${getRoleHeroFolder(assetRole)}/${slug}.png`,
    fallbackSrc: getHeroAvatarSrc(heroName, role),
    slug,
    crop
  }
}
