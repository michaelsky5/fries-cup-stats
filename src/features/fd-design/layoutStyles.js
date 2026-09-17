import original from '../../layouts/DataLayout.module.css'
import preview from './FdShell.module.css'
import kpr from '../kpr-design/KprShell.module.css'
import { combineDesignStyles } from './designPreview.js'

export default combineDesignStyles(combineDesignStyles(original, preview), kpr)
