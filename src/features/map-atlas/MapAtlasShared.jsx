import { useState } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { SignalDataNav } from '../../components/database/SignalDataHeader.jsx'
import { getOwHeroAssetKey, getOwHeroRole } from '../../lib/heroes.js'
import styles from './MapAtlas.module.css'

export function Arrow({ back = false, down = false }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" style={{ transform: back ? 'rotate(180deg)' : down ? 'rotate(90deg)' : undefined }}><path d="M4 12h15m-6-6 6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>
}

export function AtlasImage({ src, alt = '', className = '', eager = false }) {
  const [failedSource, setFailedSource] = useState('')
  return <span className={[styles.image, className].join(' ')} data-missing={!src || failedSource === src}>
    {src && failedSource !== src ? <img src={src} alt={alt} loading={eager ? 'eager' : 'lazy'} onError={() => setFailedSource(src)} /> : <span aria-label={alt || undefined} className={styles.imageFallback} aria-hidden={alt ? undefined : true}>↗</span>}
  </span>
}

export function HeroPortrait({ name, className = '' }) {
  const asset = getOwHeroAssetKey(name)
  const role = getOwHeroRole(name)
  return <AtlasImage className={className} src={asset && role ? `/heroes/${role}/${asset}.png` : ''} />
}

export function AtlasNav({ withSeason, locale, backTo = '', backState, indexTo, backLabel }) {
  const isEn = locale === 'en-US'
  return <SignalDataNav active="maps" withSeason={withSeason} isEn={isEn} activeHref={indexTo} backTo={backTo} backState={backState} backLabel={backLabel || (isEn ? 'Back to all maps' : '返回地图索引')} />
}

export function useAtlasQuery() {
  const [params, setParams] = useSearchParams()
  const location = useLocation()
  const update = values => setParams(previous => {
    const next = new URLSearchParams(previous)
    Object.entries(values).forEach(([key, value]) => value ? next.set(key, String(value)) : next.delete(key))
    return next
  }, { replace: true, preventScrollReset: true, flushSync: true, state: { ...location.state, restoreScrollY: undefined } })
  return [params, update]
}

export function ChapterHeading({ number, title, english, children }) {
  return <header className={styles.chapterHeading}>
    <span className={styles.chapterNumber}>{number}</span>
    <div><span className={styles.eyebrow}>{english}</span><h2>{title}</h2></div>
    {children ? <div className={styles.chapterMeta}>{children}</div> : null}
  </header>
}

export function AtlasEmpty({ title, children, action }) {
  return <div className={styles.empty}><span aria-hidden="true">∅</span><h2>{title}</h2><p>{children}</p>{action}</div>
}

export const percent = (value, digits = 1) => `${(Math.max(0, value || 0) * 100).toFixed(digits)}%`
