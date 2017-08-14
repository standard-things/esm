import isError from "../util/is-error.js"

const errorCaptureStackTrace = Error.captureStackTrace

function captureStackTrace(error, beforeFunc) {
  return isError(error)
    ? errorCaptureStackTrace(error, beforeFunc)
    : error
}

export default captureStackTrace
