import get from "./get.js"
import has from "./has.js"
import ownKeys from "./own-keys.js"
import safeCopyProperty from "./safe-copy-property.js"
import shared from "../shared.js"

function init() {
  function safeDefaultProperties(object) {
    const { length } = arguments

    let i = 0

    while (++i < length) {
      const source = arguments[i]
      const names = ownKeys(source)

      for (const name of names) {
        if (has(source, name) &&
            (! has(object, name) ||
             get(object, name) === void 0)) {
          safeCopyProperty(object, source, name)
        }
      }
    }

    return object
  }

  return safeDefaultProperties
}

export default shared.inited
  ? shared.module.utilSafeDefaultProperties
  : shared.module.utilSafeDefaultProperties = init()
