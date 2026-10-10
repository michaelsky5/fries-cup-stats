import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { buildOwnershipTransferTasks, isOwnershipTransferWorkspace, ownershipTransferDestination } from '../src/features/weekly-competition/ownershipTransferTasks.js'
import { buildAccountActivity, getAccountActivityAccess, isAccountActivitySource } from '../src/features/account-ui/accountActivityModel.js'
import { fetchAccountAttentionContext } from '../src/features/my-space/accountAttentionApi.js'
import { buildAccountAttention } from '../src/features/my-space/accountAttentionModel.js'
import { buildSpaceOverview } from '../src/features/account-ui/spaceOverviewModel.js'

const seasonId = 'FCW26', userId = 'receiver', now = Date.parse('2026-10-07T12:00:00Z')
const options = { seasonId, userId, now, identityType: 'PLAYER' }
function fixture() {
  const row = {
    id: 'transfer-a', seasonId, fromUserId: 'owner', toUserId: userId, fromName: 'SKY', toName: 'Recipient',
    status: 'PENDING', team: { id: 'team-a', name: 'French Fries' },
    createdAt: '2026-10-04T12:00:00Z', updatedAt: '2026-10-04T12:00:00Z', expiresAt: '2026-10-11T12:00:00Z'
  }
  return { row, workspace: { userId, teams: [], transfers: [row], canWrite: true } }
}

test('existing pending requests enter the shared queue without a manager identity or inbox backfill', () => {
  const { workspace, row } = fixture()
  row.toEmail = 'private@example.test'
  row.scope = [{ contact: 'private-contact' }]
  const activity = buildAccountActivity({ ownership: { status: 'ready', data: workspace } }, options)
  const task = activity.taskView.primaryTask
  assert.equal(activity.status, 'ready')
  assert.equal(activity.taskView.openTasks.length, 1)
  assert.equal(task.title, 'French Fries · 确认接任负责人')
  assert.equal(task.identityType, 'PLAYER')
  assert.equal(task.workflow.key, 'account')
  assert.equal(task.requiresSourceResolution, true)
  assert.equal(task.toEmail, undefined)
  assert.equal(task.scope, undefined)
  assert.equal(buildSpaceOverview({ seasonId }, { now, activity }).taskCount, 1)
  assert.equal(task.resolvedActionUrl, ownershipTransferDestination(seasonId, row.id))
})

test('only the intended recipient receives the task, with strict account and season scope', () => {
  const { workspace } = fixture()
  assert.equal(buildOwnershipTransferTasks(workspace, options).length, 1)
  assert.deepEqual(buildOwnershipTransferTasks(workspace, { ...options, userId: 'outsider' }), [])
  assert.deepEqual(buildOwnershipTransferTasks({ ...workspace, userId: 'owner' }, { ...options, userId: 'owner' }), [])
  assert.deepEqual(buildOwnershipTransferTasks(workspace, { ...options, seasonId: 'OTHER' }), [])
  assert.equal(isAccountActivitySource('ownership', workspace, options), true)
  for (const invalid of [null, { ...workspace, canWrite: undefined }, { ...workspace, teams: undefined }, { ...workspace, transfers: [{ ...workspace.transfers[0], seasonId: 'OTHER' }] }, { ...workspace, transfers: [{ ...workspace.transfers[0], expiresAt: 'invalid' }] }]) {
    assert.equal(isOwnershipTransferWorkspace(invalid, seasonId, userId), false)
    assert.deepEqual(buildOwnershipTransferTasks(invalid, options), [])
  }
})

test('acceptance, review, cancellation, refusal and expiry all leave the open queue', () => {
  const { workspace, row } = fixture()
  for (const [status, expected] of Object.entries({ SUBMITTED: 'COMPLETED', APPROVED: 'COMPLETED', REJECTED: 'COMPLETED', CANCELLED: 'CANCELLED', DECLINED: 'CANCELLED', EXPIRED: 'EXPIRED' })) {
    row.status = status
    row.updatedAt = '2026-10-07T11:00:00Z'
    const activity = buildAccountActivity({ ownership: { status: 'ready', data: workspace } }, options)
    assert.equal(activity.taskView.openTasks.length, 0, status)
    assert.equal(activity.taskView.historyTasks[0].status, expected, status)
    assert.equal(activity.taskView.historyTasks[0].id, 'weekly-ownership:transfer-a', 'the same task is retained in history')
  }
  row.status = 'PENDING'
  assert.equal(buildOwnershipTransferTasks(workspace, { ...options, now: Date.parse(row.expiresAt) - 1 })[0].status, 'OPEN')
  assert.equal(buildOwnershipTransferTasks(workspace, { ...options, now: Date.parse(row.expiresAt) })[0].status, 'EXPIRED')
})

test('direct links preserve the exact transfer and competition', () => {
  const url = new URL(ownershipTransferDestination('SEASON/a', 'transfer/a?b'), 'http://localhost')
  assert.equal(url.pathname, '/participate/SEASON%2Fa')
  assert.equal(url.searchParams.get('ownershipTransfer'), 'transfer/a?b')
  assert.equal(url.hash, '#weekly-ownership-transfers')
})

test('read-only receipt records never become manually completable or grant a manager identity', () => {
  const { workspace } = fixture()
  workspace.canWrite = false
  const task = buildOwnershipTransferTasks(workspace, options)[0]
  assert.equal(task.requiresSourceResolution, true)
  assert.equal(task.identityType, 'PLAYER')
  assert.equal(workspace.canWrite, false)
})

test('ownership source is available before a manager identity, but respects feature and competition boundaries', () => {
  const context = { competitionKind: 'WEEKLY', identities: [] }
  const launch = { allowed: true, features: { teamOperations: 'WRITE' } }
  assert.equal(getAccountActivityAccess(context, launch).ownershipTransfers, true)
  assert.equal(getAccountActivityAccess(context, launch).weeklyPreparation, false)
  assert.equal(getAccountActivityAccess(context, { ...launch, features: { teamOperations: 'READ_ONLY' } }).ownershipTransfers, true)
  assert.equal(getAccountActivityAccess(context, { ...launch, features: { teamOperations: 'HIDDEN' } }).ownershipTransfers, false)
  assert.equal(getAccountActivityAccess({ ...context, competitionKind: 'STANDARD' }, launch).ownershipTransfers, false)
})

test('navigation and the task center count the same pending receipt, even with communications hidden', async () => {
  const { workspace, row } = fixture()
  const calls = []
  const loaders = {
    launch: async () => ({ seasonId, allowed: true, features: { teamOperations: 'WRITE' } }),
    context: async () => ({ seasonId, user: { id: userId }, competitionKind: 'WEEKLY', identities: [{ type: 'PLAYER' }], primaryIdentityType: 'PLAYER', overview: { openTaskCount: 0 } }),
    ownership: async (id, requestOptions) => { calls.push({ id, requestOptions }); return workspace }
  }
  const read = () => fetchAccountAttentionContext(seasonId, userId, { loaders, now })
  assert.equal((await read()).overview.openTaskCount, 1)
  assert.equal(calls[0].id, seasonId)
  assert.equal(calls[0].requestOptions.method, undefined, 'counting only reads source records')
  row.status = 'SUBMITTED'
  assert.equal((await read()).overview.openTaskCount, 0)
  loaders.ownership = async () => { throw new Error('offline') }
  assert.equal(buildAccountAttention(await read()).taskBadge, '待 !', 'failed ownership sync must not claim the queue is clear')
})

test('the registration entry exposes the selected incoming receipt without team-management ownership', () => {
  const page = readFileSync(new URL('../src/features/event-registration/SeasonParticipationPage.jsx', import.meta.url), 'utf8')
  const form = readFileSync(new URL('../src/features/weekly-competition/WeeklyOwnershipTransfers.jsx', import.meta.url), 'utf8')
  const space = readFileSync(new URL('../src/pages/me/MySpacePage.jsx', import.meta.url), 'utf8')
  assert.match(page, /get\('ownershipTransfer'\)/)
  assert.match(page, /focusTransferId=\{focusTransferId\}/)
  assert.match(page, /<WeeklyOwnershipTransfers[^>]*responseOnly/)
  assert.match(form, /if \(responseOnly\) \{ next\.teams = \[\]; next\.transfers = next\.transfers\.filter\(row => row\.toUserId === next\.userId\)/)
  assert.match(form, /focusedRecord\.current\?\.scrollIntoView/)
  assert.match(form, /row\.status === 'PENDING' && row\.toUserId === data\.userId/)
  assert.match(form, /disabled=\{!writable\}/)
  assert.match(form, /fc:account-activity-changed/)
  assert.match(space, /registration && teamOperationsVisible/)
})
