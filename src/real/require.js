import shared from "../shared.js"

function init() {
  try {
    const result = __non_webpack_require__(shared.symbol.realRequire)

    if (typeof result === "function") {
      return result
    }
  } catch {}

  return __non_webpack_require__
}

export default shared.inited
  ? shared.module.realRequire
  : shared.module.realRequire = init()
