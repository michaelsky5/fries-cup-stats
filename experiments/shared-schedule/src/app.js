import './runtimeCompatibility'
import './generated/brand.css'
import './app.css'
import {getUiCatalog} from './generated/localeCatalog.js'
// Dictionaries are shared by every public route. Keep one copy in the main
// package instead of Taro duplicating them into every native subpackage.
export const nativeUiCatalog=getUiCatalog
export default function App({ children }) { return children }
