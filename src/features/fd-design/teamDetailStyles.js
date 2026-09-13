import original from '../../pages/teams/TeamDetailPage.module.css'
import preview from './FdTeamDetail.module.css'
import signal from '../kpr-design/TeamSignal.module.css'
import { combineDesignStyles } from './designPreview.js'

export default combineDesignStyles(combineDesignStyles(original, preview), signal)
