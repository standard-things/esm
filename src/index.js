import Runtime from "./runtime.js"
import "./compile-hook.js"
import "./repl-hook.js"

Runtime.enable(__non_webpack_module__.parent)
