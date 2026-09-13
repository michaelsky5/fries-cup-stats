import { translateUiText as uiText } from '../../../lib/uiText.js'
import { useUiLocale } from '../../../hooks/useUiLocale.js'
import { useState } from 'react'
import { getHeroAvatarSrc } from '../../../lib/leaderboardSelectors.js'
import styles from './SignalPlayerData.module.css'

export function SignalBattleTag({ value, en }) {
  const uiLocale = useUiLocale()
  if (!value) return en ? 'BattleTag not published' : uiText('战网 ID 未公开', uiLocale)
  const divider = value.lastIndexOf('#')
  return divider > 0 ? <>{value.slice(0, divider)}<wbr /><span className={styles.tagSuffix}>{value.slice(divider)}</span></> : value
}

export function SignalRating({ value, mvp = false, en = false }) {
  const uiLocale = useUiLocale()
  const display = value != null && value !== '' && Number.isFinite(Number(value)) ? Number(value).toFixed(1) : '—'
  return <span className={styles.rating} data-rating-value={display} data-team-mvp={mvp || undefined} data-empty={display === '—'} title={mvp ? (en ? 'Team best on this map' : uiText("本队本图最佳", uiLocale)) : undefined} aria-label={mvp ? `${display} · ${en ? 'Team best on this map' : uiText("本队本图最佳", uiLocale)}` : undefined}>
    <strong>{display}</strong>
  </span>
}

export function SignalHeroPortrait({ hero, role, description }) {
  const [failedSrc, setFailedSrc] = useState('')
  const src = getHeroAvatarSrc(hero, role)
  return <span className={styles.hero} data-hero={hero} role="img" aria-label={description || hero} title={description || hero}>
    {src && failedSrc !== src ? <img src={src} alt="" loading="lazy" onError={() => setFailedSrc(src)} /> : <span aria-hidden="true">—</span>}
  </span>
}

export function SignalHeroList({ row, en, showMaps = true }) {
  const uiLocale = useUiLocale()
  return <span className={styles.heroes} data-player-heroes aria-label={en ? 'Recorded heroes' : uiText("使用英雄", uiLocale)}>
    {row.heroUsage.map(item => <SignalHeroPortrait key={item.hero} hero={item.hero} role={row.role} description={showMaps ? `${item.hero} · ${en ? 'Maps ' : uiText("第 ", uiLocale)}${item.maps.join(en ? ', ' : '、')}${en ? '' : uiText(" 图", uiLocale)}` : item.hero} />)}
  </span>
}
