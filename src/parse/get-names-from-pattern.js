import getIdentifiersFromPattern from "./get-identifiers-from-pattern.js"
import shared from "../shared.js"

function init() {
  function getNamesFromPattern(pattern) {
    const identifiers = getIdentifiersFromPattern(pattern)
    const names = []

    for (const { name } of identifiers) {
      names.push(name)
    }

    return names
  }

  return getNamesFromPattern
}

export default shared.inited
  ? shared.module.parseGetNamesFromPattern
  : shared.module.parseGetNamesFromPattern = init()
