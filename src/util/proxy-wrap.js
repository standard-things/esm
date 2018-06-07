import OwnProxy from "../own/proxy.js"

function proxyWrap(func, wrapper) {
  return new OwnProxy(func, {
    apply(target, thisArg, args) {
      return Reflect.apply(wrapper, thisArg, [func, args])
    },
    construct(target, args, newTarget) {
      return Reflect.construct(wrapper, [func, args], newTarget)
    }
  })
}

export default proxyWrap
