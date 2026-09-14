import { useEffect, useId, useRef, useState } from 'react'
import styles from './SeasonParticipationPage.module.css'

export default function RegistrationLogoField({ image, url, disabled, onChange, onReading }) {
  const id = useId()
  const reader = useRef(null)
  const [error, setError] = useState('')
  const [reading, setReading] = useState(false)
  const [imageType, setImageType] = useState('image/png')
  useEffect(() => () => reader.current?.abort(), [])
  const preview = image ? `data:${imageType};base64,${image}` : url
  function select(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setError('')
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) { setError('请选择 PNG、JPG 或静态 WebP 图片。'); return }
    if (!file.size || file.size > 2 * 1024 * 1024) { setError('队伍 Logo 不能超过 2 MB，请压缩后再选择。'); return }
    reader.current?.abort()
    const current = new FileReader()
    reader.current = current
    setReading(true); onReading(true)
    current.onload = () => {
      setImageType(file.type)
      onChange({ image: String(current.result).split(',')[1], url: '' })
      setReading(false); onReading(false)
    }
    current.onerror = () => { setError('图片读取失败，请重新选择。'); setReading(false); onReading(false) }
    current.readAsDataURL(file)
  }
  return <fieldset className={styles.logoField} disabled={disabled || reading}>
    <legend>队伍 Logo（可选）</legend>
    <div className={styles.logoEditor}>
      <div className={styles.logoPreview}>{preview ? <img src={preview} alt="队伍 Logo 预览" /> : <span>队标预览</span>}</div>
      <div className={styles.logoControls}>
        <label htmlFor={id}>{preview ? '更换队伍 Logo' : '上传队伍 Logo'}<input id={id} type="file" accept="image/png,image/jpeg,image/webp" onChange={select} aria-describedby={`${id}-help`} /></label>
        <p id={`${id}-help`}>PNG、JPG 或静态 WebP，最大 2 MB。保留透明背景，完整显示队标。</p>
        <p role="status">{reading ? '正在读取图片…' : image ? '已选择新图片，保存报名资料后生效。' : '队标将用于赛管审核和公开赛事展示。'}</p>
        {preview && <button type="button" onClick={() => { onChange({ image: undefined, url: '' }); setError('') }}>移除队标</button>}
      </div>
    </div>
    {error && <p className={styles.error} role="alert">{error}</p>}
    <details><summary>使用已有图片链接</summary><label>HTTPS 图片链接<input type="url" value={url || ''} maxLength={1000} placeholder="https://…" onChange={event => { onChange({ image: undefined, url: event.target.value }); setError('') }} /></label></details>
  </fieldset>
}
