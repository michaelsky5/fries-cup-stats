import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { getWeeklyFocusStep, weeklyConfirmationWindow } from '../src/features/weekly-competition/weeklyPreparationModel.js'

const apiSource = readFileSync(new URL('../src/features/weekly-competition/weeklyCompetitionApi.js', import.meta.url), 'utf8')
const workspaceSource = readFileSync(new URL('../src/features/weekly-competition/WeeklyCompetitionWorkspace.jsx', import.meta.url), 'utf8')
const mySpaceSource = readFileSync(new URL('../src/pages/me/MySpacePage.jsx', import.meta.url), 'utf8')

assert.match(apiSource, /\/me\/weekly-competition\?seasonId=/)
assert.match(apiSource, /\/me\/weekly-cycle-entries\/\$\{encodeURIComponent\(entryId\)\}\/core-selection/)
assert.match(apiSource, /\/me\/weekly-weeks\/\$\{encodeURIComponent\(weekId\)\}\/participation/)
assert.match(apiSource, /\/me\/weekly-participations\/\$\{encodeURIComponent\(participationId\)\}\/roster/)

assert.match(workspaceSource, /cycle\?\.status === 'REGISTRATION' && !coreLocked/)
assert.match(workspaceSource, /weekRecord\?\.week\?\.status === 'CONFIRMATION_OPEN'/)
assert.match(workspaceSource, /participation\?\.status === 'CONFIRMED' && !rosterLocked/)
assert.match(workspaceSource, /entry\?\.accessMode === 'WRITE'/)
assert.match(workspaceSource, /当前账号或赛季策略只允许查看/)
assert.match(workspaceSource, /key=\{`\$\{seasonId\}:\$\{user\?\.id \|\| ''\}`\}/)
assert.match(workspaceSource, /next\?\.userId !== user\.id/)
assert.match(workspaceSource, /signal: controller\.signal/)
assert.match(workspaceSource, /loadSequence\.current/)
assert.match(workspaceSource, /synchronized && !stale && !readOnly/)
assert.match(workspaceSource, /writeLock\.current \|\| !entryWritable/)
assert.match(workspaceSource, /weeklyConfirmationWindow\(weekRecord.week, now\)/)
assert.equal(weeklyConfirmationWindow({ status: 'CONFIRMATION_OPEN', confirmationOpensAt: '2026-09-06T12:00:00Z' }, Date.parse('2026-09-06T11:59:00Z')), 'upcoming')
assert.match(workspaceSource, /管理员已锁定/)
assert.match(workspaceSource, /保存已完成，但最新资料同步失败/)
assert.match(workspaceSource, /revision: participation\?\.revision \|\| 0/)
assert.match(workspaceSource, /revision: rosterDraft\?\.revision \|\| 0/)
assert.equal(workspaceSource.includes('<option value="LOCKED">锁定名单</option>'), false, 'team accounts must not be offered the administrator-only roster lock action')

assert.match(mySpaceSource, /import WeeklyCompetitionWorkspace/)
assert.match(mySpaceSource, /hasAccountFeatureAccess\(accountLaunch, 'weeklyCompetition', 'WRITE'\)/)
assert.doesNotMatch(mySpaceSource, /canWriteTeamOperations \? <WeeklyCompetitionWorkspace/)

console.log('Weekly competition account workspace boundary checks passed.')
assert.equal(getWeeklyFocusStep({ next: { key: 'roster' } }), 'roster')
assert.equal(getWeeklyFocusStep({ next: { key: 'roster' } }, 'participation'), 'participation', 'explicit review links keep their requested step')
assert.equal(getWeeklyFocusStep({ stages: [{ key: 'core', state: 'blocked' }] }), 'core')
assert.equal(getWeeklyFocusStep({ next: { key: 'roster' } }, 'foreign-step'), null, 'invalid steps do not silently redirect')
assert.match(mySpaceSource, /readOnly=\{!canWriteWeeklyCompetition\}/, 'weekly writes must follow feature access; the workspace enforces per-team role access')
