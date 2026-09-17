import { translateUiText as uiText } from '../../lib/uiText.js'
import HeroArtwork from './HeroArtwork.jsx'
import styles from './MissingHeroPortrait.module.css'

// FryDeck uses Sombra's outline as a missing-data graphic, never a player hero selection.
export default function MissingHeroPortrait({ className = '', locale = 'zh-CN' }) {
  const en = locale === 'en-US'
  return <div className={`${styles.root} ${className}`} data-portrait-state="missing" role="img" aria-label={en ? 'No hero data' : uiText("暂无英雄数据", locale)}>
    <HeroArtwork hero="Sombra" variant="spotlight" className={styles.silhouette} decorative />
    <div className={styles.status} aria-hidden="true"><span><i />HERO SIGNAL / 00</span><strong>{en ? 'NO HERO DATA' : uiText("暂无英雄数据", locale)}</strong></div>
  </div>
}
