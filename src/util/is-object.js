import shared from "../shared.js"

function init() {
  function isObject(value) {
    return typeof value === "object" && value !== null
  }

  return isObject
}

export default shared.inited
  ? shared.module.utilIsObject
  : shared.module.utilIsObject = init()
