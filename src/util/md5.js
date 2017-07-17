import crypto from "crypto"
import toString from "./to-string.js"

function md5(value) {
  return crypto
    .createHash("md5")
    .update(toString(value))
    .digest("hex")
}

export default md5
