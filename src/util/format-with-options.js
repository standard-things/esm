// Based on `util.formatWithOptions()`.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/internal/util/inspect.js

import CHAR_CODE from "../constant/char-code.js"

import assign from "./assign.js"
import get from "./get.js"
import inspect from "./inspect.js"
import isError from "./is-error.js"
import isObject from "./is-object.js"
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
  const [first] = args
  const argsLength = args.length

  let argsIndex = 0
  let join = ""
  let result = ""

  if (typeof first === "string") {
    if (argsLength === 1) {
      return first
    }

    const { length } = first
    const lastIndex = length - 1

    let oOptions
    let sOptions
    let i = -1
    let lastPos = 0

    while (++i < lastIndex) {
      if (first.charCodeAt(i) === PERCENT) {
        const nextCode = first.charCodeAt(++i)

        if ((argsIndex + 1) !== argsLength) {
          let segment

          switch (nextCode) {
            case LOWERCASE_S: {
              const value = args[++argsIndex]

              if (typeof value === "bigint") {
                segment = value + "n"
              } else if (isObject(value)) {
                if (sOptions === void 0) {
                  sOptions = assign({}, options, {
                    breakLength: 120,
                    colors: false,
                    compact: true,
                    depth: 0
                  })
                }

                segment = inspect(value, sOptions)
              } else {
                segment = String(value)
              }

              break
            }

            case LOWERCASE_J:
              segment = tryStringify(args[++argsIndex])
              break

            case LOWERCASE_D: {
              const value = args[++argsIndex]
              const type = typeof value

              if (type === "bigint") {
                segment = value + "n"
              } else if (type === "symbol") {
                segment = "NaN"
              } else {
                segment = Number(value) + ""
              }

              break
            }

            case UPPERCASE_O:
              segment = inspect(args[++argsIndex], options)
              break

            case LOWERCASE_O:
              if (oOptions === void 0) {
                oOptions = assign({}, options, {
                  depth: 4,
                  showHidden: true,
                  showProxy: true
                })
              }

              segment = inspect(args[++argsIndex], oOptions)
              break

            case LOWERCASE_I: {
              const value = args[++argsIndex]
              const type = typeof value

              if (type === "bigint") {
                segment = value + "n"
              } else if (type === "symbol") {
                segment = "NaN"
              } else {
                segment = parseInt(value) + ""
              }

              break
            }

            case LOWERCASE_F: {
              const value = args[++argsIndex]

              segment = typeof value === "symbol"
                ? "NaN"
                : parseFloat(value) + ""

              break
            }

            case PERCENT:
              result += first.slice(lastPos, i)
              lastPos = i + 1
          }

          if (lastPos !== i - 1) {
            result += first.slice(lastPos, i - 1)
          }

          result += segment
          lastPos = i + 1
        } else if (nextCode === PERCENT) {
          result += first.slice(lastPos, i)
          lastPos = i + 1
        }
      }
    }

    if (lastPos !== 0) {
      ++argsIndex
      join = " "

      if (lastPos < length) {
        result += first.slice(lastPos)
      }
    }
  }

  while (argsIndex < argsLength) {
    const value = args[argsIndex]

    result +=
      join +
      (typeof value === "string"
        ? value
        : inspect(value, options)
      )

    join = " "
    ++argsIndex
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
