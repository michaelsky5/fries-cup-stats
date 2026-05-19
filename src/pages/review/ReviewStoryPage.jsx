import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { getDb } from '../../lib/db.js'
import {
  buildPlayerStory,
  buildStaffStory,
  buildTeamStory,
  buildTournamentStory
} from '../../lib/reviewStoryBuilders.js'
import { generatePosterPng, getPosterPayload } from '../../lib/reviewPoster.js'
import styles from './ReviewStoryPage.module.css'

const DEFAULT_LOGO = '/logos/OW.png'

function cx(...names) {
  return names.filter(Boolean).join(' ')
}

function clampPercent(value) {
  const num = Number(value)
  if (!Number.isFinite(num)) return 0
  return Math.max(0, Math.min(100, num))
}

function isLogoLike(src) {
  return String(src || '').includes('/logos/')
}

function handleImageFallback(event, fallback = '') {
  const img = event.currentTarget
  if (!img) return

  if (fallback && img.src && !img.src.endsWith(fallback)) {
    img.src = fallback
    return
  }

  img.style.display = 'none'
}

function getCardKey(card, index) {
  return `${card?.title || card?.value || card?.battleTag || 'card'}-${index}`
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

function MiniCardGrid({ title, cards, variant = 'default', limit = 6 }) {
  if (!cards?.length) return null

  return (
    <div className={cx(styles.miniCards, styles[`miniCards_${variant}`])}>
      {title ? <div className={styles.miniCardsTitle}>{title}</div> : null}

      <div className={styles.miniCardsGrid}>
        {cards.slice(0, limit).map((card, index) => {
          const fallback = isLogoLike(card.image) ? DEFAULT_LOGO : ''

          return (
            <div key={getCardKey(card, index)} className={styles.miniCard}>
              {card.image ? (
                <div className={styles.miniCardImage}>
                  <img
                    src={card.image}
                    alt=""
                    onError={event => handleImageFallback(event, fallback)}
                  />
                </div>
              ) : variant === 'team' ? (
                <div className={styles.miniCardImage}>
                  <img src={DEFAULT_LOGO} alt="" />
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
              {card.image ? (
                <img
                  src={card.image}
                  alt=""
                  onError={event => handleImageFallback(event)}
                />
              ) : (
                <span>{String(card.title || '?').slice(0, 1)}</span>
              )}
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

function SceneBody({ body }) {
  if (!body) return null
  return <p className={styles.sceneBody}>{body}</p>
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

function SceneInlineData({ scene, visualType }) {
  const shouldShowDataBars = scene.dataBars?.length && (visualType === 'roleMemory' || visualType === 'archive')
  if (!shouldShowDataBars) return null

  return (
    <div className={styles.inlineDataBlock}>
      <SceneDataBars bars={scene.dataBars} />
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

function StoryScene({ scene, sceneKey, currentIndex, total }) {
  const visualType = scene.visualType || 'default'
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
    scene.dataBars?.length ||
    (visualType === 'peakHighlight' && scene.metric)
  )

  const className = [
    styles.scene,
    styles[`kind_${scene.kind}`],
    styles[`tone_${scene.tone || 'gold'}`],
    styles[`visual_${visualType}`],
    hasStoryLayer ? styles.sceneHasLayer : '',
    scene.title && String(scene.title).length >= 24 ? styles.sceneLongTitle : '',
    scene.title && String(scene.title).length >= 38 ? styles.sceneExtraLongTitle : ''
  ].filter(Boolean).join(' ')

  return (
    <div key={sceneKey} className={className}>
      <div className={styles.sceneNoise}></div>
      <div className={styles.sceneDecor}></div>
      <div className={styles.sceneOrbit}></div>

      <div className={styles.officialMark}>
        <span>{scene.badge || 'SEASON ARCHIVE'}</span>
      </div>

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

      {scene.images?.length ? (
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
      ) : scene.image ? (
        <div className={styles.visual}>
          <img
            src={scene.image}
            alt=""
            onError={event => handleImageFallback(event, isLogoLike(scene.image) ? DEFAULT_LOGO : '')}
          />
        </div>
      ) : null}

      <SceneStoryLayer scene={scene} visualType={visualType} />

      <div className={styles.sceneText}>
        <div className={styles.eyebrow}>{scene.eyebrow}</div>
        <h1>{scene.title}</h1>

        {scene.subTitle ? (
          <div className={styles.sceneSubTitle}>{scene.subTitle}</div>
        ) : null}

        <SceneBody body={scene.body} />

        <SceneInlineData scene={scene} visualType={visualType} />

        <SceneStoryQuote quote={scene.storyQuote} />

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
      </div>
    </div>
  )
}

function cleanPosterSubject(value) {
  const raw = String(value || '').trim()

  return raw
    .replace(/，这是你的学院赛.*$/g, '')
    .replace(/, 这是你的学院赛.*$/g, '')
    .replace(/\s*的赛季旅程.*$/g, '')
    .replace(/\s*的赛季回顾.*$/g, '')
    .replace(/\s*的学院赛纪念卡.*$/g, '')
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
        callsign: viewerName || scene.callsign || scene.callSign || '共同见证者',
        callSign: viewerName || scene.callsign || scene.callSign || '共同见证者'
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
  const copy = POSTER_COPY[kind] || POSTER_COPY.player

  const subject = cleanPosterSubject(first.title || base.title)
  const subtitle = first.subTitle || first.issuedTo || first.battleTag || base.subtitle || first.chips?.filter(Boolean).join(' · ') || ''

  const chips = uniqPosterChips([
    copy.roleChip,
    base.achievement,
    ...(Array.isArray(first.chips) ? first.chips : []),
    ...(Array.isArray(base.chips) ? base.chips : [])
  ]).slice(0, 6)

  return {
    ...base,
    cardKind: kind,
    title: copy.title(subject),
    subtitle,
    signatureTitle: copy.signatureTitle,
    mainText: copy.mainText(subject),
    chips
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

function getPosterPrimaryData(payload) {
  const ticket = payload.playerTicket || payload.identityTicket || {}
  const title = ticket.issuedTo || ticket.battleTag || payload.subtitle || cleanPosterSubject(payload.title) || 'FRIES CUP 2026'
  const subtitle = ticket.callsign || ticket.teamFullName || ticket.team || payload.achievement || payload.cardType || 'SEASON ARCHIVE'
  const route = ticket.ticketType || payload.cardType || 'OFFICIAL TICKET'
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

function getPosterDownloadName(payload) {
  const kind = payload.cardKind || 'review'
  const id = String(payload.archiveId || 'FCA26').replace(/[^a-z0-9_-]/gi, '_')
  return `friescup_2026_${kind}_${id}.png`
}


async function getBlobFromUrl(url) {
  if (!url) return null
  const response = await fetch(url)
  if (!response.ok) return null
  return response.blob()
}

function openImageInNewTab(url) {
  if (!url || typeof window === 'undefined') return false

  const opened = window.open(url, '_blank', 'noopener,noreferrer')
  if (!opened) return false
  opened.opener = null
  return true
}

async function sharePosterImage(url, filename) {
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
    title: '薯条杯 2026 官方纪念票',
    text: '保存我的薯条杯 2026 官方纪念票'
  }

  if (typeof navigator.canShare === 'function' && !navigator.canShare({ files: [file] })) {
    return { ok: false, reason: 'files' }
  }

  await navigator.share(payload)
  return { ok: true }
}

function PosterModal({ scenes, storyType, perspective, staffType, onClose }) {
  const isViewerPoster = storyType === 'tournament'
  const [viewerId, setViewerId] = useState('')
  const payload = useMemo(
    () => buildReviewPosterPayload(scenes, { storyType, perspective, staffType, viewerId }),
    [scenes, storyType, perspective, staffType, viewerId]
  )
  const [pngUrl, setPngUrl] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSharing, setIsSharing] = useState(false)
  const [error, setError] = useState('')

  const meta = getPosterKindMeta(payload.cardKind)
  const preview = getPosterPrimaryData(payload)
  const previewMainName = preview.subtitle || preview.title
  const previewSubName = preview.subtitle ? preview.title : ''
  const downloadName = getPosterDownloadName(payload)
  const hasGenerated = Boolean(pngUrl)

  useEffect(() => {
    const onKeyDown = event => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  useEffect(() => {
    return () => {
      if (pngUrl) URL.revokeObjectURL(pngUrl)
    }
  }, [pngUrl])

  useEffect(() => {
    if (!isViewerPoster) return

    setError('')
    setPngUrl(prev => {
      if (prev) URL.revokeObjectURL(prev)
      return ''
    })
  }, [viewerId, isViewerPoster])

  const handleGenerate = async () => {
    setIsGenerating(true)
    setError('')
    setPngUrl(prev => {
      if (prev) URL.revokeObjectURL(prev)
      return ''
    })

    try {
      const url = await generatePosterPng(payload)

      if (!url) {
        setError('生成失败。可能是图片资源未能加载，或浏览器阻止了 Canvas 导出。')
        return
      }

      setPngUrl(url)
    } catch (err) {
      setError(err?.message || '生成失败，请稍后再试。')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleOpenImage = () => {
    setError('')

    if (!openImageInNewTab(pngUrl)) {
      setError('浏览器阻止了打开图片。可以长按下方预览图保存，或换用系统浏览器打开。')
    }
  }

  const handleShareImage = async () => {
    if (!pngUrl) return

    setIsSharing(true)
    setError('')

    try {
      const result = await sharePosterImage(pngUrl, downloadName)

      if (!result.ok) {
        const message = result.reason === 'files'
          ? '当前浏览器不支持直接分享图片文件。请点击“打开图片”，再长按保存。'
          : '当前浏览器不支持系统分享。请点击“打开图片”，或长按下方预览图保存。'
        setError(message)
      }
    } catch (err) {
      if (err?.name !== 'AbortError') {
        setError('分享失败。请点击“打开图片”，或长按下方预览图保存。')
      }
    } finally {
      setIsSharing(false)
    }
  }

  return (
    <div className={styles.posterOverlay} onClick={onClose}>
      <div className={cx(styles.posterPanel, isViewerPoster ? styles.posterPanelViewer : '')} onClick={event => event.stopPropagation()}>
        <div className={styles.posterHead}>
          <div>
            <div className={styles.posterKicker}>OFFICIAL TICKET ISSUER</div>
            <h2>{isViewerPoster ? '生成你的赛事见证票' : '生成你的薯条杯官方纪念票'}</h2>
            <div className={styles.posterArchiveId}>{payload.archiveId || 'FCA26-ARCHIVE'}</div>
          </div>
          <button type="button" onClick={onClose}>关闭</button>
        </div>

        <section className={styles.posterPreviewPane}>
          <div className={styles.posterPaneLabel}>LIVE TICKET PREVIEW</div>
          <div className={`${styles.posterMockTicket} ${styles[`posterTone_${payload.tone || 'gold'}`] || ''}`}>
            <div className={styles.posterMockTop}>
              <span>FRIES CUP 2026</span>
              <b>{meta.badge}</b>
            </div>

            <div className={styles.posterMockBody}>
              <div>
                <span className={styles.posterMockLabel}>{isViewerPoster ? 'EVENT / WITNESS' : 'ISSUED TO'}</span>

                <strong title={isViewerPoster ? '2026 薯条杯学院赛' : previewMainName}>
                  {isViewerPoster ? 'FCA 2026' : previewMainName}
                </strong>

                {isViewerPoster ? (
                  <em title={viewerId.trim() || 'SEASON WITNESS'}>
                    {viewerId.trim() || 'SEASON WITNESS'}
                  </em>
                ) : previewSubName ? (
                  <em title={previewSubName}>{previewSubName}</em>
                ) : null}
              </div>

              <div className={styles.posterMockRoute}>
                <span>{preview.route}</span>
                <small>{payload.achievement || 'SEASON ARCHIVE'}</small>
              </div>
            </div>

            <div className={styles.posterMockStats}>
              {preview.statRows.length ? preview.statRows.slice(0, 4).map((row, index) => (
                <div key={`${row.label}-${index}`}>
                  <b>{row.value}</b>
                  <span>{row.label}</span>
                </div>
              )) : (
                <div>
                  <b>FCA26</b>
                  <span>ARCHIVE</span>
                </div>
              )}
            </div>
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
        </section>

        <section className={styles.posterControlPane}>
          {isViewerPoster ? (
            <div className={styles.posterViewerInputCard}>
              <div className={styles.posterPaneLabel}>WITNESS ID</div>
              <label className={styles.posterViewerInputLabel} htmlFor="viewer-poster-id">
                观众战网 ID / 昵称
              </label>
              <input
                id="viewer-poster-id"
                value={viewerId}
                onChange={event => setViewerId(event.target.value)}
                placeholder="例如：你的战网ID#1234，也可以只填昵称"
              />
              <p>这个 ID 会写入赛事见证票；不填写时会生成一张通用见证票。</p>
            </div>
          ) : null}

          <div className={styles.posterActions}>
            <button type="button" onClick={handleGenerate} disabled={isGenerating || isSharing}>
              {isGenerating ? '生成中...' : '生成 PNG'}
            </button>

            {pngUrl ? (
              <a href={pngUrl} download={downloadName}>
                下载纪念票
              </a>
            ) : null}

            {pngUrl ? (
              <button type="button" onClick={handleOpenImage} disabled={isGenerating || isSharing}>
                打开图片
              </button>
            ) : null}

            {pngUrl ? (
              <button type="button" onClick={handleShareImage} disabled={isGenerating || isSharing}>
                {isSharing ? '分享中...' : '手机分享 / 保存'}
              </button>
            ) : null}
          </div>

          {error ? <div className={styles.posterError}>{error}</div> : null}

          <div className={styles.posterOutputFrame}>
            {pngUrl ? (
              <img src={pngUrl} alt="生成后的纪念票" title="手机端可以长按图片保存" className={styles.generatedPosterImage} />
            ) : (
              <div className={styles.posterOutputEmpty}>
                <b>PNG PREVIEW</b>
                <span>生成后会在这里显示完整横版纪念票</span>
              </div>
            )}
          </div>
        </section>

        <div className={styles.posterTip}>
          {isViewerPoster
            ? '观众票是签发给见证者的赛事证明。填写 ID 后，票面会带上你的观众标记。手机端可优先使用“手机分享 / 保存”，或打开图片后长按保存。'
            : '当前纪念票为横版 PNG。电脑端可直接下载；手机端如浏览器拦截下载，可使用“手机分享 / 保存”，或打开图片后长按保存。'}
        </div>
      </div>
    </div>
  )
}

export default function ReviewStoryPage({ storyType }) {
  const params = useParams()
  const [searchParams] = useSearchParams()
  const perspective = searchParams.get('as') || 'team'

  const [db, setDb] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [index, setIndex] = useState(0)
  const [touchStartX, setTouchStartX] = useState(null)
  const [showPoster, setShowPoster] = useState(false)

  useEffect(() => {
    let alive = true

    getDb()
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
  }, [])

  const scenes = useMemo(() => {
    if (!db) return []

    if (storyType === 'player') return buildPlayerStory(db, params.playerId)
    if (storyType === 'team') return buildTeamStory(db, params.teamId, perspective)
    if (storyType === 'staff') return buildStaffStory(db, params.staffType, params.staffKey)
    if (storyType === 'tournament') return buildTournamentStory(db)

    return []
  }, [db, storyType, params.playerId, params.teamId, params.staffType, params.staffKey, perspective])

  useEffect(() => {
    setIndex(0)
    setShowPoster(false)
  }, [storyType, params.playerId, params.teamId, params.staffType, params.staffKey, perspective])

  const current = scenes[index]
  const progress = scenes.length > 0 ? ((index + 1) / scenes.length) * 100 : 0
  const isEnding = index === scenes.length - 1

  const goPrev = () => setIndex(prev => Math.max(0, prev - 1))

  const goNext = () => {
    if (!scenes.length) return

    setIndex(prev => {
      if (prev >= scenes.length - 1) {
        setShowPoster(true)
        return prev
      }

      return prev + 1
    })
  }

  useEffect(() => {
    const onKeyDown = event => {
      if (showPoster) return

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
  }, [scenes.length, showPoster])

  const handleTouchEnd = event => {
    if (showPoster) return
    if (touchStartX === null) return

    const endX = event.changedTouches?.[0]?.clientX
    const diff = Number(endX) - Number(touchStartX)

    if (Math.abs(diff) > 42) {
      if (diff < 0) goNext()
      else goPrev()
    }

    setTouchStartX(null)
  }

  if (loading) {
    return (
      <div className={styles.fullscreen}>
        <div className={styles.systemBox}>正在打开赛季回顾...</div>
      </div>
    )
  }

  if (error || !current) {
    return (
      <div className={styles.fullscreen}>
        <div className={styles.systemBox}>
          <div>{error || '没有找到这份赛季回顾。'}</div>
          <Link to="/review">返回回顾中心</Link>
        </div>
      </div>
    )
  }

  return (
    <div
      className={styles.fullscreen}
      onTouchStart={event => setTouchStartX(event.touches?.[0]?.clientX ?? null)}
      onTouchEnd={handleTouchEnd}
    >
      <div className={styles.bgGlow}></div>
      <Link to="/review" className={styles.closeBtn}>退出</Link>

      <div className={styles.desktopHint}>点击右侧继续 · 点击左侧返回 · 支持键盘 ← →</div>

      <div className={styles.storyFrame}>
        <div className={styles.segmentProgress}>
          {scenes.map((_, i) => (
            <div key={i} className={styles.segment}>
              <div className={styles.segmentFill} style={{ width: i <= index ? '100%' : '0%' }} />
            </div>
          ))}
        </div>

        <div className={styles.progressText}>
          <span className={styles.brandStack}>
            <b>FRIES CUP 2026</b>
          </span>
          <span>{index + 1} / {scenes.length}</span>
        </div>

        <StoryScene
          scene={current}
          sceneKey={`${index}-${current.title}`}
          currentIndex={index}
          total={scenes.length}
        />

        <div className={styles.footer}>
          <button type="button" onClick={goPrev} disabled={index === 0}>上一幕</button>

          {isEnding ? (
            <button type="button" className={styles.posterBtn} onClick={() => setShowPoster(true)}>
              生成纪念票
            </button>
          ) : (
            <button type="button" onClick={goNext}>下一幕</button>
          )}
        </div>

        <button type="button" className={styles.tapLeft} onClick={goPrev} aria-label="上一幕"></button>
        <button type="button" className={styles.tapRight} onClick={goNext} aria-label="下一幕"></button>
      </div>

      <div className={styles.progressRail}>
        <div className={styles.progressRailFill} style={{ height: `${progress}%` }}></div>
      </div>

      {showPoster ? (
        <PosterModal
          scenes={scenes}
          storyType={storyType}
          perspective={perspective}
          staffType={params.staffType}
          onClose={() => setShowPoster(false)}
        />
      ) : null}
    </div>
  )
}
