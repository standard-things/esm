import ESM from "../constant/esm.js"

import shared from "../shared.js"

function init() {
  const {
    PKG_FILENAMES
  } = ESM

  function isOwnPath(thePath) {
    if (typeof thePath === "string") {
      for (const filename of PKG_FILENAMES) {
        if (thePath === filename) {
          return true
        }
      }
    }

    return false
  }

  return isOwnPath
}

export default shared.inited
  ? shared.module.utilIsOwnPath
  : shared.module.utilIsOwnPath = init()
