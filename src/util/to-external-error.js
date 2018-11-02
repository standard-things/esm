import getPrototypeOf from "./get-prototype-of.js"
import isOwnError from "./is-own-error.js"
import setPrototypeOf from "./set-prototype-of.js"
import shared from "../shared.js"

function init() {
  const {
    Error: ExError,
    EvalError: ExEvalError,
    RangeError: ExRangeError,
    ReferenceError: ExReferenceError,
    SyntaxError: ExSyntaxError,
    TypeError: ExTypeError,
    URIError: ExURIError
  } = shared.external

  const protoMap = new Map([
    [Error.prototype, ExError.prototype],
    [EvalError.prototype, ExEvalError.prototype],
    [RangeError.prototype, ExRangeError.prototype],
    [ReferenceError.prototype, ExReferenceError.prototype],
    [SyntaxError.prototype, ExSyntaxError.prototype],
    [TypeError.prototype, ExTypeError.prototype],
    [URIError.prototype, ExURIError.prototype]
  ])

  function toExternalError(error) {
    if (isOwnError(error)) {
      setPrototypeOf(error, protoMap.get(getPrototypeOf(error)))
    }

    return error
  }

  return toExternalError
}

export default shared.inited
  ? shared.module.utilToExternalError
  : shared.module.utilToExternalError = init()
