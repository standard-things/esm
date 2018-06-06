import OwnProxy from "../own/proxy.js"

function proxyWrap(func, wrapper) {
  return new OwnProxy(func, {
    apply(target, thisArg, args) {
      return Reflect.apply(wrapper, thisArg, [func, args])
    }
  })
}

export default proxyWrap
