import {useEffect} from 'react'
import Taro from '@tarojs/taro'
import {View,Button} from '@tarojs/components'
import {pickUiLocale} from '../../../../src/lib/uiText.js'
// Native cards use PublicPage's onShareAppMessage. They contain public IDs,
// never an automatic screenshot of device-local following or query history.
function NativePublicShare({onClose,locale='zh-CN'}) {
  const t=(zh,en,ko,tw)=>pickUiLocale(locale,zh,en,ko,tw)
  useEffect(()=>{Taro.showShareMenu({menus:['shareAppMessage']}).catch(()=>{})},[])
  return <View className='native-share-layer' catchMove><View className='native-share-backdrop' onClick={onClose}/><View className='native-share-panel' role='dialog' aria-label={t('分享公开赛事资料','Share public event information','공개 대회 정보 공유','分享公開賽事資料')}><h2>{t('分享公开赛事资料','Share public event information','공개 대회 정보 공유','分享公開賽事資料')}</h2><p>{t('分享卡片会打开当前公开页面，不包含本机关注记录。','The card opens this public page and excludes local following.','카드는 현재 공개 페이지를 열며 기기의 관심 기록은 포함하지 않습니다.','分享卡片會開啟目前的公開頁面，不包含本機關注記錄。')}</p><Button className='native-share-primary' openType='share' onClick={onClose}>{t('分享给微信好友','Share with a WeChat friend','위챗 친구에게 공유','分享給微信好友')}</Button><Button className='native-share-close' onClick={onClose}>{t('取消','Cancel','취소','取消')}</Button></View></View>
}
export function NativePlayerShareDialog({onClose,locale}){return <NativePublicShare onClose={onClose} locale={locale}/>}
export function NativeTeamShareDialog({open,onClose,model}){return open?<NativePublicShare onClose={onClose} locale={model?.locale}/>:null}
export function NativeReviewShareDialog({onClose,locale}){return <NativePublicShare onClose={onClose} locale={locale}/>}
