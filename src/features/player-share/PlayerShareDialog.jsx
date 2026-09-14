import { translateUiText as uiText } from '../../lib/uiText.js'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createTranslator } from '../../lib/i18n.js'
import { getRoleEnLabel, getRoleLabel } from '../../lib/leaderboardSelectors.js'
import PlayerShareCard from './PlayerShareCard.jsx'
import { createPlayerShareFileName } from './playerShareFileName.js'
import { exportPlayerSharePng } from './playerShareRenderer.js'
import { getPlayerShareCardModel } from './playerShareSelectors.js'
import styles from './PlayerShareDialog.module.css'

function roleName(role, locale = 'zh-CN') {
  return locale === 'en-US' ? getRoleEnLabel(role) : uiText(getRoleLabel(role), locale)
}

export default function PlayerShareDialog({
  open,
  onClose,
  db,
  season,
  seasonId,
  playerId,
  roleEntries = [],
  currentRole,
  updatedAtText,
  locale = 'zh'
}) {
  const exportRef = useRef(null)
  const previewRef = useRef(null)
  const dialogRef = useRef(null)
  const [previewScale, setPreviewScale] = useState(0)
  const [selectedRole, setSelectedRole] = useState(currentRole || roleEntries[0]?.role || '')
  const [status, setStatus] = useState('')
  const [exporting, setExporting] = useState(false)
  const t = useMemo(() => createTranslator(locale), [locale])

  useEffect(() => {
    if (!open) return
    setSelectedRole(currentRole || roleEntries[0]?.role || '')
    setStatus('')
  }, [currentRole, open, roleEntries])

  useEffect(() => {
    if (!open) return undefined
    const opener = document.activeElement
    const previousOverflow = document.body.style.overflow
    const buttons = () => [...(dialogRef.current?.querySelectorAll('button:not(:disabled), a[href], [tabindex="0"]') || [])]
    document.body.style.overflow = 'hidden'
    buttons()[0]?.focus()
    const handleKeyDown = event => {
      if (event.key === 'Escape') onClose?.()
      if (event.key === 'Tab') {
        const elements = buttons()
        const destination = event.shiftKey ? elements.at(-1) : elements[0]
        if (event.shiftKey ? document.activeElement === elements[0] : document.activeElement === elements.at(-1)) {
          event.preventDefault()
          destination?.focus()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      if (opener instanceof HTMLElement && document.contains(opener)) opener.focus({ preventScroll: true })
    }
  }, [onClose, open])

  useEffect(() => {
    if (!open || !previewRef.current) return undefined
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setPreviewScale(Math.max(0, Math.min((width - 4) / 1600, (height - 4) / 900, 0.66)))
    })
    observer.observe(previewRef.current)
    return () => observer.disconnect()
  }, [open])

  const model = useMemo(
    () => getPlayerShareCardModel({
      db,
      season,
      seasonId,
      playerId,
      role: selectedRole,
      updatedAtText,
      locale
    }),
    [db, locale, playerId, season, seasonId, selectedRole, updatedAtText]
  )

  const handleExport = async () => {
    if (!exportRef.current || !model || exporting) return
    setExporting(true)
    setStatus(t('playerShare.dialog.generatingStatus', '正在生成分享图…'))
    try {
      await exportPlayerSharePng(exportRef.current, createPlayerShareFileName({
        seasonCode: model.season.code,
        nickname: model.identity.nickname,
        role: model.identity.roleCode || selectedRole || model.identity.role
      }))
      setStatus(t('playerShare.dialog.exported', '分享图已导出。'))
    } catch (error) {
      console.error('PLAYER_SHARE_EXPORT_FAILED', error)
      setStatus(t('playerShare.dialog.failed', '导出失败，请稍后重试。'))
    } finally {
      setExporting(false)
    }
  }

  if (!open) return null

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label={t('playerShare.dialog.aria', uiText("导出分享图", locale))}>
      <section className={styles.dialog} ref={dialogRef}>
        <header className={styles.header}>
          <div>
            <span>PLAYER SHARE</span>
            <h2>{t('playerShare.dialog.title', uiText("导出分享图", locale))}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label={t('playerShare.dialog.close', uiText("关闭", locale))}>×</button>
        </header>

        <div className={styles.controls}>
          <div className={styles.roleControl}>
            <span>{t('playerShare.dialog.role', uiText("职责", locale))}</span>
            <div role="tablist" aria-label={t('playerShare.dialog.roleAria', uiText("选择职责", locale))}>
              {roleEntries.map(item => (
                <button
                  key={item.role}
                  type="button"
                  role="tab"
                  aria-selected={selectedRole === item.role}
                  className={selectedRole === item.role ? styles.roleActive : ''}
                  onClick={() => {
                    setSelectedRole(item.role)
                    setStatus('')
                  }}
                >
                  {roleName(item.role, locale)}
                </button>
              ))}
            </div>
          </div>
          <div className={styles.metaPills}>
            <span>{t('playerShare.dialog.highlightAuto', uiText("赛季高光：自动选择", locale))}</span>
            <span>1600 × 900</span>
          </div>
          <button
            type="button"
            className={styles.exportButton}
            onClick={handleExport}
            disabled={!model || exporting}
          >
            {exporting ? t('playerShare.dialog.generating', uiText("正在生成", locale)) : t('playerShare.dialog.exportPng', uiText("导出 PNG", locale))}
          </button>
        </div>

        <div className={styles.previewArea} ref={previewRef}>
          {model ? (
            <div className={styles.previewFrame} style={{ width: 1600 * previewScale + 4, height: 900 * previewScale + 4 }}>
              <div className={styles.previewScale} style={{ transform: `scale(${previewScale})` }}>
                <PlayerShareCard model={model} />
              </div>
            </div>
          ) : (
            <div className={styles.emptyState}>{t('playerShare.dialog.empty', uiText("当前职责暂无可导出的数据。", locale))}</div>
          )}
        </div>

        <footer className={styles.footer}>
          <span role="status">{status || t('playerShare.dialog.previewNote', uiText("预览与导出使用同一卡面，导出尺寸固定为 1600 × 900。", locale))}</span>
        </footer>
      </section>

      {model ? (
        <div className={styles.exportMount} aria-hidden="true">
          <div ref={exportRef}>
            <PlayerShareCard model={model} exportMode />
          </div>
        </div>
      ) : null}
    </div>
  )
}
