import shared from "./shared.js"

function init() {
  let realRequire = __non_webpack_require__

  try {
    realRequire = realRequire(shared.symbol.require)
  } catch (e) {}

  return realRequire
}

export default shared.inited
  ? shared.module.realRequire
  : shared.module.realRequire = init()
