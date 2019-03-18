import CHAR_CODE from "../constant/char-code.js"

import assign from "./assign.js"
import get from "./get.js"
import inspect from "./inspect.js"
import isError from "./is-error.js"
import shared from "../shared.js"
import toExternalError from "./to-external-error.js"

const {
  LOWERCASE_D,
  LOWERCASE_F,
  LOWERCASE_I,
  LOWERCASE_J,
  LOWERCASE_O,
  LOWERCASE_S,
  PERCENT,
  UPPERCASE_O
} = CHAR_CODE

function formatWithOptions(options, ...args) {
  const [string] = args
  const argsLength = args.length

  if (typeof string !== "string") {
    return argsLength === 0 ? "" : inspectAll(args, options)
  }

  if (argsLength === 1) {
    return string
  }

  const lastArgsIndex = argsLength - 1
  const { length } = string

  let altOptions
  let argsIndex = 0
  let i = -1
  let lastPos = 0
  let result = ""

  while (++i < length) {
    const code = string.charCodeAt(i)

    if (code !== PERCENT) {
      continue
    }

    const nextCode = string.charCodeAt(++i)

    let segment

    switch (nextCode) {
      case LOWERCASE_S:
        segment = String(args[++argsIndex])
        break

      case LOWERCASE_D:
        segment = Number(args[++argsIndex]) + ""
        break

      case LOWERCASE_J:
        segment = tryStringify(args[++argsIndex])
        break

      case PERCENT:
        segment = "%"
        break

      case LOWERCASE_I:
        segment = parseInt(args[++argsIndex]) + ""
        break

      case LOWERCASE_F:
        segment = parseFloat(args[++argsIndex]) + ""
        break

      case UPPERCASE_O:
        segment = inspect(args[++argsIndex], options)
        break

      case LOWERCASE_O:
        if (altOptions === void 0) {
          altOptions = assign({}, options, {
            depth: 4,
            showHidden: true,
            showProxy: true
          })
        }

        segment = inspect(args[++argsIndex], altOptions)
        break

      default:
        continue
    }

    const endIndex = i - 1

    if (lastPos !== endIndex) {
      result += string.slice(lastPos, endIndex)
    }

    result += segment
    lastPos = i + 1
  }

  if (lastPos === 0) {
    result = string
  } else if (lastPos < length) {
    result += string.slice(lastPos)
  }

  while (++argsIndex < argsLength) {
    const value = args[argsIndex]
    const type = typeof value

    result += " "

    if (value === null ||
        (type !== "object" &&
         type !== "symbol")) {
      result += value
    } else {
      result += inspect(value, options)
    }
  }

  return result
}

function inspectAll(array, options) {
  const { length } = array
  const lastIndex = length - 1

  let i = -1
  let result = ""

  while (++i < length) {
    result +=
      inspect(array[i], options) +
      (i === lastIndex ? "" : " ")
  }

  return result
}

function tryStringify(value) {
  try {
    return JSON.stringify(value)
  } catch (e) {
    if (isError(e)) {
      if (get(e, "name") === "TypeError" &&
          get(e, "message") === shared.circularErrorMessage) {
        return "[Circular]"
      }

      toExternalError(e)
    }

    throw e
  }
}

export default formatWithOptions
