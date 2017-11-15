const _Proxy = global.Proxy

class Proxy {
  constructor(target, handler) {
    return new _Proxy(target, handler)
  }
}

Object.setPrototypeOf(Proxy.prototype, null)

export default typeof _Proxy === "function" ? Proxy : null
