import { createElement } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getGeneratedSeasonReportPage } from './generatedSeasonReportPages.js'

export default function GeneratedSeasonReportRoute() {
  const { seasonId } = useParams()
  const ReportPage = getGeneratedSeasonReportPage(seasonId)
  if (ReportPage) return createElement(ReportPage)
  return <main><h1>Season report not found</h1><p>This season has no registered report adapter.</p><Link to="/">Return home</Link></main>
}
