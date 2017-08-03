import captureStackTrace from "../error/capture-stack-trace.js"
import maskStackTrace from "../error/mask-stack-trace.js"

function attempt(callback, beforeFunc, sourceCode) {
  try {
    return callback()
  } catch (e) {
    captureStackTrace(e, beforeFunc)
    throw maskStackTrace(e, sourceCode)
  }
}

export default attempt
