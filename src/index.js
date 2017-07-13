import "./compile-hook.js"
import "./repl-hook.js"
import util from "util"

const customSym = util.inspect.custom
const exports = {}

if (typeof customSym === "symbol") {
  exports[customSym] = () => ""
}

export default exports
