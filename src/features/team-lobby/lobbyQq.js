export const contactPurpose = (purpose, say) => ({ FORMING: say('一起组队'), RECRUITING: say('帮队伍找人'), JOINING: say('了解队伍招募') })[purpose] || say('一起组队')
// This field is returned only by the API that also implements card QQ access.
// Unknown or missing values keep the existing mutual-contact flow during rollout.
export const supportsCardQqAccess = card => ['REQUEST', 'VERIFIED'].includes(card?.qqMode)
export const qqContactStatus = (row, say) => row.status === 'CONNECTED' ? say(row.firstViewedAt ? 'QQ 已查看' : 'QQ 已授权') : row.status === 'PENDING' ? say('等待对方同意') : null
export function qqChatUrl(qq, mobile = false) {
  if (!/^[1-9][0-9]{4,11}$/.test(qq)) return null
  return mobile ? `mqqwpa://im/chat?chat_type=wpa&uin=${qq}&version=1&src_type=web` : `tencent://message/?uin=${qq}&Site=FriesCup&Menu=yes`
}
