import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { getSeasonById, seasonHasReview } from '../src/config/seasons.js'
import { buildCinemaReviewScenes } from '../src/lib/reviewCinema.js'
import { getReviewIdentityEntries, getReviewIdentityPortfolio } from '../src/lib/reviewIdentity.js'
import { getReviewReadiness } from '../src/lib/reviewReadiness.js'
import { localizeReviewScenes, reviewText } from '../src/lib/reviewLocale.js'
import { ensureUiLocale, ensureTraditionalReview } from '../src/lib/localeCatalog.js'
import { buildReviewEntryPath, buildReviewPath } from '../src/lib/reviewNavigation.js'
import { DIRECTOR_CUT_HERO_MARKS, getCinemaTicketData, getDirectorCutEmblemLayout, getDirectorCutIdentityLayout, getDirectorCutFooterLayout, getDirectorCutPortraitMask, getFilmStageLabels, getPosterPayload } from '../src/lib/reviewPoster.js'
import { getStaffAvatar, getTeamLogoCandidates, heroNameToSlug } from '../src/lib/reviewAssets.js'
import {
  DIRECTOR_CUT_HERO_CATALOG,
  DIRECTOR_CUT_STAGE_AUDIT_VERSION,
  applyDirectorCutSelection,
  getDirectorCutEdition,
  getDirectorCutHeroOptions,
  getDirectorCutSelection
} from '../src/lib/directorCutProfiles.js'
import { DIRECTOR_CUT_LINE_DIRECTIONS } from '../src/lib/directorCutLineDirections.js'
import { DIRECTOR_CUT_AMBIENT_FIELDS } from '../src/lib/directorCutAmbientFields.js'
import { DIRECTOR_CUT_EMBLEM_FRAMES } from '../src/lib/directorCutEmblemFrames.js'
import { DIRECTOR_CUT_STORY_SIGNATURES } from '../src/lib/directorCutStorySignatures.js'
import {
  buildStaffIndex,
  getReviewSearchResults,
  getUnifiedReviewSearchResults
} from '../src/lib/reviewSearch.js'
import { getLocalizedReviewSeasonProfile, prepareReviewDb } from '../src/lib/reviewSeason.js'
import {
  buildPersonStory,
  buildPlayerStory,
  buildStaffStory,
  buildTeamStory,
  buildTournamentStory
} from '../src/lib/reviewStoryBuilders.js'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
await Promise.all(['en-US', 'ko-KR', 'zh-TW'].map(ensureUiLocale))
await ensureTraditionalReview()
const snapshotPath = path.join(repoRoot, 'public', 'data', 'fcr2026_local_public.json')
const publicRoot = path.join(repoRoot, 'public')
const errors = []
const warnings = []
const notes = []
const storyStats = []
const releaseValidation = {
  firstMatchChecks: 0,
  localizedStories: 0,
  directorAutoEligiblePlayers: 0,
  directorAutoHeroChecks: 0,
  directorCatalogRoundTrips: 0
}
const assetReferences = new Set()
const DEFAULT_TEAM_MARKS = new Set(['/logos/FCR/OW.png', '/logos/fc_logo.png'])

function safeArr(value) {
  return Array.isArray(value) ? value : []
}

function normalize(value) {
  return String(value || '').trim().toLocaleLowerCase('en-US')
}

function getVisualTextLength(value) {
  return [...String(value || '')]
    .reduce((total, char) => total + ((char.codePointAt(0) || 0) > 255 ? 2 : 1), 0)
}

function getTeamId(row) {
  return row?.team_id || row?.id || row?.team_short_name || row?.short || row?.team_name || row?.name || ''
}

function getTeamShortName(row) {
  return row?.team_short_name || row?.short || row?.short_name || row?.team_name || row?.name || getTeamId(row)
}

function getPublicAssetPath(reference) {
  if (!reference || !String(reference).startsWith('/')) return ''

  let decoded = String(reference).split(/[?#]/, 1)[0]
  try {
    decoded = decodeURIComponent(decoded)
  } catch {
    return ''
  }

  return path.join(publicRoot, decoded.replace(/^\/+/, ''))
}

function publicAssetExists(reference) {
  const absolutePath = getPublicAssetPath(reference)
  return Boolean(absolutePath && fs.existsSync(absolutePath))
}

function collectAssetReferences(value) {
  if (typeof value === 'string') {
    if (/^\/(?:casters|heroes|logos|maps|roster|review\/(?:hero-renders|staff-portraits))\//.test(value)) {
      assetReferences.add(value.split(/[?#]/, 1)[0])
    }
    return
  }

  if (Array.isArray(value)) {
    value.forEach(collectAssetReferences)
    return
  }

  if (value && typeof value === 'object') {
    Object.values(value).forEach(collectAssetReferences)
  }
}

function auditStory(label, scenes) {
  if (!Array.isArray(scenes) || !scenes.length) {
    errors.push(`${label}: no scenes were generated`)
    return
  }

  const serialized = JSON.stringify(scenes)
  if (/\b(?:undefined|NaN)\b|\[object Object\]/.test(serialized)) {
    errors.push(`${label}: contains an invalid serialized value`)
  }

  scenes.forEach((scene, index) => {
    if (!String(scene?.title || '').trim()) {
      errors.push(`${label}: scene ${index + 1} has no title`)
    }
  })

  collectAssetReferences(scenes)
  collectAssetReferences(getPosterPayload(scenes))
  auditReleaseContent(label, scenes)
  storyStats.push({ label, scenes: scenes.length })
}

function auditReleaseContent(label, scenes) {
  const basePayload = getPosterPayload(scenes)
  const baseTicket = getCinemaTicketData({ ...basePayload, locale: 'zh-CN' })
  if (basePayload.playerTicket?.coverageLevel === 'roster' && getFilmStageLabels(basePayload).includes('PLAYOFFS')) {
    errors.push(`${label}: a roster-only poster implies a playoff appearance`)
  }
  const firstMatchId = scenes[0]?.firstMatchId
  if (firstMatchId) {
    const match = raw.matches.find(item => (item.match_id || item.id) === firstMatchId)
    const timestamp = Date.parse(match?.scheduled_at || '')
    if (!Number.isFinite(timestamp)) {
      errors.push(`${label}: first record does not resolve to a scheduled archive match`)
    } else {
      const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
      }).formatToParts(new Date(timestamp)).map(part => [part.type, part.value]))
      if (baseTicket.showDate !== `${parts.year}.${parts.month}.${parts.day}` || baseTicket.showtime !== `${parts.hour}:${parts.minute}`) {
        errors.push(`${label}: movie ticket date and time do not match first archive record ${firstMatchId}`)
      }
      releaseValidation.firstMatchChecks += 1
    }
  }

  for (const locale of ['en-US', 'ko-KR', 'zh-TW']) {
    const localized = localizeReviewScenes(scenes, locale, getLocalizedReviewSeasonProfile('FCR26', locale))
    // The page supplies its explicit identity to the poster, independent of translated copy.
    const payload = getPosterPayload(localized.map((scene, index) => index === 0 ? { ...scene, cardKind: basePayload.cardKind } : scene))
    const ticket = getCinemaTicketData({ ...payload, locale })
    for (const key of ['showDate', 'showtime', 'screen', 'gate', 'row', 'seat']) {
      if (ticket[key] !== baseTicket[key]) errors.push(`${label}:${locale}: localization changed movie ticket ${key}`)
    }
    const numbers = value => JSON.stringify(String(value ?? '').match(/\d+(?:\.\d+)?/g) || [])
    ticket.stats.forEach((stat, index) => {
      // Final ranks may spell out a placing; the other stats must keep their recorded numbers.
      if (!/BILLING/.test(stat.label) && numbers(stat.value) !== numbers(baseTicket.stats[index]?.value)) {
        errors.push(`${label}:${locale}: localization changed movie ticket statistic ${index + 1}`)
      }
    })
    if (JSON.stringify(getFilmStageLabels(payload)) !== JSON.stringify(getFilmStageLabels(basePayload))) {
      errors.push(`${label}:${locale}: localization changed the recorded film stages`)
    }

    localized.forEach((scene, index) => {
      const labels = [scene.metricLabel, scene.coverRole, scene.coverHeroName, scene.identityClass,
        ...safeArr(scene.statLines).map(item => item.label),
        ...safeArr(scene.dataBars).flatMap(item => [item.displayValue, item.note]),
        ...safeArr(scene.witnessStats).flatMap(item => [item.label, item.meta]),
        scene.witnessPrompt?.title, scene.witnessPrompt?.body]
      if (scene.visualType === 'roleMemory') labels.push(...safeArr(scene.dataBars).map(item => item.label))
      const untranslated = locale === 'zh-TW' ? [] : labels.filter(value => /[\u4e00-\u9fff]/.test(String(value || '')))
      if (untranslated.length) errors.push(`${label}:${locale}: scene ${index + 1} has untranslated interface copy: ${untranslated.join(' / ')}`)
      for (const key of ['teamCards', 'playerCards', 'rosterCards', 'partnerCards', 'crossPartnerCards']) {
        if (JSON.stringify(safeArr(scene[key]).map(card => card.title)) !== JSON.stringify(safeArr(scenes[index]?.[key]).map(card => card.title))) {
          errors.push(`${label}:${locale}: translated a person or team name in ${key}`)
        }
      }
    })
    releaseValidation.localizedStories += 1
  }
}

function auditStaffPresentation(identity, staff, scenes) {
  const staffName = String(staff?.staff_name || '').trim()
  const cover = safeArr(scenes).find(scene => scene?.kind === 'cover')
  const ending = [...safeArr(scenes)].reverse().find(scene => scene?.kind === 'ending')
  const presentationScenes = [cover, ending].filter(Boolean)
  const expectedFallbackLabel = identity === 'caster' ? 'VOICE ARCHIVE' : 'BEHIND THE MATCH'
  const avatar = getStaffAvatar(staffName)
  const isIntentionalNoAvatar = normalize(staffName) === 'star'

  if (!cover || !ending) {
    errors.push(`staff:${identity}:${staffName || 'unknown'}: missing cover or ending presentation`)
    return
  }

  if (presentationScenes.some(scene => scene?.visualFallbackLabel !== expectedFallbackLabel)) {
    errors.push(`staff:${identity}:${staffName}: inconsistent archive fallback label`)
  }

  if (isIntentionalNoAvatar) {
    if (presentationScenes.some(scene => String(scene?.image || '').trim())) {
      errors.push(`staff:${identity}:star: intentional no-avatar story unexpectedly received an image`)
    }
    if (presentationScenes.some(scene => normalize(scene?.visualFallback) !== 'star')) {
      errors.push(`staff:${identity}:star: no-avatar story is missing its explicit archive fallback`)
    }
  } else if (avatar && publicAssetExists(avatar) && presentationScenes.some(scene => !String(scene?.image || '').trim())) {
    errors.push(`staff:${identity}:${staffName}: usable avatar was not carried into cover and ending scenes`)
  }

  const shouldUseBriefStory = Number(staff?.match_count || 0) <= 2
  if (shouldUseBriefStory && safeArr(scenes).length >= 10) {
    errors.push(`staff:${identity}:${staffName}: brief record expanded to ${scenes.length} scenes`)
  }
}

function auditPlayerPresentation(playerId, scenes) {
  const storyScenes = safeArr(scenes)
  const cover = storyScenes.find(scene => scene?.kind === 'cover')
  const ending = [...storyScenes].reverse().find(scene => scene?.kind === 'ending')
  const roleMemory = storyScenes.find(scene => scene?.eyebrow === 'ROLE MEMORY')
  const shortTrace = storyScenes.find(scene => scene?.eyebrow === 'A SHORT TRACE')
  const rosterMemory = storyScenes.find(scene => scene?.eyebrow === 'BEYOND THE NUMBERS')
  const branchScenes = [roleMemory, shortTrace, rosterMemory].filter(Boolean)

  if (!cover || !ending) {
    errors.push(`player:${playerId}: missing cover or ending presentation`)
  }

  if (branchScenes.length !== 1) {
    errors.push(`player:${playerId}: expected exactly one full, brief, or roster branch; found ${branchScenes.length}`)
    return ''
  }

  if (roleMemory) {
    const cinemaScenes = buildCinemaReviewScenes(storyScenes, { isRegular: true, locale: 'zh-CN' })
    const cinemaRoleMemory = cinemaScenes.find(scene => scene?.eyebrow === 'ROLE MEMORY')
    if (cinemaRoleMemory?.visualType !== 'roleMemory') {
      errors.push(`player:${playerId}: ROLE MEMORY did not resolve to the shared roleMemory layout`)
    }
    if (safeArr(roleMemory.dataBars).length < 3) {
      errors.push(`player:${playerId}: ROLE MEMORY is missing its comparison bars`)
    }
    if (safeArr(roleMemory.statLines).length !== 3) {
      errors.push(`player:${playerId}: ROLE MEMORY should expose three compact stat cards`)
    }
    if (roleMemory?.dataComparison?.kind !== 'role-percentile') {
      errors.push(`player:${playerId}: ROLE MEMORY is missing its role-percentile explanation`)
    }
    if (Number(roleMemory?.dataComparison?.sampleSize || 0) < 4) {
      errors.push(`player:${playerId}: ROLE MEMORY comparison sample is too small or missing`)
    }
    if (Number(roleMemory?.dataComparison?.minimumMinutes) !== 20) {
      errors.push(`player:${playerId}: ROLE MEMORY comparison threshold should be 20 minutes`)
    }
    return 'full'
  }

  if (shortTrace) {
    if (safeArr(shortTrace.statLines).length !== 3) {
      errors.push(`player:${playerId}: A SHORT TRACE should expose three compact archive coordinates`)
    }
    return 'brief'
  }

  if (safeArr(rosterMemory?.statLines).length !== 3) {
    errors.push(`player:${playerId}: BEYOND THE NUMBERS should expose three roster coordinates`)
  }
  return 'roster'
}

function auditMovieTicketPresentation(playerId, scenes) {
  const cinemaScenes = buildCinemaReviewScenes(scenes, { isRegular: true, locale: 'zh-CN' })
  const payload = getPosterPayload(cinemaScenes)
  const ticket = getCinemaTicketData({ ...payload, locale: 'zh-CN' })
  const source = payload?.playerTicket || {}
  const mapCount = Number.parseFloat(String(source?.mapCount ?? '').replace(/[^0-9.-]/g, '')) || 0
  const matchCount = Number.parseFloat(String(source?.matchCount ?? '').replace(/[^0-9.-]/g, '')) || 0
  const minutes = Number.parseFloat(String(source?.minutes ?? '').replace(/[^0-9.-]/g, '')) || 0
  const minuteText = Number.isInteger(minutes) ? String(minutes) : String(Math.round(minutes * 10) / 10)
  const serializedStats = JSON.stringify(ticket?.stats || [])
  const mapStat = safeArr(ticket?.stats).find(item => String(item?.label || '').includes('REELS'))
  const playtimeStat = safeArr(ticket?.stats).find(item => String(item?.label || '').includes('PLAYTIME'))
  const expectedSeat = String(Math.max(0, Math.round(mapCount))).padStart(2, '0')
  const expectedOpening = String(source?.routeStartLabel || source?.routeDateRange || '').match(/20\d{2}\.(\d{2})\.(\d{2})/)
  const expectedClosingMatches = [...String(source?.routeEndLabel || source?.routeDateRange || '').matchAll(/20\d{2}\.(\d{2})\.(\d{2})/g)]
  const expectedClosing = expectedClosingMatches[expectedClosingMatches.length - 1]
  const sourceShowtime = String(source?.firstMatchTime || '').match(/\b(?:[01]?\d|2[0-3]):[0-5]\d\b/)?.[0]
  const allowedScreens = new Set(['APEX', 'PREMIERE', 'SPOTLIGHT', 'CLASSIC', 'ARCHIVE'])
  const isFinalist = /冠军|亚军|CHAMPION|FINALIST|RUNNER.?UP/i.test(`${source?.rank || ''} ${payload?.achievement || ''}`)
  const expectedActLabel = isFinalist
    ? 'FINAL ACT'
    : cinemaScenes.some(scene => scene?.seasonAct === 'playoffs')
      ? 'ACT II · PLAYOFFS'
      : 'ACT I · OPEN QUALIFIER'

  if (!ticket?.title || !ticket?.secondary || safeArr(ticket?.stats).length !== 3) {
    errors.push(`player:${playerId}: movie ticket is missing its identity or three-stat layout`)
  }
  if (/片长|RUNTIME/.test(serializedStats)) {
    errors.push(`player:${playerId}: movie ticket still labels player minutes as runtime`)
  }
  if (!playtimeStat) {
    errors.push(`player:${playerId}: movie ticket is missing its playtime stat`)
  }
  if (ticket?.copy?.selectionValues?.player !== '正式收录') {
    errors.push(`player:${playerId}: movie ticket is missing the archive entry label`)
  }
  if (mapCount > 0) {
    if (!String(ticket?.note || '').includes(String(mapCount)) || !String(ticket?.note || '').includes(String(ticket?.title || ''))) {
      errors.push(`player:${playerId}: movie ticket logline is not generated from the player's map archive`)
    }
    if (matchCount > 0 && !String(ticket?.note || '').includes(`${matchCount} 场比赛`)) {
      errors.push(`player:${playerId}: movie ticket logline is missing the player's recorded match count`)
    }
    if (minutes > 0 && !String(ticket?.note || '').includes(`${minuteText} 分钟`)) {
      errors.push(`player:${playerId}: movie ticket logline is missing the player's recorded playtime`)
    }
  } else if (!String(ticket?.note || '').includes('阵容档案')) {
    errors.push(`player:${playerId}: zero-map movie ticket is missing its roster archive fallback`)
  }
  if (source?.team && !/^(?:ARCHIVE|SEASON ARCHIVE)$/i.test(String(source.team)) && !String(ticket?.note || '').includes(String(source.team))) {
    errors.push(`player:${playerId}: movie ticket proof line is missing the player's team identity`)
  }
  const proofLines = String(ticket?.note || '').split('\n')
  if (proofLines.length > 2 || proofLines.some(line => getVisualTextLength(line) > 48)) {
    errors.push(`player:${playerId}: movie ticket proof line is too dense for social-share rendering`)
  }
  if (mapCount === 0 && String(mapStat?.value) !== '0') {
    errors.push(`player:${playerId}: zero-map movie ticket did not preserve its 0 map count`)
  }
  if (!allowedScreens.has(String(ticket?.screen || ''))) {
    errors.push(`player:${playerId}: movie ticket screen is not a season hall name`)
  }
  if (ticket?.actLabel !== expectedActLabel || ticket?.selectionEdition !== expectedActLabel) {
    errors.push(`player:${playerId}: movie ticket act label should be ${expectedActLabel}`)
  }
  if (String(ticket?.seat || '') !== expectedSeat) {
    errors.push(`player:${playerId}: movie ticket seat does not encode the player's map count`)
  }
  if (expectedOpening && ticket?.openingCode !== `${expectedOpening[1]}:${expectedOpening[2]}`) {
    errors.push(`player:${playerId}: movie ticket opening does not encode the first archive date`)
  }
  if (expectedClosing && ticket?.closingCode !== `${expectedClosing[1]}:${expectedClosing[2]}`) {
    errors.push(`player:${playerId}: movie ticket closing does not encode the final archive date`)
  }
  if (sourceShowtime && ticket?.showtime !== sourceShowtime) {
    errors.push(`player:${playerId}: movie ticket record time does not use the scheduled first match time`)
  }
  if (!/^A .+ PRODUCTION$/i.test(String(ticket?.productionLine || ''))) {
    errors.push(`player:${playerId}: movie ticket is missing its team production credit`)
  }
  if (ticket?.formatLine !== 'FCRSCOPE 2.39:1 · TEAM COMMS 5.1 · BASED ON RECORDED MATCHES') {
    errors.push(`player:${playerId}: movie ticket is missing its original cinema format easter egg`)
  }
  if (mapCount === 0 && ticket?.cutLabel !== 'ARCHIVE CUT') {
    errors.push(`player:${playerId}: zero-map movie ticket is not labeled as an archive cut`)
  }
  if (mapCount > 0 && source?.topMap && !String(ticket?.locationLine || '').includes(String(source.topMap))) {
    errors.push(`player:${playerId}: movie ticket location does not use the signature map`)
  }
  if (safeArr(source?.matchResults).length && safeArr(ticket?.matchResults).length !== safeArr(source?.matchResults).length) {
    errors.push(`player:${playerId}: movie ticket film strip lost the match result sequence`)
  }
  const companionScene = scenes.find(scene => String(scene?.eyebrow || '').toUpperCase().includes('NAMES BESIDE YOU'))
  const firstCompanion = safeArr(companionScene?.rosterCards)[0]?.title
  const coStarGroup = safeArr(ticket?.creditGroups).find(group => group?.label === 'CO-STARRING')
  const coStarNames = coStarGroup?.names
  if (firstCompanion && !safeArr(coStarNames).includes(firstCompanion)) {
    errors.push(`player:${playerId}: movie ticket credits are missing the leading co-star`)
  }
  if (coStarGroup && coStarGroup.displayLabel !== '队友 / CO-STARS') {
    errors.push(`player:${playerId}: movie ticket co-stars are not labeled as teammates for Chinese readers`)
  }
  const heroCreditGroup = safeArr(ticket?.creditGroups).find(group => group?.label === 'FEATURING')
  if (heroCreditGroup && heroCreditGroup.displayLabel !== '英雄 / HEROES') {
    errors.push(`player:${playerId}: movie ticket featured cast is not labeled as heroes for Chinese readers`)
  }
}

function makeIncompleteSnapshot(raw) {
  const matches = safeArr(raw?.matches).filter(match => String(match?.stage || '').toUpperCase() === 'SWISS').slice(0, 19)

  return {
    ...raw,
    updated_at: '2026-07-01T00:00:00.000Z',
    review_ready_at: '2026-07-01T00:00:00.000Z',
    matches,
    meta: {
      ...(raw?.meta || {}),
      match_count: matches.length,
      map_count: 40,
      ranking_as_of: '2026-07-01T00:00:00.000Z'
    }
  }
}

function auditSearch(db) {
  const identities = ['player', 'teamStaff', 'admin', 'caster']

  const assertUniqueRoutes = (identity, query, results) => {
    const routes = results.map(result => result?.to).filter(Boolean)
    const duplicateRoutes = routes.filter((route, index) => routes.indexOf(route) !== index)
    if (duplicateRoutes.length) {
      errors.push(`search:${identity}:${query || 'default'}: ${new Set(duplicateRoutes).size} duplicate route(s)`)
    }
  }

  identities.forEach(identity => {
    const results = getReviewSearchResults(db, identity, '')
    if (!results.length) errors.push(`search:${identity}: no default results`)

    results.forEach(result => {
      if (!String(result?.to || '').startsWith('/review/story/')) {
        errors.push(`search:${identity}: invalid story route for ${result?.title || result?.id || 'unknown result'}`)
      }
    })

    assertUniqueRoutes(identity, '', results)
  })

  const genericTeamResult = getReviewSearchResults(db, 'teamStaff', '')
    .find(result => /^\/review\/story\/team\/[^?]+$/.test(String(result?.to || '')))
  if (!genericTeamResult) {
    errors.push('search:teamStaff: no generic team review result')
  } else if (
    !String(genericTeamResult?.subtitle || '').includes('队伍赛季回顾')
    || /经理|教练/.test(String(genericTeamResult?.subtitle || ''))
  ) {
    errors.push(`search:teamStaff: generic team subtitle still implies a staff identity: ${genericTeamResult?.subtitle || '-'}`)
  }

  if (getUnifiedReviewSearchResults(db, '').length) {
    errors.push('search:all: empty query should not return results')
  }

  const unifiedQueries = [
    db?.players?.[0]?.battle_tag || db?.players?.[0]?.display_name,
    db?.teams?.[0]?.team_short_name
  ].filter(Boolean)

  unifiedQueries.forEach(query => {
    const results = getUnifiedReviewSearchResults(db, query)
    if (!results.length) errors.push(`search:all:${query}: no result`)
    if (results.some(result => !identities.includes(result?.identity))) {
      errors.push(`search:all:${query}: result missing a valid identity label`)
    }
    assertUniqueRoutes('all', query, results)
  })

  safeArr(db?.review_identity_records)
    .filter(entry => entry?.identityType === 'manager' || entry?.identityType === 'coach')
    .forEach(entry => {
      const queries = [entry?.displayName, entry?.battleTag].filter(Boolean)
      queries.forEach(query => {
        const results = getReviewSearchResults(db, 'teamStaff', query)
        assertUniqueRoutes('teamStaff', query, results)
        if (!results.length) errors.push(`search:teamStaff:${query}: no result`)
      })
    })

  ;[
    { query: '十四岁想打职业', title: 'LIP', battleTag: '十四岁想打职业#5491' },
    { query: '墨白灬雾崎', title: '墨白', battleTag: '墨白灬雾崎#5196' }
  ].forEach(({ query, title, battleTag }) => {
    const results = getUnifiedReviewSearchResults(db, query)
    const coachResults = results.filter(result => result?.label === '教练视角')
    const decodedRoutes = coachResults.map(result => decodeURIComponent(result?.to || ''))

    if (coachResults.length !== 1) {
      errors.push(`search:split-coach:${query}: expected one coach result, got ${coachResults.length}`)
      return
    }

    if (coachResults[0]?.title !== title || !decodedRoutes[0]?.includes(`who=${battleTag}`)) {
      errors.push(`search:split-coach:${query}: resolved to ${coachResults[0]?.title || '-'} / ${decodedRoutes[0] || '-'}`)
    }

    if (coachResults.some(result => String(result?.title || '').includes('/'))) {
      errors.push(`search:split-coach:${query}: legacy composite identity is still visible`)
    }
  })

  const staffIndex = buildStaffIndex(db)
  ;[
    ['admin', staffIndex.admins],
    ['caster', staffIndex.casters]
  ].forEach(([identity, staffRows]) => {
    staffRows.forEach(staff => {
      const results = getReviewSearchResults(db, identity, staff.staff_name)
      assertUniqueRoutes(identity, staff.staff_name, results)
      if (results.length !== 1 || results[0]?.to !== `/review/story/staff/${identity}/${encodeURIComponent(staff.staff_name)}`) {
        errors.push(`search:${identity}:${staff.staff_name}: expected one direct identity result, got ${results.length}`)
      }
    })
  })
}

function auditCinemaChapters() {
  const cover = { kind: 'cover', visualType: 'cover', title: '档案封面' }
  const qualifier = { kind: 'narrative', visualType: 'firstStep', title: '公开预选赛第一场' }
  const playoffs = { kind: 'narrative', visualType: 'keyMatch', title: '淘汰赛关键战', chips: ['季后赛'] }
  const playoffIntroduction = { kind: 'narrative', title: '你的赛季，从季后赛这一章开始', chips: ['季后赛引入'] }
  const ending = { kind: 'ending', visualType: 'final', title: '赛季结束' }
  const getActs = scenes => buildCinemaReviewScenes(scenes, { isRegular: true, locale: 'zh-CN' })
    .filter(scene => scene?.visualType === 'actTitle')
    .map(scene => scene.seasonAct)

  const qualifierActs = getActs([cover, qualifier, ending])
  if (qualifierActs.join(',') !== 'qualifier') {
    errors.push(`cinema: qualifier-only story produced ${qualifierActs.join(',') || 'no'} chapter(s)`)
  }

  const playoffActs = getActs([cover, playoffs, ending])
  if (playoffActs.join(',') !== 'playoffs') {
    errors.push(`cinema: playoff-only story produced ${playoffActs.join(',') || 'no'} chapter(s)`)
  }

  const introductionActs = getActs([cover, qualifier, playoffIntroduction, ending])
  if (introductionActs.join(',') !== 'playoffs') {
    errors.push(`cinema: playoff-introduction story produced ${introductionActs.join(',') || 'no'} chapter(s)`)
  }

  const fullActs = getActs([cover, qualifier, playoffs, ending])
  if (fullActs.join(',') !== 'qualifier,playoffs') {
    errors.push(`cinema: full story produced ${fullActs.join(',') || 'no'} chapter(s)`)
  }

  const cinemaScenes = buildCinemaReviewScenes([cover, qualifier, playoffs, ending], { isRegular: true, locale: 'zh-CN' })
  if (cinemaScenes.some((scene, index) => scene.sceneNo !== index + 1)) {
    errors.push('cinema: scene numbering is not continuous after chapter insertion')
  }
  if (cinemaScenes.filter(scene => scene.visualType === 'actTitle').some(scene => !scene.excludeFromPoster)) {
    errors.push('cinema: chapter transition leaked into keepsake poster data')
  }
}

function auditAssets() {
  const missing = []

  assetReferences.forEach(reference => {
    let decoded = reference
    try {
      decoded = decodeURIComponent(reference)
    } catch {
      warnings.push(`asset: could not decode ${reference}`)
    }

    const absolutePath = path.join(publicRoot, decoded.replace(/^\/+/, ''))
    if (!fs.existsSync(absolutePath)) missing.push(reference)
  })

  const hardMissing = missing.filter(reference => /^\/(?:heroes|maps|review\/hero-renders)\//.test(reference))
  hardMissing.forEach(reference => errors.push(`asset: missing ${reference}`))

  const fallbackMissing = missing.filter(reference => !hardMissing.includes(reference))
  if (fallbackMissing.length) {
    notes.push(
      `asset: ${fallbackMissing.length} intentionally optional logo/caster/roster reference(s) use UI fallbacks`
    )
  }

  if (!fs.existsSync(path.join(publicRoot, 'logos', 'fc_logo.png'))) {
    errors.push('asset: default /logos/fc_logo.png is missing')
  }

  return { checked: assetReferences.size, missing: missing.length }
}

function auditGenericCoverage(db, teamIds, staffIndex, identityEntries) {
  const teamRows = [...safeArr(db?.teams), ...safeArr(db?.team_reviews)]
  const teamCoverage = teamIds.map(teamId => {
    const row = teamRows.find(candidate => String(getTeamId(candidate)) === String(teamId)) || {}
    const reviewRow = safeArr(db?.team_reviews)
      .find(candidate => String(getTeamId(candidate)) === String(teamId)) || {}
    const shortName = getTeamShortName(row)
    const realLogo = getTeamLogoCandidates(shortName, 'FCR26')
      .filter(candidate => !DEFAULT_TEAM_MARKS.has(candidate))
      .find(publicAssetExists) || ''
    const scenes = buildTeamStory(db, teamId)
    const payload = getPosterPayload(scenes)
    const mapMemory = scenes.find(scene => scene?.eyebrow === 'MAPS REMEMBER')
    const expectedMaps = Number(reviewRow?.season_record?.maps_played ?? reviewRow?.maps_played ?? 0)
    const mapBarTotal = safeArr(mapMemory?.dataBars)
      .reduce((sum, item) => sum + Number(item?.value || 0), 0)
    const mapStat = safeArr(payload?.identityTicket?.stats)
      .find(item => String(item?.label || '').toUpperCase().includes('MAP'))

    if (payload?.cardKind !== 'team') {
      errors.push(`coverage: team ${teamId} produced ${payload?.cardKind || 'no'} poster kind`)
    }
    if (!payload?.identityTicket?.teamFullName) {
      errors.push(`coverage: team ${teamId} poster is missing its full team name`)
    }
    if (!mapStat || mapStat.value === undefined || mapStat.value === null || String(mapStat.value).trim() === '') {
      errors.push(`coverage: team ${teamId} poster is missing its MAPS stat`)
    }
    if (!mapMemory) {
      errors.push(`coverage: team ${teamId} is missing its MAPS REMEMBER scene`)
    } else if (mapBarTotal !== expectedMaps) {
      errors.push(`coverage: team ${teamId} map bars total ${mapBarTotal} instead of ${expectedMaps} distinct maps`)
    }

    const genericIdentityText = JSON.stringify([
      scenes.find(scene => scene?.kind === 'cover'),
      scenes.find(scene => scene?.eyebrow === 'NOT ALONE')
    ])
    if (/经理身份|两个身份|经理署名|经理\s*\/\s*教练视角/.test(genericIdentityText)) {
      errors.push(`coverage: team ${teamId} generic story still implies a manager or coach identity`)
    }

    return {
      id: teamId,
      shortName,
      fullName: payload?.identityTicket?.teamFullName || '',
      realLogo,
      posterImage: payload?.image || ''
    }
  })

  const teamsWithRealLogo = teamCoverage.filter(team => team.realLogo)
  const teamsUsingOwFallback = teamCoverage.filter(team => !team.realLogo)
  if (!teamsWithRealLogo.length) errors.push('coverage: no team with a real logo was found')
  if (!teamsUsingOwFallback.length) errors.push('coverage: no team using the OW fallback was found')
  if (!publicAssetExists('/logos/FCR/OW.png')) errors.push('coverage: OW default team mark is missing')

  const staffRows = [...safeArr(staffIndex?.admins), ...safeArr(staffIndex?.casters)]
  const uniqueStaff = [...new Map(staffRows.map(staff => [normalize(staff?.staff_name), staff])).values()]
  const staffWithoutAvatar = uniqueStaff.filter(staff => {
    const avatar = getStaffAvatar(staff?.staff_name)
    return !avatar || !publicAssetExists(avatar)
  })
  const unexpectedMissingStaff = staffWithoutAvatar.filter(staff => normalize(staff?.staff_name) !== 'star')
  unexpectedMissingStaff.forEach(staff => {
    errors.push(`coverage: staff ${staff?.staff_name || 'unknown'} has no usable avatar`)
  })

  const star = uniqueStaff.find(staff => normalize(staff?.staff_name) === 'star')
  if (star && getStaffAvatar(star.staff_name)) {
    errors.push('coverage: star should keep the intentional no-avatar treatment')
  }

  const longIdentity = safeArr(identityEntries)
    .map(entry => ({
      id: entry?.playerId || entry?.teamId || entry?.battleTag || entry?.displayName || '',
      label: entry?.battleTag || entry?.displayName || entry?.teamName || '',
      length: [...String(entry?.battleTag || entry?.displayName || entry?.teamName || '')].length
    }))
    .sort((a, b) => b.length - a.length)[0] || { id: '', label: '', length: 0 }
  if (!longIdentity.length) errors.push('coverage: no long identity sample was found')

  return {
    teamsWithRealLogo: teamsWithRealLogo.length,
    teamsUsingOwFallback: teamsUsingOwFallback.length,
    owFallbackTeams: teamsUsingOwFallback.map(team => team.shortName),
    staffWithAvatar: uniqueStaff.length - staffWithoutAvatar.length,
    staffWithoutAvatar: staffWithoutAvatar.map(staff => staff?.staff_name).filter(Boolean),
    longIdentity: longIdentity.label,
    longIdentityChars: longIdentity.length
  }
}

if (!fs.existsSync(snapshotPath)) {
  throw new Error(`Review snapshot not found: ${snapshotPath}`)
}

const raw = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'))
const season = getSeasonById('FCR26')
const readiness = getReviewReadiness(season, raw)

if (!readiness.available || !seasonHasReview(season, raw)) {
  errors.push(`final snapshot did not pass the review gate: ${readiness.issues.map(issue => issue.code).join(', ')}`)
}

const incompleteReadiness = getReviewReadiness(season, makeIncompleteSnapshot(raw))
if (incompleteReadiness.available) {
  errors.push('synthetic incomplete snapshot incorrectly passed the review gate')
}

const expectedIncompleteIssues = [
  'MATCHES_COUNT_TOO_LOW',
  'MAPS_COUNT_TOO_LOW',
  'REVIEW_SNAPSHOT_TOO_OLD',
  'REVIEW_STAGE_INCOMPLETE',
  'REVIEW_ROUND_MISSING'
]

expectedIncompleteIssues.forEach(code => {
  if (!incompleteReadiness.issues.some(issue => issue.code === code)) {
    errors.push(`incomplete snapshot did not report ${code}`)
  }
})

const db = prepareReviewDb(raw)
const englishProfile = getLocalizedReviewSeasonProfile('FCR26', 'en-US')
const koreanProfile = getLocalizedReviewSeasonProfile('FCR26', 'ko-KR')
const localizedDirectorProfiles = [
  ['en-US', englishProfile],
  ['ko-KR', koreanProfile]
]
if (englishProfile.eventTitle !== '2026 Fries Cup Regular Season' || englishProfile.routeLabel !== 'Open Qualifier') {
  errors.push('localization: FCR26 English season profile still contains untranslated event copy')
}
if (koreanProfile.eventTitle !== '2026 프라이즈 컵 정규 시즌' || koreanProfile.routeLabel !== '공개 예선') {
  errors.push('localization: FCR26 Korean season profile still contains untranslated event copy')
}

const localizedEventScene = localizeReviewScenes([{
  kind: 'cover',
  title: '赛季回顾',
  body: '赛季回顾',
  eventTitle: '2026 薯条杯常规赛',
  event_title: '2026 薯条杯常规赛',
  eventNoun: '常规赛',
  event_noun: '常规赛'
}], 'en-US', englishProfile)[0]
if (localizedEventScene?.eventTitle !== englishProfile.eventTitle || localizedEventScene?.eventNoun !== englishProfile.eventNoun) {
  errors.push('localization: localized review scenes did not receive the localized season profile')
}

const cleanEntryPath = buildReviewEntryPath('FCR26', 'en-US')
const managerStoryPath = buildReviewPath('/review/story/team/FCR26-T001?as=manager&who=manager-1', 'FCR26', 'zh-CN')
if (cleanEntryPath !== '/review?season=FCR2026&lang=en') {
  errors.push(`navigation: review entry path is not canonical (${cleanEntryPath})`)
}
if (!managerStoryPath.includes('as=manager') || !managerStoryPath.includes('who=manager-1') || /(?:scene|poster)=/.test(managerStoryPath)) {
  errors.push(`navigation: review story path lost its target perspective or inherited transient state (${managerStoryPath})`)
}

const playerIds = [...new Set(safeArr(db?.players).map(player => player?.player_id).filter(Boolean))]
const teamIds = [...new Set([...safeArr(db?.teams), ...safeArr(db?.team_reviews)].map(getTeamId).filter(Boolean))]
const playerStoryBranches = { full: 0, brief: 0, roster: 0 }

playerIds.forEach(playerId => {
  const scenes = buildPlayerStory(db, playerId)
  auditStory(`player:${playerId}`, scenes)
  const branch = auditPlayerPresentation(playerId, scenes)
  auditMovieTicketPresentation(playerId, scenes)
  if (branch) playerStoryBranches[branch] += 1

  const sourcePayload = getPosterPayload(scenes)
  const sourceSelection = getDirectorCutSelection(sourcePayload, 'auto', 'zh-CN')
  if (!sourceSelection.ready) return

  releaseValidation.directorAutoEligiblePlayers += 1
  localizedDirectorProfiles.forEach(([locale, profile]) => {
    const localizedScenes = localizeReviewScenes(scenes, locale, profile)
    const localizedPayload = getPosterPayload(localizedScenes)
    const localizedSelection = getDirectorCutSelection(localizedPayload, 'auto', locale)
    releaseValidation.directorAutoHeroChecks += 1

    if (!localizedSelection.ready || localizedSelection.heroId !== sourceSelection.heroId) {
      errors.push(
        `director-cut: ${playerId} ${locale} automatic hero ${localizedPayload?.playerTicket?.topHero || '-'} did not round-trip to ${sourceSelection.heroId}`
      )
    }
  })
})

const zeroValueMovieTicket = getCinemaTicketData({
  cardKind: 'player',
  locale: 'zh-CN',
  seasonMark: 'FCR 2026',
  playerTicket: {
    playerName: 'ZERO FRAME',
    battleTag: 'ZeroFrame#0000',
    matchCount: 0,
    mapCount: 0,
    minutes: 0,
    team: 'ARCHIVE'
  }
})
const zeroPlaytime = safeArr(zeroValueMovieTicket?.stats)
  .find(item => String(item?.label || '').includes('PLAYTIME'))
if (zeroPlaytime?.value !== '0 MIN') {
  errors.push(`movie-ticket: explicit zero playtime was not preserved, got ${zeroPlaytime?.value || '-'}`)
}
if (zeroValueMovieTicket?.seat !== '00' || zeroValueMovieTicket?.screen !== 'ARCHIVE') {
  errors.push('movie-ticket: explicit zero fallback did not produce ARCHIVE / SEAT 00')
}
if (!String(zeroValueMovieTicket?.note || '').includes('阵容收录 · 0 张地图')) {
  errors.push('movie-ticket: explicit zero fallback does not state its honest roster-only proof line')
}
if (safeArr(zeroValueMovieTicket?.creditGroups)[0]?.displayLabel !== '制作 / PRODUCTION') {
  errors.push('movie-ticket: zero-map production credit is not localized for Chinese readers')
}
const longIdentityMovieTicket = getCinemaTicketData({
  cardKind: 'player',
  locale: 'zh-CN',
  seasonMark: 'FCR 2026',
  playerTicket: {
    playerName: 'Collapsar',
    battleTag: '灯光再亮也抱住你#51813',
    team: 'TB',
    teamFullName: 'Team Banana',
    role: '重装',
    matchCount: 6,
    mapCount: 18,
    minutes: 223.5,
    coStars: ['heaven', 'Atrys', 'Leon'],
    heroes: [{ title: '西格玛' }, { title: '查莉娅' }, { title: '毛加' }, { title: '温斯顿' }]
  }
})
if (longIdentityMovieTicket?.secondary !== '灯光再亮也抱住你#51813') {
  errors.push('movie-ticket: long BattleTag was altered before adaptive rendering')
}
if (longIdentityMovieTicket?.note !== 'TB · 6 场比赛 · 18 张地图 · 223.5 分钟\n剪成 Collapsar 的赛季正片。') {
  errors.push(`movie-ticket: participant proof line is incomplete (${JSON.stringify(longIdentityMovieTicket?.note || '')})`)
}
if (
  safeArr(longIdentityMovieTicket?.creditGroups).find(group => group?.label === 'CO-STARRING')?.displayLabel !== '队友 / CO-STARS'
  || safeArr(longIdentityMovieTicket?.creditGroups).find(group => group?.label === 'FEATURING')?.displayLabel !== '英雄 / HEROES'
) {
  errors.push('movie-ticket: participant credits do not distinguish teammates from heroes')
}
const localizedPosterOutputs = {
  'zh-CN': ['竖版 1080×1920', '横版 1920×1080', '导演剪辑版'],
  'en-US': ['Portrait 1080×1920', 'Landscape 1920×1080', "Director's Cut"],
  'ko-KR': ['세로형 1080×1920', '가로형 1920×1080', '감독판']
}
Object.entries(localizedPosterOutputs).forEach(([locale, [portrait, landscape, directorCut]]) => {
  if (
    reviewText(locale, 'posterOutputPortrait') !== portrait
    || reviewText(locale, 'posterOutputLandscape') !== landscape
    || reviewText(locale, 'directorCutFormat') !== directorCut
  ) {
    errors.push(`movie-ticket: ${locale} output dimensions are not localized`)
  }
})

// Measure the footer contract independently of browser fonts; actual appearance still needs PNG QA.
const footerMeasureContext = {
  font: '',
  stack: [],
  save() { this.stack.push(this.font) },
  restore() { this.font = this.stack.pop() },
  measureText(value) {
    const size = Number(this.font.match(/([\d.]+)px/)?.[1] || 14)
    return { width: [...String(value)].reduce((sum, char) => sum + (char === ' ' ? 0.3 : char.codePointAt(0) > 255 ? 1 : 0.62), 0) * size }
  }
}
const footerCreditGroups = [
  { displayLabel: '队友 / CO-STARS', names: ['烧肉粽#1234', '伊风', 'Sanshu'] },
  { displayLabel: '英雄 / HEROES', names: ['瑞稀', '卢西奥', '堡垒', '飞天猫'] }
]
const identityCases = [
  { title: 'SKY', secondary: 'michaelsky5#51764' },
  { title: '灯光再亮也抱住你', secondary: '灯光再亮也抱住你#51813' },
  { title: 'PorUnaCabeza', secondary: 'PorUnaCabeza#51844' },
  { title: '-DingChunQiu-', secondary: 'Ign0re#5103' },
  { title: 'dontsmile', secondary: 'dontsmile#5870' },
  { title: '天空中的 Overwatch Player', secondary: '天空中的OverwatchPlayer#12345' },
  { title: 'The Director Of A Very Long Season', secondary: 'TheDirectorOfAVeryLongSeason#12345' }
]
DIRECTOR_CUT_HERO_CATALOG.forEach(hero => {
  const emblemLayout = getDirectorCutEmblemLayout(hero.profile, {
    x: 538, y: 66, width: 708, height: 644,
    heroMark: { naturalWidth: 360, naturalHeight: 260 }
  })
  identityCases.forEach(identity => {
    const layout = getDirectorCutIdentityLayout(footerMeasureContext, { ...identity, emblemLayout })
    footerMeasureContext.font = `900 ${layout.size}px sans-serif`
    const titleWidth = Math.max(...layout.lines.map(line => footerMeasureContext.measureText(line).width))
    footerMeasureContext.font = `900 ${layout.secondarySize}px sans-serif`
    const secondaryWidth = footerMeasureContext.measureText(identity.secondary).width
    if (
      layout.lines.join('').replace(/\s/g, '') !== identity.title.replace(/\s/g, '')
      || titleWidth > layout.maxWidth + 0.01 || secondaryWidth > layout.maxWidth + 0.01
      || layout.x + layout.maxWidth + 5 > emblemLayout.drawX - 28 + 0.01
      || layout.secondaryBaseline + 8 > layout.loglineY - 10
      || layout.loglineY + 82 > 465 - 20
      || (layout.lines.length === 2 && layout.baselines[0] - layout.size < 185)
    ) errors.push(`director-cut: ${hero.id} / ${identity.title} crosses an identity or logline safe zone`)
    if (identity.title === 'SKY' && (layout.lines.length !== 1 || layout.size !== 112 || layout.baselines[0] !== 258 || layout.secondaryBaseline !== 316)) {
      errors.push(`director-cut: ${hero.id} short player name changed the approved mother layout`)
    }
    if (identity.title === '-DingChunQiu-' && layout.lines.length === 2 && !['-Ding', '-DingChun'].includes(layout.lines[0])) {
      errors.push(`director-cut: ${hero.id} splits the long Latin alias inside a word`)
    }
    if (identity.title === 'dontsmile' && layout.lines.length !== 1) {
      errors.push(`director-cut: ${hero.id} unnecessarily splits a single-word Latin alias`)
    }
  })
})
const noEmblemIdentity = getDirectorCutIdentityLayout(footerMeasureContext, identityCases[0])
if (noEmblemIdentity.maxWidth !== 662 || getDirectorCutEmblemLayout({}, { heroMark: null }) !== null || footerMeasureContext.stack.length) {
  errors.push('director-cut: identity layout loses its missing-emblem fallback or Canvas state isolation')
}
DIRECTOR_CUT_HERO_CATALOG.forEach(hero => {
  const { credits, wordmark } = getDirectorCutFooterLayout(footerMeasureContext, {
    heroName: hero.en, motif: hero.profile, creditGroups: footerCreditGroups
  })
  footerMeasureContext.font = `900 ${wordmark.size}px sans-serif`
  const wordmarkWidth = footerMeasureContext.measureText(wordmark.label).width
  const creditsRight = Math.max(...credits.map(line => line.right))
  if (
    wordmark.label !== hero.en.toLocaleUpperCase('en-US')
    || wordmarkWidth > wordmark.maxWidth
    || (!wordmark.compact && wordmark.rightX - wordmarkWidth < creditsRight + 28)
    || credits[0].names.includes('#')
  ) {
    errors.push(`director-cut: ${hero.id} footer name overlaps credits or loses its full name`)
  }
})
const lucioFooter = getDirectorCutFooterLayout(footerMeasureContext, {
  heroName: 'Lúcio', motif: { ghostScale: 0.94 }, creditGroups: footerCreditGroups
}).wordmark
if (lucioFooter.compact || lucioFooter.baseline !== 650 || lucioFooter.rightX !== 1288 || lucioFooter.size !== 88 * 0.94) {
  errors.push('director-cut: short hero names no longer preserve the approved footer placement')
}
const crowdedFooter = getDirectorCutFooterLayout(footerMeasureContext, {
  heroName: 'Wrecking Ball',
  creditGroups: [{ label: 'CO-STARRING', names: ['A very long participant name'.repeat(8)] }]
}).wordmark
if (!crowdedFooter.compact || crowdedFooter.baseline !== 662 || crowdedFooter.size > 28 || crowdedFooter.label !== 'WRECKING BALL') {
  errors.push('director-cut: long credits need a separate complete compact hero signature')
}

// Edge treatment is opt-in, follows the source's visible bounds, and keeps a
// constant ticket-space length even when a portrait's camera zoom changes.
const portraitMaskBounds = { x: 120, y: 80, width: 1080, height: 900 }
const portraitMaskStage = { x: 70, width: 690 }
const portraitMaskPlacement = { imageX: -120 }
const portraitMaskRecipe = {
  subjectFeatherTop: 30, subjectFeatherBottom: 60,
  subjectCopyFadeStart: 0.65, subjectCopyFadeEnd: 0.8
}
const portraitMaskInputs = JSON.stringify([portraitMaskBounds, portraitMaskPlacement, portraitMaskStage, portraitMaskRecipe])
const portraitMask = getDirectorCutPortraitMask(portraitMaskBounds, 0.5, portraitMaskPlacement, portraitMaskStage, portraitMaskRecipe)
const zoomedPortraitMask = getDirectorCutPortraitMask(portraitMaskBounds, 1, portraitMaskPlacement, portraitMaskStage, portraitMaskRecipe)
if (
  getDirectorCutPortraitMask(portraitMaskBounds, 0.5, portraitMaskPlacement, portraitMaskStage) !== null
  || portraitMask?.top.start !== 80 || portraitMask?.top.end !== 140
  || portraitMask?.bottom.start !== 860 || portraitMask?.bottom.end !== 980
  || portraitMask?.copy.start !== 1277 || portraitMask?.copy.end !== 1484
  || zoomedPortraitMask?.top.end - zoomedPortraitMask?.top.start !== 30
  || zoomedPortraitMask?.bottom.end - zoomedPortraitMask?.bottom.start !== 60
  || JSON.stringify([portraitMaskBounds, portraitMaskPlacement, portraitMaskStage, portraitMaskRecipe]) !== portraitMaskInputs
) errors.push('director-cut: portrait mask loses opt-in, source-edge anchoring, zoom invariance, or input immutability')

for (const ratio of [0, -1, NaN, Infinity]) {
  if (getDirectorCutPortraitMask(portraitMaskBounds, ratio, portraitMaskPlacement, portraitMaskStage, portraitMaskRecipe) !== null) {
    errors.push('director-cut: invalid portrait zoom must not reach Canvas gradient coordinates')
  }
}
for (const recipe of [
  { subjectCopyFadeStart: 0.8, subjectCopyFadeEnd: 0.65 },
  { subjectCopyFadeStart: -0.1, subjectCopyFadeEnd: 0.8 },
  { subjectCopyFadeStart: 0.65, subjectCopyFadeEnd: 1.1 },
  { subjectFeatherTop: -30, subjectFeatherBottom: Infinity }
]) {
  if (getDirectorCutPortraitMask(portraitMaskBounds, 1, portraitMaskPlacement, portraitMaskStage, recipe) !== null) {
    errors.push('director-cut: invalid portrait masks must be ignored')
  }
}
const clampedPortraitMask = getDirectorCutPortraitMask({ y: 0, height: 100 }, 1, null, null, {
  subjectFeatherTop: 1000, subjectFeatherBottom: 1000
})
if (
  clampedPortraitMask?.top.end !== 30 || clampedPortraitMask?.bottom.start !== 60
  || getDirectorCutPortraitMask({ y: NaN, height: 100 }, 1, null, null, portraitMaskRecipe) !== null
  || getDirectorCutPortraitMask({ y: 0, height: 0 }, 1, null, null, portraitMaskRecipe) !== null
  || getDirectorCutPortraitMask(portraitMaskBounds, 1, { imageX: NaN }, portraitMaskStage, {
    subjectCopyFadeStart: 0.65, subjectCopyFadeEnd: 0.8
  }) !== null
) errors.push('director-cut: invalid or oversized source-edge masks need safe bounds')

const preservedDirectorPortraits = new Set([
  'domina', 'hazard', 'sigma', 'cassidy', 'freja', 'mei', 'reaper', 'sojourn',
  'sierra', 'shion', 'tracer', 'venture', 'widowmaker', 'brigitte', 'lifeweaver', 'lucio', 'zenyatta'
])
DIRECTOR_CUT_HERO_CATALOG.forEach(hero => {
  const mask = getDirectorCutPortraitMask(portraitMaskBounds, 1, portraitMaskPlacement, portraitMaskStage, hero.profile)
  if (preservedDirectorPortraits.has(hero.id) && mask !== null) {
    errors.push(`director-cut: approved ${hero.id} portrait gained an unsolicited mask`)
  }
  // Bastion's raised chassis crossed the ID and logline in the v78 full-size
  // review. Keep its camera position; only fade the portrait out before copy.
  if (hero.id === 'bastion' && (!mask?.copy
    || hero.profile.subjectCopyFadeStart !== 0.65
    || hero.profile.subjectCopyFadeEnd !== 0.8)) {
    errors.push('director-cut: Bastion chassis must not intrude into the identity and logline')
  }
  if (mask?.copy && mask.copy.end + portraitMaskPlacement.imageX > 622) {
    errors.push(`director-cut: ${hero.id} portrait alpha must clear the copy column with an 8px buffer`)
  }
})

if (DIRECTOR_CUT_HERO_CATALOG.length !== 53) {
  errors.push(`director-cut: expected 53 hero art profiles, got ${DIRECTOR_CUT_HERO_CATALOG.length}`)
}
if (new Set(DIRECTOR_CUT_HERO_CATALOG.map(hero => hero.profile.label)).size !== DIRECTOR_CUT_HERO_CATALOG.length) {
  errors.push('director-cut: hero art-direction labels are not unique')
}
if (new Set(DIRECTOR_CUT_HERO_CATALOG.map(hero => hero.profile.code)).size !== DIRECTOR_CUT_HERO_CATALOG.length) {
  errors.push('director-cut: hero profile archive codes are not unique')
}
if (new Set(DIRECTOR_CUT_HERO_CATALOG.map(hero => hero.profile.cutLabel)).size < 50) {
  errors.push('director-cut: hero-specific movie CUT labels are not sufficiently distinct')
}
const directorStoryEntries = Object.values(DIRECTOR_CUT_STORY_SIGNATURES)
if (directorStoryEntries.length !== DIRECTOR_CUT_HERO_CATALOG.length) {
  errors.push(`director-cut: expected ${DIRECTOR_CUT_HERO_CATALOG.length} story signatures, got ${directorStoryEntries.length}`)
}
if (new Set(directorStoryEntries.map(story => story.id)).size !== directorStoryEntries.length) {
  errors.push('director-cut: story signature ids are not unique')
}
if (new Set(directorStoryEntries.map(story => story.emblem)).size !== directorStoryEntries.length) {
  errors.push('director-cut: story emblems are not unique')
}
if (new Set(directorStoryEntries.map(story => story.texture)).size !== directorStoryEntries.length) {
  errors.push('director-cut: story textures must be unique for all 53 heroes')
}
if (directorStoryEntries.some(story => !story.highlight)) {
  errors.push('director-cut: every story signature needs a curated highlight color')
}
const directorHeroIds = new Set(DIRECTOR_CUT_HERO_CATALOG.map(hero => hero.id))
Object.keys(DIRECTOR_CUT_STORY_SIGNATURES).forEach(heroId => {
  if (!directorHeroIds.has(heroId)) errors.push(`director-cut: orphan story signature for ${heroId}`)
})
const directorLineEntries = Object.values(DIRECTOR_CUT_LINE_DIRECTIONS)
const directorLineGrammars = new Set(['lock', 'orbit', 'lattice', 'impact', 'fracture', 'flow', 'vow', 'cut'])
if (directorLineEntries.length !== DIRECTOR_CUT_HERO_CATALOG.length) {
  errors.push(`director-cut: expected ${DIRECTOR_CUT_HERO_CATALOG.length} line directions, got ${directorLineEntries.length}`)
}
if (new Set(directorLineEntries.map(direction => direction.concept)).size !== directorLineEntries.length) {
  errors.push('director-cut: hero line concepts must be unique')
}
if (new Set(directorLineEntries.map(direction => direction.gesture)).size !== directorLineEntries.length) {
  errors.push('director-cut: hero line gestures must be unique')
}
Object.entries(DIRECTOR_CUT_LINE_DIRECTIONS).forEach(([heroId, direction]) => {
  const numericValues = [
    direction?.originX,
    direction?.originY,
    direction?.focusX,
    direction?.focusY,
    direction?.bend,
    direction?.breakAt,
    direction?.intensity
  ]
  if (
    !directorHeroIds.has(heroId)
    || direction?.heroId !== heroId
    || !directorLineGrammars.has(direction?.grammar)
    || !direction?.concept
    || !direction?.gesture
    || !direction?.avoid
    || numericValues.some(value => !Number.isFinite(value))
    || direction.originX < 0.02
    || direction.originX > 0.28
    || direction.originY < 0.44
    || direction.originY > 0.86
    || direction.focusX < 0.58
    || direction.focusX > 0.94
    || direction.focusY < 0.18
    || direction.focusY > 0.58
    || Math.abs(direction.bend) > 0.82
    || direction.breakAt < 0.34
    || direction.breakAt > 0.78
    || direction.intensity < 0.6
    || direction.intensity > 1
  ) {
    errors.push(`director-cut: invalid line direction for ${heroId}`)
  }
})
const expectedDirectorHeroMarks = new Map([
  ['ana', '/review/hero-marks/ana-vigil-sightline.svg'],
  ['anran', '/review/hero-marks/anran-silk-ember.svg'],
  ['ashe', '/review/hero-marks/ashe-velvet-deadeye.svg'],
  ['baptiste', '/review/hero-marks/baptiste-second-chance-field.svg'],
  ['bastion', '/review/hero-marks/bastion-nature-reconfigure.svg'],
  ['brigitte', '/review/hero-marks/brigitte-rally-standard.svg'],
  ['cassidy', '/review/hero-marks/cassidy-noon-cut.svg'],
  ['dmon', '/review/hero-marks/dmon-intercept-aegis.svg'],
  ['domina', '/review/hero-marks/domina-sovereign-panopticon.svg'],
  ['doomfist', '/review/hero-marks/doomfist-evolution-impact.svg'],
  ['dva', '/review/hero-marks/dva-mecha-orbit.svg'],
  ['echo', '/review/hero-marks/echo-adaptive-reprise.svg'],
  ['emre', '/review/hero-marks/emre-broken-override.svg'],
  ['freja', '/review/hero-marks/freja-northwind-lock.svg'],
  ['genji', '/review/hero-marks/genji-chroma-blade.svg'],
  ['hanzo', '/review/hero-marks/hanzo-penitent-bow.svg'],
  ['hazard', '/review/hero-marks/hazard-vanadium-fracture.svg'],
  ['illari', '/review/hero-marks/illari-fractured-inti.svg'],
  ['jetpack-cat', '/review/hero-marks/jetpack-cat-fika-landing.svg'],
  ['junker-queen', '/review/hero-marks/junker-queen-arena-crown.svg'],
  ['junkrat', '/review/hero-marks/junkrat-secret-detonation.svg'],
  ['juno', '/review/hero-marks/juno-mars-lifeline.svg'],
  ['kiriko', '/review/hero-marks/kiriko-fold.svg'],
  ['lifeweaver', '/review/hero-marks/lifeweaver-bloom-lattice.svg'],
  ['lucio', '/review/hero-marks/lucio-rio-resonance.svg'],
  ['mauga', '/review/hero-marks/mauga-twin-heart-crossfire.svg'],
  ['mercy', '/review/hero-marks/mercy-ascension.svg'],
  ['mei', '/review/hero-marks/mei-cryo-thaw.svg'],
  ['mizuki', '/review/hero-marks/mizuki-fate-unbound.svg'],
  ['moira', '/review/hero-marks/moira-biotic-schism.svg'],
  ['orisa', '/review/hero-marks/orisa-guardian-horizon.svg'],
  ['pharah', '/review/hero-marks/pharah-legacy-launch.svg'],
  ['ramattra', '/review/hero-marks/ramattra-vow-fracture.svg'],
  ['reaper', '/review/hero-marks/reaper-blackwatch-dissolve.svg'],
  ['reinhardt', '/review/hero-marks/reinhardt-crusader-vow.svg'],
  ['roadhog', '/review/hero-marks/roadhog-chain-undertow.svg'],
  ['sigma', '/review/hero-marks/sigma-gravity-score.svg'],
  ['shion', '/review/hero-marks/shion-redaction-ascent.svg'],
  ['sierra', '/review/hero-marks/sierra-summit-pursuit.svg'],
  ['sojourn', '/review/hero-marks/sojourn-rail-map.svg'],
  ['soldier-76', '/review/hero-marks/soldier-76-classified-vigil.svg'],
  ['sombra', '/review/hero-marks/sombra-conspiracy-negative.svg'],
  ['symmetra', '/review/hero-marks/symmetra-hard-light-lattice.svg'],
  ['tracer', '/review/hero-marks/tracer-jump-cut.svg'],
  ['torbjorn', '/review/hero-marks/torbjorn-forge-blueprint.svg'],
  ['vendetta', '/review/hero-marks/vendetta-duel-final-cut.svg'],
  ['venture', '/review/hero-marks/venture-buried-wayfinder.svg'],
  ['widowmaker', '/review/hero-marks/widowmaker-lock.svg'],
  ['winston', '/review/hero-marks/winston-lunar-recall.svg'],
  ['wrecking-ball', '/review/hero-marks/wrecking-ball-arena-escape.svg'],
  ['wuyang', '/review/hero-marks/wuyang-return-current.svg'],
  ['zarya', '/review/hero-marks/zarya-particle-vault.svg'],
  ['zenyatta', '/review/hero-marks/zenyatta-open-iris.svg']
])
if (
  Object.keys(DIRECTOR_CUT_HERO_MARKS).length !== expectedDirectorHeroMarks.size
  || new Set(Object.values(DIRECTOR_CUT_HERO_MARKS)).size !== expectedDirectorHeroMarks.size
) {
  errors.push('director-cut: dedicated hero-mark catalog is incomplete or duplicated')
}
expectedDirectorHeroMarks.forEach((assetPath, heroId) => {
  const hero = DIRECTOR_CUT_HERO_CATALOG.find(item => item.id === heroId)
  const markKey = heroNameToSlug(hero?.en || heroId)
  if (DIRECTOR_CUT_HERO_MARKS[markKey] !== assetPath || !publicAssetExists(assetPath)) {
    errors.push(`director-cut: missing dedicated hero mark for ${heroId}`)
  }
})
const directorLanguageFields = new Map([
  ['ana', 'vigil-sightline'],
  ['anran', 'silk-ember'],
  ['ashe', 'velvet-deadeye'],
  ['baptiste', 'second-chance-field'],
  ['bastion', 'nature-reconfigure'],
  ['brigitte', 'rally-standard'],
  ['domina', 'sovereign-panopticon'],
  ['doomfist', 'evolution-impact'],
  ['dva', 'mecha-orbit'],
  ['dmon', 'intercept'],
  ['echo', 'adaptive-reprise'],
  ['emre', 'broken-override'],
  ['freja', 'northwind-lock'],
  ['hazard', 'vanadium-fracture'],
  ['illari', 'fractured-inti'],
  ['jetpack-cat', 'fika-landing'],
  ['junker-queen', 'arena-crown'],
  ['junkrat', 'secret-detonation'],
  ['juno', 'mars-lifeline'],
  ['sigma', 'gravity-score'],
  ['roadhog', 'undertow'],
  ['ramattra', 'vow-fracture'],
  ['zarya', 'particle-vault'],
  ['cassidy', 'noon-cut'],
  ['genji', 'chroma-blade'],
  ['hanzo', 'penitent-bow'],
  ['mauga', 'twin-heart-crossfire'],
  ['mei', 'cryo-thaw'],
  ['orisa', 'guardian-horizon'],
  ['pharah', 'legacy-launch'],
  ['reaper', 'blackwatch-dissolve'],
  ['symmetra', 'lattice'],
  ['tracer', 'jump-cut'],
  ['widowmaker', 'lock'],
  ['kiriko', 'fold'],
  ['lifeweaver', 'bloom-lattice'],
  ['lucio', 'rio-resonance'],
  ['mercy', 'ascension'],
  ['mizuki', 'fate-unbound'],
  ['moira', 'biotic-schism'],
  ['reinhardt', 'crusader-vow'],
  ['soldier-76', 'classified-vigil'],
  ['sombra', 'conspiracy-negative'],
  ['sojourn', 'rail-map'],
  ['sierra', 'summit-pursuit'],
  ['shion', 'redaction-ascent'],
  ['torbjorn', 'forge-blueprint'],
  ['vendetta', 'duel-final-cut'],
  ['venture', 'buried-wayfinder'],
  ['winston', 'lunar-recall'],
  ['wrecking-ball', 'arena-escape'],
  ['wuyang', 'return-current'],
  ['zenyatta', 'open-iris']
])
const directorPosterLanguagePilots = new Set([
  'ana',
  'anran',
  'ashe',
  'baptiste',
  'bastion',
  'brigitte',
  'domina',
  'doomfist',
  'dva',
  'dmon',
  'echo',
  'emre',
  'freja',
  'hazard',
  'illari',
  'jetpack-cat',
  'junker-queen',
  'junkrat',
  'juno',
  'sigma',
  'roadhog',
  'ramattra',
  'zarya',
  'cassidy',
  'genji',
  'hanzo',
  'mauga',
  'mei',
  'orisa',
  'pharah',
  'reaper',
  'symmetra',
  'tracer',
  'widowmaker',
  'kiriko',
  'lifeweaver',
  'lucio',
  'mercy',
  'mizuki',
  'moira',
  'reinhardt',
  'soldier-76',
  'sombra',
  'sojourn',
  'sierra',
  'shion',
  'torbjorn',
  'vendetta',
  'venture',
  'winston',
  'wrecking-ball',
  'wuyang',
  'zenyatta'
])
DIRECTOR_CUT_HERO_CATALOG.forEach(hero => {
  const subjectBrightness = Number(hero.profile?.subjectBrightness ?? 1)
  const copyBlendX = Number(hero.profile?.copyBlendX ?? 500)
  const story = hero.profile?.story
  if (!publicAssetExists(hero.render)) {
    errors.push(`director-cut: missing hero render ${hero.id} -> ${hero.render}`)
  }
  if (
    !hero.profile?.type
    || !hero.profile?.secondary
    || !hero.profile?.composition
    || !hero.profile?.cutLabel
    || !Number.isFinite(hero.profile?.motifStrength)
    || !Number.isFinite(hero.profile?.rimStrength)
    || !Number.isFinite(hero.profile?.ghostScale)
    || !Number.isFinite(hero.profile?.genericStrength)
    || !Number.isFinite(hero.profile?.storyStrength)
    || !Number.isFinite(hero.profile?.storyTextureStrength)
    || !Number.isFinite(hero.profile?.storyEmblemStrength)
    || !Number.isFinite(hero.profile?.identityStrength)
    || !Number.isFinite(hero.profile?.ghostStrength)
    || !Number.isFinite(hero.profile?.signatureLayerStrength)
    || !hero.profile?.rimPrimary
    || !hero.profile?.rimSecondary
    || !Number.isFinite(hero.profile?.subjectBrightness)
    || !Number.isFinite(hero.profile?.subjectSaturation)
    || !Number.isFinite(hero.profile?.subjectContrast)
    || !Number.isFinite(hero.profile?.subjectSepia)
    || !Number.isFinite(hero.profile?.subjectScale)
    || !Number.isFinite(hero.profile?.subjectX)
    || !Number.isFinite(hero.profile?.subjectY)
    || hero.profile?.subjectFraming !== 'source-frame'
    || hero.profile?.lineDirection?.heroId !== hero.id
    || hero.profile?.lineDirection?.grammar !== DIRECTOR_CUT_LINE_DIRECTIONS[hero.id]?.grammar
    || story?.heroId !== hero.id
    || !story?.id
    || !story?.anchor
    || !story?.emblem
    || !story?.texture
    || !Number.isFinite(story?.rotation)
  ) {
    errors.push(`director-cut: incomplete art-direction profile for ${hero.id}`)
  }
  if (
    hero.profile.subjectScale < 1
    || hero.profile.subjectScale > 2
    || Math.abs(hero.profile.subjectX) > 0.12
    || hero.profile.subjectY < -0.12
    || hero.profile.subjectY > 0.2
    || !Number.isFinite(subjectBrightness)
    || subjectBrightness < 0.88
    || subjectBrightness > 1.28
    || !Number.isFinite(copyBlendX)
    || copyBlendX < 430
    || copyBlendX > 520
  ) {
    errors.push(`director-cut: unsafe camera calibration for ${hero.id}`)
  }
  const languageField = directorLanguageFields.get(hero.id)
  const heroMarkCropWidth = Number(hero.profile?.heroMarkCropWidth ?? 0.5)
  const heroMarkCropHeight = Number(hero.profile?.heroMarkCropHeight ?? 0.68)
  const heroEmblemSize = Number(hero.profile?.heroEmblemSize ?? 216)
  if (
    expectedDirectorHeroMarks.has(hero.id)
    && (
      hero.profile?.heroMarkMode !== 'emblem'
      || !Number.isFinite(heroMarkCropWidth)
      || heroMarkCropWidth < (hero.profile?.heroMarkIsolated ? 0.15 : 0.28)
      || heroMarkCropWidth > 1
      || !Number.isFinite(heroMarkCropHeight)
      || heroMarkCropHeight < (hero.profile?.heroMarkIsolated ? 0.15 : 0.38)
      || heroMarkCropHeight > 1
      || !Number.isFinite(heroEmblemSize)
      || heroEmblemSize < 176
      || heroEmblemSize > 260
    )
  ) {
    errors.push(`director-cut: ${hero.id} dedicated mark is not configured as a local emblem`)
  }
  if (languageField) {
    const languageFieldStrength = Number(hero.profile?.languageFieldStrength)
    if (
      hero.profile?.languageField !== languageField
      || !Number.isFinite(languageFieldStrength)
      || languageFieldStrength < 0.3
      || languageFieldStrength > 1
      || !hero.profile?.languageColor
      || hero.profile?.narrativeStage === true
      || hero.profile.genericStrength < 0
      || hero.profile.genericStrength > 0.04
      || hero.profile.storyStrength !== 0
      || hero.profile.storyTextureStrength !== 0
      || hero.profile.storyEmblemStrength !== 0
      || hero.profile.identityStrength < 0
      || hero.profile.identityStrength > 0.08
      || hero.profile.signatureLayerStrength !== 0
      || (directorPosterLanguagePilots.has(hero.id) && hero.profile?.languageFieldEdition !== 'poster')
      || (!directorPosterLanguagePilots.has(hero.id) && hero.profile?.languageFieldEdition === 'poster')
    ) {
      errors.push(`director-cut: unsafe single-field language for ${hero.id}`)
    }
  } else if (
    hero.profile.genericStrength < 0
    || hero.profile.genericStrength > 0.18
    || hero.profile.storyStrength < 0.55
    || hero.profile.storyStrength > 0.82
    || hero.profile.storyTextureStrength < 0.34
    || hero.profile.storyTextureStrength > 0.8
    || hero.profile.storyEmblemStrength < 0.7
    || hero.profile.storyEmblemStrength > 0.95
    || hero.profile.identityStrength < 0.18
    || hero.profile.identityStrength > 0.38
    || hero.profile.ghostStrength < 0.3
    || hero.profile.ghostStrength > 0.54
    || hero.profile.signatureLayerStrength < 0.68
    || hero.profile.signatureLayerStrength > 0.84
  ) {
    errors.push(`director-cut: unsafe background hierarchy for ${hero.id}`)
  }
  if (hero.profile?.stageReview !== DIRECTOR_CUT_STAGE_AUDIT_VERSION) {
    errors.push(`director-cut: ${hero.id} has not passed the current hero-by-hero stage audit`)
  }
})

const directorAmbientSignatures = new Set()
if (
  Object.keys(DIRECTOR_CUT_AMBIENT_FIELDS).length !== DIRECTOR_CUT_HERO_CATALOG.length
  || Object.keys(DIRECTOR_CUT_EMBLEM_FRAMES).length !== DIRECTOR_CUT_HERO_CATALOG.length
) errors.push('director-cut: every hero needs an independent ambient field and emblem frame')

DIRECTOR_CUT_HERO_CATALOG.forEach(hero => {
  const ambient = DIRECTOR_CUT_AMBIENT_FIELDS[hero.id]
  const frame = DIRECTOR_CUT_EMBLEM_FRAMES[hero.id]
  const profile = hero.profile
  if (
    !ambient?.family || !ambient?.intent || !frame
    || profile.lineLayer !== 'ambient'
    || profile.ambientField !== ambient
    || profile.ambientLineStyle !== ambient.style
    || profile.ambientLineStrength !== ambient.strength
    || !Number.isFinite(ambient.strength) || ambient.strength < 0.2 || ambient.strength > 1
    || profile.heroEmblemX !== frame?.heroEmblemX || profile.heroEmblemY !== frame?.heroEmblemY
  ) errors.push(`director-cut: ${hero.id} is not wired into the independent master layers`)

  if (ambient?.style === 'authored') {
    const paths = ambient.paths || []
    if (paths.length < 3 || paths.length > 6) errors.push(`director-cut: ${hero.id} has unsafe ambient density`)
    paths.forEach(item => {
      const coordinates = item.d.match(/-?\d+(?:\.\d+)?/g)?.map(Number) || []
      if (
        !/^M[-\d]/.test(item.d) || /[^MLHVCSQTAZ\d.,\s-]/i.test(item.d)
        || coordinates.length < 4 || coordinates.some(value => !Number.isFinite(value) || value < -100 || value > 1050)
        || !Number.isFinite(item.width) || item.width < 0.75 || item.width > 3
        || !Number.isFinite(item.alpha) || item.alpha < 0.05 || item.alpha > 0.36
        || !['hero', 'neutral'].includes(item.tone)
      ) errors.push(`director-cut: ${hero.id} has an invalid portrait-space path`)
    })
    const signature = paths.map(item => item.d).join('|')
    if (directorAmbientSignatures.has(signature)) errors.push(`director-cut: ${hero.id} reuses another hero's ambient geometry`)
    directorAmbientSignatures.add(signature)
  } else if (!['lucio', 'kiriko'].includes(hero.id)) {
    errors.push(`director-cut: ${hero.id} must have authored ambient geometry`)
  }

  if (frame?.heroMarkIsolated) {
    const left = frame.heroMarkAnchorX - frame.heroMarkCropWidth / 2
    const top = frame.heroMarkAnchorY - frame.heroMarkCropHeight / 2
    if (left < 0 || top < 0 || left + frame.heroMarkCropWidth > 1 || top + frame.heroMarkCropHeight > 1) {
      errors.push(`director-cut: ${hero.id} isolated glyph bounds leave the SVG viewport`)
    }
  } else if (!['lucio', 'sojourn'].includes(hero.id)) {
    errors.push(`director-cut: ${hero.id} still relies on the old route-feather crop`)
  }
})

const directorHeroProfiles = new Map(DIRECTOR_CUT_HERO_CATALOG.map(hero => [hero.id, hero.profile]))
;[
  ['orisa', 'sentinel'],
  ['sigma', 'gravity-score'],
  ['reinhardt', 'crusader-vow'],
  ['ramattra', 'ravager-vow'],
  ['reaper', 'blackwatch-wraith'],
  ['sombra', 'conspiracy-void'],
  ['emre', 'breach-scan'],
  ['shion', 'redacted-wraith'],
  ['baptiste', 'field'],
  ['lifeweaver', 'petal-lattice'],
  ['mizuki', 'afterimage'],
  ['moira', 'biotic-schism'],
  ['wuyang', 'return-current'],
  ['zenyatta', 'mandala']
].forEach(([heroId, signature]) => {
  const profile = directorHeroProfiles.get(heroId)
  const signatureStrength = Number(profile?.signatureStrength)
  if (profile?.signature !== signature) {
    errors.push(`director-cut: ${heroId} should use ${signature} signature artwork`)
  }
  if (!Number.isFinite(signatureStrength) || signatureStrength < 0.72 || signatureStrength > 1.32) {
    errors.push(`director-cut: ${heroId} has unsafe signature artwork strength`)
  }
})
;[
  ['bastion', 'grid', 'GRID CUT'],
  ['jetpack-cat', 'nine-lives', 'JETSTREAM CUT'],
  ['lucio', 'wave', 'RHYTHM CUT'],
  ['domina', 'fortress', 'SOVEREIGN CUT'],
  ['doomfist', 'impact', 'GAUNTLET CUT']
].forEach(([heroId, type, cutLabel]) => {
  const profile = directorHeroProfiles.get(heroId)
  if (profile?.type !== type || profile?.cutLabel !== cutLabel) {
    errors.push(`director-cut: ${heroId} lost its hero-specific stage language`)
  }
})
;['zh-CN', 'en-US', 'ko-KR'].forEach(locale => {
  if (getDirectorCutHeroOptions(locale).length !== DIRECTOR_CUT_HERO_CATALOG.length) {
    errors.push(`director-cut: ${locale} hero selector does not expose the full catalog`)
  }
})
;['en-US', 'ko-KR'].forEach(locale => {
  getDirectorCutHeroOptions(locale).forEach(option => {
    const selection = getDirectorCutSelection({
      cardKind: 'player',
      locale,
      playerTicket: { topHero: option.name }
    }, 'auto', locale)
    releaseValidation.directorCatalogRoundTrips += 1

    if (!selection.ready || selection.heroId !== option.id) {
      errors.push(`director-cut: ${locale} catalog label ${option.name} did not round-trip to ${option.id}`)
    }
  })
})

const directorEditionKinds = ['player', 'caster', 'staff', 'manager', 'coach', 'managerCoach', 'team', 'tournament']
const directorEditionFingerprints = new Set(directorEditionKinds.map(kind => JSON.stringify(getDirectorCutEdition(kind))))
const directorEdition = getDirectorCutEdition('player')
if (
  directorEditionFingerprints.size !== 1
  || directorEdition.header !== "FRIES CUP PICTURES / DIRECTOR'S CUT"
  || directorEdition.stub !== "DIRECTOR'S CUT"
  || !directorEdition.rail.includes('ONE HERO')
) {
  errors.push('director-cut: identity-specific portrait editions were not replaced by one hero-driven edition')
}

const directorPlayerPayload = {
  cardKind: 'player',
  locale: 'zh-CN',
  heroRender: '/review/hero-renders/support/mizuki.png',
  playerTicket: {
    topHero: '瑞稀',
    role: '支援',
    heroes: [{ title: '瑞稀' }, { title: '卢西奥' }]
  }
}
const automaticDirectorPlayer = getDirectorCutSelection(directorPlayerPayload, 'auto', 'zh-CN')
const manualDirectorPlayer = getDirectorCutSelection(directorPlayerPayload, 'venture', 'zh-CN')
const appliedDirectorPlayer = applyDirectorCutSelection(directorPlayerPayload, manualDirectorPlayer)
if (automaticDirectorPlayer.heroId !== 'mizuki' || automaticDirectorPlayer.source !== 'signature') {
  errors.push('director-cut: player automatic selection did not preserve the signature hero')
}
if (
  manualDirectorPlayer.subjectMode !== 'hero'
  || !manualDirectorPlayer.ready
  || manualDirectorPlayer.choiceLabel !== "DIRECTOR'S CHOICE"
  || appliedDirectorPlayer.heroRender !== '/review/hero-renders/damage/venture.png'
  || appliedDirectorPlayer.playerTicket?.topHero !== '探奇'
) {
  errors.push('director-cut: player manual hero selection did not update render, title, and choice label together')
}

const directorCasterPayload = {
  cardKind: 'caster',
  locale: 'zh-CN',
  image: '/review/staff-portraits/example.png',
  identityTicket: { callsign: 'VOICE', role: '解说' }
}
const automaticDirectorCaster = getDirectorCutSelection(directorCasterPayload, 'auto', 'zh-CN')
const manualDirectorCaster = getDirectorCutSelection(directorCasterPayload, 'lucio', 'zh-CN')
const appliedDirectorCaster = applyDirectorCutSelection(directorCasterPayload, manualDirectorCaster)
if (
  automaticDirectorCaster.ready
  || automaticDirectorCaster.source !== 'unselected'
  || automaticDirectorCaster.heroRender
) {
  errors.push('director-cut: caster should wait for an explicit hero instead of falling back to the portrait')
}
if (
  manualDirectorCaster.subjectMode !== 'hero'
  || !manualDirectorCaster.ready
  || manualDirectorCaster.heroId !== 'lucio'
  || appliedDirectorCaster.heroRender !== '/review/hero-renders/support/lucio.png'
  || appliedDirectorCaster.directorCut?.choiceLabel !== "DIRECTOR'S CHOICE"
) {
  errors.push('director-cut: caster manual selection did not make the selected hero the visual subject')
}

const directorStaffPayload = {
  cardKind: 'staff',
  locale: 'zh-CN',
  image: '/review/staff-portraits/admin.png',
  identityTicket: { callsign: 'OPS', role: '赛管' }
}
const automaticDirectorStaff = getDirectorCutSelection(directorStaffPayload, '', 'zh-CN')
const manualDirectorStaff = getDirectorCutSelection(directorStaffPayload, 'sombra', 'zh-CN')
const appliedDirectorStaff = applyDirectorCutSelection(directorStaffPayload, manualDirectorStaff)
if (automaticDirectorStaff.ready || automaticDirectorStaff.choiceLabel !== 'SELECT HERO') {
  errors.push('director-cut: staff should not receive an automatic portrait or hero fallback')
}
if (
  manualDirectorStaff.subjectMode !== 'hero'
  || !manualDirectorStaff.ready
  || appliedDirectorStaff.heroRender !== '/review/hero-renders/damage/sombra.png'
  || appliedDirectorStaff.directorCut?.heroName !== '黑影'
) {
  errors.push('director-cut: staff manual selection did not resolve the selected hero design')
}
const koreanSemanticMovieTicket = getCinemaTicketData({
  cardKind: 'player',
  locale: 'ko-KR',
  seasonMark: 'FCR 2026',
  playerTicket: {
    playerName: 'LOCALIZED PLAYER',
    battleTag: 'Localized#2026',
    team: 'FF',
    teamFullName: 'French Fries',
    rank: '20위',
    role: '지원',
    competitionSize: 38,
    matchCount: 6,
    mapCount: 12,
    minutes: 129.2
  }
})
if (koreanSemanticMovieTicket?.screen !== 'SPOTLIGHT' || koreanSemanticMovieTicket?.row !== 'S') {
  errors.push('movie-ticket: localized Korean rank or role changed the SCREEN / ROW semantics')
}
if (
  !String(koreanSemanticMovieTicket?.note || '').includes('6경기 · 12개 전장 · 129.2분')
  || !String(koreanSemanticMovieTicket?.note || '').includes('LOCALIZED PLAYER')
) {
  errors.push('movie-ticket: Korean participant proof line lost its match, map, minute, or identity data')
}
teamIds.forEach(teamId => auditStory(`team:${teamId}`, buildTeamStory(db, teamId)))

Object.entries(playerStoryBranches).forEach(([branch, count]) => {
  if (!count) errors.push(`coverage: no ${branch} player story branch was found`)
})

const identityEntries = getReviewIdentityEntries(db)
const portfolios = new Map()
identityEntries.forEach(entry => {
  const key = entry?.battleTag
  if (!key || portfolios.has(normalize(key))) return
  const portfolio = getReviewIdentityPortfolio(db, key)
  if (portfolio?.isMultiple) portfolios.set(normalize(key), portfolio)
})

portfolios.forEach(portfolio => {
  auditStory(`person:${portfolio.battleTag}`, buildPersonStory(db, portfolio.battleTag))
})

const teamStaffEntries = safeArr(db?.review_identity_records).filter(entry => {
  const staffType = entry?.identityType
  return staffType === 'manager' || staffType === 'coach'
})

teamStaffEntries.forEach(entry => {
  const staffType = entry.identityType
  const teamId = entry?.teamId || entry?.teamName
  const identityKey = entry?.battleTag || entry?.displayName
  auditStory(`team-${staffType}:${teamId}:${identityKey}`, buildTeamStory(db, teamId, staffType, identityKey))
})

const staffIndex = buildStaffIndex(db)
staffIndex.admins.forEach(staff => {
  const scenes = buildStaffStory(db, 'admin', staff.staff_key)
  auditStory(`admin:${staff.staff_name}`, scenes)
  auditStaffPresentation('admin', staff, scenes)
})
staffIndex.casters.forEach(staff => {
  const scenes = buildStaffStory(db, 'caster', staff.staff_key)
  auditStory(`caster:${staff.staff_name}`, scenes)
  auditStaffPresentation('caster', staff, scenes)
})
const tournamentStory = buildTournamentStory(db)
auditStory('tournament:FCR26', tournamentStory)

const witnessTicket = getCinemaTicketData(getPosterPayload(tournamentStory))
const managerTicket = getCinemaTicketData(getPosterPayload(buildTeamStory(db, 'FCR26-T001', 'manager', '四季冬#51594')))
if (witnessTicket.showDate !== '2026.06.26' || witnessTicket.showtime !== '20:30') {
  errors.push('movie-ticket: witness first record was replaced by a later match time')
}
if (managerTicket.showDate !== '2026.06.27' || managerTicket.showtime !== '21:30') {
  errors.push('movie-ticket: manager first record does not match the FF opening match')
}
const unknownFirstTime = getCinemaTicketData({
  cardKind: 'tournament', identityTicket: { routeStartLabel: '2026.06.26' },
  scenes: [{ title: 'Grand final 21:15', scheduledText: '2026-08-16 21:15', chips: ['21:15'] }]
})
if (unknownFirstTime.showtime !== '--:--') {
  errors.push('movie-ticket: missing first time was guessed from an unrelated scene')
}
const skyFilmStages = getFilmStageLabels(getPosterPayload(buildPlayerStory(db, 'FCR26-P0042')))
if (skyFilmStages.includes('PLAYOFFS') || skyFilmStages[0] !== 'OPEN QUALIFIER') {
  errors.push('film-poster: SKY is incorrectly shown as reaching the playoffs')
}
const lateCoachStory = buildTeamStory(db, 'FCR26-T017', 'coach', '老练的白鲸#55247')
const lateCoachPayload = getPosterPayload(lateCoachStory)
if (getCinemaTicketData(lateCoachPayload).showDate !== '2026.08.06' || getFilmStageLabels(lateCoachPayload)[0] !== 'PLAYOFFS') {
  errors.push('movie-ticket: playoff coach inherited the team record before joining')
}

const openQualifierScene = tournamentStory.find(scene => scene?.eyebrow === 'OPEN QUALIFIER')
const archivedMatchCount = safeArr(openQualifierScene?.statLines)
  .find(line => line?.label === '比赛场次')?.value
if (Number(archivedMatchCount) !== 137) {
  errors.push(`tournament: archived match count should remain 137, got ${archivedMatchCount || '-'}`)
}

const crewScene = tournamentStory.find(scene => scene?.eyebrow === 'VOICE AND STAFF')
const tournamentStaffCount = crewScene?.statLines?.find(line => line?.label === '赛管人数')?.value
if (Number(tournamentStaffCount) !== staffIndex.admins.length) {
  errors.push(`tournament: staff count ${tournamentStaffCount || '-'} does not match index count ${staffIndex.admins.length}`)
}

const grandFinalScene = tournamentStory.find(scene => scene?.eyebrow === 'GRAND FINAL')
const grandFinalText = JSON.stringify(grandFinalScene || {})
if (!grandFinalScene || !grandFinalText.includes('AIP') || !grandFinalText.includes('REG') || !grandFinalText.includes('0') || !grandFinalText.includes('4')) {
  errors.push('tournament: grand final scene does not contain the final REG 0-4 AIP record')
}

const mapMemoryScene = tournamentStory.find(scene => scene?.eyebrow === 'MAP MEMORY')
if (!mapMemoryScene || safeArr(mapMemoryScene.mapCards).length < 3) {
  errors.push(`tournament: map memory should expose three real map archive cards, got ${safeArr(mapMemoryScene?.mapCards).length}`)
}

const witnessScene = tournamentStory.find(scene => scene?.eyebrow === 'WITNESS MEMORY')
const witnessStats = safeArr(witnessScene?.witnessStats)
if (!witnessScene || witnessStats.length !== 3 || !witnessScene?.witnessPrompt?.title) {
  errors.push('tournament: witness ending is missing its archive coordinates or signing prompt')
}
if (witnessStats.some(item => !Number(item?.value))) {
  errors.push('tournament: witness archive coordinates contain an empty public count')
}

const playerIdentities = identityEntries.filter(entry => entry?.identityType === 'player' && entry?.playerId)
const introductionPlayers = playerIdentities.filter(entry => entry?.rosterStatus === 'PLAYOFF_INTRODUCTION')
const withdrawalPlayers = playerIdentities.filter(entry => entry?.rosterStatus === 'PLAYOFF_WITHDRAWAL')
if (!introductionPlayers.length) errors.push('coverage: no playoff-introduction player was found')
if (!withdrawalPlayers.length) errors.push('coverage: no playoff-withdrawal player was found')

for (const entry of [...introductionPlayers, ...withdrawalPlayers]) {
  const scenes = buildPlayerStory(db, entry.playerId)
  if (!scenes.some(scene => scene?.eyebrow === 'POSTSEASON ROSTER')) {
    errors.push(`coverage: ${entry.playerId} has no POSTSEASON ROSTER scene`)
  }
}

for (const entry of introductionPlayers) {
  const cinemaScenes = buildCinemaReviewScenes(buildPlayerStory(db, entry.playerId), { isRegular: true, locale: 'zh-CN' })
  const acts = cinemaScenes
    .filter(scene => scene?.visualType === 'actTitle')
    .map(scene => scene.seasonAct)
  if (acts.join(',') !== 'playoffs') {
    errors.push(`coverage: playoff introduction ${entry.playerId} produced ${acts.join(',') || 'no'} chapter(s)`)
  }
  if (Number(entry.mapsPlayed) > 0 && getFilmStageLabels(getPosterPayload(cinemaScenes))[0] !== 'PLAYOFFS') {
    errors.push(`film-poster: playoff introduction ${entry.playerId} includes an earlier personal stage`)
  }
}

for (const entry of withdrawalPlayers) {
  const cinemaScenes = buildCinemaReviewScenes(buildPlayerStory(db, entry.playerId), { isRegular: true, locale: 'zh-CN' })
  const acts = cinemaScenes
    .filter(scene => scene?.visualType === 'actTitle')
    .map(scene => scene.seasonAct)
  if (acts.join(',') !== 'qualifier') {
    errors.push(`coverage: playoff withdrawal ${entry.playerId} produced ${acts.join(',') || 'no'} chapter(s)`)
  }
  if (getFilmStageLabels(getPosterPayload(cinemaScenes)).includes('PLAYOFFS')) {
    errors.push(`film-poster: withdrawn player ${entry.playerId} inherited the team's playoff stage`)
  }
}

if (!identityEntries.some(entry => Number(entry?.mapsPlayed || 0) === 0)) {
  errors.push('coverage: no zero-map identity was found')
}
if (!identityEntries.some(entry => Number(entry?.mapsPlayed || 0) >= 20)) {
  errors.push('coverage: no full-season player identity was found')
}

auditSearch(db)
auditCinemaChapters()
const genericCoverage = auditGenericCoverage(db, teamIds, staffIndex, identityEntries)
const assetSummary = auditAssets()

const sceneCounts = storyStats.map(row => row.scenes)
const summary = {
  snapshot: {
    publishedAt: readiness.summary.publishedAt,
    ...readiness.summary.counts,
    stageMatches: readiness.summary.stageCounts
  },
  stories: {
    total: storyStats.length,
    players: playerIds.length,
    teams: teamIds.length,
    multiIdentity: portfolios.size,
    teamStaff: teamStaffEntries.length,
    admins: staffIndex.admins.length,
    casters: staffIndex.casters.length,
    minScenes: Math.min(...sceneCounts),
    maxScenes: Math.max(...sceneCounts)
  },
  coverage: {
    playoffIntroductions: introductionPlayers.length,
    playoffWithdrawals: withdrawalPlayers.length,
    zeroMapIdentities: identityEntries.filter(entry => Number(entry?.mapsPlayed || 0) === 0).length,
    playerStoryBranches,
    ...genericCoverage
  },
  assets: assetSummary,
  releaseValidation,
  notes: notes.length,
  warnings: warnings.length,
  errors: errors.length
}

console.log(JSON.stringify(summary, null, 2))
notes.forEach(message => console.info(`INFO ${message}`))
warnings.forEach(message => console.warn(`WARN ${message}`))

if (errors.length) {
  errors.forEach(message => console.error(`ERROR ${message}`))
  throw new Error(`FCR26 review audit failed with ${errors.length} error(s)`)
}

console.log('FCR26 review audit passed.')
