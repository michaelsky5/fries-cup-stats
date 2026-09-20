import styles from './SeasonParticipationPage.module.css'
import { useState } from 'react'
import { useRegistrationDraft } from './registrationDraftGuard.jsx'
import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'

export function MemberEligibilityEditor({ member, busy, onSave, eligibilityRequired = true }) {
  const uiLocale = useUiLocale()
  const [dirty, setDirty] = useState(false)
  const [reset, setReset] = useState(0)
  useRegistrationDraft(dirty, { label: '本人参赛资料', busy, discard: () => { setReset(value => value + 1); setDirty(false) } })
  return <details className={styles.eligibilityEditor} open={eligibilityRequired && !member.eligibility}><summary>{uiText('修改本人的报名与资格资料', uiLocale)}</summary>
    <form key={reset} onChange={() => setDirty(true)} onSubmit={async event => { event.preventDefault(); const form = new FormData(event.currentTarget); if (await onSave({ profile: { displayName: form.get('displayName').trim(), battleTag: form.get('battleTag').trim(), role: form.get('role') }, ...(eligibilityRequired ? { eligibility: readWeeklyEligibility(form) } : {}) })) setDirty(false) }}>
      <div className={styles.fields}><label>本人称呼<input name="displayName" defaultValue={member.displayName} required maxLength={80} disabled={busy} /></label><label>完整 BattleTag<input name="battleTag" defaultValue={member.battleTag} required pattern={'\\s*[^\\s]+#[0-9]+\\s*'} maxLength={80} disabled={busy} /></label><label>报名职责<select name="role" defaultValue={member.role} disabled={busy}><option value="DPS">输出</option><option value="TANK">重装</option><option value="SUP">支援</option><option value="FLEX">自由人</option><option value="UNKNOWN">待确定</option></select></label></div>
      {eligibilityRequired && <WeeklyEligibilityFields value={member.eligibility} disabled={busy} />}<button className={styles.primary} disabled={busy}>{uiText("本人确认并保存资料", uiLocale)}</button>
    </form>
  </details>
}

export function readWeeklyEligibility(form) {
  return {
    countryGroup: form.get('countryGroup'), owcs2026: form.get('owcs2026'),
    ranks: { tank: form.get('tankRank')?.trim(), damage: form.get('damageRank')?.trim(), support: form.get('supportRank')?.trim() },
    rulesAccepted: form.get('rulesAccepted') === 'on'
  }
}

export default function WeeklyEligibilityFields({ value, disabled = false }) {
  const uiLocale = useUiLocale()
  return <fieldset disabled={disabled} className={styles.eligibilityFields}>
    <legend>{uiText("本人参赛资格", uiLocale)}</legend>
    <p>{uiText("用于赛事资格核验与对阵分档，仅本人、队伍负责人和有权限的赛管可查看。周赛不设段位门槛。", uiLocale)}</p>
    <div className={styles.fields}>
      <label>{uiText("国籍／地区范围", uiLocale)}<select name="countryGroup" defaultValue={value?.countryGroup || ''} required>
        <option value="" disabled>{uiText("请选择", uiLocale)}</option><option value="CN_HMT">{uiText("中国（含港澳台）", uiLocale)}</option><option value="OTHER">{uiText("其他", uiLocale)}</option>
      </select></label>
      <label>{uiText("OWCS 2026 参赛经历", uiLocale)}<select name="owcs2026" defaultValue={value?.owcs2026 || ''} required>
        <option value="" disabled>{uiText("请选择", uiLocale)}</option><option value="NONE">{uiText("没有参加", uiLocale)}</option><option value="QUALIFIERS">{uiText("仅海选／公开预选，未进入正赛名单", uiLocale)}</option><option value="MAIN_EVENT">{uiText("进入过任一赛区正赛大名单", uiLocale)}</option>
      </select></label>
    </div>
    <p>{uiText("进入过 OWCS 2026 正赛大名单的选手不符合本届周赛资格。KR、JP 队伍每张地图的首发须包含至少两名中国（含港澳台）选手。", uiLocale)}</p>
    <div className={styles.fields}>
      { [['tank', '重装'], ['damage', '输出'], ['support', '支援']].map(([key, label]) => <label key={key}>{uiText('{0}当前段位', uiLocale, [uiText(label, uiLocale)])}<input name={`${key}Rank`} defaultValue={value?.ranks?.[key] || ''} required maxLength={40} placeholder={uiText("例如：大师 3；未定级请填未定级", uiLocale)} /></label>) }
    </div>
    <a className={styles.rulebookLink} href="/rules/weekly-rules-v2.0.docx" target="_blank" rel="noreferrer">阅读周赛 V2.0 规则书 ↗</a>
    <label className={styles.check}><input name="rulesAccepted" type="checkbox" required />{uiText("我已阅读规则，以上资料真实，且使用本人战网账号参赛。", uiLocale)}</label>
  </fieldset>
}
