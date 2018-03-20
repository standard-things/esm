import shared from "../shared.js"

function init() {
  let realRequire = __non_webpack_require__

  try {
    const result = realRequire(shared.symbol.realRequire)

    if (typeof result === "function") {
      realRequire = result
    }
  } catch (e) {}

  return realRequire
}

export default shared.inited
  ? shared.module.realRequire
  : shared.module.realRequire = init()
