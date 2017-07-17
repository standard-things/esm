const errorCaptureStackTrace = Error.captureStackTrace

function captureStackTrace(error, beforeFunc) {
  errorCaptureStackTrace(error, beforeFunc)
  return error
}

export default captureStackTrace
