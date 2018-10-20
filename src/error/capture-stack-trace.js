import isError from "../util/is-error.js"
import shared from "../shared.js"

function init() {
  // Collect the call stack using the V8 stack trace API.
  // https://v8.dev/docs/stack-trace-api#stack-trace-collection-for-custom-exceptions
  const _captureStackTrace = Error.captureStackTrace

  function captureStackTrace(error, beforeFunc) {
    if (isError(error)) {
      if (typeof beforeFunc === "function") {
        _captureStackTrace(error, beforeFunc)
      } else {
        _captureStackTrace(error)
      }
    }

    return error
  }

  return captureStackTrace
}

export default shared.inited
  ? shared.module.errorCaptureStackTrace
  : shared.module.errorCaptureStackTrace = init()
