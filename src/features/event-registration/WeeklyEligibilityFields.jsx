import styles from './SeasonParticipationPage.module.css'
import { useState } from 'react'
import { useRegistrationDraft } from './registrationDraftGuard.jsx'
import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'
import RegionSelector from '../auth/RegionSelector.jsx'
import { registrationCountryValue, resolveRegionCode } from '../auth/regionPickerModel.js'

function CountryOrRegionField({ value, uiLocale, disabled }) {
  const [selected, setSelected] = useState(() => resolveRegionCode(value))
  const [other, setOther] = useState(() => resolveRegionCode(value) === 'OTHER' ? value.trim() : '')
  return <>
    <RegionSelector name="countryOrRegion" required disabled={disabled} label={uiText('国籍或国家、地区', uiLocale)} value={selected} onChange={setSelected} locale={uiLocale} />
    {selected === 'OTHER' && <label>{uiText('其他国家或地区', uiLocale)}<input name="countryOrRegionOther" value={other} onChange={event => setOther(event.target.value)} required maxLength={80} placeholder={uiText('请填写未列出的国家或地区', uiLocale)} /></label>}
  </>
}

export function MemberEligibilityEditor({ member, busy, onSave, eligibilityRequired = true, rulebook }) {
  const uiLocale = useUiLocale()
  const [dirty, setDirty] = useState(false)
  const [reset, setReset] = useState(0)
  useRegistrationDraft(dirty, { label: '本人参赛资料', busy, discard: () => { setReset(value => value + 1); setDirty(false) } })
  return <details className={styles.eligibilityEditor} open={eligibilityRequired && !member.eligibility}><summary>{uiText('修改本人的报名与资格资料', uiLocale)}</summary>
    <form key={reset} onChange={() => setDirty(true)} onSubmit={async event => { event.preventDefault(); const form = new FormData(event.currentTarget); if (await onSave({ profile: { displayName: form.get('displayName').trim(), battleTag: form.get('battleTag').trim(), role: form.get('role') }, ...(eligibilityRequired ? { eligibility: readWeeklyEligibility(form) } : {}) })) setDirty(false) }}>
      <div className={styles.fields}><label>本人称呼<input name="displayName" defaultValue={member.displayName} required maxLength={80} disabled={busy} /></label><label>完整 BattleTag<input name="battleTag" defaultValue={member.battleTag} required pattern={'\\s*[^\\s]+#[0-9]+\\s*'} maxLength={80} disabled={busy} /></label><label>报名职责<select name="role" defaultValue={member.role} disabled={busy}><option value="DPS">输出</option><option value="TANK">重装</option><option value="SUP">支援</option><option value="FLEX">自由人</option><option value="UNKNOWN">待确定</option></select></label></div>
      {eligibilityRequired && <WeeklyEligibilityFields rulebook={rulebook} value={member.eligibility} disabled={busy} />}<button className={styles.primary} disabled={busy}>{uiText("本人确认并保存资料", uiLocale)}</button>
    </form>
  </details>
}

export function readWeeklyEligibility(form) {
  return {
    countryOrRegion: registrationCountryValue(form.get('countryOrRegion'), form.get('countryOrRegionOther')), owcs2026: form.get('owcs2026'),
    ranks: { tank: form.get('tankRank')?.trim(), damage: form.get('damageRank')?.trim(), support: form.get('supportRank')?.trim() },
    rulesAccepted: form.get('rulesAccepted') === 'on',
    ...(form.get('rulesVersion') ? { rulesVersion: form.get('rulesVersion') } : {})
  }
}

export default function WeeklyEligibilityFields({ value, disabled = false, rulebook = { version: 'WEEKLY_V3_0', label: 'V3.0', url: 'https://fries-cup.com/rules/' } }) {
  const uiLocale = useUiLocale()
  const rulesVersion = rulebook?.version || 'WEEKLY_V3_0'
  return <fieldset disabled={disabled} className={styles.eligibilityFields}>
    <legend>{uiText("本人参赛资格", uiLocale)}</legend>
    <input type="hidden" name="rulesVersion" value={rulesVersion} />
    <p>{uiText("用于赛事资格核验与对阵分档，仅本人、队伍负责人和有权限的赛管可查看。周赛不设段位门槛。", uiLocale)}</p>
    <div className={styles.fields}>
      <CountryOrRegionField value={value?.countryOrRegion} uiLocale={uiLocale} disabled={disabled} />
      <label>{uiText("OWCS 2026 参赛经历", uiLocale)}<select name="owcs2026" defaultValue={value?.owcs2026 || ''} required>
        <option value="" disabled>{uiText("请选择", uiLocale)}</option><option value="NONE">{uiText("没有参加", uiLocale)}</option><option value="QUALIFIERS">{uiText("仅海选／公开预选，未进入正赛名单", uiLocale)}</option><option value="MAIN_EVENT">{uiText("进入过任一赛区正赛大名单", uiLocale)}</option>
      </select></label>
    </div>
    <p>{uiText("职业经历、名单及其他参赛资格要求，请查阅适用的周赛规则。", uiLocale)}</p>
    <div className={styles.fields}>
      { [['tank', '重装'], ['damage', '输出'], ['support', '支援']].map(([key, label]) => <label key={key}>{uiText('{0}当前段位', uiLocale, [uiText(label, uiLocale)])}<input name={`${key}Rank`} defaultValue={value?.ranks?.[key] || ''} required maxLength={40} placeholder={uiText("例如：大师 3；未定级请填未定级", uiLocale)} /></label>) }
    </div>
    <a className={styles.rulebookLink} href="https://fries-cup.com/rules/" target="_blank" rel="noreferrer">{uiText('打开规则中心', uiLocale)} ↗</a>
    <p><a href={rulebook?.url || 'https://fries-cup.com/rules/'} target="_blank" rel="noreferrer">{uiText("阅读周赛 {0} 规则书", uiLocale, [rulebook?.label || 'V3.0'])} ↗</a></p>
    <label className={styles.check}><input key={`${rulesVersion}:${value?.rulesVersion || ''}:${value?.declaredAt || ''}`} name="rulesAccepted" type="checkbox" defaultChecked={value?.rulesAccepted === true && value?.rulesVersion === rulesVersion} required />{uiText("我已阅读规则，以上资料真实，且使用本人战网账号参赛。", uiLocale)}</label>
  </fieldset>
}
