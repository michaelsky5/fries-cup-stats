import { Converter } from 'opencc-js/cn2t'

// Loaded only for Traditional Chinese. Conversion never runs on raw records.
export const convertTraditional = Converter({ from: 'cn', to: 'twp' })
