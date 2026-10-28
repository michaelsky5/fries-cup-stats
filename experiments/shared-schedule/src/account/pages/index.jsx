import { useEffect, useRef, useState } from 'react'
import Taro, { useDidHide, useDidShow } from '@tarojs/taro'
import { Checkbox, CheckboxGroup, Input, Label, Text, View } from '@tarojs/components'
import Button from '../NativeAccountButton.jsx'
import { nativeAccount, accountPreviewLabel, authorizeNativeAccountPrivacy, openNativePrivacyPolicy } from '../nativeAccountRuntime.js'
import { centerUrl, storedSeasonId } from '../../platform.js'
import './account.css'
import NativeParticipation from '../NativeParticipation.jsx'
import NativeWeeklyPanel from '../NativeWeeklyPanel.jsx'
import { roomUrl, validNativeMatchId } from '../nativeRoomModel.js'

export default function NativeAccountPage() {
  const [account, setAccount] = useState(nativeAccount.snapshot)
  const [enabled, setEnabled] = useState(null)
  const [participationEnabled, setParticipationEnabled] = useState(false)
  const [roomsEnabled, setRoomsEnabled] = useState(false), [unlinkOpen, setUnlinkOpen] = useState(false), [unlinkPassword, setUnlinkPassword] = useState('')
  const [privacyAccepted, setPrivacyAccepted] = useState(false)
  const [weeklyOpen, setWeeklyOpen] = useState(false)
  const [email, setEmail] = useState(''), [password, setPassword] = useState('')
  const [notice, setNotice] = useState(''), [busy, setBusy] = useState(false)
  const [retryAt, setRetryAt] = useState(0), [clock, setClock] = useState(Date.now())
  const lock = useRef(false), visible = useRef(true)
  useEffect(() => {
    const unsubscribe = nativeAccount.subscribe(setAccount)
    return () => { visible.current = false; unsubscribe() }
  }, [])
  useEffect(() => {
    if (retryAt <= Date.now()) return undefined
    const timer = setInterval(() => { setClock(Date.now()); if (Date.now() >= retryAt) clearInterval(timer) }, 1000)
    return () => clearInterval(timer)
  }, [retryAt])
  const showError = error => {
    if (!visible.current || error.code === 'STALE_REQUEST') return
    setNotice(error.message || '暂时无法完成，请稍后重试。')
    if (error.retryAfterMs) setRetryAt(Date.now() + error.retryAfterMs)
  }
  useDidShow(() => {
    visible.current = true
    setBusy(lock.current)
    Taro.hideShareMenu({ menus: ['shareAppMessage', 'shareTimeline'] }).catch(() => {})
    nativeAccount.capabilities().then(value => { if (visible.current) { setEnabled(value.capabilities?.wechatLogin === true); setParticipationEnabled(value.capabilities?.participationRead === true); setRoomsEnabled(value.capabilities?.matchRoom === true) } }).catch(showError)
    nativeAccount.restore().catch(showError)
  })
  useDidHide(() => { visible.current = false; setPassword(''); setUnlinkPassword(''); nativeAccount.discardBinding() })
  const run = async action => {
    if (lock.current || Date.now() < retryAt) return
    lock.current = true
    setBusy(true)
    setNotice('')
    try { await action() } catch (error) { showError(error) }
    finally { setPassword(''); setUnlinkPassword(''); lock.current = false; if (visible.current) setBusy(false) }
  }
  const wait = Math.max(0, Math.ceil((retryAt - clock) / 1000))
  const startLogin = () => run(async () => {
    if (!privacyAccepted) { setNotice('请先阅读隐私指引并确认绑定用途。'); return }
    try { await authorizeNativeAccountPrivacy() } catch { throw new Error('尚未同意隐私指引，或指引暂不可用。请先查看隐私保护指引，稍后再试。') }
    if (visible.current) return nativeAccount.beginLogin()
  })
  const home = () => Taro.reLaunch({ url: centerUrl({ view: 'overview', season: storedSeasonId() }) })
  const binding = account.status === 'BINDING_REQUIRED'
  const signedIn = account.status === 'AUTHENTICATED'
  if (signedIn && weeklyOpen) return <NativeWeeklyPanel onBack={() => setWeeklyOpen(false)}/>
  return <View className='native-account'>
    {accountPreviewLabel ? <View className='native-account-notice'><Text>{accountPreviewLabel}</Text></View> : null}
    <View className='native-account-top'><Button className='native-account-back' onClick={home}>返回赛事中心</Button><Text className='native-account-wordmark'>薯条杯 · 我的账号</Text></View>
    <View className='native-account-title'><Text className='native-account-number'>01</Text><View className='native-account-title-copy'><Text className='native-account-eyebrow'>我的赛事账号</Text><Text className='native-account-heading'>{signedIn ? account.user.displayName : binding ? '关联已有账号' : '让参赛记录跟着你'}</Text></View></View>
    <Text className='native-account-intro'>{signedIn ? '微信已关联原账号，队伍与赛事身份沿用现有记录。' : '使用你已有的薯条杯账号。首次验证后，下次可直接微信登录。'}</Text>
    {notice ? <View className='native-account-notice' role='alert'><Text>{notice}</Text></View> : null}
    {account.status === 'RESTORING' ? <View className='native-account-section'><Text>正在核对登录状态…</Text><Button className='native-account-secondary' onClick={() => run(() => nativeAccount.restore())}>重新核对</Button><Button className='native-account-secondary' onClick={() => run(() => nativeAccount.logout())}>退出此设备登录</Button></View>
      : signedIn ? <View className='native-account-section'>
        <Text className='native-account-label'>已登录</Text><Text className='native-account-display'>{account.user.displayName}</Text>
        <Text className='native-account-detail'>邮箱已验证 · 微信已关联</Text>
        {participationEnabled ? <NativeParticipation key={account.user.id + ':' + account.user.effectiveMode}/> : null}
        {participationEnabled ? <Button className='native-account-primary' onClick={() => setWeeklyOpen(true)}>每周确认与名单</Button> : null}
        {roomsEnabled ? <Button className='native-account-primary' onClick={() => { const params = Taro.getCurrentInstance()?.router?.params || {}; Taro.navigateTo({ url: roomUrl(validNativeMatchId(params.room) ? params.room : '', params.season || storedSeasonId()) }) }}>我的比赛房</Button> : null}
        <Button className='native-account-primary' onClick={home}>继续查看赛事</Button>
        <Button className='native-account-secondary' disabled={busy} onClick={() => run(async () => { await nativeAccount.logout(); setNotice('已退出当前设备。') })}>退出当前账号</Button>
        <Button className='native-account-secondary' disabled={busy} onClick={() => setUnlinkOpen(!unlinkOpen)}>{unlinkOpen ? '取消解绑' : '解除当前微信绑定'}</Button>
        {unlinkOpen && <View className='native-account-section'><Text className='native-account-detail'>验证当前账号密码后解除绑定，原有队伍和赛事记录保留，旧微信的小程序登录立即失效。</Text>
          <View className='native-account-field'><Text className='native-account-field-label'>当前账号密码</Text><Input value={unlinkPassword} password maxlength={128} disabled={busy} onInput={event => setUnlinkPassword(event.detail.value)} aria-label='解绑验证密码' /></View>
          <Button className='native-account-secondary' disabled={busy || !unlinkPassword} onClick={() => run(async () => {
            const confirmation = await Taro.showModal({ title: '解除微信绑定', content: '确认解除当前微信与此赛事账号的关联？原账号和赛事记录保留。', confirmText: '解除绑定' })
            if (confirmation.confirm) { await nativeAccount.unlink(unlinkPassword); setUnlinkOpen(false); setNotice('已解除微信绑定，原账号资料保留。') }
          })}>验证密码并解除绑定</Button></View>}
      </View> : binding ? <View className='native-account-section'>
        <Text className='native-account-label'>首次关联 · 验证原账号</Text>
        <Text className='native-account-detail'>请输入原账号的邮箱和密码。关联成功后继续使用原有队伍和参赛记录。</Text>
        <View className='native-account-field'><Text className='native-account-field-label'>原账号邮箱</Text><Input value={email} type='text' maxlength={254} placeholder='邮箱地址' disabled={busy} onInput={event => setEmail(event.detail.value)} aria-label='原账号邮箱'/></View>
        <View className='native-account-field'><Text className='native-account-field-label'>原账号密码</Text><Input value={password} password maxlength={128} placeholder='当前密码' disabled={busy} onInput={event => setPassword(event.detail.value)} aria-label='原账号密码' onConfirm={() => run(() => nativeAccount.bind(email, password))}/></View>
        <Button className='native-account-primary' disabled={busy || !!wait || !email.trim() || !password} onClick={() => run(() => nativeAccount.bind(email, password))}>{wait ? '请等待 ' + wait + ' 秒' : busy ? '正在验证…' : '验证账号并绑定当前微信'}</Button>
        <Button className='native-account-secondary' disabled={busy || !!wait} onClick={startLogin}>重新微信登录</Button>
        <Text className='native-account-detail'>忘记密码或尚未验证邮箱，可先回到 Stats 网页的账号入口处理。</Text>
      </View> : <View className='native-account-section'>
        <Text className='native-account-label'>微信登录</Text>
        <Text className='native-account-detail'>{enabled === false ? '微信登录内测尚未开启，公开赛事资料可正常浏览。' : '登录后可核对你的原账号。首次使用需要完成账号关联。'}</Text>
        <Text className='native-account-detail'>用于绑定已有赛事账号，并按原账号权限处理参赛确认、名单和比赛沟通。正式发布后的参赛昵称、BattleTag、名单与赛果会在赛事页面展示。</Text>
        <Text className='native-account-detail'>账号密码仅发送至薯条杯服务器校验，不在本机保存；不读取微信通讯录、手机号或位置。</Text>
        <CheckboxGroup onChange={event => setPrivacyAccepted(event.detail.value.includes('account-privacy'))}><Label className='native-account-detail'><Checkbox value='account-privacy' checked={privacyAccepted} disabled={busy}/>我已阅读隐私指引，同意用于账号绑定、赛事身份识别及上述参赛操作。</Label></CheckboxGroup>
        <Button className='native-account-secondary' disabled={busy} onClick={() => openNativePrivacyPolicy().catch(() => setNotice('隐私指引暂时无法打开，请稍后再试；账号绑定尚未提交。'))}>查看用户隐私保护指引</Button>
        <Button className='native-account-primary' disabled={busy || enabled !== true || !!wait || !privacyAccepted} onClick={startLogin}>{wait ? '请等待 ' + wait + ' 秒' : busy ? '正在连接微信…' : '微信绑定／登录'}</Button>
        {enabled === null ? <Button className='native-account-secondary' disabled={busy} onClick={() => run(async () => { const value = await nativeAccount.capabilities(); setEnabled(value.capabilities?.wechatLogin === true) })}>重新检测登录状态</Button> : null}
      </View>}
    <View className='native-account-foot'><Text className='native-account-footnote'>首次关联只核验原账号。密码不会保存在此设备。</Text><Text className='native-account-footnote'>账号关联可在 Stats 网页的账号设置中管理。解除微信绑定不会注销赛事账号。</Text><Text className='native-account-footnote'>隐私、更正或账号注销申请：shenkeyu5@gmail.com。</Text></View>
  </View>
}
