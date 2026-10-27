import { useRef, useState } from 'react'
import { pickUiLocale } from '../../lib/uiText.js'
import { getActiveLocale } from '../../lib/locales.js'
import { changeAccountPassword } from '../account-security/accountSecurityApi.js'
import { accountSettingsError, validateAccountPassword } from '../account-security/accountFoundationSettings.js'
import PasswordRequirements from './PasswordRequirements.jsx'
import { isAccountEntryPath, requestSignIn } from './signInRequest.js'
import styles from './RequiredPasswordChange.module.css'

// 票 2.71: signing in again opens the sign-in dialog on the page the visitor was on (this used to load
// /account/login). The entry pages carry their own form, so they get no dialog.
const signInHere = () => { if (!isAccountEntryPath(window.location.pathname)) requestSignIn() }

// Lives above the router so changing the URL cannot dismiss this requirement.
// The server independently restricts this signed session to password/logout.
export default function RequiredPasswordChange({ user, logout, clearSession }) {
  const locale = getActiveLocale()
  const t = (zh, en, ko, tw) => pickUiLocale(locale, zh, en, ko, tw)
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmation: '' })
  const [busy, setBusy] = useState(false), [done, setDone] = useState(false), [error, setError] = useState('')
  const [visible, setVisible] = useState(false)
  const lock = useRef(false)
  const login = () => { signInHere(); clearSession() }
  async function submit(event) {
    event.preventDefault()
    if (lock.current) return
    const issue = validateAccountPassword(form, locale)
    if (issue) { setError(issue); return }
    lock.current = true; setBusy(true); setError('')
    try {
      const result = await changeAccountPassword(form.currentPassword, form.newPassword)
      if (result?.changed !== true || result?.allSessionsRevoked !== true) throw new Error('改密结果尚未确认，请重新登录核对。')
      setForm({ currentPassword: '', newPassword: '', confirmation: '' }); setDone(true)
    } catch (failure) { setError(accountSettingsError(failure, locale)) }
    finally { lock.current = false; setBusy(false) }
  }
  async function signOut() {
    if (lock.current) return
    lock.current = true; setBusy(true); setError('')
    try { await logout(); signInHere() }
    catch (failure) { setError(accountSettingsError(failure, locale)); lock.current = false; setBusy(false) }
  }
  return <main className={styles.page} lang={locale} data-i18n-ignore>
    <header>FRIES CUP <span>{t('账号安全', 'Account security', '계정 보안', '帳號安全')}</span></header>
    <section className={styles.panel} aria-labelledby="required-password-title" aria-busy={busy}>
      <h1 id="required-password-title">{done ? t('密码已更新', 'Password updated', '비밀번호 변경 완료', '密碼已更新') : t('请先更新密码', 'Update your password to continue', '먼저 비밀번호를 변경하세요', '請先更新密碼')}</h1>
      <p className={styles.identity}>{user.email}</p>
      <p>{done ? t('旧登录会话已退出，请使用新密码重新登录。', 'Previous sessions have ended. Sign in with your new password.', '이전 로그인 세션이 종료되었습니다. 새 비밀번호로 로그인하세요.', '舊登入工作階段已退出，請使用新密碼重新登入。') : t('你的旧密码包含当前不再支持的字符。完成修改后，才能继续使用账号功能。', 'Your previous password contains characters that are no longer supported. Update it before using your account.', '기존 비밀번호에 더 이상 지원되지 않는 문자가 있습니다. 계정 기능을 사용하려면 먼저 변경하세요.', '你的舊密碼包含目前不再支援的字元。完成修改後，才能繼續使用帳號功能。')}</p>
      {done ? <button className={styles.primary} onClick={login}>{t('重新登录', 'Sign in again', '다시 로그인', '重新登入')} →</button> : user.role === 'GUEST' ? <p>{t('共享游客账号请联系管理员重置密码。', 'Ask an administrator to reset this shared guest password.', '공유 게스트 계정의 비밀번호는 관리자에게 재설정을 요청하세요.', '共用訪客帳號請聯絡管理員重設密碼。')}</p> : <form onSubmit={submit}>
        <input type="text" autoComplete="username" value={user.email} readOnly hidden />
        {[
          ['currentPassword', t('当前密码', 'Current password', '현재 비밀번호', '目前密碼'), 'current-password'],
          ['newPassword', t('新密码', 'New password', '새 비밀번호', '新密碼'), 'new-password'],
          ['confirmation', t('再次输入新密码', 'Confirm new password', '새 비밀번호 확인', '再次輸入新密碼'), 'new-password']
        ].map(([key, label, autocomplete]) => <label key={key}>{label}<input required type={visible ? 'text' : 'password'} autoComplete={autocomplete} minLength={key === 'currentPassword' ? 1 : 8} value={form[key]} disabled={busy} onChange={event => setForm(current => ({ ...current, [key]: event.target.value }))} aria-describedby={key === 'currentPassword' ? undefined : 'required-password-hint'} /></label>)}
        <button className={styles.reveal} type="button" aria-pressed={visible} onClick={() => setVisible(!visible)}>{visible ? t('隐藏密码', 'Hide passwords', '비밀번호 숨기기', '隱藏密碼') : t('显示密码', 'Show passwords', '비밀번호 표시', '顯示密碼')}</button>
        <PasswordRequirements id="required-password-hint" locale={locale} />
        {error && <p className={styles.error} role="alert">{error}</p>}
        <button className={styles.primary} disabled={busy}>{busy ? t('正在更新…', 'Updating…', '변경 중…', '正在更新…') : t('更新密码并重新登录', 'Update password and sign in again', '비밀번호 변경 후 다시 로그인', '更新密碼並重新登入')} →</button>
      </form>}
      {!done && <button className={styles.exit} disabled={busy} onClick={signOut}>{t('退出，使用其他账号', 'Sign out and use another account', '로그아웃하고 다른 계정 사용', '登出，使用其他帳號')}</button>}
    </section>
  </main>
}
