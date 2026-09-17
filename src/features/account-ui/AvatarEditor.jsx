import { useEffect, useRef, useState } from 'react'
import { OW_HEROES } from '../../lib/heroes.js'
import AccountAvatar from './AccountAvatar.jsx'
import styles from './AvatarEditor.module.css'

const heroUrl = hero => `/heroes/${hero.role}/${hero.assetKey.replaceAll('-', '_')}.png`
const readImage = file => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve(reader.result)
  reader.onerror = () => reject(new Error('READ_ERROR'))
  reader.readAsDataURL(file)
})

export default function AvatarEditor({ user, savedUrl, draft, onChange, disabled, locale }) {
  const en = locale === 'en-US'
  const t = (zh, english) => en ? english : zh
  const dialog = useRef(null), opener = useRef(null), canvas = useRef(null), generation = useRef(0)
  const [open, setOpen] = useState(false), [tab, setTab] = useState('hero')
  const [query, setQuery] = useState(''), [role, setRole] = useState('all')
  const [selection, setSelection] = useState(null), [source, setSource] = useState(null)
  const [zoom, setZoom] = useState(1), [x, setX] = useState(50), [y, setY] = useState(50)
  const [error, setError] = useState(''), [loading, setLoading] = useState(false)
  useEffect(() => {
    if (open) dialog.current?.showModal()
    else dialog.current?.close()
  }, [open])
  useEffect(() => () => { generation.current++ }, [])
  const size = source ? Math.min(source.image.naturalWidth, source.image.naturalHeight) / zoom : 0
  const left = source ? (source.image.naturalWidth - size) * x / 100 : 0
  const top = source ? (source.image.naturalHeight - size) * y / 100 : 0
  useEffect(() => {
    if (!source || !canvas.current || tab !== 'upload') return
    const context = canvas.current.getContext('2d')
    context.clearRect(0, 0, 256, 256)
    context.drawImage(source.image, left, top, size, size, 0, 0, 256, 256)
  }, [source, left, top, size, tab, open])

  async function chooseFile(event) {
    const file = event.target.files?.[0]
    if (!file) return
    const current = ++generation.current
    setError('')
    if (file.size > 2 * 1024 * 1024) { setError(t('图片不能超过 2 MB，请先缩小后再上传。', 'Choose an image smaller than 2 MB.')); return }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setError(t('请选择 JPG、PNG 或静态 WebP。', 'Choose a JPG, PNG or static WebP.')); return }
    setLoading(true)
    try {
      const data = await readImage(file)
      const image = new Image()
      image.src = data
      await image.decode()
      if (current !== generation.current) return
      if (image.naturalWidth * image.naturalHeight > 16_000_000 || Math.min(image.naturalWidth, image.naturalHeight) < 96) throw new Error('DIMENSIONS')
      setSource({ image, data, name: file.name })
      setZoom(1); setX(50); setY(50)
    } catch {
      if (current === generation.current) setError(t('图片无法读取，请选择短边至少 96 像素、总像素不超过 1600 万的静态图片。', 'Use a readable static image, at least 96 px on each side and no more than 16 megapixels.'))
    } finally { if (current === generation.current) setLoading(false) }
  }
  function close() { generation.current++; setLoading(false); setOpen(false); setSource(null); setError(''); opener.current?.focus() }
  function apply() {
    if (tab === 'hero' && selection) onChange({ command: { type: 'hero', heroId: selection.id }, url: heroUrl(selection) })
    else if (tab === 'upload' && source && canvas.current) onChange({ command: { type: 'upload', image: source.data.split(',')[1], crop: { x: left / source.image.naturalWidth, y: top / source.image.naturalHeight, size: 1 / zoom } }, url: canvas.current.toDataURL('image/webp', .85) })
    close()
  }
  const currentUrl = draft ? draft.url : savedUrl
  const currentHero = OW_HEROES.find(hero => heroUrl(hero) === currentUrl)
  const filtered = OW_HEROES.filter(hero => (role === 'all' || hero.role === role) && `${hero.zh} ${hero.en} ${hero.id}`.toLowerCase().includes(query.trim().toLowerCase()))
  return <div className={styles.editor} data-i18n-ignore>
    <AccountAvatar user={user} url={currentUrl} size={72} thumbnail={false} />
    <div className={styles.identity}><strong>{t('账号头像', 'Account avatar')}</strong><span>{currentHero ? t(currentHero.zh, currentHero.en) : currentUrl ? t('自定义头像', 'Custom avatar') : t('默认字母头像', 'Initials avatar')}</span><small>{t('在我的空间、账号入口和比赛交流中显示。', 'Shown in My Space, your account menu and match conversations.')}</small></div>
    <div className={styles.actions}><button ref={opener} type="button" disabled={disabled} onClick={() => { setSelection(currentHero || null); setTab('hero'); setOpen(true) }}>{t('更换头像', 'Change avatar')}</button>{currentUrl && <button type="button" disabled={disabled} onClick={() => onChange({ command: { type: 'default' }, url: null })}>{t('恢复默认', 'Use initials')}</button>}</div>
    <dialog ref={dialog} className={styles.dialog} onCancel={event => { event.preventDefault(); close() }} aria-labelledby="avatar-title">
      {open && <>
      <header><div><small>PLAYER IDENTITY</small><h2 id="avatar-title">{t('选择你的头像', 'Choose your avatar')}</h2></div><button type="button" className={styles.close} aria-label={t('关闭头像选择', 'Close avatar picker')} onClick={close}>×</button></header>
      <div className={styles.tabs} role="group" aria-label={t('头像来源', 'Avatar source')}>{[['hero', '英雄头像', 'Hero gallery'], ['upload', '上传图片', 'Upload image']].map(([key, zh, english]) => <button type="button" key={key} aria-pressed={tab === key} onClick={() => { setTab(key); setError('') }}>{t(zh, english)}</button>)}</div>
      <div className={styles.body}>
        {tab === 'hero' ? <><div className={styles.filters}><input aria-label={t('搜索英雄', 'Search heroes')} placeholder={t('搜索英雄名称', 'Search hero names')} value={query} onChange={event => setQuery(event.target.value)} /><select aria-label={t('英雄职责', 'Hero role')} value={role} onChange={event => setRole(event.target.value)}>{[['all', '全部职责', 'All roles'], ['tank', '重装', 'Tank'], ['damage', '输出', 'Damage'], ['support', '支援', 'Support']].map(([key, zh, english]) => <option key={key} value={key}>{t(zh, english)}</option>)}</select></div><div className={styles.gallery}>{filtered.map(hero => <button type="button" key={hero.id} aria-pressed={selection?.id === hero.id} aria-label={t(hero.zh, hero.en)} onClick={() => setSelection(hero)}><AccountAvatar url={heroUrl(hero)} name={t(hero.zh, hero.en)} size={56} /><span>{t(hero.zh, hero.en)}</span>{selection?.id === hero.id && <i aria-hidden="true">✓</i>}</button>)}</div>{!filtered.length && <p role="status">{t('没有找到英雄，试试另一个名称。', 'No heroes found. Try another name.')}</p>}</> : <>
          <label className={styles.upload}>{t(source ? '换一张图片' : '选择一张图片', source ? 'Choose another image' : 'Choose an image')}<input type="file" accept="image/jpeg,image/png,image/webp" onClick={event => { event.currentTarget.value = '' }} onChange={chooseFile} disabled={loading} /><small>{t('JPG / PNG / 静态 WebP · 原图 ≤ 2 MB', 'JPG / PNG / static WebP · up to 2 MB')}{source ? ` · ${source.name}` : ''}</small></label>
          {loading && <p role="status">{t('正在读取图片…', 'Reading image…')}</p>}
          {source && <div className={styles.crop}><canvas ref={canvas} width={256} height={256} aria-label={t('正方形头像裁剪预览', 'Square avatar crop preview')} /><div><strong>{t('调整画面', 'Adjust your image')}</strong><p>{t('让头像主体位于方框中心。', 'Keep the subject in the centre of the square.')}</p>{[[t('缩放', 'Zoom'), zoom, setZoom, 1, 3, .01], [t('左右位置', 'Horizontal position'), x, setX, 0, 100, 1], [t('上下位置', 'Vertical position'), y, setY, 0, 100, 1]].map(([label, value, setter, min, max, step]) => <label key={label}>{label}<input type="range" value={value} min={min} max={max} step={step} onChange={event => setter(Number(event.target.value))} /></label>)}</div></div>}
        </>}
        {error && <p className={styles.error} role="alert">{error}</p>}
      </div>
      <footer><p>{t('应用后点击“保存资料”，头像才会正式更新。', 'Apply, then save your profile to update your avatar.')}<span aria-live="polite">{tab === 'hero' && selection ? t(`已选择：${selection.zh}`, `Selected: ${selection.en}`) : ''}</span></p><div><button type="button" onClick={close}>{t('取消', 'Cancel')}</button><button type="button" className={styles.primary} disabled={loading || (tab === 'hero' ? !selection : !source)} onClick={apply}>{t('使用这个头像', 'Use this avatar')}</button></div></footer>
      </>}
    </dialog>
  </div>
}
