import { useEffect, useRef, useState } from 'react'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { pickUiLocale } from '../../lib/uiText.js'
import { formatOwHeroName, formatOwMapName, getOwMap } from '../../lib/heroes.js'
import { getNativeRoomSettings } from './nativeRoomSettings.js'
import styles from './RoomGameSettings.module.css'

export default function RoomGameSettings({ data, unavailable = false }) {
  const locale = useUiLocale(), output = useRef(null)
  const [receipt, setReceipt] = useState(null)
  const settings = getNativeRoomSettings(data, { stale: unavailable })
  const t = (zh, en, ko, tw) => pickUiLocale(locale, zh, en, ko, tw)
  const copied = receipt?.key === settings.key && receipt?.ok
  const manualMap = settings.mapSelection === 'MANUAL'
  const manualTarget = settings.ready ? formatOwMapName(settings.map.en, 'zh-CN') : ''
  const copyLabel = manualMap
    ? t('复制赛事设置', 'Copy match settings', '경기 설정 복사', '複製賽事設定')
    : t('复制本图配置', 'Copy map settings', '이번 전장 설정 복사', '複製本圖設定')
  const copiedLabel = manualMap
    ? t('已复制赛事设置', 'Match settings copied', '경기 설정 복사됨', '已複製賽事設定')
    : t('已复制本图配置', 'Map settings copied', '이번 전장 설정 복사됨', '已複製本圖設定')
  useEffect(() => {
    if (settings.ready && receipt?.key === settings.key && receipt?.ok === false) {
      output.current?.focus()
      output.current?.select()
    }
  }, [receipt, settings.key, settings.ready])
  const copy = async () => {
    if (!settings.ready || unavailable) return
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(settings.text)
      setReceipt({ key: settings.key, ok: true })
    } catch {
      setReceipt({ key: settings.key, ok: false })
    }
  }
  const save = () => {
    if (!settings.ready || unavailable) return
    const url = URL.createObjectURL(new Blob([settings.text], { type: 'text/plain;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'FCW-map-' + settings.order + '-' + settings.map.id + (manualMap ? '-manual-map' : '') + '.txt'
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  return <section className={styles.panel} data-room-game-settings data-ready={settings.ready} aria-label={t('本图游戏配置', 'Game settings for this map', '이번 전장 게임 설정', '本圖遊戲設定')}>
    <header><strong>{t('本图游戏配置', 'Game settings for this map', '이번 전장 게임 설정', '本圖遊戲設定')}</strong><small>{t('简体中文客户端', 'Simplified Chinese game client', '중국어 간체 게임 클라이언트', '簡體中文用戶端')}</small></header>
    {settings.ready ? <>
      <p className={styles.summary}><b>{formatOwMapName(settings.map.en, locale)}</b><span>{t('禁用', 'Bans', '금지', '禁用')} · {settings.heroes.length ? settings.heroes.map(hero => formatOwHeroName(hero.en, locale)).join(' / ') : t('无', 'None', '없음', '無')}</span></p>
      <small>{t('中国杭州 · 竞技规则 · 1 重装 / 2 输出 / 2 支援', 'Hangzhou, China · Competitive · 1 tank / 2 damage / 2 support', '중국 항저우 · 경쟁전 · 돌격 1 / 공격 2 / 지원 2', '中國杭州 · 競技規則 · 1 重裝 / 2 輸出 / 2 支援')}</small>
      {manualMap && <p className={styles.manualMap} role="note"><strong>{t('本图需要在游戏内手动选图', 'Select this map manually in the game', '게임에서 이 전장을 직접 선택하세요', '本圖需要在遊戲內手動選圖')}</strong></p>}
      <div className={styles.actions}>
        <button type="button" className={styles.copy} onClick={copy} disabled={unavailable}>{copied ? copiedLabel : copyLabel}</button>
        <button type="button" onClick={save} disabled={unavailable}>{t('下载文本', 'Download text', '텍스트 다운로드', '下載文字')}</button>
      </div>
      <p className={styles.hint}>{manualMap
        ? t('粘贴赛事设置后，在游戏的“地图 → 机动推进”中关闭其他地图，只开启' + manualTarget + '，核对禁用后开赛。', 'Paste the match settings, then open Maps → Push in the game and enable only ' + manualTarget + '. Check the bans before starting.', '경기 설정을 붙여넣은 뒤 게임의 전장 → 밀기에서 ' + manualTarget + '만 켜고 금지를 확인한 후 시작하세요.', '貼上賽事設定後，在遊戲的「地圖 → 機動推進」中關閉其他地圖，只開啟' + manualTarget + '，核對禁用後開賽。')
        : t('房主在游戏的自定义房间设置页粘贴，核对地图与禁用后开赛。', 'The host pastes this in the custom game settings, checks the map and bans, then starts the game.', '방장은 사용자 지정 게임 설정에 붙여넣고 전장과 금지를 확인한 뒤 시작하세요.', '房主在遊戲的自訂房間設定頁貼上，核對地圖與禁用後開賽。')}</p>
      {!settings.inGameVerified && <small className={styles.hint}>{manualMap
        ? t('此设置和手动选图流程尚待游戏实测，请核对实际载入结果。', 'These settings and the manual map step still need an in-game check.', '이 설정과 수동 전장 선택 절차는 게임에서 확인이 필요합니다.', '此設定與手動選圖流程尚待遊戲實測，請核對實際載入結果。')
        : t('本组合首次用于游戏测试，请核对实际载入结果。', 'This combination needs an in-game check on its first test.', '이 조합은 첫 테스트에서 실제 적용 결과를 확인하세요.', '本組合首次用於遊戲測試，請核對實際載入結果。')}</small>}
      <details className={styles.details} open={receipt?.key === settings.key && receipt?.ok === false || undefined}>
        <summary>{t('查看完整配置', 'View full settings', '전체 설정 보기', '查看完整設定')}</summary>
        <textarea ref={output} readOnly value={settings.text} aria-label={t('完整游戏配置文本', 'Full game settings text', '전체 게임 설정 텍스트', '完整遊戲設定文字')} rows={10} spellCheck={false} />
      </details>
      {receipt?.key === settings.key && <small role="status">{receipt.ok ? manualMap
        ? t('已复制。粘贴后请在游戏里只开启' + manualTarget + '。', 'Copied. After pasting, enable only ' + manualTarget + ' in the game.', '복사했습니다. 붙여넣은 뒤 게임에서 ' + manualTarget + '만 켜세요.', '已複製。貼上後請在遊戲裡只開啟' + manualTarget + '。')
        : t('已复制。请切回游戏粘贴设置。', 'Copied. Switch to the game and paste the settings.', '복사했습니다. 게임에서 설정을 붙여넣으세요.', '已複製。請切回遊戲貼上設定。') : t('自动复制失败，已选中文本，请手动复制。', 'Automatic copy failed. Copy the selected text manually.', '자동 복사에 실패했습니다. 선택된 텍스트를 직접 복사하세요.', '自動複製失敗，已選取文字，請手動複製。')}</small>}
    </> : <p role="status">{settings.reason === 'CLIENT_MAP_IMPORT_DEFECT'
      ? t('当前游戏版本无法正确回导本图原生设置，暂不可复制。', 'The current game client cannot correctly re-import its own settings for this map. Copy is unavailable.', '현재 게임 버전은 이 전장의 자체 설정을 올바르게 다시 가져올 수 없어 복사할 수 없습니다.', '目前遊戲版本無法正確回匯本圖原生設定，暫不可複製。')
      : settings.reason === 'MAP_IMPORT_PENDING'
      ? t('本图配置尚未通过游戏导入验证，暂时无法复制。', 'This map configuration has not passed game import verification. Copy is temporarily unavailable.', '이번 전장 설정의 게임 가져오기가 검증되지 않아 아직 복사할 수 없습니다.', '本圖設定尚未通過遊戲匯入驗證，暫時無法複製。')
      : settings.reason === 'UNSUPPORTED'
      ? t('本图暂需手动设置，以下游戏字段仍待核对：', 'Set up this map manually until these game tokens are checked: ', '다음 게임 항목을 확인할 때까지 직접 설정하세요: ', '本圖暫需手動設定，以下遊戲欄位仍待核對：') + settings.names.map(name => getOwMap(name) ? formatOwMapName(name, locale) : formatOwHeroName(name, locale)).join(' / ')
      : settings.reason === 'STALE'
        ? t('正在同步本图选禁，恢复同步后可复制。', 'Syncing map selections. Copy after sync recovers.', '선택 결과를 동기화 중입니다. 동기화 후 복사하세요.', '正在同步本圖選禁，恢復同步後可複製。')
        : settings.reason === 'INCONSISTENT'
          ? t('本图选禁数据不一致，请重新同步后复制。', 'Map selections are inconsistent. Sync again before copying.', '선택 결과가 일치하지 않습니다. 다시 동기화한 후 복사하세요.', '本圖選禁資料不一致，請重新同步後複製。')
          : t('完成本图地图选择与双方禁用后，自动生成配置。', 'Settings appear after the map and both bans are confirmed.', '전장과 양 팀의 금지가 확정되면 설정이 생성됩니다.', '完成本圖地圖選擇與雙方禁用後，自動產生設定。')}</p>}
  </section>
}
