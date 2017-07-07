import utils from "./utils.js"

const srubStackRegExp = process.env.NODE_ENV === "production"
  ? /^\s+at\s.*?esm.js.gz:.*\n?/gm
  : /^\s+at\s.*?esm.js:.*\n?/gm

const utilBinding = (() => {
  try {
    return process.binding("util")
  } catch (e) {}
  return Object.create(null)
})()

const errorCaptureStackTrace = Error.captureStackTrace
const internalDecorateErrorStack = utilBinding.decorateErrorStack
const internalSetHiddenValue = utilBinding.setHiddenValue

const useInternalDecorateErrorStack = typeof internalDecorateErrorStack === "function"
const useInternalSetHiddenValue = typeof internalSetHiddenValue === "function"

class ErrorUtils {
  static captureStackTrace(error, beforeFunc) {
    return errorCaptureStackTrace(error, beforeFunc)
  }

  static maskStackTrace(error, runtimeAlias, source) {
    decorateStackTrace(error)

    const fromParser = utils.isParseError(error)
    const stack = scrubStack(error.stack)
    const runtimeIndex = stack.indexOf(runtimeAlias)

    if (runtimeIndex < 0 && ! fromParser) {
      return error
    }

    utils.setGetter(error, "stack", () => {
      const code = typeof source === "function" ? source() : source
      const stackLines = stack.split("\n")
      const lines = code.split("\n")

      if (fromParser) {
        const filePath = stackLines[0].split(":").pop().trim()
        const loc = error.loc

        const line0 = filePath + ":" + loc.line
        const line1 = lines[loc.line - 1]
        const line2 = " ".repeat(loc.column - 1) + "^"

        stackLines[0] = line0
        stackLines.splice(1, 0, line1, line2)
        return error.stack = stackLines.join("\n")
      }

      // Mask runtime calls in the error.stack.
      const arrowIndex = stackLines[2].indexOf("^")
      const lineIndex = /:(\d+)/.exec(stackLines[0])[1] - 1
      const line = lines[lineIndex]

      if (arrowIndex > runtimeIndex) {
        // Move the column indicator arrow to the left.
        const snippet = stackLines[1].substr(arrowIndex, 2)
        const matchIndex = line.indexOf(snippet, runtimeIndex)

        if (matchIndex > -1) {
          stackLines[2] = " ".repeat(matchIndex) + "^"
        } else {
          stackLines.splice(2, 1)
        }
      }

      stackLines[1] = line
      return error.stack = stackLines.join("\n")
    })

    utils.setSetter(error, "stack", (value) => {
      utils.setProperty(error, "stack", { value })
    })

    return error
  }
}

function decorateStackTrace(error) {
  if (useInternalSetHiddenValue) {
    if ("arrow_message_private_symbol" in utilBinding) {
      internalSetHiddenValue(error, utilBinding.arrow_message_private_symbol, "")
    } else {
      try {
        internalSetHiddenValue(error, "arrowMessage", "")
        internalSetHiddenValue(error, "node:arrowMessage", "")
      } catch (e) {}
    }

    if ("decorated_private_symbol" in utilBinding) {
      internalSetHiddenValue(error, utilBinding.decorated_private_symbol, true)
    } else {
      try {
        internalSetHiddenValue(error, "node:decorated", true)
      } catch (e) {}
    }
  }

  if (useInternalDecorateErrorStack) {
    internalDecorateErrorStack(error)
  }

  return error
}

function scrubStack(stack) {
  return stack.replace(srubStackRegExp, "")
}

Object.setPrototypeOf(ErrorUtils.prototype, null)

export default ErrorUtils
