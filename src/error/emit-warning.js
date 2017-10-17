import captureStackTrace from "./capture-stack-trace.js"

function emitWarning(message, type, code, Ctor) {
  const isDeprecation = type === "DeprecationWarning"

  if (isDeprecation &&
      process.noDeprecation) {
    return
  }

  if (typeof type !== "string") {
    type = "Warning"
  }

  const warning = new Error(message)
  warning.name = type

  if (typeof code === "string") {
    warning.code = code
  }

  captureStackTrace(warning, Ctor || emitWarning)

  if (isDeprecation &&
      process.throwDeprecation) {
    throw warning
  }

  process.nextTick(() => process.emit("warning", warning))
}

export default emitWarning
