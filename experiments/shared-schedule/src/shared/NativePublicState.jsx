export default function NativePublicState({props}) {
  const {raw,loading,error,stale,requestDetail,onRetry,onCheckConnection,connectionDetail,navigationError}=props
  return <>
    {!raw?<div className='shared-state'>{loading?'正在读取公开赛事记录…':error||'暂无公开赛事记录。'}{requestDetail?<p>{requestDetail}</p>:null}{!loading?<button onClick={onRetry}>重新读取</button>:null}{onCheckConnection?<button onClick={onCheckConnection}>检测连接</button>:null}{connectionDetail?<p>{connectionDetail}</p>:null}</div>:error||stale?<p className='native-record-notice'>更新失败，正在显示上次读取的公开记录。<button onClick={onRetry}>重新读取</button></p>:null}
    {navigationError?<p role='alert'>{navigationError}</p>:null}
  </>
}
