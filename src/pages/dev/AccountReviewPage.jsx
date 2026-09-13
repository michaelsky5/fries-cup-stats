import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AuthDialog } from '../../features/auth/AuthDialog.jsx'
import { ACCOUNT_SIGN_OUT_EVENT } from '../../features/account-ui/accountNavigationGuard.js'
import { ACCOUNT_REVIEW_GROUPS, ACCOUNT_REVIEW_PAGES, accountReviewOpenHref } from './accountReviewCatalog.js'
import styles from './AccountReviewPage.module.css'
import authStyles from '../../features/auth/AuthDialog.module.css'
import PasswordRecoveryPanel from '../../features/auth/PasswordRecoveryPanel.jsx'
import { passwordRecoveryFailure, passwordRecoveryTitle, readPasswordResetLocation } from '../../features/auth/passwordRecoveryModel.js'

function LoginSurface({ surface }) {
  const [params] = useSearchParams()
  const locale = params.get('lang') === 'en' ? 'en-US' : 'zh-CN'
  const [open, setOpen] = useState(true)
  const [resetLink] = useState(() => readPasswordResetLocation(window.location))
  const close = useCallback(() => setOpen(false), [])
  return <main className={styles.loginSurface} data-design="signal"><span>FRIES CUP · ACCOUNT</span><h1>{locale === 'en-US' ? 'Welcome back' : '欢迎回到薯条杯'}</h1><p>{locale === 'en-US' ? 'Current sign-in and password recovery components.' : '登录弹窗与找回密码使用当前页面组件。'}</p><button onClick={() => setOpen(true)}>{locale === 'en-US' ? 'Open account dialog' : '打开账号弹窗'}</button><AuthDialog open={open} onClose={close} initialMode={surface === 'forgot' ? 'forgot' : 'login'} resetLink={resetLink} locale={locale} /></main>
}

// Review the same result component without issuing or consuming credentials.
function RecoveryResultSurface({ surface }) {
  const [params, setParams] = useSearchParams()
  const locale = params.get('lang') === 'en' ? 'en-US' : 'zh-CN'
  const go = next => setParams(current => { const result = new URLSearchParams(current); result.set('surface', next); return result })
  const recovery = {
    stage: surface === 'recovery-complete' ? 'complete' : 'invalid',
    error: surface === 'recovery-expired' ? passwordRecoveryFailure({ data: { error: 'PASSWORD_RESET_TOKEN_EXPIRED' } }, locale) : null,
    busy: false, sessionSyncFailed: false, beginRequest: () => go('forgot')
  }
  return <main className={authStyles.backdrop} data-design="signal"><section className={authStyles.dialog} aria-label={locale === 'en-US' ? 'Recovery result preview' : '密码找回结果样例'}><header className={authStyles.dialogHeader}><div className={authStyles.dialogHeading}><span>FRIES CUP / ACCOUNT</span><h1 className={authStyles.dialogTitle}>{passwordRecoveryTitle(recovery.stage, locale, recovery.error)}</h1></div></header><div className={authStyles.dialogBody}><PasswordRecoveryPanel recovery={recovery} locale={locale} deliveryEnabled onLogin={() => go('login')} /></div><footer className={authStyles.dialogRail}>{locale === 'en-US' ? 'Result component preview · No password has been changed.' : '结果组件样例 · 本页没有执行密码修改。'}</footer></section></main>
}

function ReviewWorkspace() {
  const [params, setParams] = useSearchParams()
  const page = ACCOUNT_REVIEW_PAGES.find(item => item.id === params.get('page')) || ACCOUNT_REVIEW_PAGES.find(item => item.id === 'overview')
  const device = ['desktop', 'narrow', 'phone'].includes(params.get('device')) ? params.get('device') : 'desktop'
  const [service, setService] = useState('loading')
  const [reload, setReload] = useState(0)
  const [session] = useState(() => crypto.randomUUID())
  const [pending, setPending] = useState(null)
  const frame = useRef(null)
  const dialog = useRef(null)
  const [frameLoading, setFrameLoading] = useState(true)
  const frameHref = accountReviewOpenHref(page.id, `${session}-${page.id}-${reload}`)
  useEffect(() => { document.title = '账号页面总览 · 薯条杯设计审阅' }, [])
  useEffect(() => {
    const controller = new AbortController()
    fetch('/__account-review/status', { signal: controller.signal }).then(async response => {
      const result = response.ok && response.headers.get('content-type')?.includes('application/json') ? await response.json() : null
      if (!controller.signal.aborted) setService(result?.contract === 'ACCOUNT_DESIGN_REVIEW_V1' ? 'ready' : 'missing')
    }).catch(() => { if (!controller.signal.aborted) setService('missing') })
    return () => controller.abort()
  }, [])
  useEffect(() => { if (pending) dialog.current?.showModal() }, [pending])
  function navigateTo(next) {
    if (next.page && next.page !== page.id) setFrameLoading(true)
    setParams(current => { const result = new URLSearchParams(current); for (const [key, value] of Object.entries(next)) result.set(key, value); return result })
  }
  function requestChange(next) {
    // The iframe hosts the actual forms and their navigation guards.
    const child = frame.current?.contentWindow
    const protection = child ? new child.Event(ACCOUNT_SIGN_OUT_EVENT, { cancelable: true }) : null
    if (child && protection && !child.dispatchEvent(protection)) { setPending(next); return }
    if (next.reset) { setFrameLoading(true); setReload(value => value + 1) } else navigateTo(next)
  }
  const index = ACCOUNT_REVIEW_PAGES.findIndex(item => item.id === page.id)
  return <main className={styles.page} data-design="signal" data-i18n-ignore>
    <header className={styles.header}><div><span>FRIES CUP / DESIGN REVIEW</span><h1>账号与参赛 · 页面总览</h1><p>直接选择页面与状态。每次切换载入独立样例，无需反复登录。</p></div><div className={styles.count}><strong>{ACCOUNT_REVIEW_PAGES.length.toString().padStart(2, '0')}</strong><span>页面与关键状态<br />{ACCOUNT_REVIEW_GROUPS.length} 组完整入口</span></div></header>
    <div className={styles.layout}>
      <nav className={styles.catalog} aria-label="全部账号页面"><div className={styles.catalogHeading}>页面索引 <span>按参赛路线浏览</span></div>{ACCOUNT_REVIEW_GROUPS.map((group, groupIndex) => <section key={group.id}><h2><span>0{groupIndex + 1}</span>{group.label}</h2>{group.items.map(item => <button key={item.id} aria-current={page.id === item.id ? 'page' : undefined} onClick={() => requestChange({ page: item.id })}><span>{item.label}</span><small>{item.role}</small><b aria-hidden="true">↗</b></button>)}</section>)}</nav>
      <section className={styles.stage} aria-label="所选页面预览">
        <header className={styles.stageHeader}><div><span>{page.group} / {page.role}</span><h2>{page.label}</h2><p>{page.description}</p></div><a href={accountReviewOpenHref(page.id, crypto.randomUUID())}>独立打开 ↗</a></header>
        <div className={styles.controls}><div role="group" aria-label="预览宽度">{[['desktop', '自适应桌面'], ['narrow', '980px'], ['phone', '390px 手机']].map(([id, label]) => <button key={id} aria-pressed={device === id} onClick={() => navigateTo({ device: id })}>{label}</button>)}</div><button onClick={() => requestChange({ reset: true })}>重置当前样例 ↻</button></div>
        <p className={styles.scope}>本机设计样例 · 操作仅保存在当前预览，不发送邮件或修改正式赛事。{page.note ? ` ${page.note}` : ''}</p>
        {service === 'ready' ? <div className={styles.frameStage} data-device={device}>{frameLoading && <span className={styles.loading} role="status">正在打开{page.label}…</span>}<iframe ref={frame} key={`${page.id}:${reload}`} src={frameHref} title={`${page.label} · 当前实现`} onLoad={() => setFrameLoading(false)} /></div>
          : <div className={styles.unavailable} role="status"><h3>{service === 'loading' ? '正在连接页面样例…' : '页面总览需要专用本机预览服务'}</h3><p>全部入口已经列在左侧。请在项目目录运行下面的命令，再打开输出的地址。</p><code>node scripts/previewAccountReview.mjs</code><p>专用预览使用独立样例，不会切换你在真实联调环境中的账号。</p></div>}
        <nav className={styles.sequence} aria-label="依次审阅页面"><button disabled={index === 0} onClick={() => requestChange({ page: ACCOUNT_REVIEW_PAGES[index - 1].id })}>← 上一个</button><span>{index + 1} / {ACCOUNT_REVIEW_PAGES.length}</span><button disabled={index === ACCOUNT_REVIEW_PAGES.length - 1} onClick={() => requestChange({ page: ACCOUNT_REVIEW_PAGES[index + 1].id })}>下一个 →</button></nav>
      </section>
    </div>
    {pending && <dialog ref={dialog} className={styles.confirm} aria-labelledby="review-draft-heading" onCancel={() => setPending(null)}><h2 id="review-draft-heading">当前样例还有未保存内容</h2><p>切换或重置会丢弃这次填写。可以继续编辑，也可以载入新的页面样例。</p><div><button autoFocus onClick={() => setPending(null)}>继续编辑</button><button onClick={() => { if (pending.reset) { setFrameLoading(true); setReload(value => value + 1) } else navigateTo(pending); setPending(null) }}>放弃并继续</button></div></dialog>}
  </main>
}

export default function AccountReviewPage() {
  const [params] = useSearchParams()
  const surface = params.get('surface')
  if (['recovery-complete', 'recovery-expired'].includes(surface)) return <RecoveryResultSurface surface={surface} />
  return ['login', 'forgot', 'reset'].includes(surface) ? <LoginSurface key={surface} surface={surface} /> : <ReviewWorkspace />
}
