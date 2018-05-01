import { getLineInfo } from "../acorn.js"
import shared from "../shared.js"

function init() {
  const { external } = shared

  function createClass(Super) {
    return class AcornError extends Super {
      constructor(input, pos, message) {
        super(message)
        const { column, line } = getLineInfo(input, pos)
        this.message += " (" + line + ":" + column + ")"
      }
    }
  }

  const errors = {
    __proto__: null,
    SyntaxError: createClass(external.SyntaxError),
    TypeError: createClass(external.TypeError)
  }

  return errors
}

export default shared.inited
  ? shared.module.parseErrors
  : shared.module.parseErrors = init()
