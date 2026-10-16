import { translateUiText as uiText } from '../../lib/uiText.js'

export function roomMapResultLabel(map, match, locale) {
  if (map?.isAdministrative && map.administrativeReason === 'MAP_FORFEIT') {
    const team = match?.[`team${map.forfeitedBySide}`]
    return uiText('{0} · 单图弃权', locale, [team?.shortName || team?.name || map.forfeitedBySide])
  }
  return `${map?.scoreA ?? '—'} : ${map?.scoreB ?? '—'}`
}
