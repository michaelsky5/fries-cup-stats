// Local visual review only. No real accounts, email, or competition writes.
import http from 'node:http'
import { createServer } from 'vite'
import { fileURLToPath } from 'node:url'
const root = fileURLToPath(new URL('..', import.meta.url))
import { buildAccountDesignPreviewFixture } from '../src/pages/dev/accountDesignPreviewFixtures.js'
const user = { id: 'design-preview-user', displayName: '柚子', username: 'Yuzu', email: 'you@example.com', emailVerified: false, role: 'USER' }
let profile = { nickname: 'Yuzu', bio: '和队友一起，认真打好下一场。', regionCode: 'CN' }
let loggedIn = true
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
let scenario = 'preparing'
Object.assign(scenarioLabels, { guest:'游客本地关注', account:'已登录我的空间', viewer:'观众空间' })
let matchTimeoutUntil = 0
let extraEntry = null
let previewTasks = []
const previewCycles = () => [{id:'preview-cycle',name:'九月周期',status:'ACTIVE',rules:{corePlayerCount:3,rosterMin:5,rosterMax:7,minimumCoreInWeeklyRoster:3},entries:[weeklyEntry, ...(extraEntry ? [extraEntry] : [])]}]
function setScenario(value) {
  for (const response of pendingPreviewReads) { response.writeHead(503); response.end() }
  pendingPreviewReads.clear()
  scenario = Object.hasOwn(scenarioLabels, value) ? value : 'preparing'
  loggedIn = scenario !== 'guest'
  Object.assign(weeklyEntry, structuredClone(initialEntry))
  weeklyRooms.splice(0, weeklyRooms.length, ...structuredClone(initialRooms))
  extraEntry = null
  previewTasks = []
  matchTimeoutUntil = scenario === 'match-timeout' ? Date.now() + 15000 : 0
  const record = weeklyEntry.weeks[0]
  const resultRoom = weeklyRooms[0]
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
const api = http.createServer(async (req,res) => {
  const path = new URL(req.url,'http://127.0.0.1').pathname.replace(/^\/api/,'')
  let raw = ''; for await (const part of req) raw += part
  let body = {}
  try { body = raw ? JSON.parse(raw) : {} } catch { res.writeHead(400); res.end('Invalid JSON'); return }
  const send = (data,status=200) => {res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data))}
  if(path === '/auth/config') return send({selfRegistrationEnabled:false,emailVerificationEnabled:true})
  if(path === '/auth/login') { loggedIn=true; return send({user}) }
  if(path === '/auth/logout') {loggedIn=false;return send({loggedOut:true})}
  if(path === '/auth/weekly-account-links/preview') return send({ invitation: {id:'preview-invitation',status:'PENDING',passwordMode:'SET',maskedEmail:'yo***@example.com',identityType:'MANAGER',user:{id:user.id},team:{id:'preview-team',name:'晨星',seasonId:'FCR2026'},target:{label:'队伍负责人'},expiresAt:new Date(Date.now()+86400000).toISOString()} })
  if(path === '/auth/password-resets') return send({accepted:true})
  if(path === '/preview/reset') {loggedIn=true;return send({reset:true})}
  if(!loggedIn) return send({error:'UNAUTHORIZED'},401)
  if(path === '/auth/me') return send({user})
  if(path === '/me/profile') { if(req.method==='PATCH'){ if(body.displayName) user.displayName=body.displayName; profile={...profile,...body} } return send({user,profile}) }
  if(path === '/me/identities') return send({userId:user.id,identities:scenario === 'viewer' ? [] : identities,primaryIdentity:scenario === 'viewer' ? null : identities[0],capabilities:{}})
  if(path.startsWith('/account-launch/seasons/'))return send({launch:{seasonId:path.split('/').at(-1),portalMode:'SHADOW_BETA',allowed:true,emailVerified:true,features:{teamOperations:'WRITE',weeklyCompetition:'WRITE',matchRoom:'WRITE',communications:'READ_ONLY',predictions:'READ_ONLY',scheduleNegotiation:'READ_ONLY'}}})
  if ((scenario === 'unavailable' && ['/me/tasks','/me/weekly-competition','/me/weekly-match-rooms'].includes(path)) || (scenario === 'partial' && path === '/me/weekly-competition')) return send({error:'PREVIEW_SYNC_FAILURE'},503)
  if (scenario === 'slow' && path === '/me/weekly-competition') { pendingPreviewReads.add(res); res.once('close', () => pendingPreviewReads.delete(res)); return }
  if (Date.now() < matchTimeoutUntil && path === '/me/weekly-match-rooms') { pendingPreviewReads.add(res); res.once('close', () => pendingPreviewReads.delete(res)); return }
  if (scenario === 'saving' && path.startsWith('/me/weekly-participations/') && req.method === 'PUT') await new Promise(resolve => setTimeout(resolve, 5000))
  if(path === '/me/weekly-competition') return send({userId:user.id,season:{id:new URL(req.url,'http://local').searchParams.get('seasonId'),name:'周赛设计示例',status:'ACTIVE'},accessMode:scenario === 'player' ? 'READ_ONLY' : 'WRITE',teams:previewTeamAccess(),cycles:previewCycles()})
  if(path.startsWith('/me/weekly-weeks/') && req.method==='PUT') { const entry=[weeklyEntry,extraEntry].filter(Boolean).find(item=>item.id===body.entryId); const record=entry?.weeks.find(item=>item.week.id===path.split('/')[3]); if (!record || entry.accessMode !== 'WRITE') return send({error:'PREVIEW_INVALID_TEAM'},403); const participation=record.participation; Object.assign(participation,body,{id:participation.id || `preview-participation-${entry.id}`,revision:participation.revision+1}); return send({participation}) }
  if(path.startsWith('/me/weekly-participations/') && req.method==='PUT') { const participation=[weeklyEntry,extraEntry].filter(Boolean).flatMap(entry=>entry.weeks).map(record=>record.participation).find(item=>item.id===path.split('/')[3]); if(!participation || scenario==='player') return send({error:'PREVIEW_INVALID_TEAM'},403); const roster=participation.rosters[0] || {id:'preview-new-roster',version:1,revision:0,members:[]}; Object.assign(roster,body,{revision:roster.revision+1}); participation.rosters=[roster]; return send({roster}) }
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
  if(path === '/me/space-context') {const seasonId=new URL(req.url,'http://local').searchParams.get('seasonId');const context=buildAccountDesignPreviewFixture('locked',scenario === 'viewer' ? 'VIEWER' : 'MULTI').spaceContext;Object.assign(context,{seasonId,user:{...user,emailVerified:false},contract:'ACCOUNT_FOUNDATION_V1',competitionKind:'WEEKLY'});context.overview={...context.overview,tasks:[],openTaskCount:0,nextTeamMatch:null,nextStaffAssignment:null};context.teamContexts=context.teamContexts.map(team=>({...team,matches:[]}));return send({context})}
  if(path === '/me/weekly-match-rooms') {const seasonId=new URL(req.url,'http://local').searchParams.get('seasonId');return send({season:{id:seasonId,name:'周赛设计示例',status:'ACTIVE',timezone:'Asia/Shanghai'},accessMode:'WRITE',featureAccess:'WRITE',teams:[weeklyRooms[0].myTeams[0]],rooms:weeklyRooms})}
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
})
await new Promise((resolve, reject) => { api.once('error', reject); api.listen(4459, '127.0.0.1', resolve) })
const vite = await createServer({root,configFile:fileURLToPath(new URL('../vite.config.js', import.meta.url)),server:{host:'127.0.0.2',port:3037,strictPort:true,proxy:{'/api/platform':{target:'http://127.0.0.1:4459',changeOrigin:true,rewrite:p=>p.replace(/^\/api\/platform/,'/api')}}},plugins:[{
  name:'account-design-preview-banner',
  configureServer(server) {
    server.middlewares.use((req,res,next) => {
      const path = new URL(req.url, 'http://local').pathname
      if (!path.startsWith('/__account-preview/')) return next()
      setScenario(path.split('/').at(-1))
      const location = scenario.startsWith('match-') ? `/me?section=matches&weeklyMatch=${scenario === 'match-live' ? 'preview-weekly-next' : 'preview-weekly-result'}&season=FCR2026` : '/me?season=FCR2026'
      res.writeHead(303, {Location:location,'Cache-Control':'no-store'})
      res.end()
    })
  },
  transformIndexHtml:html=>html.replace('</body>',`<div style="position:fixed;bottom:0;left:0;right:0;z-index:2000;background:#f4c320;color:#181a17;padding:6px 16px;font:12px/1.5 sans-serif;text-align:center"><details><summary style="cursor:pointer">设计预览 · 示例状态：${scenarioLabels[scenario]} · 操作仅保存在本次预览 ▴</summary><nav aria-label="切换账号预览状态" style="display:flex;flex-wrap:wrap;justify-content:center;gap:12px;padding:12px">${Object.entries(scenarioLabels).map(([key,label])=>`<a style="color:#181a17;padding:8px;border:1px solid #181a1766" href="/__account-preview/${key}">${label}</a>`).join('')}</nav></details></div></body>`)
}]})
await vite.listen()
console.log('Account design preview: http://127.0.0.2:3037/me?season=FCR2026')
console.log('Stage / identity preview: http://127.0.0.2:3037/dev/account-preview')
console.log('Sample data only. Account writes stay in memory. Ctrl+C stops both preview servers.')
const stop=async()=>{api.close();await vite.close();process.exit(0)}
process.on('SIGINT',stop);process.on('SIGTERM',stop)
