import { useEffect, useId, useRef, useState } from 'react'
import styles from './SeasonParticipationPage.module.css'
import { detectRegistrationLogoType, REGISTRATION_LOGO_LIMIT } from './registrationLogoInput.js'
import { getPublicLogoSources } from '../../lib/teamLogoResolver.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { translateUiText as uiText } from '../../lib/uiText.js'

export default function RegistrationLogoField({ image, url, disabled, onChange, onReading, allowUrl = true, selectedMessage = '已选择新图片，保存报名资料后供赛管审核。' }) {
  const id = useId()
  const locale = useUiLocale()
  const reader = useRef(null)
  const [error, setError] = useState('')
  const [reading, setReading] = useState(false)
  const [imageType, setImageType] = useState('image/png')
  useEffect(() => () => reader.current?.abort(), [])
  const preview = image ? `data:${imageType};base64,${image}` : url ? getPublicLogoSources(url)[0] : ''
  function select(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setError('')
    if (!file.size) { setError('这张图片是空文件，请重新导出后选择。'); return }
    if (file.size > REGISTRATION_LOGO_LIMIT) { setError('队标不能超过 2 MB，请压缩后再选择。'); return }
    reader.current?.abort()
    const current = new FileReader()
    reader.current = current
    setReading(true); onReading(true)
    current.onload = () => {
      const data = String(current.result).split(',')[1]
      const type = detectRegistrationLogoType(Uint8Array.from(atob(data.slice(0, 24)), value => value.charCodeAt(0)))
      if (type) {
        setImageType(type)
        onChange({ image: data, url: '' })
      } else {
        setError('文件内容不是 PNG、JPG 或 WebP 图片。请重新导出图片，不能只修改文件后缀。')
      }
      setReading(false); onReading(false)
    }
    current.onerror = () => { setError('图片读取失败，请重新选择。'); setReading(false); onReading(false) }
    current.readAsDataURL(file)
  }
  return <fieldset className={styles.logoField} disabled={disabled || reading}>
    <legend>{uiText('队标（可选）', locale)}</legend>
    <div className={styles.logoEditor}>
      <div className={styles.logoPreview}>{preview ? <img src={preview} alt={uiText('队标预览', locale)} /> : <span>{uiText('队标预览', locale)}</span>}</div>
      <div className={styles.logoControls}>
        <label htmlFor={id}>{uiText(preview ? '更换队标' : '上传队标', locale)}<input id={id} type="file" accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp" onChange={select} aria-describedby={`${id}-help`} /></label>
        <p id={`${id}-help`}>{uiText('PNG、JPG 或静态 WebP，最大 2 MB。PNG / WebP 的透明背景会保留；JPG 不支持透明。棋盘格用于检查透明区域。', locale)}</p>
        <p role="status">{uiText(reading ? '正在读取图片…' : image ? selectedMessage : '队标将用于赛管审核和公开赛事展示。', locale)}</p>
        {preview && <button type="button" onClick={() => { onChange({ image: undefined, url: '' }); setError('') }}>{uiText('移除队标', locale)}</button>}
      </div>
    </div>
    {error && <p className={styles.error} role="alert">{uiText(error, locale)}</p>}
    {allowUrl && <details><summary>{uiText('使用已有图片链接', locale)}</summary><label>{uiText('HTTPS 图片链接', locale)}<input type="url" value={url || ''} maxLength={1000} placeholder="https://…" onChange={event => { onChange({ image: undefined, url: event.target.value }); setError('') }} /></label></details>}
  </fieldset>
}
