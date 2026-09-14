import assert from 'node:assert/strict'
import fs from 'node:fs'
import { getSeasonById } from '../src/config/seasons.js'
import { getReviewReadiness } from '../src/lib/reviewReadiness.js'
import { getLocalizedReviewSeasonProfile, prepareReviewDb } from '../src/lib/reviewSeason.js'
import { buildPlayerStory, buildTeamStory, buildStaffStory, buildTournamentStory } from '../src/lib/reviewStoryBuilders.js'
import { localizeReviewScenes } from '../src/lib/reviewLocale.js'
import { buildCinemaReviewScenes } from '../src/lib/reviewCinema.js'
import { buildStaffIndex } from '../src/lib/reviewSearch.js'
import { ensureUiLocale, ensureTraditionalReview } from '../src/lib/localeCatalog.js'
import { SIGNAL_LEADERBOARD_COLUMNS } from '../src/lib/leaderboardSelectors.js'
import { getPosterPayload, getCinemaTicketData } from '../src/lib/reviewPoster.js'

await Promise.all(['en-US', 'ko-KR', 'zh-TW'].map(ensureUiLocale))
await ensureTraditionalReview()
const raw = JSON.parse(fs.readFileSync(new URL('../public/data/qgcs4_review_public.json', import.meta.url)))
const db = prepareReviewDb(raw)
assert.equal(getReviewReadiness(getSeasonById('QGCS4'), db).available, true)
assert.equal(db.players.length, raw.players.length, 'QGCS4 must not acquire FCR roster overrides')
assert.equal(db.teams.find(t => t.team_short_name === 'NF').final_rank, 1)
assert.equal(raw.teams.find(t => t.team_short_name === 'NF').final_rank, '', 'review preparation must not mutate source')
const staff = buildStaffIndex(db)
const stories = [
  ...db.players.map(player => ['player/' + player.player_id, buildPlayerStory(db, player.player_id)]),
  ...db.teams.map(team => ['team/' + team.team_id, buildTeamStory(db, team.team_id)]),
  ...staff.admins.map(row => ['admin/' + row.staff_key, buildStaffStory(db, 'admin', row.staff_key)]),
  ...staff.casters.map(row => ['caster/' + row.staff_key, buildStaffStory(db, 'caster', row.staff_key)]),
  ['tournament', buildTournamentStory(db)]
]
let checked = 0
for (const [name, source] of stories) {
  assert.ok(source.length > 2, `${name}: meaningful scenes`)
  assert.ok(!source.some(scene => scene.kind === 'organizer'), `${name}: no other event's signed letter`)
  for (const locale of ['zh-CN', 'en-US', 'ko-KR', 'zh-TW']) {
    const profile = getLocalizedReviewSeasonProfile(db, locale)
    assert.equal(profile.usesRegularTemplate, true)
    const localized = localizeReviewScenes(source, locale, profile)
    const scenes = buildCinemaReviewScenes(localized, { isRegular: profile.usesRegularTemplate, isPartner: true, locale })
    const copy = JSON.stringify(scenes)
    assert.ok(!/undefined|NaN|\[object Object\]/.test(copy), `${name}/${locale}: invalid data`)
    assert.ok(!/瑞士|突围|突圍|双败|雙敗|败者组|敗者組|学院赛|學院賽|Swiss|LCQ|double.elimination|스위스|더블 엘리미네이션/.test(copy), `${name}/${locale}: incorrect format: ${copy.match(/.{0,50}(?:瑞士|突围|突圍|双败|雙敗|败者组|敗者組|学院赛|學院賽|Swiss|LCQ|double.elimination|스위스|더블 엘리미네이션).{0,90}/)?.[0]}`)
    assert.ok(scenes.some(scene => scene.kind === 'act'), `${name}/${locale}: same cinema chapters`)
    const poster = { ...getPosterPayload(localized), locale }
    assert.equal(poster.seasonId, 'QGCS4', `${name}/${locale}: keepsake belongs to the selected event`)
    assert.equal(poster.usesRegularTemplate, true, `${name}/${locale}: keepsake shares the regular template`)
    assert.match(poster.cardType, /PARTNER/, `${name}/${locale}: partner keepsake branding`)
    assert.match(getCinemaTicketData(poster).copy.selection, /PARTNER ARCHIVE/, `${name}/${locale}: cinema export branding`)
    checked++
  }
}
// Modern crew-only feeds and legacy arrays can coexist, without double counting.
const person = { name: 'Operator', battle_tag: 'Operator#123', avatar: 'https://example.test/avatar.png' }
const match = { match_id: 'crew-test', stage: 'GROUP', team_a: { id: 'A' }, team_b: { id: 'B' }, broadcast: {
  crew: [{ ...person, role: 'DIRECTOR' }, { ...person, role: 'REFEREE' }, { name: 'Voice', role: 'VOICE_REFEREE' }, { name: 'Cast', role: 'CASTER' }, { name: 'Unknown', role: 'UNRECOGNIZED' }], directors: [person]
} }
const index = buildStaffIndex({ matches: [match] })
assert.equal(index.admins.length, 2)
const operator = index.admins.find(row => row.staff_name === 'Operator')
assert.equal(operator.match_count, 1)
assert.equal(operator.avatar, person.avatar)
assert.ok(operator.duties.includes('DIRECTOR') && operator.duties.includes('REFEREE'))
assert.equal(index.casters.length, 1)
assert.ok(!SIGNAL_LEADERBOARD_COLUMNS.some(column => ['team', 'role'].includes(column.id)))
console.log(`PASS: ${stories.length} QGCS4 stories / ${checked} localized story flows; crew deduplication and ranking columns`)
