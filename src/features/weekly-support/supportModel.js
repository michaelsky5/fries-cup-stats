export const SUPPORT_SCHEMA = 'friescup-weekly-support-v1'
const cents = v => Number.isSafeInteger(v) && v >= 0 ? v : 0
const purposeAmounts = (values,signed=false) => Object.fromEntries(['PLAYOFFS','FINALS','OPERATIONS'].map(key=>[key,signed && Number.isSafeInteger(values?.[key]) ? values[key] : cents(values?.[key])]))
export const rmb = (value, locale = 'zh-CN') => (cents(value)/100).toLocaleString(locale,{minimumFractionDigits:2,maximumFractionDigits:2})
export const publicUrl = value => {try {const u=new URL(value);return u.protocol==='https:' ? u.href : ''}catch{return ''}}
// This projection deliberately has no orders, contacts, payment proofs or private IDs.
export function publicSupportView(value, seasonId, now=Date.now()) {
  if (value?.schema!==SUPPORT_SCHEMA || value.seasonId!==seasonId) throw new Error('SUPPORT_SCOPE_MISMATCH')
  if (!value.published) return {published:false,cycles:[],supporters:[]}
  const s=value.summary || {}, finals=s.finals || {}, awards=finals.awards || {}
  return {
    published:true,pendingChanges:value.pendingChanges === true,label:String(value.label || ''),cycleId:String(value.cycleId || ''),publishedAt:value.publishedAt,
    entryUrl:publicUrl(value.entryUrl),platform:String(value.platform || ''),firstBroadcastAt:value.firstBroadcastAt,endsAt:value.endsAt,
    cycles:(Array.isArray(value.cycles)?value.cycles:[]).map(c=>({id:String(c.id),label:String(c.label)})),
    summary:{receivedCents:cents(s.receivedCents),refundedCents:cents(s.refundedCents),reserveCents:cents(s.reserveCents),distributableCents:cents(s.distributableCents),allocated:purposeAmounts(s.allocated),deposits:purposeAmounts(s.deposits),spent:purposeAmounts(s.spent),reimbursed:purposeAmounts(s.reimbursed),available:purposeAmounts(s.available,true),finals:{poolCents:cents(finals.poolCents),funded:finals.funded===true,awards:Object.fromEntries(['champion','runnerUp','third','fourth'].map(k=>[k,cents(awards[k])]))}},
    supporters:(Array.isArray(value.supporters)?value.supporters:[]).filter(s=>s.roll===true || (s.web===true && Date.parse(s.startsAt)<=now && Date.parse(s.endsAt)>now)).map(s=>({displayName:String(s.displayName || '').slice(0,48),tier:String(s.tier || ''),roll:s.roll===true,web:s.web===true && Date.parse(s.startsAt)<=now && Date.parse(s.endsAt)>now,endsAt:s.endsAt,...(Number.isSafeInteger(s.amountCents)?{amountCents:cents(s.amountCents)}:{})})),
    upgrades:(Array.isArray(value.upgrades)?value.upgrades:[]).map(u=>({label:String(u.label || ''),status:String(u.status || 'PLANNED'),amountCents:cents(u.amountCents)})),
  }
}
