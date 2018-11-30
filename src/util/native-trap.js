import captureStackTrace from "../error/capture-stack-trace.js"
import shared from "../shared.js"

function init() {
  function nativeTrap(func) {
    return function trap(...args) {
      try {
        return Reflect.apply(func, this, args)
      } catch (e) {
        captureStackTrace(e, trap)
        throw e
      }
    }
  }

  return nativeTrap
}

export default shared.inited
  ? shared.module.utilNativeTrap
  : shared.module.utilNativeTrap = init()
