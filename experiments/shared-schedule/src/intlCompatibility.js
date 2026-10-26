import './initializeIntlGlobal.js'
import '@formatjs/intl-getcanonicallocales/polyfill.js'
import '@formatjs/intl-locale/polyfill.js'
import '@formatjs/intl-pluralrules/polyfill.js'
import '@formatjs/intl-pluralrules/locale-data/en.js'
import '@formatjs/intl-pluralrules/locale-data/zh.js'
import '@formatjs/intl-pluralrules/locale-data/ko.js'
import '@formatjs/intl-numberformat/polyfill.js'
import '@formatjs/intl-numberformat/locale-data/en.js'
import '@formatjs/intl-numberformat/locale-data/zh.js'
import '@formatjs/intl-numberformat/locale-data/ko.js'
import '@formatjs/intl-datetimeformat/polyfill.js'
import '@formatjs/intl-datetimeformat/locale-data/en.js'
import '@formatjs/intl-datetimeformat/locale-data/en-CA.js'
import '@formatjs/intl-datetimeformat/locale-data/zh.js'
import '@formatjs/intl-datetimeformat/locale-data/ko.js'
import timezones from './generated/intlTimezones.js'

if (typeof Intl.DateTimeFormat.__addTZData === 'function') {
  Intl.DateTimeFormat.__addTZData(timezones)
}
