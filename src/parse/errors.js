import { getLineInfo } from "../acorn.js"
import shared from "../shared.js"

function init() {
  const {
    SyntaxError: ExSyntaxError,
    TypeError: ExTypeError
  } = shared.external

  function createClass(Super) {
    class AcornError extends Super {
      constructor(input, pos, message) {
        super(message)

        const { column, line } = getLineInfo(input, pos)

        this.column = column
        this.line = line
      }
    }

    Reflect.defineProperty(AcornError, "name", {
      configurable: true,
      enumerable: false,
      value: Super.name,
      writable: false
    })

    return AcornError
  }

  return {
    SyntaxError: createClass(ExSyntaxError),
    TypeError: createClass(ExTypeError)
  }
}

export default shared.inited
  ? shared.module.parseErrors
  : shared.module.parseErrors = init()
