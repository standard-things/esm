import captureStackTrace from "./capture-stack-trace.js"

function emitDeprecationWarning(message, code) {
  if (process.noDeprecation) {
    return
  }

  const warning = new Error(warning)

  if (typeof code === "string") {
    warning.code = code
  }

  warning.name = "DeprecationWarning"
  captureStackTrace(warning, emitDeprecationWarning)

  if (process.throwDeprecation) {
    throw warning
  }

  process.nextTick(() => process.emit("warning", warning))
}

export default emitDeprecationWarning
