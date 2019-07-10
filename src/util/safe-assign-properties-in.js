import allKeys from "./all-keys.js"
import safeCopyProperty from "./safe-copy-property.js"
import shared from "../shared.js"

function init() {
  function safeAssignPropertiesIn(object) {
    const { length } = arguments

    let i = 0

    while (++i < length) {
      const source = arguments[i]
      const names = allKeys(source)

      for (const name of names) {
        safeCopyProperty(object, source, name)
      }
    }

    return object
  }

  return safeAssignPropertiesIn
}

export default shared.inited
  ? shared.module.utilSafeAssignPropertiesIn
  : shared.module.utilSafeAssignPropertiesIn = init()

