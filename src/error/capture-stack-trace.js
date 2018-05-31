import shared from "../shared.js"

function init() {
  const _captureStackTrace = Error.captureStackTrace

  function captureStackTrace(error, beforeFunc) {
    // Collect the call stack using the V8 stack trace API.
    // https://github.com/v8/v8/wiki/Stack-Trace-API#stack-trace-collection-for-custom-exceptions
    return typeof beforeFunc === "function"
      ? _captureStackTrace(error, beforeFunc)
      : _captureStackTrace(error)
  }

  return captureStackTrace
}

export default shared.inited
  ? shared.module.errorCaptureStackTrace
  : shared.module.errorCaptureStackTrace = init()
