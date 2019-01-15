import ENV from "../../constant/env.js"

import acornParse from "../acorn/parse.js"
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
          const acorn = realRequire("internal/deps/acorn/dist/acorn")

          acornParse.enable(acorn)
        } catch {}
      }
    }
  }

  return Plugin
}

export default shared.inited
  ? shared.module.acornInternalAcorn
  : shared.module.acornInternalAcorn = init()
