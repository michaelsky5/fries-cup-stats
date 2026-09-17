import { useState } from 'react'
import { getTeamLogoCandidates } from '../../lib/matchesSelectors.js'
import { getShareHeroArtwork } from './heroShareArtworkResolver.js'
import styles from './PlayerStoryShareCard.module.css'

function StoryArtwork({ hero, role }) {
  const artwork = getShareHeroArtwork(hero, role)
  const [fallback, setFallback] = useState(false)
  const [failed, setFailed] = useState(false)
  if (failed || !artwork.src) return null
  return <img src={fallback ? artwork.fallbackSrc : artwork.src} alt="" loading="eager" draggable="false" onError={() => fallback ? setFailed(true) : setFallback(true)} style={{ objectPosition: artwork.crop.objectPosition }} />
}

export default function PlayerStoryShareCard({ model }) {
  const nameUnits = Array.from(model.identity.displayName).reduce((sum, char) => sum + (char.codePointAt(0) > 255 ? 1 : /[MW@]/.test(char) ? .92 : .58), 0)
  const nameSize = Math.max(40, Math.min(112, Math.floor(800 / Math.max(1, nameUnits))))
  const team = { id: model.identity.teamRouteId, short: model.identity.teamShort, name: model.identity.teamFull, logo: model.identity.teamLogo }
  return <article className={styles.card} data-story-card={model.kind} aria-label={`${model.identity.displayName} · ${model.category}`}>
    <header className={styles.top}><strong>FRIES CUP<span>赛事中心 / PERSONAL ARCHIVE</span></strong><span>{model.seasonCode}<b>{model.category}</b></span></header>
    <div className={styles.artwork} aria-hidden="true">{model.rawHero ? <StoryArtwork key={`${model.rawHero}:${model.role}`} hero={model.rawHero} role={model.role} /> : <StoryTeamLogo key={team.id} team={team} seasonCode={model.seasonCode} className={styles.teamFallback} />}</div>
    <div className={styles.copy}>
      <div className={styles.identity}><StoryTeamLogo key={team.id} team={team} seasonCode={model.seasonCode} className={styles.logo} /><span>{model.identity.teamShort} <i>/</i> {model.roleLabel}</span></div>
      <h1 style={{ fontSize: nameSize }}>{model.identity.displayName}</h1><p className={styles.tag}>{model.identity.battleTag}</p>
      <div className={styles.story}><h2>{model.title}</h2>{model.seriesScore && <strong className={styles.seriesScore}>{model.seriesScore}</strong>}<p>{model.detail}</p></div>
      <dl className={styles.facts}>{model.facts.map(fact => <div key={fact.label}><dd data-compact={fact.compact || undefined}>{fact.value}{fact.suffix && <small>{fact.suffix}</small>}</dd><dt>{fact.label}</dt></div>)}</dl>
    </div>
    <div className={styles.artCaption}><span>{model.heroCaption}</span><strong>{model.heroLabel}</strong>{model.rating && <span className={styles.seasonRating}>SEASON OVR <b>{model.rating.value}</b><small>{model.rating.status}</small></span>}</div>
    <footer className={styles.footer}><p>{model.note}</p><strong>{model.seasonCode} <span>↗</span></strong></footer>
  </article>
}

function StoryTeamLogo({ team, seasonCode, className }) {
  const [index, setIndex] = useState(0)
  const candidates = getTeamLogoCandidates(team, seasonCode)
  return <span className={className}>{candidates[index] ? <img src={candidates[index]} alt="" loading="eager" onError={() => setIndex(value => value + 1)} /> : <b>{team.short}</b>}</span>
}
