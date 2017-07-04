const hashSym = Symbol.for("hash")
const keysSym = Symbol.for("keys")
const valuesSym = Symbol.for("values")

class OrderedMap {
  constructor() {
    this.clear()
  }

  clear() {
    this[hashSym] = Object.create(null)

    if (keysSym in this) {
      this[keysSym].length =
      this[valuesSym].length = 0
    } else {
      this[keysSym] = []
      this[valuesSym] = []
    }

   return this
  }

  get(key) {
    return this[valuesSym][this[hashSym][key]]
  }

  has(key) {
    return key in this[hashSym]
  }

  keys() {
    return this[keysSym]
  }

  set(key, value) {
    const hash = this[hashSym]
    const values = this[valuesSym]

    if (key in hash) {
      values[hash[key]] = value
    } else {
      const keys = this[keysSym]
      const nextIndex = keys.length

      hash[key] = nextIndex
      keys[nextIndex] = key
      values[nextIndex] = value
    }

    return this
  }

  values() {
    return this[valuesSym]
  }
}

Object.setPrototypeOf(OrderedMap.prototype, null)

export default OrderedMap
