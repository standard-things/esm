import ENV from "../../constant/env.js"

import acornWalkDynamicImport from "../walk/dynamic-import.js"
import isObjectLike from "../../util/is-object-like.js"
import safeRequire from "../../safe/require.js"
import shared from "../../shared.js"

function init() {
  const {
    INTERNAL
  } = ENV

  const Plugin = {
    enable() {
      if (INTERNAL) {
        const walk = safeRequire("internal/deps/acorn/acorn-walk/dist/walk")

        if (isObjectLike(walk)) {
          acornWalkDynamicImport.enable(walk)
        }
      }
    }
  }

  return Plugin
}

export default shared.inited
  ? shared.module.acornInternalWalk
  : shared.module.acornInternalWalk = init()
