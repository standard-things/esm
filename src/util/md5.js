import { createHash } from "../safe/crypto.js"

function md5(string) {
  return createHash("md5")
    .update(typeof string === "string" ? string : "")
    .digest("hex")
}

export default md5
