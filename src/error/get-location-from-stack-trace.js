import isPath from "../util/is-path.js"
import shared from "../shared.js"

function init() {
  /* eslint-disable no-useless-escape */
  const locRegExp = /^ *at (?:.+? \()?(.+?):(\d+)(?:\:(\d+))?/gm

  function getLocationFromStackTrace(error) {
    const { stack } = error

    let match

    while ((match = locRegExp.exec(stack))) {
      const filename = match[1]

      if (! isPath(filename)) {
        continue
      }

      const line = match[2]
      const column = match[3]

      return {
        __proto__: null,
        column,
        filename,
        line
      }
    }

    return null
  }

  return getLocationFromStackTrace
}

export default shared.inited
  ? shared.module.errorGetLocationFromStackTrace
  : shared.module.errorGetLocationFromStackTrace = init()
