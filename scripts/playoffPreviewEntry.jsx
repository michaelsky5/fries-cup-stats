import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import WeeklyNewspaper from '../src/features/weekly-report/WeeklyNewspaper.jsx'
import { ensureUiLocale } from '../src/lib/localeCatalog.js'
import '../src/styles/tokens.css'
const params=new URLSearchParams(location.search),locale=params.get('locale')||'zh-CN'
await ensureUiLocale(locale)
const draft=await(await fetch('/__playoff/report.json?'+params)).json()
const exportButton=document.createElement('button'),exportStatus=document.createElement('output')
exportButton.textContent='导出验收 PDF + PNG（仅本机）'
exportButton.onclick=async()=>{
  exportButton.disabled=true;exportStatus.textContent='正在生成实际导出文件…'
  try {
    const {exportNewspaperPdf,captureNewspaperSheet}=await import('../src/features/weekly-report/newspaperExport.js')
    const sheet=document.getElementById('newspaper-page-1')
    const pdf=await exportNewspaperPdf([sheet],draft.paper,()=>{})
    const canvas=await captureNewspaperSheet(sheet),png=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'))
    for(const [ext,blob]of[['pdf',pdf],['png',png]]){
      const response=await fetch(`/__playoff/export/${locale}/${params.get('state')||'review'}.${ext}`,{method:'POST',body:blob})
      if(!response.ok)throw new Error('Local export storage failed')
    }
    exportStatus.textContent=`验收导出完成：${locale} / ${params.get('state')||'review'}`
  } catch(error){exportStatus.textContent=`导出失败：${error.message}`} finally {exportButton.disabled=false}
}
document.querySelector('.sample-nav').append(exportButton,exportStatus)
createRoot(document.getElementById('root')).render(<BrowserRouter><WeeklyNewspaper report={draft.report} newspaperOverride={draft.paper} locale={locale} seasonId="FCW2026" withSeason={path=>path} home="/__playoff/" archive="/__playoff/"/></BrowserRouter>)
