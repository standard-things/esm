import FastObject from "../fast-object.js"

import { getLineInfo } from "../vendor/acorn/src/locutil.js"

function createClass(Super) {
  return class AcornError extends Super {
    constructor(input, pos, message) {
      super(message)
      const { column, line } = getLineInfo(input, pos)
      this.message += " (" + line + ":" + column + ")"
    }
  }
}

const errors = new FastObject
const supers = [SyntaxError, TypeError]

supers.forEach((Super) => errors[Super.name] = createClass(Super))

export default errors
