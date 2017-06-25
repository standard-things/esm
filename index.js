import Runtime from "./lib/runtime.js"
import { setDefaults } from "./lib/options.js"
import "./lib/compile-hook.js"
import "./lib/repl-hook.js"

let isDefaultsSet = false
Runtime.enable(__non_webpack_module__.parent)

export default (options) => {
  if (! isDefaultsSet) {
    setDefaults(options)
    isDefaultsSet = true
  }
}
