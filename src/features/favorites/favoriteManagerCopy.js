import { translateUiText as formatUiText } from '../../lib/uiText.js'
import { localizeUiCopy, translateUiText } from '../../lib/uiText.js'
const zh = {
  title: '管理关注', close: '关闭关注管理', teams: '队伍', players: '选手', types: '关注类型',
  selectedTeams: '已选队伍', selectedPlayers: '已选选手', directory: '赛事名录',
  primary: '主关注', makePrimary: '设为主关注', follow: '关注', followed: '已关注', limit: '已达上限', remove: '移除',
  up: name => `上移 ${name}`, down: name => `下移 ${name}`, removeLabel: name => `移除 ${name}`, followLabel: name => `关注 ${name}`,
  primaryHint: '主关注队伍排在最前。其余关注可用箭头调整顺序。', playerHint: '关注选手后，查看其正式出场与所在队伍的赛程。',
  emptyTeams: '还没有选择队伍', emptyPlayers: '还没有选择选手', emptyHint: '从赛事名录中添加，保存后显示在我的关注。',
  searchTeams: '搜索队伍', searchPlayers: '搜索选手', teamPlaceholder: '简称 / 全称', playerPlaceholder: '昵称 / 战网 ID / 队伍',
  allTeams: '全部队伍', roles: '职责', allRoles: '全部职责', noResults: '没有找到匹配结果', resetSearch: '清除筛选', results: count => `${count} 个结果`,
  pending: '有未保存的修改', unchanged: '与已保存的关注一致', save: '保存关注', saving: '正在保存…', cancel: '取消',
  backup: '备份与迁移', export: '导出当前草稿', import: '导入备份', reading: '正在读取备份…',
  exported: '已生成当前草稿的备份文件。尚未保存的修改仍需点击保存。', imported: '备份已应用到草稿，保存后生效。',
  saveError: '保存失败，草稿已保留。请重试；也可以先导出备份。',
  localHint: '按赛事保存到当前浏览器。', cloudHint: '先保存到当前浏览器，账号同步状态可在关注页查看。',
  conflictTitle: '已保存的关注发生了变化', conflict: '当前草稿仍然保留。请先选择使用最新关注，或用这份草稿继续编辑。',
  useLatest: '使用最新关注', keepDraft: '保留我的草稿',
  discardTitle: '放弃未保存的修改？', discardDescription: '这次编辑尚未保存，离开后将丢失。', keepEditing: '继续编辑', discard: '放弃修改并离开',
  busyTitle: '操作正在进行', busyDescription: '请等待完成，当前草稿会继续保留。',
  previewTitle: '预览导入备份', previewHint: '选择如何应用到草稿，保存后才会修改关注。', merge: '合并到草稿', replace: '替换当前草稿',
  mergeHint: '保留当前顺序与主关注，追加备份中的新关注。', replaceHint: '使用备份中的关注与顺序。',
  apply: '应用到草稿', counts: (teams, players) => `${teams} 支队伍 · ${players} 名选手`, before: '当前草稿', after: '应用后',
  omitted: count => `${count} 项因无法匹配赛事、重复或超过上限未纳入。`, mergeOmitted: count => `合并后有 ${count} 项超出上限，当前草稿中的关注优先保留。`,
  identityOmitted: '本人及所属队伍已由账号身份关联，不占用关注名额。',
  importErrors: { INVALID_JSON: '备份不是有效的 JSON 文件。', INVALID_PAYLOAD: '未识别出有效的关注备份，草稿保持不变。', INVALID_SCHEMA: '这不是 Stats 关注备份。', UNSUPPORTED_VERSION: '暂不支持这个备份版本。', SEASON_MISMATCH: '备份属于其他赛事，请切换到对应赛事后导入。', UNKNOWN_SEASON: '当前赛事无法识别，暂不能导入。', TOO_LARGE: '备份文件不能超过 1 MB。', UNKNOWN: '读取备份失败，请检查文件后重试。' }
}
const en = {
  title: 'Manage following', close: 'Close following manager', teams: 'Teams', players: 'Players', types: 'Following type',
  selectedTeams: 'Selected teams', selectedPlayers: 'Selected players', directory: 'Event directory',
  primary: 'Primary', makePrimary: 'Make primary', follow: 'Follow', followed: 'Following', limit: 'Limit reached', remove: 'Remove',
  up: name => `Move ${name} up`, down: name => `Move ${name} down`, removeLabel: name => `Remove ${name}`, followLabel: name => `Follow ${name}`,
  primaryHint: 'Your primary team stays first. Use the arrows to reorder the rest.', playerHint: 'Follow players to see their recorded appearances and current team schedules.',
  emptyTeams: 'No teams selected yet', emptyPlayers: 'No players selected yet', emptyHint: 'Add from the event directory, then save to update your following.',
  searchTeams: 'Search teams', searchPlayers: 'Search players', teamPlaceholder: 'Short or full name', playerPlaceholder: 'Name / BattleTag / team',
  allTeams: 'All teams', roles: 'Role', allRoles: 'All roles', noResults: 'No matching results', resetSearch: 'Clear filters', results: count => count + (count === 1 ? ' result' : ' results'),
  pending: 'Unsaved changes', unchanged: 'Matches your saved following', save: 'Save following', saving: 'Saving…', cancel: 'Cancel',
  backup: 'Backup & transfer', export: 'Export current draft', import: 'Import backup', reading: 'Reading backup…',
  exported: 'A backup of this draft is ready to download. Unsaved changes still need to be saved.', imported: 'Backup applied to your draft. Save to update your following.',
  saveError: 'Could not save. Your draft is still here. Try again or export a backup.',
  localHint: 'Saved per event in this browser.', cloudHint: 'Saved in this browser first. Check account sync on the following page.',
  conflictTitle: 'Your saved following has changed', conflict: 'Your draft is still here. Choose the latest following or continue with this draft before saving.',
  useLatest: 'Use latest following', keepDraft: 'Keep my draft',
  discardTitle: 'Discard unsaved changes?', discardDescription: 'Your edits have not been saved and will be lost if you leave.', keepEditing: 'Keep editing', discard: 'Discard and leave',
  busyTitle: 'An operation is in progress', busyDescription: 'Please wait for it to finish. Your draft is still here.',
  previewTitle: 'Preview backup', previewHint: 'Choose how to apply it to your draft. Your following changes only when you save.', merge: 'Merge into draft', replace: 'Replace current draft',
  mergeHint: 'Keep your current order and primary team, then add new follows from the backup.', replaceHint: 'Use the follows and order from the backup.',
  apply: 'Apply to draft', counts: (teams, players) => teams + (teams === 1 ? ' team · ' : ' teams · ') + players + (players === 1 ? ' player' : ' players'), before: 'Current draft', after: 'After applying',
  omitted: count => count + (count === 1 ? ' entry was' : ' entries were') + ' omitted due to unmatched records, duplicates, or limits.', mergeOmitted: count => count + (count === 1 ? ' entry exceeds' : ' entries exceed') + ' the limits. Follows already in your draft take priority.',
  identityOmitted: 'Your player and team are already linked to your account and do not use following slots.',
  importErrors: { INVALID_JSON: 'This is not valid JSON.', INVALID_PAYLOAD: 'No valid following backup found. Your draft is unchanged.', INVALID_SCHEMA: 'This is not a Stats following backup.', UNSUPPORTED_VERSION: 'This backup version is not supported.', SEASON_MISMATCH: 'This backup belongs to another event. Switch to that event to import it.', UNKNOWN_SEASON: 'The current event could not be identified.', TOO_LARGE: 'Backups must be smaller than 1 MB.', UNKNOWN: 'Could not read this backup. Check the file and try again.' }
}
export function getFavoriteManagerCopy(locale) { return localizeUiCopy(locale === 'en-US' ? en : zh, locale) }
export function getFavoriteRoleLabel(role, locale) {
  const key = String(role || '').toUpperCase()
  const labels = locale === 'en-US'
    ? { TANK: 'Tank', DPS: 'Damage', DAMAGE: 'Damage', SUP: 'Support', SUPPORT: 'Support', FLEX: 'Flex' }
    : { TANK: '重装', DPS: '输出', DAMAGE: '输出', SUP: '支援', SUPPORT: '支援', FLEX: '自由人' }
  return formatUiText(translateUiText(labels[key] || role || '—', locale), locale)
}
