import shared from "../shared.js"

function init() {
  function get(object, name) {
    try {
      return object[name]
    } catch (e) {}
  }

  return get
}

export default shared.inited
  ? shared.module.utilGet
  : shared.module.utilGet = init()
