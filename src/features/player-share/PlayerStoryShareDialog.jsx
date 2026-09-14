import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { translateUiText } from '../../lib/uiText.js'
import { formatOwHeroName } from '../../lib/heroes.js'
import { getRoleLabel, getRoleEnLabel } from '../../lib/leaderboardSelectors.js'
import { resolvePlayerStorySelection } from '../player-dossier/playerPersonalStory.js'
import { getPlayerStoryCardModel } from './playerStoryCardModel.js'
import { createPlayerShareFileName } from './playerShareFileName.js'
import { exportPlayerSharePng } from './playerShareRenderer.js'
import PlayerStoryShareCard from './PlayerStoryShareCard.jsx'
import styles from './PlayerStoryShareDialog.module.css'

export default function PlayerStoryShareDialog({ dossier, appearances, seasonCode, locale, initialSelection, onClose }) {
  const [role, setRole] = useState(initialSelection.role || dossier.roleEntries[0].role)
  const [selection, setSelection] = useState(initialSelection)
  const [scale, setScale] = useState(0)
  const [zoomed, setZoomed] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [status, setStatus] = useState('')
  const dialogRef = useRef(null)
  const previewRef = useRef(null)
  const exportRef = useRef(null)
  const previewToggleRef = useRef(null)
  const text = (zh, en) => translateUiText(locale === 'en-US' ? en : zh, locale)
  const chosen = useMemo(() => resolvePlayerStorySelection(appearances, role, selection), [appearances, role, selection])
  const model = useMemo(() => getPlayerStoryCardModel({ dossier, appearances, role, selection, seasonCode, locale }), [dossier, appearances, role, selection, seasonCode, locale])

  useEffect(() => {
    const opener = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialogRef.current.querySelector('button')?.focus()
    return () => {
      document.body.style.overflow = previousOverflow
      if (opener instanceof HTMLElement && document.contains(opener)) opener.focus({ preventScroll: true })
    }
  }, [])

  useEffect(() => {
    const focusable = () => [...dialogRef.current.querySelectorAll('button:not(:disabled), select:not(:disabled), a[href], [tabindex="0"]')].filter(element => !element.closest('fieldset:disabled, [hidden]') && element.getClientRects().length > 0)
    const keydown = event => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        if (zoomed) { setZoomed(false); previewToggleRef.current?.focus() }
        else onClose()
      }
      if (event.key !== 'Tab') return
      const elements = focusable()
      if (event.shiftKey ? document.activeElement === elements[0] : document.activeElement === elements.at(-1)) {
        event.preventDefault()
        ;(event.shiftKey ? elements.at(-1) : elements[0])?.focus()
      }
    }
    window.addEventListener('keydown', keydown)
    return () => window.removeEventListener('keydown', keydown)
  }, [onClose, zoomed])

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setScale(Math.max(0, Math.min(entry.contentRect.width / 1600, entry.contentRect.height / 900, .78))))
    observer.observe(previewRef.current)
    return () => observer.disconnect()
  }, [])

  const change = values => { setSelection(previous => ({ ...previous, ...values })); setStatus('') }
  const toggleZoom = () => {
    setZoomed(value => !value)
    requestAnimationFrame(() => previewRef.current?.scrollTo(0, 0))
  }
  const previewScale = zoomed ? 1 : scale
  const exportCard = async () => {
    if (!model || exporting) return
    setExporting(true)
    setStatus(text('正在生成分享图…', 'Creating your image…'))
    try {
      await exportPlayerSharePng(exportRef.current, createPlayerShareFileName({ seasonCode, nickname: dossier.identity.displayName, role: `${role}_${model.kind}${model.kind === 'match' ? `_${chosen.match.matchId}` : model.kind === 'hero' ? `_${chosen.hero.key}` : ''}` }))
      setStatus(text('分享图已生成。', 'Your image is ready.'))
    } catch {
      setStatus(text('导出失败，请稍后重试。', 'Export failed. Please try again.'))
    } finally { setExporting(false) }
  }

  return createPortal(<div className={styles.overlay} data-design="signal">
    <section className={styles.dialog} data-expanded={zoomed || undefined} ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="player-story-share-title">
      <header className={styles.header}><div><p>MY FRIES CUP</p><h2 id="player-story-share-title">{text('留下你想分享的这一面。', 'Choose what you want to share.')}</h2></div><button type="button" onClick={onClose} aria-label={text('关闭分享', 'Close sharing')}>×</button></header>
      <fieldset className={styles.controls} disabled={exporting} hidden={zoomed}>
        <legend className={styles.srOnly}>{text('分享内容', 'Share content')}</legend>
        <div className={styles.kinds} aria-label={text('选择分享主题', 'Choose a share theme')}>{[['season', '我的赛季', 'My season'], ['match', '代表一战', 'A match to keep'], ['hero', '代表英雄', 'My hero']].map(([kind, zh, en]) => <button key={kind} type="button" disabled={kind === 'match' ? !chosen.matches.length : kind === 'hero' ? !chosen.heroes.length : false} aria-pressed={chosen.kind === kind} onClick={() => change({ kind })}>{text(zh, en)}</button>)}</div>
        <div className={styles.options}>
          <div className={styles.roles}><span>{text('职责', 'Role')}</span><div aria-label={text('分享职责', 'Role to share')}>{dossier.roleEntries.map(item => <button type="button" key={item.role} aria-pressed={role === item.role} onClick={() => { setRole(item.role); setSelection({ kind: chosen.kind }); setStatus('') }}>{text(getRoleLabel(item.role), getRoleEnLabel(item.role))}</button>)}</div></div>
          {chosen.kind === 'match' ? <label>{text('选一场你想留下的比赛', 'Choose a match to keep')}<select value={chosen.match.key} onChange={event => change({ matchKey: event.target.value })}>{chosen.matches.map(match => <option key={match.key} value={match.key}>{Number.isFinite(Date.parse(match.date)) ? match.dateLabel : text('日期未记录', 'Date unknown')} · vs {match.opponent.short}{Number.isFinite(match.rating) ? ` · ${match.rating.toFixed(1)} / 10` : ''}</option>)}</select></label> : chosen.heroes.length ? <label>{chosen.kind === 'hero' ? text('选一个本季出场的英雄', 'Choose a recorded hero') : text('赛季卡面英雄', 'Season card artwork')}<select value={chosen.hero.key} onChange={event => change({ heroKey: event.target.value })}>{chosen.heroes.map(hero => <option value={hero.key} key={hero.key}>{formatOwHeroName(hero.hero, locale)} · {hero.maps} {text('图', hero.maps === 1 ? 'map' : 'maps')}</option>)}</select></label> : <p className={styles.scope}>{text('展示所选职责的登记身份。', 'The registered identity for the selected role.')}</p>}
        </div>
      </fieldset>
      <div className={styles.previewTools}><p>{zoomed ? text('滑动查看完整卡面', 'Scroll to inspect the full image') : text('卡面预览', 'Image preview')}</p><button ref={previewToggleRef} type="button" aria-expanded={zoomed} aria-controls="player-story-preview" onClick={toggleZoom}>{zoomed ? text('返回分享设置', 'Back to share options') : text('放大查看', 'View larger')} <span aria-hidden="true">{zoomed ? '↙' : '↗'}</span></button></div>
      <div id="player-story-preview" className={styles.preview} data-zoomed={zoomed || undefined} ref={previewRef} role="region" aria-label={text('分享图预览', 'Share image preview')} tabIndex={zoomed ? 0 : -1}><div className={styles.frame} style={{ width: 1600 * previewScale, height: 900 * previewScale }}><div className={styles.scaled} style={{ transform: `scale(${previewScale})` }}><PlayerStoryShareCard model={model} /></div></div></div>
      <footer className={styles.footer}><p role="status">{status || text('选择会直接用于导出的卡面。', 'Your choices are reflected in the exported image.')}</p><button type="button" onClick={exportCard} disabled={exporting}>{exporting ? text('正在生成…', 'Creating…') : text('保存分享图', 'Save image')} ↗</button></footer>
      <div className={styles.exportMount} aria-hidden="true"><div ref={exportRef}><PlayerStoryShareCard model={model} /></div></div>
    </section>
  </div>, document.body)
}
