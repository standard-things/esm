import AcornError from "../acorn-error.js"

function isParseError(value) {
  return value instanceof AcornError
}

export default isParseError
