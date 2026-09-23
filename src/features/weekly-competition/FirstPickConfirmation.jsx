import { useEffect, useRef, useState } from 'react'
import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { getPlatformApiUrl } from '../auth/platformApi.js'
import { liveRoomWrite } from './liveRoomApi.js'
import styles from './OpeningSelectionPanel.module.css'

export default function FirstPickConfirmation({ data, disabled, send, mutate }) {
  const locale = useUiLocale(), opening = data.opening, access = opening.access
  const confirmations = opening.firstPick?.confirmations || []
  const teams = [data.match.teamA, data.match.teamB]
  const name = side => teams[side === 'A' ? 0 : 1]?.shortName || teams[side === 'A' ? 0 : 1]?.name
  const ownId = access.firstPickConfirmationTeams?.[0]
  const ownSide = ownId === teams[0].id ? 'A' : 'B'
  const [chooser, setChooser] = useState(confirmations.find(item => item.side === ownSide)?.chooserSide || '')
  const [image, setImage] = useState(''), [filename, setFilename] = useState(''), [message, setMessage] = useState(''), [reading, setReading] = useState(false)
  const pending = useRef(null), generation = useRef(0), inputRef = useRef(null)
  useEffect(() => () => { generation.current++ }, [])
  const canAct = opening.phase === 'NOT_STARTED' ? access.canBegin : access.canConfirmFirstPick
  const evidence = opening.firstPick?.evidence || []
  async function chooseFile(file) {
    const token = ++generation.current
    pending.current = null; setImage(''); setMessage(''); setFilename('')
    if (!file) { setReading(false); return }
    if (!file.size || file.size > 5 * 1024 * 1024) { setReading(false); setMessage(uiText('请选择不超过 5 MB 的截图。', locale)); return }
    setReading(true)
    try {
      const value = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file) })
      if (generation.current === token) { setImage(value); setFilename(file.name) }
    } catch { if (generation.current === token) setMessage(uiText('截图无法读取，请重新选择。', locale)) }
    finally { if (generation.current === token) setReading(false) }
  }
  async function upload() {
    if (disabled || !image || reading) return
    pending.current ||= { image: image.slice(image.indexOf(',') + 1), expectedRevision: opening.revision, clientKey: crypto.randomUUID() }
    const saved = await mutate(async () => {
      try { return await liveRoomWrite(data.match.id, '/opening/evidence', pending.current) }
      catch (error) { if (error.status && error.status < 500) pending.current = null; throw error }
    }, uiText('截图已保存，请赛管核对首图选择权。', locale))
    if (saved) { pending.current = null; setImage(''); setFilename(''); if (inputRef.current) inputRef.current.value = '' }
  }
  return <div className={styles.firstPickConfirmation}>
    <p>{uiText('由赛管直接确认，或双方操作代表确认同一结果，即可进入选图。', locale)}</p>
    <div className={styles.confirmationTeams}>{['A', 'B'].map(side => {
      const vote = confirmations.find(item => item.side === side)
      return <div key={side} data-confirmed={Boolean(vote?.chooserSide)}><small>TEAM {side}</small><strong>{name(side)}</strong><span>{vote?.chooserSide ? uiText('已确认：{0} 获得选择权', locale, [name(vote.chooserSide)]) : uiText('等待确认', locale)}</span>{vote?.by && <small>{vote.by}</small>}</div>
    })}</div>
    {canAct ? <form onSubmit={event => { event.preventDefault(); send(opening.phase === 'NOT_STARTED' ? 'BEGIN' : 'CONFIRM_FIRST_PICK', { chooserSide: chooser, ...(ownId ? { teamId: ownId } : {}) }) }}>
      <label>{uiText('获得首图选择权的队伍', locale)}<select value={chooser} onChange={event => setChooser(event.target.value)} required disabled={disabled}><option value="">{uiText('选择队伍', locale)}</option>{['A', 'B'].map(side => <option value={side} key={side}>{name(side)}</option>)}</select></label>
      <button className={styles.primary} disabled={disabled || !chooser}>{uiText(access.staffFirstPick ? '赛管确认，进入选图' : '确认本队意见', locale)}</button>
    </form> : <p role="status">{uiText('等待赛管或双方操作代表确认首图选择权。', locale)}</p>}
    {(access.canUploadFirstPickEvidence || evidence.length > 0) && <details className={styles.firstPickEvidence}>
      <summary>{uiText('对方未确认或有争议？提交截图', locale)}{evidence.length ? ` · ${evidence.length}` : ''}</summary>
      <p>{uiText('截图仅供本场赛管和双方代表查看，由赛管核对处理；上传不会自动判定结果。', locale)}</p>
      {evidence.length > 0 && <div className={styles.evidenceList}>{evidence.map(item => <a key={item.id} href={getPlatformApiUrl(item.path)} target="_blank" rel="noopener noreferrer"><img src={getPlatformApiUrl(item.path)} alt={uiText('{0} 提交的截图', locale, [item.by])} loading="lazy" /><span>{item.by}</span></a>)}</div>}
      {access.canUploadFirstPickEvidence && evidence.length < 4 && <div className={styles.evidenceUpload}>
        <label>{uiText('上传证据截图', locale)}<input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" disabled={disabled || reading} onChange={event => chooseFile(event.target.files?.[0])} /></label>
        <small>{uiText('PNG / JPG / WebP，每张最多 5 MB，本场最多 4 张。', locale)}</small>
        {filename && <span>{filename}</span>}{message && <p role="alert">{message}</p>}
        <button type="button" className={styles.primary} disabled={disabled || reading || !image} onClick={upload}>{uiText(reading ? '正在读取截图…' : '保存截图，请赛管核对', locale)}</button>
      </div>}
    </details>}
  </div>
}
