import { getLineInfo } from "../acorn/src/locutil.js"

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
  SyntaxError: createClass(SyntaxError),
  TypeError: createClass(TypeError)
}

export default errors
