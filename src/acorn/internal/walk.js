import ENV from "../../constant/env.js"

import acornWalkDynamicImport from "../walk/dynamic-import.js"
import realRequire from "../../real/require.js"
import shared from "../../shared.js"

function init() {
  const {
    INTERNAL
  } = ENV

  const Plugin = {
    enable() {
      if (INTERNAL) {
        try {
          const walk = realRequire("internal/deps/acorn/dist/walk")

          acornWalkDynamicImport.enable(walk)
        } catch (e) {}
      }
    }
  }

  return Plugin
}

export default shared.inited
  ? shared.module.acornInternalWalk
  : shared.module.acornInternalWalk = init()
