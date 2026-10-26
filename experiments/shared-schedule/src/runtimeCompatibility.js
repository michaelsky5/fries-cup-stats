// Stats helpers also use modern built-in methods, beyond Babel's syntax
// transforms. Load their stable implementations before any page initializes.
import 'core-js/actual/array/at.js'
import 'core-js/actual/array/flat.js'
import 'core-js/actual/array/flat-map.js'
import 'core-js/actual/array/includes.js'
import 'core-js/actual/array/find-last.js'
import 'core-js/actual/array/find-last-index.js'
import 'core-js/actual/array/to-sorted.js'
import 'core-js/actual/string/replace-all.js'
import 'core-js/actual/string/pad-start.js'
import 'core-js/actual/string/pad-end.js'
import 'core-js/actual/object/from-entries.js'
import 'core-js/actual/object/has-own.js'
import 'core-js/actual/promise/all-settled.js'
import 'core-js/actual/promise/finally.js'
import 'core-js/actual/url/index.js'
import 'core-js/actual/url-search-params/index.js'
// Intl is absent on the actual Android WeChat runtime, even though it exists
// in DevTools. Keep canonical Stats formatters and add their missing runtime.
import './intlCompatibility.js'
