import ESM from "../constant/esm.js"

import getBuiltinErrorConstructor from "../error/get-builtin-error-constructor.js"
import setProperty from "../util/set-property.js"
import shared from "../shared.js"

function init() {
  "use sloppy"

  const {
    STACK_TRACE_LIMIT
  } = ESM

  function constructError(ErrorCtor, args, suggestedLimit = STACK_TRACE_LIMIT) {
    const BuiltinError = getBuiltinErrorConstructor(ErrorCtor.prototype)
    const stackTraceLimitDescriptor = Reflect.getOwnPropertyDescriptor(BuiltinError, "stackTraceLimit")

    const oldStackTraceLimit = stackTraceLimitDescriptor === void 0
      ? void 0
      : stackTraceLimitDescriptor.value

    const shouldSetStackTraceLimit =
      suggestedLimit === 0 ||
      typeof oldStackTraceLimit !== "number" ||
      Number.isNaN(oldStackTraceLimit) ||
      oldStackTraceLimit < suggestedLimit

    if (shouldSetStackTraceLimit) {
      setProperty(BuiltinError, "stackTraceLimit", suggestedLimit)
    }

    const error = Reflect.construct(ErrorCtor, args)

    if (shouldSetStackTraceLimit) {
      if (stackTraceLimitDescriptor === void 0) {
        Reflect.deleteProperty(BuiltinError, "stackTraceLimit")
      } else {
        Reflect.defineProperty(BuiltinError, "stackTraceLimit", stackTraceLimitDescriptor)
      }
    }

    return error
  }

  return constructError
}

export default shared.inited
  ? shared.module.errorConstructError
  : shared.module.errorConstructError = init()
