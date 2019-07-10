import getPrototypeOf from "./get-prototype-of.js"
import ownKeys from "./own-keys.js"
import shared from "../shared.js"

function init() {
  function allKeys(object) {
    const result = new Set(ownKeys(object))

    let proto = object

    while ((proto = getPrototypeOf(proto)) !== null) {
      const ownNames = ownKeys(proto)

      for (const ownName of ownNames) {
        result.add(ownName)
      }
    }

    return [...result]
  }

  return allKeys
}

export default shared.inited
  ? shared.module.utilAllKeys
  : shared.module.utilAllKeys = init()
