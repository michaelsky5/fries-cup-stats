const path = require('node:path')
const webpack = require('webpack')
const statsSource = path.resolve(__dirname, '../../../src')
const statsCatalog = path.resolve(__dirname, '../../../src/lib/localeCatalog.js')
const statsSeasons = path.resolve(__dirname, '../../../src/config/seasons.js')
const accountVisualFixture = process.env.TARO_ENV === 'h5' && process.env.NATIVE_ACCOUNT_VISUAL_FIXTURE === '1'
// Canonical presentation helpers use native preferences and a generated public UI dictionary subset.
function configureSharedBuild(chain) {
  if (accountVisualFixture) chain.plugin('account-visual-fixture').use(webpack.NormalModuleReplacementPlugin, [
    /nativeAccountRuntime\.js$/, resource => {
      if (path.resolve(resource.context, resource.request) === path.resolve(__dirname, '../src/account/nativeAccountRuntime.js')) {
        resource.request = path.resolve(__dirname, '../tests/fixtures/nativeAccountRuntime.js')
      }
    }
  ])
  if(process.env.NATIVE_BUNDLE_REPORT)chain.plugin('native-bundle-report').use(class NativeBundleReport {apply(compiler){compiler.hooks.done.tap('NativeBundleReport',stats=>require('node:fs').writeFileSync(process.env.NATIVE_BUNDLE_REPORT,JSON.stringify(stats.toJson({all:false,chunks:true,chunkModules:true,modules:true,nestedModules:true}),null,2)))}})
  // Canonical files outside this trial resolve dependencies from the Stats
  // checkout. Keep every imported hook on the same React as Taro's renderer.
  chain.resolve.alias.set('react',path.resolve(__dirname,'../node_modules/react'))
  chain.plugin('native-qr-utf8').use(webpack.ProvidePlugin, [{TextEncoder:[path.resolve(__dirname,'../src/poster/utf8.js'),'TextEncoder']}])
  chain.plugin('native-locale-state').use(webpack.NormalModuleReplacementPlugin, [/locales\.js$/, resource => { if (path.resolve(resource.context, resource.request) === path.join(statsSource, 'lib/locales.js')) resource.request = path.resolve(__dirname, '../src/shared/nativeLocales.js') }])
  chain.plugin('shared-native-seasons').use(webpack.NormalModuleReplacementPlugin, [
    /seasons\.js$/, resource => {
      if (path.resolve(resource.context, resource.request) === statsSeasons) resource.request = path.resolve(__dirname, '../src/shared/publicSeasons.js')
    }
  ])
  chain.plugin('shared-chinese-catalog').use(webpack.NormalModuleReplacementPlugin, [
    /localeCatalog\.js$/,
    resource => {
      if (path.resolve(resource.context, resource.request) === statsCatalog) {
        resource.request = path.resolve(__dirname, '../src/generated/localeCatalog.js')
      }
    }
  ])
}
module.exports = {
  projectName: 'fries-cup-shared-schedule-trial',
  date: '2026-09-30',
  designWidth: 375,
  deviceRatio: { 375: 2 },
  sourceRoot: 'src',
  outputRoot: accountVisualFixture ? 'dist/h5-account-visual' : `dist/${process.env.TARO_ENV || 'weapp'}`,
  framework: 'react',
  compiler: 'webpack5',
  plugins: ['@tarojs/plugin-html'],
  cache: { enable: false },
  // UTF-8 interface copy is valid JavaScript. Escaping every Chinese/Korean
  // character doubled the language dictionary and pushed a subpackage over 2 MiB.
  terser: { config: { output: { ascii_only: false } } },
  mini: {
    // Imported Stats helpers live outside this trial's sourceRoot. They also
    // need Babel transforms before WeChat's phone-preview parser reads them.
    compile: { include: [statsSource] },
    webpackChain: configureSharedBuild,
    postcss: { cssModules: { enable: true, config: { namingPattern: 'module', generateScopedName: 'fc_[hash:base64:9]' } } }
  },
  h5: {
    compile: { include: [statsSource] },
    webpackChain: configureSharedBuild,
    publicPath: '/',
    staticDirectory: 'static',
    router: { mode: 'hash' },
    postcss: { cssModules: { enable: true, config: { namingPattern: 'module', generateScopedName: 'fc_[hash:base64:9]' } } }
  }
}
