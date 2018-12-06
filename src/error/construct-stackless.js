import getBuiltinErrorConstructor from "../error/get-builtin-error-constructor.js"
import setProperty from "../util/set-property.js"
import shared from "../shared.js"

function init() {
  function constructStackless(ErrorCtor, args) {
    const BuiltinError = getBuiltinErrorConstructor(ErrorCtor.prototype)
    const descriptor = Reflect.getOwnPropertyDescriptor(BuiltinError, "stackTraceLimit")

    setProperty(BuiltinError, "stackTraceLimit", 0)

    const error = Reflect.construct(ErrorCtor, args)

    if (descriptor === void 0) {
      Reflect.deleteProperty(BuiltinError, "stackTraceLimit")
    } else {
      Reflect.defineProperty(BuiltinError, "stackTraceLimit", descriptor)
    }

    return error
  }

  return constructStackless
}

export default shared.inited
  ? shared.module.errorConstructStackless
  : shared.module.errorConstructStackless = init()
