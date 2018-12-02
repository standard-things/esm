import copyProperty from "./copy-property.js"
import ownKeys from "./own-keys.js"
import shared from "../shared.js"

function init() {
  function assignProperties(object) {
    const { length } = arguments

    let i = 0

    while (++i < length) {
      const source = arguments[i]
      const names = ownKeys(source)

      for (const name of names) {
        copyProperty(object, source, name)
      }
    }

    return object
  }

  return assignProperties
}

export default shared.inited
  ? shared.module.utilAssignProperties
  : shared.module.utilAssignProperties = init()

