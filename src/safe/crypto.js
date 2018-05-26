import realCrypto from "../real/crypto.js"
import safe from "../util/safe.js"
import shared from "../shared.js"

const safeCrypto = shared.inited
  ? shared.module.safeCrypto
  : shared.module.safeCrypto = safe(realCrypto)

export const {
  createHash
} = safeCrypto

export default safeCrypto
