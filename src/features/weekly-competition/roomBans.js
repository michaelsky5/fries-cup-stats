import { formatOwHeroName } from '../../lib/heroes.js'
import { translateUiText } from '../../lib/uiText.js'
export const roomBanTimedOut = (map, side) => map?.[`ban${side}Status`] === 'TIMED_OUT'
export const roomBanResolved = (map, side) => Boolean(map?.[`ban${side}`]) || roomBanTimedOut(map, side)
export const roomBanLabel = (map, side, locale, fallback = '待定') => roomBanTimedOut(map, side) ? translateUiText('未禁用（超时）', locale) : formatOwHeroName(map?.[`ban${side}`], locale) || translateUiText(fallback, locale)
