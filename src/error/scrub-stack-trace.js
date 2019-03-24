import ESM from "../constant/esm.js"

import shared from "../shared.js"
import untransformRuntime from "../util/untransform-runtime.js"

function init() {
  const {
    PACKAGE_FILENAMES
  } = ESM

  const columnInfoRegExp = /:1:\d+(?=\)?$)/gm
  const traceRegExp = /(\n +at .+)+$/

  function scrubStackTrace(stack) {
    if (typeof stack !== "string") {
      return ""
    }

    const match = traceRegExp.exec(stack)

    if (match === null) {
      return stack
    }

    const { index } = match
    const message = stack.slice(0, index)

    const trace = stack
      .slice(index)
      .split("\n")
      .filter((line) => {
        for (const filename of PACKAGE_FILENAMES) {
          if (line.indexOf(filename) !== -1) {
            return false
          }
        }

        return true
      })
      .join("\n")
      .replace(columnInfoRegExp, ":1")

    return message + untransformRuntime(trace)
  }

  return scrubStackTrace
}

export default shared.inited
  ? shared.module.errorScrubStackTrace
  : shared.module.errorScrubStackTrace = init()
