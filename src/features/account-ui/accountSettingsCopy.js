import { translateUiText as formatUiText } from '../../lib/uiText.js'
import { isEnglishLocale, translateLegacyText } from '../../lib/legacyI18n.js'
import { translateUiText } from '../../lib/uiText.js'
import { REGION_GROUPS } from '../auth/regionOptions.js'

// Scoped to the settings frame. User names and biographies opt out in the markup.
const copy = new Map([
  ['账号设置', 'Account settings'], ['通用账号设置', 'Across all events'],
  ['管理你的个人资料与账号安全。', 'Manage your profile and account access.'],
  ['账号概览', 'Overview'], ['个人资料', 'Profile'], ['修改密码', 'Change password'],
  ['邮箱验证', 'Email verification'], ['登录设备', 'Devices'], ['当前账号', 'Current account'],
  ['账号设置分区', 'Account settings sections'], ['个人资料、登录与验证状态，都在这里。', 'Your profile, sign-ins and verification in one place.'],
  ['登录邮箱', 'Sign-in email'], ['用户名', 'Username'], ['编辑个人资料', 'Edit profile'], ['查看个人资料', 'View profile'],
  ['账号资料用于个人展示。参赛身份、队伍与出赛名单在我的空间管理。', 'Your profile represents your account. Manage event roles, teams and lineups in My Space.'],
  ['已验证', 'Verified'], ['待验证', 'Unverified'], ['状态待确认', 'Status unknown'],
  ['登录邮箱已完成验证，可用于接收账号验证邮件。', 'Your sign-in email is verified and can receive account verification messages.'],
  ['确认登录邮箱属于你。发送邮件后，打开邮件中的验证链接即可完成。', 'Verify that this email belongs to you by opening the link in your verification email.'],
  ['查看邮箱', 'View email'], ['前往邮箱验证', 'Verify email'], ['读取中…', 'Loading…'],
  ['条有效登录', 'active sign-ins'], ['暂未同步', 'Unavailable'],
  ['正在核对当前与其他设备的登录记录。', 'Checking sign-ins on this and other devices.'],
  ['当前登录：', 'This sign-in: '], ['。可以在设备列表退出不再使用的登录。', '. End unused sign-ins in the device list.'],
  ['当前登录的设备信息暂未识别，可到设备列表核对。', 'This device has not been identified. Check the device list for available records.'],
  ['管理登录设备', 'Manage devices'], ['重新读取', 'Retry'], ['登录密码', 'Password'],
  ['修改后所有设备均需重新登录。', 'All devices must sign in again after a change.'],
  ['继续参赛事务', 'Continue your competition'], ['查看本周准备、比赛与队伍安排', 'Weekly preparation, matches and team arrangements'],
  ['我的空间', 'My Space'], ['返回我的空间 ↗', 'Back to My Space ↗'],
  ['报名、队伍和比赛事务', 'Registration, teams and matches'], ['可以在我的空间处理。', 'are managed in My Space.'],
  ['设置账号的显示名称和介绍。赛事档案与队伍名单按参赛流程维护。', 'Edit your account name and bio. Event profiles and team rosters are managed separately.'],
  ['正在读取个人资料…', 'Loading your profile…'], ['重新读取资料', 'Reload profile'],
  ['当前账号的个人资料为只读。', 'This account has a read-only profile.'],
  ['显示名称', 'Display name'], ['账号入口与站内交流时显示的名字', 'Shown in your account menu and site conversations'],
  ['个人昵称', 'Nickname'], ['选填', 'Optional'], ['补充个人称呼，不会修改游戏 ID', 'An optional nickname; your game ID stays the same'],
  ['国家／地区', 'Country / region'], ['未设置', 'Not set'], ['个人介绍', 'Bio'],
  ['个人资料预览', 'Profile preview'], ['展示预览', 'Profile preview'], ['尚未保存', 'Unsaved'],
  ['已保存的资料', 'Saved profile'], ['这里只预览账号资料；赛事档案与出赛名单不会随之修改。', 'This previews your account profile. Event profiles and lineups remain separate.'],
  ['有尚未保存的修改', 'You have unsaved changes'], ['只读资料', 'Read-only profile'],
  ['资料已同步，可继续编辑', 'Profile is up to date'], ['正在保存…', 'Saving…'],
  ['保存资料', 'Save profile'], ['撤销修改', 'Discard changes'], ['个人资料已保存。', 'Your profile has been saved.'],
  ['资料已保存，账号显示信息暂未刷新；稍后重新读取即可。', 'Profile saved. The account display has not refreshed yet; reload it later.'],
  ['更新密码后，包含当前设备在内的所有登录设备都会退出。', 'Changing your password signs out every device, including this one.'],
  ['共享游客账号不能自行修改密码。', 'Shared guest accounts cannot change their password.'],
  ['当前密码', 'Current password'], ['新密码', 'New password'], ['确认新密码', 'Confirm new password'],
  ['显示', 'Show'], ['隐藏', 'Hide'],
  ['新密码至少 8 位，不超过 72 个 UTF-8 字节；中文字符会占用多个字节。', 'Use at least 8 characters, up to 72 UTF-8 bytes. Some characters use more than one byte.'],
  ['更新后需要重新登录', 'You will need to sign in again'],
  ['当前设备和其他设备都会退出。请确认你能使用新密码重新登录。', 'Every device will be signed out. Make sure you can sign in with your new password.'],
  ['仅提交后才会更新密码', 'Your password changes only after submission'],
  ['更新密码并退出登录', 'Update password and sign out'], ['正在更新…', 'Updating…'],
  ['受邀邮箱用于登录和接收账号验证邮件。', 'Use your invited email to sign in and receive account verification messages.'],
  ['当前登录邮箱', 'Your sign-in email'], ['邮箱验证已完成', 'Email verification complete'],
  ['这表示登录邮箱已验证；队伍与参赛身份仍按邀请认领流程关联。', 'Your email is verified. Teams and event roles are still linked through invitations.'],
  ['发送验证邮件', 'Send verification email'], ['邮件会发送到上方的登录邮箱。', 'We will send it to the sign-in email shown above.'],
  ['打开邮件中的链接', 'Open the link in your email'], ['未收到时，请检查垃圾邮件或稍后重试。', 'Check spam or try again later if it does not arrive.'],
  ['回到这里核对状态', 'Check your status here'], ['完成后点击“刷新验证状态”。', 'Select “Refresh status” once you finish.'],
  ['刷新验证状态', 'Refresh status'], ['正在刷新…', 'Refreshing…'], ['正在处理…', 'Working…'],
  ['邮箱已验证。', 'Your email is verified.'],
  ['邮箱尚未完成验证。打开验证邮件中的链接后，可再次刷新。', 'Your email is not verified yet. Open the email link, then refresh again.'],
  ['验证邮件已交给投递服务，请检查收件箱和垃圾邮件，并打开验证链接。', 'The email was handed to the delivery service. Check your inbox and spam, then open the link.'],
  ['暂时无法读取邮件服务状态。', 'The email service status is unavailable.'],
  ['邮件服务暂未开放，目前无法发送验证邮件。请联系赛事负责人核对账号邮箱。', 'Verification email is currently unavailable. Contact the organizer to check your account email.'],
  ['正在读取邮件服务状态…', 'Checking the email service…'], ['重试服务状态', 'Retry service status'],
  ['查看仍然有效的登录会话，退出不再使用的设备。', 'Review active sign-ins and sign out devices you no longer use.'],
  ['正在核对登录记录', 'Checking sign-in records'], ['设备列表暂未同步', 'Device list unavailable'],
  ['每条记录对应一次登录，同一设备可能有多条记录。', 'Each record is a sign-in. A device may have more than one.'],
  ['正在读取…', 'Loading…'], ['刷新设备列表', 'Refresh devices'], ['退出当前登录', 'Sign out here'],
  ['正在读取登录设备…', 'Loading devices…'], ['暂无有效设备会话记录。可退出后重新登录以建立新的会话。', 'No active sign-in records were found. Sign out and back in to create a new session.'],
  ['当前设备', 'This device'], ['退出当前设备', 'Sign out this device'], ['退出设备', 'Sign out'],
  ['正在退出…', 'Signing out…'], ['不认识某条登录记录？可先退出该设备，再修改密码。', 'Do not recognize a sign-in? Sign it out, then change your password.'],
  ['退出其他所有设备', 'Sign out other devices'], ['退出其他所有设备？', 'Sign out other devices?'],
  ['退出当前设备？', 'Sign out this device?'], ['退出这台设备？', 'Sign out this device?'],
  ['退出后，将回到登录入口。你可以随时使用账号密码重新登录。', 'You will return to the sign-in screen. You can sign in again with your account password.'],
  ['取消', 'Cancel'], ['确认退出', 'Confirm sign-out'], ['已退出这台设备。', 'This device has been signed out.'],
  ['当前设备已退出登录。', 'You have signed out on this device.'],
  ['退出操作已完成，最新设备列表暂未同步，请刷新列表。', 'Sign-out completed, but the updated device list is unavailable. Refresh the list.'],
  ['修改尚未保存', 'Unsaved changes'], ['离开后，本页尚未提交的内容会丢失。', 'Leaving will discard unsubmitted changes on this page.'],
  ['继续编辑', 'Keep editing'], ['放弃修改并离开', 'Discard and leave'],
  ['正在核对账号…', 'Checking account…'], ['受邀账号', 'Invited account'], ['登录后管理账号', 'Sign in to manage your account'],
  ['正在核对登录状态…', 'Checking sign-in status…'], ['欢迎回到薯条杯', 'Welcome back to Fries Cup'],
  ['使用受邀邮箱登录，即可管理资料和安全设置。首次参加，请打开赛事负责人或队长提供的邀请链接。', 'Sign in with your invited email to manage your profile and security. New participants should open the invitation from their organizer or captain.'],
  ['登录账号 →', 'Sign in →'], ['前往我的空间 ↗', 'Go to My Space ↗'], ['返回赛事总览 ↗', 'Back to overview ↗'],
  ['密码已更新，所有登录设备均已退出。请使用新密码登录。', 'Password updated and all devices signed out. Sign in with your new password.'],
  ['当前密码不正确，请重新输入。', 'Your current password is incorrect. Please try again.'],
  ['账号凭据已经变化，请重新登录后再操作。', 'Your account credentials changed. Sign in again before continuing.'],
  ['邮件服务暂未开放，请联系赛事负责人核对账号邮箱。', 'Email delivery is unavailable. Contact the organizer to check your account email.'],
  ['验证链接无效或已使用，请重新申请。', 'This verification link is invalid or already used. Request another email.'],
  ['验证链接已过期，请重新申请。', 'This verification link expired. Request another email.'],
  ['这台设备已经退出，请刷新设备列表。', 'This device is already signed out. Refresh the device list.'],
  ['当前账号不支持这项修改。', 'This account cannot make this change.'],
  ['当前采用邀请制，请打开赛事负责人或队长提供的邀请链接。', 'Accounts are invitation-only. Open the link provided by your organizer or captain.'],
  ['当前站点尚未接通账号服务，请联系赛事负责人。', 'This site is not connected to the account service. Contact the organizer.'],
  ['登录已失效，请重新登录。', 'Your sign-in expired. Please sign in again.'],
  ['操作较频繁，请稍后再试。', 'Too many attempts. Please try again later.'],
  ['账号服务暂时不可用，请稍后重试。', 'The account service is temporarily unavailable. Please try again later.'],
  ['账号服务暂未提供这项功能，请稍后重试。', 'This account feature is temporarily unavailable. Please try again later.'],
  ['当前账号不能执行这项操作。', 'This account cannot perform this action.'],
  ['填写内容不符合要求，请检查后重试。', 'Check the form and try again.'],
  ['操作未完成，请稍后重试。', 'The action did not complete. Please try again later.'],
  ['请填写当前密码。', 'Enter your current password.'], ['新密码至少需要 8 位。', 'Use at least 8 characters for your new password.'],
  ['密码不能超过 72 个 UTF-8 字节。', 'The password cannot exceed 72 UTF-8 bytes.'],
  ['新密码需要与当前密码不同。', 'Choose a password different from your current one.'],
  ['两次输入的新密码不一致。', 'Your new passwords do not match.'],
  ['验证邮件未投递，请稍后重试或联系赛事负责人。', 'The verification email was not delivered. Try again later or contact the organizer.'],
  ['正在核验邮箱链接…', 'Checking the verification link…'],
  ['暂无记录', 'No record'], ['未记录', 'Not recorded'], ['最近活动 ·', 'Last active ·'], ['登录时间', 'Signed in'],
  ...REGION_GROUPS.flatMap(group => [[group.zh, group.en], ...group.options.map(option => [option.zh, option.en])])
])
const patterns = [
  [/^(\d+) 条有效登录$/, ([, count]) => `${count} active sign-ins`],
  [/^已结束其他 (\d+) 条登录，当前设备保持登录。$/, ([, count]) => `Ended ${count} other sign-ins. This device stays signed in.`],
  [/^将结束其他 (\d+) 条有效登录，当前设备保持登录。其他设备需要重新登录才能继续使用账号。$/, ([, count]) => `End ${count} other sign-ins. This device stays signed in; other devices will need to sign in again.`],
  [/^设备「(.+)」将退出登录，当前设备保持登录。$/, ([, device]) => `Sign out “${device}”. This device stays signed in.`],
  [/^退出设备 (.+)$/, ([, device]) => `Sign out ${device}`],
  [/^(显示|隐藏)(当前密码|新密码|确认新密码)$/, ([, action, field]) => `${copy.get(action)} ${copy.get(field).toLowerCase()}`],
  [/^最近活动 · (.*)$/, ([, time]) => `Last active · ${time}`],
  [/^登录时间 (.*)$/, ([, time]) => `Signed in ${time}`]
]
export function translateAccountSettingsText(value, locale) {
  const localized = translateUiText(value, locale)
  if (localized !== value) return formatUiText(localized, locale)
  if (!isEnglishLocale(locale) || value == null) return formatUiText(value, locale)
  const source = String(value)
  const core = source.trim().replace(/\s+/g, ' ')
  let translated = copy.get(core)
  if (!translated) {
    for (const [pattern, resolve] of patterns) {
      const match = core.match(pattern)
      if (match) { translated = resolve(match); break }
    }
  }
  return formatUiText(translated ? `${source.match(/^\s*/)[0]}${translated}${source.match(/\s*$/)[0]}` : translateLegacyText(value, locale), locale)
}
