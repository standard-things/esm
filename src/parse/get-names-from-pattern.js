import getIdentifiersFromPattern from "./get-identifiers-from-pattern.js"
import shared from "../shared.js"

function init() {
  function getNamesFromPattern(pattern) {
    const identifiers = getIdentifiersFromPattern(pattern)
    const result = []

    for (const { name } of identifiers) {
      result.push(name)
    }

    return result
  }

  return getNamesFromPattern
}

export default shared.inited
  ? shared.module.parseGetNamesFromPattern
  : shared.module.parseGetNamesFromPattern = init()
