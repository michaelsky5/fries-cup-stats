// Verify native export payloads against real archived records. This is a
// contract check; actual Canvas images still require native runtime validation.
import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {fileURLToPath} from 'node:url'
import {Script} from 'node:vm'

const require=createRequire(import.meta.url),{transformSync}=require('@babel/core')
const trial=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),stats=path.resolve(trial,'../..'),cache=new Map()
const noAction=()=>undefined,platform=new Proxy({},{get:(_,key)=>key==='__esModule'?true:noAction})
const taro=new Proxy({__esModule:true,default:platform},{get:(value,key)=>key in value?value[key]:noAction})
function resolveLocal(name,parent){const base=path.resolve(path.dirname(parent),name);return [base,base+'.js',base+'.jsx',base+'.json',path.join(base,'index.js')].find(fs.existsSync)}
function load(filename){
  if(filename===path.join(stats,'src/config/seasons.js'))filename=path.join(trial,'src/shared/publicSeasons.js')
  if(filename===path.join(stats,'src/lib/locales.js'))filename=path.join(trial,'src/shared/nativeLocales.js')
  if(filename===path.join(stats,'src/lib/localeCatalog.js'))filename=path.join(trial,'src/generated/localeCatalog.js')
  if(filename===path.join(trial,'src/platform.js'))return platform
  if(!filename)throw new Error('Unresolved native poster dependency')
  if(filename.endsWith('.json'))return JSON.parse(fs.readFileSync(filename,'utf8'))
  if(cache.has(filename))return cache.get(filename).exports
  const module={exports:{}};cache.set(filename,module)
  const source=fs.readFileSync(filename,'utf8').replaceAll('import.meta.env','({ DEV: false })')
  const {code}=transformSync(source,{filename,babelrc:false,configFile:false,plugins:[require('@babel/plugin-transform-modules-commonjs')]})
  const localRequire=name=>name==='@tarojs/taro'?taro:name.startsWith('.')?load(resolveLocal(name,filename)):require(name)
  new Script(`(function(require,module,exports){${code}\n})`,{filename}).runInThisContext()(localRequire,module,module.exports)
  return module.exports
}
const {SEASONS}=load(path.join(trial,'src/shared/publicSeasons.js'))
const {validatePublicSnapshot}=load(path.join(trial,'src/shared/publicSnapshot.js'))
const {getReviewReadiness}=load(path.join(stats,'src/lib/reviewReadiness.js'))
const {publicEvidence}=load(path.join(trial,'src/shared/historicalModel.js'))
const {publicStoryScenes}=load(path.join(trial,'src/shared/publicStoryModel.js'))
const {nativePosterModel,getDirectorCutHeroOptions}=load(path.join(trial,'src/poster/posterModel.js'))
const {posterEntryUrl,posterReturnUrl,nativeBoardingReviewUrl}=load(path.join(trial,'src/poster/posterRoutes.js'))
const {activateLocale}=load(path.join(trial,'src/shared/nativeLocales.js'))
const {protectPublicIdentities}=load(path.join(trial,'src/shared/nativeCopy.js'))
const reports=[],failures=[]
for(const season of SEASONS){
  const raw=validatePublicSnapshot(JSON.parse(fs.readFileSync(path.join(process.argv[2],season.id+'-public.json'),'utf8')),season)
  if(!getReviewReadiness(season,raw).available){assert.throws(()=>nativePosterModel(raw,{season:season.id,story:'tournament'},'zh-CN'),/尚未开放/);continue}
  const staff=publicEvidence(raw,season,'staff')
  const stories=[{story:'tournament'},{story:'player',subject:raw.players[0].player_id},{story:'team',subject:raw.teams[0].team_id}]
  for(const role of ['admin','caster']){const person=staff.find(person=>!person.team&&person.role===role);if(person)stories.push({story:'staff-key',role,subject:person.id.split(':').slice(2).join(':')})}
  const teamStaff=staff.find(person=>person.team&&person.identityKey)
  if(teamStaff)stories.push({story:'person',subject:teamStaff.identityKey},{story:'staff',subject:teamStaff.id})
  for(const locale of ['zh-CN','en-US','ko-KR','zh-TW']){
    activateLocale(locale);protectPublicIdentities(raw)
    const hero=getDirectorCutHeroOptions(locale).find(hero=>hero.id)
    for(const story of stories)for(const format of ['ticket','classic','poster','movieTicket','directorCut']){
      const label={season:season.id,locale,story:story.story,format}
      try{
        const params={season:season.id,...story}
        assert.ok(publicStoryScenes(raw,params,locale).length)
        const settings={format:format==='classic'?'ticket':format,boardingPassVersion:format==='classic'?'classic':'modern',heroChoice:hero.id,viewerId:story.story==='tournament'?'LOCAL-ONLY-VIEWER':'',artScale:1,artOffsetY:0}
        const model=nativePosterModel(raw,params,locale,settings),payload=model.payload
        assert.equal(payload.locale,locale);assert.equal(payload.seasonId,season.id)
        const horizontal=payload.cardKind==='player'||Boolean(payload.identityTicket)
        const wide=model.format==='ticket'&&horizontal&&payload.boardingPassVersion!=='classic'&&(payload.usesRegularTemplate||payload.seasonId==='FCR26')
        const landscape=horizontal||['movieTicket','directorCut'].includes(model.format)
        assert.deepEqual([model.width,model.height],wide?[2400,960]:model.format==='poster'?[1080,1920]:landscape?[1920,1080]:[1080,1920])
        if(model.format==='directorCut')assert.ok(model.director.ready&&payload.heroRender)
        const entry=posterEntryUrl({...params,viewerId:settings.viewerId,privateKey:'DO-NOT-SHARE'},season.id,locale),back=posterReturnUrl(params,locale)
        assert.ok(entry.startsWith('/poster/pages/index?'));assert.ok(back.startsWith('/center/pages/index?'))
        assert.ok(!entry.includes('LOCAL-ONLY')&&!entry.includes('DO-NOT-SHARE'))
        if(payload.reviewUrl){assert.ok(payload.reviewUrl.startsWith('https://stats.fries-cup.com/review/story/'));assert.ok(!payload.reviewUrl.includes('LOCAL-ONLY'))}
        reports.push({...label,kind:payload.cardKind,width:model.width,height:model.height,hero:Boolean(payload.heroRender),qr:Boolean(payload.reviewUrl)})
      }catch(error){failures.push({...label,error:error.message})}
    }
  }
}
assert.equal(nativeBoardingReviewUrl('/account','FCR26','zh-CN'),'')
const report={cases:reports.length+failures.length,passed:reports.length,failures,exports:reports}
if(process.argv[3])fs.writeFileSync(path.join(process.argv[3],'public-poster-contracts.json'),JSON.stringify(report,null,2))
console.log(JSON.stringify({cases:report.cases,passed:report.passed,failures:[...new Map(failures.map(item=>[item.error,item])).values()]}))
if(failures.length)process.exitCode=1
