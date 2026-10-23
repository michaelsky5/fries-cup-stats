import { normalizeLocale } from '../../lib/locales.js'

// An older generated Korean cross-role note used a missing support label.
// Correct only that exact generated template; preserve editorial changes,
// identities, source records and the stored publication object.
export function localizePublishedPersonNote(person, locale) {
  if (normalizeLocale(locale) !== 'ko-KR' || person?.kind !== 'cross-role') return person
  // Public projection intentionally omits roster/source arrays. Match only the
  // complete generated sentence, without deriving or changing any numbers.
  const legacy = person.detail
  const match = typeof legacy === 'string' && legacy.match(/^이번 주 (\d+)맵 출전: ((?:돌격|공격|辅助|지원) \d+맵(?:、(?:돌격|공격|辅助|지원) \d+맵)*)\.$/u)
  if (!match) return person
  const roles = match[2].split('、').map(part => part.startsWith('辅助 ') ? '지원 ' + part.slice(3) : part)
  const detail = `이번 주 ${match[1]}맵 출전: ${roles.join(', ')}.`
  return { ...person, detail,
    description: person.description === `${person.name}: ${legacy}` ? `${person.name}: ${detail}` : person.description }
}
