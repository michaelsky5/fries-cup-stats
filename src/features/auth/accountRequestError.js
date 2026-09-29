export function accountRequestError(error, subject = '此项内容') {
  if (error?.status === 401) return '登录已失效，请重新登录后重试。'
  if (error?.status === 403) return `当前账号没有查看${subject}的权限。`
  if (error?.status === 404) return `${subject}服务暂时不可用，请稍后重试。`
  if (error?.status === 429) return '请求较多，请稍后重试。'
  if (error?.name === 'TimeoutError' || error?.name === 'AbortError') return `${subject}同步超时，请检查网络后重试。`
  return `${subject}暂时无法同步，请重试。`
}
