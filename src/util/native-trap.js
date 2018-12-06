import captureStackTrace from "../error/capture-stack-trace.js"
import getPrototypeOf from "./get-prototype-of.js"
import setProperty from "../util/set-property.js"
import shared from "../shared.js"

function init() {
  const ExError = shared.external.Error
  const FuncProto = Function.prototype

  function nativeTrap(func) {
    const proto = getPrototypeOf(func)

    function trap(...args) {
      const BuiltinError = proto === FuncProto ? Error : ExError
      const descriptor = Reflect.getOwnPropertyDescriptor(BuiltinError, "stackTraceLimit")

      setProperty(BuiltinError, "stackTraceLimit", 0)

      let error
      let result
      let threw = true

      try {
        result = Reflect.apply(func, this, args)
        threw = false
      } catch (e) {
        error = e
      }

      if (descriptor === void 0) {
        Reflect.deleteProperty(BuiltinError, "stackTraceLimit")
      } else {
        Reflect.defineProperty(BuiltinError, "stackTraceLimit", descriptor)
      }

      if (! threw) {
        return result
      }

      captureStackTrace(error, trap)
      throw error
    }

    return trap
  }

  return nativeTrap
}

export default shared.inited
  ? shared.module.utilNativeTrap
  : shared.module.utilNativeTrap = init()
