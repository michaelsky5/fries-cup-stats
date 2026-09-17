import { useState } from 'react'
import { getHeroArtwork } from '../../lib/heroArtwork.js'
import styles from './HeroArtwork.module.css'

function ArtworkImage({ artwork, alt, priority }) {
  const [sourceIndex, setSourceIndex] = useState(0)
  const sources = [artwork.src, artwork.original, artwork.thumbnail]

  if (sourceIndex >= sources.length) return <span className={styles.fallback} aria-hidden="true">—</span>

  return (
    <img
      className={sourceIndex === 2 ? styles.thumbnail : styles.image}
      src={sources[sourceIndex]}
      srcSet={sourceIndex === 0 ? artwork.srcSet : undefined}
      sizes={sourceIndex === 0 ? artwork.sizes : undefined}
      alt={alt}
      width="1920"
      height="1080"
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      decoding="async"
      draggable="false"
      onError={() => setSourceIndex(index => index + 1)}
    />
  )
}

export default function HeroArtwork({ hero, className = '', variant = 'roster', decorative = false, priority = false, locale = 'zh-CN' }) {
  const artwork = getHeroArtwork(hero, variant)
  const alt = decorative ? '' : artwork ? (locale === 'en-US' ? artwork.labelEn : artwork.label) : ''

  return (
    <span className={`${styles.frame} ${className}`} style={artwork?.style} data-hero-artwork={artwork?.id || 'unknown'} aria-hidden={decorative || !artwork ? 'true' : undefined}>
      {artwork ? <ArtworkImage key={artwork.id} artwork={artwork} alt={alt} priority={priority} /> : <span className={styles.fallback}>—</span>}
    </span>
  )
}
