import { getLineInfo } from "../acorn.js"
import shared from "../shared.js"

function init() {
  const {
    ReferenceError: ExReferenceError,
    SyntaxError: ExSyntaxError
  } = shared.external

  function createClass(Super) {
    class AcornError extends Super {
      constructor({ inModule, input }, pos, message) {
        super(message)

        const { column, line } = getLineInfo(input, pos)

        this.column = column
        this.inModule = inModule
        this.line = line
      }
    }

    Reflect.defineProperty(AcornError, "name", {
      configurable: true,
      value: Super.name
    })

    return AcornError
  }

  return {
    ReferenceError: createClass(ExReferenceError),
    SyntaxError: createClass(ExSyntaxError)
  }
}

export default shared.inited
  ? shared.module.parseErrors
  : shared.module.parseErrors = init()
