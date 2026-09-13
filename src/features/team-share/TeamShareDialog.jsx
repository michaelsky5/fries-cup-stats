import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { useEffect, useMemo, useRef, useState } from 'react'
import TeamShareCard from './TeamShareCard.jsx'
import { createTeamShareFileName } from './teamShareFileName.js'
import { exportTeamSharePng } from './teamShareRenderer.js'
import {
  applyHeroSelections,
  createAutomaticHeroSelections,
  getHeroEditorRows,
  getHeroSelectionSummary
} from './teamShareHeroSelection.js'
import styles from './TeamShareDialog.module.css'

export default function TeamShareDialog({ open, onClose, model }) {
  const uiLocale = useUiLocale()
  const exportRef = useRef(null)
  const dialogRef = useRef(null)
  const previewAreaRef = useRef(null)
  const initializedRef = useRef('')
  const onCloseRef = useRef(onClose)
  const [previewScale, setPreviewScale] = useState(.4)
  const [status, setStatus] = useState('')
  const [exporting, setExporting] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [heroSelections, setHeroSelections] = useState({})
  const automaticSelections = useMemo(() => createAutomaticHeroSelections(model), [model])
  const editorRows = useMemo(() => getHeroEditorRows(model), [model])
  const previewModel = useMemo(() => applyHeroSelections(model, heroSelections), [heroSelections, model])
  const selectionSummary = useMemo(
    () => getHeroSelectionSummary(model, heroSelections),
    [heroSelections, model]
  )
  const selectionKey = `${model?.seasonId}:${model?.team?.raw?.team_id || model?.team?.shortName}`

  useEffect(() => { onCloseRef.current = onClose }, [onClose])

  useEffect(() => {
    if (!open) { initializedRef.current = ''; return }
    if (initializedRef.current === selectionKey) return
    initializedRef.current = selectionKey
    setStatus('')
    setEditorOpen(false)
    setHeroSelections(automaticSelections)
  }, [automaticSelections, open, selectionKey])

  useEffect(() => {
    if (!open) return undefined
    const previousFocus = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialogRef.current?.querySelector('button')?.focus()
    const handleKeyDown = event => {
      if (event.key === 'Escape') { event.preventDefault(); onCloseRef.current?.(); return }
      if (event.key !== 'Tab') return
      const focusable = Array.from(dialogRef.current?.querySelectorAll('button:not(:disabled), select:not(:disabled), a[href]') || []).filter(node => node.getClientRects().length)
      const first = focusable[0]
      const last = focusable.at(-1)
      if (!first) return
      if (event.shiftKey && (document.activeElement === first || !dialogRef.current?.contains(document.activeElement))) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && (document.activeElement === last || !dialogRef.current?.contains(document.activeElement))) { event.preventDefault(); first.focus() }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true })
    }
  }, [open])

  useEffect(() => {
    const area = previewAreaRef.current
    if (!open || !area) return undefined
    const observer = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      setPreviewScale(Math.max(.05, Math.min((width - 4) / 1600, (height - 4) / 900, 1)))
    })
    observer.observe(area)
    return () => observer.disconnect()
  }, [open])

  const handleExport = async () => {
    if (!exportRef.current || !previewModel || exporting) return
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

  const handleAutomaticSelection = () => {
    setHeroSelections(automaticSelections)
    setStatus('已按真实使用记录自动避开可避免的重复英雄。')
  }

  const handleHeroChange = (playerKey, heroKey) => {
    setHeroSelections(current => ({ ...current, [playerKey]: heroKey }))
    setStatus('英雄画面已调整，仅影响本次分享图。')
  }

  if (!open) return null

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label={uiText("导出战队分享图", uiLocale)}>
      <section ref={dialogRef} className={styles.dialog} data-editor-open={editorOpen ? 'true' : 'false'}>
        <header className={styles.header}>
          <div>
            <span>TEAM SHARE</span>
            <h2>{uiText("导出战队分享图", uiLocale)}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label={uiText("关闭", uiLocale)}>×</button>
        </header>

        <div className={styles.toolArea}>
          <div className={styles.controls}>
            <div className={styles.metaPills}>
              <span>{model?.team?.shortName || 'TEAM'}</span>
              <span>1600 x 900</span>
              <span>{model?.featuredMap?.displayName || 'MAP BACKDROP'}</span>
            </div>
            <div className={styles.controlActions}>
              <button
                type="button"
                className={styles.editorButton}
                onClick={() => setEditorOpen(current => !current)}
                disabled={!model || !editorRows.length}
                aria-expanded={editorOpen}
              >
                {editorOpen ? uiText("收起调整", uiLocale) : uiText("调整英雄", uiLocale)}
              </button>
              <button
                type="button"
                className={styles.autoButton}
                onClick={handleAutomaticSelection}
                disabled={!model || !editorRows.length}
              >{uiText("自动去重", uiLocale)}</button>
              <button
                type="button"
                className={styles.exportButton}
                onClick={handleExport}
                disabled={!model || exporting}
              >
                {exporting ? uiText("正在生成", uiLocale) : uiText("导出 PNG", uiLocale)}
              </button>
            </div>
          </div>

          {editorOpen && model ? (
            <section className={styles.heroEditor} aria-label={uiText("分享图英雄画面调整", uiLocale)}>
              <header>
                <div>
                  <strong>{uiText("英雄画面", uiLocale)}</strong>
                  <span>{uiText("仅提供该选手本赛季实际使用过的同职责英雄", uiLocale)}</span>
                </div>
                <em data-warning={selectionSummary.duplicateGroups > 0 ? 'true' : 'false'}>
                  {selectionSummary.duplicateGroups > 0
                    ? uiText("{0} 组重复无法自动避开", uiLocale, [selectionSummary.duplicateGroups])
                    : uiText("{0}/{1} 英雄互不重复", uiLocale, [selectionSummary.distinctHeroes, selectionSummary.totalPlayers])}
                </em>
              </header>
              <div
                className={styles.heroEditorGrid}
                style={{ '--hero-editor-count': Math.max(editorRows.length, 1) }}
              >
                {editorRows.map(({ player, playerKey, candidates }) => (
                  <label key={playerKey}>
                    <span>
                      <b>{player.name}</b>
                      <em>{player.role}</em>
                    </span>
                    <select
                      value={heroSelections[playerKey] || candidates[0]?.key || ''}
                      onChange={event => handleHeroChange(playerKey, event.target.value)}
                      disabled={candidates.length < 2}
                      aria-label={uiText("{0}的英雄画面", uiLocale, [player.name])}
                    >
                      {candidates.map(candidate => (
                        <option key={candidate.key} value={candidate.key}>{candidate.name}</option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <div className={styles.previewArea} ref={previewAreaRef}>
          {model ? (
            <div className={styles.previewFrame} style={{ width: 1600 * previewScale, height: 900 * previewScale }}>
              <div className={styles.previewScale} style={{ transform: `scale(${previewScale})` }}>
                <TeamShareCard model={previewModel} />
              </div>
            </div>
          ) : (
            <div className={styles.emptyState}>{uiText("当前战队暂无可导出的数据。", uiLocale)}</div>
          )}
        </div>

        <footer className={styles.footer}>
          <span role="status" aria-live="polite">{status || uiText("预览与导出使用同一张卡面。", uiLocale)}</span>
        </footer>
      </section>

      {previewModel ? (
        <div className={styles.exportMount} aria-hidden="true">
          <div ref={exportRef}>
            <TeamShareCard model={previewModel} />
          </div>
        </div>
      ) : null}
    </div>
  )
}
