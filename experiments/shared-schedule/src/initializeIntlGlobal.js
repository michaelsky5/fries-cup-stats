// Taro may expose a DOM window shim. Install the namespace on the actual
// runtime global before libraries choose between window and global.
if (!globalThis.Intl) {
  Object.defineProperty(globalThis, 'Intl', { value: {}, writable: true, configurable: true })
}
