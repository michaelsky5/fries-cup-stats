import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { partnerActivationTarget } from '../../features/auth/partnerActivationTarget.js'

const copy = {
  'zh-CN': ['正在前往合作方账号激活页面…', '继续激活', '激活入口暂不可用，请联系赛事管理员。'],
  'en-US': ['Opening partner account activation…', 'Continue activation', 'Activation is unavailable. Please contact the event administrator.'],
  'zh-TW': ['正在前往合作方帳號啟用頁面…', '繼續啟用', '啟用入口暫不可用，請聯絡賽事管理員。'],
  'ko-KR': ['파트너 계정 활성화 페이지를 여는 중…', '활성화 계속', '활성화 페이지를 열 수 없습니다. 대회 관리자에게 문의하세요.']
}

export default function PartnerActivationRedirect() {
  const location = useLocation()
  const locale = useUiLocale()
  const text = copy[locale] || copy['zh-CN']
  const target = partnerActivationTarget(location)
  useEffect(() => {
    if (target) {
      window.history.replaceState(window.history.state, '', window.location.pathname)
      window.location.replace(target)
    }
  }, [target])
  return <main lang={locale} data-i18n-ignore><p role={target ? 'status' : 'alert'}>{target ? text[0] : text[2]}</p>
    {target && <a href={target} referrerPolicy="no-referrer">{text[1]}</a>}
  </main>
}
