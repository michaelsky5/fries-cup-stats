import { useState, useSyncExternalStore } from 'react'
import { Picker } from '@tarojs/components'
import { LOCALES, subscribeLocale, getActiveLocale, setStoredLocale } from './nativeLocales'

export default function LanguageSwitcher({ disabled = false }) {
  const locale = useSyncExternalStore(subscribeLocale, getActiveLocale, getActiveLocale)
  const [error, setError] = useState(false)
  return <div className='public-language-switcher'><Picker disabled={disabled} range={LOCALES.map(item => item.label)} value={Math.max(0, LOCALES.findIndex(item => item.id === locale))} onChange={event => setError(!setStoredLocale(LOCALES[Number(event.detail.value)]?.id))}><span>语言 / Language · {LOCALES.find(item => item.id === locale)?.label}⌄</span></Picker>{error ? <small>语言已切换，但无法保存到本机。</small> : null}</div>
}
