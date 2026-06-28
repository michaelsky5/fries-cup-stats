import {
  HERO_SUBROLE_CONFIG,
  HERO_SUBROLE_FALLBACKS
} from '../config/heroSubroles.js'

function cleanText(value) {
  return String(value ?? '').trim()
}

export function normalizeHeroSubroleLookupKey(value) {
  return cleanText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’'`]/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-zA-Z0-9\u4e00-\u9fff]+/g, '')
    .toLowerCase()
}

function normalizeOfficialRole(value) {
  const key = cleanText(value).toUpperCase()
  if (key === 'TANK') return 'TANK'
  if (key === 'DAMAGE' || key === 'DPS' || key === 'DMG' || key === 'HITSCAN' || key === 'FLEX_DPS') {
    return 'DAMAGE'
  }
  if (key === 'SUPPORT' || key === 'SUP' || key === 'MAIN_SUPPORT' || key === 'FLEX_SUPPORT') {
    return 'SUPPORT'
  }
  return 'UNKNOWN'
}

function buildLookup() {
  const lookup = new Map()

  Object.entries(HERO_SUBROLE_CONFIG).forEach(([canonicalHeroName, config]) => {
    const aliases = [
      canonicalHeroName,
      canonicalHeroName.replace(/[:\s.-]+/g, ''),
      canonicalHeroName.replace(/[:.-]+/g, ' '),
      ...(Array.isArray(config.aliases) ? config.aliases : [])
    ]

    aliases.filter(Boolean).forEach(alias => {
      const key = normalizeHeroSubroleLookupKey(alias)
      if (!key || lookup.has(key)) return
      lookup.set(key, {
        canonicalHeroName,
        matchedAlias: alias,
        config
      })
    })
  })

  return lookup
}

const HERO_SUBROLE_LOOKUP = buildLookup()

function createResolvedHero(canonicalHeroName, config, extras = {}) {
  const primarySubrole = config.primarySubrole || 'UNKNOWN'
  return {
    inputHeroName: extras.inputHeroName || '',
    canonicalHeroName,
    officialRole: config.officialRole || 'UNKNOWN',
    primarySubrole,
    resolvedSubrole: primarySubrole,
    secondarySubroles: Array.isArray(config.secondarySubroles) ? [...config.secondarySubroles] : [],
    scoringProfile: config.scoringProfile || 'UNKNOWN',
    known: Boolean(extras.known),
    usedFallback: Boolean(extras.usedFallback),
    aliasMatched: Boolean(extras.aliasMatched),
    matchedAlias: extras.matchedAlias || '',
    context: extras.context || {}
  }
}

export function getHeroSubroleConfig(heroName) {
  const key = normalizeHeroSubroleLookupKey(heroName)
  const match = key ? HERO_SUBROLE_LOOKUP.get(key) : null
  if (!match) return null
  return {
    canonicalHeroName: match.canonicalHeroName,
    ...match.config
  }
}

export function getHeroSubrole(heroName, context = {}) {
  return resolveHeroSubrole(heroName, context).resolvedSubrole
}

export function resolveHeroSubrole(heroName, context = {}) {
  const inputHeroName = cleanText(heroName || context.heroName)
  const key = normalizeHeroSubroleLookupKey(inputHeroName)
  const match = key ? HERO_SUBROLE_LOOKUP.get(key) : null

  if (match) {
    const canonicalKey = normalizeHeroSubroleLookupKey(match.canonicalHeroName)
    const aliasMatched = key !== canonicalKey || inputHeroName !== match.canonicalHeroName
    return createResolvedHero(match.canonicalHeroName, match.config, {
      inputHeroName,
      known: true,
      aliasMatched,
      matchedAlias: aliasMatched ? match.matchedAlias : '',
      context
    })
  }

  const officialRole = normalizeOfficialRole(context.officialRole || context.role || context.primarySubrole)
  const fallback = HERO_SUBROLE_FALLBACKS[officialRole] || HERO_SUBROLE_FALLBACKS.UNKNOWN
  return createResolvedHero(inputHeroName || 'UNKNOWN', fallback, {
    inputHeroName,
    usedFallback: true,
    context
  })
}

export function listHeroSubroleEntries() {
  return Object.entries(HERO_SUBROLE_CONFIG).map(([canonicalHeroName, config]) => ({
    canonicalHeroName,
    ...config,
    secondarySubroles: Array.isArray(config.secondarySubroles) ? [...config.secondarySubroles] : []
  }))
}
