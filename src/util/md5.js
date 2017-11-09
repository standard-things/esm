import { createHash } from "crypto"

function md5(string) {
  return createHash("md5")
    .update(string)
    .digest("hex")
}

export default md5
