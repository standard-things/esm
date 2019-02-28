import realCrypto from "../real/crypto.js"
import safe from "../util/safe.js"
import setProperty from "../util/set-property.js"
import shared from "../shared.js"

function init() {
  const safeCrypto = safe(realCrypto)

  setProperty(safeCrypto, "Hash", safe(safeCrypto.Hash))

  return safeCrypto
}

const safeCrypto = shared.inited
  ? shared.module.safeCrypto
  : shared.module.safeCrypto = init()

export const {
  Hash,
  timingSafeEqual
} = safeCrypto

export default safeCrypto
