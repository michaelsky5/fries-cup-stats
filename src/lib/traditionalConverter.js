import { Converter } from 'opencc-js/cn2t'

// Loaded only for Traditional Chinese. Conversion never runs on raw records.
const convert = Converter({ from: 'cn', to: 'twp' })
export const convertTraditional = text => convert(text)
  .replaceAll('薯條盃', '薯條杯')
  .replaceAll('籤下', '簽下').replaceAll('籤個名', '簽個名').replaceAll('籤名', '簽名')
