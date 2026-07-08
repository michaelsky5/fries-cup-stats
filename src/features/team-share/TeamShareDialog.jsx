import { useEffect, useRef, useState } from 'react'
import TeamShareCard from './TeamShareCard.jsx'
import { createTeamShareFileName } from './teamShareFileName.js'
import { exportTeamSharePng } from './teamShareRenderer.js'
import styles from './TeamShareDialog.module.css'

export default function TeamShareDialog({ open, onClose, model }) {
  const exportRef = useRef(null)
  const [status, setStatus] = useState('')
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    if (!open) return
    setStatus('')
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    const handleKeyDown = event => {
      if (event.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, open])

  const handleExport = async () => {
    if (!exportRef.current || !model || exporting) return
    setExporting(true)
    setStatus('正在生成战队分享图...')
    try {
      await exportTeamSharePng(exportRef.current, createTeamShareFileName({
        seasonCode: model.seasonLabel,
        teamShortName: model.team.shortName
      }))
      setStatus('战队分享图已导出。')
    } catch (error) {
      console.error('TEAM_SHARE_EXPORT_FAILED', error)
      setStatus('导出失败，请稍后重试。')
    } finally {
      setExporting(false)
    }
  }

  if (!open) return null

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="导出战队分享图">
      <section className={styles.dialog}>
        <header className={styles.header}>
          <div>
            <span>TEAM SHARE</span>
            <h2>导出战队分享图</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="关闭">×</button>
        </header>

        <div className={styles.controls}>
          <div className={styles.metaPills}>
            <span>{model?.team?.shortName || 'TEAM'}</span>
            <span>1600 x 900</span>
            <span>{model?.featuredMap?.displayName || 'MAP BACKDROP'}</span>
          </div>
          <button
            type="button"
            className={styles.exportButton}
            onClick={handleExport}
            disabled={!model || exporting}
          >
            {exporting ? '正在生成' : '导出 PNG'}
          </button>
        </div>

        <div className={styles.previewArea}>
          {model ? (
            <div className={styles.previewFrame}>
              <div className={styles.previewScale}>
                <TeamShareCard model={model} />
              </div>
            </div>
          ) : (
            <div className={styles.emptyState}>当前战队暂无可导出的数据。</div>
          )}
        </div>

        <footer className={styles.footer}>
          <span>{status || '预览和导出使用同一张卡面，电脑端可直接下载 PNG。'}</span>
        </footer>
      </section>

      {model ? (
        <div className={styles.exportMount} aria-hidden="true">
          <div ref={exportRef}>
            <TeamShareCard model={model} />
          </div>
        </div>
      ) : null}
    </div>
  )
}
