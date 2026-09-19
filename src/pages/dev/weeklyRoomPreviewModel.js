import { OW_HEROES, OW_MAPS } from '../../lib/heroes.js'
export const PREVIEW_STAGES = { opening: '先手权', choosing: '选图', lineup: '首发', banning: 'Ban', ready: '准备', live: '比赛中', paused: '暂停', review: '图结果', result: '整场赛果' }
export const PREVIEW_ROLES = { representative: '操作代表', staff: '赛管', player: '队员', caster: '解说' }

// Synthetic, read-only data. Never use a real match ID or an account API here.
export function buildWeeklyRoomPreview(stage = 'lineup', role = 'representative') {
  const staff = role === 'staff', production = staff || role === 'caster'
  const teams = ['A', 'B'].map(side => ({ id: `preview-team-${side}`, name: `示例队伍 ${side}`, shortName: `DEMO ${side}` }))
  const rosters = teams.map((team, index) => ({ teamId: team.id, status: 'LOCKED', staff: [{ id: `staff-${index}`, name: '示例经理', role: 'MANAGER' }, { id: `coach-${index}`, name: '示例教练', role: 'COACH' }], members: Array.from({ length: 7 }, (_, i) => ({ id: `${team.id}-p${i}`, name: `示例选手 ${index + 1}-${i + 1}`, battleTag: `示例选手${index + 1}${i + 1}#0000`, role: ['TANK', 'DPS', 'DPS', 'SUP', 'SUP', 'FLEX', 'DPS'][i], plannedStarter: i < 5 })) }))
  const lineup = index => rosters[index].members.slice(0, 5).map(player => ({ ...player, playerId: player.id }))
  const beforeLineup = ['opening', 'choosing', 'lineup'].includes(stage)
  const complete = !['opening', 'choosing', 'lineup', 'banning'].includes(stage)
  const map = { order: 1, name: 'Lijiang Tower', type: 'Control', status: ['review', 'result'].includes(stage) ? 'COMPLETE' : ['live', 'paused'].includes(stage) ? 'LIVE' : 'PENDING', lineupA: beforeLineup ? [] : lineup(0), lineupB: beforeLineup ? [] : lineup(1), banA: complete ? 'Ana' : null, banB: complete ? 'Ashe' : null, chooserSide: 'A', firstBanSide: 'A', scoreA: ['review', 'result'].includes(stage) ? 2 : null, scoreB: ['review', 'result'].includes(stage) ? 1 : null }
  const maps = stage === 'result' ? [map, ...['Rialto', "King's Row", 'New Queen Street', 'Suravasa'].map((name, i) => ({ ...map, order: i + 2, name, type: ['Escort', 'Hybrid', 'Push', 'Flashpoint'][i], scoreA: 1, scoreB: 1 }))] : [map]
  const opening = {
    revision: 1, mapOrder: map.order, phase: stage === 'opening' ? 'ONE_V_ONE_SETUP' : stage === 'choosing' ? 'CHOOSING' : complete ? 'COMPLETE' : 'BANNING', complete,
    winner: 'A', nextSide: 'A', rounds: [], corrections: [], selections: [], firstPick: { mode: 'REAL_1V1', modeLabel: '实际游戏 1V1', sourceLabel: '示例规则' },
    setup: stage === 'opening' || stage === 'choosing' ? null : { ...map },
    rules: { maps: OW_MAPS.filter(map => map.mode === 'control').map(map => ({ name: map.en, type: 'Control' })), differentRolesPerMap: true, uniqueHeroesPerTeamPerSeries: true },
    heroes: OW_HEROES.map(hero => ({ name: hero.en, role: { tank: 'TANK', damage: 'DPS', support: 'SUP' }[hero.role] })),
    typeCycle: { round: 1, usedCount: 0, types: [{ type: 'Control', remaining: 2 }] },
    access: { playTeams: [], canSetOneVOne: staff, canReportOneVOne: staff, canChoose: staff || role === 'representative', canBan: staff || role === 'representative', canNext: staff },
    next: stage === 'review' ? { order: 2, chooserSide: 'B', rightsSource: 'PREVIOUS_LOSER' } : null
  }
  return {
    actor: { id: `preview-${role}`, name: '示例账号', label: PREVIEW_ROLES[role] }, match: { id: 'LOCAL-WEEKLY-PREVIEW', seasonId: 'LOCAL-PREVIEW', weekId: 'preview-week', revision: 1, seasonName: '本地示例 · 非真实赛事', weekLabel: '第 1 周', format: 'RR5', teamA: teams[0], teamB: teams[1] },
    phase: stage === 'paused' ? 'PAUSED' : stage === 'live' ? 'LIVE' : ['review', 'result'].includes(stage) ? 'REVIEW' : 'PREPARING', revision: 1, draftRevision: 1,
    access: { canWrite: false, staff, production, teamIds: ['representative', 'player'].includes(role) ? [teams[0].id] : [], representativeTeams: role === 'representative' ? [teams[0].id] : [], operatorMode: 'REFEREE', canStart: staff && stage === 'ready', canPause: staff, canResume: staff },
    rosters, map: maps.at(-1), maps, opening, series: { complete: stage === 'result', completedMaps: stage === 'result' ? 5 : stage === 'review' ? 1 : 0, scoreA: 1, scoreB: 0, drawCount: stage === 'result' ? 4 : 0 },
    preparation: { brief: { roomName: '示例自定义房间', roomCode: 'KYWVV' }, sides: teams.map(team => ({ key: team === teams[0] ? 'A' : 'B', team, ready: false, canConfirm: true, revision: 1, fingerprint: 'preview' })) },
    representatives: { ready: true, sides: teams.map((team, i) => ({ teamId: team.id, active: true, name: rosters[i].members[0].name, role: 'PLAYER', battleTag: rosters[i].members[0].battleTag, candidates: [], canAssign: false, isYou: role === 'representative' && i === 0 })) },
    preflight: { roomConfirmed: false, rosterVerified: false, networkTestCompleted: false, canConfirm: staff },
    checkIns: {}, staff: [{ name: '示例赛管' }], casters: [], casterOverrides: [], casterCandidates: [], messages: [], requests: [], hasEarlierMessages: false, blockers: ['等待双方核对准备'], publicNote: '本地只读示例：切换阶段和身份查看布局，不会保存比赛操作。', pause: { recovered: {} }, canRecordMapResult: staff, canCorrectMapResult: staff,
    result: stage === 'result' ? { phase: 'AWAITING_SUBMISSION', official: false, sides: [], points: [], handoff: {}, administration: {} } : null
  }
}
