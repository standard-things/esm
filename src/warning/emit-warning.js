import call from "../util/call.js"
import captureStackTrace from "../error/capture-stack-trace.js"

const PREFIX = "(" + process.release.name + ":" + process.pid + ") "

const ExError = __external__.Error

const _emitWarning = process.emitWarning

const useEmitWarning = typeof _emitWarning === "function"

function emitWarning(message, type, code, Ctor) {
  const isDeprecation = type === "DeprecationWarning"

  if (isDeprecation &&
      process.noDeprecation) {
    return
  }

  if (typeof type !== "string") {
    type = "Warning"
  }

  if (useEmitWarning) {
    call(_emitWarning, process, message, type, code, Ctor)
    return
  }

  const useCode = typeof code === "string"

  if (isDeprecation &&
      process.throwDeprecation) {
    const warning = new ExError(message)
    warning.name = type

    if (useCode) {
      warning.code = code
    }

    captureStackTrace(warning, Ctor || emitWarning)
    throw warning
  }

  process.nextTick(() => {
    // eslint-disable-next-line no-console
    console.error(
      PREFIX +
      (useCode ? "[" + code + "] " : "") +
      type + ": " + message
    )
  })
}

export default emitWarning
