import { translateUiText as uiText } from '../../lib/uiText.js'
import { getLocaleParam } from '../../lib/locales.js'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom'
import { DEFAULT_SEASON_ID, getSeasonById, resolveSeasonFromUrl } from '../../config/seasons.js'
import { getDb } from '../../lib/db.js'
import { buildCinemaReviewScenes } from '../../lib/reviewCinema.js'
import { getReviewEntryReturnPath, buildReviewSceneUrl } from '../../lib/reviewNavigation.js'
import { buildBoardingReviewUrl } from '../../lib/reviewBoardingPass.js'
import { getReviewReadiness } from '../../lib/reviewReadiness.js'
import {
  buildPlayerStory,
  buildPersonStory,
  buildStaffStory,
  buildTeamStory,
  buildTournamentStory
} from '../../lib/reviewStoryBuilders.js'
import { generatePosterPng, getFilmStageLabels, getPosterPayload } from '../../lib/reviewPoster.js'
import {
  applyDirectorCutSelection,
  getDirectorCutHeroOptions,
  getDirectorCutSeasonHeroIds,
  getDirectorCutSelection
} from '../../lib/directorCutProfiles.js'
import { buildFriesCupTitle, getReviewStoryPageLabel } from '../../lib/pageTitle.js'
import {
  REVIEW_LOCALES,
  getReviewPosterMeta,
  getStoredReviewLocale,
  localizeReviewScenes,
  normalizeReviewLocale,
  reviewText,
  setStoredReviewLocale
} from '../../lib/reviewLocale.js'
import { adaptReviewText, getLocalizedReviewSeasonProfile, getReviewSeasonProfile, prepareReviewDb } from '../../lib/reviewSeason.js'
import styles from './ReviewStoryPage.module.css'

const DEFAULT_OW_TEAM_LOGO = '/logos/FCR/OW.png'
const DIRECTOR_HERO_ROLE_KEYS = {
  tank: 'directorRoleTank',
  damage: 'directorRoleDamage',
  support: 'directorRoleSupport'
}

const STORY_FRAME_WIDTH = 460
const STORY_FRAME_HEIGHT = 820
const STORY_FRAME_SAFE_GAP = 24

function getViewportStoryScale() {
  if (typeof window === 'undefined') return 1

  const viewport = window.visualViewport
  const width = viewport?.width || window.innerWidth || STORY_FRAME_WIDTH
  const height = viewport?.height || window.innerHeight || STORY_FRAME_HEIGHT
  const compactToolbar = width <= 1049 || height <= 619
  const scale = Math.min(1, (width - STORY_FRAME_SAFE_GAP) / STORY_FRAME_WIDTH,
    compactToolbar ? 1 : (height - STORY_FRAME_SAFE_GAP) / STORY_FRAME_HEIGHT)

  return Number(Math.max(0.1, scale).toFixed(3))
}

function getStoryViewport() {
  return {
    scale: getViewportStoryScale(),
    height: typeof window === 'undefined' ? STORY_FRAME_HEIGHT : window.visualViewport?.height || window.innerHeight,
    top: typeof window === 'undefined' ? 0 : window.visualViewport?.offsetTop || 0
  }
}

function useStoryViewport() {
  const [view, setView] = useState(getStoryViewport)

  useEffect(() => {
    const update = () => setView(previous => {
      const next = getStoryViewport()
      return next.scale === previous.scale && next.height === previous.height && next.top === previous.top ? previous : next
    })
    const viewport = window.visualViewport

    update()
    window.addEventListener('resize', update)
    viewport?.addEventListener('resize', update)
    viewport?.addEventListener('scroll', update)

    return () => {
      window.removeEventListener('resize', update)
      viewport?.removeEventListener('resize', update)
      viewport?.removeEventListener('scroll', update)
    }
  }, [])

  return view
}

function cx(...names) {
  return names.filter(Boolean).join(' ')
}

function StoryControls({ locale, index, isLastScene, isStoryEnding, isWitness, recordNote, onPrevious, onNext, onKeepsake, mobile = false }) {
  return (
    <nav className={cx(styles.storyControls, mobile ? styles.mobileStoryControls : styles.footer)} aria-label={reviewText(locale, 'storyNavigation')}>
      {recordNote ? (
        <details key={index} className={styles.recordNote}>
          <summary>{reviewText(locale, 'recordNote')}</summary>
          <p>{recordNote}</p>
        </details>
      ) : null}
      <div className={styles.storyControlButtons} data-ending={isStoryEnding && !isLastScene ? 'true' : undefined}>
        <button type="button" onClick={onPrevious} disabled={index === 0}>{reviewText(locale, 'prev')}</button>
        {isLastScene || isStoryEnding ? (
          <button type="button" className={styles.posterBtn} onClick={onKeepsake}>
            {reviewText(locale, isWitness ? 'witnessShort' : 'keepsakeShort')}
          </button>
        ) : (
          <button type="button" onClick={onNext}>{reviewText(locale, 'next')}</button>
        )}
        {isStoryEnding && !isLastScene ? <button type="button" onClick={onNext}>{reviewText(locale, 'letterShort')}</button> : null}
      </div>
    </nav>
  )
}

function clampPercent(value) {
  const num = Number(value)
  if (!Number.isFinite(num)) return 0
  return Math.max(0, Math.min(100, num))
}

function handleImageFallback(event, fallback = '') {
  const img = event.currentTarget
  if (!img) return

  if (fallback && img.dataset.fallbackApplied !== 'true') {
    img.dataset.fallbackApplied = 'true'
    img.src = fallback
    return
  }

  img.style.display = 'none'
}

function getCardKey(card, index) {
  return `${card?.title || card?.value || card?.battleTag || 'card'}-${index}`
}

function getArchiveInitials(value, maxLength = 3) {
  const clean = String(value || '').normalize('NFKC').trim()
  if (!clean) return 'FC'

  const words = clean.split(/\s+/).filter(Boolean)
  const mark = words.length > 1
    ? words.map(word => word.slice(0, 1)).join('')
    : clean.replace(/[^\p{L}\p{N}]/gu, '')

  return (mark || clean).slice(0, maxLength).toLocaleUpperCase('en-US')
}

function getFilmRoleLabel(cardKind, fallback = '') {
  if (cardKind === 'caster') return 'BROADCAST TALENT'
  if (cardKind === 'staff') return 'TOURNAMENT OPERATIONS'
  if (cardKind === 'team') return 'TEAM ARCHIVE'
  if (cardKind === 'player') return 'PLAYER ARCHIVE'
  return String(fallback || 'SEASON PARTICIPANT').toLocaleUpperCase('en-US')
}

function SceneStatLines({ lines, limit = 3 }) {
  if (!lines?.length) return null

  return (
    <div className={styles.statLines}>
      {lines.slice(0, limit).map((line, index) => (
        <div key={`${line.label}-${index}`} className={styles.statLine}>
          <div className={styles.statLineValue}>{line.value}</div>
          <div className={styles.statLineLabel}>{line.label}</div>
          {line.sub ? <div className={styles.statLineSub}>{line.sub}</div> : null}
        </div>
      ))}
    </div>
  )
}

function SceneMatchCard({ card, compact = false }) {
  if (!card) return null

  return (
    <div className={cx(styles.matchCard, compact ? styles.matchCardCompact : '')}>
      <div className={styles.matchCardTop}>
        <span>{card.title || 'MATCH MEMORY'}</span>
        {card.result ? <b>{card.result}</b> : null}
      </div>

      <div className={styles.matchTeams}>
        <div className={styles.matchTeam}>{card.left || 'TEAM A'}</div>
        <div className={styles.matchCenter}>
          <span>VS</span>
          {card.score ? <strong>{card.score}</strong> : null}
        </div>
        <div className={styles.matchTeam}>{card.right || 'TEAM B'}</div>
      </div>

      {card.meta ? <div className={styles.matchMeta}>{card.meta}</div> : null}
      {card.opponentMemory ? <div className={styles.matchMemory}>{card.opponentMemory}</div> : null}
      {card.note ? <div className={styles.matchNote}>{card.note}</div> : null}
    </div>
  )
}

function FirstStepArchiveRail({ scene }) {
  const metaParts = String(scene?.matchCard?.meta || '')
    .split('/')
    .map(part => part.trim())
    .filter(Boolean)
  const timecode = metaParts.length > 1 ? metaParts.at(-1) : ''
  const matchCoordinate = metaParts.length > 1
    ? metaParts.slice(0, -1).join(' · ')
    : metaParts[0] || 'PUBLIC RECORD'
  const signal = String(scene?.sceneNo || 1).padStart(2, '0')

  return (
    <div className={styles.firstStepArchiveRail} aria-hidden="true">
      <div className={styles.firstStepArchiveLead}>
        <span>ARCHIVE TIMECODE</span>
        <i />
        <b>{timecode || `SIGNAL ${signal}`}</b>
      </div>

      <div className={styles.firstStepArchiveTail}>
        <span>FIRST ENTRY</span>
        <i />
        <b>{matchCoordinate}</b>
        <em>{signal}</em>
      </div>
    </div>
  )
}

function KeyMatchArchiveLink({ scene }) {
  const signal = String(scene?.sceneNo || 1).padStart(2, '0')
  const coordinate = String(scene?.matchCard?.meta || scene?.chips?.[0] || 'MATCH ARCHIVE')
    .split('/')
    .map(part => part.trim())
    .filter(Boolean)
    .slice(0, 2)
    .join(' · ')

  return (
    <div className={styles.keyMatchArchiveLink} aria-hidden="true">
      <span>RECORDED MOMENT</span>
      <i />
      <b>SIGNAL {signal}</b>
      <small>{coordinate || 'MATCH ARCHIVE'}</small>
    </div>
  )
}

function SceneDataBars({ bars, limit = 5 }) {
  if (!bars?.length) return null

  return (
    <div className={styles.dataBars}>
      {bars.slice(0, limit).map((bar, index) => {
        const score = clampPercent(bar.score ?? bar.value)

        return (
          <div key={`${bar.label}-${index}`} className={styles.dataBar}>
            <div className={styles.dataBarHead}>
              <span>{bar.label}</span>
              <b>{bar.displayValue || bar.value}</b>
            </div>
            <div className={styles.dataBarTrack}>
              <div className={styles.dataBarFill} style={{ width: `${score}%` }} />
            </div>
            {bar.note ? <div className={styles.dataBarNote}>{bar.note}</div> : null}
          </div>
        )
      })}
    </div>
  )
}

function SceneDataComparison({ comparison, locale }) {
  if (!comparison || comparison.kind !== 'role-percentile') return null

  const sampleSize = Number(comparison.sampleSize || 0)
  const minimumMinutes = Number(comparison.minimumMinutes || 0)
  const text = locale === 'ko-KR'
    ? `동일 역할 백분위 · 표본 ${sampleSize}명 · 최소 ${minimumMinutes}분 출전`
    : locale === 'en-US'
      ? `Role percentile · ${sampleSize} players · minimum ${minimumMinutes} minutes`
      : uiText("同位置百分位 · 样本 {0} 人 · 至少出场 {1} 分钟", locale, [sampleSize, minimumMinutes])

  return <div className={styles.dataComparisonNote}>{text}</div>
}

function MiniCardGrid({ title, cards, variant = 'default', limit = 6 }) {
  if (!cards?.length) return null

  return (
    <div className={cx(styles.miniCards, styles[`miniCards_${variant}`])}>
      {title ? <div className={styles.miniCardsTitle}>{title}</div> : null}

      <div className={styles.miniCardsGrid}>
        {cards.slice(0, limit).map((card, index) => {
          const showIdentityFallback = variant !== 'map'
          const showImageFrame = Boolean(card.image) || showIdentityFallback

          return (
            <div key={getCardKey(card, index)} className={styles.miniCard}>
              {showImageFrame ? (
                <div className={styles.miniCardImage}>
                  {showIdentityFallback ? (
                    <span className={styles.miniCardFallback}>{getArchiveInitials(card.title, variant === 'team' ? 3 : 2)}</span>
                  ) : null}
                  {card.image ? (
                    <img
                      src={card.image}
                      alt=""
                      onError={event => handleImageFallback(event)}
                    />
                  ) : null}
                </div>
              ) : null}

              <div className={styles.miniCardText}>
                <strong title={card.battleTag || card.title}>{card.title}</strong>
                {card.value ? <b>{card.value}</b> : null}
                {card.meta ? <span>{card.meta}</span> : null}
                {card.sub ? <em>{card.sub}</em> : null}
                {card.note ? <p>{card.note}</p> : null}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SceneRosterGrid({ cards, title = 'ROSTER' }) {
  if (!cards?.length) return null

  return (
    <div className={styles.rosterGrid}>
      {title ? <div className={styles.rosterGridTitle}>{title}</div> : null}

      <div className={styles.rosterGridList}>
        {cards.slice(0, 9).map((card, index) => (
          <div key={getCardKey(card, index)} className={styles.rosterPlayerCard}>
            <div className={styles.rosterHero}>
              <span>{getArchiveInitials(card.title, 2)}</span>
              {card.image ? (
                <img
                  src={card.image}
                  alt=""
                  onError={event => handleImageFallback(event)}
                />
              ) : null}
            </div>

            <div className={styles.rosterPlayerInfo}>
              <strong>{card.title || 'UNKNOWN PLAYER'}</strong>
              {card.battleTag || card.tag || card.sub ? (
                <span>{card.battleTag || card.tag || card.sub}</span>
              ) : null}
              <p>
                {[card.meta, card.value, card.note].filter(Boolean).join(' · ')}
              </p>
              {card.heroes?.length ? (
                <div className={styles.rosterHeroTags}>
                  {card.heroes.slice(0, 3).map(hero => <em key={hero}>{hero}</em>)}
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function SceneTimeline({ items, limit = 5 }) {
  if (!items?.length) return null

  return (
    <div className={styles.timeline}>
      {items.slice(0, limit).map((item, index) => (
        <div key={`${item.label}-${index}`} className={styles.timelineItem}>
          <div className={styles.timelineDot}></div>
          <div className={styles.timelineLabel}>{item.label}</div>
          <div className={styles.timelineValue}>{item.value}</div>
          {item.meta ? <div className={styles.timelineMeta}>{item.meta}</div> : null}
        </div>
      ))}
    </div>
  )
}

function SceneStoryQuote({ quote }) {
  if (!quote?.title && !quote?.body) return null

  return (
    <div className={styles.storyQuote}>
      {quote.title ? <strong>{quote.title}</strong> : null}
      {quote.body ? <span>{quote.body}</span> : null}
    </div>
  )
}

function SceneEvidenceStamp({ tags, locale }) {
  if (!tags?.length) return null

  const label = locale === 'ko-KR'
    ? '기록 근거'
    : locale === 'en-US'
      ? 'ARCHIVE BASIS'
      : uiText("档案依据", locale)

  return (
    <div className={styles.evidenceStamp} aria-label={`${label}：${tags.join('、')}`}>
      <span>{label}</span>
      <i aria-hidden="true" />
      <b>{tags.slice(0, 2).join(' · ')}</b>
    </div>
  )
}

function SceneClosingMark({ locale }) {
  const copy = locale === 'ko-KR'
    ? ['시즌 기록 완료', '기억은 여기서 끝나지 않습니다']
    : locale === 'en-US'
      ? ['SEASON RECORD COMPLETE', 'THE MEMORY DOES NOT END HERE']
      : [uiText("赛季记录完成", locale), uiText("但记忆不会停在这里", locale)]

  return (
    <div className={styles.closingMark}>
      <span>{copy[0]}</span>
      <i aria-hidden="true" />
      <b>{copy[1]}</b>
    </div>
  )
}

function QuietFrameTrace({ scene, totalScenes }) {
  const words = (scene.backgroundWords || []).filter(Boolean)
  const leadWord = words[0] || 'BREATHE'
  const memoryWord = words.at(-1) || 'REMEMBER'
  const trailWords = words.slice(1, 3)

  return (
    <div className={styles.quietFrameTrace} aria-hidden="true">
      <div className={styles.quietFrameTraceTop}>
        <span>FRAME HOLD</span>
        <i />
        <b>{String(scene.sceneNo || 1).padStart(2, '0')} / {totalScenes}</b>
      </div>

      <div className={styles.quietFrameTraceAxis}>
        <span>{leadWord}</span>
        <i><b /></i>
        <strong>{memoryWord}</strong>
      </div>

      <div className={styles.quietFrameTraceBottom}>
        <span>SEASON MEMORY / 2026</span>
        <div>
          {trailWords.map((word, index) => <b key={`${word}-${index}`}>{word}</b>)}
        </div>
      </div>
    </div>
  )
}

function QuietMemoryCoordinates({ items }) {
  const coordinates = (items || []).filter(item => item?.value).slice(0, 3)
  if (!coordinates.length) return null

  return (
    <section className={styles.quietMemoryCoordinates} aria-label="Memory coordinates">
      <div className={styles.quietMemoryCoordinatesHead}>
        <span>MEMORY COORDINATES</span>
        <i aria-hidden="true" />
      </div>
      <div className={styles.quietMemoryCoordinatesGrid}>
        {coordinates.map((item, index) => (
          <div key={`${item.label}-${index}`} className={styles.quietMemoryCoordinate}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            {item.meta ? <small>{item.meta}</small> : null}
          </div>
        ))}
      </div>
    </section>
  )
}

function FinalArchiveBridge({ scene }) {
  return (
    <div className={styles.finalArchiveBridge} aria-hidden="true">
      <span>SEASON ENTRY</span>
      <i><b /></i>
      <strong>{scene.archiveBridgeLabel || scene.metric || 'FINAL ARCHIVE'}</strong>
    </div>
  )
}

function WitnessMemoryLedger({ items, prompt, locale, viewerId, onViewerIdChange }) {
  const entries = (items || []).filter(item => item?.value).slice(0, 3)
  if (!entries.length && !prompt) return null

  const signatureLabel = locale === 'ko-KR'
    ? '관람객 배틀태그 / 닉네임'
    : locale === 'en-US'
      ? 'Viewer BattleTag / nickname'
      : uiText("观众 BattleTag / 昵称", locale)
  const signaturePlaceholder = locale === 'ko-KR'
    ? '닉네임 또는 BattleTag'
    : locale === 'en-US'
      ? 'Nickname or BattleTag'
      : uiText("昵称或 BattleTag", locale)

  return (
    <section className={styles.witnessMemoryLedger} aria-label={uiText('赛事见证档案', locale)}>
      {entries.length ? (
        <div className={styles.witnessMemoryStats}>
          {entries.map((item, index) => (
            <div key={`${item.label}-${index}`} className={styles.witnessMemoryStat}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              {item.meta ? <small>{item.meta}</small> : null}
            </div>
          ))}
        </div>
      ) : null}

      {prompt ? (
        <div className={styles.witnessMemoryPrompt}>
          <div className={styles.witnessMemoryPromptCopy}>
            <span>{prompt.label || 'YOUR FRAME'}</span>
            <strong>{prompt.title}</strong>
            {prompt.body ? <p>{prompt.body}</p> : null}
          </div>
          <div className={styles.witnessMemorySignature} onTouchStart={event => event.stopPropagation()} onTouchEnd={event => event.stopPropagation()}>
            <label htmlFor="witness-signature-input">{signatureLabel}</label>
            <input
              id="witness-signature-input"
              value={viewerId}
              onChange={event => onViewerIdChange?.(event.target.value)}
              placeholder={signaturePlaceholder}
              maxLength={64}
              autoComplete="off"
              spellCheck="false"
            />
            <b>FCR26 / ARCHIVE COPY</b>
          </div>
        </div>
      ) : null}
    </section>
  )
}

function SceneBody({ body }) {
  if (!body) return null
  return <p className={styles.sceneBody}>{body}</p>
}

function OrganizerLetterBody({ body }) {
  if (!body) return null

  const paragraphs = String(body)
    .split(/\n{2,}/)
    .map(paragraph => paragraph.trim())
    .filter(Boolean)
  const signatureLines = (paragraphs.at(-1) || '')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
  const hasSignature = paragraphs.length > 1 && signatureLines.length <= 3
  const letterParagraphs = hasSignature ? paragraphs.slice(0, -1) : paragraphs

  return (
    <div className={styles.organizerLetterBody}>
      {letterParagraphs.map((paragraph, index) => (
        <p
          key={`${paragraph.slice(0, 24)}-${index}`}
          className={index === 0 ? styles.organizerLetterLead : ''}
        >
          {paragraph}
        </p>
      ))}

      {hasSignature ? (
        <div className={styles.organizerSignature}>
          <strong>{signatureLines[0]}</strong>
          <span>{signatureLines.slice(1).join(' · ')}</span>
        </div>
      ) : null}
    </div>
  )
}

function ScenePartnerGroups({ groups, fallbackCards }) {
  const normalizedGroups = (groups?.length
    ? groups
    : fallbackCards?.length
      ? [{ title: 'PARTNERS', cards: fallbackCards }]
      : []
  ).filter(group => group?.cards?.length)

  if (!normalizedGroups.length) return null

  return (
    <div className={styles.partnerGroups}>
      {normalizedGroups.slice(0, 2).map((group, index) => (
        <MiniCardGrid
          key={`${group.title || 'PARTNERS'}-${index}`}
          title={group.title || 'PARTNERS'}
          cards={group.cards}
          variant={group.variant || (index === 0 ? 'partner' : 'crossPartner')}
          limit={group.limit || 6}
        />
      ))}
    </div>
  )
}

function ScenePeakDetails({ scene }) {
  if (!scene.metric && !scene.matchCard) return null

  return (
    <div className={styles.peakDetails}>
      {scene.metric ? (
        <div className={styles.peakMetricMini}>
          <strong>{scene.metric}</strong>
          <span>{scene.metricLabel || scene.peak?.label || 'PEAK MOMENT'}</span>
        </div>
      ) : null}

      {scene.matchCard ? <SceneMatchCard card={scene.matchCard} compact /> : null}
    </div>
  )
}

function SceneInlineData({ scene, visualType, locale }) {
  const shouldShowDataBars = scene.dataBars?.length && (visualType === 'roleMemory' || visualType === 'archive')
  if (!shouldShowDataBars) return null

  return (
    <div className={styles.inlineDataBlock}>
      <SceneDataBars bars={scene.dataBars} />
      <SceneDataComparison comparison={scene.dataComparison} locale={locale} />
    </div>
  )
}

function SceneStoryLayer({ scene, visualType }) {
  const isCoverLike = visualType === 'cover' || visualType === 'final' || visualType === 'spotlight' || visualType === 'organizer'
  const isRoleLike = visualType === 'roleMemory'
  const isArchiveLike = visualType === 'archive'
  const isMapSummary = visualType === 'dataImpact' && scene.mapCards?.length
  const isPeak = visualType === 'peakHighlight'
  const isPartners = visualType === 'partners' || Boolean(scene.partnerGroups?.length || scene.crossPartnerCards?.length)
  const isPlayoffs = visualType === 'playoffs'
  const isRosterPage = visualType === 'roster' || Boolean(scene.rosterCards?.length)

  const showMatchCard = Boolean(scene.matchCard) && !isPeak
  const showTimeline = Boolean(scene.timeline?.length) && !isCoverLike
  const showMapCards = Boolean(scene.mapCards?.length) && !isCoverLike
  const showTeamCards = Boolean(scene.teamCards?.length) && !isCoverLike
  const showPartnerCards = Boolean(scene.partnerCards?.length || scene.partnerGroups?.length || scene.crossPartnerCards?.length) && !isCoverLike
  const showRosterCards = Boolean(scene.rosterCards?.length) && !isCoverLike
  const showPlayerCards = Boolean(scene.playerCards?.length) && !isCoverLike
  const showDataBars = Boolean(scene.dataBars?.length) && !isCoverLike && !isRoleLike && !isArchiveLike && !isMapSummary
  const showPeakDetails = isPeak && Boolean(scene.metric || scene.matchCard)

  const hasLayerContent = showMatchCard || showTimeline || showMapCards || showTeamCards || showPartnerCards || showRosterCards || showPlayerCards || showDataBars || showPeakDetails
  if (!hasLayerContent) return null

  return (
    <div
      className={cx(
        styles.sceneStoryLayer,
        isRosterPage ? styles.sceneStoryLayerRoster : '',
        isMapSummary || visualType === 'mapMemory' ? styles.sceneStoryLayerMap : '',
        isPeak ? styles.sceneStoryLayerPeak : '',
        isPartners ? styles.sceneStoryLayerPartners : '',
        isPlayoffs ? styles.sceneStoryLayerPlayoffs : ''
      )}
    >
      {showMatchCard ? <SceneMatchCard card={scene.matchCard} /> : null}
      {showPeakDetails ? <ScenePeakDetails scene={scene} /> : null}

      {showTimeline ? <SceneTimeline items={scene.timeline} /> : null}

      {showMapCards ? <MiniCardGrid title="MAP MEMORY" cards={scene.mapCards} variant="map" limit={3} /> : null}

      {showDataBars ? <SceneDataBars bars={scene.dataBars} /> : null}

      {showTeamCards ? (
        <MiniCardGrid
          title={isPlayoffs ? 'PLAYOFFS' : ''}
          cards={scene.teamCards}
          variant="team"
          limit={isPlayoffs ? 8 : 6}
        />
      ) : null}

      {showPartnerCards ? <ScenePartnerGroups groups={scene.partnerGroups} fallbackCards={scene.partnerCards || scene.crossPartnerCards} /> : null}
      {showPlayerCards ? <MiniCardGrid title="PLAYERS REMEMBERED" cards={scene.playerCards} variant="player" limit={6} /> : null}
      {showRosterCards ? <SceneRosterGrid cards={scene.rosterCards} title={scene.rosterTitle || 'ROSTER'} /> : null}
    </div>
  )
}

function getArchiveModeLabel(scene) {
  const visualType = scene?.visualType || ''

  if (visualType === 'cover') return 'ARCHIVE OPEN'
  if (visualType === 'organizer') return 'PERSONAL LETTER'
  if (visualType === 'pause') return 'QUIET FRAME'
  if (visualType === 'playoffs') return 'ROUTE MANIFEST'
  if (visualType === 'keyMatch') return 'MATCH SIGNAL'
  if (visualType === 'mapMemory') return 'MAP MEMORY'
  if (visualType === 'dataImpact') return 'DATA MEMORY'
  if (visualType === 'partners') return 'CREW MEMORY'
  if (visualType === 'playersRemembered') return 'PLAYER MEMORY'
  if (visualType === 'final') return 'FINAL RECORD'

  return 'SEASON MEMORY'
}

function PlayerCoverArchive({ scene }) {
  const stats = (scene.coverStats || []).slice(0, 3)
  const hasHero = Boolean(scene.coverHeroImage)
  const teamLogo = scene.coverTeamLogo || scene.image || DEFAULT_OW_TEAM_LOGO

  return (
    <div className={cx(styles.coverArchive, hasHero ? styles.coverArchiveHasHero : styles.coverArchiveTeamOnly)}>
      <div className={styles.coverArchiveMeta}>
        <span>PLAYER DOSSIER</span>
        <b>{scene.seasonMark || 'SEASON ARCHIVE'}</b>
      </div>

      <div className={styles.coverArchiveStage}>
        <div className={styles.coverArchiveTarget} aria-hidden="true"><i /><i /></div>
        {hasHero ? (
          <img
            className={styles.coverArchiveHero}
            src={scene.coverHeroImage}
            alt=""
            onError={event => handleImageFallback(event, scene.coverHeroPortrait)}
          />
        ) : (
          <img
            className={styles.coverArchiveFallbackLogo}
            src={teamLogo}
            alt=""
            onError={event => handleImageFallback(event, DEFAULT_OW_TEAM_LOGO)}
          />
        )}

        <div className={styles.coverArchiveFocus}>
          <span>{hasHero ? 'SIGNATURE HERO' : 'PLAYER ROLE'}</span>
          <strong>{scene.coverHeroName || scene.coverRole || 'SEASON PLAYER'}</strong>
        </div>

        <div className={styles.coverArchiveCrest}>
          <img
            src={teamLogo}
            alt=""
            onError={event => handleImageFallback(event, DEFAULT_OW_TEAM_LOGO)}
          />
          <span>
            <b>{scene.coverTeam || 'TEAM ARCHIVE'}</b>
            <small>TEAM CREST</small>
          </span>
        </div>
      </div>

      <div className={styles.coverArchiveStats}>
        {stats.map((stat, index) => (
          <div key={`${stat.label}-${index}`}>
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
          </div>
        ))}
      </div>
    </div>
  )
}

function StoryScene({ scene, sceneKey, locale, direction, totalScenes, viewerId, onViewerIdChange }) {
  const visualType = scene.visualType || 'default'
  const hasInlineDataBars = Boolean(scene.dataBars?.length) && (
    visualType === 'roleMemory' || visualType === 'archive'
  )
  const hasStoryLayer = Boolean(
    scene.matchCard ||
    scene.timeline?.length ||
    scene.mapCards?.length ||
    scene.teamCards?.length ||
    scene.partnerCards?.length ||
    scene.partnerGroups?.length ||
    scene.crossPartnerCards?.length ||
    scene.rosterCards?.length ||
    scene.playerCards?.length ||
    (scene.dataBars?.length && !hasInlineDataBars) ||
    (visualType === 'peakHighlight' && scene.metric)
  )

  const className = [
    styles.scene,
    styles[`kind_${scene.kind}`],
    styles[`tone_${scene.tone || 'gold'}`],
    styles[`visual_${visualType}`],
    scene.finalLayout ? styles[`finalLayout_${scene.finalLayout}`] : '',
    hasStoryLayer ? styles.sceneHasLayer : '',
    direction === 'backward' ? styles.sceneBackward : styles.sceneForward,
    visualType === 'final' || visualType === 'organizer' ? styles.sceneClosing : '',
    scene.witnessStats?.length || scene.witnessPrompt ? styles.sceneWitness : '',
    scene.title && String(scene.title).length >= 24 ? styles.sceneLongTitle : '',
    scene.title && String(scene.title).length >= 38 ? styles.sceneExtraLongTitle : ''
  ].filter(Boolean).join(' ')

  if (visualType === 'actTitle') {
    return (
      <div key={sceneKey} className={className} data-act-watermark={`ACT ${scene.actNo}`}>
        <div className={styles.sceneNoise}></div>
        <div className={styles.actProjectorBeam} aria-hidden="true"></div>
        <div className={styles.actFilmRail} aria-hidden="true">
          {Array.from({ length: 12 }, (_, index) => <i key={index} />)}
        </div>

        <div className={styles.actSlate}>
          <div className={styles.actSlateTop}>
            <span>{scene.actCode}</span>
            <b>{scene.seasonMark || 'SEASON ARCHIVE'} / SEASON PICTURE</b>
          </div>

          <div className={styles.actNumber}>ACT {scene.actNo}</div>
          <div className={styles.actTitleRule} aria-hidden="true"><i /></div>
          <div className={styles.actEyebrow}>{scene.eyebrow}</div>
          <h1>{scene.title}</h1>
          <div className={styles.actSubTitle}>{scene.subTitle}</div>
          <p>{scene.body}</p>

          <div className={styles.actStages}>
            {(scene.stages || []).map(stage => <span key={stage}>{stage}</span>)}
          </div>

          <div className={styles.actCue}>
            <i aria-hidden="true" />
            <span>{scene.cue}</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div key={sceneKey} className={className}>
      <div className={styles.sceneNoise}></div>
      <div className={styles.sceneDecor}></div>
      <div className={styles.sceneOrbit}></div>

      <div className={styles.officialMark}>
        <span className={styles.signalIndex}>SIGNAL {String(scene.sceneNo || 1).padStart(2, '0')}</span>
        <i />
        <span>{scene.badge || 'SEASON ARCHIVE'}</span>
      </div>

      {visualType !== 'organizer' ? (
        <>
          <SceneEvidenceStamp tags={scene.evidenceTags} locale={locale} />

          <div className={styles.sceneMode} aria-hidden="true">
            <span>{getArchiveModeLabel(scene)}</span>
            <b>{String(scene.sceneNo || 1).padStart(2, '0')}</b>
          </div>
        </>
      ) : null}

      {scene.watermark ? <div className={styles.watermark}>{scene.watermark}</div> : null}

      {scene.backgroundWords?.length ? (
        <div className={styles.backgroundWords}>
          {scene.backgroundWords.slice(0, 8).map((word, index) => (
            <span key={`${word}-${index}`}>{word}</span>
          ))}
        </div>
      ) : null}

      {scene.mapImage ? (
        <div className={styles.mapBackdrop}>
          <img
            src={scene.mapImage}
            alt=""
            onError={event => handleImageFallback(event)}
          />
        </div>
      ) : null}

      {visualType === 'cover' && scene.coverLayout === 'player' ? (
        <PlayerCoverArchive scene={scene} />
      ) : scene.images?.length ? (
        <div className={styles.visualGallery}>
          {scene.images.slice(0, 4).map((item, index) => (
            <div
              key={`${item.title || item.src}-${index}`}
              className={`${styles.galleryItem} ${index === 0 ? styles.galleryItemPrimary : ''}`}
            >
              {item.src ? (
                <img
                  src={item.src}
                  alt=""
                  onError={event => handleImageFallback(event)}
                />
              ) : null}
              <div className={styles.galleryCaption}>
                <strong>{item.title}</strong>
                <span>{item.meta}</span>
              </div>
            </div>
          ))}
        </div>
      ) : scene.image || scene.visualFallback ? (
        <div className={cx(styles.visual, !scene.image && styles.visualFallbackOnly)}>
          {scene.visualFallback ? (
            <div className={styles.visualFallback} aria-hidden="true">
              <strong>{scene.visualFallback}</strong>
              {scene.visualFallbackLabel ? <span>{scene.visualFallbackLabel}</span> : null}
            </div>
          ) : null}
          {scene.image ? (
            <img
              src={scene.image}
              alt=""
              onError={event => handleImageFallback(event, scene.imageFallback)}
            />
          ) : null}
        </div>
      ) : null}

      {visualType === 'firstStep' ? <FirstStepArchiveRail scene={scene} /> : null}

      <SceneStoryLayer scene={scene} visualType={visualType} />

      {visualType === 'keyMatch' && hasStoryLayer ? <KeyMatchArchiveLink scene={scene} /> : null}

      {visualType === 'pause' ? <QuietFrameTrace scene={scene} totalScenes={totalScenes} /> : null}

      <div className={styles.sceneText}>
        <div className={styles.eyebrow}>{scene.eyebrow}</div>
        <h1>{scene.title}</h1>

        {scene.subTitle ? (
          <div className={styles.sceneSubTitle}>{scene.subTitle}</div>
        ) : null}

        {visualType === 'organizer'
          ? <OrganizerLetterBody body={scene.body} />
          : <SceneBody body={scene.body} />}

        {scene.witnessStats?.length || scene.witnessPrompt ? (
          <WitnessMemoryLedger
            items={scene.witnessStats}
            prompt={scene.witnessPrompt}
            locale={locale}
            viewerId={viewerId}
            onViewerIdChange={onViewerIdChange}
          />
        ) : null}

        <SceneInlineData scene={scene} visualType={visualType} locale={locale} />

        {visualType === 'final' ? <FinalArchiveBridge scene={scene} /> : null}

        <SceneStoryQuote quote={scene.storyQuote} />

        {visualType === 'pause' ? <QuietMemoryCoordinates items={scene.memoryCoordinates} /> : null}

        {scene.metric && visualType !== 'peakHighlight' ? (
          <div className={styles.metricBlock}>
            <div className={styles.metricValue}>{scene.metric}</div>
            <div className={styles.metricLabel}>{scene.metricLabel}</div>
          </div>
        ) : null}

        <SceneStatLines lines={scene.statLines} />

        {scene.chips?.length ? (
          <div className={styles.chips}>
            {scene.chips.slice(0, 12).map((chip, index) => (
              <span key={`${chip}-${index}`}>{chip}</span>
            ))}
          </div>
        ) : null}

        {scene.kind === 'ending' ? <SceneClosingMark locale={locale} /> : null}
      </div>
    </div>
  )
}

function cleanPosterSubject(value) {
  const raw = String(value || '').trim()

  return raw
    .replace(/，这是你的学院赛.*$/g, '')
    .replace(/, 这是你的学院赛.*$/g, '')
    .replace(/，这是你的常规赛.*$/g, '')
    .replace(/, 这是你的常规赛.*$/g, '')
    .replace(/，这几张地图也属于你.*$/g, '')
    .replace(/, 这几张地图也属于你.*$/g, '')
    .replace(/，这一页也为你留下.*$/g, '')
    .replace(/, 这一页也为你留下.*$/g, '')
    .replace(/\s*的赛季旅程.*$/g, '')
    .replace(/\s*的赛季回顾.*$/g, '')
    .replace(/\s*的学院赛纪念卡.*$/g, '')
    .replace(/\s*的常规赛纪念卡.*$/g, '')
    .replace(/\s*的赛事纪念卡.*$/g, '')
    .replace(/\s*的赛季纪念卡.*$/g, '')
    .trim()
}

function uniqPosterChips(list) {
  const seen = new Set()

  return list
    .filter(Boolean)
    .map(item => String(item).trim())
    .filter(Boolean)
    .filter(item => {
      const key = item.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}

function normalizePosterKind(value) {
  const raw = String(value || '').trim().toLowerCase()
  if (!raw) return ''

  if (raw === 'managercoach' || raw === 'manager-coach' || raw === 'manager_coach' || raw.includes('经理/教练') || raw.includes('经理 / 教练')) return 'managerCoach'
  if (raw === 'manager' || raw.includes('经理')) return 'manager'
  if (raw === 'coach' || raw.includes('教练')) return 'coach'
  if (raw === 'staff' || raw === 'admin' || raw === 'referee' || raw === 'observer' || raw.includes('赛管') || raw.includes('裁判') || raw.includes('导播')) return 'staff'
  if (raw === 'caster' || raw === 'commentator' || raw.includes('解说')) return 'caster'
  if (raw === 'tournament' || raw.includes('观众') || raw.includes('赛事总回顾')) return 'tournament'
  if (raw === 'team' || raw.includes('队伍')) return 'team'
  if (raw === 'player' || raw.includes('选手')) return 'player'

  return ''
}

function inferPosterKindFromPage({ storyType, perspective, staffType, scenes, base }) {
  const normalizedStoryType = String(storyType || '').trim().toLowerCase()
  const normalizedPerspective = String(perspective || '').trim().toLowerCase()
  const normalizedStaffType = String(staffType || '').trim().toLowerCase()

  if (normalizedStoryType === 'player') return 'player'

  if (normalizedStoryType === 'team') {
    if (normalizedPerspective === 'manager-coach') return 'managerCoach'
    if (normalizedPerspective === 'manager') return 'manager'
    if (normalizedPerspective === 'coach') return 'coach'
    return 'team'
  }

  if (normalizedStoryType === 'staff') {
    return normalizedStaffType === 'caster' || normalizedStaffType === 'commentator' ? 'caster' : 'staff'
  }

  if (normalizedStoryType === 'tournament') return 'tournament'

  const first = safeArrForPoster(scenes)[0] || {}
  const explicitKind = normalizePosterKind(
    first.posterCardKind ||
    first.poster_card_kind ||
    first.cardKind ||
    first.card_kind ||
    base?.cardKind ||
    ''
  )
  if (explicitKind) return explicitKind

  const text = [
    normalizedStaffType,
    normalizedPerspective,
    base?.cardType,
    ...safeArrForPoster(scenes).map(scene => [
      scene?.eyebrow,
      scene?.badge,
      scene?.title,
      scene?.subTitle,
      scene?.identityClass,
      scene?.identity_class,
      ...(Array.isArray(scene?.chips) ? scene.chips : [])
    ].filter(Boolean).join(' '))
  ].filter(Boolean).join(' ').toLowerCase()

  if (text.includes('经理 / 教练') || text.includes('经理/教练') || text.includes('manager / coach')) return 'managerCoach'
  if (text.includes('manager') || text.includes('经理')) return 'manager'
  if (text.includes('coach') || text.includes('教练')) return 'coach'
  if (text.includes('staff') || text.includes('admin') || text.includes('赛管') || text.includes('裁判') || text.includes('导播')) return 'staff'
  if (text.includes('caster') || text.includes('commentator') || text.includes('voice') || text.includes('解说')) return 'caster'
  if (text.includes('tournament') || text.includes('赛事总回顾') || text.includes('观众')) return 'tournament'

  return 'player'
}

function safeArrForPoster(value) {
  return Array.isArray(value) ? value : []
}

const POSTER_COPY = {
  player: {
    title: subject => subject ? `${subject} 的学院赛纪念卡` : '我的学院赛纪念卡',
    roleChip: '选手纪念卡',
    signatureTitle: '你曾在这届学院赛留下自己的地图',
    mainText: subject => `比赛会结束，赛程也会归档。但这张卡记住的是：${subject || '你'} 曾经站进这届学院赛，在地图、队友、对手和结果之间，留下属于自己的参赛痕迹。`
  },
  team: {
    title: subject => subject ? `${subject} 的赛季纪念卡` : '队伍赛季纪念卡',
    roleChip: '队伍纪念卡',
    signatureTitle: '你们共同完成了这一段赛季',
    mainText: subject => `比赛会结束，赛程也会归档。但这张卡记住的是：${subject || '这支队伍'} 曾经进入这届学院赛，经历对阵、地图、胜负和等待，成为这个赛季的一部分。`
  },
  manager: {
    title: subject => subject ? `${subject} 的经理纪念卡` : '经理赛季纪念卡',
    roleChip: '经理纪念卡',
    signatureTitle: '你把队伍带进了这段赛季',
    mainText: subject => `比赛会结束，赛程也会归档。但这张卡记住的是：你曾让 ${subject || '这支队伍'} 站上赛场，完成报名、沟通、等待和每一场比赛前后的确认。`
  },
  coach: {
    title: subject => subject ? `${subject} 的教练纪念卡` : '教练赛季纪念卡',
    roleChip: '教练纪念卡',
    signatureTitle: '你参与了队伍的准备与调整',
    mainText: subject => `比赛会结束，赛程也会归档。但这张卡记住的是：你曾陪 ${subject || '这支队伍'} 准备下一场比赛，复盘、调整阵容，把每一次胜负继续带到下一张地图。`
  },
  managerCoach: {
    title: subject => subject ? `${subject} 的双重身份纪念卡` : '经理 / 教练纪念卡',
    roleChip: '经理 / 教练',
    signatureTitle: '你既组织队伍，也决定阵容',
    mainText: subject => `比赛会结束，赛程也会归档。但这张卡记住的是：你既让 ${subject || '这支队伍'} 站上赛场，也陪它准备下一场比赛。组织、沟通、复盘和调整，都曾压在同一个身份里。`
  },
  staff: {
    title: subject => subject ? `${subject} 的赛事纪念卡` : '赛管赛事纪念卡',
    roleChip: '赛管纪念卡',
    signatureTitle: '幕后，也有被记住的痕迹',
    mainText: () => '比赛会结束，赛程也会归档。但这张卡记住的是：你曾在幕后确认流程、记录结果、处理等待，让比赛能够开始、能够结束，也能够被归档。'
  },
  caster: {
    title: subject => subject ? `${subject} 的解说纪念卡` : '解说赛事纪念卡',
    roleChip: '解说纪念卡',
    signatureTitle: '你的声音，留在了赛季里',
    mainText: () => '比赛会结束，赛程也会归档。但这张卡记住的是：你的声音曾陪观众看见团战、反打、暂停与结局，也让一些比赛瞬间被讲述出来。'
  },
  tournament: {
    title: subject => subject ? `${subject} 的观众票` : '2026 薯条杯学院赛观众票',
    roleChip: '观众票',
    signatureTitle: '这张票签发给见证过这届比赛的人',
    mainText: subject => `比赛会结束，赛程也会归档。但这张观众票记住的是：${subject || '你'} 曾经看见这届薯条杯学院赛，也成为这段共同记忆的一部分。`
  }
}

function getPosterCopy(kind, locale) {
  if (locale !== 'en-US' && locale !== 'ko-KR') {
    return POSTER_COPY[kind] || POSTER_COPY.player
  }

  const isKo = locale === 'ko-KR'
  const labels = isKo
    ? {
      player: ['선수 기념 티켓', '선수 시즌 기념 티켓', '당신만의 전장을 이 시즌에 남겼습니다'],
      team: ['팀 기념 티켓', '팀 시즌 기념 티켓', '여러분은 이 시즌을 함께 완성했습니다'],
      manager: ['매니저 기념 티켓', '매니저 시즌 기념 티켓', '당신은 팀을 이 시즌으로 데려왔습니다'],
      coach: ['코치 기념 티켓', '코치 시즌 기념 티켓', '팀의 준비와 조정을 함께했습니다'],
      managerCoach: ['매니저 / 코치', '듀얼 역할 기념 티켓', '팀을 조직하고 로스터의 모양을 함께 만들었습니다'],
      staff: ['운영 스태프 기념 티켓', '대회 운영 기념 티켓', '경기 뒤의 일도 기억될 가치가 있습니다'],
      caster: ['중계진 기념 티켓', '중계 시즌 기념 티켓', '당신의 목소리가 시즌 안에 남았습니다'],
      tournament: ['목격자 티켓', '프라이즈 컵 2026 목격자 티켓', '이 시즌을 함께 본 사람에게 발급합니다']
    }
    : {
      player: ['Player keepsake', 'Player season keepsake', 'You left your own maps in this season'],
      team: ['Team keepsake', 'Team season keepsake', 'You completed this season together'],
      manager: ['Manager keepsake', 'Manager season keepsake', 'You helped bring a team into this season'],
      coach: ['Coach keepsake', 'Coach season keepsake', 'You shared the preparation and adjustments'],
      managerCoach: ['Manager / coach', 'Dual-role keepsake', 'You organized the team and helped shape the lineup'],
      staff: ['Operations keepsake', 'Event operations keepsake', 'The work behind the match deserves to be remembered'],
      caster: ['Caster keepsake', 'Broadcast season keepsake', 'Your voice remains inside the season'],
      tournament: ['Witness ticket', 'Fries Cup 2026 witness ticket', 'Issued to someone who witnessed this season']
    }

  const row = labels[kind] || labels.player
  const genericBody = isKo
    ? '경기는 끝나고 일정은 아카이브가 됩니다. 이 티켓은 당신이 시즌 안에 남긴 시간과 마음, 그리고 함께한 사람들의 기억을 간직합니다.'
    : 'Matches end and schedules become archives. This ticket keeps the time, care, and people that made your part of the season real.'

  return {
    title: subject => subject ? subject + (isKo ? '의 ' : ' — ') + row[1] : row[1],
    roleChip: row[0],
    signatureTitle: row[2],
    mainText: subject => subject
      ? genericBody + (isKo ? ' 발급 대상: ' : ' Issued to: ') + subject + '.'
      : genericBody
  }
}

function buildReviewPosterPayload(scenes, context = {}) {
  const list = safeArrForPoster(scenes)
  const viewerId = String(context.viewerId || '').trim()
  const viewerName = viewerId.replace(/#\d+$/g, '').trim()
  const preKind = inferPosterKindFromPage({
    ...context,
    scenes: list,
    base: {}
  })

  const posterScenes = list.map((scene, index) => {
    if (index !== 0) return scene

    const viewerFields = preKind === 'tournament'
      ? {
        viewerId,
        viewer_id: viewerId,
        viewerBattleTag: viewerId,
        viewer_battle_tag: viewerId,
        viewerName,
        viewer_name: viewerName,
        issuedTo: viewerId || scene.issuedTo || scene.issued_to || 'SEASON WITNESS',
        issued_to: viewerId || scene.issuedTo || scene.issued_to || 'SEASON WITNESS',
        callsign: viewerName || scene.callsign || scene.callSign || (context.locale === 'ko-KR' ? '함께한 목격자' : context.locale === 'en-US' ? 'Season witness' : '共同见证者'),
        callSign: viewerName || scene.callsign || scene.callSign || (context.locale === 'ko-KR' ? '함께한 목격자' : context.locale === 'en-US' ? 'Season witness' : '共同见证者')
      }
      : {}

    return {
      ...scene,
      ...viewerFields,
      cardKind: preKind,
      card_kind: preKind,
      posterCardKind: preKind,
      poster_card_kind: preKind,
      storyType: context.storyType,
      story_type: context.storyType,
      perspective: context.perspective,
      staffType: context.staffType,
      staff_type: context.staffType
    }
  })

  const base = getPosterPayload(posterScenes)
  const first = posterScenes[0] || {}
  const kind = preKind || inferPosterKindFromPage({ ...context, scenes: posterScenes, base })
  const copy = getPosterCopy(kind, context.locale)
  const posterStoryScenes = posterScenes.filter(scene => !scene?.excludeFromPoster)
  const emotionalEnding = [...posterStoryScenes].reverse().find(scene => scene.kind === 'ending') || posterStoryScenes[posterStoryScenes.length - 1] || first

  const subject = viewerId
    || first.callsign
    || first.displayName
    || first.display_name
    || first.teamShortName
    || first.team_short_name
    || (context.storyType === 'player' ? first.watermark : '')
    || cleanPosterSubject(first.title || base.title)
  const subtitle = first.subTitle || first.issuedTo || first.battleTag || base.subtitle || first.chips?.filter(Boolean).join(' · ') || ''

  const chips = uniqPosterChips([
    copy.roleChip,
    base.achievement,
    ...(Array.isArray(first.chips) ? first.chips : []),
    ...(Array.isArray(base.chips) ? base.chips : [])
  ]).slice(0, 6)
  const memoryTitle = emotionalEnding?.storyQuote?.title || emotionalEnding?.title || copy.signatureTitle
  const memoryBody = emotionalEnding?.storyQuote?.body || emotionalEnding?.body || copy.mainText(subject)
  const playerTicket = base.playerTicket
    ? { ...base.playerTicket, memory: { ...base.playerTicket.memory, title: memoryTitle, body: memoryBody } }
    : null
  const identityTicket = base.identityTicket
    ? { ...base.identityTicket, memory: { ...base.identityTicket.memory, title: memoryTitle, body: memoryBody } }
    : null

  return {
    ...base,
    locale: context.locale || 'zh-CN',
    cardKind: kind,
    seasonId: first.seasonId || first.season_id || base.seasonId,
    seasonCode: first.seasonCode || first.season_code || base.seasonCode,
    seasonMark: first.seasonMark || first.season_mark || base.seasonMark,
    eventTitle: first.eventTitle || first.event_title || base.eventTitle,
    eventLogo: first.eventLogo || first.event_logo || base.eventLogo,
    title: adaptReviewText(copy.title(subject), first),
    subtitle,
    signatureTitle: adaptReviewText(memoryTitle, first),
    mainText: adaptReviewText(memoryBody, first),
    chips,
    playerTicket,
    identityTicket
  }
}

const POSTER_KIND_META = {
  player: { label: '选手纪念票', badge: 'PLAYER TICKET', output: '横版 1920×1080' },
  team: { label: '队伍纪念票', badge: 'TEAM TICKET', output: '横版 1920×1080' },
  manager: { label: '经理纪念票', badge: 'MANAGER TICKET', output: '横版 1920×1080' },
  coach: { label: '教练纪念票', badge: 'COACH TICKET', output: '横版 1920×1080' },
  managerCoach: { label: '经理 / 教练纪念票', badge: 'DUAL ROLE TICKET', output: '横版 1920×1080' },
  staff: { label: '赛管纪念票', badge: 'OPS TICKET', output: '横版 1920×1080' },
  caster: { label: '解说纪念票', badge: 'BROADCAST TICKET', output: '横版 1920×1080' },
  tournament: { label: '赛事见证票', badge: 'WITNESS TICKET', output: '横版 1920×1080' }
}

function getPosterKindMeta(kind) {
  return POSTER_KIND_META[kind] || { label: '官方纪念票', badge: 'OFFICIAL TICKET', output: 'PNG 输出' }
}

function getPosterPrimaryData(payload, locale = 'zh-CN') {
  const ticket = payload.playerTicket || payload.identityTicket || {}
  const title = ticket.playerName || ticket.callsign || ticket.issuedTo || ticket.battleTag || payload.subtitle || cleanPosterSubject(payload.title) || 'FRIES CUP 2026'
  const subtitle = ticket.battleTag || ticket.teamFullName || ticket.team || payload.achievement || payload.cardType || 'SEASON ARCHIVE'
  const route = locale === 'zh-CN'
    ? ticket.ticketType || payload.cardType || 'OFFICIAL TICKET'
    : uiText(getReviewPosterMeta(payload.cardKind, locale).label, locale)
  const statRows = ticket.stats?.length
    ? ticket.stats
    : [
      payload.metricValue ? { label: payload.metricLabel || 'METRIC', value: payload.metricValue } : null,
      ...(Array.isArray(payload.chips) ? payload.chips.slice(0, 3).map(chip => ({ label: 'ARCHIVE', value: chip })) : [])
    ].filter(Boolean)

  return {
    title,
    subtitle,
    route,
    statRows: statRows.slice(0, 4)
  }
}

function getPosterDownloadName(payload, outputFormat = 'ticket') {
  const kind = payload.cardKind || 'review'
  const id = String(payload.archiveId || payload.seasonId || 'FCA26').replace(/[^a-z0-9_-]/gi, '_')
  const season = String(payload.seasonId || 'FCA26').toLowerCase()
  const format = outputFormat === 'poster'
    ? 'film_poster'
    : outputFormat === 'directorCut'
      ? 'directors_cut_ticket'
    : outputFormat === 'movieTicket'
      ? 'premiere_movie_ticket'
      : 'season_boarding_pass'
  const directorHero = outputFormat === 'directorCut' && payload.directorCut?.heroId
    ? `_${payload.directorCut.heroId}`
    : ''
  return `friescup_2026_${season}_${kind}_${format}${directorHero}_${id}.png`
}


async function getBlobFromUrl(url) {
  if (!url) return null
  const response = await fetch(url)
  if (!response.ok) return null
  return response.blob()
}

async function sharePosterImage(url, filename, locale = 'zh-CN') {
  if (!url || typeof navigator === 'undefined' || typeof File === 'undefined') {
    return { ok: false, reason: 'unsupported' }
  }

  if (typeof navigator.share !== 'function') {
    return { ok: false, reason: 'unsupported' }
  }

  const blob = await getBlobFromUrl(url)
  if (!blob) return { ok: false, reason: 'blob' }

  const file = new File([blob], filename || 'friescup_2026_ticket.png', {
    type: blob.type || 'image/png'
  })
  const payload = {
    files: [file],
    title: locale === 'ko-KR' ? '프라이즈 컵 2026 공식 기념 티켓' : locale === 'en-US' ? 'Fries Cup 2026 official keepsake ticket' : uiText("薯条杯 2026 官方纪念票", locale),
    text: locale === 'ko-KR' ? '나의 프라이즈 컵 2026 기념 티켓' : locale === 'en-US' ? 'Save my Fries Cup 2026 keepsake ticket' : uiText("保存我的薯条杯 2026 官方纪念票", locale)
  }

  if (typeof navigator.canShare === 'function' && !navigator.canShare({ files: [file] })) {
    return { ok: false, reason: 'files' }
  }

  await navigator.share(payload)
  return { ok: true }
}

function PosterModal({ scenes, storyType, perspective, staffType, profile, locale, viewerId, onViewerIdChange, initialOutputFormat = 'ticket', onClose }) {
  const isViewerPoster = storyType === 'tournament'
  const closeButtonRef = useRef(null)
  const dialogRef = useRef(null)
  const generationRef = useRef(0)
  const [outputFormat, setOutputFormat] = useState(initialOutputFormat)
  const { pathname } = useLocation()
  const payload = useMemo(() => {
    const next = buildReviewPosterPayload(scenes, { storyType, perspective, staffType, viewerId, locale })
    if (next.cardKind !== 'player' || next.seasonId !== 'FCR26') return next
    return { ...next, reviewUrl: buildBoardingReviewUrl(pathname, next.seasonId, locale) }
  }, [scenes, storyType, perspective, staffType, viewerId, locale, pathname])
  const [pngUrl, setPngUrl] = useState('')
  const [liveKeepsakeUrl, setLiveKeepsakeUrl] = useState('')
  const [isLiveKeepsakeRendering, setIsLiveKeepsakeRendering] = useState(false)
  const [liveKeepsakeError, setLiveKeepsakeError] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSharing, setIsSharing] = useState(false)
  const [error, setError] = useState('')
  const [filmVisualFailed, setFilmVisualFailed] = useState(false)
  const [filmVisualFallback, setFilmVisualFallback] = useState('')
  const [directorHeroChoice, setDirectorHeroChoice] = useState(() => payload.cardKind === 'player' ? 'auto' : '')
  const isFilmPoster = outputFormat === 'poster'
  const isMovieTicket = outputFormat === 'movieTicket'
  const isDirectorCut = outputFormat === 'directorCut'
  const isWideBoarding = outputFormat === 'ticket' && payload.cardKind === 'player' && payload.seasonId === 'FCR26'
  const isRefinedKeepsake = profile.usesRegularTemplate && !isDirectorCut
  const keepsakePreviewUrl = isRefinedKeepsake ? pngUrl || liveKeepsakeUrl : liveKeepsakeUrl
  const directorHeroOptions = useMemo(() => getDirectorCutHeroOptions(locale), [locale])
  const directorHeroGroups = useMemo(() => ['tank', 'damage', 'support'].map(role => ({
    role,
    heroes: directorHeroOptions.filter(hero => hero.role === role)
  })), [directorHeroOptions])
  const directorSeasonHeroIds = useMemo(() => getDirectorCutSeasonHeroIds(payload), [payload])
  const directorAutoSelection = useMemo(
    () => getDirectorCutSelection(payload, 'auto', locale),
    [payload, locale]
  )
  const directorSelection = useMemo(
    () => getDirectorCutSelection(payload, directorHeroChoice, locale),
    [payload, directorHeroChoice, locale]
  )
  const directorQuickHeroes = useMemo(() => directorSeasonHeroIds
    .filter(id => id !== directorAutoSelection.heroId)
    .map(id => directorHeroOptions.find(hero => hero.id === id))
    .filter(Boolean)
    .slice(0, 3), [directorAutoSelection.heroId, directorHeroOptions, directorSeasonHeroIds])
  const renderPayload = useMemo(
    () => isDirectorCut ? applyDirectorCutSelection(payload, directorSelection) : payload,
    [isDirectorCut, payload, directorSelection]
  )
  const directorRequiresHero = isDirectorCut && !directorSelection.ready

  useEffect(() => {
    closeButtonRef.current?.focus()

    const handleKeyDown = event => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
      if (event.key !== 'Tab') return
      const focusable = [...(dialogRef.current?.querySelectorAll('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]') || [])]
        .filter(element => element.getClientRects().length > 0)
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (!first) {
        event.preventDefault()
        dialogRef.current?.focus()
      } else if (!dialogRef.current?.contains(document.activeElement) || (!event.shiftKey && document.activeElement === last)) {
        event.preventDefault()
        first.focus()
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  useEffect(() => {
    setDirectorHeroChoice(payload.cardKind === 'player' && directorAutoSelection.ready ? 'auto' : '')
  }, [directorAutoSelection.ready, payload.archiveId, payload.cardKind])

  const baseMeta = { ...getPosterKindMeta(payload.cardKind), ...getReviewPosterMeta(payload.cardKind, locale) }
  const meta = {
    ...baseMeta,
    label: isFilmPoster
      ? reviewText(locale, 'filmPosterFormat')
      : isDirectorCut
        ? reviewText(locale, 'directorCutFormat')
      : isMovieTicket
        ? reviewText(locale, 'movieTicketFormat')
      : profile.usesRegularTemplate
        ? reviewText(locale, 'ticketFormat')
        : baseMeta.label,
    badge: isFilmPoster
      ? 'SEASON FILM POSTER'
      : isDirectorCut
        ? "DIRECTOR'S CUT TICKET"
      : isMovieTicket
        ? 'PREMIERE MOVIE TICKET'
        : profile.usesRegularTemplate
          ? 'SEASON BOARDING PASS'
          : baseMeta.badge,
    output: reviewText(locale, isFilmPoster ? 'posterOutputPortrait' : isWideBoarding ? 'posterOutputBoarding' : 'posterOutputLandscape')
  }
  const preview = getPosterPrimaryData(payload, locale)
  const previewMainName = preview.title
  const previewSubName = preview.subtitle
  const filmTicket = payload.playerTicket || payload.identityTicket || {}
  const [filmFirstStage, filmLastStage] = getFilmStageLabels(payload)
  const baseFilmVisualSource = payload.heroRender || payload.image || (payload.cardKind === 'team' ? DEFAULT_OW_TEAM_LOGO : '')
  const filmVisualSource = filmVisualFallback || baseFilmVisualSource
  const hasFilmVisual = Boolean(filmVisualSource) && !filmVisualFailed
  const filmUsesDefaultTeamMark = payload.cardKind === 'team' && filmVisualSource === DEFAULT_OW_TEAM_LOGO
  const filmTeamFullName = payload.cardKind === 'team'
    ? (filmTicket.teamFullName || previewSubName || previewMainName)
    : ''
  const filmPosterTitle = previewMainName
  const filmFrameCredit = payload.cardKind === 'team' ? previewMainName : filmTicket.team || 'FRIES CUP'
  const filmRoleLabel = getFilmRoleLabel(payload.cardKind, filmTicket.role || meta.badge)
  const filmBillingTitle = payload.cardKind === 'team' ? filmTeamFullName : filmPosterTitle
  const filmRosterNames = payload.cardKind === 'team'
    ? uniqPosterChips((filmTicket.rosterNames || filmTicket.stamps?.map(item => item?.title) || [])
      .map(name => String(name || '').replace(/#\d+$/g, '').trim())
      .filter(Boolean)).slice(0, 12)
    : []
  const filmStaffCredits = payload.cardKind === 'team'
    ? (filmTicket.staffCredits || []).filter(item => item?.name).slice(0, 3)
    : []
  const filmMapStat = payload.cardKind === 'team'
    ? (filmTicket.stats || []).find(item => String(item?.label || '').toUpperCase().includes('MAP'))
    : null
  const filmTeamSlate = payload.cardKind === 'team'
    ? [
        { label: 'RECORD', value: filmTicket.recordText },
        { label: 'MAPS', value: filmMapStat?.value },
        { label: 'FINAL', value: filmTicket.dest }
      ].filter(item => item.value !== undefined && item.value !== null && String(item.value).trim())
    : []
  const hasFilmTeamCredits = filmRosterNames.length > 0
  const isFilmPhoto = !payload.heroRender && hasFilmVisual && (payload.cardKind === 'staff' || payload.cardKind === 'caster')
  const filmVisualClass = payload.heroRender
    ? styles.posterFilmHeroRender
    : isFilmPhoto
      ? styles.posterFilmPhotoVisual
      : styles.posterFilmMarkVisual
  const filmTitleLength = [...String(filmPosterTitle || '').replace(/\s+/g, '')].length
  const filmTitleClass = filmTitleLength > 16
    ? styles.posterFilmTitleLong
    : filmTitleLength > 10
      ? styles.posterFilmTitleMedium
      : styles.posterFilmTitleShort
  const downloadName = getPosterDownloadName(renderPayload, outputFormat)
  const hasGenerated = Boolean(pngUrl)

  useEffect(() => {
    return () => {
      if (pngUrl) URL.revokeObjectURL(pngUrl)
    }
  }, [pngUrl])

  useEffect(() => {
    return () => {
      if (liveKeepsakeUrl) URL.revokeObjectURL(liveKeepsakeUrl)
    }
  }, [liveKeepsakeUrl])

  useEffect(() => {
    let cancelled = false

    setLiveKeepsakeUrl('')
    setLiveKeepsakeError('')

    if (directorRequiresHero) {
      setIsLiveKeepsakeRendering(false)
      return () => {
        cancelled = true
      }
    }

    setIsLiveKeepsakeRendering(true)

    generatePosterPng(renderPayload, { format: outputFormat })
      .then(url => {
        if (cancelled) {
          if (url) URL.revokeObjectURL(url)
          return
        }

        if (!url) {
          setLiveKeepsakeError(reviewText(locale, 'errorGenerate'))
          return
        }

        setLiveKeepsakeUrl(url)
      })
      .catch(() => {
        if (!cancelled) {
          setLiveKeepsakeError(reviewText(locale, 'errorGenerate'))
        }
      })
      .finally(() => {
        if (!cancelled) setIsLiveKeepsakeRendering(false)
      })

    return () => {
      cancelled = true
    }
  }, [directorRequiresHero, locale, outputFormat, renderPayload])

  useEffect(() => {
    generationRef.current += 1
    setIsGenerating(false)
    setError('')
    setPngUrl('')
    return () => { generationRef.current += 1 }
  }, [renderPayload, outputFormat])

  useEffect(() => {
    setFilmVisualFailed(false)
    setFilmVisualFallback('')
  }, [payload.cardKind, payload.heroRender, payload.image])

  const handleFilmVisualError = event => {
    const image = event.currentTarget
    const fallback = payload.heroRender
      ? payload.image
      : payload.cardKind === 'team'
        ? DEFAULT_OW_TEAM_LOGO
        : ''
    if (fallback && fallback !== image.getAttribute('src')) {
      setFilmVisualFallback(fallback)
      return
    }

    image.style.display = 'none'
    setFilmVisualFailed(true)
  }

  const handleGenerate = async () => {
    if (isGenerating || isSharing) return
    if (directorRequiresHero) {
      setError(reviewText(locale, 'directorChooseHeroFirst'))
      return
    }

    setIsGenerating(true)
    const request = ++generationRef.current
    setError('')
    setLiveKeepsakeError('')
    setPngUrl(prev => {
      if (prev) URL.revokeObjectURL(prev)
      return ''
    })

    try {
      let url = ''

      if (liveKeepsakeUrl) {
        const blob = await getBlobFromUrl(liveKeepsakeUrl)
        url = blob ? URL.createObjectURL(blob) : ''
      } else {
        url = await generatePosterPng(renderPayload, { format: outputFormat })
      }

      if (request !== generationRef.current) {
        if (url) URL.revokeObjectURL(url)
        return
      }
      if (!url) {
        setError(reviewText(locale, 'errorGenerate'))
        return
      }

      setPngUrl(url)
    } catch {
      if (request === generationRef.current) setError(reviewText(locale, 'errorGenerate'))
    } finally {
      if (request === generationRef.current) setIsGenerating(false)
    }
  }

  const handleShareImage = async () => {
    if (!pngUrl) return

    setIsSharing(true)
    setError('')

    try {
      const result = await sharePosterImage(pngUrl, downloadName, locale)

      if (!result.ok) {
        setError(reviewText(locale, 'errorShare'))
      }
    } catch (err) {
      if (err?.name !== 'AbortError') {
        setError(reviewText(locale, 'errorShare'))
      }
    } finally {
      setIsSharing(false)
    }
  }

  return (
    <div className={styles.posterOverlay} onClick={onClose} role="presentation">
      <div
        ref={dialogRef}
        className={cx(styles.posterPanel, isViewerPoster ? styles.posterPanelViewer : '', isRefinedKeepsake ? styles.posterPanelRefined : '')}
        role="dialog"
        tabIndex={-1}
        aria-modal="true"
        aria-labelledby="review-keepsake-title"
        onClick={event => event.stopPropagation()}
      >
        <div className={styles.posterHead}>
          <div>
            <div className={styles.posterKicker}>{profile.usesRegularTemplate ? 'OFFICIAL PREMIERE KEEPSAKE' : 'OFFICIAL TICKET ISSUER'}</div>
            <h2 id="review-keepsake-title">{reviewText(locale, isViewerPoster ? 'viewerPosterTitle' : profile.usesRegularTemplate ? 'keepsakeTitle' : 'posterTitle')}</h2>
            <div className={styles.posterArchiveId}>{payload.archiveId || `${profile.shortMark}-ARCHIVE`}</div>
          </div>
          <button ref={closeButtonRef} type="button" onClick={onClose}>{reviewText(locale, 'close')}</button>
        </div>

        <section className={cx(styles.posterPreviewPane, isFilmPoster ? styles.posterPreviewPaneFilm : '')}>
          <div className={styles.posterPreviewToolbar}>
            <div className={styles.posterPaneLabel}>
              {isFilmPoster
                ? 'LIVE FILM POSTER PREVIEW'
                : isDirectorCut
                  ? "LIVE DIRECTOR'S CUT PREVIEW"
                : isMovieTicket
                  ? 'LIVE MOVIE TICKET PREVIEW'
                  : 'LIVE BOARDING PASS PREVIEW'}
            </div>
            {profile.usesRegularTemplate ? (
              <div className={styles.posterFormatSwitch} aria-label={uiText('纪念图格式', locale)} aria-describedby="review-format-help">
                <button type="button" aria-pressed={outputFormat === 'ticket'} onClick={() => setOutputFormat('ticket')}>
                  {reviewText(locale, 'ticketFormat')}
                </button>
                <button type="button" aria-pressed={outputFormat === 'poster'} onClick={() => setOutputFormat('poster')}>
                  {reviewText(locale, 'filmPosterFormat')}
                </button>
                <button type="button" aria-pressed={outputFormat === 'movieTicket'} onClick={() => setOutputFormat('movieTicket')}>
                  {reviewText(locale, 'movieTicketFormat')}
                </button>
                <button type="button" aria-pressed={outputFormat === 'directorCut'} onClick={() => setOutputFormat('directorCut')}>
                  {reviewText(locale, 'directorCutFormat')}
                </button>
              </div>
            ) : null}
          </div>

          <p id="review-format-help" className={styles.posterFormatHint}>
            {reviewText(locale, isFilmPoster ? 'posterUse' : isDirectorCut ? 'directorCutUse' : isMovieTicket ? 'movieTicketUse' : 'ticketUse')}
          </p>

          {isFilmPoster ? (
            keepsakePreviewUrl ? (
              <div className={styles.posterFilmCanonicalMock}>
                <img
                  className={styles.posterFilmCanonicalImage}
                  src={keepsakePreviewUrl}
                  alt={reviewText(locale, 'filmPosterPreviewAlt')}
                />
              </div>
            ) : isLiveKeepsakeRendering ? (
              <div className={styles.posterFilmCanonicalStatus} role="status">
                <b>RENDERING FILM POSTER</b>
                <span>{reviewText(locale, 'keepsakeRendering')} · {meta.output}</span>
              </div>
            ) : (
            <div className={styles.posterFilmMock} title={liveKeepsakeError || undefined}>
              {payload.eventLogo && hasFilmVisual ? (
                <img
                  className={`${styles.posterFilmEventLogo}${filmUsesDefaultTeamMark ? ` ${styles.posterFilmEventLogoMuted}` : ''}`}
                  src={payload.eventLogo}
                  alt="Fries Cup"
                  onError={event => { event.currentTarget.style.display = 'none' }}
                />
              ) : null}
              <div className={styles.posterFilmHeader}>
                <span>{payload.seasonMark || profile.mark}</span>
                <b>ONE FRAME / ONE NAME</b>
              </div>

              <div className={`${styles.posterFilmVisual}${filmUsesDefaultTeamMark ? ` ${styles.posterFilmVisualDefaultTeam}` : ''}`}>
                {hasFilmVisual ? (
                  filmUsesDefaultTeamMark ? (
                    <div className={styles.posterFilmDefaultTeamWatermark}>
                      <div className={styles.posterFilmDefaultTeamEmblem}>
                        <img src={filmVisualSource} alt="" onError={handleFilmVisualError} />
                        <small>OVERWATCH / TEAM ENTRY</small>
                      </div>
                    </div>
                  ) : (
                    <img
                      className={filmVisualClass}
                      src={filmVisualSource}
                      alt=""
                      onError={handleFilmVisualError}
                    />
                  )
                ) : payload.eventLogo ? (
                  <img className={styles.posterFilmNoPortraitMark} src={payload.eventLogo} alt="" />
                ) : null}
              </div>

              {filmTeamSlate.length ? (
                <div className={styles.posterFilmTeamSlate} aria-label="Team season slate">
                  <div className={styles.posterFilmTeamSlateHead}>
                    <b>{filmTeamFullName || previewMainName}</b>
                    <small>SEASON DOSSIER / 2026</small>
                  </div>
                  <div className={styles.posterFilmTeamSlateStats}>
                    {filmTeamSlate.map(item => (
                      <span key={item.label}>
                        <small>{item.label}</small>
                        <b>{item.value}</b>
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className={`${styles.posterFilmCopy}${payload.cardKind === 'team' ? ` ${styles.posterFilmCopyTeam}` : ''}${filmUsesDefaultTeamMark ? ` ${styles.posterFilmCopyDefaultTeam}` : ''}`}>
                <small>ONE FRAME / {filmFrameCredit}</small>
                <strong className={filmTitleClass}>{filmPosterTitle}</strong>
                <em>{filmRoleLabel}</em>
                <b>{payload.achievement || 'SEASON ARCHIVE'}</b>
              </div>

              <div className={`${styles.posterFilmStageLine}${payload.cardKind === 'team' ? ` ${styles.posterFilmStageLineTeam}` : ''}${filmUsesDefaultTeamMark ? ` ${styles.posterFilmStageLineDefaultTeam}` : ''}`}>
                <span>{filmFirstStage}</span>
                <i />
                <b>{filmLastStage}</b>
              </div>

              <div className={`${styles.posterFilmTagline}${payload.cardKind === 'team' ? ` ${styles.posterFilmTaglineTeam}` : ''}${filmUsesDefaultTeamMark ? ` ${styles.posterFilmTaglineDefaultTeam}` : ''}`}>
                <i />
                <strong>{payload.signatureTitle || uiText("这一季，已经成为你的电影。", locale)}</strong>
              </div>

              <div className={`${styles.posterFilmBilling}${payload.cardKind === 'team' ? ` ${styles.posterFilmBillingTeam}` : ''}${filmUsesDefaultTeamMark ? ` ${styles.posterFilmBillingDefaultTeam}` : ''}`}>
                <span>{filmRoleLabel}</span>
                <b>“{filmBillingTitle}” / {payload.seasonMark || profile.mark} SEASON ARCHIVE</b>
                {hasFilmTeamCredits ? (
                  <div className={styles.posterFilmCredits}>
                    <i>STARRING</i>
                    <strong>{filmRosterNames.join(' · ')}</strong>
                    {filmStaffCredits.length ? (
                      <small>
                        TEAM STAFF / {filmStaffCredits.map(item => `${item.role} ${item.name}`).join(' · ')}
                      </small>
                    ) : null}
                  </div>
                ) : (
                  <small>
                    WITH {filmTicket.team || 'FRIES CUP'} · {previewSubName || filmTicket.topHero || filmRoleLabel}
                  </small>
                )}
              </div>

              <div className={styles.posterFilmFooter}>
                <span>{payload.archiveId}</span>
                <b>FRIES CUP 2026 / OFFICIAL ARCHIVE</b>
              </div>
            </div>
            )
          ) : (
            directorRequiresHero ? (
              <div className={styles.posterTicketCanonicalStatus} role="status">
                <b>SELECT YOUR HERO</b>
                <span>{reviewText(locale, 'directorChooseHeroPreview')}</span>
              </div>
            ) : keepsakePreviewUrl ? (
              <div className={styles.posterTicketCanonicalMock}>
                <img
                  className={styles.posterTicketCanonicalImage}
                  src={keepsakePreviewUrl}
                  alt={reviewText(locale, isDirectorCut ? 'directorCutPreviewAlt' : isMovieTicket ? 'movieTicketPreviewAlt' : 'boardingPassPreviewAlt')}
                />
              </div>
            ) : (
              <div
                className={styles.posterTicketCanonicalStatus}
                role="status"
                title={liveKeepsakeError || undefined}
              >
                <b>
                  {isLiveKeepsakeRendering
                    ? isDirectorCut ? "RENDERING DIRECTOR'S CUT" : isMovieTicket ? 'RENDERING MOVIE TICKET' : 'RENDERING SEASON BOARDING PASS'
                    : 'TICKET PREVIEW UNAVAILABLE'}
                </b>
                <span>{isLiveKeepsakeRendering ? `${reviewText(locale, 'keepsakeRendering')} · ${meta.output}` : reviewText(locale, 'errorGenerate')}</span>
              </div>
            )
          )}

          {!isRefinedKeepsake ? <>
          <div className={styles.posterKeepsakeNote}>
            <span>KEEPSAKE NOTE</span>
            <strong>{payload.signatureTitle}</strong>
            <p>{payload.mainText}</p>
          </div>

          <div className={styles.posterMetaGrid}>
            <div>
              <span>TYPE</span>
              <b>{meta.label}</b>
            </div>
            <div>
              <span>OUTPUT</span>
              <b>{meta.output}</b>
            </div>
            <div>
              <span>STATUS</span>
              <b>{hasGenerated ? 'PNG READY' : 'WAITING'}</b>
            </div>
          </div>
          </> : (
            <div className={styles.posterCompactMeta}>
              <span>{meta.output} · PNG</span>
              <span role="status">{reviewText(locale, hasGenerated ? 'keepsakeFileReady' : isLiveKeepsakeRendering ? 'keepsakeRendering' : 'keepsakePreviewReady')}</span>
              {keepsakePreviewUrl ? (
                <a href={keepsakePreviewUrl} target="_blank" rel="noopener noreferrer">
                  {reviewText(locale, 'previewFullSize')} ↗
                </a>
              ) : null}
            </div>
          )}
        </section>

        <section
          className={cx(
            styles.posterControlPane,
            isFilmPoster ? styles.posterControlPaneFilm : styles.posterControlPaneTicket,
          )}
        >
          {isViewerPoster ? (
            <div className={styles.posterViewerInputCard}>
              <div className={styles.posterPaneLabel}>WITNESS ID</div>
              <label className={styles.posterViewerInputLabel} htmlFor="viewer-poster-id">
                {reviewText(locale, 'viewerId')}
              </label>
              <input
                id="viewer-poster-id"
                value={viewerId}
                onChange={event => onViewerIdChange?.(event.target.value)}
                placeholder={reviewText(locale, 'viewerIdPlaceholder')}
              />
              <p>{reviewText(locale, 'viewerIdHelp')}</p>
            </div>
          ) : null}

          {isDirectorCut ? (
            <div className={styles.directorArtCard}>
              <div className={styles.directorArtHead}>
                <div>
                  <span>ART DIRECTION</span>
                  <strong>{directorSelection.profile.label}</strong>
                </div>
                <b>{directorSelection.profile.code}</b>
              </div>

              <p>
                {reviewText(locale, payload.cardKind === 'player'
                  ? 'directorHeroHelpPlayer'
                  : 'directorHeroHelpIdentity')}
              </p>

              {directorAutoSelection.ready || directorQuickHeroes.length ? (
                <div className={styles.directorQuickChoices} aria-label={reviewText(locale, 'directorArtDirection')}>
                  {directorAutoSelection.ready ? (
                    <button
                      type="button"
                      aria-pressed={directorHeroChoice === 'auto'}
                      onClick={() => setDirectorHeroChoice('auto')}
                    >
                      <span>{reviewText(locale, 'directorAutoSignature')}</span>
                      <b>{directorAutoSelection.heroName}</b>
                    </button>
                  ) : null}
                  {directorQuickHeroes.map(hero => (
                    <button
                      key={hero.id}
                      type="button"
                      aria-pressed={directorHeroChoice === hero.id}
                      onClick={() => setDirectorHeroChoice(hero.id)}
                    >
                      <span>{reviewText(locale, 'directorSeasonCast')}</span>
                      <b>{hero.name}</b>
                    </button>
                  ))}
                </div>
              ) : null}

              <label className={styles.directorHeroSelect} htmlFor="director-cut-hero">
                <span>{reviewText(locale, 'directorAllHeroes')}</span>
                <select
                  id="director-cut-hero"
                  value={directorHeroChoice}
                  onChange={event => setDirectorHeroChoice(event.target.value)}
                >
                  <option value="" disabled>{reviewText(locale, 'directorChooseHero')}</option>
                  {directorAutoSelection.ready ? (
                    <option value="auto">
                      {reviewText(locale, 'directorAutoSignature')} · {directorAutoSelection.heroName}
                    </option>
                  ) : null}
                  {directorHeroGroups.map(group => (
                    <optgroup key={group.role} label={reviewText(locale, DIRECTOR_HERO_ROLE_KEYS[group.role])}>
                      {group.heroes.map(hero => (
                        <option key={hero.id} value={hero.id}>{hero.label} · {hero.profile.label}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </label>

              <div className={styles.directorArtMeta}>
                <span>
                  <small>SOURCE</small>
                  <b>{reviewText(locale, directorSelection.source === 'manual'
                    ? 'directorChoiceManual'
                    : directorSelection.source === 'signature'
                      ? 'directorChoiceSignature'
                      : 'directorChoiceUnselected')}</b>
                </span>
                <span>
                  <small>{reviewText(locale, 'directorSubject')}</small>
                  <b>{reviewText(locale, directorSelection.ready ? 'directorSubjectHero' : 'directorSubjectPending')}</b>
                </span>
                <span>
                  <small>MOTIF</small>
                  <b>{directorSelection.heroName || '—'}</b>
                </span>
              </div>
            </div>
          ) : null}

          <div className={styles.posterActions}>
            {!isRefinedKeepsake || !hasGenerated ? (
            <button
              type="button"
              onClick={handleGenerate}
              disabled={directorRequiresHero || isGenerating || isSharing || isLiveKeepsakeRendering}
              className={isRefinedKeepsake ? styles.posterPrimaryAction : undefined}
            >
              {reviewText(locale, isGenerating
                ? 'generating'
                : isFilmPoster
                  ? 'generateFilmPosterPng'
                  : isDirectorCut
                    ? 'generateDirectorCutPng'
                  : isMovieTicket
                    ? 'generateMovieTicketPng'
                  : profile.usesRegularTemplate
                    ? 'generateTicketPng'
                    : 'generatePng')}
            </button>
            ) : null}

            {pngUrl ? (
              <a href={pngUrl} download={downloadName} className={isRefinedKeepsake ? styles.posterPrimaryAction : undefined}>
                {reviewText(locale, isFilmPoster
                  ? 'downloadFilmPosterPng'
                  : isDirectorCut
                    ? 'downloadDirectorCutPng'
                  : isMovieTicket
                    ? 'downloadMovieTicketPng'
                    : profile.usesRegularTemplate
                      ? 'downloadTicketPng'
                      : 'download')}
              </a>
            ) : null}

            {pngUrl ? (
              <a href={pngUrl} target="_blank" rel="noopener noreferrer">
                {reviewText(locale, 'openImage')}
              </a>
            ) : null}

            {pngUrl ? (
              <button type="button" onClick={handleShareImage} disabled={isGenerating || isSharing}>
                {reviewText(locale, isSharing ? 'sharing' : 'share')}
              </button>
            ) : null}
          </div>

          {error || liveKeepsakeError ? (
            <div className={styles.posterError} role="alert">
              <span>{error || liveKeepsakeError}</span>
              {!pngUrl ? <button type="button" onClick={handleGenerate} disabled={directorRequiresHero || isGenerating || isLiveKeepsakeRendering}>{reviewText(locale, 'retryGenerate')}</button> : null}
            </div>
          ) : null}

          {!isRefinedKeepsake ? <div className={styles.posterOutputFrame}>
            {pngUrl ? (
              <img src={pngUrl} alt={reviewText(locale, 'imageAlt')} title={reviewText(locale, 'posterTip')} className={styles.generatedPosterImage} />
            ) : (
              <div className={styles.posterOutputEmpty}>
                <b>PNG PREVIEW</b>
                <span>{reviewText(locale, isFilmPoster
                  ? 'previewEmptyFilmPoster'
                  : isDirectorCut
                    ? 'previewEmptyDirectorCut'
                  : isMovieTicket
                    ? 'previewEmptyMovieTicket'
                    : profile.usesRegularTemplate
                      ? 'previewEmptyTicket'
                      : 'previewEmpty')}</span>
              </div>
            )}
          </div> : null}
        </section>

        <div className={styles.posterTip}>
          {reviewText(locale, isRefinedKeepsake ? 'keepsakeSaveHint' : isViewerPoster ? 'viewerPosterTip' : profile.usesRegularTemplate ? 'keepsakeTip' : 'posterTip')}
        </div>
      </div>
    </div>
  )
}

export default function ReviewStoryPage({ storyType }) {
  const params = useParams()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedLocale = searchParams.get('lang')
  const locale = requestedLocale
    ? normalizeReviewLocale(requestedLocale)
    : getStoredReviewLocale('zh-CN')
  const perspective = searchParams.get('as') || 'team'
  const perspectiveIdentity = searchParams.get('who') || ''
  const posterPreviewParam = searchParams.get('poster')
  const posterPreviewFormat = posterPreviewParam === 'film'
    ? 'poster'
    : posterPreviewParam === 'director'
      ? 'directorCut'
    : posterPreviewParam === 'movie'
      ? 'movieTicket'
      : ''
  const sceneParam = searchParams.get('scene') || ''
  const seasonParam = searchParams.get('season')
  const hasSeasonParam = searchParams.has('season')
  const activeSeasonId = useMemo(() => {
    if (!hasSeasonParam) return null
    return resolveSeasonFromUrl(seasonParam) || DEFAULT_SEASON_ID
  }, [hasSeasonParam, seasonParam])
  const reviewEntryPath = useMemo(
    () => getReviewEntryReturnPath(location.state?.returnTo, activeSeasonId || DEFAULT_SEASON_ID, locale, searchParams.toString()),
    [location.state?.returnTo, activeSeasonId, locale, searchParams]
  )

  const [db, setDb] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [index, setIndex] = useState(0)
  const [direction, setDirection] = useState('forward')
  const touchStartRef = useRef(null)
  const stageRef = useRef(null)
  const chapterNavRef = useRef(null)
  const posterTriggerRef = useRef(null)
  const copyButtonRef = useRef(null)
  const [copyState, setCopyState] = useState('')
  const [showPoster, setShowPoster] = useState(false)
  const [viewerId, setViewerId] = useState('')
  const storyViewport = useStoryViewport()

  useEffect(() => {
    stageRef.current?.scrollTo({ top: 0, behavior: 'instant' })
    chapterNavRef.current?.querySelector('[aria-pressed="true"]')?.scrollIntoView({ block: 'nearest' })
    setCopyState('')
  }, [index, locale])

  useEffect(() => {
    if (showPoster || !posterTriggerRef.current) return
    const trigger = posterTriggerRef.current
    if (trigger.isConnected && trigger.getClientRects().length) trigger.focus()
    else copyButtonRef.current?.focus()
  }, [showPoster])

  useEffect(() => {
    if (copyState !== 'copied') return
    const timer = setTimeout(() => setCopyState(''), 2500)
    return () => clearTimeout(timer)
  }, [copyState])

  const handleCopyScene = async () => {
    const url = buildReviewSceneUrl(window.location.href, index)
    try {
      await navigator.clipboard.writeText(url)
      setCopyState('copied')
    } catch {
      setCopyState('failed')
    }
  }
  const reviewDb = useMemo(() => prepareReviewDb(db), [db])
  const reviewSeason = useMemo(
    () => getSeasonById(activeSeasonId || db?.meta?.season_id || DEFAULT_SEASON_ID),
    [activeSeasonId, db?.meta?.season_id]
  )
  const reviewReadiness = useMemo(
    () => getReviewReadiness(reviewSeason, db),
    [reviewSeason, db]
  )
  const profile = useMemo(
    () => getReviewSeasonProfile(activeSeasonId || reviewDb),
    [activeSeasonId, reviewDb]
  )
  const localizedProfile = useMemo(
    () => getLocalizedReviewSeasonProfile(activeSeasonId || reviewDb, locale),
    [activeSeasonId, locale, reviewDb]
  )

  useEffect(() => {
    setStoredReviewLocale(locale)
    document.documentElement.lang = locale
    if (requestedLocale) return

    const next = new URLSearchParams(searchParams)
    next.set('lang', getLocaleParam(locale))
    setSearchParams(next, { replace: true, state: location.state })
  }, [locale, requestedLocale, searchParams, setSearchParams, location.state])

  useEffect(() => {
    document.title = locale === 'ko-KR'
      ? `${localizedProfile.eventTitle} 시즌 리뷰`
      : locale === 'en-US'
        ? `${localizedProfile.eventTitle} Season Review`
        : buildFriesCupTitle(getReviewStoryPageLabel(storyType), locale)
  }, [locale, storyType, localizedProfile.eventTitle])

  function handleLocaleChange(nextLocale) {
    const normalized = normalizeReviewLocale(nextLocale)
    const next = new URLSearchParams(searchParams)
    next.set('lang', getLocaleParam(normalized))
    setSearchParams(next, { replace: true, state: location.state })
  }

  useEffect(() => {
    let alive = true
    setDb(null)
    setError('')
    setLoading(true)

    getDb(activeSeasonId || undefined, { preferLocalData: true })
      .then(data => {
        if (!alive) return
        setDb(data)
        setError('')
      })
      .catch(err => {
        if (!alive) return
        setError(err?.message || '加载失败')
      })
      .finally(() => {
        if (!alive) return
        setLoading(false)
      })

    return () => {
      alive = false
    }
  }, [activeSeasonId])

  const sourceScenes = useMemo(() => {
    if (!reviewDb || !reviewReadiness.available) return []

    if (storyType === 'person') return buildPersonStory(reviewDb, params.identityKey)
    if (storyType === 'player') return buildPlayerStory(reviewDb, params.playerId)
    if (storyType === 'team') return buildTeamStory(reviewDb, params.teamId, perspective, perspectiveIdentity)
    if (storyType === 'staff') return buildStaffStory(reviewDb, params.staffType, params.staffKey)
    if (storyType === 'tournament') return buildTournamentStory(reviewDb)

    return []
  }, [reviewDb, reviewReadiness.available, storyType, params.identityKey, params.playerId, params.teamId, params.staffType, params.staffKey, perspective, perspectiveIdentity])

  const localizedScenes = useMemo(
    () => localizeReviewScenes(sourceScenes, locale, localizedProfile),
    [locale, localizedProfile, sourceScenes]
  )
  const scenes = useMemo(
    () => buildCinemaReviewScenes(localizedScenes, { isRegular: profile.usesRegularTemplate, isPartner: profile.isPartner, locale }),
    [localizedScenes, locale, profile.usesRegularTemplate, profile.isPartner]
  )

  useEffect(() => {
    if (posterPreviewFormat && scenes.length) setShowPoster(true)
  }, [posterPreviewFormat, scenes.length])

  useEffect(() => {
    const requestedScene = Number.parseInt(sceneParam, 10)
    const nextIndex = scenes.length
      ? Math.min(scenes.length - 1, Math.max(0, Number.isFinite(requestedScene) ? requestedScene - 1 : 0))
      : 0

    setIndex(previousIndex => {
      if (previousIndex === nextIndex) return previousIndex
      setDirection(nextIndex < previousIndex ? 'backward' : 'forward')
      return nextIndex
    })
    if (!posterPreviewFormat) setShowPoster(false)
  }, [storyType, params.identityKey, params.playerId, params.teamId, params.staffType, params.staffKey, perspective, perspectiveIdentity, activeSeasonId, scenes.length, sceneParam, posterPreviewFormat])

  const current = scenes[index]
  const progress = scenes.length > 0 ? ((index + 1) / scenes.length) * 100 : 0
  const isLastScene = index === scenes.length - 1
  const isStoryEnding = current?.kind === 'ending'
  const activeSeasonAct = current?.seasonAct || 'qualifier'
  const nextScene = scenes[index + 1] || null
  const isPlayerCover = current?.visualType === 'cover' && current?.coverLayout === 'player'
  const desktopRailCopy = locale === 'ko-KR'
    ? { archive: 'SEASON ARCHIVE', chapters: '장면 탐색', now: '현재 상영', next: '다음 장면', final: '마지막 장면', qualifier: '오픈 예선', playoffs: '플레이오프', controls: '← → 또는 Space로 이동' }
    : locale === 'en-US'
      ? { archive: 'SEASON ARCHIVE', chapters: 'CHAPTER INDEX', now: 'NOW PLAYING', next: 'NEXT SCENE', final: 'FINAL REEL', qualifier: 'OPEN QUALIFIER', playoffs: 'PLAYOFFS', controls: 'USE ← → OR SPACE' }
      : { archive: uiText("赛季放映档案", locale), chapters: uiText("章节索引", locale), now: uiText("正在放映", locale), next: uiText("下一幕", locale), final: uiText("最终幕", locale), qualifier: uiText("公开预选赛", locale), playoffs: uiText("季后淘汰赛", locale), controls: uiText("使用 ← → 或空格切换", locale) }
  if (profile.isPartner) desktopRailCopy.qualifier = localizedProfile.routeLabel
  const storyPhase = current?.visualType === 'organizer'
    ? 'letter'
    : current?.kind === 'ending'
      ? 'ending'
      : current?.visualType === 'actTitle'
        ? 'act'
        : 'story'

  const openPoster = useCallback(event => {
    posterTriggerRef.current = event?.currentTarget || document.activeElement
    setShowPoster(true)
  }, [])
  const closePoster = useCallback(() => setShowPoster(false), [])

  const goToScene = useCallback(nextIndex => {
    if (!Number.isInteger(nextIndex) || nextIndex < 0 || nextIndex >= scenes.length || nextIndex === index) return

    setDirection(nextIndex < index ? 'backward' : 'forward')
    setIndex(nextIndex)

    const nextSearchParams = new URLSearchParams(searchParams)
    nextSearchParams.set('scene', String(nextIndex + 1))
    nextSearchParams.delete('poster')
    setSearchParams(nextSearchParams, { replace: true, state: location.state })
  }, [index, scenes.length, searchParams, setSearchParams, location.state])

  const goPrev = useCallback(() => {
    if (index <= 0) return
    goToScene(index - 1)
  }, [goToScene, index])

  const goNext = useCallback(() => {
    if (!scenes.length) return
    if (index >= scenes.length - 1) {
      openPoster()
      return
    }

    goToScene(index + 1)
  }, [goToScene, index, openPoster, scenes.length])

  useEffect(() => {
    const onKeyDown = event => {
      if (showPoster) return
      if (event.target instanceof Element && event.target.closest('button, a, summary, input, textarea, select, [contenteditable="true"]')) return

      if (event.key === 'ArrowLeft') {
        goPrev()
        return
      }

      if (event.key === 'ArrowRight' || event.key === ' ') {
        event.preventDefault()
        goNext()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [goNext, goPrev, showPoster])

  const handleTouchEnd = event => {
    if (showPoster) return
    const start = touchStartRef.current
    const end = event.changedTouches?.[0]
    touchStartRef.current = null
    if (!start || !end) return
    const dx = end.clientX - start.x
    const dy = end.clientY - start.y

    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.25) {
      if (dx < 0) goNext()
      else goPrev()
    }
  }

  if (loading) {
    return (
      <div className={styles.fullscreen}>
        <div className={styles.systemBox}>{reviewText(locale, 'loading')}</div>
      </div>
    )
  }

  if (error || !current) {
    return (
      <div className={styles.fullscreen}>
        <div className={styles.systemBox}>
          <div>{error || reviewText(locale, 'noReview')}</div>
          <Link to={reviewEntryPath}>{reviewText(locale, 'back')}</Link>
        </div>
      </div>
    )
  }

  return (
    <div
      className={styles.fullscreen}
      data-review-kind={current.kind || 'narrative'}
      data-review-visual={current.visualType || 'archive'}
      data-review-phase={storyPhase}
      data-review-act={profile.usesRegularTemplate ? activeSeasonAct : undefined}
      data-review-direction={direction}
      data-review-locale={locale}
      data-review-has-note={Boolean(current.recordNote)}
      style={{ '--story-scale': String(storyViewport.scale), '--review-viewport-height': `${storyViewport.height}px`, '--review-viewport-top': `${storyViewport.top}px` }}
      onTouchStart={event => {
        const touch = event.touches?.[0]
        touchStartRef.current = !showPoster && touch ? { x: touch.clientX, y: touch.clientY } : null
      }}
      onTouchCancel={() => { touchStartRef.current = null }}
      onTouchEnd={handleTouchEnd}
    >
      <div inert={showPoster}>
        <div className={styles.bgGlow}></div>
        <div className={styles.storyToolbar}>
          <div className={styles.storyLocaleSwitch} aria-label={uiText('回顾语言', locale)}>
            {REVIEW_LOCALES.map(item => (
              <button
                key={item.id}
                type="button"
                className={item.id === locale ? styles.storyLocaleActive : ''}
                aria-pressed={item.id === locale}
                onClick={() => handleLocaleChange(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>

          <label className={styles.mobileChapterNav}>
            <span>{desktopRailCopy.chapters}</span>
            <select
              value={index}
              onChange={event => goToScene(Number(event.target.value))}
              aria-label={desktopRailCopy.chapters}
            >
              {scenes.map((scene, sceneIndex) => (
                <option key={`mobile-chapter-${sceneIndex}-${scene.title}`} value={sceneIndex}>
                  {String(sceneIndex + 1).padStart(2, '0')} · {scene.title}
                </option>
              ))}
            </select>
          </label>
          <button ref={copyButtonRef} type="button" className={styles.copySceneButton} onClick={handleCopyScene} aria-label={reviewText(locale, 'copyScene')} title={reviewText(locale, 'copyScene')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="m10 13 4-4M8 16l-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m2 1 1-1a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0" transform="translate(1 0)" /></svg>
            <span>{reviewText(locale, 'copyScene')}</span>
          </button>
          <Link to={reviewEntryPath} state={{ returnTo: location.state?.parentReturnTo, returnScrollY: location.state?.parentReturnScrollY }} className={styles.closeBtn}>{reviewText(locale, 'exit')}</Link>
        </div>

        {copyState ? <div className={styles.sceneCopyFeedback} role="status">
          {reviewText(locale, copyState === 'copied' ? 'sceneCopied' : 'sceneCopyFailed')}
          {copyState === 'failed' ? <input aria-label={reviewText(locale, 'sceneLink')} value={buildReviewSceneUrl(window.location.href, index)} readOnly onFocus={event => event.target.select()} /> : null}
        </div> : null}

        <aside className={styles.desktopArchiveRail} aria-label={desktopRailCopy.chapters}>
          <div className={styles.desktopRailHeader}>
            <span>{desktopRailCopy.archive}</span>
            <b>{profile.mark}</b>
          </div>

          <div className={styles.desktopRailAct}>
            <span>{activeSeasonAct === 'playoffs' ? 'ACT II' : 'ACT I'}</span>
            <strong>{activeSeasonAct === 'playoffs' ? desktopRailCopy.playoffs : desktopRailCopy.qualifier}</strong>
          </div>

          <div className={styles.desktopRailLabel}>{desktopRailCopy.chapters}</div>
          <div className={styles.desktopRailChapters} ref={chapterNavRef}>
            {scenes.map((scene, sceneIndex) => (
              <button
                key={`desktop-chapter-${sceneIndex}-${scene.title}`}
                type="button"
                aria-label={`${sceneIndex + 1}. ${scene.title}`}
                title={scene.title}
                aria-pressed={sceneIndex === index}
                onClick={() => goToScene(sceneIndex)}
              >
                <span>{String(sceneIndex + 1).padStart(2, '0')}</span>
                <span className={styles.desktopChapterTitle}>{scene.title}</span>
              </button>
            ))}
          </div>
        </aside>

        <aside className={styles.desktopSceneRail} aria-label={desktopRailCopy.now}>
          <div className={styles.desktopSceneNumber}>
            <span>{desktopRailCopy.now}</span>
            <strong>{String(index + 1).padStart(2, '0')}</strong>
            <b>/ {String(scenes.length).padStart(2, '0')}</b>
          </div>

          <div className={cx(styles.desktopSceneCurrent, isPlayerCover ? styles.desktopSceneCurrentCover : '')}>
            {isPlayerCover ? (
              <>
                <span>PLAYER DOSSIER</span>
                <strong>{current.coverIdentity || current.title}</strong>
                <div className={styles.desktopCoverIdentity}>
                  <span>{current.coverTeam || 'TEAM ARCHIVE'}</span>
                  <b>{current.coverRole || 'PLAYER'}</b>
                </div>
                <div className={styles.desktopCoverStats}>
                  {(current.coverStats || []).slice(0, 3).map((stat, statIndex) => (
                    <div key={`${stat.label}-${statIndex}`}>
                      <span>{stat.label}</span>
                      <strong>{stat.value}</strong>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <span>{current.kicker || current.label || 'SEASON MEMORY'}</span>
                <strong>{current.title}</strong>
              </>
            )}
          </div>

          <div className={styles.desktopSceneNext}>
            <span>{nextScene ? desktopRailCopy.next : desktopRailCopy.final}</span>
            <strong>{nextScene?.title || current.title}</strong>
          </div>

          <div className={styles.desktopSceneControls}>{desktopRailCopy.controls}</div>
        </aside>

        <div className={styles.desktopHint}>{reviewText(locale, 'desktopHint')}</div>

        <div className={styles.storyStage} ref={stageRef}>
          <div className={styles.storyCanvas}>
            <div className={styles.storyFrame}>
              <div
                key={`memory-curtain-${index}-${direction}`}
                className={cx(styles.memoryCurtain, direction === 'backward' ? styles.memoryCurtainBackward : styles.memoryCurtainForward)}
                aria-hidden="true"
              />

              <div className={styles.segmentProgress}>
                {scenes.map((_, i) => (
                  <div key={i} className={styles.segment}>
                    <div className={styles.segmentFill} style={{ width: i <= index ? '100%' : '0%' }} />
                  </div>
                ))}
              </div>

              <div className={styles.progressText}>
                <span className={styles.brandStack}>
                  <b>{profile.mark}</b>
                  <small title={profile.usesRegularTemplate ? `ACT I ${desktopRailCopy.qualifier} / ACT II ${desktopRailCopy.playoffs}` : 'SEASON ARCHIVE'}>
                    {profile.usesRegularTemplate
                      ? activeSeasonAct === 'playoffs'
                        ? `ACT II · ${desktopRailCopy.playoffs}`
                        : `ACT I · ${desktopRailCopy.qualifier}`
                      : 'SEASON ARCHIVE'}
                  </small>
                </span>
                <span>{index + 1} / {scenes.length}</span>
              </div>

              <StoryScene
                scene={current}
                sceneKey={`${index}-${current.title}`}
                locale={locale}
                direction={direction}
                totalScenes={scenes.length}
                viewerId={viewerId}
                onViewerIdChange={setViewerId}
              />

              <StoryControls locale={locale} index={index} isLastScene={isLastScene} isStoryEnding={isStoryEnding} isWitness={storyType === 'tournament'} recordNote={current.recordNote} onPrevious={goPrev} onNext={goNext} onKeepsake={openPoster} />

              {!current.witnessPrompt ? (
                <>
                  <button type="button" className={styles.tapLeft} onClick={goPrev} aria-hidden="true" tabIndex={-1}></button>
                  <button type="button" className={styles.tapRight} onClick={goNext} aria-hidden="true" tabIndex={-1}></button>
                </>
              ) : null}
            </div>
          </div>
        </div>

        <StoryControls mobile locale={locale} index={index} isLastScene={isLastScene} isStoryEnding={isStoryEnding} isWitness={storyType === 'tournament'} recordNote={current.recordNote} onPrevious={goPrev} onNext={goNext} onKeepsake={openPoster} />

        <div className={styles.progressRail}>
          <div className={styles.progressRailFill} style={{ height: `${progress}%` }}></div>
        </div>
      </div>

      {showPoster ? (
        <PosterModal
          scenes={scenes}
          storyType={storyType}
          perspective={perspective}
          staffType={params.staffType}
          profile={profile}
          locale={locale}
          viewerId={viewerId}
          onViewerIdChange={setViewerId}
          initialOutputFormat={posterPreviewFormat || 'ticket'}
          onClose={closePoster}
        />
      ) : null}
    </div>
  )
}
