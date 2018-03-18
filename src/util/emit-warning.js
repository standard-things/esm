import captureStackTrace from "../error/capture-stack-trace.js"
import shared from "../shared.js"

function init() {
  const { pid, release } = shared.process

  const WARNING_PREFIX = "(" + release.name + ":" + pid + ") "

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
      Reflect.apply(_emitWarning, process, [message, type, code, Ctor])
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
      console.error(
        WARNING_PREFIX +
        (useCode ? "[" + code + "] " : "") +
        type + ": " + message
      )
    })
  }

  return emitWarning
}

export default shared.inited
  ? shared.module.utilEmitWarning
  : shared.module.utilEmitWarning = init()
