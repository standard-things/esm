import realRequire from "../real/require.js"
import safe from "../util/safe.js"
import shared from "../shared.js"

const safeCrypto = shared.inited
  ? shared.module.safeCrypto
  : shared.module.safeCrypto = safe(realRequire("crypto"))

export const {
  createHash
} = safeCrypto

export default safeCrypto
