import ENV from "../constant/env.js"

import shared from "../shared.js"

function init() {
  const {
    WIN32
  } = ENV

  const nodeModulesRegExp = WIN32
    ? /[\\/]node_modules[\\/]/
    : /\/node_modules\//

  function isInstalled({ filename }) {
    return typeof filename === "string" &&
      nodeModulesRegExp.test(filename)
  }

  return isInstalled
}

export default shared.inited
  ? shared.module.utilIsInstalled
  : shared.module.utilIsInstalled = init()
