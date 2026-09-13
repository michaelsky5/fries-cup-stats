export const ACCOUNT_SIGN_OUT_EVENT = 'fries-cup:before-sign-out'
export const UNSAVED_ACCOUNT_MESSAGE = '当前页面还有未保存的修改，请先保存或撤销后再退出账号。'

// Only user-initiated sign-out checks drafts. Session expiry always takes effect.
export function canSignOutOfAccount() {
  return window.dispatchEvent(new Event(ACCOUNT_SIGN_OUT_EVENT, { cancelable: true }))
}
