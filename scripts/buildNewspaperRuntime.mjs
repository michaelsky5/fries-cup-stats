import { build } from 'vite'
import react from '@vitejs/plugin-react'
import { createHash } from 'node:crypto'
import { mkdir, readFile, readdir, writeFile, rm } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const outDir = process.argv[2] ? path.resolve(process.argv[2]) : path.join(root, 'output/newspaper-runtime')
await mkdir(outDir, { recursive: true })
// Remove only files managed by the previous bundle manifest.
try {
  const old = JSON.parse(await readFile(path.join(outDir, 'manifest.json'), 'utf8'))
  for (const name of Object.keys(old.files || {})) {
    if (/^(?:runtime(?:-[a-zA-Z0-9_-]+)?\.mjs|style\.css)$/.test(name)) await rm(path.join(outDir, name), { force: true })
  }
} catch (error) { if (error.code !== 'ENOENT') throw error }
const built = await build({ root, configFile: false, plugins: [react()], publicDir: false,
  ssr: { noExternal: true, external: ['react', 'react-dom', 'react-dom/server', 'react/jsx-runtime', 'react-router-dom'] },
  build: { ssr: 'src/features/weekly-report/newspaperRuntime.jsx', outDir, emptyOutDir: false,
    cssCodeSplit: false, emitAssets: true, minify: false,
    rollupOptions: { output: { entryFileNames: 'runtime.mjs', chunkFileNames: 'runtime-[hash].mjs', assetFileNames: '[name][extname]' } } } })
const manifest = { schema: 'friescup-newspaper-runtime-1', sourceFiles: {}, files: {} }
const inputs = new Set(['package-lock.json'])
for (const bundle of Array.isArray(built) ? built : [built]) {
  for (const chunk of bundle.output || []) {
    for (const id of Object.keys(chunk.modules || {})) {
      const file = id.split('?')[0].replaceAll('\\', '/')
      if (file.startsWith(root.replaceAll('\\', '/') + 'src/')) inputs.add(path.relative(root, file).replaceAll('\\', '/'))
    }
  }
}
for (const file of [...inputs].sort()) manifest.sourceFiles[file] = createHash('sha256').update(await readFile(path.join(root, file))).digest('hex')
for (const name of (await readdir(outDir)).sort()) {
  if (!/\.(mjs|css)$/.test(name)) continue
  manifest.files[name] = createHash('sha256').update(await readFile(path.join(outDir, name))).digest('hex')
}
await writeFile(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n')
console.log('Bundled the same generator and newspaper renderer for System.')
