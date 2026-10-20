import assert from 'node:assert/strict'
import test from 'node:test'
import { safeLobbyReturn, accountFailure, roleLabel, statusLabel } from '../src/features/team-lobby/lobbyModel.js'

test('account continuation only retains a local lobby destination and public reading state', () => {
  assert.equal(safeLobbyReturn('/lobby/me/publish?type=person'), '/lobby/me/publish?type=person')
  assert.equal(safeLobbyReturn('/lobby?type=teams&role=SUP&page=2&qq=12345678&verifyEmail=secret'), '/lobby?type=teams&role=SUP&page=2')
  for (const value of ['https://outside.example/lobby', '//outside.example', '/lobby/../account', '/lobby\\outside', '/lobby\nnext', '', null]) assert.equal(safeLobbyReturn(value), '/lobby')
})
test('registration conflicts and uncertain submissions have actionable distinct explanations', () => {
  assert.match(accountFailure({ data: { error: 'USER_EXISTS' } }), /登录或找回/)
  assert.match(accountFailure({ data: { error: 'USERNAME_EXISTS' } }), /换一个/)
  assert.match(accountFailure({ data: { outcomeUnknown: true } }), /先查看账号或本人记录/)
  assert.match(accountFailure({ name: 'TypeError' }), /暂时无法确认/)
})
test('lobby labels retain non-official forming and lifecycle meaning', () => {
  assert.equal(roleLabel('SUP'), '支援')
  assert.equal(statusLabel('APPROVED'), '核对通过')
  assert.equal(statusLabel('RETURNED'), '退回修改')
  assert.equal(statusLabel('HIDDEN'), '管理员隐藏')
})
