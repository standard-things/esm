const _captureStackTrace = Error.captureStackTrace

function captureStackTrace(error, beforeFunc) {
  return typeof beforeFunc === "function"
    ? _captureStackTrace(error, beforeFunc)
    : _captureStackTrace(error)
}

export default captureStackTrace
