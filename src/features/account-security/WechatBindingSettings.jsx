import { useEffect, useRef, useState } from 'react'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { useAuth } from '../auth/AuthProvider.jsx'
import { pickUiLocale } from '../../lib/uiText.js'
import { fetchWechatBinding, unlinkWechatAccount } from './accountSecurityApi.js'
import styles from '../../pages/account/AccountSettingsPage.module.css'

export const wechatSettingsLabel = locale => pickUiLocale(locale, '微信关联', 'WeChat', '위챗 연결', '微信關聯')

export default function WechatBindingSettings({ Section: SectionComponent, onDirtyChange }) {
  const Section = SectionComponent
  const locale = useUiLocale(), t = (zh, en, ko, tw) => pickUiLocale(locale, zh, en, ko, tw)
  const { clearRevokedSession } = useAuth()
  const [binding, setBinding] = useState(null), [attempt, setAttempt] = useState(0)
  const [password, setPassword] = useState(''), [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false), [notice, setNotice] = useState('')
  const mounted = useRef(false), lock = useRef(false)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  useEffect(() => { onDirtyChange(Boolean(password)); return () => onDirtyChange(false) }, [password, onDirtyChange])
  useEffect(() => {
    const controller = new AbortController()
    setBinding(null)
    fetchWechatBinding({ signal: controller.signal }).then(value => { if (!controller.signal.aborted) setBinding(value) }).catch(error => {
      if (controller.signal.aborted) return
      if (error.status === 401) clearRevokedSession()
      setNotice(t('关联状态暂时无法读取，请重新核对。', 'Unable to read the link. Check again.', '연결 상태를 읽을 수 없습니다. 다시 확인하세요.', '關聯狀態暫時無法讀取，請重新核對。'))
    })
    return () => controller.abort()
  // Copy is selected again when the panel remounts after a language change.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt, clearRevokedSession])
  async function unlink(event) {
    event.preventDefault()
    if (lock.current) return
    lock.current = true
    setBusy(true)
    setNotice('')
    let completed = false
    try {
      await unlinkWechatAccount(password)
      completed = true
    } catch (error) {
      if (mounted.current) setNotice(error.status === 401
        ? t('密码不正确，请核对后重试。', 'Incorrect password. Check and try again.', '비밀번호를 확인하고 다시 시도하세요.', '密碼不正確，請核對後重試。')
        : t('提交结果尚未确认，请重新读取关联状态后再操作。', 'The result is unconfirmed. Reload the link status before trying again.', '처리 결과가 확인되지 않았습니다. 연결 상태를 새로 확인하세요.', '提交結果尚未確認，請重新讀取關聯狀態後再操作。'))
    }
    try {
      const current = await fetchWechatBinding()
      if (!mounted.current) return
      setBinding(current)
      if (!current.linked) {
        setConfirming(false)
        setNotice(t('微信已解绑，小程序中的原登录已失效。', 'WeChat is unlinked. Its mini program sessions have ended.', '위챗 연결이 해제되어 미니 프로그램 로그인이 종료되었습니다.', '微信已解綁，小程式中的原登入已失效。'))
      }
    } catch (error) {
      if (error.status === 401) clearRevokedSession()
      if (mounted.current) {
        setBinding(null)
        if (completed) setNotice(t('解绑请求已完成，当前状态暂未同步，请重新读取核对。', 'The unlink request completed. Reload to verify the current status.', '연결 해제 요청이 완료되었습니다. 현재 상태를 다시 확인하세요.', '解綁請求已完成，目前狀態暫未同步，請重新讀取核對。'))
      }
    } finally {
      lock.current = false
      if (mounted.current) { setBusy(false); setPassword('') }
    }
  }
  return <Section id='wechat' title={wechatSettingsLabel(locale)} description={t('在小程序中验证原账号即可关联微信。此处管理已有关联。', 'Verify your existing account in the mini program to link WeChat. Manage that link here.', '미니 프로그램에서 기존 계정을 인증해 위챗을 연결하고 여기서 관리하세요.', '在小程式中驗證原帳號即可關聯微信。此處管理已有關聯。')}>
    {notice ? <p className={styles.notice} role='status'>{notice}</p> : null}
    {!binding ? <><p role='status'>{t('关联状态待确认', 'Link status unconfirmed', '연결 상태 확인 필요', '關聯狀態待確認')}</p><button type='button' className={styles.secondary} disabled={busy} onClick={() => setAttempt(value => value + 1)}>{t('重新读取', 'Reload', '새로 읽기', '重新讀取')}</button></>
      : <><p className={styles.hint}>{binding.linked ? t('已关联微信，可在小程序中直接登录。', 'WeChat is linked. You can sign in directly in the mini program.', '위챗이 연결되어 미니 프로그램에서 바로 로그인할 수 있습니다.', '已關聯微信，可在小程式中直接登入。')
        : t('尚未关联微信。请在薯条杯小程序的“我的账号”中完成首次验证。', 'WeChat is not linked. Complete the first verification in My Account in the Fries Cup mini program.', '위챗이 연결되지 않았습니다. 프라이즈 컵 미니 프로그램의 내 계정에서 첫 인증을 완료하세요.', '尚未關聯微信。請在薯條杯小程式的「我的帳號」中完成首次驗證。')}</p>
        {binding.linked && !confirming ? <button type='button' className={styles.secondary} onClick={() => setConfirming(true)}>{t('解绑微信', 'Unlink WeChat', '위챗 연결 해제', '解綁微信')}</button> : null}
        {binding.linked && confirming ? <form onSubmit={unlink}>
          <p className={styles.hint}>{t('解绑会结束此微信的小程序登录。原账号、队伍和参赛记录将保留。', 'Unlinking ends this WeChat account’s mini program sessions. Your account, teams and match records remain.', '연결 해제 시 이 위챗의 미니 프로그램 로그인이 종료됩니다. 계정, 팀, 참가 기록은 유지됩니다.', '解綁會結束此微信的小程式登入。原帳號、隊伍和參賽記錄將保留。')}</p>
          <fieldset className={styles.fields} disabled={busy}><label>{t('当前账号密码', 'Current account password', '현재 계정 비밀번호', '目前帳號密碼')}<input type='password' autoComplete='current-password' required maxLength={128} value={password} onChange={event => setPassword(event.target.value)}/></label></fieldset>
          <div className={styles.actions}><button className={styles.primary} disabled={busy || !password}>{busy ? t('正在核对…', 'Checking…', '확인 중…', '正在核對…') : t('验证并解绑', 'Verify and unlink', '인증 후 연결 해제', '驗證並解綁')}</button><button type='button' className={styles.secondary} disabled={busy} onClick={() => { setConfirming(false); setPassword('') }}>{t('取消', 'Cancel', '취소', '取消')}</button></div>
        </form> : null}
      </>}
  </Section>
}
