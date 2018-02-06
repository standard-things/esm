import getDescriptor from "./util/get-descriptor.js"
import setDescriptor from "./util/set-descriptor.js"

const { getOwnPropertyNames, setPrototypeOf } = Object

class SafeBuiltin {
  static create(Super) {
    class Safe extends Super {}

    const safeProto = Safe.prototype
    const superProto = Super.prototype
    const names = getOwnPropertyNames(superProto)

    for (const name of names) {
      setDescriptor(safeProto, name, getDescriptor(superProto, name))
    }

    setPrototypeOf(safeProto, null)
    return Safe
  }
}

setPrototypeOf(SafeBuiltin.prototype, null)

export default SafeBuiltin
