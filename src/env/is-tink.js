import ESM from "../constant/esm.js"

import shared from "../shared.js"

function init() {
  const {
    PACKAGE_PARENT_NAME
  } = ESM

  function isTink() {
    return PACKAGE_PARENT_NAME === "tink"
  }

  return isTink
}

export default shared.inited
  ? shared.module.envIsTink
  : shared.module.envIsTink = init()
