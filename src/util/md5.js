import crypto from "crypto"
import toString from "./to-string.js"

export default function md5(value) {
  return crypto
    .createHash("md5")
    .update(toString(value))
    .digest("hex")
}
