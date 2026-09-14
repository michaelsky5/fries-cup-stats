import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { getStaffDirectory } from '../src/lib/rosterSelectors.js'
import { getEventStaffDirectory, getStaffProfile, getStaffProfilePath } from '../src/lib/staffProfiles.js'
import { getAdminNamesFromMatch, getCasterNamesFromMatch } from '../src/lib/reviewSearch.js'

const input = (name, fallback) => process.argv.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3) || fallback
const sources = [['FCR2026', input('fcr', 'public/data/fcr2026_local_public.json')], ['FCA2026', input('fca', 'public/data/friescup_db_review_ready.json')], ['QGCS4', input('qgc', 'public/data/qgcs4_preseason_public.json')]]
let profilesChecked = 0
for (const [season, path] of sources) {
  const db = JSON.parse(readFileSync(path, 'utf8'))
  const eventStaff = getEventStaffDirectory(db)
  const teamStaff = getStaffDirectory(db)
  const rows = [...eventStaff, ...teamStaff]
  const matchIds = new Set(db.matches.map(match => match.match_id))
  const playerIds = new Set(db.players.map(player => player.player_id))
  assert.equal(new Set(rows.map(row => row.id)).size, rows.length, `${season}: unique typed records`)
  for (const row of rows) {
    const url = new URL(getStaffProfilePath(row), 'http://localhost')
    const profile = getStaffProfile(db, decodeURIComponent(url.pathname.split('/').at(-1)))
    assert.equal(profile.name, row.name, `${season}: identity survives URL encoding`)
    assert.equal(url.searchParams.get('group'), row.team ? 'team' : 'event')
    if (row.team) {
      assert.ok(profile.players.every(player => playerIds.has(player.player_id)), `${season}: roster links exist`)
      assert.ok(profile.colleagues.every(person => person.team.routeId === row.team.routeId && person.id !== row.id))
      assert.equal(profile.matchCount, undefined, 'Team staff do not inherit individual match credits')
    } else {
      assert.equal(profile.matches.length, profile.matchCount)
      assert.equal(new Set(profile.matches.map(match => match.match_id)).size, profile.matchCount, `${season}: each match counted once`)
      assert.ok(profile.matches.every(match => matchIds.has(match.match_id)), `${season}: match links exist`)
      assert.equal(profile.stages.reduce((sum, stage) => sum + stage.count, 0), profile.matchCount)
      const names = profile.role === 'caster' ? getCasterNamesFromMatch : getAdminNamesFromMatch
      assert.ok(profile.matches.every(match => names(match).includes(profile.name)), `${season}: every credit has a source`)
      for (const colleague of profile.colleagues) {
        assert.equal(colleague.role, profile.role)
        assert.equal(colleague.sharedMatchCount, profile.matches.filter(match => names(match).includes(colleague.name)).length)
      }
    }
    profilesChecked += 1
  }
  assert.equal(getStaffProfile(db, 'no-such-staff'), null)
  console.log(`${season}: ${eventStaff.length} event + ${teamStaff.length} team profiles checked (${db.matches.length} published matches)`)
}

const unusual = 'A%20 / 中文 #123'
const fixture = { teams: [], players: [], matches: [{ match_id: 'm1', stage:'GROUP', broadcast:{admin:{display_name:unusual},caster:{display_name:unusual}} }] }
const rows = getEventStaffDirectory(fixture)
assert.equal(rows.length, 2, 'Different roles remain separate')
for (const row of rows) {
  const path = new URL(getStaffProfilePath(row), 'http://localhost').pathname
  assert.equal(getStaffProfile(fixture, decodeURIComponent(path.split('/').at(-1))).name, row.name, 'Percent signs are not decoded twice')
}
assert.equal(getStaffProfile({ teams:[], players:[], matches:[] }, rows[0].id), null, 'Event changes cannot retain another event’s staff')
const registrationFixture = { teams:[{team_id:'T1',team_short_name:'Shared',player_ids:['P1','P-MISSING'],staff:{managers:[{name:'Manager',battle_tag:'Mgr#1000'}]}}], players:[{player_id:'P1',team_id:'T1'},{player_id:'FOREIGN',team_id:'T2',team_short_name:'Shared'}], matches:[] }
const registration = getStaffProfile(registrationFixture, getStaffDirectory(registrationFixture)[0].id)
assert.deepEqual(registration.players.map(player => player.player_id), ['P1'], 'Same-name teams cannot contribute extra players to an explicit roster')
assert.equal(registration.rosterCount, 2)
assert.equal(registration.unavailablePlayers, 1, 'Missing player profiles remain missing, not invented links')
console.log(`${profilesChecked} staff profiles validated; empty, missing, role and encoded-name boundaries passed.`)
