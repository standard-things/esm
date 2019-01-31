import realPunycode from "../real/punycode.js"
import safe from "../util/safe.js"
import shared from "../shared.js"

const safePunycode = shared.inited
  ? shared.module.safePunycode
  : shared.module.safePunycode = safe(realPunycode)

export const toUnicode = safePunycode === void 0
  ? void 0
  : safePunycode.toUnicode

export default safePunycode
