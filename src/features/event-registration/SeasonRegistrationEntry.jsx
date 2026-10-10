import { translateUiText as uiText } from '../../lib/uiText.js'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { platformRequest } from '../auth/platformApi.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'

export default function SeasonRegistrationEntry({ seasonId, withSeason = value => value, className, allowCreate = true }) {
  const locale = useUiLocale()
  const en = String(locale).startsWith('en')
  const t = text => uiText(text, locale)
  const [state, setState] = useState({ loading: true })
  useEffect(() => {
    let live = true
    setState({ loading: true })
    platformRequest(`/seasons/${encodeURIComponent(seasonId)}/registration/me`)
      .then(data => { if (live) setState({ data }) })
      .catch(() => { if (live) setState({ error: true }) })
    return () => { live = false }
  }, [seasonId])
  const records = (state.data?.registrations || []).filter(record => record.status !== 'WITHDRAWN')
  if (!allowCreate && !state.loading && !state.error && !records.length) return null
  const labels = en
    ? { DRAFT: 'Continue registration', RETURNED: 'Revise and resubmit', SUBMITTED: 'Review status / edit submission', APPROVED: 'View approved registration' }
    : { DRAFT: t('继续填写报名'), RETURNED: t('修改并重新提交'), SUBMITTED: t('查看审核 / 修改资料'), APPROVED: t('查看已通过的报名') }
  return <section className={className} aria-busy={state.loading} data-i18n-ignore>
    <strong>{en ? 'Season registration' : t('本赛季报名')}</strong>
    {records.length ? records.map(record => <p key={record.id}><b>{record.name}</b> · <Link to={withSeason(`/participate/${encodeURIComponent(seasonId)}?registration=${encodeURIComponent(record.id)}`)}>{labels[record.status] || (en ? 'View registration' : t('查看报名'))}</Link></p>) : <>
      <p>{state.loading ? en ? 'Checking your registration…' : t('正在读取报名状态…') : state.error ? en ? 'Open registration to check your saved details.' : t('暂时未能读取报名状态，可进入报名页核对已保存资料。') : en ? 'Create your team or return to your saved registration.' : t('创建队伍、分享共用链接，队员各自填写，经理审核后统一提交报名。')}</p>
      {!state.loading && <Link to={withSeason(`/participate/${encodeURIComponent(seasonId)}`)}>{en ? 'Open season registration' : t('进入本赛季报名')}</Link>}
    </>}
    {records.some(record => record.status === 'APPROVED') && <p>{en ? 'Weekly preparation and team maintenance are in My team.' : t('每周参赛准备与队伍维护统一在“我的队伍”办理。')} <Link to={withSeason('/me?section=team')}>{en ? 'View my team' : t('查看我的队伍')} →</Link></p>}
  </section>
}
