// Some native privacy APIs use callbacks even when the framework exposes them.
// Support both forms; a returned undefined must not count as user consent.
export function invokeNativePrivacyApi(invoke, timeoutMs = 0) {
  return new Promise((resolve, reject) => {
    let settled = false
    let timer
    const finish = (handler, value) => { if (!settled) { settled = true; clearTimeout(timer); handler(value) } }
    if (timeoutMs > 0) timer = setTimeout(() => finish(reject, new Error('隐私指引核对超时，请重新尝试。')), timeoutMs)
    try {
      const pending = invoke({ success: value => finish(resolve, value), fail: () => finish(reject, new Error('隐私指引尚未同意或暂不可用。')) })
      if (typeof pending?.then === 'function') pending.then(value => finish(resolve, value), () => finish(reject, new Error('隐私指引尚未同意或暂不可用。')))
    } catch { finish(reject, new Error('隐私指引暂不可用。')) }
  })
}

export function createNativePrivacyGuard({ getSetting, authorize }) {
  return async function authorizeAccountPrivacy() {
    if (typeof getSetting !== 'function' || typeof authorize !== 'function') throw new Error('当前微信版本不支持隐私指引核对，请更新微信后再绑定。')
    const setting = await invokeNativePrivacyApi(getSetting, 8000)
    if (setting?.needAuthorization === true) await invokeNativePrivacyApi(authorize)
    else if (setting?.needAuthorization !== false) throw new Error('暂时无法核对隐私指引，请稍后再试。')
  }
}
