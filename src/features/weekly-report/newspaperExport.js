export const PAPER_SIZE = { width:900,height:1273 }
export const A4_POINTS = [595.28,841.89]

export function editionFilename(report, suffix) {
  const scope = `${report.cycle.code || report.cycle.id}-${report.week.week_number}`.replace(/[^a-zA-Z0-9_-]/g,'-')
  return `FriesCup-Weekly-${scope}${report.publication ? '' : '-sample'}${suffix}`
}

export async function makeNewspaperPdf(PDFDocument, images, title) {
  if (!images.length) throw new Error('No newspaper pages')
  const pdf = await PDFDocument.create()
  pdf.setTitle(title); pdf.setAuthor('Fries Cup'); pdf.setSubject('Weekly results, lineups and statistics')
  for (const bytes of images) {
    const image = await pdf.embedJpg(bytes), page = pdf.addPage(A4_POINTS)
    page.drawImage(image,{x:0,y:0,width:A4_POINTS[0],height:A4_POINTS[1]})
  }
  return pdf.save()
}

async function waitForNewspaperImages(sheet) {
  sheet.querySelectorAll('img').forEach(img=>{img.loading='eager'})
  await Promise.all([...sheet.querySelectorAll('img')].map(async img=>{
    if (!img.complete) await new Promise((resolve,reject)=>{
      const finish=(error)=>{clearTimeout(timer);img.removeEventListener('load',loaded);img.removeEventListener('error',failed);error?reject(error):resolve()}
      const loaded=()=>finish(),failed=()=>finish(new Error('版面图片加载失败，请重试。'))
      const timer=setTimeout(()=>finish(new Error('版面图片加载超时，请重试。')),15000)
      img.addEventListener('load',loaded,{once:true});img.addEventListener('error',failed,{once:true})
    })
    if (!img.naturalWidth) throw new Error('版面图片加载失败，请重试。')
    if (img.decode) await img.decode()
  }))
}

export async function captureNewspaperSheet(sheet) {
  if (!sheet) throw new Error('版面尚未加载，请稍后重试。')
  await document.fonts.ready
  await waitForNewspaperImages(sheet)
  // Validate the same printable layout as the publication inspector. Reading
  // links occupy space on screen but are excluded from the exported edition.
  const captureRoot=document.createElement('div')
  captureRoot.setAttribute('aria-hidden','true');captureRoot.inert=true
  Object.assign(captureRoot.style,{position:'fixed',left:'-10000px',top:'0',width:PAPER_SIZE.width+'px',pointerEvents:'none'})
  const printable=sheet.cloneNode(true),computed=getComputedStyle(sheet)
  printable.style.transform='none'
  printable.style.setProperty('--paper-font',computed.fontFamily)
  printable.style.fontVariantNumeric=computed.fontVariantNumeric
  printable.removeAttribute('id')
  printable.querySelectorAll('[id]').forEach(node=>node.removeAttribute('id'))
  printable.querySelectorAll('[data-paper-web-only]').forEach(node=>node.remove())
  captureRoot.append(printable);document.body.append(captureRoot)
  try {
  // A copied image has its own loading state. Wait before html-to-image reads
  // intrinsic sizes, including when its module and resource caches are warm.
  await waitForNewspaperImages(printable)
  const footer = printable.querySelector('[data-paper-folio]')
  const body = printable.querySelector('[data-paper-body]')
  if (!footer || !body || body.scrollHeight > body.clientHeight+1 || printable.scrollHeight > PAPER_SIZE.height+1 || footer.offsetTop+footer.offsetHeight > PAPER_SIZE.height) throw new Error('报纸版面超出页边界，请重试或反馈这一期。')
  const {toCanvas} = await import('html-to-image')
  const canvas=await toCanvas(printable,{width:PAPER_SIZE.width,height:PAPER_SIZE.height,pixelRatio:2,backgroundColor:'#f5f1e8',style:{transform:'none',position:'relative',inset:'auto',left:'0',top:'0'}})
  const probe=document.createElement('canvas');probe.width=20;probe.height=28
  const context=probe.getContext('2d');context.drawImage(canvas,0,0,20,28)
  const pixels=context.getImageData(0,0,20,28).data
  let ink=0
  for(let i=0;i<pixels.length;i+=4) if(Math.abs(pixels[i]-245)+Math.abs(pixels[i+1]-241)+Math.abs(pixels[i+2]-232)>60) ink++
  if(ink<20) throw new Error('未能完整渲染报纸，请重试。')
  return canvas
  } finally {captureRoot.remove()}
}

export async function exportNewspaperPdf(sheets, newspaper, progress) {
  const images=[]
  for (let index=0;index<sheets.length;index++) {
    progress(index+1,sheets.length)
    const canvas=await captureNewspaperSheet(sheets[index])
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.96))
    if (!blob) throw new Error('无法生成报纸图片，请重试。')
    images.push(new Uint8Array(await blob.arrayBuffer()))
  }
  const {PDFDocument}=await import('./vendor/pdf-lib.esm.min.js')
  const bytes=await makeNewspaperPdf(PDFDocument,images,`Fries Cup Weekly — ${newspaper.edition}`)
  return new Blob([bytes],{type:'application/pdf'})
}

export function downloadNewspaper(blob, filename) {
  const url=URL.createObjectURL(blob),a=document.createElement('a')
  a.href=url; a.download=filename; document.body.appendChild(a); a.click(); a.remove()
  setTimeout(()=>URL.revokeObjectURL(url),60000)
}
