module.exports = {
  presets: [['taro', { framework: 'react', ts: false }]],
  plugins: [require.resolve('./scripts/native-copy.cjs'), require.resolve('./scripts/shared-html-tags.cjs')]
}
