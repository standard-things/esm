import { Hash } from "../safe/crypto.js"

import shared from "../shared.js"

function init() {
  function md5(string) {
    const hash = new Hash("md5")

    if (typeof string === "string") {
      hash.update(string)
    }

    return hash.digest("hex")
  }

  return md5
}

export default shared.inited
  ? shared.module.utilMD5
  : shared.module.utilMD5 = init()
