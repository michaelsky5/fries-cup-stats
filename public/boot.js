// Runs before application modules, so a failed download still has a recovery UI.
(() => {
  const shell = document.getElementById('app-boot')
  const label = document.getElementById('app-boot-label')
  const hint = document.getElementById('app-boot-hint')
  const retry = document.getElementById('app-boot-retry')
  let locale = new URLSearchParams(location.search).get('lang') || ''
  if (!locale) {
    try { locale = localStorage.getItem('fries_cup_stats_locale') || localStorage.getItem('fries_cup_review_locale') || '' } catch { /* Storage is optional. */ }
  }
  const copy = locale.startsWith('en')
    ? ['Loading the event center', 'Preparing the page and interface…', 'Preparing the first view', 'Loading is taking longer than usual. You can reload this page.', 'Reload page']
    : locale.startsWith('ko')
      ? ['대회 센터를 불러오는 중', '페이지와 화면을 준비하고 있습니다…', '첫 화면을 준비하는 중', '불러오기가 지연되고 있습니다. 페이지를 새로고침할 수 있습니다.', '새로고침']
      : /^(zh-TW|zh-Hant)$/i.test(locale)
        ? ['正在載入賽事中心', '正在準備頁面與介面資源…', '正在準備首屏畫面', '載入時間較長，您可以重新載入頁面。', '重新載入']
        : ['正在加载赛事中心', '正在准备页面与界面资源…', '正在准备首屏画面', '加载时间较长，可以重新加载页面再试。', '重新加载']
  label.textContent = copy[0]
  hint.textContent = copy[1]
  retry.textContent = copy[4]
  const timer = setTimeout(() => {
    hint.textContent = copy[3]
    retry.hidden = false
    shell.setAttribute('aria-busy', 'false')
  }, 12000)
  const preparing = () => { label.textContent = copy[2] }
  window.addEventListener('fc:app-preparing', preparing)
  window.addEventListener('fc:app-ready', () => {
    clearTimeout(timer)
    window.removeEventListener('fc:app-preparing', preparing)
    document.documentElement.removeAttribute('data-booting')
    document.getElementById('root').removeAttribute('inert')
    shell.remove()
  }, { once: true })
})()
