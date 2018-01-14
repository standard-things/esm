import captureStackTrace from "../error/capture-stack-trace.js"

const PREFIX = "(" + process.release.name + ":" + process.pid + ") "

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
    _emitWarning.call(process, message, type, code, Ctor)
    return
  }

  const useCode = typeof code === "string"

  if (isDeprecation &&
      process.throwDeprecation) {
    const warning = new Error(message)
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
