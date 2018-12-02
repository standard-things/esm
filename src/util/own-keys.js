import shared from "../shared.js"

function init() {
  function ownKeys(object) {
    return object == null
      ? []
      : Reflect.ownKeys(object)
  }

  return ownKeys
}

export default shared.inited
  ? shared.module.utilOwnKeys
  : shared.module.utilOwnKeys = init()
