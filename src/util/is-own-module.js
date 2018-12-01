import ESM from "../constant/esm.js"

import shared from "../shared.js"

function init() {
  const {
    PACKAGE_DIRNAME
  } = ESM

  function isOwnModule({ filename }) {
    return typeof filename === "string" &&
      filename.startsWith(PACKAGE_DIRNAME)
  }

  return isOwnModule
}

export default shared.inited
  ? shared.module.utilIsOwnModule
  : shared.module.utilIsOwnModule = init()
