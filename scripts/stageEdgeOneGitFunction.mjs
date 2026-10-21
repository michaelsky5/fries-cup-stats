import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { stageGitDeploymentFunction } from './lib/productionRelease.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim()
const identity = stageGitDeploymentFunction(root, path.join(root, 'dist'), commit)
console.log(JSON.stringify({ scope: 'Prepared root function in this Git build checkout; no upload or deployment', ...identity }))
