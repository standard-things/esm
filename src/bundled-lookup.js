import ENV from "./constant/env.js"

import shared from "./shared.js"

function init() {
  const {
    BRAVE,
    ELECTRON
  } = ENV

  const bundledLookup = { __proto__: null }

  if (ELECTRON) {
    bundledLookup.electron = true
  }

  if (BRAVE) {
    bundledLookup["ad-block"] =
    bundledLookup["tracking-protection"] = true
  }

  return bundledLookup
}

export default shared.inited
  ? shared.module.bundledLookup
  : shared.module.bundledLookup = init()
