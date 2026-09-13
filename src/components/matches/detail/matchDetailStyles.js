import original from './MatchDetail.module.css'
import signal from './MatchSignal.module.css'

export default Object.fromEntries(Object.entries(original).map(([key, value]) => [key, [value, signal[key]].filter(Boolean).join(' ')]))
