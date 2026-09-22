import { translateUiText as uiText } from '../../lib/uiText.js'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { platformRequest } from '../auth/platformApi.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'

export default function SeasonRegistrationEntry({ seasonId, withSeason = value => value, className }) {
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
  const labels = en
    ? { DRAFT: 'Continue registration', RETURNED: 'Revise and resubmit', SUBMITTED: 'Review status / edit submission', APPROVED: 'View approved registration' }
    : { DRAFT: t('继续填写报名'), RETURNED: t('修改并重新提交'), SUBMITTED: t('查看审核 / 修改资料'), APPROVED: t('查看已通过的报名') }
  return <section className={className} aria-busy={state.loading} data-i18n-ignore>
    <strong>{en ? 'Season registration' : t('本赛季报名')}</strong>
    {records.length ? records.map(record => <p key={record.id}><b>{record.name}</b> · <Link to={withSeason(`/participate/${encodeURIComponent(seasonId)}`)}>{labels[record.status] || (en ? 'View registration' : t('查看报名'))}</Link></p>) : <>
      <p>{state.loading ? en ? 'Checking your registration…' : t('正在读取报名状态…') : state.error ? en ? 'Open registration to check your saved details.' : t('暂时未能读取报名状态，可进入报名页核对已保存资料。') : en ? 'Create your team or return to your saved registration.' : t('创建队伍，或回到已保存的报名继续填写。')}</p>
      <Link to={withSeason(`/participate/${encodeURIComponent(seasonId)}`)}>{en ? 'Open season registration' : t('进入本赛季报名')}</Link>
    </>}
    <p>{en ? 'Already approved? Use Team & registration to confirm each week and submit the weekly roster.' : t('已通过本赛季报名的队伍，请在“队伍与报名”中完成每周参赛确认和出赛名单。')}</p>
  </section>
}
