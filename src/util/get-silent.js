import silent from "./silent.js"
import shared from "../shared.js"

function init() {
  function getSilent(object, name) {
    const value = silent(() => {
      try {
        return object[name]
      } catch {}
    })

    if (typeof value !== "function") {
      return value
    }

    return function (...args) {
      return silent(() => Reflect.apply(value, this, args))
    }
  }

  return getSilent
}

export default shared.inited
  ? shared.module.utilGetSilent
  : shared.module.utilGetSilent = init()
