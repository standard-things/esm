import util from "util"
import "./compile-hook.js"
import "./repl-hook.js"

const customSym = util.inspect.custom
const exports = {}

if (typeof customSym === "symbol") {
  exports[customSym] = () => ""
}

export default exports
