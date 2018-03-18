import crypto from "crypto"
import safe from "../util/safe.js"
import shared from "../shared.js"

const safeCrypto = shared.inited
  ? shared.module.safeCrypto
  : shared.module.safeCrypto = safe(crypto)

export const {
  createHash
} = safeCrypto

export default safeCrypto
