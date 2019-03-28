import ENV from "../../constant/env.js"

import acornParse from "../acorn/parse.js"
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
        const acorn = safeRequire("internal/deps/acorn/acorn/dist/acorn")

        if (isObjectLike(acorn)) {
          acornParse.enable(acorn)
        }
      }
    }
  }

  return Plugin
}

export default shared.inited
  ? shared.module.acornInternalAcorn
  : shared.module.acornInternalAcorn = init()
