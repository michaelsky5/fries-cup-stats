import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { pickUiLocale } from '../../lib/uiText.js'
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
  const dialogTitle = pickUiLocale(uiLocale, '导出战队分享图', 'Share team roster', '팀 명단 공유', '匯出戰隊分享圖')
  const exportRef = useRef(null)
  const dialogRef = useRef(null)
  const previewAreaRef = useRef(null)
  const previewToggleRef = useRef(null)
  const previewId = useId()
  const initializedRef = useRef('')
  const exportRequestRef = useRef(0)
  const onCloseRef = useRef(onClose)
  const [previewScale, setPreviewScale] = useState(.4)
  const [status, setStatus] = useState('')
  const [exporting, setExporting] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [zoomed, setZoomed] = useState(false)
  const [generatedFile, setGeneratedFile] = useState(null)
  const [heroSelections, setHeroSelections] = useState({})
  const automaticSelections = useMemo(() => createAutomaticHeroSelections(model), [model])
  const editorRows = useMemo(() => getHeroEditorRows(model), [model])
  const previewModel = useMemo(() => applyHeroSelections(model, heroSelections), [heroSelections, model])
  const previewSignature = useMemo(() => JSON.stringify(previewModel), [previewModel])
  const selectionSummary = useMemo(
    () => getHeroSelectionSummary(model, heroSelections),
    [heroSelections, model]
  )
  const selectionKey = `${model?.seasonId}:${model?.team?.raw?.team_id || model?.team?.shortName}`

  useEffect(() => { onCloseRef.current = onClose }, [onClose])

  useEffect(() => {
    if (!open) { initializedRef.current = ''; exportRequestRef.current += 1; setGeneratedFile(null); setExporting(false); return }
    if (initializedRef.current === selectionKey) return
    initializedRef.current = selectionKey
    exportRequestRef.current += 1
    setExporting(false)
    setStatus('')
    setEditorOpen(false)
    setZoomed(false)
    setGeneratedFile(null)
    setHeroSelections(automaticSelections)
  }, [automaticSelections, open, selectionKey])

  useEffect(() => () => {
    if (generatedFile) window.setTimeout(() => URL.revokeObjectURL(generatedFile.url), 60000)
  }, [generatedFile])

  useEffect(() => {
    if (!open) return undefined
    const previousFocus = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialogRef.current?.querySelector('button')?.focus()
    return () => {
      document.body.style.overflow = previousOverflow
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true })
    }
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    const handleKeyDown = event => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        if (zoomed) { setZoomed(false); previewToggleRef.current?.focus() }
        else onCloseRef.current?.()
        return
      }
      if (event.key !== 'Tab') return
      const focusable = Array.from(dialogRef.current?.querySelectorAll('button:not(:disabled), select:not(:disabled), a[href], [tabindex="0"]') || []).filter(node => !node.closest('[hidden]') && node.getClientRects().length)
      const first = focusable[0]
      const last = focusable.at(-1)
      if (!first) return
      if (event.shiftKey && (document.activeElement === first || !dialogRef.current?.contains(document.activeElement))) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && (document.activeElement === last || !dialogRef.current?.contains(document.activeElement))) { event.preventDefault(); first.focus() }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, zoomed])

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
    const request = ++exportRequestRef.current
    setExporting(true)
    setStatus('正在生成战队分享图...')
    try {
      const file = await exportTeamSharePng(exportRef.current, createTeamShareFileName({
        seasonCode: model.seasonLabel,
        teamShortName: model.team.shortName
      }))
      if (request !== exportRequestRef.current) {
        window.setTimeout(() => URL.revokeObjectURL(file.url), 60000)
        return
      }
      setGeneratedFile({ ...file, signature: previewSignature })
      setStatus(pickUiLocale(uiLocale, '分享图已生成，可再次保存。', 'Your image is ready to save again.', '이미지가 준비되었습니다. 다시 저장할 수 있습니다.', '分享圖已生成，可再次儲存。'))
    } catch (error) {
      console.error('TEAM_SHARE_EXPORT_FAILED', error)
      if (request === exportRequestRef.current) setStatus('导出失败，请稍后重试。')
    } finally {
      if (request === exportRequestRef.current) setExporting(false)
    }
  }

  const handleAutomaticSelection = () => {
    setGeneratedFile(null)
    setHeroSelections(automaticSelections)
    setStatus('已按真实使用记录自动避开可避免的重复英雄。')
  }

  const handleHeroChange = (playerKey, heroKey) => {
    setGeneratedFile(null)
    setHeroSelections(current => ({ ...current, [playerKey]: heroKey }))
    setStatus('英雄画面已调整，仅影响本次分享图。')
  }

  const toggleZoom = () => {
    setZoomed(current => !current)
    requestAnimationFrame(() => previewAreaRef.current?.scrollTo(0, 0))
  }
  const shownScale = zoomed ? 1 : previewScale
  const readyFile = generatedFile?.signature === previewSignature ? generatedFile : null

  if (!open) return null

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label={dialogTitle}>
      <section ref={dialogRef} className={styles.dialog} data-editor-open={editorOpen ? 'true' : 'false'} data-expanded={zoomed || undefined}>
        <header className={styles.header}>
          <div>
            <span>TEAM SHARE</span>
            <h2>{dialogTitle}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label={uiText("关闭", uiLocale)}>×</button>
        </header>

        <div className={styles.toolArea} hidden={zoomed}>
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
                disabled={!model || !editorRows.length || exporting}
                aria-expanded={editorOpen}
              >
                {editorOpen ? uiText("收起调整", uiLocale) : uiText("调整英雄", uiLocale)}
              </button>
              <button
                type="button"
                className={styles.autoButton}
                onClick={handleAutomaticSelection}
                disabled={!model || !editorRows.length || exporting}
              >{pickUiLocale(uiLocale, '自动去重', 'Auto-pick heroes', '영웅 자동 선택', '自動去重')}</button>
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
                      disabled={candidates.length < 2 || exporting}
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

        <div className={styles.previewTools}>
          <span>{zoomed ? pickUiLocale(uiLocale, '滑动查看完整卡面', 'Scroll to inspect the full image', '스크롤하여 전체 이미지 보기', '滑動查看完整卡面') : pickUiLocale(uiLocale, '卡面预览', 'Image preview', '이미지 미리보기', '卡面預覽')}</span>
          <button ref={previewToggleRef} type="button" onClick={toggleZoom} aria-expanded={zoomed} aria-controls={previewId} disabled={!model}>{zoomed ? pickUiLocale(uiLocale, '返回分享设置', 'Back to share options', '공유 설정으로', '返回分享設定') : pickUiLocale(uiLocale, '放大查看', 'View larger', '크게 보기', '放大查看')} <span aria-hidden="true">{zoomed ? '↙' : '↗'}</span></button>
        </div>
        <div id={previewId} className={styles.previewArea} data-zoomed={zoomed || undefined} ref={previewAreaRef} role="region" aria-label={pickUiLocale(uiLocale, '战队分享图预览', 'Team share image preview', '팀 공유 이미지 미리보기', '戰隊分享圖預覽')} tabIndex={zoomed ? 0 : -1}>
          {model ? (
            <div className={styles.previewFrame} style={{ width: 1600 * shownScale, height: 900 * shownScale }}>
              <div className={styles.previewScale} style={{ transform: `scale(${shownScale})` }}>
                <TeamShareCard model={previewModel} />
              </div>
            </div>
          ) : (
            <div className={styles.emptyState}>{uiText("当前战队暂无可导出的数据。", uiLocale)}</div>
          )}
        </div>

        <footer className={styles.footer}>
          <span role="status" aria-live="polite">{uiText(status || "预览与导出使用同一张卡面。", uiLocale)}</span>
          {readyFile ? <a className={styles.exportButton} href={readyFile.url} download={readyFile.fileName}>{pickUiLocale(uiLocale, '保存 PNG', 'Save PNG', 'PNG 저장', '儲存 PNG')}</a> : <button type="button" className={styles.exportButton} onClick={handleExport} disabled={!model || exporting}>{exporting ? uiText("正在生成", uiLocale) : uiText("导出 PNG", uiLocale)}</button>}
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
