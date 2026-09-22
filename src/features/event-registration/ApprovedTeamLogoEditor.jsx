import { useState } from 'react'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { translateUiText as uiText } from '../../lib/uiText.js'
import RegistrationLogoField from './RegistrationLogoField.jsx'
import { useRegistrationDraft } from './registrationDraftGuard.jsx'
import styles from './SeasonParticipationPage.module.css'

export default function ApprovedTeamLogoEditor({ logoUrl, busy, onSave }) {
  const locale = useUiLocale()
  const [draft, setDraft] = useState({ url: logoUrl })
  const [reading, setReading] = useState(false)
  const dirty = Boolean(draft.image) || draft.url !== logoUrl
  useRegistrationDraft(dirty, { label: '队伍队标', busy: busy || reading, discard: () => setDraft({ url: logoUrl }) })
  return <details className={styles.panel}>
    <summary>{uiText('上传或更换队标', locale)}</summary>
    <p>{uiText('队标可独立更新，无需撤回报名或重新确认队员。公开页面将在刷新后同步，缓存可能延迟约一分钟。', locale)}</p>
    <RegistrationLogoField image={draft.image} url={draft.url} disabled={busy} onChange={setDraft} onReading={setReading} allowUrl={false} selectedMessage={uiText('已选择新图片，点击“保存队标”后生效。', locale)} />
    <div className={styles.actions}>
      <button type="button" className={styles.primary} disabled={busy || reading || !dirty} onClick={async () => {
        const result = await onSave({ expectedLogoUrl: logoUrl, ...(draft.image ? { logoImage: draft.image } : { remove: true }) })
        if (result) setDraft({ url: result.logoUrl })
      }}>{uiText(busy ? '正在保存…' : '保存队标', locale)}</button>
      <button type="button" disabled={busy || reading || !dirty} onClick={() => setDraft({ url: logoUrl })}>{uiText('取消修改', locale)}</button>
    </div>
  </details>
}
