import { getLineInfo } from "../acorn.js"

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
  SyntaxError: createClass(__external__.SyntaxError),
  TypeError: createClass(__external__.TypeError)
}

export default errors
