import indexOfPragma from "./index-of-pragma.js"
import shared from "../shared.js"

function init() {
  const MODULE_PRAGMA = "use module"
  const SCRIPT_PRAGMA = "use script"

  // A pragma width includes the enclosing quotes and trailing semicolon.
  const MODULE_PRAGMA_WIDTH = MODULE_PRAGMA.length + 3
  const SCRIPT_PRAGMA_WIDTH = SCRIPT_PRAGMA.length + 3

  function hasPragma(code, pragma) {
    const index = indexOfPragma(code, pragma)

    if (index === -1) {
      return false
    }

    if (index >= SCRIPT_PRAGMA_WIDTH &&
        pragma === MODULE_PRAGMA) {
      return indexOfPragma(code.slice(0, index), SCRIPT_PRAGMA) === -1
    }

    if (index >= MODULE_PRAGMA_WIDTH &&
        pragma === SCRIPT_PRAGMA) {
      return indexOfPragma(code.slice(0, index), MODULE_PRAGMA) === -1
    }

    return true
  }

  return hasPragma
}

export default shared.inited
  ? shared.module.parseHasPragma
  : shared.module.parseHasPragma = init()
