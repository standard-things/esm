import ESM from "../constant/esm.js"

import shared from "../shared.js"

function init() {
  const {
    PACKAGE_PARENT_NAME
  } = ESM

  function isJamine() {
    return PACKAGE_PARENT_NAME === "jasmine"
  }

  return isJamine
}

export default shared.inited
  ? shared.module.envIsJamine
  : shared.module.envIsJamine = init()
