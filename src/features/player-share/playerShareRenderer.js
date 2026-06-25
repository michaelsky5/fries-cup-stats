import { toPng } from 'html-to-image'

async function waitForImage(image) {
  if (!image) return
  if (!image.complete) {
    await new Promise(resolve => {
      image.onload = resolve
      image.onerror = resolve
    })
  }

  if (typeof image.decode === 'function') {
    try {
      await image.decode()
    } catch {
      // A failed optional image already has a DOM fallback; export should continue.
    }
  }
}

export async function waitForShareAssets(node) {
  if (!node) return
  if (document.fonts?.ready) await document.fonts.ready
  const images = Array.from(node.querySelectorAll('img'))
  await Promise.all(images.map(waitForImage))
}

export async function exportPlayerSharePng(node, fileName) {
  if (!node) throw new Error('Missing share card node')
  await waitForShareAssets(node)
  const dataUrl = await toPng(node, {
    cacheBust: true,
    pixelRatio: 1,
    width: 1600,
    height: 900,
    canvasWidth: 1600,
    canvasHeight: 900,
    backgroundColor: '#101010'
  })

  const link = document.createElement('a')
  link.download = fileName
  link.href = dataUrl
  link.click()
}
