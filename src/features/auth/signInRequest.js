// 票 2.71: one way to sign in. Pages ask for the sign-in dialog instead of sending people to
// /account/login, so they stay on the page they started from. A request made while no account
// control is mounted yet (the forced password change replaces the whole router) waits here until
// the next control mounts.
let pending = false

export function requestSignIn() {
  pending = true
  window.dispatchEvent(new Event('fries-cup:open-account'))
}

export function takePendingSignIn() {
  const value = pending
  pending = false
  return value
}

// /account/login and the other entry pages are the fallback: they carry their own form and email
// tokens, so they never mount a second dialog.
export function isAccountEntryPath(pathname = '') {
  return /^\/account\/(?:register|login|verify-email|recover|reset-password)\/?$/.test(pathname)
}
