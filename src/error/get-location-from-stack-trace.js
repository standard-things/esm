import get from "../util/get.js"
import isError from "../util/is-error.js"
import isOwnPath from "../util/is-own-path.js"
import isPath from "../util/is-path.js"
import shared from "../shared.js"
import toString from "../util/to-string.js"

function init() {
  const headerRegExp = /^(.+?):(\d+)(?=\n)/

  // eslint-disable-next-line no-useless-escape
  const locRegExp = /^ *at (?:.+? \()?(.+?):(\d+)(?:\:(\d+))?/gm

  function getLocationFromStackTrace(error) {
    if (! isError(error)) {
      return null
    }

    let stack = get(error, "stack")

    if (typeof stack !== "string") {
      return null
    }

    const message = toString(get(error, "message"))

    stack = stack.replace(message, "")

    let match = headerRegExp.exec(stack)

    if (match !== null) {
      const [, filename, lineNumber] = match

      if (isFilename(filename)) {
        return {
          column: 0,
          filename,
          line: lineNumber
        }
      }
    }

    locRegExp.lastIndex = 0

    while ((match = locRegExp.exec(stack)) !== null) {
      const [
        ,
        filename,
        lineNumber,
        column
      ] = match

      if (isFilename(filename)) {
        return {
          column,
          filename,
          line: lineNumber
        }
      }
    }

    return null
  }

  function isFilename(value) {
    return isPath(value) &&
      ! isOwnPath(value)
  }

  return getLocationFromStackTrace
}

export default shared.inited
  ? shared.module.errorGetLocationFromStackTrace
  : shared.module.errorGetLocationFromStackTrace = init()
