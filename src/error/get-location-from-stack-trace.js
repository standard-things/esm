import get from "../util/get.js"
import isError from "../util/is-error.js"
import isOwnPath from "../util/is-own-path.js"
import isPath from "../util/is-path.js"
import shared from "../shared.js"

function init() {
  const headerRegExp = /^(.+?)(:\d+)(?=\n)/
  // eslint-disable-next-line no-useless-escape
  const locRegExp = /^ *at (?:.+? \()?(.+?):(\d+)(?:\:(\d+))?/gm

  function getLocationFromStackTrace(error) {
    if (! isError(error)) {
      return null
    }

    const stack = get(error, "stack")

    if (typeof stack !== "string") {
      return null
    }

    let match = headerRegExp.exec(stack)

    if (match) {
      const [, filename, line] = match

      if (isFilename(filename)) {
        return {
          column: 0,
          filename,
          line
        }
      }
    }

    locRegExp.lastIndex = 0

    while ((match = locRegExp.exec(stack))) {
      const [, filename, line, column] = match

      if (isFilename(filename)) {
        return {
          column,
          filename,
          line
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
