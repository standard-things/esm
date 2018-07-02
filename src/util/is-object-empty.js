import has from "./has.js"
import shared from "../shared.js"

function init() {
  function isObjectEmpty(object) {
    for (const name in object) {
      if (has(object, name)) {
        return false
      }
    }

    return true
  }

  return isObjectEmpty
}

export default shared.inited
  ? shared.module.utilIsObjectEmpty
  : shared.module.utilIsObjectEmpty = init()
