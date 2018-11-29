import ENV from "./constant/env.js"

import shared from "./shared.js"

function init() {
  const {
    BRAVE,
    ELECTRON
  } = ENV

  const bundledLookup = new Set

  if (ELECTRON) {
    bundledLookup.add("electron")
  }

  if (BRAVE) {
    bundledLookup
      .add("ad-block")
      .add("tracking-protection")
  }

  return bundledLookup
}

export default shared.inited
  ? shared.module.bundledLookup
  : shared.module.bundledLookup = init()
