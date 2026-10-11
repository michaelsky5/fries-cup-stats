const text = value => String(value ?? '').trim()

export function getPublicMatchCode(match) {
  const explicit = text(match?.match_code || match?.matchCode)
  const raw = text(match?.raw_match_id || match?.id || match?.match_id)
  if (match?.cycle_week_id || match?.cycleWeekId) {
    // Keep the immutable backend suffix. Never number old games from a filtered
    // list, and never replace the IDs used by URLs, logs or match rooms.
    const value = explicit || raw
    if (/-WEEKLY-/i.test(value)) return value
    if (/-(OTHER|SWISS|LCQ|PLAYOFFS|GRAND_FINAL)-[a-f0-9]{8}$/i.test(value)) return value.replace(/-(OTHER|SWISS|LCQ|PLAYOFFS|GRAND_FINAL)-([a-f0-9]{8})$/i, '-WEEKLY-$2')
    if (explicit) return explicit
  }
  return explicit || text(match?.match_id || match?.match_display_name) || raw
}
