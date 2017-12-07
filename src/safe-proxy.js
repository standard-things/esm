class SafeProxy {
  constructor(target, handler) {
    return new Proxy(target, handler)
  }
}

Object.setPrototypeOf(SafeProxy.prototype, null)

export default typeof Proxy === "function" ? SafeProxy : null
