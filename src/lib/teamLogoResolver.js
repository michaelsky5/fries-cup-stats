import { TEAM_LOGO_CATALOG } from '../generated/teamLogoCatalog.js'

const LOGO_EXTENSIONS = Object.freeze(['png', 'webp', 'jpg', 'jpeg', 'svg'])
const GLOBAL_TEAM_LOGO_FALLBACK = '/logos/fc_logo.png'

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)))
}

function text(value) {
  return typeof value === 'string' || typeof value === 'number'
    ? String(value).trim()
    : ''
}

export function normalizeTeamLogoKey(value) {
  return text(value)
    .normalize('NFKC')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('en-US')
    .replace(/[^\p{L}\p{N}]+/gu, '')
}

function normalizeDirectory(value) {
  return text(value)
    .replace(/[^a-z0-9._-]+/gi, '')
    .toUpperCase()
}

function catalogDirectory(value) {
  const key = normalizeTeamLogoKey(value)
  if (!key) return ''
  return Object.keys(TEAM_LOGO_CATALOG).find(directory => normalizeTeamLogoKey(directory) === key) || ''
}

function getSeasonValues(seasonLike) {
  if (typeof seasonLike === 'string' || typeof seasonLike === 'number') return [text(seasonLike)]
  if (!seasonLike || typeof seasonLike !== 'object') return []

  return unique([
    seasonLike.logoDirectory,
    seasonLike.logo_directory,
    seasonLike.id,
    seasonLike.seasonId,
    seasonLike.season_id,
    seasonLike.publicCode,
    seasonLike.public_code,
    seasonLike.seasonCode,
    seasonLike.season_code,
    seasonLike.meta?.season_id,
    seasonLike.meta?.seasonId,
    seasonLike.meta?.season_code,
    seasonLike.meta?.seasonCode,
    seasonLike.season?.logoDirectory,
    seasonLike.season?.logo_directory,
    seasonLike.season?.id,
    seasonLike.season?.seasonId,
    seasonLike.season?.season_id,
    seasonLike.season?.publicCode,
    seasonLike.season?.public_code,
    seasonLike.season?.seasonCode,
    seasonLike.season?.season_code
  ].map(text))
}

function getTeamId(team) {
  if (!team || typeof team !== 'object') return ''
  return text(team.team_id || team.teamId || team.id)
}

function getTeamSeasonValue(team) {
  const teamId = getTeamId(team)
  return teamId.match(/^(.+?)-T(?:EAM)?\d/i)?.[1] || ''
}

function getSeasonFamily(value) {
  return normalizeDirectory(value).match(/^([A-Z]{2,8})(?:20)?\d{1,4}$/)?.[1] || ''
}

export function getTeamLogoDirectoryCandidates(team, seasonLike) {
  const exact = unique([
    ...getSeasonValues(seasonLike),
    getTeamSeasonValue(team)
  ].map(normalizeDirectory))
  const families = unique(exact.map(getSeasonFamily))
  const knownExact = unique(exact.map(catalogDirectory))
  const knownFamilies = unique(families.map(catalogDirectory))
  const unknownExact = exact.filter(value => {
    return !catalogDirectory(value) && !catalogDirectory(getSeasonFamily(value))
  })

  return unique([
    ...knownExact,
    ...knownFamilies,
    ...unknownExact
  ])
}

function getDirectLogoValues(team) {
  if (!team || typeof team !== 'object') return []
  return unique([
    team.team_logo,
    team.teamLogo,
    team.logo_url,
    team.logoUrl,
    team.logo,
    team.crest_url,
    team.crestUrl,
    team.crest
  ].map(text))
}

function getTeamIdentityValues(team) {
  if (typeof team === 'string' || typeof team === 'number') return [text(team)]
  if (!team || typeof team !== 'object') return []

  return unique([
    team.logo_asset_key,
    team.logoAssetKey,
    team.team_logo_key,
    team.teamLogoKey,
    team.team_short_name,
    team.teamShortName,
    team.short,
    team.abbreviation,
    team.acronym,
    team.team_name,
    team.teamName,
    team.name,
    team.team_id,
    team.teamId,
    team.id,
    team.team_club,
    team.teamClub,
    team.club
  ].map(text))
}

function getLogoStemCandidates(value) {
  const stem = text(value)
  if (!stem || stem.toUpperCase() === 'TBD') return []

  return unique([
    stem,
    stem.replace(/-/g, '.'),
    stem.replace(/\./g, '-'),
    stem.replace(/\s+/g, ''),
    stem.toUpperCase(),
    stem.toLowerCase()
  ])
}

function encodePathSegment(value) {
  return encodeURIComponent(text(value))
}

function getCatalogMatches(directory, identityValues) {
  const entry = TEAM_LOGO_CATALOG[directory]
  if (!entry) return []
  const keys = unique(identityValues.map(normalizeTeamLogoKey))

  return unique([
    ...keys.map(key => entry.aliases?.[key]),
    ...keys.map(key => entry.assets?.[key])
  ])
}

function getConventionCandidates(directory, identityValues) {
  if (TEAM_LOGO_CATALOG[directory]) return []
  const encodedDirectory = encodePathSegment(directory)
  const stems = unique(identityValues.flatMap(getLogoStemCandidates))

  return stems.flatMap(stem => {
    const encodedStem = encodePathSegment(stem)
    return LOGO_EXTENSIONS.map(extension => `/logos/${encodedDirectory}/${encodedStem}.${extension}`)
  })
}

function getRootLegacyCandidates(identityValues) {
  const stems = unique(identityValues.flatMap(getLogoStemCandidates))
  return stems.flatMap(stem => {
    const encodedStem = encodePathSegment(stem)
    return LOGO_EXTENSIONS.map(extension => `/logos/${encodedStem}.${extension}`)
  })
}

export function getDefaultTeamLogoCandidates(seasonLike, team = null) {
  const directories = getTeamLogoDirectoryCandidates(team, seasonLike)
  return unique([
    ...directories.map(directory => TEAM_LOGO_CATALOG[directory]?.fallback),
    ...directories
      .filter(directory => !TEAM_LOGO_CATALOG[directory])
      .map(directory => `/logos/${encodePathSegment(directory)}/OW.png`),
    GLOBAL_TEAM_LOGO_FALLBACK
  ])
}

export function getTeamLogoCandidates(team, seasonLike) {
  const logoTeam = typeof team === 'object' && team !== null
    ? team
    : { team_short_name: text(team) }
  const directories = getTeamLogoDirectoryCandidates(logoTeam, seasonLike)
  const identityValues = getTeamIdentityValues(logoTeam)

  return unique([
    ...getDirectLogoValues(logoTeam),
    ...directories.flatMap(directory => getCatalogMatches(directory, identityValues)),
    ...directories.flatMap(directory => getConventionCandidates(directory, identityValues)),
    ...(directories.length ? [] : getRootLegacyCandidates(identityValues)),
    ...getDefaultTeamLogoCandidates(seasonLike, logoTeam)
  ])
}

export function getTeamLogo(team, seasonLike) {
  return getTeamLogoCandidates(team, seasonLike)[0] || GLOBAL_TEAM_LOGO_FALLBACK
}
