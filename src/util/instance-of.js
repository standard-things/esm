import getPrototypeOf from "./get-prototype-of.js"
import shared from "../shared.js"

function init() {
  function instanceOf(value, Ctor) {
    const CtorProto = Ctor.prototype

    let proto = value

    while ((proto = getPrototypeOf(proto)) !== null) {
      if (proto === CtorProto) {
        return true
      }
    }

    return false
  }

  return instanceOf
}

export default shared.inited
  ? shared.module.utilInstanceOf
  : shared.module.utilInstanceOf = init()
