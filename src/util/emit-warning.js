import captureStackTrace from "../error/capture-stack-trace.js"
import realProcess from "../real/process.js"
import safeConsole from "../safe/console.js"
import safeProcess from "../safe/process.js"
import shared from "../shared.js"

function init() {
  const { pid, release } = safeProcess

  const WARNING_PREFIX = "(" + release.name + ":" + pid + ") "

  const ExError = shared.external.Error

  const _emitWarning = realProcess.emitWarning

  const useEmitWarning = typeof _emitWarning === "function"

  function emitWarning(message, type, code, Ctor) {
    const isDeprecation = type === "DeprecationWarning"

    if (isDeprecation &&
        realProcess.noDeprecation) {
      return
    }

    if (typeof type !== "string") {
      type = "Warning"
    }

    if (useEmitWarning) {
      Reflect.apply(_emitWarning, realProcess, [message, type, code, Ctor])
      return
    }

    const useCode = typeof code === "string"

    if (isDeprecation &&
        realProcess.throwDeprecation) {
      const warning = new ExError(message)
      warning.name = type

      if (useCode) {
        warning.code = code
      }

      captureStackTrace(warning, Ctor || emitWarning)
      throw warning
    }

    realProcess.nextTick(() => {
      safeConsole.error(
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
