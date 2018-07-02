import OwnProxy from "../own/proxy.js"

import shared from "../shared.js"

function init() {
  function proxyWrap(func, wrapper) {
    return new OwnProxy(func, {
      apply(target, thisArg, args) {
        return Reflect.apply(wrapper, thisArg, [target, args])
      },
      construct(target, args, newTarget) {
        return Reflect.construct(wrapper, [target, args], newTarget)
      }
    })
  }

  return proxyWrap
}

export default shared.inited
  ? shared.module.utilProxyWrap
  : shared.module.utilProxyWrap = init()
