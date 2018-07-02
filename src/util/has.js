import shared from "../shared.js"

function init() {
  const { hasOwnProperty } = Object.prototype

  function has(object, name) {
    return object != null &&
      hasOwnProperty.call(object, name)
  }

  return has
}

export default shared.inited
  ? shared.module.utilHas
  : shared.module.utilHas = init()
