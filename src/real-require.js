import CHAR from "./constant/char.js"

import shared from "./shared.js"

const {
  ZWJ
} = CHAR

let realRequire = __non_webpack_require__

try {
  realRequire = realRequire(shared.symbol.require)
} catch (e) {}

try {
  realRequire = realRequire(Symbol.for("esm" + ZWJ + ":require"))
} catch (e) {}

export default realRequire
