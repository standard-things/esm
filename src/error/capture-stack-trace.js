import shared from "../shared.js"

function init() {
  const _captureStackTrace = Error.captureStackTrace

  function captureStackTrace(error, beforeFunc) {
    return typeof beforeFunc === "function"
      ? _captureStackTrace(error, beforeFunc)
      : _captureStackTrace(error)
  }

  return captureStackTrace
}

export default shared.inited
  ? shared.module.errorCaptureStackTrace
  : shared.module.errorCaptureStackTrace = init()
