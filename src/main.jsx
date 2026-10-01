import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './trial-start.css'
import { initializeTrialSeason } from './config/seasons.js'
import { initializeVisitorLocale } from './lib/visitorLocale.js'

const root = createRoot(document.getElementById('root'))
function TrialStartError({ message }) {
  useEffect(() => {
    window.dispatchEvent(new Event('fc:app-ready'))
    document.documentElement.removeAttribute('data-booting')
    document.getElementById('root')?.removeAttribute('inert')
    document.getElementById('app-boot')?.remove()
  }, [])
  return <main className="trial-start-error"><span>FRIES CUP STATS / 试用结果</span><h1>暂时无法打开这轮试用</h1><p role="alert">{message}</p><button onClick={() => window.location.reload()}>重新读取</button><p>请返回 System 试用总览，点击“查看公开结果”。</p></main>
}
async function start() {
  try {
    await initializeVisitorLocale()
    await initializeTrialSeason()
    const { default: App } = await import('./app/App.jsx')
    root.render(<StrictMode><App /></StrictMode>)
  } catch (error) {
    root.render(<TrialStartError message={error.message} />)
  }
}
start()
