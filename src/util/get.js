import shared from "../shared.js"

function init() {
  function get(object, name, receiver) {
    if (object != null) {
      try {
        return Reflect.get(object, name, receiver)
      } catch {}
    }
  }

  return get
}

export default shared.inited
  ? shared.module.utilGet
  : shared.module.utilGet = init()
