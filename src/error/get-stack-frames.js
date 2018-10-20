import isError from "../util/is-error.js"
import isNative from "../util/is-native.js"
import setProperty from "../util/set-property.js"
import shared from "../shared.js"

function init() {
  "use sloppy"

  const STACK_TRACE_LIMIT = 10

  const ExError = shared.external.Error

  function getStackFrames(error) {
    if (! isError(error)) {
      return []
    }

    const BuiltinError = getErrorConstructor(error)
    const prepareStackTraceDescriptor = Reflect.getOwnPropertyDescriptor(BuiltinError, "prepareStackTrace")
    const stackTraceLimitDescriptor = Reflect.getOwnPropertyDescriptor(BuiltinError, "stackTraceLimit")

    setProperty(BuiltinError, "stackTraceLimit", STACK_TRACE_LIMIT)
    setProperty(BuiltinError, "prepareStackTrace", getStructuredStackTrace)

    const { stack } = error

    if (prepareStackTraceDescriptor) {
      Reflect.defineProperty(BuiltinError, "prepareStackTrace", prepareStackTraceDescriptor)
    } else {
      Reflect.deleteProperty(BuiltinError, "prepareStackTrace")
    }

    if (stackTraceLimitDescriptor) {
      Reflect.defineProperty(BuiltinError, "stackTraceLimit", stackTraceLimitDescriptor)
    } else {
      Reflect.deleteProperty(BuiltinError, "stackTraceLimit")
    }

    return Array.isArray(stack) ? stack : []
  }

  function getErrorConstructor(error) {
    if (error instanceof Error) {
      return Error
    }

    if (error instanceof ExError) {
      return ExError
    }

    let proto = error

    while ((proto = Reflect.getPrototypeOf(proto))) {
      const ctor = proto ? proto.constructor : void 0

      if (typeof ctor === "function" &&
          ctor.name === "Error" &&
          isNative(ctor)) {
        return ctor
      }
    }

    return ExError
  }

  function getStructuredStackTrace(error, structuredStackTrace) {
    return structuredStackTrace
  }

  return getStackFrames
}

export default shared.inited
  ? shared.module.errorGetStackFrames
  : shared.module.errorGetStackFrames = init()
