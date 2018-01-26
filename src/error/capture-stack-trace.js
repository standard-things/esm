import isError from "../util/is-error.js"

const _captureStackTrace = Error.captureStackTrace

function captureStackTrace(error, beforeFunc) {
  if (! isError(error)) {
    return error
  }

  return typeof beforeFunc === "function"
    ? _captureStackTrace(error, beforeFunc)
    : _captureStackTrace(error)
}

export default captureStackTrace
