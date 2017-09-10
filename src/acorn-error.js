import { getLineInfo } from "./vendor/acorn/src/locutil.js"

class AcornError extends SyntaxError {
  constructor(parser, pos, message) {
    super(message)
    const { column, line } = getLineInfo(parser.input, pos)
    this.message = message + " (" + line + ":" + column + ")"
  }
}

export default AcornError
