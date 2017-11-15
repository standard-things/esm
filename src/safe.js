const {
  defineProperty,
  getOwnPropertyDescriptor,
  getOwnPropertyNames,
  setPrototypeOf
} = Object

class Safe {
  static create(Super) {
    class Safe extends Super {}

    const names = getOwnPropertyNames(Super.prototype)

    for (const name of names) {
      const descriptor = getOwnPropertyDescriptor(Super.prototype, name)
      defineProperty(Safe.prototype, name, descriptor)
    }

    setPrototypeOf(Safe.prototype, null)
    return Safe
  }
}

setPrototypeOf(Safe.prototype, null)

export default Safe
