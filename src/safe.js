import getDescriptor from "./util/get-descriptor.js"
import setDescriptor from "./util/set-descriptor.js"

const { getOwnPropertyNames, setPrototypeOf } = Object

class Safe {
  static create(Super) {
    class Safe extends Super {}

    const names = getOwnPropertyNames(Super.prototype)

    for (const name of names) {
      const descriptor = getDescriptor(Super.prototype, name)
      setDescriptor(Safe.prototype, name, descriptor)
    }

    setPrototypeOf(Safe.prototype, null)
    return Safe
  }
}

setPrototypeOf(Safe.prototype, null)

export default Safe
