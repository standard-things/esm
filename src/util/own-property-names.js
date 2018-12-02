import shared from "../shared.js"

function init() {
  function ownPropertyNames(object) {
    return object == null
      ? []
      : Object.getOwnPropertyNames(object)
  }

  return ownPropertyNames
}

export default shared.inited
  ? shared.module.utilOwnPropertyNames
  : shared.module.utilOwnPropertyNames = init()
