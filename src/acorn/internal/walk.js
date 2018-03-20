import acornWalkDynamicImport from "../walk/dynamic-import.js"
import isInternal from "../../env/is-internal.js"
import realRequire from "../../real-require.js"
import shared from "../../shared.js"

function init() {
  const Plugin = {
    __proto__: null,
    enable() {
      if (isInternal()) {
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
