import { useEffect, useMemo, useState } from 'react'
import TeamLogo from '../../components/matches/TeamLogo.jsx'
import { createTranslator } from '../../lib/i18n.js'
import { formatCardValue } from './playerShareOvr.js'
import { DEFAULT_SHARE_ARTWORK_CROP } from './heroShareArtworkConfig.js'
import styles from './PlayerShareCard.module.css'

function playerNameClass(name) {
  const length = String(name || '').length
  if (length > 18) return styles.nameTiny
  if (length > 12) return styles.nameSmall
  return ''
}

function unique(values) {
  return values.filter((value, index, arr) => value && arr.indexOf(value) === index)
}

function hexToRgba(hex, alpha) {
  const value = String(hex || '').replace('#', '')
  const normalized = value.length === 3
    ? value.split('').map(char => char + char).join('')
    : value.padEnd(6, '0').slice(0, 6)
  const int = Number.parseInt(normalized, 16)
  if (!Number.isFinite(int)) return `rgba(244, 195, 32, ${alpha})`
  const r = (int >> 16) & 255
  const g = (int >> 8) & 255
  const b = int & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function HeroArtwork({ model, exportMode = false }) {
  const artwork = model.visuals.heroArtworkMeta || {}
  const crop = artwork.crop || DEFAULT_SHARE_ARTWORK_CROP
  const candidates = useMemo(
    () => unique([artwork.src, artwork.fallbackSrc, model.visuals.heroPortrait, model.visuals.heroArtwork]),
    [artwork.fallbackSrc, artwork.src, model.visuals.heroArtwork, model.visuals.heroPortrait]
  )
  const [candidateIndex, setCandidateIndex] = useState(0)

  useEffect(() => {
    setCandidateIndex(0)
  }, [candidates.join('|')])

  const src = candidates[candidateIndex]
  if (!src) {
    return (
      <div className={styles.artFallback}>
        <span>{model.identity.initials}</span>
      </div>
    )
  }

  return (
    <img
      className={styles.heroArtwork}
      src={src}
      alt={model.visuals.hero || model.identity.nickname}
      loading={exportMode ? 'eager' : 'lazy'}
      style={{
        objectPosition: crop.objectPosition || DEFAULT_SHARE_ARTWORK_CROP.objectPosition,
        transform: `translate(${crop.translateX || '0px'}, ${crop.translateY || '0px'}) scale(${crop.scale || 1})`
      }}
      onError={() => setCandidateIndex(index => index + 1)}
    />
  )
}

function getPolygonPoints(values, radius, centerX, centerY) {
  const count = values.length || 1
  return values.map((value, index) => {
    const angle = (-90 + (360 / count) * index) * (Math.PI / 180)
    const normalized = Number.isFinite(Number(value)) ? Number(value) / 100 : 0
    const r = radius * Math.max(0, Math.min(1, normalized))
    return [
      centerX + Math.cos(angle) * r,
      centerY + Math.sin(angle) * r
    ]
  })
}

function pointsToString(points) {
  return points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
}

function RadarFingerprint({ model }) {
  const t = createTranslator(model.locale)
  const labels = model.radar.labels
  const values = model.radar.playerValues
  const availableCount = values.filter(value => Number.isFinite(Number(value))).length
  const centerX = 270
  const centerY = 250
  const radius = 168
  const roleColor = model.visuals.roleColor || '#f4c320'
  const playerPoints = getPolygonPoints(values, radius, centerX, centerY)
  const medianPoints = getPolygonPoints(model.radar.roleMedianValues, radius, centerX, centerY)
  const labelPoints = getPolygonPoints(labels.map(() => 115), radius, centerX, centerY)

  return (
    <section className={styles.radarBlock}>
      <div className={styles.panelKicker}>PERFORMANCE FINGERPRINT</div>
      <h3>{t('playerShare.card.performanceFingerprint', '表现指纹')}</h3>
      <svg viewBox="0 0 540 500" role="img" aria-label={t('playerShare.card.radarAria', '表现指纹雷达图')}>
        {[0.25, 0.5, 0.75, 1].map(step => (
          <polygon
            key={step}
            points={pointsToString(getPolygonPoints(labels.map(() => step * 100), radius, centerX, centerY))}
            fill="transparent"
            stroke="rgba(255,255,255,0.14)"
            strokeWidth="2"
          />
        ))}
        {labels.map((label, index) => {
          const [x, y] = labelPoints[index]
          return (
            <g key={label}>
              <line
                x1={centerX}
                y1={centerY}
                x2={x}
                y2={y}
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="1"
              />
              <text
                x={x}
                y={y}
                fill="#ffffff"
                opacity="0.78"
                fontSize="21"
                fontWeight="950"
                textAnchor={x < centerX - 16 ? 'end' : x > centerX + 16 ? 'start' : 'middle'}
                dominantBaseline="middle"
              >
                {label}
              </text>
            </g>
          )
        })}
        {availableCount >= 3 ? (
          <>
            <polygon
              points={pointsToString(medianPoints)}
              fill="rgba(255,255,255,0.05)"
              stroke="rgba(255,255,255,0.58)"
              strokeDasharray="10 8"
              strokeWidth="4"
            />
            <polygon
              points={pointsToString(playerPoints)}
              fill={hexToRgba(roleColor, 0.2)}
              stroke={hexToRgba(roleColor, 0.28)}
              strokeWidth="16"
              strokeLinejoin="round"
            />
            <polygon
              points={pointsToString(playerPoints)}
              fill={hexToRgba(roleColor, 0.24)}
              stroke={roleColor}
              strokeWidth="6"
              strokeLinejoin="round"
            />
          </>
        ) : null}
      </svg>
      <div className={styles.radarLegend}>
        <span><i style={{ background: roleColor }} />{t('playerShare.card.playerRadar', '选手职责表现')}</span>
        <span><i style={{ background: 'rgba(255,255,255,0.58)' }} />{t('playerShare.card.roleMedian', '同职责中位')}</span>
      </div>
      {availableCount < 3 ? (
        <p className={styles.unratedNote}>{t('playerShare.card.radarInsufficient', '样本不足，暂不生成雷达图。')}</p>
      ) : null}
    </section>
  )
}

function AttributeRail({ attributes }) {
  const hotKeys = attributes
    .filter(item => item.available)
    .sort((a, b) => Number(b.cardValue || 0) - Number(a.cardValue || 0))
    .slice(0, 2)
    .map(item => item.key)

  return (
    <div className={styles.attributes}>
      {attributes.map(item => (
        <div
          key={item.key}
          className={[
            !item.available ? styles.attributeUnavailable : '',
            hotKeys.includes(item.key) ? styles.attributeHot : ''
          ].filter(Boolean).join(' ')}
        >
          <strong>{formatCardValue(item.cardValue)}</strong>
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  )
}

export default function PlayerShareCard({ model, exportMode = false }) {
  if (!model) return null
  const t = createTranslator(model.locale)
  const artwork = model.visuals.heroArtworkMeta || {}
  const crop = artwork.crop || DEFAULT_SHARE_ARTWORK_CROP
  const ovrLabel = model.score.ovr === null ? '—' : formatCardValue(model.score.ovr)
  const ratedLabel = model.eligibility.eligible
    ? t('playerShare.card.seasonOvr', '赛季能力值')
    : t('playerShare.card.unrated', '未定级')

  return (
    <article
      className={styles.card}
      style={{
        '--role-color': model.visuals.roleColor,
        '--role-color-soft': hexToRgba(model.visuals.roleColor, 0.28),
        '--role-color-faint': hexToRgba(model.visuals.roleColor, 0.14),
        '--art-overlay': crop.overlayStrength ?? DEFAULT_SHARE_ARTWORK_CROP.overlayStrength
      }}
    >
      <div className={styles.backgroundWord} aria-hidden="true">{model.identity.nickname}</div>
      <div className={styles.posterGrid} aria-hidden="true" />
      <div className={styles.roleGlow} aria-hidden="true" />
      <div className={styles.speedLines} aria-hidden="true" />

      <header className={styles.header}>
        <div>
          <span>{t('playerShare.card.headerKicker', 'FRIES CUP STATS')}</span>
          <strong>{model.season.label}</strong>
        </div>
        <div className={styles.roleBadge}>
          <b>{model.identity.role}</b>
          <span>{t('playerShare.card.playerCard', 'PLAYER CARD')}</span>
        </div>
      </header>

      <section className={styles.artworkStage}>
        <HeroArtwork model={model} exportMode={exportMode} />
        <div className={styles.artworkRoleWash} aria-hidden="true" />
        <div className={styles.artworkSideFade} aria-hidden="true" />
        <div className={styles.artworkBottomFade} aria-hidden="true" />
      </section>

      <section className={styles.identityText}>
        <div className={styles.identityKicker}>{t('playerShare.card.identityKicker', 'PLAYER PROFILE')}</div>
        <h1 className={playerNameClass(model.identity.nickname)}>{model.identity.nickname}</h1>
        {model.identity.battleTag ? <p>{model.identity.battleTag}</p> : null}
        <div className={styles.teamLine}>
          <TeamLogo
            seasonId={model.season.code}
            teamShortName={model.identity.teamShortName}
            teamName={model.identity.teamName}
            className={styles.teamLogo}
          />
          <span>
            <strong>{model.identity.teamLine}</strong>
            {model.identity.teamName ? <em>{model.identity.teamName}</em> : null}
          </span>
        </div>
      </section>

      <section className={styles.ovrSpine}>
        <span>OVR</span>
        <strong>{ovrLabel}</strong>
        <em>{ratedLabel}</em>
        <small>{model.eligibility.eligible ? `${model.score.rankLabel} · ${model.score.percentileLabel}` : `${model.footer.timePlayed} / ${model.eligibility.minTimeMins} MIN`}</small>
      </section>

      <section className={styles.highlightPanel}>
        <span>SEASON HIGHLIGHT</span>
        <strong>{model.highlights.primary.title}</strong>
        <small>{model.highlights.primary.detail}</small>
        {model.highlights.secondary ? (
          <em>{model.highlights.secondary.title}</em>
        ) : null}
      </section>

      <AttributeRail attributes={model.attributes} />
      <RadarFingerprint model={model} />

      <footer className={styles.footer}>
        <div>
          <strong>{model.footer.timePlayed}</strong>
          <span>{t('playerShare.card.played', '出场时间')}</span>
        </div>
        <div>
          <strong>{model.footer.mapsPlayed}</strong>
          <span>{t('playerShare.card.maps', '地图数')}</span>
        </div>
        <div>
          <strong>{model.footer.mainHero}</strong>
          <span>{t('playerShare.card.mainHero', '主力英雄')}</span>
        </div>
        <div>
          <strong>{model.footer.team}</strong>
          <span>{t('playerShare.card.currentTeam', '当前队伍')}</span>
        </div>
        <div>
          <strong>{model.footer.updatedAt}</strong>
          <span>{t('playerShare.card.updated', '数据截止')}</span>
        </div>
        <p>{model.footer.disclaimer}</p>
      </footer>
    </article>
  )
}
