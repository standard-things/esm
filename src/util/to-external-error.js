import getPrototypeOf from "./get-prototype-of.js"
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
    ["Error", ExError.prototype],
    ["EvalError", ExEvalError.prototype],
    ["RangeError", ExRangeError.prototype],
    ["ReferenceError", ExReferenceError.prototype],
    ["SyntaxError", ExSyntaxError.prototype],
    ["TypeError", ExTypeError.prototype],
    ["URIError", ExURIError.prototype]
  ])

  function toExternalError(error) {
    if (error instanceof Error) {
      const { name } = getPrototypeOf(error)
      const proto = protoMap.get(name)

      if (proto !== void 0) {
        setPrototypeOf(error, proto)
      }
    }

    return error
  }

  return toExternalError
}

export default shared.inited
  ? shared.module.utilToExternalError
  : shared.module.utilToExternalError = init()
