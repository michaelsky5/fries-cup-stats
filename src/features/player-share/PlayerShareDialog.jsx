import { useEffect, useMemo, useRef, useState } from 'react'
import { createTranslator } from '../../lib/i18n.js'
import PlayerShareCard from './PlayerShareCard.jsx'
import { createPlayerShareFileName } from './playerShareFileName.js'
import { exportPlayerSharePng } from './playerShareRenderer.js'
import { getPlayerShareCardModel } from './playerShareSelectors.js'
import styles from './PlayerShareDialog.module.css'

function roleName(role) {
  return role === 'SUPPORT' ? 'SUPPORT' : role || 'ROLE'
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
    const handleKeyDown = event => {
      if (event.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, open])

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
        role: model.identity.role
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
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label={t('playerShare.dialog.aria', '导出分享图')}>
      <section className={styles.dialog}>
        <header className={styles.header}>
          <div>
            <span>PLAYER SHARE</span>
            <h2>{t('playerShare.dialog.title', '导出分享图')}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label={t('playerShare.dialog.close', '关闭')}>×</button>
        </header>

        <div className={styles.controls}>
          <div className={styles.roleControl}>
            <span>{t('playerShare.dialog.role', '职责')}</span>
            <div role="tablist" aria-label={t('playerShare.dialog.roleAria', '选择职责')}>
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
                  {roleName(item.role)}
                </button>
              ))}
            </div>
          </div>
          <div className={styles.metaPills}>
            <span>{t('playerShare.dialog.highlightAuto', '赛季高光：自动选择')}</span>
            <span>1600 × 900</span>
          </div>
          <button
            type="button"
            className={styles.exportButton}
            onClick={handleExport}
            disabled={!model || exporting}
          >
            {exporting ? t('playerShare.dialog.generating', '正在生成') : t('playerShare.dialog.exportPng', '导出 PNG')}
          </button>
        </div>

        <div className={styles.previewArea}>
          {model ? (
            <div className={styles.previewFrame}>
              <div className={styles.previewScale}>
                <PlayerShareCard model={model} />
              </div>
            </div>
          ) : (
            <div className={styles.emptyState}>{t('playerShare.dialog.empty', '当前职责暂无可导出的数据。')}</div>
          )}
        </div>

        <footer className={styles.footer}>
          <span>{status || t('playerShare.dialog.previewNote', '预览与导出使用同一卡面，导出尺寸固定为 1600 × 900。')}</span>
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
