import { Link } from 'react-router-dom'
import { translateUiText as uiText } from '../../lib/uiText.js'
import { useUiLocale } from '../../hooks/useUiLocale.js'

export default function SeasonRegistrationEntry({ seasonId, withSeason = value => value, className }) {
  const locale = useUiLocale()
  return <section className={className}><strong>{uiText('本赛季报名', locale)}</strong><p>{uiText('创建队伍、邀请队员本人确认，提交后查看赛事负责人的审核结果。', locale)}</p><Link to={withSeason(`/participate/${encodeURIComponent(seasonId)}`)}>{uiText('进入报名与确认', locale)}</Link></section>
}
