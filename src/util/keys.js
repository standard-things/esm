import shared from "../shared.js"

function init() {
  function keys(object) {
    return object == null
      ? []
      : Object.keys(object)
  }

  return keys
}

export default shared.inited
  ? shared.module.utilKeys
  : shared.module.utilKeys = init()
