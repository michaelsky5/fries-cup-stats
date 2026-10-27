import { useCallback, useEffect, useRef, useState } from 'react'
import { pickUiLocale } from '../../lib/uiText.js'
import { cancelWechatQrTicket, createWechatQrTicket, readWechatQrTicket } from './wechatQrLogin.js'
import styles from './AuthDialog.module.css'

const MAX_POLL_FAILURES = 5

function formatRemaining(ms) {
  const seconds = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

// 小程序扫码登录面板：建票 → 展示小程序码 → 轮询 → 确认后由 onConfirmed 同步会话并关闭对话框。
export default function WechatQrLogin({ locale, onConfirmed, onUseEmail }) {
  const t = (zh, en, ko, tw) => pickUiLocale(locale, zh, en, ko, tw)
  const [ticket, setTicket] = useState(null)
  const [phase, setPhase] = useState('creating')
  const [unstable, setUnstable] = useState(false)
  const [imageFailed, setImageFailed] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const [attempt, setAttempt] = useState(0)
  const confirmedRef = useRef(false)
  const onConfirmedRef = useRef(onConfirmed)
  useEffect(() => { onConfirmedRef.current = onConfirmed }, [onConfirmed])

  const refresh = useCallback(() => setAttempt(value => value + 1), [])

  useEffect(() => {
    let cancelled = false
    let timer = 0
    let created = null
    let failures = 0
    setTicket(null); setPhase('creating'); setUnstable(false); setImageFailed(false)

    const poll = async () => {
      if (cancelled || !created) return
      if (Date.now() >= created.expiresAt) { setPhase('expired'); return }
      try {
        const { status } = await readWechatQrTicket(created.ticketId)
        if (cancelled) return
        failures = 0; setUnstable(false)
        if (status === 'CONFIRMED') {
          confirmedRef.current = true
          setPhase('confirmed')
          try { await onConfirmedRef.current?.() } catch { if (!cancelled) setPhase('sessionError') }
          return
        }
        if (status === 'DENIED' || status === 'EXPIRED') { setPhase(status.toLowerCase()); return }
        setPhase(status === 'SCANNED' ? 'scanned' : status === 'BINDING' ? 'binding' : 'ready')
      } catch {
        if (cancelled) return
        failures += 1
        setUnstable(true)
        if (failures >= MAX_POLL_FAILURES) { setPhase('error'); return }
      }
      timer = window.setTimeout(poll, created.pollAfterMs * (failures ? Math.min(2 ** failures, 8) : 1))
    }

    createWechatQrTicket().then(value => {
      if (cancelled) { cancelWechatQrTicket(value.ticketId); return }
      created = value
      setNow(Date.now())
      setTicket(value)
      setPhase('ready')
      timer = window.setTimeout(poll, value.pollAfterMs)
    }).catch(() => { if (!cancelled) setPhase('error') })

    return () => {
      cancelled = true
      window.clearTimeout(timer)
      if (created && !confirmedRef.current) cancelWechatQrTicket(created.ticketId)
    }
  }, [attempt])

  useEffect(() => {
    if (!ticket || !['ready', 'scanned', 'binding'].includes(phase)) return undefined
    const interval = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(interval)
  }, [ticket, phase])

  const remaining = ticket ? ticket.expiresAt - now : 0
  const live = ['ready', 'scanned', 'binding'].includes(phase) && remaining > 0
  const expired = phase === 'expired' || (ticket && ['ready', 'scanned', 'binding'].includes(phase) && remaining <= 0)
  const status = phase === 'creating' ? t('正在生成二维码…', 'Creating the code…', 'QR 코드를 만드는 중…', '正在產生二維碼…')
    : expired ? t('二维码已过期。', 'This code has expired.', 'QR 코드가 만료되었습니다.', '二維碼已過期。')
      : phase === 'scanned' ? t('已扫码，请在手机上点「确认登录」。', 'Scanned. Tap “Confirm sign-in” on your phone.', '스캔했습니다. 휴대폰에서 ‘로그인 확인’을 누르세요.', '已掃碼，請在手機上點「確認登入」。')
        : phase === 'binding' ? t('请先在小程序里关联你的薯条杯账号，再确认登录。', 'Link your Fries Cup account in the mini program, then confirm.', '미니 프로그램에서 프라이즈 컵 계정을 먼저 연결한 뒤 확인하세요.', '請先在小程式中關聯你的薯條杯帳號，再確認登入。')
          : phase === 'confirmed' ? t('已确认，正在登录…', 'Confirmed. Signing you in…', '확인되었습니다. 로그인 중…', '已確認，正在登入…')
            : phase === 'denied' ? t('已在手机上取消登录。', 'Sign-in was cancelled on the phone.', '휴대폰에서 로그인을 취소했습니다.', '已在手機上取消登入。')
              : phase === 'sessionError' ? t('手机上已确认，但网页还没拿到登录状态。请刷新页面后核对。', 'Confirmed on the phone, but this page has not received the session yet. Reload to check.', '휴대폰에서 확인했지만 이 페이지에 아직 로그인 상태가 없습니다. 새로고침해 확인하세요.', '手機上已確認，但網頁還沒拿到登入狀態。請重新整理頁面後核對。')
                : phase === 'error' ? t('暂时无法生成或读取二维码，请稍后重试。', 'The code is unavailable right now. Try again shortly.', '지금은 QR 코드를 사용할 수 없습니다. 잠시 후 다시 시도하세요.', '暫時無法產生或讀取二維碼，請稍後重試。')
                  : t('用微信扫一扫，在小程序里确认登录。', 'Scan with WeChat, then confirm in the mini program.', '위챗으로 스캔한 뒤 미니 프로그램에서 로그인을 확인하세요.', '用微信掃一掃，在小程式中確認登入。')
  const tone = phase === 'scanned' || phase === 'binding' || phase === 'confirmed' ? 'progress' : expired || ['denied', 'error', 'sessionError'].includes(phase) ? 'stopped' : 'waiting'

  return <div className={styles.wechatPanel} data-wechat-qr={phase}>
    <div className={styles.wechatCodeFrame} data-dimmed={!live || undefined}>
      {ticket && !imageFailed ? <img className={styles.wechatCode} src={ticket.codeUrl} width="200" height="200" alt={t('薯条杯小程序登录码', 'Fries Cup mini program sign-in code', '프라이즈 컵 미니 프로그램 로그인 코드', '薯條杯小程式登入碼')} onError={() => setImageFailed(true)} /> : <span className={styles.wechatCodePlaceholder} aria-hidden="true" />}
      {(expired || phase === 'denied' || phase === 'error' || imageFailed) ? <button type="button" className={styles.wechatRefresh} onClick={refresh}>{t('刷新二维码', 'Refresh code', 'QR 코드 새로고침', '重新整理二維碼')}</button> : null}
    </div>
    <p className={styles.wechatStatus} data-tone={tone} role="status" aria-live="polite">{status}{unstable && live ? <small>{t('网络不稳定，正在重试…', 'Connection unstable, retrying…', '연결이 불안정해 다시 시도하는 중…', '網路不穩定，正在重試…')}</small> : null}</p>
    {live ? <p className={styles.wechatMeta}>{t('有效期还剩', 'Expires in', '남은 시간', '有效期還剩')} <time>{formatRemaining(remaining)}</time></p> : null}
    {ticket?.appLink && live ? <a className={styles.wechatAppLink} href={ticket.appLink}>{t('在微信中打开小程序', 'Open the mini program in WeChat', '위챗에서 미니 프로그램 열기', '在微信中開啟小程式')}</a> : null}
    <p className={styles.wechatPhoneHint}>{t('在手机上浏览？请用另一台设备的微信扫码。', 'On a phone? Scan with WeChat on another device.', '휴대폰에서 보고 있다면 다른 기기의 위챗으로 스캔하세요.', '在手機上瀏覽？請用另一台裝置的微信掃碼。')}</p>
    <button type="button" className={styles.formSwitch} onClick={onUseEmail} disabled={phase === 'confirmed'}>← {t('用邮箱登录', 'Use email instead', '이메일로 로그인', '用電子郵件登入')}</button>
  </div>
}
