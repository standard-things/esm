import OwnProxy from "../own/proxy.js"

import shared from "../shared.js"

function init() {
  function proxyWrap(func, wrapper) {
    return new OwnProxy(func, {
      apply(func, thisArg, args) {
        return Reflect.apply(wrapper, thisArg, [func, args])
      },
      construct(func, args, newTarget) {
        return Reflect.construct(wrapper, [func, args], newTarget)
      }
    })
  }

  return proxyWrap
}

export default shared.inited
  ? shared.module.utilProxyWrap
  : shared.module.utilProxyWrap = init()
