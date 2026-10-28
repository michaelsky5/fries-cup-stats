import { useState } from 'react'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import { translateUiText as uiText } from '../../lib/uiText.js'
import RegistrationLogoField from './RegistrationLogoField.jsx'
import { useRegistrationDraft } from './registrationDraftGuard.jsx'
import styles from './SeasonParticipationPage.module.css'
import { getPlatformApiUrl } from '../auth/platformApi.js'

export default function ApprovedTeamLogoEditor({ logoUrl, review, busy, onSave }) {
  const locale = useUiLocale()
  const [draft, setDraft] = useState({ url: logoUrl })
  const [reading, setReading] = useState(false)
  const [failedImage, setFailedImage] = useState(null)
  const dirty = Boolean(draft.image) || draft.url !== logoUrl
  useRegistrationDraft(dirty, { label: '队伍队标', busy: busy || reading, discard: () => setDraft({ url: logoUrl }) })
  return <details className={styles.panel}>
    <summary>{uiText('上传或更换队标', locale)}</summary>
    <p>{uiText('队标更换需经人工审核，审核通过前仍展示现有队标。', locale)}</p>
    {review?.status === 'PENDING' && <p role="status">{uiText('队标待审核；可以提交新图片替换本次申请。', locale)}</p>}
    {review?.status === 'RETURNED' && <p role="status">{uiText('队标已退回：{0}', locale, [review.reviewNote])}</p>}
    {['PENDING', 'RETURNED'].includes(review?.status) && review.imagePath && (failedImage === review
      ? <p>{uiText('待审图片暂时无法显示，请刷新确认状态后重试。', locale)}</p>
      : <img src={getPlatformApiUrl(review.imagePath)} alt={uiText('待审队标预览', locale)} style={{ width: 112, height: 112, objectFit: 'contain', maxWidth: '100%' }} onError={() => setFailedImage(review)} />)}
    <RegistrationLogoField image={draft.image} url={draft.url} disabled={busy} onChange={setDraft} onReading={setReading} allowUrl={false} selectedMessage={uiText('已选择新图片，提交审核后才会发布。', locale)} />
    <div className={styles.actions}>
      <button type="button" className={styles.primary} disabled={busy || reading || !dirty} onClick={async () => {
        const result = await onSave({ expectedLogoUrl: logoUrl, expectedReviewId: review?.status === 'PENDING' ? review.id : null, ...(draft.image ? { logoImage: draft.image } : { remove: true }) })
        if (result) setDraft({ url: result.logoUrl })
      }}>{uiText(busy ? '正在保存…' : '提交队标审核', locale)}</button>
      <button type="button" disabled={busy || reading || !dirty} onClick={() => setDraft({ url: logoUrl })}>{uiText('取消修改', locale)}</button>
    </div>
  </details>
}
