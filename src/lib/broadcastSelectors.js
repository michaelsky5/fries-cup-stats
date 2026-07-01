function cleanText(value) {
  return String(value ?? '').trim()
}

function normalizeKey(value) {
  return cleanText(value).toLowerCase()
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
    return name ? { name, battleTag: '' } : null
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
  const seen = new Set()

  return people.filter(person => {
    const key = `${normalizeKey(person.name)}::${normalizeKey(person.battleTag)}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function formatPeople(people) {
  return people.map(person => (
    person.battleTag && normalizeKey(person.battleTag) !== normalizeKey(person.name)
      ? `${person.name} / ${person.battleTag}`
      : person.name
  )).join(' / ')
}

function emptyBroadcastInfo() {
  return {
    isBroadcast: false,
    streamUrl: '',
    casters: [],
    referees: [],
    casterText: '',
    refereeText: '',
    hasPublicInfo: false
  }
}

export function getBroadcastInfo(match = {}) {
  const source = match?.broadcast || match?.stream || match?.live
  if (!source || typeof source !== 'object') return emptyBroadcastInfo()

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
  const casters = collectPeople(
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
  const isBroadcast = !isExplicitFalse(source.is_broadcast ?? source.isBroadcast) && (
    Boolean(source.is_broadcast ?? source.isBroadcast) ||
    Boolean(streamUrl) ||
    casters.length > 0 ||
    referees.length > 0
  )

  if (!isBroadcast) return emptyBroadcastInfo()

  return {
    isBroadcast,
    streamUrl,
    casters,
    referees,
    casterText: formatPeople(casters),
    refereeText: formatPeople(referees),
    hasPublicInfo: Boolean(streamUrl) || casters.length > 0 || referees.length > 0
  }
}
