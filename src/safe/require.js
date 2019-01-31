import realRequire from "../real/require.js"
import shared from "../shared.js"

function init() {
  function safeRequire(request) {
    try {
      return realRequire(request)
    } catch {}
  }

  return safeRequire
}

export default shared.inited
  ? shared.module.safeRequire
  : shared.module.safeRequire = init()
