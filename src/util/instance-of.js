import isObjectLike from "./is-object-like.js"
import shared from "../shared.js"

function init() {
  function instanceOf(value, Ctor) {
    const { prototype } = Ctor

    if (isObjectLike(value)) {
      let proto = value

      while ((proto = Reflect.getPrototypeOf(proto))) {
        if (proto === prototype) {
          return true
        }
      }
    }

    return false
  }

  return instanceOf
}

export default shared.inited
  ? shared.module.utilInstanceOf
  : shared.module.utilInstanceOf = init()
