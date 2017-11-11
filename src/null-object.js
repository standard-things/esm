const { create } = Object

class NullObject {
  constructor() {
    return create(null)
  }
}

Object.setPrototypeOf(NullObject.prototype, null)

export default NullObject
