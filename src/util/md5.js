import { createHash } from "../safe/crypto.js"
import shared from "../shared.js"

function init() {
  function md5(string) {
    return createHash("md5")
      .update(typeof string === "string" ? string : "")
      .digest("hex")
  }

  return md5
}

export default shared.inited
  ? shared.module.utilMD5
  : shared.module.utilMD5 = init()
