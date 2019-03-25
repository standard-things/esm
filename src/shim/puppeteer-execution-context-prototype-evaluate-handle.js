import OwnProxy from "../own/proxy.js"

import has from "../util/has.js"
import isObjectLike from "../util/is-object-like.js"
import isOwnProxy from "../util/is-own-proxy.js"
import nativeTrap from "../util/native-trap.js"
import proxyWrap from "../util/proxy-wrap.js"
import shared from "../shared.js"
import untransformRuntime from "../util/untransform-runtime.js"

function init() {
  const Shim = {
    enable(exported) {
      const cache = shared.memoize.shimPuppeteerExecutionContextPrototypeEvaluateHandle

      if (check(exported, cache)) {
        return exported
      }

      const ExecutionContextProto = exported.ExecutionContext.prototype

      const evaluateHandleWrapper = proxyWrap(ExecutionContextProto.evaluateHandle, function (evaluateHandle, args) {
        const [pageFunction] = args

        if (typeof pageFunction === "function") {
          const pageFunctionProxy = new OwnProxy(pageFunction, {
            get(pageFunction, name, receiver) {
              if (name === "toString" &&
                  ! has(pageFunction, "toString")) {
                return toStringProxy
              }

              if (receiver === pageFunctionProxy) {
                receiver = pageFunction
              }

              return Reflect.get(pageFunction, name, receiver)
            }
          })

          const toStringProxy = new OwnProxy(pageFunction.toString, {
            apply: nativeTrap((toString, thisArg, args) => {
              if (thisArg === pageFunctionProxy) {
                thisArg = pageFunction
              }

              const result = Reflect.apply(toString, thisArg, args)

              return typeof result === "string"
                ? untransformRuntime(result)
                : result
            })
          })

          args[0] = pageFunctionProxy
        }

        return Reflect.apply(evaluateHandle, this, args)
      })

      if (Reflect.defineProperty(ExecutionContextProto, "evaluateHandle", {
            configurable: true,
            value: evaluateHandleWrapper,
            writable: true
          })) {
        cache.set(ExecutionContextProto, true)
      }

      return exported
    }
  }

  function check(exported, cache) {
    const ExecutionContext = isObjectLike(exported)
      ? exported.ExecutionContext
      : void 0

    const ExecutionContextProto = typeof ExecutionContext === "function"
      ? ExecutionContext.prototype
      : void 0

    const evaluateHandle = isObjectLike(ExecutionContextProto)
      ? ExecutionContextProto.evaluateHandle
      : void 0

    if (typeof evaluateHandle !== "function") {
      return true
    }

    let cached = cache.get(ExecutionContextProto)

    if (cached !== void 0) {
      return cached
    }

    cached = isOwnProxy(evaluateHandle)
    cache.set(ExecutionContextProto, cached)

    return cached
  }

  return Shim
}

export default shared.inited
  ? shared.module.shimPuppeteerExecutionContextPrototypeEvaluateHandle
  : shared.module.shimPuppeteerExecutionContextPrototypeEvaluateHandle = init()
