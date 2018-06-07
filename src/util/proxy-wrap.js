import OwnProxy from "../own/proxy.js"

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

export default proxyWrap
