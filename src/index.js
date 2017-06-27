import Runtime from "./runtime.js"
import { setDefaults } from "./options.js"
import "./compile-hook.js"
import "./repl-hook.js"

let isDefaultsSet = false
Runtime.enable(__non_webpack_module__.parent)

export default (options) => {
  if (! isDefaultsSet) {
    setDefaults(options)
    isDefaultsSet = true
  }
}
