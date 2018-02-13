import copy from "./util/copy.js"
import copyProperty from "./util/copy-property.js"
import isObjectLike from "./util/is-object-like.js"
import keysAll from "./util/keys-all.js"

const { setPrototypeOf } = Object

const construct = typeof Reflect === "object" && Reflect !== null
  ? Reflect.construct
  : (target, args) => new target(...args)

class SafeBuiltin {
  static create(Super) {
    if (typeof Super !== "function") {
      return copy({ __proto__: null }, Super)
    }

    const Safe = isObjectLike(Super.prototype)
      ? class extends Super {}
      : (...args) => construct(Super, args)

    const names = keysAll(Super)
    const safeProto = Safe.prototype

    for (const name of names) {
      if (name !== "prototype") {
        copyProperty(Safe, Super, name)
      }
    }

    copy(safeProto, Super.prototype)
    setPrototypeOf(safeProto, null)
    return Safe
  }
}

setPrototypeOf(SafeBuiltin.prototype, null)

export default SafeBuiltin
