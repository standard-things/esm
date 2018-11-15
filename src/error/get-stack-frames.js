import getPrototypeOf from "../util/get-prototype-of.js"
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

    if (prepareStackTraceDescriptor === void 0) {
      Reflect.deleteProperty(BuiltinError, "prepareStackTrace")
    } else {
      Reflect.defineProperty(BuiltinError, "prepareStackTrace", prepareStackTraceDescriptor)
    }

    if (stackTraceLimitDescriptor === void 0) {
      Reflect.deleteProperty(BuiltinError, "stackTraceLimit")
    } else {
      Reflect.defineProperty(BuiltinError, "stackTraceLimit", stackTraceLimitDescriptor)
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

    while ((proto = getPrototypeOf(proto))) {
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
