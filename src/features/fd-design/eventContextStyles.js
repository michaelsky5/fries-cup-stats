import original from '../../components/layout/EventContextBar.module.css'
import preview from './FdEventContext.module.css'
import kpr from '../kpr-design/KprEventContext.module.css'
import { combineDesignStyles } from './designPreview.js'

export default combineDesignStyles(combineDesignStyles(original, preview), kpr)
