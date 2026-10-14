import assert from 'node:assert/strict'
import test from 'node:test'
import { createDefaultTeamLogo, DEFAULT_TEAM_LOGO } from '../src/lib/defaultTeamLogo.js'
import { getDefaultTeamLogoCandidates, getTeamLogoCandidates } from '../src/lib/teamLogoResolver.js'
import { getTeamLogoCandidates as getReviewLogoCandidates } from '../src/lib/reviewAssets.js'

const svgOf = source => decodeURIComponent(source.slice(source.indexOf(',') + 1))

test('missing logos resolve to the same readable lettermark in published, directory and match shapes', () => {
  const expected = createDefaultTeamLogo('UCB.T')
  for (const team of [
    { team_id: 'FCW26-T-a', team_short_name: 'UCB.T', team_name: 'Upclimeber.Talent' },
    { id: 'FCW26-T-a', shortName: 'UCB.T', fullName: 'Upclimeber.Talent' },
    { id: 'FCW26-T-a', short: 'UCB.T', name: 'Upclimeber.Talent' },
    { teamId: 'FCW26-T-a', teamShortName: 'UCB.T', teamName: 'Upclimeber.Talent' },
  ]) {
    const before = structuredClone(team)
    assert.equal(getTeamLogoCandidates(team, 'FCW26')[0], expected)
    assert.equal(getReviewLogoCandidates(team, 'FCW26')[0], expected)
    assert.deepEqual(team, before)
  }
})

test('badges use the chosen ATEAM public name, preserve other question-mark teams, and retain the crew mark for unavailable identities', () => {
  assert.equal(getTeamLogoCandidates({ team_short_name: '?', team_name: 'Ateam' }, 'FCW26')[0], createDefaultTeamLogo('ATEAM'))
  assert.equal(getTeamLogoCandidates({ shortName: '？', fullName: '蒙粤队' }, 'FCW26')[0], createDefaultTeamLogo('？'))
  assert.equal(getTeamLogoCandidates({ shortName: '', fullName: 'Ateam' }, 'FCW26')[0], createDefaultTeamLogo('Ateam'))
  for (const team of [null, {}, { team_id: 'FCW26-T-missing' }, { short: 'TBD' }, { shortName: '—' }]) {
    assert.equal(getTeamLogoCandidates(team, 'FCW26')[0], DEFAULT_TEAM_LOGO)
  }
})

test('published and catalog artwork keep priority, with a generated fallback before generic event images', () => {
  const team = { team_id: 'QGCS4-T06', team_short_name: 'SK', team_logo: 'https://assets.example/sk.svg' }
  const candidates = getTeamLogoCandidates(team, 'QGCS4')
  const generated = createDefaultTeamLogo('SK')
  assert.deepEqual(candidates.slice(0, 2), ['https://assets.example/sk.svg', '/logos/QGCS4/SK.png'])
  assert.ok(candidates.indexOf(generated) > 1)
  assert.ok(candidates.indexOf(generated) < candidates.indexOf('/logos/QGCS4/OW.png'))
  assert.ok(!getDefaultTeamLogoCandidates('QGCS4', team).includes(generated), 'crests that omit generic event icons must retain team-specific lettermarks')
  assert.equal(getTeamLogoCandidates({ shortName: 'SK', fullName: 'Snack' }, 'QGCS4')[0], '/logos/QGCS4/SK.png')
  const defaultAsSource = getTeamLogoCandidates({ short: 'UCB.T', team_logo: '/logos/FCW26/OW.png' }, 'FCW26')
  assert.equal(defaultAsSource[0], createDefaultTeamLogo('UCB.T'))
  assert.equal(defaultAsSource.at(-1), '/logos/OW.png')
})

test('generated SVG retains complete names, fits its text area, and keeps untrusted text inert', () => {
  for (const name of ['ALP', 'Ateam', 'UCB.T', '薯条电竞', '👨‍👩‍👧‍👦', 'FRIES CUP COMMUNITY']) {
    const svg = svgOf(createDefaultTeamLogo(name))
    const escapedText = Array.from(svg.matchAll(/<text\b[^>]*>([^<]+)<\/text>/gu), match => match[1]).join('')
    assert.equal(escapedText, name.toUpperCase())
    for (const match of svg.matchAll(/textLength="([\d.]+)"/gu)) assert.ok(Number(match[1]) <= 84)
    assert.doesNotMatch(svg, /<image|<foreignObject|<script|href=/u)
  }
  const malicious = svgOf(createDefaultTeamLogo('<img src=x onerror="run()">&'))
  assert.ok(malicious.includes('&lt;IMG'))
  assert.ok(malicious.includes('&amp;'))
  assert.doesNotMatch(malicious, /<img|<script|<image|<foreignObject|\sonerror="/u)
  assert.doesNotThrow(() => createDefaultTeamLogo('A\uD800B\u0000\u202EC'))
  assert.match(svgOf(createDefaultTeamLogo('A\uD800B\u0000\u202EC')), /<title>ABC<\/title>/u)
})
