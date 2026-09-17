export const BROADCAST_REPLAY_ARCHIVE_URL = 'https://space.bilibili.com/3632300164123415'

const FINISHED_MATCH_STATUSES = new Set(['COMPLETE', 'COMPLETED', 'FINISHED'])

function cleanText(value) {
  return String(value ?? '').trim()
}

function normalizeKey(value) {
  return cleanText(value).toLowerCase()
}

function isFinishedMatch(match) {
  return FINISHED_MATCH_STATUSES.has(cleanText(match?.status).toUpperCase())
}

function asList(value) {
  if (!value) return []
  return Array.isArray(value) ? value : [value]
}

function isExplicitFalse(value) {
  const text = normalizeKey(value)
  return value === false || text === 'false' || text === '0' || text === 'no'
}

function normalizePerson(person) {
  if (!person) return null
  if (typeof person !== 'object') {
    const name = cleanText(person)
    return name ? { name: name.replace(/#\d+$/, ''), battleTag: /#\d+$/.test(name) ? name : '' } : null
  }

  const battleTag = cleanText(
    person.battle_tag ||
    person.battleTag ||
    person.battletag ||
    person.battle_net_id ||
    person.battleNetId ||
    person.tag
  )
  const name = cleanText(
    person.name ||
    person.nickname ||
    person.display_name ||
    person.displayName ||
    person.staff_name ||
    person.staffName ||
    person.caster_name ||
    person.casterName ||
    person.referee_name ||
    person.refereeName ||
    battleTag
  )

  if (!name && !battleTag) return null
  return { name: name || battleTag, battleTag }
}

function collectPeople(...values) {
  const people = values
    .flatMap(value => asList(value))
    .map(normalizePerson)
    .filter(Boolean)
  const result = []
  for (const person of people) {
    const tag = normalizeKey(person.battleTag)
    const name = normalizeKey(person.name)
    const duplicate = result.findIndex(existing => (
      (tag && (tag === normalizeKey(existing.battleTag) || tag === normalizeKey(existing.name))) ||
      (name === normalizeKey(existing.name) && (!tag || !existing.battleTag || tag === normalizeKey(existing.battleTag))) ||
      name === normalizeKey(existing.battleTag)
    ))
    if (duplicate < 0) result.push(person)
    else if ((!result[duplicate].battleTag && tag) || (result[duplicate].name === result[duplicate].battleTag && person.name !== person.battleTag)) result[duplicate] = person
  }
  return result
}

function formatPeople(people) {
  return people.map(person => (
    person.battleTag && normalizeKey(person.battleTag) !== normalizeKey(person.name)
      ? `${person.name} / ${person.battleTag}`
      : person.name
  )).join(' / ')
}

function normalizeStreamLink(stream, fallbackLabel = '') {
  if (!stream) return null
  if (typeof stream !== 'object') {
    const url = cleanText(stream)
    return url ? { label: cleanText(fallbackLabel) || '直播间', url, staff: null } : null
  }

  const url = cleanText(
    stream.stream_url ||
    stream.streamUrl ||
    stream.url ||
    stream.live_url ||
    stream.liveUrl ||
    stream.room_url ||
    stream.roomUrl ||
    stream.room ||
    stream.link ||
    stream['\u76f4\u64ad\u95f4']
  )
  if (!url) return null

  const staff = normalizePerson(stream.staff || stream.person || stream.caster || stream.host)
  const label = cleanText(
    stream.label ||
    stream.name ||
    stream.title ||
    stream.room_name ||
    stream.roomName ||
    staff?.name ||
    fallbackLabel ||
    '直播间'
  )

  return {
    label,
    url,
    staff
  }
}

function collectStreamLinks(source, primaryUrl) {
  const primary = primaryUrl
    ? [{ label: cleanText(source.stream_label || source.streamLabel || source.label) || '官方直播间', url: primaryUrl, staff: null }]
    : []
  const indexed = [
    ['a', 'A'],
    ['b', 'B'],
    ['1', '1'],
    ['2', '2']
  ].map(([key, label]) => {
    const url = cleanText(
      source[`stream_url_${key}`] ||
      source[`streamUrl${label}`] ||
      source[`live_url_${key}`] ||
      source[`liveUrl${label}`] ||
      source[`room_url_${key}`] ||
      source[`roomUrl${label}`]
    )
    if (!url) return null

    const staff = normalizePerson(
      source[`caster_${key}`] ||
      source[`caster${label}`] ||
      source[`commentator_${key}`] ||
      source[`commentator${label}`]
    )

    return {
      label: cleanText(source[`stream_label_${key}`] || source[`streamLabel${label}`]) || staff?.name || `直播间 ${label}`,
      url,
      staff
    }
  }).filter(Boolean)
  const extras = [
    source.extra_streams,
    source.extraStreams,
    source.streams,
    source.stream_links,
    source.streamLinks,
    source.rooms,
    source.extra_rooms,
    source.extraRooms
  ].flatMap(value => asList(value)).map(stream => normalizeStreamLink(stream, '额外直播间')).filter(Boolean)
  const seen = new Set()

  return [...primary, ...indexed, ...extras].filter(stream => {
    const key = normalizeKey(stream.url)
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function emptyBroadcastInfo() {
  return {
    isBroadcast: false,
    streamUrl: '',
    streamLinks: [],
    casters: [],
    referees: [],
    staffGroups: [],
    casterText: '',
    refereeText: '',
    hasPublicInfo: false
  }
}

export function getBroadcastInfo(match = {}) {
  const candidate = match?.broadcast || match?.stream || match?.live
  const source = candidate && typeof candidate === 'object' ? candidate : {}
  const replayUrl = cleanText(source.replay_url || source.replayUrl || source.vod_url || source.vodUrl ||
    match.replay_url || match.replayUrl || match.vod_url || match.vodUrl)
  const validReplayUrl = /^https?:\/\//i.test(replayUrl) ? replayUrl : ''

  const streamUrl = cleanText(
    source.stream_url ||
    source.streamUrl ||
    source.url ||
    source.live_url ||
    source.liveUrl ||
    source.room_url ||
    source.roomUrl ||
    source.room ||
    source.link ||
    source['\u76f4\u64ad\u95f4']
  )
  const liveStreamLinks = collectStreamLinks(source, streamUrl)
  const crew = asList(source.crew)
  const crewInRole = role => crew.filter(person => cleanText(person?.role).toUpperCase() === role)
  const casters = collectPeople(
    crewInRole('CASTER'),
    source.casters,
    source.caster,
    source.commentators,
    source.commentator,
    source.caster_names,
    source.casterNames,
    source.commentator_names,
    source.commentatorNames,
    source.caster_a,
    source.casterA,
    source.caster_b,
    source.casterB,
    source.caster_1,
    source.caster1,
    source.caster_2,
    source.caster2,
    source['\u89e3\u8bf4']
  )
  const referees = collectPeople(
    crewInRole('REFEREE'),
    source.referees,
    source.referee,
    source.staff,
    source.staffs,
    source.admins,
    source.admin,
    source.officials,
    source.referee_names,
    source.refereeNames,
    source.staff_names,
    source.staffNames,
    source.admin_names,
    source.adminNames,
    source.admin_a,
    source.adminA,
    source.admin_b,
    source.adminB,
    source.admin_1,
    source.admin1,
    source.admin_2,
    source.admin2,
    source['\u8d5b\u7ba1']
  )
  const staffGroups = [
    { role: 'CASTER', people: casters },
    { role: 'REFEREE', people: referees },
    { role: 'VOICE_REFEREE', people: collectPeople(source.voice_referees, crewInRole('VOICE_REFEREE')) },
    { role: 'DIRECTOR', people: collectPeople(source.directors, crewInRole('DIRECTOR')) },
    { role: 'OB', people: collectPeople(source.observers, crewInRole('OB')) }
  ].filter(group => group.people.length)
  const isBroadcast = !isExplicitFalse(source.is_broadcast ?? source.isBroadcast) && (
    Boolean(source.is_broadcast ?? source.isBroadcast) ||
    liveStreamLinks.length > 0 ||
    validReplayUrl ||
    casters.length > 0 ||
    staffGroups.length > 0
  )

  if (!isBroadcast) return emptyBroadcastInfo()

  const isFinished = isFinishedMatch(match)
  const streamLinks = isFinished
    ? [{ label: validReplayUrl ? '本场录像' : '赛事录像库', url: validReplayUrl || BROADCAST_REPLAY_ARCHIVE_URL, staff: null,
      kind: validReplayUrl ? 'replay' : 'archive' }]
    : liveStreamLinks

  return {
    isBroadcast,
    streamUrl: isFinished ? validReplayUrl || BROADCAST_REPLAY_ARCHIVE_URL : streamUrl,
    streamLinks,
    casters,
    referees,
    staffGroups,
    casterText: formatPeople(casters),
    refereeText: formatPeople(referees),
    hasPublicInfo: streamLinks.length > 0 || staffGroups.length > 0
  }
}
