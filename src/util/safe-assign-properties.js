import keysAll from "./keys-all.js"
import safeCopyProperty from "./safe-copy-property.js"
import shared from "../shared.js"

function init() {
  function safeAssignProperties(object) {
    const { length } = arguments

    let i = 0

    while (++i < length) {
      const source = arguments[i]
      const names = keysAll(source)

      for (const name of names) {
        safeCopyProperty(object, source, name)
      }
    }

    return object
  }

  return safeAssignProperties
}

export default shared.inited
  ? shared.module.utilSafeAssignProperties
  : shared.module.utilSafeAssignProperties = init()

