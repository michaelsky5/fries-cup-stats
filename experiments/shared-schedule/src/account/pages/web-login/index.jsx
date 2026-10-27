import { useRef, useState, useEffect } from 'react'
import Taro, { useDidHide, useDidShow } from '@tarojs/taro'
import { Button, Text, View } from '@tarojs/components'
import { nativeAccount } from '../../nativeAccountRuntime.js'
import { readWebLoginScene, normalizeWebLoginReview } from '../../nativeWebLoginModel.js'
import './index.css'

export default function WebLoginConfirmation() {
  const params = Taro.getCurrentInstance().router?.params || {}
  const ticketId = readWebLoginScene(params.scene || params.ticketId)
  const [review, setReview] = useState(null), [notice, setNotice] = useState(''), [busy, setBusy] = useState(false), [clock, setClock] = useState(Date.now())
  const visible = useRef(true), lock = useRef(false)
  const report = error => { if (visible.current && error.code !== 'STALE_REQUEST') setNotice(error.outcomeUnknown ? '请求结果尚未确认。请点“核对登录状态”，不要反复确认。' : error.message || '暂时无法核对，请稍后重试。') }
  const inspect = async () => {
    if (!ticketId || lock.current) return
    lock.current = true; setBusy(true); setNotice('')
    try {
      let account = await nativeAccount.restore()
      if (account.status === 'SIGNED_OUT') account = await nativeAccount.beginLogin()
      const next = normalizeWebLoginReview(await nativeAccount.webLogin('scan', ticketId))
      if (visible.current) { setReview(next); setClock(Date.now()) }
    } catch (error) { report(error) }
    finally { lock.current = false; if (visible.current) setBusy(false) }
  }
  useDidShow(() => {
    visible.current = true
    Taro.hideShareMenu({ menus: ['shareAppMessage','shareTimeline'] }).catch(() => {})
    if (!ticketId) { setNotice('二维码无效，请在电脑上刷新后重新扫码。'); return }
    void inspect()
  })
  useDidHide(() => { visible.current = false; setReview(null) })
  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])
  const act = async action => {
    if (lock.current) return
    lock.current = true; setBusy(true); setNotice('')
    try {
      const result = await nativeAccount.webLogin(action, ticketId)
      if (visible.current) setReview(previous => previous ? { ...previous, status: result.status } : previous)
    } catch (error) { report(error) }
    finally { lock.current = false; if (visible.current) setBusy(false) }
  }
  const expired = review && review.deadline <= clock && !['CONFIRMED','DENIED'].includes(review.status)
  const pending = review && ['SCANNED','BINDING'].includes(review.status) && !expired
  return <View className='web-login-page'>
    <View className='web-login-brand'><Text>FRIES CUP</Text><Text>网页登录确认</Text></View>
    <View className='web-login-card'>
      <Text className='web-login-title'>在浏览器上登录薯条杯赛事中心</Text>
      <Text className='web-login-warning'>只有你本人正在该浏览器发起登录时，才点“确认登录”。不是本人操作，请取消。</Text>
      {review && <View className='web-login-details'>
        <View><Text>浏览器</Text><Text>{review.browser} · {review.system}</Text></View>
        <View><Text>地区</Text><Text>{review.region}</Text></View>
        <View><Text>发起时间</Text><Text>{new Date(review.createdAt).toLocaleString('zh-CN', { hour12: false })}</Text></View>
        {pending && <View><Text>剩余有效时间</Text><Text>{Math.max(0, Math.ceil((review.deadline-clock)/1000))} 秒</Text></View>}
      </View>}
      {review?.status === 'CONFIRMED' ? <Text className='web-login-result'>已确认，请回到原浏览器继续。网页会话仅交给发起请求的浏览器。</Text>
        : review?.status === 'DENIED' ? <Text className='web-login-result'>已取消这次网页登录。</Text>
          : expired || review?.status === 'EXPIRED' ? <Text className='web-login-result'>二维码已过期，请在电脑上刷新后重新扫码。</Text> : null}
      {notice && <Text className='web-login-error' role='alert'>{notice}</Text>}
      {pending && review.status === 'BINDING' ? <>
        <Text>请先关联你已有的薯条杯账号，关联完成后返回本页核对并确认。</Text>
        <Button className='web-login-primary' disabled={busy} onClick={() => Taro.navigateTo({ url: '/account/pages/index' })}>关联薯条杯账号</Button>
      </> : pending ? <Button className='web-login-primary' disabled={busy} loading={busy} onClick={() => act('confirm')}>确认登录</Button> : null}
      {pending && <Button className='web-login-secondary' disabled={busy} onClick={() => act('deny')}>取消</Button>}
      {ticketId && !['CONFIRMED','DENIED'].includes(review?.status) && <Button className='web-login-secondary' disabled={busy} loading={busy} onClick={inspect}>核对登录状态</Button>}
    </View>
  </View>
}
