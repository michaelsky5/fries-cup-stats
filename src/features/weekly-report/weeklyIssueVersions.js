import { buildWeeklyNewspaper } from './weeklyNewsroom.js'

export const ISSUE_SCHEMA = 'friescup-weekly-issue-v1'
const STORE_SCHEMA = 'friescup-weekly-issue-store-v1'
const text = value => String(value ?? '').trim()
const copy = value => JSON.parse(JSON.stringify(value, (_key, item) => item instanceof Map ? [...item] : item instanceof Set ? [...item] : item))
const pick = (value, keys) => Object.fromEntries(keys.filter(key => value?.[key] !== undefined).map(key => [key,value[key]]))
const awardPlayer = player => player ? pick(player,['id','name','role','position','hero','teams','per10','score','rating']) : null
function freezeAwards(awards) {
  if (!awards) return null
  return {...pick(awards,['status','complete','policy','modelVersion','inputVersion']),mvp:(awards.mvp||[]).map(awardPlayer),bestFive:(awards.bestFive||[]).map(slot=>({...pick(slot,['position','role','status']),player:awardPlayer(slot.player)}))}
}
const matchFacts = match => pick(match,['id','state','team_a','team_b','start_time','format','label'])

export function issueScope(report, seasonId, locale) {
  const scope = {seasonId:text(seasonId || report?.seasonId),cycleId:text(report?.cycle?.id),weekId:text(report?.week?.id),locale:text(locale || 'zh-CN')}
  if (Object.values(scope).some(value => !value)) throw new Error('周报赛事、赛段或周次不完整。 / Missing issue scope.')
  return scope
}

export const issueStorageKey = scope => `friescup:weekly-issues:v1:${encodeURIComponent(JSON.stringify(scope))}`
const sameScope = (a,b) => ['seasonId','cycleId','weekId','locale'].every(key => a?.[key] === b?.[key])

export function createIssueDraft(report, seasonId, locale) {
  const scope=issueScope(report,seasonId,locale)
  // Freeze the public fact pack, not the whole application database or its latest-data pointer.
  const frozenReport=copy({...pick(report,['cycle','week','number','seasonId','sourceAt','maps','playerCount','teamCount','namedBans']),completed:report.completed.map(matchFacts),pending:report.pending.map(matchFacts),awards:freezeAwards(report.awards)})
  const newspaper=buildWeeklyNewspaper(report,locale)
  const {report: ignoredReport, ...paper}=newspaper
  void ignoredReport
  // Raw map facts are retained once. Rendered articles do not need duplicate player rows
  // or the award engine's full candidate and baseline calculation graph.
  const frozenPaper=JSON.parse(JSON.stringify({...paper,awards:frozenReport.awards},(key,value)=>key==='player_stats'?undefined:value))
  return {scope,report:frozenReport,paper:frozenPaper,edits:{headline:paper.lead?.title || '',briefs:Object.fromEntries(paper.briefs.map(article=>[article.id,article.brief]))},reviewed:false}
}

export function applyIssueEdits(draft) {
  const paper=copy(draft.paper)
  if (paper.lead) paper.lead.title=text(draft.edits?.headline)
  paper.briefs=paper.briefs.map(article=>({...article,brief:text(draft.edits?.briefs?.[article.id] ?? article.brief)}))
  return paper
}

export function validateIssueDraft(draft) {
  const errors=[],warnings=[]
  const {report,paper,scope}=draft || {}
  let reportScope
  try { reportScope=issueScope(report,scope?.seasonId,scope?.locale) } catch { /* Invalid imported scope becomes a validation error. */ }
  if (!report || !paper || !reportScope || !sameScope(scope,reportScope)) errors.push('周报数据与所选周次不一致。 / Issue scope mismatch.')
  if (!report?.completed?.length || !paper?.lead) errors.push('本周尚无已确认赛果，无法保存报纸。 / No confirmed results this week.')
  if (!report?.sourceAt || !Number.isFinite(Date.parse(report.sourceAt))) errors.push('缺少有效的数据时间。 / Missing source timestamp.')
  if (paper?.generation?.cycleId!==scope?.cycleId || paper?.generation?.weekId!==scope?.weekId || paper?.locale!==scope?.locale) errors.push('生成内容不属于当前周次或语言。 / Generated content scope mismatch.')
  const en=String(scope?.locale).startsWith('en'),headlineLimit=en?100:44,briefLimit=en?190:88
  const headline=text(draft?.edits?.headline)
  if (!headline || [...headline].length>headlineLimit || /[\r\n]/.test(headline)) errors.push(`主标题需为单行，最多 ${headlineLimit} 字。 / Invalid headline length.`)
  for (const article of paper?.briefs || []) {
    const brief=text(draft?.edits?.briefs?.[article.id])
    if (!brief || [...brief].length>briefLimit || /[\r\n]/.test(brief)) errors.push(`短讯需为单段，最多 ${briefLimit} 字。 / Invalid brief length.`)
  }
  const matchIds=new Set((report?.completed || []).map(match=>String(match.id)))
  const maps=new Set((report?.maps || []).map(map=>JSON.stringify([String(map.matchId),Number(map.order)])))
  for (const article of paper?.articles || []) if (!matchIds.has(String(article.id))) errors.push('新闻引用了其他周次的比赛。 / Out-of-week match reference.')
  for (const story of paper?.dataStories?.cards || []) for (const stat of story.stats || []) {
    if (!maps.has(JSON.stringify([String(stat.matchId),Number(stat.order)]))) errors.push('数据趣闻引用了其他周次的地图。 / Out-of-week story reference.')
  }
  const sequenceIssues=[paper?.lead,...(paper?.briefs || [])].filter(Boolean).flatMap(article=>article.sequence || []).filter(map=>map.mapScoreStatus!=='recorded')
  if (sequenceIssues.length) warnings.push('有逐图比分待补齐或存在冲突。 / Some map scores require review.')
  if (report?.pending?.length) warnings.push('本周仍有未确认对阵。 / Some weekly results are pending.')
  if ((report?.awards?.bestFive || []).filter(slot=>slot.player).length!==5 || !(report?.awards?.mvp || []).length) warnings.push('本周荣誉名单尚未完整。 / Weekly honours are incomplete.')
  return {errors:[...new Set(errors)],warnings:[...new Set(warnings)],headlineLimit,briefLimit}
}

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  if (value && typeof value==='object') return `{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`
  return JSON.stringify(value)
}

async function digest(value) {
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonical(value)))
  return [...new Uint8Array(bytes)].map(byte=>byte.toString(16).padStart(2,'0')).join('')
}

const digestContent = version => pick(version,['schema','scope','sourceKind','payload'])

export async function verifyIssueVersion(version) {
  if (version?.schema!==ISSUE_SCHEMA || version.status!=='local-draft' || version.sourceKind!=='public-snapshot-sample' ||
      !Number.isInteger(version.revision) || version.revision<1 || !Number.isFinite(Date.parse(version.savedAt))) throw new Error('周报备份格式不正确。 / Invalid issue backup.')
  const checks=validateIssueDraft({...version.payload,scope:version.scope})
  if (checks.errors.length || version.digest!==await digest(digestContent(version))) throw new Error('周报版本校验失败，内容可能不完整或已被修改。 / Issue integrity check failed.')
  return version
}

export async function readIssueVersions(storage, scope) {
  const raw=storage.getItem(issueStorageKey(scope))
  if (!raw) return []
  let record
  try { record=JSON.parse(raw) } catch { throw new Error('本地周报记录无法读取，原记录已保留。 / Local issue data is unreadable; it is preserved.') }
  if (record?.schema!==STORE_SCHEMA || !Array.isArray(record?.versions)) throw new Error('本地周报记录格式不正确，原记录已保留。 / Invalid local issue store; it is preserved.')
  for (const [index,version] of record.versions.entries()) {
    if (!sameScope(version?.scope,scope) || version?.revision!==index+1) throw new Error('周报版本顺序或所属周次不正确。 / Invalid issue history.')
    await verifyIssueVersion(version)
  }
  return record.versions
}

export async function saveIssueVersion(storage, draft, expectedRevision, {locks,now=()=>new Date().toISOString()}={}) {
  const checks=validateIssueDraft(draft)
  if (checks.errors.length) throw new Error(checks.errors[0])
  const candidate={schema:ISSUE_SCHEMA,scope:copy(draft.scope),status:'local-draft',sourceKind:'public-snapshot-sample',payload:copy({...draft,paper:applyIssueEdits(draft)})}
  delete candidate.payload.scope
  candidate.digest=await digest(digestContent(candidate))
  const append=async()=>{
    const history=await readIssueVersions(storage,draft.scope)
    const latest=history.at(-1)
    if ((latest?.revision || 0)!==expectedRevision) throw new Error('已有更新版本，请回看版本记录后重试。 / A newer version exists; review history and retry.')
    if (latest?.digest===candidate.digest) return {version:latest,history,created:false}
    const version={...candidate,revision:history.length+1,savedAt:now()}
    await verifyIssueVersion(version)
    const next=[...history,version]
    try { storage.setItem(issueStorageKey(draft.scope),JSON.stringify({schema:STORE_SCHEMA,versions:next})) }
    catch { throw new Error('本地保存失败，草稿和旧版本已保留。请导出备份后重试。 / Local save failed; draft and history are preserved. Export a backup and retry.') }
    return {version,history:next,created:true}
  }
  return locks ? locks.request(issueStorageKey(draft.scope),append) : append()
}

export function draftFromVersion(version) {
  return copy({...version.payload,scope:version.scope})
}

export async function importIssueVersion(storage, raw, scope, expectedRevision, options) {
  if (typeof raw!=='string' || raw.length>4_000_000) throw new Error('备份文件过大或格式不正确。 / Invalid backup size.')
  let version
  try { version=JSON.parse(raw) } catch { throw new Error('请选择有效的周报 JSON 备份。 / Choose a valid issue JSON backup.') }
  await verifyIssueVersion(version)
  if (!sameScope(version.scope,scope)) throw new Error('备份属于其他赛事、周次或语言，请先切换。 / Switch to the backup’s event, week and language first.')
  return saveIssueVersion(storage,draftFromVersion(version),expectedRevision,options)
}

export function issueBackupFilename(version) {
  const scope=[version.scope.seasonId,version.scope.cycleId,version.scope.weekId,version.scope.locale].map(value=>String(value).replace(/[^a-zA-Z0-9_-]/g,'-')).join('-')
  return `FriesCup-Weekly-${scope}-v${version.revision}.json`
}
