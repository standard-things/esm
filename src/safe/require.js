import realRequire from "../real/require.js"
import shared from "../shared.js"

function init() {
  const { resolve } = realRequire

  function safeRequire(request) {
    try {
      return realRequire(request)
    } catch {}
  }

  function safeResolve(request) {
    try {
      return Reflect.apply(resolve, realRequire, [request])
    } catch {}

    return ""
  }

  safeRequire.resolve = safeResolve

  return safeRequire
}

export default shared.inited
  ? shared.module.safeRequire
  : shared.module.safeRequire = init()
