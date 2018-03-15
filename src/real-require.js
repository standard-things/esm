import shared from "./shared.js"

let realRequire = __non_webpack_require__

try {
  realRequire = realRequire(shared.symbol.require)
} catch (e) {}

export default realRequire
