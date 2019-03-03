import getBuiltinErrorConstructor from "../error/get-builtin-error-constructor.js"
import setProperty from "../util/set-property.js"
import shared from "../shared.js"

function init() {
  function constructError(ErrorCtor, args, stackTraceLimit = 0) {
    const BuiltinError = getBuiltinErrorConstructor(ErrorCtor.prototype)
    const stackTraceLimitDescriptor = Reflect.getOwnPropertyDescriptor(BuiltinError, "stackTraceLimit")

    setProperty(BuiltinError, "stackTraceLimit", stackTraceLimit)

    const error = Reflect.construct(ErrorCtor, args)

    if (stackTraceLimitDescriptor === void 0) {
      Reflect.deleteProperty(BuiltinError, "stackTraceLimit")
    } else {
      Reflect.defineProperty(BuiltinError, "stackTraceLimit", stackTraceLimitDescriptor)
    }

    return error
  }

  return constructError
}

export default shared.inited
  ? shared.module.errorConstructError
  : shared.module.errorConstructError = init()
