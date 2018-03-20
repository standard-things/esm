import acornParse from "../acorn/parse.js"
import isInternal from "../../env/is-internal.js"
import realRequire from "../../real/require.js"
import shared from "../../shared.js"

function init() {
  const Plugin = {
    __proto__: null,
    enable() {
      if (isInternal()) {
        try {
          const acorn = realRequire("internal/deps/acorn/dist/acorn")

          acornParse.enable(acorn)
        } catch (e) {}
      }
    }
  }

  return Plugin
}

export default shared.inited
  ? shared.module.acornInternalAcorn
  : shared.module.acornInternalAcorn = init()
