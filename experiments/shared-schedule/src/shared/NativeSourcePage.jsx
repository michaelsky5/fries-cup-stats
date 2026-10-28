import {useEffect} from 'react'
import NativePublicFrame from './NativePublicFrame.jsx'
import {getSeasonById} from './publicSeasons.js'
import {captureRuntime} from '../platform.js'
import {BUILD} from './build.js'
export default function NativeSourcePage(props){
  const {raw,view,params,loading,error,stale,onRetry,storageError,navigationError,requestDetail,children}=props
  const season=getSeasonById(params.season)
  useEffect(()=>captureRuntime({build:BUILD,design:'canonical-public',seasonId:season.id,locale:props.locale,view,loading,error,stale,matchId:params.id||'',playerId:params.player||'',teamId:params.team||'',mapName:params.map||'',heroName:params.hero||'',staffId:params.staff||'',story:params.story||'',following:props.following}),[raw,view,params,loading,error,stale,season.id,props.locale,props.following])
  return <NativePublicFrame props={props} season={season}>
    {!raw&&view!=='play'?<section className='shared-state' role='status'>{loading?'正在读取公开赛事记录…':error||'暂无公开赛事记录。'}{requestDetail?<p className='native-public-error-detail'>{requestDetail}</p>:null}{!loading?<button onClick={onRetry}>重新读取</button>:null}</section>:<>
      {storageError||navigationError?<p role='alert'>{storageError||navigationError}</p>:null}
      <div data-native-source-page={view}>{children}</div>
    </>}
  </NativePublicFrame>
}
