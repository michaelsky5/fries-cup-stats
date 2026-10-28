import { Button as TaroButton } from '@tarojs/components'

// Taro H5 exposes disabled="false" on custom elements. Use an explicit class
// for appearance so enabled buttons keep the same state as native buttons.
export default function NativeAccountButton({ disabled = false, className = '', ...props }) {
  return <TaroButton {...props} disabled={Boolean(disabled)} className={className + (disabled ? ' native-account-disabled' : '')} />
}
