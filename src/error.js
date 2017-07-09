import utils from "./utils.js"

const utilBinding = (() => {
  try {
    return process.binding("util")
  } catch (e) {}
  return Object.create(null)
})()

const errorCaptureStackTrace = Error.captureStackTrace
const errorMessageRegExp = /^(.+?: .+?) \(\d+:\d+\)(?:.*?: (.+))?$/
const splice = Array.prototype.splice

const internalDecorateErrorStack = utilBinding.decorateErrorStack
const internalSetHiddenValue = utilBinding.setHiddenValue

const useInternalDecorateErrorStack = typeof internalDecorateErrorStack === "function"
const useInternalSetHiddenValue = typeof internalSetHiddenValue === "function"

class ErrorUtils {
  static captureStackTrace(error, beforeFunc) {
    errorCaptureStackTrace(error, beforeFunc)
    return error
  }

  static maskStackTrace(error, runtimeAlias, source) {
    decorateStackTrace(error)

    const fromParser = utils.isParseError(error)
    const stack = scrubStack(error.stack)
    const runtimeIndex = stack.indexOf(runtimeAlias)

    utils.setGetter(error, "stack", () => {
      source = typeof source === "function" ? source() : source

      const lines = source.split("\n")
      const stackLines = stack.split("\n")

      if (fromParser) {
        // Reformat the parser stack from:
        // SyntaxError: <description> (<line>:<column>) while processing file: path/to/file.js
        //     at <function name> (<function location>)
        //   ...
        // to:
        // path/to/file.js:<line>
        // <line of code, from the original source, where the error occurred>
        // <column indicator arrow>
        //
        // SyntaxError: <description>
        //     at <function name> (<function location>)
        //   ...
        const parts = errorMessageRegExp.exec(stackLines[0]) || []
        const desc = parts[1]
        const filePath = parts[2]
        const spliceArgs = [0, 1]

        // loc.line (one-based index)
        // loc.offset (zero-based index)
        const loc = error.loc

        if (filePath !== void 0) {
          spliceArgs.push(filePath + ":" + loc.line)
        }

        spliceArgs.push(
          lines[loc.line - 1],
          " ".repeat(loc.column) + "^"
        )

        if (desc !== void 0) {
          spliceArgs.push("", desc)
        }

        splice.apply(stackLines, spliceArgs)
        return error.stack = stackLines.join("\n")
      }

      const locMatch = /:(\d+)$/.exec(stackLines[0])

      if (locMatch === null) {
        return error.stack = stackLines.join("\n")
      }

      const lineNum = +locMatch[1]
      const stackLineOfCode = stackLines[1]
      const stackArrow = stackLines[2]

      const column = stackArrow.indexOf("^")
      const sourceLineOfCode = lines[lineNum - 1]

      if (column > runtimeIndex) {
        // Move the column indicator arrow to the left by matching a clip of
        // code from the stack to the source. To avoid false matches, we start
        // with a larger clip size and work our way down.
        let columnIndex
        let clipSize = 5

        while (clipSize) {
          const clip = stackLineOfCode.substr(arrowIndex, clipSize--)
          columnIndex = line.indexOf(clip, runtimeIndex)

          if (columnIndex > -1) {
            stackLines[2] = " ".repeat(columnIndex) + "^"
            break
          }
        }

        if (columnIndex === -1) {
          // Remove the column indicator arrow.
          stackLines.splice(2, 1)
        }
      }
      // Replace the line of code where error occurred in the stack with the
      // corresponding line of code from the original source.
      stackLines[1] = sourceLineOfCode

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
  return stack
    .split("\n")
    .filter((line) => ! line.includes(__non_webpack_filename__))
    .join("\n")
}

Object.setPrototypeOf(ErrorUtils.prototype, null)

export default ErrorUtils
