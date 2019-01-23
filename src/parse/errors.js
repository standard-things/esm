import { getLineInfo } from "../acorn.js"
import shared from "../shared.js"

function init() {
  function createClass(Super) {
    class AcornError extends Super {
      constructor(parser, pos, message) {
        super(message)

        const { column, line } = getLineInfo(parser.input, pos)

        this.column = column
        this.inModule = parser.inModule
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
    ReferenceError: createClass(ReferenceError),
    SyntaxError: createClass(SyntaxError)
  }
}

export default shared.inited
  ? shared.module.parseErrors
  : shared.module.parseErrors = init()
