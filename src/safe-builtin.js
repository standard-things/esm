import copy from "./util/copy.js"

const { setPrototypeOf } = Object

class SafeBuiltin {
  static create(Super) {
    class Safe extends Super {}

    const safeProto = Safe.prototype

    copy(safeProto, Super.prototype)
    setPrototypeOf(safeProto, null)
    return Safe
  }
}

setPrototypeOf(SafeBuiltin.prototype, null)

export default SafeBuiltin
