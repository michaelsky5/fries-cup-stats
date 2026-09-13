// Isolated in-memory data for the local review server. Never imported by the application.
import { buildAccountDesignPreviewFixture } from '../../src/pages/dev/accountDesignPreviewFixtures.js'
export function createAccountReviewFixture(initialScenario = 'preparing') {
const user = { id: 'design-preview-user', displayName: '柚子', username: 'Yuzu', email: 'you@example.com', emailVerified: false, role: 'USER' }
let profile = { nickname: 'Yuzu', bio: '和队友一起，认真打好下一场。', regionCode: 'CN' }
let loggedIn = true
let favorites = { primaryTeamId: 'BANANA', favoriteTeamIds: ['BANANA'], favoritePlayerIds: ['FCR26-P0111'] }
let supportRequests = []
let preparationReady = false
let sessions = [{ id: 'preview-current', deviceName: 'Windows · Edge', current: true, ipAddress: '127.0.0.1', createdAt: new Date().toISOString(), lastSeenAt: new Date().toISOString() }, { id: 'preview-phone', deviceName: 'iPhone · Safari', current: false, ipAddress: '192.0.2.10', createdAt: new Date(Date.now() - 86400000).toISOString(), lastSeenAt: new Date(Date.now() - 3600000).toISOString() }]
const identities = ['MANAGER', 'PLAYER', 'CASTER'].map((type,i) => ({ id: `preview-${type}`, type, status:'ACTIVE', isVerified:true, isPrimary: i === 0 }))
const weeklyRooms = [
  { id:'preview-weekly-result', displayName:'第 2 周 · A 组', revision:1, resultFingerprint:'preview-result', ready:true, status:'COMPLETE', confirmationState:'PENDING', teamAId:'preview-team-banana',teamBId:'preview-team-ihan',teamA:{id:'preview-team-banana',name:'Team Banana',shortName:'BANANA'},teamB:{id:'preview-team-ihan',name:'IHAN',shortName:'IH'},scoreA:3,scoreB:1,scheduledAt:new Date(Date.now()-86400000).toISOString(),cycle:{code:'SEP26',name:'九月周期',status:'ACTIVE'},week:{weekNumber:2,label:'第 2 周',name:'第 2 周',status:'RESULT_REVIEW'},myTeams:[{team:{id:'preview-team-banana',name:'Team Banana',shortName:'BANANA'},role:'MANAGER',accessMode:'WRITE',canRespond:true,confirmation:{status:'PENDING',revision:1,isCurrent:true}}],otherTeamResponses:[] },
  { id:'preview-weekly-next', displayName:'第 3 周 · A 组', revision:1, ready:false, status:'PENDING', confirmationState:'NOT_OPEN', teamAId:'preview-team-banana',teamBId:'preview-team-ihan',teamA:{id:'preview-team-banana',name:'Team Banana',shortName:'BANANA'},teamB:{id:'preview-team-ihan',name:'IHAN',shortName:'IH'},scheduledAt:new Date(Date.now()+3600000).toISOString(),cycle:{code:'SEP26',name:'九月周期',status:'ACTIVE'},week:{weekNumber:3,label:'第 3 周',name:'第 3 周',status:'PUBLISHED'},myTeams:[{team:{id:'preview-team-banana',name:'Team Banana',shortName:'BANANA'},role:'MANAGER',accessMode:'WRITE',canRespond:false}],otherTeamResponses:[] }
]
const registration = { id:'preview-registration', revision:1, ownerUserId:user.id, ownerName:user.displayName, name:'晨星', shortName:'DAWN', status:'DRAFT', contact:'队长联系资料（示例）', note:'', members:[{id:'preview-member-1',displayName:'柚子',battleTag:'Yuzu#10000',role:'DPS',status:'CONFIRMED'}, {id:'preview-member-2',displayName:'青柠',battleTag:'Lime#10000',role:'SUP',status:'INVITED'}] }
const previewPlayers = ['Sky', 'Mint', 'Kite', 'Lemon', 'Nova', 'Echo'].map((nickname, i) => ({ id:`preview-player-${i}`, nickname, battleTag:`${nickname}#100${i}`, role:['DPS','DPS','TANK','SUPPORT','SUPPORT','DPS'][i] }))
const weeklyEntry = { id:'preview-entry', team:weeklyRooms[0].teamA, accessMode:'WRITE', players:previewPlayers, coreSelections:[{id:'preview-core',version:1,status:'LOCKED',members:previewPlayers.slice(0,3).map(player=>({playerId:player.id}))}], weeks:[{week:{id:'preview-week',weekNumber:4,label:'第 4 周',status:'CONFIRMATION_OPEN',confirmationDeadlineAt:new Date(Date.now()+86400000).toISOString()},participation:{id:'preview-participation',status:'CONFIRMED',revision:1,availabilityNote:'周六晚可赛',rosters:[{id:'preview-roster',version:1,revision:1,status:'DRAFT',members:previewPlayers.slice(0,5).map(player=>({playerId:player.id}))}]}}] }
weeklyEntry.status = 'ACTIVE'
weeklyEntry.seasonTeamId = weeklyEntry.team.id
const initialEntry = structuredClone(weeklyEntry)
Object.assign(weeklyRooms[0].myTeams[0].confirmation, { id:'preview-result-confirmation', matchId:weeklyRooms[0].id, confirmingTeamId:weeklyRooms[0].teamAId, resultFingerprint:weeklyRooms[0].resultFingerprint, note:'' })
weeklyRooms[0].otherTeamResponses = [{ confirmingTeam:weeklyRooms[0].teamB, status:'PENDING' }]
const initialRooms = structuredClone(weeklyRooms)
const scenarioLabels = { preparing:'名单草稿', confirmation:'待确认参赛', submitted:'等待锁定', locked:'名单已锁定', declined:'本周不参赛', cancelled:'当周已取消', pendingweek:'周次未公布', player:'选手只读', deadline:'确认已截止', multiple:'多个队伍与周次', partial:'准备同步失败', slow:'准备同步超时', saving:'名单保存中', unavailable:'待办同步失败' }
const pendingPreviewReads = new Set()
Object.assign(scenarioLabels, { 'match-live':'比赛进行中', 'match-confirmed':'本队已确认', 'match-disputed':'争议处理中', 'match-finalized':'赛果已结算', 'match-conflict':'提交时赛果更新', 'match-unknown':'提交结果未确认', 'match-timeout':'比赛同步超时' })
let launchHoldUntil = 0
Object.assign(scenarioLabels, { core: '周期核心', activation: '邀请认领', 'activation-expired': '邀请过期', support: '站内处理记录', caster: '解说工作台', referee: '赛管工作台' })
Object.assign(scenarioLabels, { 'email-verified': '邮箱已验证', 'devices-unavailable': '设备读取失败', 'profile-readonly': '只读账号资料' })
Object.assign(scenarioLabels, { 'activation-existing':'已有账号邀请', 'activation-used':'邀请已认领', 'activation-revoked':'邀请已撤销', 'activation-unavailable':'邀请读取失败', 'recovery-unavailable':'邮件找回未开放' })
let invitationClaimed = false
let passwordResetUsed = false
let scenario = 'preparing'
Object.assign(scenarioLabels, { 'launch-timeout':'参赛权限读取超时', guest:'游客本地关注', account:'已登录我的空间', viewer:'观众空间' })
let matchTimeoutUntil = 0
let extraEntry = null
let previewTasks = []
const previewCycles = () => [{id:'preview-cycle',name:'九月周期',status:scenario==='core'?'REGISTRATION':'ACTIVE',rules:{corePlayerCount:3,rosterMin:5,rosterMax:7,minimumCoreInWeeklyRoster:3},entries:[weeklyEntry, ...(extraEntry ? [extraEntry] : [])]}]
function setScenario(value) {
  for (const response of pendingPreviewReads) { response.writeHead(503); response.end() }
  pendingPreviewReads.clear()
  scenario = Object.hasOwn(scenarioLabels, value) ? value : 'preparing'
  user.emailVerified = scenario === 'email-verified'
  user.role = scenario === 'profile-readonly' ? 'OPERATOR' : 'USER'
  launchHoldUntil = Date.now() + 14000
  loggedIn = scenario !== 'guest' && !scenario.startsWith('activation') && !scenario.startsWith('recovery')
  invitationClaimed = scenario === 'activation-used'
  passwordResetUsed = false
  Object.assign(weeklyEntry, structuredClone(initialEntry))
  weeklyRooms.splice(0, weeklyRooms.length, ...structuredClone(initialRooms))
  extraEntry = null
  previewTasks = []
  matchTimeoutUntil = scenario === 'match-timeout' ? Date.now() + 15000 : 0
  const record = weeklyEntry.weeks[0]
  const resultRoom = weeklyRooms[0]
  weeklyRooms[0].week.id = 'preview-result-week'
  weeklyRooms[1].week.id = 'preview-week'
  if (scenario === 'core') weeklyEntry.coreSelections[0].status = 'DRAFT'
  const isMatchDay = ['locked', 'support', 'match-live'].includes(scenario)
  if (isMatchDay) {
    record.week.status = 'PUBLISHED'
    record.participation.rosters[0].status = 'LOCKED'
    Object.assign(weeklyRooms[1].week, { weekNumber: 4, label: '第 4 周', name: '第 4 周' })
    weeklyRooms[1].displayName = '第 4 周 · A 组'
  }
  if (scenario === 'support') {
    supportRequests = ['IN_PROGRESS', 'RESOLVED'].map((status, index) => ({
      id: 'preview-support-' + index, weekId: 'preview-week', team: weeklyEntry.team,
      title: index ? '本场时间已核对' : '队员暂时无法进入房间', status, revision: 2,
      updatedAt: new Date().toISOString(),
      messages: [
        { id: 'request-' + index, author: '柚子', staff: false, body: index ? '请确认本场开赛时间是否有变化。' : '一名队员输入口令后无法进入，其他四人已经到齐。', createdAt: new Date(Date.now()-600000).toISOString() },
        { id: 'reply-' + index, author: '本周赛管', staff: true, status, body: index ? '时间不变，已在本场安排中补充，请按原定时间准备。' : '已收到，正在核对房间设置；结果会在这条记录中更新。', createdAt: new Date().toISOString() }
      ]
    }))
  }
  if (scenario === 'match-live') weeklyRooms[1].status = 'IN_PROGRESS'
  if (scenario === 'match-confirmed') Object.assign(resultRoom.myTeams[0].confirmation, { status:'CONFIRMED', actedAt:new Date().toISOString() })
  if (scenario === 'match-disputed') { resultRoom.confirmationState = 'DISPUTED'; Object.assign(resultRoom.myTeams[0].confirmation, { status:'DISPUTED', note:'第 2 局加时比分需核对（示例）', actedAt:new Date().toISOString() }) }
  if (scenario === 'match-finalized') { resultRoom.confirmationState = 'FINALIZED'; Object.assign(resultRoom.myTeams[0], {canRespond:false}); Object.assign(resultRoom.myTeams[0].confirmation, { status:'FINALIZED', actedAt:new Date().toISOString() }); resultRoom.otherTeamResponses[0].status = 'FINALIZED' }
  if (scenario === 'confirmation') { record.participation.status = 'PENDING'; record.participation.rosters = [] }
  if (scenario === 'submitted') record.participation.rosters[0].status = 'SUBMITTED'
  if (scenario === 'locked') record.participation.rosters[0].status = 'LOCKED'
  if (scenario === 'declined') { record.participation.status = 'DECLINED'; record.participation.rosters = [] }
  if (scenario === 'cancelled') record.week.status = 'CANCELLED'
  if (scenario === 'pendingweek') weeklyEntry.weeks = []
  if (scenario === 'player') { weeklyEntry.accessMode = 'READ_ONLY'; weeklyRooms.forEach(room => room.myTeams.forEach(team => Object.assign(team, { role:'PLAYER', accessMode:'READ_ONLY', canRespond:false }))) }
  if (scenario === 'deadline') record.week.confirmationDeadlineAt = new Date(Date.now() - 3600000).toISOString()
  if (scenario === 'multiple') {
    previewTasks.push({id:'preview-manual-task',userId:user.id,status:'OPEN',priority:'HIGH',identityType:'CASTER',taskType:'EVENT_BRIEFING',sourceType:'MANUAL_REMINDER',sourceId:'preview-briefing',requiresSourceResolution:false,title:'阅读本周解说须知',body:'示例手动任务：阅读须知后确认完成。',actionUrl:'/me?section=communications',dueAt:new Date(Date.now()+3600000).toISOString()})
    extraEntry = structuredClone(initialEntry)
    Object.assign(extraEntry, { id:'preview-entry-ihan', seasonTeamId:weeklyRooms[0].teamB.id, team:weeklyRooms[0].teamB })
    Object.assign(extraEntry.weeks[0].participation, { id:'preview-participation-ihan', status:'PENDING', rosters:[] })
    const later = structuredClone(record)
    Object.assign(later.week, { id:'preview-week-5', weekNumber:5, label:'第 5 周', status:'DRAFT', confirmationOpensAt:new Date(Date.now()+172800000).toISOString(), confirmationDeadlineAt:new Date(Date.now()+259200000).toISOString() })
    Object.assign(later.participation, { id:null, status:'PENDING', rosters:[] })
    weeklyEntry.weeks.push(later)
  }
}
const previewTeamAccess = () => [weeklyEntry, ...(extraEntry ? [extraEntry] : [])].map(entry => ({ team:entry.team, role:scenario === 'player' ? 'PLAYER' : 'MANAGER', accessMode:entry.accessMode }))
const notifications = [{id:'preview-notification',notificationType:'MATCH_SCHEDULE',priority:'NORMAL',title:'第 3 周赛程已发布',body:'请查看本队的下一场比赛时间，提前安排集合。',visibleAt:new Date().toISOString(),readAt:null,actionUrl:'/me?section=matches'}]
function coordinationMatch(id) {
  const room=weeklyRooms.find(item=>item.id===id) || weeklyRooms[1]
  const canConfirm=room.status==='PENDING' && scenario!=='player'
  return {id,brief:{roomName:'薯条杯 W4 · BANANA vs IH',roomCode:'FC-REVIEW',instructions:'请提前核对出赛名单，进入房间后由队长确认本队已准备好。',updatedAt:new Date().toISOString()},sides:[{team:room.teamA,ready:preparationReady,canConfirm,revision:1,fingerprint:'preview-preparation',reason:canConfirm?'':'准备状态由队长在赛前确认。',updatedAt:new Date().toISOString()},{team:room.teamB,ready:true,updatedAt:new Date().toISOString()}],bothReady:preparationReady}
}
const handle = async (req,res) => {
  const path = new URL(req.url,'http://127.0.0.1').pathname.replace(/^\/api/,'')
  let raw = ''; for await (const part of req) raw += part
  let body = {}
  try { body = raw ? JSON.parse(raw) : {} } catch { res.writeHead(400); res.end('Invalid JSON'); return }
  const send = (data,status=200) => {res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data))}
  if(path === '/auth/config') return send({selfRegistrationEnabled:false,emailVerificationEnabled:scenario !== 'recovery-unavailable'})
  if(path === '/auth/login') { loggedIn=true; return send({user}) }
  if(path === '/auth/logout') {loggedIn=false;return send({loggedOut:true})}
  if(path.startsWith('/auth/weekly-account-links/')) {
    if (invitationClaimed) return send({error:'ACCOUNT_LINK_INVITATION_ACCEPTED'},409)
    if (scenario === 'activation-expired') return send({error:'ACCOUNT_LINK_INVITATION_EXPIRED'},410)
    if (scenario === 'activation-revoked') return send({error:'ACCOUNT_LINK_INVITATION_REVOKED'},409)
    if (path.endsWith('/preview') && scenario === 'activation-unavailable') return send({error:'PREVIEW_INVITATION_SERVICE_UNAVAILABLE'},503)
    if (path.endsWith('/accept')) { invitationClaimed = true; return send({accepted:true,team:{id:'preview-team',seasonId:'FCR26'},identity:{type:'MANAGER'}}) }
    if (path.endsWith('/preview')) return send({ invitation: {id:'preview-invitation',status:'PENDING',passwordMode:scenario === 'activation-existing' ? 'CONFIRM' : 'SET',maskedEmail:'yo***@example.com',identityType:'MANAGER',user:{id:user.id},team:{id:'preview-team',name:'晨星',seasonId:'FCR2026'},target:{label:'队伍负责人'},expiresAt:new Date(Date.now()+86400000).toISOString()} })
  }
  if(path === '/auth/password-resets') return send({accepted:true},202)
  if(path === '/auth/password-resets/confirm') {
    if (body.token !== 'account-review-password-reset-token') return send({error:'PASSWORD_RESET_TOKEN_INVALID'},400)
    if (passwordResetUsed) return send({error:'PASSWORD_RESET_TOKEN_USED'},400)
    if (typeof body.newPassword !== 'string' || body.newPassword.length < 8 || Buffer.byteLength(body.newPassword,'utf8') > 72) return send({error:'INVALID_INPUT'},400)
    passwordResetUsed = true
    loggedIn = false
    sessions = []
    return send({reset:true,loginRequired:true})
  }
  if(path === '/preview/reset') {loggedIn=true;return send({reset:true})}
  if(!loggedIn) return send({error:'UNAUTHORIZED'},401)
  if (path === '/me/profile' && req.method === 'PATCH' && scenario === 'profile-readonly') return send({error:'FORBIDDEN'},403)
  if (path === '/me/sessions' && scenario === 'devices-unavailable') return send({error:'PREVIEW_DEVICE_SERVICE_UNAVAILABLE'},503)
  if(path === '/auth/me') return send({user})
  if(path === '/me/verification-requests') return send({requests:[]})
  if(path.startsWith('/me/favorites/')) { if(req.method==='PUT') favorites=body.favorites; return send({favorites}) }
  if(path === '/me/password' && req.method==='PATCH') { loggedIn=false; sessions=[]; return send({changed:true,allSessionsRevoked:true}) }
  if(path === '/me/weekly-coordination') {
    const query=new URL(req.url,'http://local').searchParams
    const matchId=query.get('matchId')
    return send({weekId:query.get('weekId'),teamId:query.get('teamId'),matchId:matchId || null,canWrite:scenario!=='player',requests:supportRequests,matches:matchId ? [coordinationMatch(matchId)] : []})
  }
  if(path === '/me/weekly-coordination/readiness' && req.method==='PUT') { preparationReady=body.ready; return send(coordinationMatch(body.matchId)) }
  if(path === '/me/weekly-coordination/requests' && req.method==='POST') {
    const record={id:'preview-support-'+body.clientKey,team:weeklyEntry.team,weekId:body.weekId,title:body.title,status:'OPEN',revision:1,updatedAt:new Date().toISOString(),messages:[{id:body.clientKey,author:user.displayName,staff:false,body:body.body,createdAt:new Date().toISOString()}]}
    supportRequests.push(record); return send(record)
  }
  if(path === '/me/weekly-coordination/replies' && req.method==='POST') {
    const record=supportRequests.find(item=>item.id===body.requestId)
    if(!record) return send({error:'NOT_FOUND'},404)
    Object.assign(record,{revision:record.revision+1,status:'OPEN',updatedAt:new Date().toISOString()})
    record.messages.push({id:body.clientKey,author:user.displayName,staff:false,body:body.body,createdAt:new Date().toISOString()})
    return send(record)
  }
  if(path.startsWith('/me/weekly-cycle-entries/') && req.method==='PUT') { Object.assign(weeklyEntry.coreSelections[0],body,{members:(body.playerIds || []).map(playerId=>({playerId})),version:weeklyEntry.coreSelections[0].version+1}); return send({selection:weeklyEntry.coreSelections[0]}) }
  if(path === '/me/profile') { if(req.method==='PATCH'){ if(body.displayName) user.displayName=body.displayName; profile={...profile,...body} } return send({user,profile}) }
  if(path === '/me/identities') return send({userId:user.id,competitionSeasons: scenario === 'viewer' ? [] : [{id:'FCR26',name:'九月周赛 · 界面样例',status:'ACTIVE',competitionKind:'WEEKLY',teams:[{...weeklyEntry.team,roles:scenario === 'player' ? ['PLAYER'] : ['MANAGER','PLAYER']}]}],identities:scenario === 'viewer' ? [] : identities,primaryIdentity:scenario === 'viewer' ? null : identities[0],capabilities:{canUseCloudFavorites:true}})
  if(path.startsWith('/account-launch/seasons/')) {
    if (scenario === 'launch-timeout' && Date.now() < launchHoldUntil) { pendingPreviewReads.add(res); res.once('close', () => pendingPreviewReads.delete(res)); return }
    return send({launch:{seasonId:path.split('/').at(-1),portalMode:'SHADOW_BETA',allowed:true,emailVerified:true,features:{teamOperations:'WRITE',weeklyCompetition:'WRITE',matchRoom:'WRITE',communications:'READ_ONLY',predictions:'READ_ONLY',scheduleNegotiation:'READ_ONLY'}}})
  }
  if ((scenario === 'unavailable' && ['/me/tasks','/me/weekly-competition','/me/weekly-match-rooms'].includes(path)) || (scenario === 'partial' && path === '/me/weekly-competition')) return send({error:'PREVIEW_SYNC_FAILURE'},503)
  if (scenario === 'slow' && path === '/me/weekly-competition') { pendingPreviewReads.add(res); res.once('close', () => pendingPreviewReads.delete(res)); return }
  if (Date.now() < matchTimeoutUntil && path === '/me/weekly-match-rooms') { pendingPreviewReads.add(res); res.once('close', () => pendingPreviewReads.delete(res)); return }
  if (scenario === 'saving' && path.startsWith('/me/weekly-participations/') && req.method === 'PUT') await new Promise(resolve => setTimeout(resolve, 5000))
  if(path === '/me/weekly-competition') return send({userId:user.id,season:{id:new URL(req.url,'http://local').searchParams.get('seasonId'),name:'周赛设计示例',status:'ACTIVE'},accessMode:scenario === 'player' ? 'READ_ONLY' : 'WRITE',teams:previewTeamAccess(),cycles:previewCycles()})
  if(path.startsWith('/me/weekly-weeks/') && req.method==='PUT') { const entry=[weeklyEntry,extraEntry].filter(Boolean).find(item=>item.id===body.entryId); const record=entry?.weeks.find(item=>item.week.id===path.split('/')[3]); if (!record || entry.accessMode !== 'WRITE') return send({error:'PREVIEW_INVALID_TEAM'},403); const participation=record.participation; Object.assign(participation,body,{id:participation.id || `preview-participation-${entry.id}`,revision:participation.revision+1}); return send({participation}) }
  if(path.startsWith('/me/weekly-participations/') && req.method==='PUT') { const participation=[weeklyEntry,extraEntry].filter(Boolean).flatMap(entry=>entry.weeks).map(record=>record.participation).find(item=>item.id===path.split('/')[3]); if(!participation || scenario==='player') return send({error:'PREVIEW_INVALID_TEAM'},403); const roster=participation.rosters[0] || {id:'preview-new-roster',version:1,revision:0,members:[]}; Object.assign(roster,body,{members:(body.members || []).map(member=>({playerId:member.playerId,plannedStarter:Boolean(member.plannedStarter)})),revision:roster.revision+1}); participation.rosters=[roster]; return send({roster}) }
  if(path === '/me/tasks') return send({tasks:previewTasks})
  if(path === '/me/tasks/preview-manual-task/complete' && req.method==='POST') { const task=previewTasks.find(item=>item.id==='preview-manual-task'); if(!task) return send({error:'TASK_NOT_FOUND'},404); Object.assign(task,{status:'COMPLETED',completedAt:new Date().toISOString()}); return send({task}) }
  if(path === '/me/notification-summary') return send({openTasks:0,unreadNotifications:notifications.filter(item=>!item.readAt).length})
  if(path === '/me/notifications') return send({notifications})
  if(path === '/me/notifications/read-all' || path === '/me/notifications/preview-notification/read') { notifications.forEach(item=>{item.readAt=new Date().toISOString()}); return send({notification:notifications[0],count:notifications.length}) }
  if(path === '/announcements') return send({announcements:[]})
  if(path === '/me/appeals') return send({appeals:[]})
  if(path === '/me/appeal-options' || path === '/me/schedule-context') return send({matches:[]})
  if(path === '/me/predictions') return send({predictions:[]})
  if(path.endsWith('/prediction-board')) return send({matches:[],policy:{winnerPoints:3,exactScoreBonus:2},eligibility:{eligible:false}})
  if(path.endsWith('/prediction-leaderboard')) return send({leaderboard:[],viewer:null,participants:0})
  if(path === '/me/space-context') {const seasonId=new URL(req.url,'http://local').searchParams.get('seasonId');const context=buildAccountDesignPreviewFixture('locked',scenario === 'viewer' ? 'VIEWER' : scenario === 'caster' ? 'CASTER' : scenario === 'referee' ? 'REFEREE' : scenario === 'player' ? 'PLAYER' : 'MULTI').spaceContext;Object.assign(context,{seasonId,user:{...user,emailVerified:false},contract:'ACCOUNT_FOUNDATION_V1',competitionKind:'WEEKLY'});context.overview={...context.overview,tasks:[],openTaskCount:0,nextTeamMatch:null,nextStaffAssignment:null};context.teamContexts=context.teamContexts.map(team=>({...team,matches:[]}));return send({context})}
  if(path === '/me/weekly-match-rooms') {const seasonId=new URL(req.url,'http://local').searchParams.get('seasonId');return send({season:{id:seasonId,name:'周赛设计示例',status:'ACTIVE',timezone:'Asia/Shanghai'},accessMode:'WRITE',featureAccess:'WRITE',teams:[weeklyRooms[0].myTeams[0]],rooms:weeklyRooms.map(room => ({...room,myTeams:room.myTeams.map(side=>({...side,preparation:{ready:preparationReady,canConfirm:room.status==='PENDING' && ['locked','support'].includes(scenario),reason:''}}))}))})}
  if(path.startsWith('/me/weekly-match-rooms/') && req.method==='PUT'){
    const room=weeklyRooms.find(item=>item.id===path.split('/')[3])
    const ownTeam=room?.myTeams.find(item=>item.team.id===body.confirmingTeamId)
    if(!room || !ownTeam?.confirmation) return send({error:'NOT_FOUND'},404)
    if(!ownTeam.canRespond || ownTeam.accessMode !== 'WRITE') return send({error:'WEEKLY_TEAM_ACCESS_FORBIDDEN'},403)
    if(scenario === 'match-conflict') { room.revision += 1; room.scoreB = 2; room.resultFingerprint = `preview-result-${room.revision}`; room.confirmationState = 'STALE'; Object.assign(ownTeam.confirmation,{status:'EXPIRED',isCurrent:false}); ownTeam.canRespond=false; return send({error:'WEEKLY_RESULT_REVISION_CONFLICT'},409) }
    if(body.expectedRevision !== room.revision) return send({error:'WEEKLY_RESULT_REVISION_CONFLICT'},409)
    if(!['CONFIRMED','DISPUTED'].includes(body.status) || (body.status==='DISPUTED' && String(body.note || '').trim().length < 2)) return send({error:'INVALID_RESPONSE'},400)
    const confirmation=ownTeam.confirmation
    Object.assign(confirmation,{status:body.status,note:body.note,actedAt:new Date().toISOString()})
    const responses=[...room.myTeams.map(item=>item.confirmation),...room.otherTeamResponses]
    room.confirmationState=responses.some(item=>item.status==='DISPUTED') ? 'DISPUTED' : responses.every(item=>item.status==='CONFIRMED') ? 'CONFIRMED' : 'PENDING'
    if(scenario === 'match-unknown') return send({error:'PREVIEW_RESPONSE_LOST'},503)
    return send({confirmation})
  }
  if(path === '/me/sessions/revoke-all') {const count=sessions.filter(s=>!s.current).length;sessions=sessions.filter(s=>s.current);return send({revokedCount:count,currentSessionRevoked:false})}
  if(path.startsWith('/me/sessions/') && req.method==='DELETE') {const id=path.split('/').at(-1);const current=sessions.find(s=>s.id===id)?.current;sessions=sessions.filter(s=>s.id!==id);if(current)loggedIn=false;return send({revoked:true,currentSessionRevoked:Boolean(current)})}
  if(path === '/me/sessions')return send({sessions})
  if(path === '/auth/email-verifications')return send({emailVerification:{delivered:true,expiresAt:new Date(Date.now()+3600000).toISOString()}})
  if(path.endsWith('/registration/me'))return send({season:{id:path.split('/')[2],name:'薯条杯 2026 · 示例赛事'},policy:{rosterMin:5,rosterMax:10,closesAt:new Date(Date.now()+86400000).toISOString()},canWrite:true,canCreate:true,organizations:[],notices:[],registrations:[registration]})
  if(path.includes('/registration/drafts/') && req.method==='PATCH'){Object.assign(registration,body,{revision:registration.revision+1});return send({registration})}
  // Explicitly fail any unimplemented write: a preview never forwards to System.
  return send({error:'DESIGN_PREVIEW_ONLY',message:'本地设计预览未模拟此操作。'},404)
}
setScenario(initialScenario)
return { handle }
}
