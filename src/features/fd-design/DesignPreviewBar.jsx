import { translateUiText as uiText } from '../../lib/uiText.js'
import { Link, useLocation } from 'react-router-dom'
import { withDesignPreview } from './designPreview.js'
import styles from './DesignPreviewBar.module.css'

export default function DesignPreviewBar({ design, locale = 'zh-CN' }) {
  const location = useLocation()
  if (!design) return null
  const isEn = locale === 'en-US'
  const currentPath = `${location.pathname}${location.search}${location.hash}`

  return (
    <aside className={styles.bar} aria-label={isEn ? 'Design preview controls' : uiText("设计预览控制", locale)}>
      <div className={styles.identity}>
        <b>FD / {design === 'kpr5' ? '05' : design === 'kpr4' ? '04' : design === 'kpr3' ? '03' : design === 'kpr' ? '02' : '01'}</b>
        <span>{isEn ? 'DESIGN PREVIEW' : uiText("设计预览", locale)}</span>
        <em>{isEn ? 'Fries Cup · local design study' : uiText("薯条杯 · 设计样板", locale)}</em>
      </div>
      <nav aria-label={isEn ? 'Compare designs' : uiText("切换设计版本", locale)}>
        <Link to={withDesignPreview(currentPath, 'kpr5')} replace preventScrollReset aria-current={design === 'kpr5' ? 'page' : undefined}>
          {isEn ? 'New' : uiText("新版", locale)}
        </Link>
        <Link to={withDesignPreview(currentPath, 'original')} replace preventScrollReset aria-current={design === 'original' ? 'page' : undefined}>
          {isEn ? 'Original' : uiText("原版", locale)}
        </Link>
      </nav>
    </aside>
  )
}
